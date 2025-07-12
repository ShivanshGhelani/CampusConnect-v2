"""
Email Queue System for Certificate Delivery

This module implements a background queue system for sending certificate emails
to handle high concurrent loads efficiently without blocking the main application.
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass
from pathlib import Path
import base64
from tempfile import NamedTemporaryFile
from concurrent.futures import ThreadPoolExecutor
import threading

from services.email.optimized_service import optimized_email_service
from database.operations import DatabaseOperations
from core.js_certificate_generator import generate_certificate_file_name

logger = logging.getLogger(__name__)

@dataclass
class CertificateEmailTask:
    """Represents a certificate email task in the queue"""
    task_id: str
    event_id: str
    enrollment_no: str
    student_name: str
    student_email: str
    event_title: str
    pdf_base64: str
    file_name: str
    created_at: datetime
    attempts: int = 0
    max_attempts: int = 3
    
class CertificateEmailQueue:
    """Background queue system for certificate email delivery"""
    
    def __init__(self, max_workers: int = 5, batch_size: int = 10):
        self.queue = asyncio.Queue(maxsize=1000)  # Max 1000 pending emails
        self.max_workers = max_workers
        self.batch_size = batch_size
        self.workers = []
        self.running = False
        self.stats = {
            "total_queued": 0,
            "total_sent": 0,
            "total_failed": 0,
            "current_queue_size": 0,
            "active_workers": 0
        }
        self._lock = threading.Lock()
        
    async def start(self):
        """Start the email queue workers"""
        if self.running:
            return
            
        self.running = True
        # Use the global optimized email service (no need to create instance)
        
        # Start worker tasks
        for i in range(self.max_workers):
            worker = asyncio.create_task(self._worker(f"worker-{i+1}"))
            self.workers.append(worker)
            
        logger.info(f"Certificate email queue started with {self.max_workers} workers")
        
    async def stop(self):
        """Stop the email queue workers"""
        if not self.running:
            return
            
        self.running = False
        
        # Cancel all workers
        for worker in self.workers:
            worker.cancel()
            
        # Wait for workers to finish
        await asyncio.gather(*self.workers, return_exceptions=True)
        
        self.workers.clear()
        logger.info("Certificate email queue stopped")
        
    async def add_certificate_email(
        self, 
        event_id: str,
        enrollment_no: str,
        student_name: str,
        student_email: str,
        event_title: str,
        pdf_base64: str,
        file_name: str
    ) -> bool:
        """Add a certificate email task to the queue"""
        
        try:
            # Check if already sent (one-time logic)
            student_doc = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
            if not student_doc:
                logger.error(f"Student {enrollment_no} not found")
                return False
                
            event_participations = student_doc.get("event_participations", {})
            participation = event_participations.get(event_id, {})
            
            if participation.get("certificate_email_sent", False):
                logger.info(f"Certificate email already sent for student {enrollment_no} and event {event_id}")
                return True  # Return success since email was already sent
            
            # Create task
            task = CertificateEmailTask(
                task_id=f"{enrollment_no}_{event_id}_{datetime.now().timestamp()}",
                event_id=event_id,
                enrollment_no=enrollment_no,
                student_name=student_name,
                student_email=student_email,
                event_title=event_title,
                pdf_base64=pdf_base64,
                file_name=file_name,
                created_at=datetime.now()
            )
            
            # Add to queue (non-blocking)
            try:
                self.queue.put_nowait(task)
                with self._lock:
                    self.stats["total_queued"] += 1
                    self.stats["current_queue_size"] = self.queue.qsize()
                    
                logger.info(f"Added certificate email task to queue: {task.task_id}")
                return True
                
            except asyncio.QueueFull:
                logger.error("Certificate email queue is full, rejecting new task")
                return False
                
        except Exception as e:
            logger.error(f"Error adding certificate email to queue: {str(e)}")
            return False
            
    async def _worker(self, worker_name: str):
        """Background worker to process email tasks"""
        logger.info(f"Certificate email worker {worker_name} started")
        
        while self.running:
            try:
                # Get task from queue with timeout
                task = await asyncio.wait_for(self.queue.get(), timeout=1.0)
                
                with self._lock:
                    self.stats["active_workers"] += 1
                    self.stats["current_queue_size"] = self.queue.qsize()
                
                # Process the task
                success = await self._process_email_task(task, worker_name)
                
                # Update stats
                with self._lock:
                    self.stats["active_workers"] -= 1
                    if success:
                        self.stats["total_sent"] += 1
                    else:
                        self.stats["total_failed"] += 1
                
                # Mark task as done
                self.queue.task_done()
                
            except asyncio.TimeoutError:
                # No task available, continue
                continue
            except asyncio.CancelledError:
                # Worker cancelled
                break
            except Exception as e:
                logger.error(f"Worker {worker_name} error: {str(e)}")
                continue
                
        logger.info(f"Certificate email worker {worker_name} stopped")
        
    async def _process_email_task(self, task: CertificateEmailTask, worker_name: str) -> bool:
        """Process a single email task"""
        temp_file_path = None
        
        try:
            logger.info(f"[{worker_name}] Processing certificate email for {task.enrollment_no}")
            
            # Check if already sent (double-check)
            student_doc = await DatabaseOperations.find_one("students", {"enrollment_no": task.enrollment_no})
            if student_doc:
                participation = student_doc.get("event_participations", {}).get(task.event_id, {})
                if participation.get("certificate_email_sent", False):
                    logger.info(f"[{worker_name}] Email already sent for {task.enrollment_no}, skipping")
                    return True
            
            # Decode and validate PDF data
            pdf_data = base64.b64decode(task.pdf_base64)
            if not pdf_data.startswith(b'%PDF'):
                logger.error(f"[{worker_name}] Invalid PDF data for task {task.task_id}")
                return False
                
            # Create temporary file
            safe_file_name = generate_certificate_file_name(task.student_name, task.event_title)
            with NamedTemporaryFile(delete=False, suffix='.pdf', prefix=f'{safe_file_name}_') as temp_file:
                temp_file.write(pdf_data)
                temp_file_path = temp_file.name
                  # Send email using optimized email service
            success = await optimized_email_service.send_certificate_notification(
                student_email=task.student_email,
                student_name=task.student_name,
                event_title=task.event_title,
                certificate_url=f"/client/events/{task.event_id}/certificate",
                event_date=None,  # We can add this to the task if needed
                certificate_pdf_path=temp_file_path
            )
            
            if success:
                # Mark as sent in database
                await DatabaseOperations.update_one(
                    "students",
                    {"enrollment_no": task.enrollment_no},
                    {"$set": {f"event_participations.{task.event_id}.certificate_email_sent": True}}
                )
                logger.info(f"[{worker_name}] Certificate email sent successfully for {task.enrollment_no}")
                return True
            else:
                logger.error(f"[{worker_name}] Failed to send email for {task.enrollment_no}")
                return False
                
        except Exception as e:
            logger.error(f"[{worker_name}] Error processing email task {task.task_id}: {str(e)}")
            return False
            
        finally:
            # Clean up temporary file
            if temp_file_path and Path(temp_file_path).exists():
                try:
                    Path(temp_file_path).unlink()
                    logger.debug(f"[{worker_name}] Cleaned up temporary file: {temp_file_path}")
                except Exception as cleanup_error:
                    logger.warning(f"[{worker_name}] Failed to clean up temporary file: {cleanup_error}")
                    
    def get_stats(self) -> Dict:
        """Get queue statistics"""
        with self._lock:
            return {
                **self.stats,
                "current_queue_size": self.queue.qsize(),
                "running": self.running,
                "max_workers": self.max_workers
            }

# Global email queue instance
certificate_email_queue = CertificateEmailQueue(max_workers=5, batch_size=10)
