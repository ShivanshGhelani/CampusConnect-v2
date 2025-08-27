"""
Audit logging service for tracking administrative actions
"""
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

from config.database import Database
from models.audit_log import (
    AuditLog, AuditActionType, AuditSeverity,
    AuditLogResponse, AuditLogListResponse, AuditLogFilter, AuditLogStats
)

logger = logging.getLogger(__name__)

class AuditLogService:
    """Service for managing audit logs and tracking administrative actions"""
    
    def __init__(self):
        self.collection_name = "audit_logs"
    
    async def get_database(self):
        """Get database connection"""
        try:
            database = Database()
            return await database.get_database()
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            return None
    
    async def log_action(
        self,
        action_type: AuditActionType,
        action_description: str,
        performed_by_username: str,
        performed_by_role: str,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
        target_name: Optional[str] = None,
        before_data: Optional[Dict[str, Any]] = None,
        after_data: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        severity: AuditSeverity = AuditSeverity.INFO,
        success: bool = True,
        error_message: Optional[str] = None,
        performed_by_ip: Optional[str] = None,
        performed_by_user_agent: Optional[str] = None,
        session_id: Optional[str] = None,
        request_id: Optional[str] = None,
        duration_ms: Optional[int] = None,
        audit_id: Optional[str] = None  # Accept frontend-generated ID
    ) -> AuditLogResponse:
        """Log an administrative action"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Use frontend-provided audit_id or generate simple fallback
            if not audit_id:
                import secrets
                audit_id = f"AUD{secrets.token_hex(4).upper()}"
            
            # Create audit log entry
            audit_log = AuditLog(
                id=audit_id,
                action_type=action_type,
                action_description=action_description,
                severity=severity,
                performed_by_username=performed_by_username,
                performed_by_role=performed_by_role,
                performed_by_ip=performed_by_ip,
                performed_by_user_agent=performed_by_user_agent,
                target_type=target_type,
                target_id=target_id,
                target_name=target_name,
                before_data=before_data or {},
                after_data=after_data or {},
                metadata=metadata or {},
                success=success,
                error_message=error_message,
                session_id=session_id,
                request_id=request_id,
                duration_ms=duration_ms
            )
            
            # Insert into database
            result = await db[self.collection_name].insert_one(audit_log.dict())
            
            if result.inserted_id:
                logger.info(f"Audit log created: {audit_id} - {action_type} by {performed_by_username}")
                return AuditLogResponse(
                    success=True,
                    message="Audit log created successfully",
                    audit_log_id=audit_id
                )
            else:
                raise Exception("Failed to insert audit log")
                
        except Exception as e:
            logger.error(f"Error creating audit log: {e}")
            return AuditLogResponse(success=False, message=str(e))
    
    async def get_audit_logs(
        self,
        filter_criteria: Optional[AuditLogFilter] = None,
        page: int = 1,
        per_page: int = 50
    ) -> AuditLogListResponse:
        """Get audit logs with filtering and pagination"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Build filter query
            filter_query = {}
            
            if filter_criteria:
                if filter_criteria.action_types:
                    filter_query["action_type"] = {"$in": [at.value for at in filter_criteria.action_types]}
                
                if filter_criteria.performed_by_username:
                    filter_query["performed_by_username"] = filter_criteria.performed_by_username
                
                if filter_criteria.performed_by_role:
                    filter_query["performed_by_role"] = filter_criteria.performed_by_role
                
                if filter_criteria.target_type:
                    filter_query["target_type"] = filter_criteria.target_type
                
                if filter_criteria.target_id:
                    filter_query["target_id"] = filter_criteria.target_id
                
                if filter_criteria.severity:
                    filter_query["severity"] = filter_criteria.severity.value
                
                if filter_criteria.success_only is not None:
                    filter_query["success"] = filter_criteria.success_only
                
                # Date range filter
                if filter_criteria.start_date or filter_criteria.end_date:
                    date_filter = {}
                    if filter_criteria.start_date:
                        date_filter["$gte"] = filter_criteria.start_date
                    if filter_criteria.end_date:
                        date_filter["$lte"] = filter_criteria.end_date
                    filter_query["timestamp"] = date_filter
            
            # Count total logs
            total_count = await db[self.collection_name].count_documents(filter_query)
            
            # Get paginated logs
            skip = (page - 1) * per_page
            cursor = db[self.collection_name].find(filter_query).sort("timestamp", -1).skip(skip).limit(per_page)
            logs_data = await cursor.to_list(length=per_page)
            
            # Convert to AuditLog objects
            audit_logs = []
            for log_data in logs_data:
                log_data["id"] = log_data.get("_id", log_data.get("id"))
                audit_logs.append(AuditLog(**log_data))
            
            return AuditLogListResponse(
                audit_logs=audit_logs,
                total_count=total_count,
                page=page,
                per_page=per_page
            )
            
        except Exception as e:
            logger.error(f"Error getting audit logs: {e}")
            return AuditLogListResponse(
                audit_logs=[],
                total_count=0,
                page=page,
                per_page=per_page
            )
    
    async def get_audit_log_stats(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> AuditLogStats:
        """Get audit log statistics"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Build date filter
            match_filter = {}
            if start_date or end_date:
                date_filter = {}
                if start_date:
                    date_filter["$gte"] = start_date
                if end_date:
                    date_filter["$lte"] = end_date
                match_filter["timestamp"] = date_filter
            
            # Aggregation pipeline
            pipeline = []
            
            if match_filter:
                pipeline.append({"$match": match_filter})
            
            pipeline.extend([
                {
                    "$group": {
                        "_id": None,
                        "total_actions": {"$sum": 1},
                        "failed_actions": {
                            "$sum": {"$cond": [{"$eq": ["$success", False]}, 1, 0]}
                        },
                        "actions_by_type": {
                            "$push": "$action_type"
                        },
                        "actions_by_role": {
                            "$push": "$performed_by_role"
                        },
                        "actions_by_severity": {
                            "$push": "$severity"
                        },
                        "min_date": {"$min": "$timestamp"},
                        "max_date": {"$max": "$timestamp"}
                    }
                }
            ])
            
            cursor = db[self.collection_name].aggregate(pipeline)
            result = await cursor.to_list(length=1)
            
            if not result:
                return AuditLogStats(
                    total_actions=0,
                    actions_by_type={},
                    actions_by_role={},
                    actions_by_severity={},
                    failed_actions_count=0,
                    date_range={}
                )
            
            data = result[0]
            
            # Count occurrences
            actions_by_type = {}
            for action_type in data.get("actions_by_type", []):
                actions_by_type[action_type] = actions_by_type.get(action_type, 0) + 1
            
            actions_by_role = {}
            for role in data.get("actions_by_role", []):
                actions_by_role[role] = actions_by_role.get(role, 0) + 1
            
            actions_by_severity = {}
            for severity in data.get("actions_by_severity", []):
                actions_by_severity[severity] = actions_by_severity.get(severity, 0) + 1
            
            date_range = {}
            if data.get("min_date"):
                date_range["start"] = data["min_date"]
            if data.get("max_date"):
                date_range["end"] = data["max_date"]
            
            return AuditLogStats(
                total_actions=data.get("total_actions", 0),
                actions_by_type=actions_by_type,
                actions_by_role=actions_by_role,
                actions_by_severity=actions_by_severity,
                failed_actions_count=data.get("failed_actions", 0),
                date_range=date_range
            )
            
        except Exception as e:
            logger.error(f"Error getting audit log stats: {e}")
            return AuditLogStats(
                total_actions=0,
                actions_by_type={},
                actions_by_role={},
                actions_by_severity={},
                failed_actions_count=0,
                date_range={}
            )
    
    async def cleanup_old_logs(self, retention_days: int = 365) -> int:
        """Clean up old audit logs based on retention policy"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
            
            result = await db[self.collection_name].delete_many({
                "timestamp": {"$lt": cutoff_date}
            })
            
            deleted_count = result.deleted_count
            if deleted_count > 0:
                logger.info(f"Cleaned up {deleted_count} old audit logs (older than {retention_days} days)")
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error cleaning up old audit logs: {e}")
            return 0
    
    # Helper methods for common audit actions
    async def log_admin_login(self, username: str, role: str, ip: str, user_agent: str, success: bool = True, error: str = None):
        """Log admin login attempt"""
        return await self.log_action(
            action_type=AuditActionType.ADMIN_LOGIN,
            action_description=f"Admin login {'successful' if success else 'failed'}: {username}",
            performed_by_username=username,
            performed_by_role=role,
            performed_by_ip=ip,
            performed_by_user_agent=user_agent,
            success=success,
            error_message=error,
            severity=AuditSeverity.INFO if success else AuditSeverity.WARNING
        )
    
    async def log_admin_logout(self, username: str, role: str, ip: str):
        """Log admin logout"""
        return await self.log_action(
            action_type=AuditActionType.ADMIN_LOGOUT,
            action_description=f"Admin logout: {username}",
            performed_by_username=username,
            performed_by_role=role,
            performed_by_ip=ip,
            severity=AuditSeverity.INFO
        )
    
    async def log_venue_booking_action(self, action_type: AuditActionType, venue_id: str, venue_name: str, booking_id: str, event_name: str, performed_by: str, role: str, reason: str = None):
        """Log venue booking related action"""
        return await self.log_action(
            action_type=action_type,
            action_description=f"Venue booking {action_type.value.replace('_', ' ')}: {venue_name} for {event_name}",
            performed_by_username=performed_by,
            performed_by_role=role,
            target_type="venue_booking",
            target_id=booking_id,
            target_name=f"{venue_name} - {event_name}",
            metadata={
                "venue_id": venue_id,
                "venue_name": venue_name,
                "event_name": event_name,
                "reason": reason
            },
            severity=AuditSeverity.INFO
        )
    
    async def log_event_action(self, action_type: AuditActionType, event_id: str, event_name: str, performed_by: str, role: str, before_data: Dict = None, after_data: Dict = None):
        """Log event related action"""
        return await self.log_action(
            action_type=action_type,
            action_description=f"Event {action_type.value.replace('_', ' ')}: {event_name}",
            performed_by_username=performed_by,
            performed_by_role=role,
            target_type="event",
            target_id=event_id,
            target_name=event_name,
            before_data=before_data,
            after_data=after_data,
            severity=AuditSeverity.INFO if action_type != AuditActionType.EVENT_DELETED else AuditSeverity.WARNING
        )

# Create singleton instance
audit_log_service = AuditLogService()
