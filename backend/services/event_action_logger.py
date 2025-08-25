"""
Event Action Logger Service
Unified logging service for all event-related actions including both audit logs and status logs.
Handles manual actions (created_by, updated_by, cancelled_by) and automatic scheduler changes.
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from config.database import Database
from services.audit_service import AuditLogService
from models.audit_log import AuditActionType, AuditSeverity
from database.operations import DatabaseOperations

logger = logging.getLogger(__name__)

class EventActionLogger:
    """Unified service for logging all event-related actions"""
    
    def __init__(self):
        self.audit_service = AuditLogService()
        self.status_logs_collection = "event_status_logs"
    
    async def log_event_created(
        self, 
        event_id: str, 
        event_name: str, 
        created_by_username: str, 
        created_by_role: str,
        event_data: Dict[str, Any],
        request_metadata: Optional[Dict[str, Any]] = None
    ):
        """Log event creation with both audit and status logging"""
        try:
            # 1. Log to audit_logs for administrative tracking
            await self.audit_service.log_action(
                action_type=AuditActionType.EVENT_CREATED,
                action_description=f"Event created: {event_name}",
                performed_by_username=created_by_username,
                performed_by_role=created_by_role,
                target_type="event",
                target_id=event_id,
                target_name=event_name,
                after_data={
                    "event_id": event_id,
                    "event_name": event_name,
                    "event_type": event_data.get("event_type"),
                    "organizing_department": event_data.get("organizing_department"),
                    "start_datetime": event_data.get("start_datetime").isoformat() if event_data.get("start_datetime") else None,
                    "end_datetime": event_data.get("end_datetime").isoformat() if event_data.get("end_datetime") else None,
                    "status": event_data.get("status"),
                    "mode": event_data.get("mode"),
                    "venue": event_data.get("venue")
                },
                metadata={
                    "action_source": "manual",
                    "creation_timestamp": datetime.utcnow().isoformat(),
                    **(request_metadata or {})
                },
                severity=AuditSeverity.INFO
            )
            
            # 2. Log to event_status_logs for enhanced status tracking
            status_log_entry = {
                "event_id": event_id,
                "action_type": "event_created",
                "old_status": None,
                "new_status": f"{event_data.get('status', 'unknown')}/{event_data.get('sub_status', 'unknown')}",
                "trigger_type": "manual_creation",
                "performed_by": created_by_username,
                "performed_by_role": created_by_role,
                "timestamp": datetime.utcnow(),
                "scheduler_version": "manual_v1",
                "metadata": {
                    "event_name": event_name,
                    "event_type": event_data.get("event_type"),
                    "organizing_department": event_data.get("organizing_department"),
                    "action_source": "admin_portal"
                }
            }
            
            await DatabaseOperations.insert_one(self.status_logs_collection, status_log_entry)
            
            logger.info(f"✅ Event creation logged: {event_id} by {created_by_username}")
            
        except Exception as e:
            logger.error(f"❌ Failed to log event creation for {event_id}: {str(e)}")
    
    async def log_event_updated(
        self, 
        event_id: str, 
        event_name: str, 
        updated_by_username: str, 
        updated_by_role: str,
        before_data: Dict[str, Any],
        after_data: Dict[str, Any],
        updated_fields: list,
        request_metadata: Optional[Dict[str, Any]] = None
    ):
        """Log event update with both audit and status logging"""
        try:
            # 1. Log to audit_logs for administrative tracking
            await self.audit_service.log_action(
                action_type=AuditActionType.EVENT_UPDATED,
                action_description=f"Event updated: {event_name} (Fields: {', '.join(updated_fields)})",
                performed_by_username=updated_by_username,
                performed_by_role=updated_by_role,
                target_type="event",
                target_id=event_id,
                target_name=event_name,
                before_data={
                    "event_name": before_data.get("event_name"),
                    "status": before_data.get("status"),
                    "start_datetime": before_data.get("start_datetime").isoformat() if before_data.get("start_datetime") else None,
                    "end_datetime": before_data.get("end_datetime").isoformat() if before_data.get("end_datetime") else None,
                    "venue": before_data.get("venue"),
                    "mode": before_data.get("mode")
                },
                after_data={
                    "event_name": after_data.get("event_name"),
                    "status": after_data.get("status"),
                    "start_datetime": after_data.get("start_datetime").isoformat() if after_data.get("start_datetime") else None,
                    "end_datetime": after_data.get("end_datetime").isoformat() if after_data.get("end_datetime") else None,
                    "venue": after_data.get("venue"),
                    "mode": after_data.get("mode")
                },
                metadata={
                    "action_source": "manual",
                    "updated_fields": updated_fields,
                    "update_timestamp": datetime.utcnow().isoformat(),
                    **(request_metadata or {})
                },
                severity=AuditSeverity.INFO
            )
            
            # 2. Log to event_status_logs for enhanced status tracking
            status_log_entry = {
                "event_id": event_id,
                "action_type": "event_updated",
                "old_status": f"{before_data.get('status', 'unknown')}/{before_data.get('sub_status', 'unknown')}",
                "new_status": f"{after_data.get('status', 'unknown')}/{after_data.get('sub_status', 'unknown')}",
                "trigger_type": "manual_update",
                "performed_by": updated_by_username,
                "performed_by_role": updated_by_role,
                "timestamp": datetime.utcnow(),
                "scheduler_version": "manual_v1",
                "metadata": {
                    "event_name": event_name,
                    "updated_fields": updated_fields,
                    "action_source": "admin_portal",
                    "significant_changes": self._identify_significant_changes(updated_fields)
                }
            }
            
            await DatabaseOperations.insert_one(self.status_logs_collection, status_log_entry)
            
            logger.info(f"✅ Event update logged: {event_id} by {updated_by_username} (Fields: {updated_fields})")
            
        except Exception as e:
            logger.error(f"❌ Failed to log event update for {event_id}: {str(e)}")
    
    async def log_event_deleted(
        self, 
        event_id: str, 
        event_name: str, 
        deleted_by_username: str, 
        deleted_by_role: str,
        event_data: Dict[str, Any],
        deletion_reason: Optional[str] = None,
        request_metadata: Optional[Dict[str, Any]] = None
    ):
        """Log event deletion with both audit and status logging"""
        try:
            # 1. Log to audit_logs for administrative tracking
            await self.audit_service.log_action(
                action_type=AuditActionType.EVENT_DELETED,
                action_description=f"Event deleted: {event_name}" + (f" (Reason: {deletion_reason})" if deletion_reason else ""),
                performed_by_username=deleted_by_username,
                performed_by_role=deleted_by_role,
                target_type="event",
                target_id=event_id,
                target_name=event_name,
                before_data={
                    "event_id": event_id,
                    "event_name": event_name,
                    "status": event_data.get("status"),
                    "organizing_department": event_data.get("organizing_department"),
                    "start_datetime": event_data.get("start_datetime").isoformat() if event_data.get("start_datetime") else None,
                    "end_datetime": event_data.get("end_datetime").isoformat() if event_data.get("end_datetime") else None,
                    "created_at": event_data.get("created_at").isoformat() if event_data.get("created_at") else None
                },
                metadata={
                    "action_source": "manual",
                    "deletion_reason": deletion_reason,
                    "deletion_timestamp": datetime.utcnow().isoformat(),
                    **(request_metadata or {})
                },
                severity=AuditSeverity.WARNING
            )
            
            # 2. Log to event_status_logs for enhanced status tracking
            status_log_entry = {
                "event_id": event_id,
                "action_type": "event_deleted",
                "old_status": f"{event_data.get('status', 'unknown')}/{event_data.get('sub_status', 'unknown')}",
                "new_status": "deleted/removed",
                "trigger_type": "manual_deletion",
                "performed_by": deleted_by_username,
                "performed_by_role": deleted_by_role,
                "timestamp": datetime.utcnow(),
                "scheduler_version": "manual_v1",
                "metadata": {
                    "event_name": event_name,
                    "deletion_reason": deletion_reason,
                    "action_source": "admin_portal",
                    "final_status": event_data.get("status")
                }
            }
            
            await DatabaseOperations.insert_one(self.status_logs_collection, status_log_entry)
            
            logger.info(f"✅ Event deletion logged: {event_id} by {deleted_by_username}")
            
        except Exception as e:
            logger.error(f"❌ Failed to log event deletion for {event_id}: {str(e)}")
    
    async def log_event_cancelled(
        self, 
        event_id: str, 
        event_name: str, 
        cancelled_by_username: str, 
        cancelled_by_role: str,
        event_data: Dict[str, Any],
        cancellation_reason: Optional[str] = None,
        request_metadata: Optional[Dict[str, Any]] = None
    ):
        """Log event cancellation with both audit and status logging"""
        try:
            # 1. Log to audit_logs for administrative tracking
            await self.audit_service.log_action(
                action_type=AuditActionType.EVENT_CANCELLED,
                action_description=f"Event cancelled: {event_name}" + (f" (Reason: {cancellation_reason})" if cancellation_reason else ""),
                performed_by_username=cancelled_by_username,
                performed_by_role=cancelled_by_role,
                target_type="event",
                target_id=event_id,
                target_name=event_name,
                before_data={
                    "status": event_data.get("status"),
                    "sub_status": event_data.get("sub_status")
                },
                after_data={
                    "status": "cancelled",
                    "sub_status": "cancelled_by_admin"
                },
                metadata={
                    "action_source": "manual",
                    "cancellation_reason": cancellation_reason,
                    "cancellation_timestamp": datetime.utcnow().isoformat(),
                    **(request_metadata or {})
                },
                severity=AuditSeverity.WARNING
            )
            
            # 2. Log to event_status_logs for enhanced status tracking
            status_log_entry = {
                "event_id": event_id,
                "action_type": "event_cancelled",
                "old_status": f"{event_data.get('status', 'unknown')}/{event_data.get('sub_status', 'unknown')}",
                "new_status": "cancelled/cancelled_by_admin",
                "trigger_type": "manual_cancellation",
                "performed_by": cancelled_by_username,
                "performed_by_role": cancelled_by_role,
                "timestamp": datetime.utcnow(),
                "scheduler_version": "manual_v1",
                "metadata": {
                    "event_name": event_name,
                    "cancellation_reason": cancellation_reason,
                    "action_source": "admin_portal",
                    "previous_status": event_data.get("status")
                }
            }
            
            await DatabaseOperations.insert_one(self.status_logs_collection, status_log_entry)
            
            logger.info(f"✅ Event cancellation logged: {event_id} by {cancelled_by_username}")
            
        except Exception as e:
            logger.error(f"❌ Failed to log event cancellation for {event_id}: {str(e)}")
    
    async def log_status_change(
        self, 
        event_id: str, 
        event_name: str, 
        old_status: str, 
        new_status: str,
        trigger_source: str = "scheduler",
        performed_by: Optional[str] = None,
        performed_by_role: Optional[str] = None,
        trigger_type: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log automatic status changes (from scheduler) with enhanced tracking"""
        try:
            # Enhanced status log entry
            status_log_entry = {
                "event_id": event_id,
                "action_type": "status_changed",
                "old_status": old_status,
                "new_status": new_status,
                "trigger_type": trigger_type or "automatic_scheduler",
                "performed_by": performed_by or "system_scheduler",
                "performed_by_role": performed_by_role or "system",
                "timestamp": datetime.utcnow(),
                "scheduler_version": "dynamic_v1" if trigger_source == "scheduler" else "manual_v1",
                "metadata": {
                    "event_name": event_name,
                    "trigger_source": trigger_source,
                    "action_source": "automatic_scheduler" if trigger_source == "scheduler" else "manual_action",
                    **(metadata or {})
                }
            }
            
            await DatabaseOperations.insert_one(self.status_logs_collection, status_log_entry)
            
            logger.info(f"✅ Status change logged: {event_id} - {old_status} → {new_status} (Source: {trigger_source})")
            
        except Exception as e:
            logger.error(f"❌ Failed to log status change for {event_id}: {str(e)}")
    
    def _identify_significant_changes(self, updated_fields: list) -> list:
        """Identify which updated fields are considered significant"""
        significant_fields = [
            "start_datetime", "end_datetime", "registration_start_date", 
            "registration_end_date", "venue", "venue_id", "mode", 
            "status", "event_name", "organizing_department"
        ]
        
        return [field for field in updated_fields if field in significant_fields]
    
    async def get_event_action_history(
        self, 
        event_id: str, 
        include_audit_logs: bool = True, 
        include_status_logs: bool = True
    ) -> Dict[str, Any]:
        """Get complete action history for an event"""
        try:
            history = {
                "event_id": event_id,
                "audit_logs": [],
                "status_logs": [],
                "summary": {}
            }
            
            if include_audit_logs:
                try:
                    db = await Database.get_database()
                    if db and "audit_logs" in await db.list_collection_names():
                        audit_logs = await db.audit_logs.find(
                            {"target_id": event_id}
                        ).sort("timestamp", -1).to_list(length=100)
                        history["audit_logs"] = audit_logs
                except Exception as e:
                    logger.warning(f"Failed to fetch audit logs: {str(e)}")
            
            if include_status_logs:
                try:
                    status_logs = await DatabaseOperations.find_many(
                        self.status_logs_collection,
                        {"event_id": event_id},
                        sort_by=[("timestamp", -1)],
                        limit=100
                    )
                    history["status_logs"] = status_logs or []
                except Exception as e:
                    logger.warning(f"Failed to fetch status logs: {str(e)}")
            
            # Generate summary
            total_actions = len(history["audit_logs"]) + len(history["status_logs"])
            history["summary"] = {
                "total_actions": total_actions,
                "audit_entries": len(history["audit_logs"]),
                "status_entries": len(history["status_logs"]),
                "last_activity": None
            }
            
            # Find last activity
            all_timestamps = []
            for log in history["audit_logs"]:
                if log.get("timestamp"):
                    all_timestamps.append(log["timestamp"])
            for log in history["status_logs"]:
                if log.get("timestamp"):
                    all_timestamps.append(log["timestamp"])
            
            if all_timestamps:
                history["summary"]["last_activity"] = max(all_timestamps)
            
            return history
            
        except Exception as e:
            logger.error(f"❌ Failed to get event action history for {event_id}: {str(e)}")
            return {"event_id": event_id, "error": str(e)}

# Global instance
event_action_logger = EventActionLogger()
