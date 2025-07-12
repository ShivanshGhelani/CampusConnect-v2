"""
High-Performance SMTP Connection Pool for Certificate Email System

This module provides a singleton SMTP connection pool that efficiently manages
persistent connections to handle high-volume email sending without the overhead
of creating new connections for each email.

Features:
- Connection pooling with configurable pool size
- Automatic connection health checks and recovery
- Thread-safe operation for concurrent access
- Connection recycling to prevent timeouts
- Comprehensive monitoring and statistics
"""

import smtplib
import ssl
import threading
import time
import logging
from typing import Optional, Dict, List
from dataclasses import dataclass
from queue import Queue, Empty
from contextlib import contextmanager
from config.settings import get_settings

logger = logging.getLogger(__name__)

@dataclass
class ConnectionStats:
    """Statistics for connection pool monitoring"""
    total_connections_created: int = 0
    total_connections_closed: int = 0
    total_emails_sent: int = 0
    active_connections: int = 0
    pool_size: int = 0
    connections_in_use: int = 0
    failed_connections: int = 0

class SMTPConnection:
    """Wrapper for SMTP connection with health tracking"""
    
    def __init__(self, smtp_server: str, smtp_port: int, email_user: str, email_password: str):
        self.smtp_server = smtp_server
        self.smtp_port = smtp_port
        self.email_user = email_user
        self.email_password = email_password
        self.connection: Optional[smtplib.SMTP] = None
        self.created_at = time.time()
        self.last_used = time.time()
        self.email_count = 0
        self.is_healthy = False
        self.connection_id = id(self)
        
    def connect(self) -> bool:
        """Establish SMTP connection"""
        try:
            logger.debug(f"Creating SMTP connection {self.connection_id}")
            
            context = ssl.create_default_context()
            self.connection = smtplib.SMTP(self.smtp_server, self.smtp_port)
            self.connection.starttls(context=context)
            self.connection.login(self.email_user, self.email_password)
            
            self.is_healthy = True
            self.last_used = time.time()
            logger.info(f"SMTP connection {self.connection_id} established successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create SMTP connection {self.connection_id}: {str(e)}")
            self.is_healthy = False
            self.close()
            return False
    
    def test_health(self) -> bool:
        """Test if connection is still healthy"""
        if not self.connection or not self.is_healthy:
            return False
            
        try:
            # Use NOOP to test connection
            self.connection.noop()
            return True
        except Exception as e:
            logger.warning(f"Connection {self.connection_id} health check failed: {str(e)}")
            self.is_healthy = False
            return False
    
    def send_email(self, from_email: str, to_email: str, message: str) -> bool:
        """Send email using this connection"""
        if not self.is_healthy or not self.connection:
            return False
            
        try:
            self.connection.sendmail(from_email, to_email, message)
            self.last_used = time.time()
            self.email_count += 1
            return True
        except Exception as e:
            logger.error(f"Failed to send email via connection {self.connection_id}: {str(e)}")
            self.is_healthy = False
            return False
    
    def close(self):
        """Close the SMTP connection"""
        if self.connection:
            try:
                self.connection.quit()
            except:
                pass  # Connection might already be closed
            finally:
                self.connection = None
                self.is_healthy = False
                logger.debug(f"SMTP connection {self.connection_id} closed")
    
    def should_recycle(self, max_age_seconds: int = 3600, max_emails: int = 100) -> bool:
        """Check if connection should be recycled"""
        age = time.time() - self.created_at
        return (age > max_age_seconds or 
                self.email_count > max_emails or 
                not self.is_healthy)

