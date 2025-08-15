import hashlib
import secrets
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from core.logger import get_logger
from config.database import Database
from config.settings import FRONTEND_URL
from services.communication.email_service import CommunicationService

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

logger = get_logger(__name__)

class PasswordResetService:
    def __init__(self):
        self.email_service = CommunicationService()
        self.token_expiry_minutes = 10  # Token expires in 10 minutes
        self.redis_client = None
        
        # Initialize Redis connection
        if REDIS_AVAILABLE:
            try:
                self.redis_client = redis.Redis(
                    host='localhost',
                    port=6379,
                    db=1,  # Use db=1 for password reset tokens
                    decode_responses=True
                )
                self.redis_client.ping()
                logger.info("Password reset service Redis connection established")
            except Exception as e:
                logger.error(f"Failed to connect to Redis for password reset: {e}")
                self.redis_client = None
    
    def get_redis_connection(self):
        """Get Redis connection"""
        return self.redis_client

    def generate_reset_token(self, user_id: str, user_type: str, email: str) -> str:
        """Generate a secure password reset token"""
        try:
            # Create a random token
            token_data = f"{user_id}:{user_type}:{email}:{datetime.utcnow().isoformat()}:{secrets.token_urlsafe(32)}"
            token = secrets.token_urlsafe(64)
            
            # Store token data in Redis with expiration
            token_info = {
                'user_id': user_id,
                'user_type': user_type,
                'email': email,
                'created_at': datetime.utcnow().isoformat(),
                'expires_at': (datetime.utcnow() + timedelta(minutes=self.token_expiry_minutes)).isoformat()
            }
            
            redis_conn = self.get_redis_connection()
            if redis_conn:
                # Store with 10-minute expiration
                redis_conn.setex(
                    f"password_reset_token:{token}",
                    600,  # 10 minutes in seconds
                    json.dumps(token_info)
                )
                logger.info(f"Password reset token generated for {user_type} {user_id}")
                return token
            else:
                logger.error("Redis connection failed for token generation")
                return None
                
        except Exception as e:
            logger.error(f"Error generating reset token: {e}")
            return None

    async def validate_reset_token(self, token: str) -> Dict[str, Any]:
        """Validate password reset token and return user info"""
        try:
            redis_conn = self.get_redis_connection()
            if not redis_conn:
                return {'is_valid': False, 'message': 'Service unavailable'}
            
            # Get token data from Redis
            token_data = redis_conn.get(f"password_reset_token:{token}")
            if not token_data:
                return {'is_valid': False, 'message': 'Invalid or expired reset token'}
            
            token_info = json.loads(token_data)
            
            # Check if token has expired
            expires_at = datetime.fromisoformat(token_info['expires_at'])
            if datetime.utcnow() > expires_at:
                # Clean up expired token
                redis_conn.delete(f"password_reset_token:{token}")
                return {'is_valid': False, 'message': 'Reset token has expired'}
            
            # Get user information
            user_info = await self.get_user_info(token_info['user_id'], token_info['user_type'])
            if not user_info:
                return {'is_valid': False, 'message': 'User not found'}
            
            return {
                'is_valid': True,
                'user_type': token_info['user_type'],
                'user_info': user_info,
                'message': 'Token is valid'
            }
            
        except Exception as e:
            logger.error(f"Error validating reset token: {e}")
            return {'is_valid': False, 'message': 'Token validation failed'}

    async def get_user_info(self, user_id: str, user_type: str) -> Optional[Dict[str, Any]]:
        """Get user information for token validation"""
        try:
            db = await Database.get_database()
            if db is None:
                return None
            
            if user_type == 'student':
                collection = db['students']
                user = await collection.find_one({'enrollment_no': user_id})
                if user:
                    return {
                        'enrollment_no': user['enrollment_no'],
                        'full_name': user['full_name'],
                        'email': user['email']
                    }
            elif user_type == 'faculty':
                collection = db['faculties']
                user = await collection.find_one({'employee_id': user_id})
                if user:
                    return {
                        'employee_id': user['employee_id'],
                        'full_name': user['full_name'],
                        'email': user['email']
                    }
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting user info: {e}")
            return None

    async def initiate_password_reset_student(self, enrollment_no: str, email: str, client_ip: str = "Unknown") -> Dict[str, Any]:
        """Initiate password reset for student"""
        try:
            db = await Database.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Verify student exists with provided enrollment_no and email
            student = await db['students'].find_one({
                'enrollment_no': enrollment_no.upper(),
                'email': email.lower()
            })
            
            if not student:
                # Don't reveal if user exists or not for security
                return {
                    'success': True,
                    'message': 'If a student account with these credentials exists, a password reset link has been sent to the email address.',
                    'email_sent': False
                }
            
            # Generate reset token
            token = self.generate_reset_token(enrollment_no.upper(), 'student', email.lower())
            if not token:
                raise Exception("Failed to generate reset token")
            
            # Send reset email with environment-aware URL
            reset_link = f"{FRONTEND_URL}/auth/reset-password/{token}"
            email_sent = await self.email_service.send_password_reset_email(
                user_email=email.lower(),
                user_name=student['full_name'],
                reset_url=reset_link,
                timestamp=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
                ip_address=client_ip
            )
            
            logger.info(f"Password reset initiated for student {enrollment_no} from IP {client_ip}")
            return {
                'success': True,
                'message': 'Password reset link has been sent to your email address. Please check your inbox and follow the instructions. The link will expire in 10 minutes.',
                'email_sent': email_sent
            }
            
        except Exception as e:
            logger.error(f"Error initiating student password reset: {e}")
            return {
                'success': False,
                'message': 'Failed to initiate password reset. Please try again later.',
                'email_sent': False
            }

    async def initiate_password_reset_faculty(self, employee_id: str, email: str, client_ip: str = "Unknown") -> Dict[str, Any]:
        """Initiate password reset for faculty"""
        try:
            db = await Database.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Verify faculty exists with provided employee_id and email
            faculty = await db['faculties'].find_one({
                'employee_id': employee_id.upper(),
                'email': email.lower()
            })
            
            if not faculty:
                # Don't reveal if user exists or not for security
                return {
                    'success': True,
                    'message': 'If a faculty account with these credentials exists, a password reset link has been sent to the email address.',
                    'email_sent': False
                }
            
            # Generate reset token
            token = self.generate_reset_token(employee_id.upper(), 'faculty', email.lower())
            if not token:
                raise Exception("Failed to generate reset token")
            
            # Send reset email with environment-aware URL
            reset_link = f"{FRONTEND_URL}/auth/reset-password/{token}"
            email_sent = await self.email_service.send_password_reset_email(
                user_email=email.lower(),
                user_name=faculty['full_name'],
                reset_url=reset_link,
                timestamp=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
                ip_address=client_ip
            )
            
            logger.info(f"Password reset initiated for faculty {employee_id} from IP {client_ip}")
            return {
                'success': True,
                'message': 'Password reset link has been sent to your email address. Please check your inbox and follow the instructions. The link will expire in 10 minutes.',
                'email_sent': email_sent
            }
            
        except Exception as e:
            logger.error(f"Error initiating faculty password reset: {e}")
            return {
                'success': False,
                'message': 'Failed to initiate password reset. Please try again later.',
                'email_sent': False
            }

    async def reset_password(self, token: str, new_password: str) -> Dict[str, Any]:
        """Reset user password using valid token"""
        try:
            # Validate token first
            token_validation = await self.validate_reset_token(token)
            if not token_validation['is_valid']:
                return {
                    'success': False,
                    'message': token_validation['message']
                }
            
            user_type = token_validation['user_type']
            user_info = token_validation['user_info']
            
            # Hash the new password
            import bcrypt
            password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Update password in database
            db = await Database.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            if user_type == 'student':
                result = await db['students'].update_one(
                    {'enrollment_no': user_info['enrollment_no']},
                    {
                        '$set': {
                            'password_hash': password_hash,
                            'last_password_reset': datetime.utcnow().isoformat()
                        }
                    }
                )
            elif user_type == 'faculty':
                result = await db['faculties'].update_one(
                    {'employee_id': user_info['employee_id']},
                    {
                        '$set': {
                            'password_hash': password_hash,
                            'last_password_reset': datetime.utcnow().isoformat()
                        }
                    }
                )
            else:
                raise Exception("Invalid user type")
            
            if result.modified_count == 0:
                raise Exception("Failed to update password")
            
            # Delete the used token
            redis_conn = self.get_redis_connection()
            if redis_conn:
                redis_conn.delete(f"password_reset_token:{token}")
            
            logger.info(f"Password reset successful for {user_type} {user_info.get('enrollment_no') or user_info.get('employee_id')}")
            return {
                'success': True,
                'message': 'Password has been reset successfully. You can now log in with your new password.'
            }
            
        except Exception as e:
            logger.error(f"Error resetting password: {e}")
            return {
                'success': False,
                'message': 'Failed to reset password. Please try again or request a new reset link.'
            }

    def cleanup_expired_tokens(self):
        """Clean up expired password reset tokens (called by background task)"""
        try:
            redis_conn = self.get_redis_connection()
            if not redis_conn:
                return
            
            # Redis automatically handles expiration, but we can log cleanup
            pattern = "password_reset_token:*"
            tokens = redis_conn.keys(pattern)
            logger.info(f"Currently {len(tokens)} password reset tokens in Redis")
            
        except Exception as e:
            logger.error(f"Error during token cleanup: {e}")

# Create singleton instance
password_reset_service = PasswordResetService()
