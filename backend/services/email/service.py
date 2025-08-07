import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from jinja2 import Environment, FileSystemLoader
import os
from typing import Optional, List
from pathlib import Path
import logging
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor
import threading
import time
from config.settings import get_settings

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        """Initialize the EmailService with SMTP configuration from settings"""
        try:
            self.settings = get_settings()
            
            # SMTP Configuration from settings
            self.smtp_server = self.settings.SMTP_SERVER
            self.smtp_port = self.settings.SMTP_PORT
            self.email_user = self.settings.EMAIL_USER
            self.email_password = self.settings.EMAIL_PASSWORD
            self.from_email = self.settings.FROM_EMAIL or self.email_user
            
            # Email Templates Configuration
            template_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'templates', 'email')
            self.env = Environment(loader=FileSystemLoader(template_dir))
            
            # Thread pool for async email sending
            self.executor = ThreadPoolExecutor(max_workers=3)
            
            # Connection management
            self._connection = None
            self._connection_lock = threading.Lock()
            self._last_activity = None
            self.connection_timeout = 300  # 5 minutes timeout
            self.max_retries = 3
            
            logger.info(f"EmailService initialized with SMTP server: {self.smtp_server}:{self.smtp_port}")
            
        except Exception as e:
            logger.error(f"Failed to initialize EmailService: {str(e)}")
            raise

    def _get_connection(self):
        """Get or create SMTP connection with connection pooling"""
        with self._connection_lock:
            current_time = time.time()
            
            # Check if connection exists and is still valid
            if (self._connection and 
                self._last_activity and 
                (current_time - self._last_activity) < self.connection_timeout):
                try:
                    # Test connection with NOOP command
                    self._connection.noop()
                    logger.debug("Reusing existing SMTP connection")
                    return self._connection
                except Exception as e:
                    logger.warning(f"Existing connection invalid: {str(e)}")
                    self._close_connection()
            
            # Create new connection
            return self._create_new_connection()
    
    def _create_new_connection(self):
        """Create a new SMTP connection"""
        try:
            logger.info(f"Creating new SMTP connection to {self.smtp_server}:{self.smtp_port}")
            
            context = ssl.create_default_context()
            connection = smtplib.SMTP(self.smtp_server, self.smtp_port)
            
            logger.debug("SMTP connection established, starting TLS")
            connection.starttls(context=context)
            
            logger.debug("TLS started, attempting login")
            connection.login(self.email_user, self.email_password)
            
            self._connection = connection
            self._last_activity = time.time()
            
            logger.info("SMTP connection and authentication successful")
            return connection
            
        except Exception as e:
            logger.error(f"Failed to create SMTP connection: {str(e)}")
            raise
    
    def _close_connection(self):
        """Close the current SMTP connection"""
        if self._connection:
            try:
                self._connection.quit()
                logger.debug("SMTP connection closed")
            except:
                pass  # Connection might already be closed
            finally:
                self._connection = None
                self._last_activity = None
    
    def _send_email_sync(self, to_email: str, subject: str, html_content: str, text_content: Optional[str] = None, attachments: Optional[List[str]] = None) -> bool:
        """Synchronous email sending method with connection reuse and retry logic"""
        for attempt in range(self.max_retries):
            try:
                # Create message
                message = MIMEMultipart("mixed")
                message["Subject"] = subject
                message["From"] = self.from_email
                message["To"] = to_email

                # Create alternative container for text and HTML content
                msg_alternative = MIMEMultipart("alternative")

                # Add text content if provided
                if text_content:
                    text_part = MIMEText(text_content, "plain")
                    msg_alternative.attach(text_part)

                # Add HTML content
                html_part = MIMEText(html_content, "html")
                msg_alternative.attach(html_part)

                # Attach the alternative container to the main message
                message.attach(msg_alternative)

                # Add attachments if provided
                if attachments:
                    for attachment_path in attachments:
                        if os.path.exists(attachment_path):
                            with open(attachment_path, "rb") as attachment:
                                part = MIMEBase('application', 'octet-stream')
                                part.set_payload(attachment.read())
                            
                            encoders.encode_base64(part)
                            
                            # Get filename from path
                            filename = os.path.basename(attachment_path)
                            part.add_header(
                                'Content-Disposition',
                                f'attachment; filename= {filename}',
                            )
                            message.attach(part)
                            logger.debug(f"Added attachment: {filename}")

                # Get connection and send email
                connection = self._get_connection()
                connection.sendmail(self.from_email, to_email, message.as_string())
                
                # Update last activity time
                with self._connection_lock:
                    self._last_activity = time.time()
                
                logger.info(f"Email sent successfully to {to_email} (attempt {attempt + 1})")
                return True
                
            except Exception as e:
                logger.warning(f"Failed to send email to {to_email} (attempt {attempt + 1}): {str(e)}")
                
                # Close connection on error to force reconnection
                with self._connection_lock:
                    self._close_connection()
                
                if attempt == self.max_retries - 1:
                    logger.error(f"Failed to send email to {to_email} after {self.max_retries} attempts")
                    return False
                else:
                    # Wait before retrying
                    time.sleep(2 ** attempt)  # Exponential backoff
        
        return False

    async def send_email_async(self, to_email: str, subject: str, html_content: str, text_content: Optional[str] = None, attachments: Optional[List[str]] = None) -> bool:
        """Asynchronous email sending method with attachment support"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor, 
            self._send_email_sync, 
            to_email,            subject, 
            html_content, 
            text_content,
            attachments
        )
        
    def render_template(self, template_name: str, **kwargs) -> str:
        """Render email template with provided context"""
        try:
            template = self.env.get_template(template_name)
            return template.render(**kwargs)
        except Exception as e:
            logger.error(f"Failed to render template {template_name}: {str(e)}")
            return f"<html><body><h1>Email Content</h1><p>Error rendering template: {str(e)}</p></body></html>"    
    async def send_registration_confirmation(
        self, 
        student_email: str, 
        student_name: str, 
        event_title: str, 
        start_datetime: str, 
        event_venue: str,
        registration_id: Optional[str] = None
    ) -> bool:
        """Send registration confirmation email"""        
        try:
            subject = f"Registration Confirmed - {event_title}"
            
            # Use a default date if not provided
            event_date = start_datetime if start_datetime else "Date to be announced"
            
            html_content = self.render_template(
                'registration_confirmation.html',
                student_name=student_name,
                event_title=event_title,
                event_date=event_date,  # Keep event_date for template compatibility
                event_venue=event_venue if event_venue else "Venue to be announced",
                registration_id=registration_id
            )
            
            return await self.send_email_async(student_email, subject, html_content)
            
        except Exception as e:
            logger.error(f"Failed to send registration confirmation: {str(e)}")
            return False

    async def send_payment_confirmation(
        self, 
        student_email: str, 
        student_name: str, 
        event_title: str, 
        amount: float, 
        payment_id: str,
        event_date: Optional[str] = None
    ) -> bool:
        """Send payment confirmation email"""
        try:
            subject = f"Payment Confirmed - {event_title}"
            
            html_content = self.render_template(
                'payment_confirmation.html',
                student_name=student_name,                event_title=event_title,
                amount=amount,
                payment_id=payment_id,
                event_date=event_date
            )
            
            return await self.send_email_async(student_email, subject, html_content)
            
        except Exception as e:
            logger.error(f"Failed to send payment confirmation: {str(e)}")
            return False
            
    async def send_attendance_confirmation(
        self, 
        student_email: str, 
        student_name: str, 
        event_title: str, 
        attendance_date: str,
        event_venue: Optional[str] = None,
        attendance_id: Optional[str] = None,
        attendance_time: Optional[str] = None
    ) -> bool:
        """Send attendance confirmation email"""
        try:
            subject = f"Attendance Confirmed - {event_title}"
            
            # Format attendance time if provided
            formatted_time = None
            if attendance_time:
                if isinstance(attendance_time, str):
                    # Try to extract time from ISO format
                    if 'T' in attendance_time:
                        time_part = attendance_time.split('T')[1][:5]  # Get HH:MM
                        formatted_time = time_part
                else:
                    formatted_time = attendance_time.strftime("%H:%M") if hasattr(attendance_time, 'strftime') else str(attendance_time)
            
            html_content = self.render_template(
                'attendance_confirmation.html',
                student_name=student_name,
                event_title=event_title,
                attendance_date=attendance_date,
                event_venue=event_venue,
                attendance_id=attendance_id,
                attendance_time=formatted_time
            )
            
            return await self.send_email_async(student_email, subject, html_content)
            
        except Exception as e:
            logger.error(f"Failed to send attendance confirmation: {str(e)}")
            return False

    async def send_feedback_confirmation(
        self, 
        student_email: str, 
        student_name: str, 
        event_title: str,
        event_date: Optional[str] = None
    ) -> bool:
        """Send feedback submission confirmation email"""
        try:
            subject = f"Thank you for your feedback - {event_title}"
            
            html_content = self.render_template(
                'feedback_confirmation.html',
                student_name=student_name,
                event_title=event_title,
                event_date=event_date
            )
            
            return await self.send_email_async(student_email, subject, html_content)
            
        except Exception as e:
            logger.error(f"Failed to send feedback confirmation: {str(e)}")
            return False

    async def send_event_reminder(
        self, 
        student_email: str, 
        student_name: str, 
        event_title: str, 
        event_date: str, 
        event_venue: str,
        reminder_type: str = "upcoming"
    ) -> bool:
        """Send event reminder email"""
        try:
            subject = f"Reminder: {event_title} - {reminder_type.title()}"
            
            html_content = self.render_template(
                'event_reminder.html',
                student_name=student_name,
                event_title=event_title,
                event_date=event_date,
                event_venue=event_venue,
                reminder_type=reminder_type
            )
            
            return await self.send_email_async(student_email, subject, html_content)
            
        except Exception as e:
            logger.error(f"Failed to send event reminder: {str(e)}")
            return False

    async def send_certificate_notification(
        self, 
        student_email: str, 
        student_name: str, 
        event_title: str, 
        certificate_url: str,
        event_date: Optional[str] = None,
        certificate_pdf_path: Optional[str] = None
    ) -> bool:
        """Send certificate available notification email"""
        try:
            subject = f"Certificate Available - {event_title}"
            
            html_content = self.render_template(
                'certificate_notification.html',
                student_name=student_name,
                event_title=event_title,
                certificate_url=certificate_url,
                event_date=event_date
            )
            
            attachments = []
            if certificate_pdf_path and Path(certificate_pdf_path).exists():
                attachments.append(str(certificate_pdf_path))
            
            return await self.send_email_async(student_email, subject, html_content, attachments=attachments)
            
        except Exception as e:
            logger.error(f"Failed to send certificate notification: {str(e)}")
            return False

    async def send_new_event_notification(
        self, 
        student_email: str, 
        student_name: str, 
        event_title: str, 
        event_date: str, 
        event_venue: str,
        registration_url: Optional[str] = None
    ) -> bool:
        """Send new event notification email"""
        try:
            subject = f"New Event Available: {event_title}"
            
            html_content = self.render_template(
                'new_event_notification.html',
                student_name=student_name,
                event_title=event_title,
                event_date=event_date,
                event_venue=event_venue,
                registration_url=registration_url
            )
            
            return await self.send_email_async(student_email, subject, html_content)
            
        except Exception as e:
            logger.error(f"Failed to send new event notification: {str(e)}")
            return False

    async def send_bulk_emails(self, email_tasks: List[tuple]) -> List[bool]:
        """Send multiple emails concurrently"""
        try:
            tasks = []
            for task in email_tasks:
                method_name, args = task[0], task[1:]
                if hasattr(self, method_name):
                    method = getattr(self, method_name)
                    tasks.append(method(*args))
            
            if tasks:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                return [isinstance(result, bool) and result for result in results]
            return []
            
        except Exception as e:
            logger.error(f"Failed to send bulk emails: {str(e)}")
            return [False] * len(email_tasks)

    async def send_welcome_email(
        self, 
        student_email: str, 
        student_name: str, 
        enrollment_no: str,
        department: str,
        semester: int,
        created_at: str,
        platform_url: str = "https://your-platform-url.com"
    ) -> bool:
        """Send welcome email after account creation"""
        try:
            subject = f"Welcome to CampusConnect - {student_name}!"
            
            html_content = self.render_template(
                'welcome_account_created.html',
                student_name=student_name,
                enrollment_no=enrollment_no,
                email=student_email,
                department=department,
                semester=semester,
                created_at=created_at,
                platform_url=platform_url
            )
            
            return await self.send_email_async(student_email, subject, html_content)
            
        except Exception as e:
            logger.error(f"Failed to send welcome email: {str(e)}")
            return False

    async def send_password_reset_email(
        self, 
        user_email: str, 
        user_name: str, 
        reset_url: str,
        timestamp: str
    ) -> bool:
        """Send password reset email with secure token link"""
        try:
            subject = "Password Reset Request - CampusConnect"
            
            html_content = self.render_template(
                'password_reset.html',
                user_name=user_name,
                reset_url=reset_url,
                timestamp=timestamp
            )
            
            # Create a simple text version as fallback
            text_content = f"""