class SMTPConnectionPool:
    """High-performance SMTP connection pool singleton"""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized'):
            return
            
        self._initialized = True
        self.settings = get_settings()
        
        # Configuration
        self.smtp_server = self.settings.SMTP_SERVER
        self.smtp_port = self.settings.SMTP_PORT
        self.email_user = self.settings.EMAIL_USER
        self.email_password = self.settings.EMAIL_PASSWORD
        self.from_email = self.settings.FROM_EMAIL or self.email_user
        
        # Pool configuration
        self.pool_size = 5  # Maximum number of connections in pool
        self.max_connection_age = 3600  # 1 hour max connection age
        self.max_emails_per_connection = 100  # Recycle after 100 emails
        
        # Pool state
        self.pool: Queue = Queue(maxsize=self.pool_size)
        self.pool_lock = threading.Lock()
        self.stats = ConnectionStats()
        self.stats.pool_size = self.pool_size
        
        # Health monitoring
        self.health_check_interval = 300  # 5 minutes
        self.last_health_check = 0
        
        logger.info(f"SMTP Connection Pool initialized: {self.smtp_server}:{self.smtp_port}, pool_size={self.pool_size}")
    
    def _create_connection(self) -> Optional[SMTPConnection]:
        """Create a new SMTP connection"""
        conn = SMTPConnection(
            self.smtp_server, 
            self.smtp_port, 
            self.email_user, 
            self.email_password
        )
        
        if conn.connect():
            with self.pool_lock:
                self.stats.total_connections_created += 1
                self.stats.active_connections += 1
            return conn
        else:
            with self.pool_lock:
                self.stats.failed_connections += 1
            return None
    
    def _cleanup_unhealthy_connections(self):
        """Remove unhealthy connections from pool"""
        healthy_connections = []
        
        # Drain the pool
        while True:
            try:
                conn = self.pool.get_nowait()
                if conn.test_health() and not conn.should_recycle(self.max_connection_age, self.max_emails_per_connection):
                    healthy_connections.append(conn)
                else:
                    conn.close()
                    with self.pool_lock:
                        self.stats.total_connections_closed += 1
                        self.stats.active_connections -= 1
            except Empty:
                break
        
        # Put healthy connections back
        for conn in healthy_connections:
            try:
                self.pool.put_nowait(conn)
            except:
                conn.close()  # Pool is full, close excess connections
                with self.pool_lock:
                    self.stats.total_connections_closed += 1
                    self.stats.active_connections -= 1
    
    def _health_check(self):
        """Periodic health check of connections"""
        current_time = time.time()
        if current_time - self.last_health_check < self.health_check_interval:
            return
            
        logger.debug("Performing SMTP connection pool health check")
        self._cleanup_unhealthy_connections()
        self.last_health_check = current_time
        
        with self.pool_lock:
            logger.info(f"Pool health check complete. Active connections: {self.stats.active_connections}, Pool size: {self.pool.qsize()}")
    
    @contextmanager
    def get_connection(self):
        """Get a connection from the pool (context manager)"""
        self._health_check()
        conn = None
        
        try:
            # Try to get existing connection from pool
            try:
                conn = self.pool.get_nowait()
                # Test connection health
                if not conn.test_health():
                    conn.close()
                    with self.pool_lock:
                        self.stats.total_connections_closed += 1
                        self.stats.active_connections -= 1
                    conn = None
            except Empty:
                pass
            
            # Create new connection if needed
            if conn is None:
                conn = self._create_connection()
                if conn is None:
                    raise Exception("Failed to create SMTP connection")
            
            with self.pool_lock:
                self.stats.connections_in_use += 1
            
            yield conn
            
        finally:
            with self.pool_lock:
                self.stats.connections_in_use -= 1
            
            # Return connection to pool or close if unhealthy
            if conn:
                if (conn.is_healthy and 
                    not conn.should_recycle(self.max_connection_age, self.max_emails_per_connection)):
                    try:
                        self.pool.put_nowait(conn)
                    except:
                        # Pool is full, close connection
                        conn.close()
                        with self.pool_lock:
                            self.stats.total_connections_closed += 1
                            self.stats.active_connections -= 1
                else:
                    conn.close()
                    with self.pool_lock:
                        self.stats.total_connections_closed += 1
                        self.stats.active_connections -= 1
    
    def send_email_with_pool(self, to_email: str, message: str) -> bool:
        """Send email using connection pool"""
        try:
            with self.get_connection() as conn:
                success = conn.send_email(self.from_email, to_email, message)
                if success:
                    with self.pool_lock:
                        self.stats.total_emails_sent += 1
                    logger.debug(f"Email sent successfully to {to_email} via connection {conn.connection_id}")
                return success
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    def get_stats(self) -> Dict:
        """Get connection pool statistics"""
        with self.pool_lock:
            return {
                "total_connections_created": self.stats.total_connections_created,
                "total_connections_closed": self.stats.total_connections_closed,
                "total_emails_sent": self.stats.total_emails_sent,
                "active_connections": self.stats.active_connections,
                "pool_size": self.stats.pool_size,
                "current_pool_size": self.pool.qsize(),
                "connections_in_use": self.stats.connections_in_use,
                "failed_connections": self.stats.failed_connections,
                "pool_utilization": f"{(self.stats.connections_in_use / self.pool_size * 100):.1f}%"
            }
    
    def shutdown(self):
        """Gracefully shutdown the connection pool"""
        logger.info("Shutting down SMTP connection pool")
        
        # Close all connections in pool
        while True:
            try:
                conn = self.pool.get_nowait()
                conn.close()
                with self.pool_lock:
                    self.stats.total_connections_closed += 1
                    self.stats.active_connections -= 1
            except Empty:
                break
        
        logger.info("SMTP connection pool shutdown complete")

# Global singleton instance
smtp_pool = SMTPConnectionPool()
