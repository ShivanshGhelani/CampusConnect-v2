"""
Unified Communication Service for CampusConnect
Consolidates all email functionality with optimized performance and notification integration
"""
import smtplib
import ssl
import os
import logging
import asyncio
import threading
import time
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

from config.settings import get_settings

logger = logging.getLogger(__name__)

class SMTPConnectionPool:
    """
    High-performance SMTP connection pool
    Manages reusable connections to eliminate overhead
    """
    
    def __init__(self, max_connections=5):
        self.settings = get_settings()
        self.max_connections = max_connections
        self.connections = Queue(maxsize=max_connections)
        self.lock = threading.Lock()
        self.stats = {
            'connections_created': 0,
            'connections_reused': 0,
            'failed_connections': 0,
            'total_emails_sent': 0
        }
        
        # Pre-create initial connections
        self._initialize_pool()
    
    def _initialize_pool(self):
        """Pre-create initial connections"""
        for _ in range(min(2, self.max_connections)):
            try:
                conn = self._create_connection()
                if conn:
                    self.connections.put(conn)
            except Exception as e:
                logger.warning(f"Failed to pre-create SMTP connection: {e}")
    
    def _create_connection(self):
        """Create a new SMTP connection"""
        try:
            context = ssl.create_default_context()
            server = smtplib.SMTP(self.settings.SMTP_SERVER, self.settings.SMTP_PORT)
            server.starttls(context=context)
            server.login(self.settings.EMAIL_USER, self.settings.EMAIL_PASSWORD)
            
            with self.lock:
                self.stats['connections_created'] += 1
            
            logger.debug("Created new SMTP connection")
            return server
            
        except Exception as e:
            with self.lock:
                self.stats['failed_connections'] += 1
            logger.error(f"Failed to create SMTP connection: {e}")
            return None
    
    def get_connection(self):
        """Get a connection from the pool"""
        try:
            # Try to get existing connection
            if not self.connections.empty():
                conn = self.connections.get_nowait()
                # Test if connection is still alive
                try:
                    conn.noop()
                    with self.lock:
                        self.stats['connections_reused'] += 1
                    return conn
                except:
                    # Connection is dead, create new one
                    pass
            
            # Create new connection if none available or existing is dead
            return self._create_connection()
            
        except Exception as e:
            logger.error(f"Error getting SMTP connection: {e}")
            return None
    
    def return_connection(self, conn):
        """Return a connection to the pool"""
        try:
            if conn and not self.connections.full():
                self.connections.put_nowait(conn)
            elif conn:
                # Pool is full, close the connection
                conn.quit()
        except Exception as e:
            logger.warning(f"Error returning connection to pool: {e}")
    
    def get_stats(self):
        """Get connection pool statistics"""
        with self.lock:
            return self.stats.copy()


class CommunicationService:
    """
    Unified Communication Service for CampusConnect
    Handles email sending, templating, and notification delivery
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.smtp_pool = SMTPConnectionPool()
        self.development_mode = os.getenv("EMAIL_DEVELOPMENT_MODE", "false").lower() == "true"
        
        # Template configuration
        template_dir = Path(__file__).parent.parent.parent / "templates" / "email"
        self.jinja_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=True
        )
        
        # Thread pool for async operations
        self.executor = ThreadPoolExecutor(max_workers=3, thread_name_prefix="email")
        
        logger.info(f"Communication service initialized:")
        logger.info(f"  SMTP Server: {self.settings.SMTP_SERVER}:{self.settings.SMTP_PORT}")
        logger.info(f"  Email User: {self.settings.EMAIL_USER[:5]}...@{self.settings.EMAIL_USER.split('@')[1] if '@' in self.settings.EMAIL_USER else 'not_set'}")
        logger.info(f"  Development Mode: {self.development_mode}")
    
    async def send_email_async(self, to_email: str, subject: str, content: str, 
                              content_type: str = "html", attachments: Optional[List[str]] = None) -> bool:
        """
        Send email asynchronously using connection pool
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor, 
            self.send_email_sync, 
            to_email, subject, content, content_type, attachments
        )
    
    def send_email_sync(self, to_email: str, subject: str, content: str, 
                       content_type: str = "html", attachments: Optional[List[str]] = None) -> bool:
        """
        Send email synchronously using connection pool
        """
        if self.development_mode:
            logger.info(f"[DEV MODE] Email to {to_email}: {subject}")
            logger.debug(f"[DEV MODE] Content: {content[:100]}...")
            return True
        
        server = None
        try:
            # Get connection from pool
            server = self.smtp_pool.get_connection()
            if not server:
                logger.error("Failed to get SMTP connection from pool")
                return False
            
            # Create message
            message = MIMEMultipart("alternative")
            message["From"] = self.settings.FROM_EMAIL or self.settings.EMAIL_USER
            message["To"] = to_email
            message["Subject"] = subject
            
            # Add content
            if content_type.lower() == "html":
                part = MIMEText(content, "html")
            else:
                part = MIMEText(content, "plain")
            message.attach(part)
            
            # Add attachments if provided
            if attachments:
                for file_path in attachments:
                    self._add_attachment(message, file_path)
            
            # Send email
            server.sendmail(
                self.settings.FROM_EMAIL or self.settings.EMAIL_USER,
                to_email,
                message.as_string()
            )
            
            # Update stats
            with self.smtp_pool.lock:
                self.smtp_pool.stats['total_emails_sent'] += 1
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False
        
        finally:
            if server:
                self.smtp_pool.return_connection(server)
    
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
        """
        Send email using Jinja2 template
        """
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
    
    async def send_bulk_emails(self, email_list: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Send bulk emails efficiently
        Each item in email_list should have: to_email, subject, content, [content_type], [attachments]
        """
        results = {
            'total': len(email_list),
            'successful': 0,
            'failed': 0,
            'errors': []
        }
        
        # Process emails concurrently
        tasks = []
        for email_data in email_list:
            task = self.send_email_async(
                to_email=email_data['to_email'],
                subject=email_data['subject'],
                content=email_data['content'],
                content_type=email_data.get('content_type', 'html'),
                attachments=email_data.get('attachments')
            )
            tasks.append(task)
        
        # Execute all tasks
        try:
            results_list = await asyncio.gather(*tasks, return_exceptions=True)
            
            for i, result in enumerate(results_list):
                if isinstance(result, Exception):
                    results['failed'] += 1
                    results['errors'].append({
                        'email': email_list[i]['to_email'],
                        'error': str(result)
                    })
                elif result:
                    results['successful'] += 1
                else:
                    results['failed'] += 1
                    results['errors'].append({
                        'email': email_list[i]['to_email'],
                        'error': 'Unknown error'
                    })
                    
        except Exception as e:
            logger.error(f"Error in bulk email processing: {e}")
            results['failed'] = len(email_list)
        
        logger.info(f"Bulk email results: {results['successful']}/{results['total']} successful")
        return results
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get service statistics"""
        pool_stats = self.smtp_pool.get_stats()
        return {
            'smtp_pool': pool_stats,
            'service_info': {
                'development_mode': self.development_mode,
                'smtp_server': self.settings.SMTP_SERVER,
                'smtp_port': self.settings.SMTP_PORT,
                'from_email': self.settings.FROM_EMAIL or self.settings.EMAIL_USER
            }
        }
    
    def __del__(self):
        """Cleanup when service is destroyed"""
        try:
            if hasattr(self, 'executor'):
                self.executor.shutdown(wait=False)
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