Hello {user_name}!

We received a request to reset your password for your CampusConnect account.

Reset your password by clicking this link: {reset_url}

This link will expire in 10 minutes for security reasons.

If you didn't request this password reset, please ignore this email.

Best regards,
CampusConnect Team
            """.strip()
            
            return await self.send_email_async(user_email, subject, html_content, text_content)
            
        except Exception as e:
            logger.error(f"Failed to send password reset email: {str(e)}")
            return False

    async def send_team_registration_confirmation(
        self, 
        team_members: List[dict],
        event_title: str, 
        event_date: str, 
        event_venue: str,
        team_name: str,
        team_registration_id: str,
        event_url: Optional[str] = None,
        payment_required: bool = False,
        payment_amount: Optional[float] = None
    ) -> bool:
        """Send team registration confirmation to all team members"""
        try:
            subject = f"Team Registration Confirmed - {event_title}"
            
            # Send email to all team members
            email_tasks = []
            for member in team_members:
                html_content = self.render_template(
                    'team_registration_confirmation.html',
                    team_name=team_name,
                    event_title=event_title,
                    event_date=event_date,
                    event_venue=event_venue,
                    team_registration_id=team_registration_id,
                    team_members=team_members,
                    event_url=event_url,
                    payment_required=payment_required,
                    payment_amount=payment_amount
                )
                
                task = self.send_email_async(member['email'], subject, html_content)
                email_tasks.append(task)
            
            results = await asyncio.gather(*email_tasks, return_exceptions=True)
            success_count = sum(1 for result in results if isinstance(result, bool) and result)
            
            logger.info(f"Team registration emails sent: {success_count}/{len(team_members)} successful")
            return success_count > 0
            
        except Exception as e:
            logger.error(f"Failed to send team registration confirmation: {str(e)}")
            return False

    async def send_event_reminder_bulk(
        self, 
        registered_students: List[dict],
        event_title: str, 
        event_date: str, 
        event_venue: str,
        reminder_type: str = "upcoming"
    ) -> List[bool]:
        """Send event reminders to all registered students for an event"""
        try:
            email_tasks = []
            for student in registered_students:
                task = self.send_event_reminder(
                    student['email'],
                    student['full_name'],
                    event_title,
                    event_date,
                    event_venue,
                    reminder_type
                )
                email_tasks.append(task)
            
            if email_tasks:
                results = await asyncio.gather(*email_tasks, return_exceptions=True)
                success_results = [isinstance(result, bool) and result for result in results]
                
                success_count = sum(success_results)
                logger.info(f"Event reminder emails sent: {success_count}/{len(registered_students)} successful")
                
                return success_results
            return []
            
        except Exception as e:
            logger.error(f"Failed to send bulk event reminders: {str(e)}")
            return [False] * len(registered_students)

    # Note: Super Admin approval requests are handled via notification center, not email

    def close_connection(self):
        """Manually close the SMTP connection"""
        with self._connection_lock:
            self._close_connection()
            logger.info("SMTP connection manually closed")
    
    def is_connected(self) -> bool:
        """Check if there's an active SMTP connection"""
        with self._connection_lock:
            if not self._connection:
                return False
            try:
                self._connection.noop()
                return True
            except:
                self._close_connection()
                return False
    
    def get_connection_stats(self) -> dict:
        """Get connection statistics"""
        with self._connection_lock:
            return {
                "is_connected": self.is_connected(),
                "last_activity": self._last_activity,
                "connection_timeout": self.connection_timeout,
                "max_retries": self.max_retries
            }

    def __del__(self):
        """Clean up the thread pool executor and SMTP connection"""
        if hasattr(self, '_connection'):
            self._close_connection()
        if hasattr(self, 'executor'):
            self.executor.shutdown(wait=False)