"""
Communication Service Module
Unified email and notification services for CampusConnect
"""

from .email_service import communication_service, send_email, send_template_email

__all__ = ['communication_service', 'send_email', 'send_template_email']
