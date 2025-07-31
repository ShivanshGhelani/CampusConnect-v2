"""
Maintenance service for venue maintenance scheduling and management
"""
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

from config.database import Database
from models.maintenance import (
    MaintenanceWindow, MaintenanceCreate, MaintenanceUpdate, MaintenanceStatus,
    MaintenanceListResponse, MaintenanceResponse, MaintenanceConflict,
    MaintenanceValidationRequest, MaintenanceValidationResponse
)
from core.id_generator import generate_base_id

logger = logging.getLogger(__name__)

class MaintenanceService:
    """Service for managing venue maintenance windows"""
    
    def __init__(self):
        self.collection_name = "maintenance_windows"
        self.venues_collection = "venues"
        self.bookings_collection = "venue_bookings"
    
    async def get_database(self):
        """Get database connection"""
        try:
            return await Database.get_database()
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            return None
    
    async def create_maintenance_window(
        self,
        maintenance_data: MaintenanceCreate,
        created_by: str
    ) -> MaintenanceResponse:
        """Create a new maintenance window"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Validate venue exists
            venue = await db[self.venues_collection].find_one({"id": maintenance_data.venue_id})
            if not venue:
                return MaintenanceResponse(
                    success=False,
                    message="Venue not found"
                )
            
            # Check for conflicts
            validation = await self.validate_maintenance_window(
                MaintenanceValidationRequest(
                    venue_id=maintenance_data.venue_id,
                    start_time=maintenance_data.start_time,
                    end_time=maintenance_data.end_time
                )
            )
            
            # Generate maintenance ID
            maintenance_id = generate_base_id("MAINT", 8)
            
            # Find conflicting bookings
            conflicting_bookings = await self._find_conflicting_bookings(
                maintenance_data.venue_id,
                maintenance_data.start_time,
                maintenance_data.end_time
            )
            
            # Create maintenance window
            maintenance = MaintenanceWindow(
                id=maintenance_id,
                venue_id=maintenance_data.venue_id,
                venue_name=venue.get("name", "Unknown Venue"),
                start_time=maintenance_data.start_time,
                end_time=maintenance_data.end_time,
                reason=maintenance_data.reason,
                status=MaintenanceStatus.SCHEDULED,
                created_by=created_by,
                created_at=datetime.utcnow(),
                affected_bookings=[booking["id"] for booking in conflicting_bookings]
            )
            
            # Insert into database
            result = await db[self.collection_name].insert_one(maintenance.dict())
            
            if result.inserted_id:
                # Handle conflicting bookings
                if conflicting_bookings and maintenance_data.notify_affected_users:
                    await self._handle_booking_conflicts(
                        maintenance_id,
                        conflicting_bookings,
                        maintenance_data.reason
                    )
                
                # Create audit log
                await self._create_maintenance_audit_log(
                    action="create",
                    maintenance_id=maintenance_id,
                    admin_username=created_by,
                    details={
                        "venue_id": maintenance_data.venue_id,
                        "venue_name": venue.get("name"),
                        "start_time": maintenance_data.start_time.isoformat(),
                        "end_time": maintenance_data.end_time.isoformat(),
                        "reason": maintenance_data.reason,
                        "affected_bookings_count": len(conflicting_bookings)
                    }
                )
                
                logger.info(f"Maintenance window created: {maintenance_id} for venue {maintenance_data.venue_id}")
                return MaintenanceResponse(
                    success=True,
                    message="Maintenance window created successfully",
                    maintenance_id=maintenance_id,
                    conflicts=validation.conflicts,
                    affected_bookings_count=len(conflicting_bookings)
                )
            else:
                raise Exception("Failed to create maintenance window")
                
        except Exception as e:
            logger.error(f"Error creating maintenance window: {e}")
            return MaintenanceResponse(success=False, message=str(e))
    
    async def get_maintenance_windows(
        self,
        venue_id: Optional[str] = None,
        status_filter: Optional[List[MaintenanceStatus]] = None,
        include_past: bool = False,
        admin_username: Optional[str] = None
    ) -> MaintenanceListResponse:
        """Get maintenance windows with filtering"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Build filter query
            filter_query = {}
            
            if venue_id:
                filter_query["venue_id"] = venue_id
            
            if status_filter:
                filter_query["status"] = {"$in": [s.value for s in status_filter]}
            
            if not include_past:
                # Only include future or currently active maintenance
                current_time = datetime.utcnow()
                filter_query["end_time"] = {"$gt": current_time}
            
            # Get maintenance windows
            cursor = db[self.collection_name].find(filter_query).sort("start_time", 1)
            maintenance_data = await cursor.to_list(length=None)
            
            # Convert to MaintenanceWindow objects
            maintenance_windows = []
            for maint_data in maintenance_data:
                maint_data["id"] = maint_data.get("_id", maint_data.get("id"))
                # Ensure status is properly converted
                if "status" in maint_data and isinstance(maint_data["status"], str):
                    maint_data["status"] = MaintenanceStatus(maint_data["status"])
                maintenance_windows.append(MaintenanceWindow(**maint_data))
            
            # Calculate counts
            total_count = len(maintenance_windows)
            current_time = datetime.utcnow()
            upcoming_count = len([m for m in maintenance_windows if m.start_time > current_time])
            active_count = len([m for m in maintenance_windows if m.start_time <= current_time <= m.end_time])
            
            return MaintenanceListResponse(
                maintenance_windows=maintenance_windows,
                total_count=total_count,
                upcoming_count=upcoming_count,
                active_count=active_count
            )
            
        except Exception as e:
            logger.error(f"Error getting maintenance windows: {e}")
            return MaintenanceListResponse()
    
    async def update_maintenance_window(
        self,
        maintenance_id: str,
        update_data: MaintenanceUpdate,
        updated_by: str
    ) -> MaintenanceResponse:
        """Update an existing maintenance window"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Get existing maintenance window
            existing = await db[self.collection_name].find_one({"id": maintenance_id})
            if not existing:
                return MaintenanceResponse(
                    success=False,
                    message="Maintenance window not found"
                )
            
            # Prepare update data
            update_fields = {"updated_at": datetime.utcnow()}
            changes = []
            
            if update_data.start_time:
                update_fields["start_time"] = update_data.start_time
                changes.append(f"start_time: {update_data.start_time.isoformat()}")
            
            if update_data.end_time:
                update_fields["end_time"] = update_data.end_time
                changes.append(f"end_time: {update_data.end_time.isoformat()}")
            
            if update_data.reason:
                update_fields["reason"] = update_data.reason
                changes.append(f"reason: {update_data.reason}")
            
            if update_data.status:
                update_fields["status"] = update_data.status.value
                changes.append(f"status: {update_data.status.value}")
            
            # Update in database
            result = await db[self.collection_name].update_one(
                {"id": maintenance_id},
                {"$set": update_fields}
            )
            
            if result.modified_count > 0:
                # Create audit log
                await self._create_maintenance_audit_log(
                    action="update",
                    maintenance_id=maintenance_id,
                    admin_username=updated_by,
                    details={
                        "changes": changes,
                        "venue_id": existing["venue_id"]
                    }
                )
                
                logger.info(f"Maintenance window updated: {maintenance_id}")
                return MaintenanceResponse(
                    success=True,
                    message="Maintenance window updated successfully",
                    maintenance_id=maintenance_id
                )
            else:
                return MaintenanceResponse(
                    success=False,
                    message="No changes were made"
                )
                
        except Exception as e:
            logger.error(f"Error updating maintenance window: {e}")
            return MaintenanceResponse(success=False, message=str(e))
    
    async def cancel_maintenance_window(
        self,
        maintenance_id: str,
        cancelled_by: str,
        reason: Optional[str] = None
    ) -> MaintenanceResponse:
        """Cancel a maintenance window"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Get existing maintenance window
            existing = await db[self.collection_name].find_one({"id": maintenance_id})
            if not existing:
                return MaintenanceResponse(
                    success=False,
                    message="Maintenance window not found"
                )
            
            if existing["status"] in ["completed", "cancelled"]:
                return MaintenanceResponse(
                    success=False,
                    message=f"Cannot cancel maintenance window with status: {existing['status']}"
                )
            
            # Update status to cancelled
            result = await db[self.collection_name].update_one(
                {"id": maintenance_id},
                {
                    "$set": {
                        "status": MaintenanceStatus.CANCELLED.value,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            if result.modified_count > 0:
                # Create audit log
                await self._create_maintenance_audit_log(
                    action="cancel",
                    maintenance_id=maintenance_id,
                    admin_username=cancelled_by,
                    details={
                        "venue_id": existing["venue_id"],
                        "cancellation_reason": reason
                    }
                )
                
                # Notify affected users that maintenance is cancelled
                if existing.get("affected_bookings"):
                    await self._notify_maintenance_cancellation(
                        maintenance_id,
                        existing["affected_bookings"],
                        existing["venue_name"],
                        reason
                    )
                
                logger.info(f"Maintenance window cancelled: {maintenance_id}")
                return MaintenanceResponse(
                    success=True,
                    message="Maintenance window cancelled successfully",
                    maintenance_id=maintenance_id
                )
            else:
                return MaintenanceResponse(
                    success=False,
                    message="Failed to cancel maintenance window"
                )
                
        except Exception as e:
            logger.error(f"Error cancelling maintenance window: {e}")
            return MaintenanceResponse(success=False, message=str(e))
    
    async def validate_maintenance_window(
        self,
        validation_request: MaintenanceValidationRequest
    ) -> MaintenanceValidationResponse:
        """Validate a maintenance window for conflicts"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            conflicts = []
            overlapping_maintenance = []
            
            # Check for overlapping maintenance windows
            overlap_filter = {
                "venue_id": validation_request.venue_id,
                "status": {"$in": ["scheduled", "in_progress"]},
                "$or": [
                    {
                        "start_time": {"$lt": validation_request.end_time},
                        "end_time": {"$gt": validation_request.start_time}
                    }
                ]
            }
            
            if validation_request.exclude_maintenance_id:
                overlap_filter["id"] = {"$ne": validation_request.exclude_maintenance_id}
            
            overlapping = await db[self.collection_name].find(overlap_filter).to_list(length=None)
            overlapping_maintenance = [m["id"] for m in overlapping]
            
            # Check for conflicting bookings
            conflicting_bookings = await self._find_conflicting_bookings(
                validation_request.venue_id,
                validation_request.start_time,
                validation_request.end_time
            )
            
            # Create conflict objects
            for booking in conflicting_bookings:
                conflicts.append(MaintenanceConflict(
                    maintenance_id="",  # Not yet created
                    booking_id=booking["id"],
                    event_name=booking.get("event_name", "Unknown Event"),
                    conflict_type="overlap",
                    resolution_required=True
                ))
            
            is_valid = len(overlapping_maintenance) == 0
            message = "Maintenance window is valid"
            
            if overlapping_maintenance:
                message = f"Conflicts with {len(overlapping_maintenance)} existing maintenance window(s)"
            elif conflicts:
                message = f"Would affect {len(conflicts)} existing booking(s)"
            
            return MaintenanceValidationResponse(
                valid=is_valid,
                conflicts=conflicts,
                overlapping_maintenance=overlapping_maintenance,
                message=message
            )
            
        except Exception as e:
            logger.error(f"Error validating maintenance window: {e}")
            return MaintenanceValidationResponse(
                valid=False,
                conflicts=[],
                overlapping_maintenance=[],
                message=str(e)
            )
    
    async def check_venue_availability(
        self,
        venue_id: str,
        start_time: datetime,
        end_time: datetime
    ) -> bool:
        """Check if venue is available (no active maintenance)"""
        try:
            db = await self.get_database()
            if db is None:
                return True  # Assume available if DB check fails
            
            # Check for active maintenance windows
            maintenance_filter = {
                "venue_id": venue_id,
                "status": {"$in": ["scheduled", "in_progress"]},
                "$or": [
                    {
                        "start_time": {"$lt": end_time},
                        "end_time": {"$gt": start_time}
                    }
                ]
            }
            
            maintenance_count = await db[self.collection_name].count_documents(maintenance_filter)
            return maintenance_count == 0
            
        except Exception as e:
            logger.error(f"Error checking venue availability: {e}")
            return True  # Assume available on error
    
    async def _find_conflicting_bookings(
        self,
        venue_id: str,
        start_time: datetime,
        end_time: datetime
    ) -> List[Dict[str, Any]]:
        """Find bookings that conflict with maintenance window"""
        try:
            db = await self.get_database()
            if db is None:
                return []
            
            # Find overlapping bookings
            conflict_filter = {
                "venue_id": venue_id,
                "status": {"$in": ["pending", "approved"]},
                "$or": [
                    {
                        "start_datetime": {"$lt": end_time.isoformat()},
                        "end_datetime": {"$gt": start_time.isoformat()}
                    }
                ]
            }
            
            conflicting_bookings = await db[self.bookings_collection].find(conflict_filter).to_list(length=None)
            return conflicting_bookings
            
        except Exception as e:
            logger.error(f"Error finding conflicting bookings: {e}")
            return []
    
    async def _handle_booking_conflicts(
        self,
        maintenance_id: str,
        conflicting_bookings: List[Dict[str, Any]],
        maintenance_reason: str
    ):
        """Handle bookings that conflict with maintenance"""
        try:
            # Import here to avoid circular imports
            from services.notification_service import notification_service
            
            for booking in conflicting_bookings:
                # Send notification to booking organizer
                await notification_service.create_notification(
                    notification_type="VENUE_MAINTENANCE_CONFLICT",
                    title="Venue Booking Affected by Maintenance",
                    message=f"Your booking for '{booking.get('event_name')}' may be affected by scheduled maintenance. Reason: {maintenance_reason}",
                    recipient_username=booking.get("booked_by"),
                    recipient_role="organizer_admin",
                    related_entity_type="maintenance_window",
                    related_entity_id=maintenance_id,
                    priority="HIGH",
                    metadata={
                        "booking_id": booking["id"],
                        "venue_id": booking["venue_id"],
                        "maintenance_reason": maintenance_reason
                    }
                )
            
        except Exception as e:
            logger.error(f"Error handling booking conflicts: {e}")
    
    async def _notify_maintenance_cancellation(
        self,
        maintenance_id: str,
        affected_booking_ids: List[str],
        venue_name: str,
        cancellation_reason: Optional[str]
    ):
        """Notify users about maintenance cancellation"""
        try:
            # Import here to avoid circular imports
            from services.notification_service import notification_service
            
            db = await self.get_database()
            if db is None:
                return
            
            # Get affected bookings
            bookings = await db[self.bookings_collection].find(
                {"id": {"$in": affected_booking_ids}}
            ).to_list(length=None)
            
            for booking in bookings:
                await notification_service.create_notification(
                    notification_type="VENUE_MAINTENANCE_CANCELLED",
                    title="Venue Maintenance Cancelled",
                    message=f"The scheduled maintenance for {venue_name} has been cancelled. Your booking for '{booking.get('event_name')}' is no longer affected.",
                    recipient_username=booking.get("booked_by"),
                    recipient_role="organizer_admin",
                    related_entity_type="maintenance_window",
                    related_entity_id=maintenance_id,
                    priority="MEDIUM",
                    metadata={
                        "booking_id": booking["id"],
                        "venue_name": venue_name,
                        "cancellation_reason": cancellation_reason
                    }
                )
            
        except Exception as e:
            logger.error(f"Error notifying maintenance cancellation: {e}")
    
    async def _create_maintenance_audit_log(
        self,
        action: str,
        maintenance_id: str,
        admin_username: str,
        details: Dict[str, Any]
    ):
        """Create audit log for maintenance actions"""
        try:
            # Import here to avoid circular imports
            from services.audit_log_service import audit_log_service
            
            await audit_log_service.create_audit_log(
                action=f"maintenance_{action}",
                entity_type="maintenance_window",
                entity_id=maintenance_id,
                admin_username=admin_username,
                details=details,
                changes=details.get("changes", [])
            )
            
        except Exception as e:
            logger.error(f"Error creating maintenance audit log: {e}")

# Create singleton instance
maintenance_service = MaintenanceService()
