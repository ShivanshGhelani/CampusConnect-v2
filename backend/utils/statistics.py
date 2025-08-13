"""
Statistics utilities for CampusConnect
Fetches real data from the database for dashboard statistics
"""
from database.operations import DatabaseOperations
from config.database import Database
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class StatisticsManager:
    """Manager class for fetching platform statistics"""
    
    @staticmethod
    async def get_platform_statistics() -> Dict[str, Any]:
        """
        Fetch real platform statistics from the database
        
        Returns:
            Dict containing:
            - total_events: Total number of events hosted
            - active_students: Total number of registered students  
            - certificates_issued: Total certificates earned by students
            - platform_rating: Average rating from event feedback
        """
        try:
            stats = {
                "total_events": 0,
                "active_students": 0,
                "certificates_issued": 0,
                "platform_rating": 4.5
            }

            # Get total events count
            try:
                events_count = await DatabaseOperations.count_documents("events", {})
                stats["total_events"] = events_count
            except Exception as e:
                logger.warning(f"Failed to fetch events count: {e}")
                stats["total_events"] = 0

            # Get active students count
            try:
                students_count = await DatabaseOperations.count_documents("students", {"is_active": True})
                stats["active_students"] = students_count
            except Exception as e:
                logger.warning(f"Failed to fetch students count: {e}")
                stats["active_students"] = 0

            # Get certificates issued count by counting attendance records
            # (attendance is prerequisite for certificate)
            try:
                certificates_count = await StatisticsManager.get_certificates_count()
                stats["certificates_issued"] = certificates_count
            except Exception as e:
                logger.warning(f"Failed to fetch certificates count: {e}")
                stats["certificates_issued"] = 0
            
            # Calculate platform rating from feedback
            try:
                avg_rating = await StatisticsManager.get_average_rating()
                stats["platform_rating"] = avg_rating
            except Exception as e:
                logger.warning(f"Failed to fetch platform rating: {e}")
                stats["platform_rating"] = 4.5
            
            return stats
            
        except Exception as e:
            logger.error(f"Error fetching platform statistics: {e}")
            # Return default fallback statistics
            return {
                "total_events": 0,
                "active_students": 0,
                "certificates_issued": 0,
                "platform_rating": 4.5
            }
    
    @staticmethod
    async def get_certificates_count() -> int:
        """
        Count total certificates that can be issued based on attendance records
        Since certificates are issued to students who attended events
        """
        try:
            # Get all events to check their individual attendance collections
            events = await DatabaseOperations.find_many("events", {})
            total_certificates = 0
            
            for event in events:
                event_id = event.get("event_id")
                if not event_id:
                    continue
                    
                try:
                    # Count attendance records for this event (students who attended)
                    attendance_count = await DatabaseOperations.count_documents("attendance", {
                        "event_id": event_id,
                        "attendance_status": "present"
                    })
                    total_certificates += attendance_count
                except Exception as e:
                    logger.debug(f"Could not count attendance for event {event_id}: {e}")
                    continue
            
            return total_certificates
            
        except Exception as e:
            logger.error(f"Error counting certificates: {e}")
            return 0
    
    @staticmethod
    async def get_average_rating() -> float:
        """
        Calculate average platform rating from event feedback
        """
        try:
            # Get all events to check their individual feedback collections
            events = await DatabaseOperations.find_many("events", {})
            total_rating = 0.0
            total_feedback = 0
            
            for event in events:
                event_id = event.get("event_id")
                if not event_id:
                    continue
                    
                try:
                    # Get all feedback for this event
                    feedbacks = await DatabaseOperations.find_many("feedback", {"event_id": event_id})
                    for feedback in feedbacks:
                        # Use overall_satisfaction rating (1-5 scale)
                        rating = feedback.get("overall_satisfaction")
                        if rating and isinstance(rating, (int, float)) and 1 <= rating <= 5:
                            total_rating += rating
                            total_feedback += 1
                except Exception as e:
                    logger.debug(f"Could not access feedback for event {event_id}: {e}")
                    continue
            
            if total_feedback > 0:
                avg_rating = round(total_rating / total_feedback, 1)
                return min(max(avg_rating, 1.0), 5.0)  # Ensure rating is between 1-5
            else:
                return 4.5  # Default rating when no feedback exists
                
        except Exception as e:
            logger.error(f"Error calculating average rating: {e}")
            return 4.5
    
    @staticmethod
    def format_stat_number(number: int) -> str:
        """
        Format numbers for display (e.g., 1200 -> 1.2K, 15000 -> 15K)
        """
        if number >= 1000000:
            return f"{number / 1000000:.1f}M"
        elif number >= 1000:
            return f"{number / 1000:.1f}K"
        else:
            return str(number)
    
    @staticmethod
    def format_rating(rating: float) -> str:
        """
        Format rating for display (e.g., 4.7 -> 4.7★)
        """
        return f"{rating:.1f}★"
    
    @classmethod
    async def get_event_statistics(cls, event_id: str) -> Dict[str, Any]:
        """Get statistics for a specific event using unified participation system"""
        try:
            # Get all participations for this event
            participations = await DatabaseOperations.find_many(
                "student_event_participations", 
                {"event.event_id": event_id}
            )
            
            total_registrations = len(participations)
            attendance_marked = sum(1 for p in participations if p.get("attendance", {}).get("is_eligible", False))
            feedback_submitted = sum(1 for p in participations if p.get("feedback", {}).get("submitted", False))
            certificates_issued = sum(1 for p in participations if p.get("certificate", {}).get("issued", False))
            
            return {
                "registrations": total_registrations,
                "attendance": attendance_marked,
                "feedback": feedback_submitted,
                "certificates": certificates_issued
            }
            
        except Exception as e:
            logger.error(f"Error fetching event statistics: {e}")
            return {
                "registrations": 0,
                "attendance": 0,
                "feedback": 0,
                "certificates": 0
            }
