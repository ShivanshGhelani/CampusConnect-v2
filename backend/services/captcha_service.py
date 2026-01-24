"""
CAPTCHA Integration Service for CampusConnect
Protects against bot attacks and automated abuse
"""

import httpx
import json
import logging
from typing import Optional, Dict, Any
from fastapi import HTTPException, Request
import asyncio
from datetime import datetime, timedelta
import pytz

logger = logging.getLogger(__name__)

class CaptchaService:
    """
    Google reCAPTCHA v3 integration service
    """
    
    def __init__(self, secret_key: str, site_key: str):
        self.secret_key = secret_key
        self.site_key = site_key
        self.verify_url = "https://www.google.com/recaptcha/api/siteverify"
        self.min_score = 0.5  # Minimum score for reCAPTCHA v3
        
    async def verify_captcha(self, captcha_response: str, remote_ip: str = None) -> Dict[str, Any]:
        """
        Verify CAPTCHA response with Google
        
        Args:
            captcha_response: The response token from client
            remote_ip: Client IP address (optional)
            
        Returns:
            Dict with verification results
        """
        if not captcha_response:
            raise HTTPException(400, "CAPTCHA response is required")
        
        # Prepare verification data
        verify_data = {
            'secret': self.secret_key,
            'response': captcha_response
        }
        
        if remote_ip:
            verify_data['remoteip'] = remote_ip
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.verify_url,
                    data=verify_data,
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    logger.error(f"CAPTCHA verification failed with status {response.status_code}")
                    raise HTTPException(500, "CAPTCHA verification service unavailable")
                
                result = response.json()
                
                # Log verification attempt
                logger.info(f"CAPTCHA verification: success={result.get('success')}, score={result.get('score')}")
                
                return result
                
        except httpx.TimeoutException:
            logger.error("CAPTCHA verification timeout")
            raise HTTPException(500, "CAPTCHA verification timeout")
        except Exception as e:
            logger.error(f"CAPTCHA verification error: {e}")
            raise HTTPException(500, "CAPTCHA verification failed")
    
    async def is_human(self, captcha_response: str, remote_ip: str = None, action: str = None) -> bool:
        """
        Check if the request is from a human based on CAPTCHA
        
        Args:
            captcha_response: CAPTCHA response token
            remote_ip: Client IP
            action: The action being performed (login, register, etc.)
            
        Returns:
            True if likely human, False if likely bot
        """
        result = await self.verify_captcha(captcha_response, remote_ip)
        
        if not result.get('success'):
            logger.warning(f"CAPTCHA failed: {result.get('error-codes')}")
            return False
        
        # For reCAPTCHA v3, check the score
        score = result.get('score', 0)
        
        # Adjust threshold based on action
        thresholds = {
            'login': 0.3,      # Lower threshold for login
            'register': 0.5,   # Medium threshold for registration
            'contact': 0.7,    # Higher threshold for contact forms
            'default': 0.5
        }
        
        threshold = thresholds.get(action, thresholds['default'])
        
        # Verify action matches if provided
        expected_action = result.get('action')
        if action and expected_action and expected_action != action:
            logger.warning(f"CAPTCHA action mismatch: expected {action}, got {expected_action}")
            return False
        
        is_human = score >= threshold
        
        logger.info(f"CAPTCHA human check: score={score}, threshold={threshold}, is_human={is_human}")
        
        return is_human

class SimpleCaptchaService:
    """
    Simple math-based CAPTCHA for development/fallback
    """
    
    def __init__(self):
        self.active_challenges = {}  # In production, use Redis
        self.challenge_timeout = 300  # 5 minutes
    
    def generate_challenge(self, session_id: str) -> Dict[str, Any]:
        """
        Generate a simple math challenge
        """
        import random
        
        # Generate simple math problem
        num1 = random.randint(1, 20)
        num2 = random.randint(1, 20)
        operation = random.choice(['+', '-'])
        
        if operation == '+':
            answer = num1 + num2
            question = f"What is {num1} + {num2}?"
        else:
            # Ensure positive result for subtraction
            if num1 < num2:
                num1, num2 = num2, num1
            answer = num1 - num2
            question = f"What is {num1} - {num2}?"
        
        # Store challenge
        self.active_challenges[session_id] = {
            'answer': answer,
            'expires': datetime.now(pytz.timezone('Asia/Kolkata')) + timedelta(seconds=self.challenge_timeout)
        }
        
        return {
            'question': question,
            'session_id': session_id
        }
    
    def verify_challenge(self, session_id: str, user_answer: str) -> bool:
        """
        Verify math challenge answer
        """
        challenge = self.active_challenges.get(session_id)
        
        if not challenge:
            return False
        
        # Check if expired
        if datetime.now(pytz.timezone('Asia/Kolkata')) > challenge['expires']:
            del self.active_challenges[session_id]
            return False
        
        try:
            user_answer_int = int(user_answer)
            is_correct = user_answer_int == challenge['answer']
            
            # Remove challenge after verification
            del self.active_challenges[session_id]
            
            return is_correct
            
        except ValueError:
            return False
        
    def cleanup_expired_challenges(self):
        """
        Clean up expired challenges
        """
        current_time = datetime.now(pytz.timezone('Asia/Kolkata'))
        expired_sessions = [
            session_id for session_id, challenge in self.active_challenges.items()
            if current_time > challenge['expires']
        ]
        
        for session_id in expired_sessions:
            del self.active_challenges[session_id]

