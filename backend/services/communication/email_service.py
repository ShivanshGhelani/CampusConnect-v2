"""
Production-Ready Email Service for CampusConnect
Enhanced with retry logic, circuit breaker, and robust error handling
"""
import smtplib
import ssl
import os
import logging
import asyncio
import threading
import time
import socket
from typing import Optional, List, Dict, Any
from pathlib import Path
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from jinja2 import Environment, FileSystemLoader
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from queue import Queue
import random

from config.settings import get_settings

logger = logging.getLogger(__name__)

class EmailCircuitBreaker:
    """
    Circuit breaker pattern for email service
    Prevents cascading failures by stopping requests when error rate is too high
    """
    
    def __init__(self, failure_threshold=5, timeout=300):  # 5 failures, 5 min timeout
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        self.lock = threading.Lock()
    
    def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker protection"""
        with self.lock:
            if self.state == "OPEN":
                if time.time() - self.last_failure_time > self.timeout:
                    self.state = "HALF_OPEN"
                    logger.info("Circuit breaker moving to HALF_OPEN state")
                else:
                    raise Exception("Circuit breaker is OPEN - email service temporarily unavailable")
            
            try:
                result = func(*args, **kwargs)
                if self.state == "HALF_OPEN":
                    self.reset()
                return result
                
            except Exception as e:
                self.record_failure()
                raise
    
    def record_failure(self):
        """Record a failure and potentially open the circuit"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
            logger.warning(f"Circuit breaker OPENED after {self.failure_count} failures")
    
    def reset(self):
        """Reset the circuit breaker"""
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"
        logger.info("Circuit breaker RESET to CLOSED state")
    
    def get_state(self):
        """Get current circuit breaker state"""
        return {
            'state': self.state,
            'failure_count': self.failure_count,
            'last_failure_time': self.last_failure_time
        }


