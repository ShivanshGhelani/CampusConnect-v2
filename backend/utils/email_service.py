import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from core.logger import get_logger
from config.settings import get_settings
import os

logger = get_logger(__name__)

class EmailService:
    def __init__(self):
        # Get settings from the configured settings module
        settings = get_settings()
        
        # Email configuration from settings (which loads from .env)
        self.smtp_server = settings.SMTP_SERVER
        self.smtp_port = settings.SMTP_PORT
        self.email_user = settings.EMAIL_USER
        self.email_password = settings.EMAIL_PASSWORD
        self.from_email = settings.FROM_EMAIL or settings.EMAIL_USER
        self.development_mode = os.getenv("EMAIL_DEVELOPMENT_MODE", "false").lower() == "true"
        
        # Log configuration (without sensitive data)
        logger.info(f"Email service initialized:")
        logger.info(f"  SMTP Server: {self.smtp_server}:{self.smtp_port}")
        logger.info(f"  Email User: {self.email_user[:5]}...@{self.email_user.split('@')[1] if '@' in self.email_user else 'not_set'}")
        logger.info(f"  From Email: {self.from_email[:5]}...@{self.from_email.split('@')[1] if '@' in self.from_email else 'not_set'}")
        logger.info(f"  Development Mode: {self.development_mode}")
        logger.info(f"  Password Set: {'Yes' if self.email_password else 'No'}")
        logger.info(f"  Password Length: {len(self.email_password) if self.email_password else 0}")
        
        # Check for common issues
        if self.email_password and isinstance(self.email_password, bytes):
            logger.warning("Email password appears to be bytes instead of string - converting")
            self.email_password = self.email_password.decode('utf-8')
        
        if self.email_user and isinstance(self.email_user, bytes):
            logger.warning("Email user appears to be bytes instead of string - converting")
            self.email_user = self.email_user.decode('utf-8')

    async def send_password_reset_email(self, user_email: str, user_name: str, reset_url: str, timestamp: str) -> bool:
        """Send password reset email with professional template"""
        try:
            if self.development_mode:
                logger.info(f"[DEVELOPMENT MODE] Password reset email for {user_name} ({user_email})")
                logger.info(f"[DEVELOPMENT MODE] Reset URL: {reset_url}")
                logger.info(f"[DEVELOPMENT MODE] Timestamp: {timestamp}")
                return True

            subject = "Password Reset Request - CampusConnect"
            
            # HTML email template
            html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - CampusConnect</title>
    <style>
        body {{ 
            font-family: 'Segoe UI', Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background-color: #f5f5f5; 
            margin: 0; 
            padding: 0; 
        }}
        .email-container {{ 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff; 
            border-radius: 12px; 
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); 
            overflow: hidden; 
        }}
        .header {{ 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            padding: 30px 20px; 
            text-align: center; 
            color: white; 
        }}
        .logo {{ 
            font-size: 28px; 
            font-weight: bold; 
            margin-bottom: 10px; 
        }}
        .subtitle {{ 
            font-size: 16px; 
            opacity: 0.9; 
        }}
        .content {{ 
            padding: 40px 30px; 
        }}
        .greeting {{ 
            font-size: 20px; 
            font-weight: 600; 
            color: #2c3e50; 
            margin-bottom: 20px; 
        }}
        .message {{ 
            font-size: 16px; 
            color: #555; 
            margin-bottom: 25px; 
            line-height: 1.7; 
        }}
        .reset-button {{ 
            display: inline-block; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white !important; 
            padding: 16px 32px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: 600; 
            font-size: 16px; 
            margin: 20px 0; 
        }}
        .security-notice {{ 
            background-color: #fff3cd; 
            border: 1px solid #ffeaa7; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 25px 0; 
        }}
        .security-notice h3 {{ 
            color: #856404; 
            font-size: 16px; 
            margin-bottom: 10px; 
        }}
        .security-notice p {{ 
            color: #856404; 
            font-size: 14px; 
            margin-bottom: 8px; 
        }}
        .footer {{ 
            background-color: #f8f9fa; 
            padding: 30px 20px; 
            text-align: center; 
            border-top: 1px solid #eee; 
        }}
        .footer-content {{ 
            font-size: 14px; 
            color: #666; 
            margin-bottom: 15px; 
        }}
        .copy-url {{
            word-break: break-all; 
            background-color: #f8f9fa; 
            padding: 12px; 
            border-radius: 6px; 
            margin: 10px 0; 
            font-family: monospace; 
            font-size: 13px;
        }}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🎓 CampusConnect</div>
            <div class="subtitle">Campus Management System</div>
        </div>
        
        <div class="content">
            <div class="greeting">Hello {user_name}!</div>
            
            <div class="message">
                We received a request to reset your password for your CampusConnect account. If you made this request, click the button below to reset your password.
            </div>
            
            <div class="security-notice">
                <h3>⚠️ Security Notice</h3>
                <p>• This password reset link will expire in <strong>10 minutes</strong></p>
                <p>• Only use this link if you requested a password reset</p>
                <p>• Never share this link with anyone</p>
                <p>• If you didn't request this, please ignore this email</p>
            </div>
            
            <div style="text-align: center;">
                <a href="{reset_url}" class="reset-button">Reset My Password</a>
            </div>
            
            <div class="message">
                <strong>Request time:</strong> {timestamp}<br>
                <strong>If the button doesn't work:</strong> Copy and paste this link into your browser:
            </div>
            <div class="copy-url">{reset_url}</div>
        </div>
        
        <div class="footer">
            <div class="footer-content">
                <strong>CampusConnect</strong><br>
                Your Campus Management Platform
            </div>
            <div style="font-size: 12px; color: #999;">
                This is an automated message. Please do not reply to this email.<br>
                For support, contact: support@campusconnect.edu
            </div>
        </div>
    </div>
</body>
</html>"""

            # Text version as fallback
            text_body = f"""Hello {user_name}!

We received a request to reset your password for your CampusConnect account.

Reset your password by clicking this link: {reset_url}

This link will expire in 10 minutes for security reasons.
Request time: {timestamp}

If you didn't request this password reset, please ignore this email.

Best regards,
CampusConnect Team"""

            return await self._send_email(user_email, subject, html_body, text_body)
            
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")
            return False

    async def _send_email(self, to_email: str, subject: str, html_body: str, text_body: str = None) -> bool:
        """Internal method to send email"""
        try:
            # Ensure all inputs are strings and properly encoded
            to_email = str(to_email).strip()
            subject = str(subject).strip()
            html_body = str(html_body)
            if text_body:
                text_body = str(text_body)
            
            # Ensure email credentials are properly formatted strings
            email_user = str(self.email_user).strip() if self.email_user else ""
            email_password = str(self.email_password).strip() if self.email_password else ""
            from_email = str(self.from_email).strip() if self.from_email else email_user
            
            if not email_user or not email_password:
                logger.error("Email credentials not configured properly")
                return False
            
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = from_email
            message["To"] = to_email

            # Add text version
            if text_body:
                text_part = MIMEText(text_body, "plain", "utf-8")
                message.attach(text_part)

            # Add HTML version
            html_part = MIMEText(html_body, "html", "utf-8")
            message.attach(html_part)

            # Send email with proper string handling
            context = ssl.create_default_context()
            with smtplib.SMTP(str(self.smtp_server), int(self.smtp_port)) as server:
                server.starttls(context=context)
                # Ensure login credentials are clean strings
                server.login(email_user, email_password)
                server.sendmail(from_email, to_email, message.as_string())

            logger.info(f"Password reset email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return False

# Create singleton instance
email_service = EmailService()