class BotDetection:
    """
    Additional bot detection mechanisms
    """
    
    def __init__(self):
        self.suspicious_user_agents = [
            'curl', 'wget', 'python-requests', 'bot', 'crawler', 
            'spider', 'scraper', 'automated', 'headless'
        ]
        
        self.request_patterns = {}  # Track request patterns
    
    def analyze_request(self, request: Request) -> Dict[str, Any]:
        """
        Analyze request for bot-like behavior
        """
        analysis = {
            'is_suspicious': False,
            'bot_indicators': [],
            'risk_score': 0
        }
        
        # Check User-Agent
        user_agent = request.headers.get('user-agent', '').lower()
        
        if not user_agent:
            analysis['bot_indicators'].append('Missing User-Agent')
            analysis['risk_score'] += 30
        elif any(suspicious in user_agent for suspicious in self.suspicious_user_agents):
            analysis['bot_indicators'].append('Suspicious User-Agent')
            analysis['risk_score'] += 50
        
        # Check for common browser headers
        browser_headers = [
            'accept', 'accept-language', 'accept-encoding', 
            'dnt', 'upgrade-insecure-requests'
        ]
        
        missing_headers = [h for h in browser_headers if h not in request.headers]
        if len(missing_headers) > 2:
            analysis['bot_indicators'].append('Missing browser headers')
            analysis['risk_score'] += 20
        
        # Check request timing patterns
        client_ip = request.client.host
        self._analyze_request_timing(client_ip, analysis)
        
        # Determine if suspicious
        analysis['is_suspicious'] = analysis['risk_score'] > 50
        
        if analysis['is_suspicious']:
            logger.warning(f"Suspicious request detected from {client_ip}: {analysis}")
        
        return analysis
    
    def _analyze_request_timing(self, ip: str, analysis: Dict[str, Any]):
        """
        Analyze request timing patterns for bot behavior
        """
        current_time = datetime.now(pytz.timezone('Asia/Kolkata'))
        
        if ip not in self.request_patterns:
            self.request_patterns[ip] = []
        
        # Add current request time
        self.request_patterns[ip].append(current_time)
        
        # Keep only recent requests (last 5 minutes)
        cutoff_time = current_time - timedelta(minutes=5)
        self.request_patterns[ip] = [
            req_time for req_time in self.request_patterns[ip] 
            if req_time > cutoff_time
        ]
        
        # Check for too many requests
        request_count = len(self.request_patterns[ip])
        
        if request_count > 50:  # More than 50 requests in 5 minutes
            analysis['bot_indicators'].append('High request frequency')
            analysis['risk_score'] += 40
        
        # Check for very regular timing (bot-like)
        if request_count > 5:
            times = self.request_patterns[ip][-5:]  # Last 5 requests
            intervals = [
                (times[i] - times[i-1]).total_seconds() 
                for i in range(1, len(times))
            ]
            
            # If intervals are very similar (within 0.5 seconds), it's bot-like
            if intervals and max(intervals) - min(intervals) < 0.5:
                analysis['bot_indicators'].append('Regular timing pattern')
                analysis['risk_score'] += 30

# Configuration and initialization
class CaptchaConfig:
    """CAPTCHA configuration"""
    
    def __init__(self):
        import os
        
        self.recaptcha_site_key = os.getenv('RECAPTCHA_SITE_KEY')
        self.recaptcha_secret_key = os.getenv('RECAPTCHA_SECRET_KEY')
        self.enable_captcha = bool(self.recaptcha_secret_key)
        self.fallback_to_simple = True

# Global instances
config = CaptchaConfig()

# Initialize appropriate service based on configuration
if config.enable_captcha:
    captcha_service = CaptchaService(
        secret_key=config.recaptcha_secret_key,
        site_key=config.recaptcha_site_key
    )
else:
    captcha_service = SimpleCaptchaService()

bot_detection = BotDetection()

# Utility functions for easy use in routes
async def verify_human(request: Request, captcha_response: str = None, action: str = 'default') -> bool:
    """
    Verify if request is from human
    """
    # Analyze request for bot patterns
    bot_analysis = bot_detection.analyze_request(request)
    
    if bot_analysis['is_suspicious']:
        logger.warning(f"Suspicious request blocked from {request.client.host}")
        return False
    
    # If CAPTCHA is enabled and response provided
    if config.enable_captcha and captcha_response:
        return await captcha_service.is_human(
            captcha_response, 
            request.client.host, 
            action
        )
    
    # If using simple CAPTCHA
    if hasattr(captcha_service, 'verify_challenge') and captcha_response:
        session_id = request.headers.get('X-Session-ID', '')
        return captcha_service.verify_challenge(session_id, captcha_response)
    
    # Default to bot analysis only
    return not bot_analysis['is_suspicious']

# Usage in routes:
"""
from services.captcha_service import verify_human, captcha_service

@router.post("/login")
async def login(
    request: Request,
    credentials: LoginCredentials,
    captcha_response: str = Form(None)
):
    # Verify human
    if not await verify_human(request, captcha_response, 'login'):
        raise HTTPException(400, "Please complete the CAPTCHA verification")
    
    # Continue with login...
"""