class SMTPConnectionPool:
    """
    Production-ready SMTP connection pool with retry logic and resilience
    """
    
    def __init__(self, max_connections=3):
        self.settings = get_settings()
        self.max_connections = max_connections
        self.connections = Queue(maxsize=max_connections)
        self.lock = threading.Lock()
        self.stats = {
            'connections_created': 0,
            'connections_reused': 0,
            'failed_connections': 0,
            'total_emails_sent': 0,
            'retry_attempts': 0,
            'connection_errors': 0
        }
        
        # Connection settings with timeouts
        self.connection_timeout = 30  # seconds
        self.socket_timeout = 30  # seconds
        
        # Pre-create initial connections
        self._initialize_pool()
    
    def _initialize_pool(self):
        """Pre-create initial connections with error handling - lazy initialization for production"""
        # Skip pre-creation in production environments to avoid blocking startup
        # Connections will be created on-demand when first email is sent
        logger.info("SMTP connection pool initialized (lazy mode - connections created on-demand)")
    
    def _create_connection_with_retry(self, max_retries=3):
        """Create SMTP connection with retry logic and exponential backoff"""
        last_error = None
        
        for attempt in range(max_retries):
            try:
                return self._create_connection()
            except Exception as e:
                last_error = e
                with self.lock:
                    self.stats['retry_attempts'] += 1
                
                if attempt == max_retries - 1:
                    logger.error(f"Failed to create SMTP connection after {max_retries} attempts: {e}")
                    raise Exception(f"SMTP Connection error after {max_retries} attempts: {last_error}")
                
                # Exponential backoff with jitter
                delay = (2 ** attempt) + random.uniform(0, 1)
                logger.warning(f"SMTP connection attempt {attempt + 1} failed: {e}. Retrying in {delay:.2f}s")
                time.sleep(delay)
        
        raise Exception(f"Failed to create SMTP connection: {last_error}")
    
    def _create_connection(self):
        """Create a new SMTP connection with proper timeouts and fallback to SSL"""
        try:
            # Set socket timeout for all socket operations
            socket.setdefaulttimeout(self.socket_timeout)
            
            # Create SSL context with secure defaults
            context = ssl.create_default_context()
            context.check_hostname = False  # Some SMTP servers have cert issues
            context.verify_mode = ssl.CERT_NONE  # For development/testing
            
            # Try STARTTLS first (port 587)
            if self.settings.SMTP_PORT == 587:
                try:
                    server = smtplib.SMTP(self.settings.SMTP_SERVER, self.settings.SMTP_PORT, timeout=self.connection_timeout)
                    server.set_debuglevel(0)
                    server.starttls(context=context)
                    server.login(self.settings.EMAIL_USER, self.settings.EMAIL_PASSWORD)
                    
                    with self.lock:
                        self.stats['connections_created'] += 1
                    
                    logger.debug(f"Created SMTP connection (STARTTLS) to {self.settings.SMTP_SERVER}:{self.settings.SMTP_PORT}")
                    return server
                    
                except (OSError, socket.error) as e:
                    logger.warning(f"Port 587 failed ({e}), falling back to SSL port 465")
                    # Fallback to SSL port 465 for platforms that block port 587
                    server = smtplib.SMTP_SSL(self.settings.SMTP_SERVER, 465, timeout=self.connection_timeout, context=context)
                    server.set_debuglevel(0)
                    server.login(self.settings.EMAIL_USER, self.settings.EMAIL_PASSWORD)
                    
                    with self.lock:
                        self.stats['connections_created'] += 1
                    
                    logger.info(f"Created SMTP_SSL connection (fallback) to {self.settings.SMTP_SERVER}:465")
                    return server
            
            # If explicitly using port 465, use SMTP_SSL directly
            elif self.settings.SMTP_PORT == 465:
                server = smtplib.SMTP_SSL(self.settings.SMTP_SERVER, self.settings.SMTP_PORT, timeout=self.connection_timeout, context=context)
                server.set_debuglevel(0)
                server.login(self.settings.EMAIL_USER, self.settings.EMAIL_PASSWORD)
                
                with self.lock:
                    self.stats['connections_created'] += 1
                
                logger.debug(f"Created SMTP_SSL connection to {self.settings.SMTP_SERVER}:{self.settings.SMTP_PORT}")
                return server
            
            # For other ports, use standard SMTP with STARTTLS
            else:
                server = smtplib.SMTP(self.settings.SMTP_SERVER, self.settings.SMTP_PORT, timeout=self.connection_timeout)
                server.set_debuglevel(0)
                server.starttls(context=context)
                server.login(self.settings.EMAIL_USER, self.settings.EMAIL_PASSWORD)
                
                with self.lock:
                    self.stats['connections_created'] += 1
                
                logger.debug(f"Created SMTP connection to {self.settings.SMTP_SERVER}:{self.settings.SMTP_PORT}")
                return server
            
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP Authentication failed: {e}")
            with self.lock:
                self.stats['failed_connections'] += 1
            raise Exception(f"SMTP Authentication failed: {e}")
            
        except smtplib.SMTPConnectError as e:
            logger.error(f"SMTP Connection failed: {e}")
            with self.lock:
                self.stats['connection_errors'] += 1
            raise Exception(f"SMTP Connection failed: {e}")
            
        except socket.timeout as e:
            logger.error(f"SMTP Connection timeout: {e}")
            with self.lock:
                self.stats['connection_errors'] += 1
            raise Exception(f"SMTP Connection timeout: {e}")
            
        except Exception as e:
            logger.error(f"Failed to create SMTP connection: {e}")
            with self.lock:
                self.stats['failed_connections'] += 1
            raise Exception(f"SMTP Connection error: {e}")
        
        finally:
            # Reset socket timeout to default
            socket.setdefaulttimeout(None)
    
    def get_connection_with_retry(self, max_retries=3):
        """Get a connection from the pool with retry logic"""
        last_error = None
        
        for attempt in range(max_retries):
            try:
                conn = self.get_connection()
                if conn:
                    return conn
                
                last_error = "No connection available from pool"
                    
                # If no connection available, wait briefly and retry
                if attempt < max_retries - 1:
                    delay = 1 + (attempt * 0.5)  # 1s, 1.5s, 2s
                    logger.warning(f"No SMTP connection available, retrying in {delay}s (attempt {attempt + 1})")
                    time.sleep(delay)
                    
            except Exception as e:
                last_error = str(e)
                logger.warning(f"Error getting SMTP connection (attempt {attempt + 1}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
        
        logger.error(f"Failed to get SMTP connection after all retries: {last_error}")
        raise Exception(f"Failed to get SMTP connection: {last_error}")
    
    def get_connection(self):
        """Get a connection from the pool"""
        try:
            # Try to get existing connection
            if not self.connections.empty():
                conn = self.connections.get_nowait()
                # Test if connection is still alive
                try:
                    # Use a simple NOOP command to test connection
                    status = conn.noop()
                    if status[0] == 250:  # SMTP OK response
                        with self.lock:
                            self.stats['connections_reused'] += 1
                        logger.debug("Reusing existing SMTP connection")
                        return conn
                except (smtplib.SMTPServerDisconnected, smtplib.SMTPException, OSError, socket.error) as e:
                    # Connection is dead, close it properly and create new one
                    logger.debug(f"Existing connection is dead: {e}")
                    try:
                        conn.quit()
                    except:
                        pass  # Ignore errors when closing dead connection
            
            # Create new connection if none available or existing is dead
            logger.debug("Creating new SMTP connection")
            return self._create_connection_with_retry()
            
        except Exception as e:
            logger.error(f"Error getting SMTP connection: {e}")
            return None
    
    def return_connection(self, conn, force_close=False):
        """Return a connection to the pool"""
        try:
            if not conn:
                return
                
            if force_close or self.connections.full():
                # Pool is full or forced close, close the connection
                try:
                    conn.quit()
                    logger.debug("SMTP connection closed (pool full or forced)")
                except:
                    pass
                return
            
            # Test connection before returning to pool
            try:
                status = conn.noop()
                if status[0] == 250:  # SMTP OK response
                    self.connections.put_nowait(conn)
                    logger.debug("SMTP connection returned to pool")
                    return
            except (smtplib.SMTPServerDisconnected, smtplib.SMTPException, OSError, socket.error):
                # Connection is dead, close it instead of returning to pool
                logger.debug("SMTP connection is dead, closing instead of returning to pool")
            
            # Close dead or problematic connection
            try:
                conn.quit()
            except:
                pass
                
        except Exception as e:
            logger.warning(f"Error returning SMTP connection to pool: {e}")
            # Ensure connection is closed on error
            if conn:
                try:
                    conn.quit()
                except:
                    pass

    def get_stats(self):
        """Get connection pool statistics"""
        with self.lock:
            return self.stats.copy()
    
    def cleanup_pool(self):
        """Clean up all connections in the pool"""
        try:
            while not self.connections.empty():
                try:
                    conn = self.connections.get_nowait()
                    conn.quit()
                except:
                    pass
            logger.info("SMTP connection pool cleaned up")
        except Exception as e:
            logger.error(f"Error cleaning up connection pool: {e}")


class CommunicationService:
    """
    Production-ready Communication Service for CampusConnect - Singleton Pattern
    """
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        # Only initialize once (singleton pattern)
        if self._initialized:
            return
            
        self.settings = get_settings()
        self.smtp_pool = SMTPConnectionPool()
        self.circuit_breaker = EmailCircuitBreaker()
        self.development_mode = os.getenv("EMAIL_DEVELOPMENT_MODE", "false").lower() == "true"
        
        # Template configuration
        template_dir = Path(__file__).parent.parent.parent / "templates" / "email"
        self.jinja_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=True
        )
        
        # Thread pool for async operations
        self.executor = ThreadPoolExecutor(max_workers=3, thread_name_prefix="email")
        
        # Health check
        self.last_health_check = None
        self.health_status = "unknown"
        
        # Mark as initialized
        CommunicationService._initialized = True
        
        logger.info(f"Production-ready communication service initialized:")
        logger.info(f"  SMTP Server: {self.settings.SMTP_SERVER}:{self.settings.SMTP_PORT}")
        logger.info(f"  Email User: {self.settings.EMAIL_USER[:5]}...@{self.settings.EMAIL_USER.split('@')[1] if '@' in self.settings.EMAIL_USER else 'not_set'}")
        logger.info(f"  Development Mode: {self.development_mode}")
        logger.info(f"  Circuit Breaker: Enabled (failure_threshold=5, timeout=300s)")
        logger.info(f"  Fallback: Port 587 will auto-fallback to SSL port 465 if blocked")
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on email service"""
        try:
            start_time = time.time()
            
            # Test SMTP connection with timeout
            try:
                test_conn = self.smtp_pool._create_connection()
                if test_conn:
                    test_conn.quit()
                    connection_ok = True
                    connection_time = time.time() - start_time
                else:
                    connection_ok = False
                    connection_time = None
            except Exception as conn_error:
                logger.warning(f"Health check connection test failed: {conn_error}")
                connection_ok = False
                connection_time = time.time() - start_time
            
            self.last_health_check = datetime.now()
            self.health_status = "healthy" if connection_ok else "degraded"
            
            return {
                'status': self.health_status,
                'connection_ok': connection_ok,
                'connection_time': connection_time,
                'circuit_breaker': self.circuit_breaker.get_state(),
                'pool_stats': self.smtp_pool.get_stats(),
                'last_check': self.last_health_check.isoformat(),
                'note': 'Service will create connections on-demand when sending emails' if not connection_ok else None
            }
            
        except Exception as e:
            self.health_status = "degraded"
            logger.error(f"Health check failed: {e}")
            return {
                'status': 'degraded',
                'error': str(e),
                'last_check': datetime.now().isoformat(),
                'note': 'Service will create connections on-demand when sending emails'
            }
    
    async def send_email_async(self, to_email: str, subject: str, content: str, 
                              content_type: str = "html", attachments: Optional[List[str]] = None) -> bool:
        """Send email asynchronously with circuit breaker protection"""
        loop = asyncio.get_event_loop()
        
        try:
            return await loop.run_in_executor(
                self.executor,
                lambda: self.circuit_breaker.call(
                    self.send_email_sync, to_email, subject, content, content_type, attachments
                )
            )
        except Exception as e:
            logger.error(f"Circuit breaker prevented email to {to_email}: {e}")
            return False
    
    def send_email_sync(self, to_email: str, subject: str, content: str, 
                       content_type: str = "html", attachments: Optional[List[str]] = None, 
                       max_retries: int = 3) -> bool:
        """Send email synchronously with retry logic and robust error handling"""
        if self.development_mode:
            logger.info(f"[DEV MODE] Email to {to_email}: {subject}")
            logger.debug(f"[DEV MODE] Content: {content[:100]}...")
            return True
        
        last_error = None
        
        for attempt in range(max_retries):
            server = None
            try:
                # Get connection from pool with retry
                try:
                    server = self.smtp_pool.get_connection_with_retry()
                except Exception as conn_error:
                    raise Exception(f"Failed to establish SMTP connection: {conn_error}")
                
                if not server:
                    raise Exception("Failed to get SMTP connection from pool")
                
                # Create message
                message = MIMEMultipart("alternative")
                message["From"] = self.settings.FROM_EMAIL or self.settings.EMAIL_USER
                message["To"] = to_email
                message["Subject"] = subject
                
                # Add content
                if content_type.lower() == "html":
                    part = MIMEText(content, "html", "utf-8")
                else:
                    part = MIMEText(content, "plain", "utf-8")
                message.attach(part)
                
                # Add attachments if provided
                if attachments:
                    for file_path in attachments:
                        self._add_attachment(message, file_path)
                
                # Send email with timeout
                start_time = time.time()
                server.sendmail(
                    self.settings.FROM_EMAIL or self.settings.EMAIL_USER,
                    to_email,
                    message.as_string()
                )
                send_time = time.time() - start_time
                
                # Update stats
                with self.smtp_pool.lock:
                    self.smtp_pool.stats['total_emails_sent'] += 1
                
                logger.info(f"Email sent successfully to {to_email} in {send_time:.2f}s (attempt {attempt + 1})")
                return True
                
            except smtplib.SMTPRecipientsRefused as e:
                logger.error(f"SMTP Recipients Refused for {to_email}: {e}")
                last_error = f"Recipients refused: {e}"
                # Don't retry for recipient errors
                break
                
            except smtplib.SMTPSenderRefused as e:
                logger.error(f"SMTP Sender Refused: {e}")
                last_error = f"Sender refused: {e}"
                # Don't retry for sender errors
                break
                
            except smtplib.SMTPDataError as e:
                logger.error(f"SMTP Data Error: {e}")
                last_error = f"Data error: {e}"
                # Don't retry for data errors
                break
                
            except (smtplib.SMTPServerDisconnected, smtplib.SMTPConnectError, 
                   socket.timeout, socket.error, ConnectionError, OSError) as e:
                last_error = f"Connection error: {e}"
                logger.warning(f"SMTP connection error on attempt {attempt + 1}: {e}")
                
                # Force close the problematic connection
                if server:
                    self.smtp_pool.return_connection(server, force_close=True)
                    server = None
                
                # Retry for connection errors
                if attempt < max_retries - 1:
                    delay = min(2 ** attempt + random.uniform(0, 1), 10)  # Max 10 seconds
                    logger.info(f"Retrying email to {to_email} in {delay:.2f}s...")
                    time.sleep(delay)
                    continue
                
            except Exception as e:
                last_error = f"Unexpected error: {e}"
                logger.error(f"Unexpected error sending email to {to_email} on attempt {attempt + 1}: {e}")
                
                # Force close the connection on unexpected errors
                if server:
                    self.smtp_pool.return_connection(server, force_close=True)
                    server = None
                
                # Retry for unexpected errors
                if attempt < max_retries - 1:
                    delay = min(2 ** attempt + random.uniform(0, 1), 10)
                    logger.info(f"Retrying email to {to_email} in {delay:.2f}s...")
                    time.sleep(delay)
                    continue
            
            finally:
                # Return connection to pool if still valid
                if server:
                    self.smtp_pool.return_connection(server)
        
        logger.error(f"Failed to send email to {to_email} after {max_retries} attempts. Last error: {last_error}")
        return False
    
    def _add_attachment(self, message: MIMEMultipart, file_path: str):
        """Add file attachment to email"""
        try:
            if not os.path.exists(file_path):
                logger.warning(f"Attachment file not found: {file_path}")
                return
            
            with open(file_path, "rb") as attachment:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(attachment.read())
            
            encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition",
                f"attachment; filename= {os.path.basename(file_path)}",
            )
            message.attach(part)
            
        except Exception as e:
            logger.error(f"Failed to add attachment {file_path}: {e}")
    
    async def send_template_email(self, to_email: str, template_name: str, 
                                 subject: str, context: Dict[str, Any], 
                                 attachments: Optional[List[str]] = None) -> bool:
        """Send email using Jinja2 template"""
        try:
            template = self.jinja_env.get_template(f"{template_name}.html")
            content = template.render(**context)
            
            return await self.send_email_async(
                to_email=to_email,
                subject=subject,
                content=content,
                content_type="html",
                attachments=attachments
            )
            
        except Exception as e:
            logger.error(f"Failed to send template email {template_name} to {to_email}: {e}")
            return False
    
    async def send_password_reset_email(self, user_email: str, user_name: str, 
                                       reset_url: str, timestamp: str, 
                                       ip_address: str = None) -> bool:
        """Send password reset email using template"""
        try:
            # Prepare template context
            context = {
                'user_name': user_name,
                'user_email': user_email,
                'reset_url': reset_url,
                'timestamp': timestamp,
                'ip_address': ip_address
            }
            
            # Send email using template
            success = await self.send_template_email(
                to_email=user_email,
                template_name="password_reset",
                subject="🔐 Password Reset Request - CampusConnect",
                context=context
            )
            
            if success:
                logger.info(f"Password reset email sent successfully to {user_email}")
            else:
                logger.error(f"Failed to send password reset email to {user_email}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending password reset email to {user_email}: {e}")
            return False
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get comprehensive service statistics"""
        pool_stats = self.smtp_pool.get_stats()
        circuit_state = self.circuit_breaker.get_state()
        
        return {
            'service_info': {
                'status': self.health_status,
                'development_mode': self.development_mode,
                'smtp_server': self.settings.SMTP_SERVER,
                'smtp_port': self.settings.SMTP_PORT,
                'from_email': self.settings.FROM_EMAIL or self.settings.EMAIL_USER,
                'last_health_check': self.last_health_check.isoformat() if self.last_health_check else None
            },
            'smtp_pool': pool_stats,
            'circuit_breaker': circuit_state
        }
    
    def __del__(self):
        """Cleanup when service is destroyed"""
        try:
            if hasattr(self, 'executor'):
                self.executor.shutdown(wait=False)
            if hasattr(self, 'smtp_pool'):
                self.smtp_pool.cleanup_pool()
        except:
            pass


# Create global instance
communication_service = CommunicationService()

# Backward compatibility functions
async def send_email(to_email: str, subject: str, content: str, 
                    content_type: str = "html", attachments: Optional[List[str]] = None) -> bool:
    """Backward compatibility function"""
    return await communication_service.send_email_async(to_email, subject, content, content_type, attachments)

async def send_template_email(to_email: str, template_name: str, subject: str, 
                            context: Dict[str, Any], attachments: Optional[List[str]] = None) -> bool:
    """Backward compatibility function"""
    return await communication_service.send_template_email(to_email, template_name, subject, context, attachments)
