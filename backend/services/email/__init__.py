# Email Services Package

from .service import EmailService
from .optimized_service import optimized_email_service
from .smtp_pool import smtp_pool
from .queue import certificate_email_queue

__all__ = ["EmailService", "optimized_email_service", "smtp_pool", "certificate_email_queue"]
