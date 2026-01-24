"""
User Management Service
=======================
Handles user management operations including deletion for students, faculty, and admins.
"""

from typing import Dict, Any, Optional
from datetime import datetime
import pytz
from database.operations import DatabaseOperations
import logging

logger = logging.getLogger(__name__)

class UserManagementService:
    def __init__(self):
        self.db = DatabaseOperations()
    
    def _get_collection_name(self, user_type: str) -> str:
        """Get the appropriate collection name based on user type"""
        collection_mapping = {
            'student': 'students',
            'faculty': 'faculties',
            'admin': 'users'
        }
        return collection_mapping.get(user_type.lower(), 'students')
    
    def _get_user_id_field(self, user_type: str) -> str:
        """Get the appropriate user ID field based on user type"""
        field_mapping = {
            'student': 'enrollment_no',
            'faculty': 'employee_id',
            'admin': 'username'
        }
        return field_mapping.get(user_type.lower(), 'enrollment_no')
    
    async def delete_user(self, user_id: str, user_type: str, permanent: bool = False) -> Dict[str, Any]:
        """
        Delete a user (soft delete by default, hard delete if permanent=True)
        
        Args:
            user_id: The user's ID (enrollment_no for students, employee_id for faculty, username for admin)
            user_type: Type of user ('student', 'faculty', 'admin')
            permanent: If True, permanently deletes the user, otherwise soft delete
        
        Returns:
            Dict with success status and details
        """
        try:
            collection_name = self._get_collection_name(user_type)
            user_id_field = self._get_user_id_field(user_type)
            
            # Find the user first to confirm existence
            user = await self.db.find_one(collection_name, {user_id_field: user_id})
            
            if not user:
                return {
                    "success": False,
                    "message": f"{user_type.title()} with ID {user_id} not found",
                    "error": "USER_NOT_FOUND"
                }
            
            if permanent:
                # Hard delete - permanently remove from database
                result = await self.db.delete_one(collection_name, {user_id_field: user_id})
                
                if result:
                    logger.info(f"✅ Permanently deleted {user_type} {user_id}")
                    return {
                        "success": True,
                        "message": f"{user_type.title()} account permanently deleted",
                        "deletion_type": "permanent",
                        "user_id": user_id,
                        "user_type": user_type
                    }
                else:
                    return {
                        "success": False,
                        "message": f"Failed to permanently delete {user_type} account",
                        "error": "DELETION_FAILED"
                    }
            
            else:
                # Soft delete - mark as inactive
                update_data = {
                    "is_active": False,
                    "deleted_at": datetime.now(pytz.timezone('Asia/Kolkata')),
                    "updated_at": datetime.now(pytz.timezone('Asia/Kolkata'))
                }
                
                result = await self.db.update_one(
                    collection_name,
                    {user_id_field: user_id},
                    {"$set": update_data}
                )
                
                if result:
                    logger.info(f"✅ Soft deleted {user_type} {user_id}")
                    return {
                        "success": True,
                        "message": f"{user_type.title()} account deactivated successfully",
                        "deletion_type": "soft",
                        "user_id": user_id,
                        "user_type": user_type,
                        "can_restore": True
                    }
                else:
                    return {
                        "success": False,
                        "message": f"Failed to deactivate {user_type} account",
                        "error": "DELETION_FAILED"
                    }
        
        except Exception as e:
            logger.error(f"Error deleting {user_type} {user_id}: {str(e)}")
            return {
                "success": False,
                "message": f"Error deleting {user_type} account: {str(e)}",
                "error": "INTERNAL_ERROR"
            }
    
    async def restore_user(self, user_id: str, user_type: str) -> Dict[str, Any]:
        """
        Restore a soft-deleted user
        
        Args:
            user_id: The user's ID
            user_type: Type of user ('student', 'faculty', 'admin')
        
        Returns:
            Dict with success status and details
        """
        try:
            collection_name = self._get_collection_name(user_type)
            user_id_field = self._get_user_id_field(user_type)
            
            # Find the soft-deleted user
            user = await self.db.find_one(collection_name, {
                user_id_field: user_id,
                "is_active": False
            })
            
            if not user:
                return {
                    "success": False,
                    "message": f"No deactivated {user_type} found with ID {user_id}",
                    "error": "USER_NOT_FOUND"
                }
            
            # Restore the user
            update_data = {
                "is_active": True,
                "restored_at": datetime.now(pytz.timezone('Asia/Kolkata')),
                "updated_at": datetime.now(pytz.timezone('Asia/Kolkata'))
            }
            
            # Remove deletion timestamp
            unset_data = {"deleted_at": ""}
            
            result = await self.db.update_one(
                collection_name,
                {user_id_field: user_id},
                {
                    "$set": update_data,
                    "$unset": unset_data
                }
            )
            
            if result:
                logger.info(f"✅ Restored {user_type} {user_id}")
                return {
                    "success": True,
                    "message": f"{user_type.title()} account restored successfully",
                    "user_id": user_id,
                    "user_type": user_type
                }
            else:
                return {
                    "success": False,
                    "message": f"Failed to restore {user_type} account",
                    "error": "RESTORATION_FAILED"
                }
        
        except Exception as e:
            logger.error(f"Error restoring {user_type} {user_id}: {str(e)}")
            return {
                "success": False,
                "message": f"Error restoring {user_type} account: {str(e)}",
                "error": "INTERNAL_ERROR"
            }
    
    async def get_user_info(self, user_id: str, user_type: str) -> Optional[Dict[str, Any]]:
        """
        Get user information by ID and type
        
        Args:
            user_id: The user's ID
            user_type: Type of user ('student', 'faculty', 'admin')
        
        Returns:
            User data dict if found, None otherwise
        """
        try:
            collection_name = self._get_collection_name(user_type)
            user_id_field = self._get_user_id_field(user_type)
            
            user = await self.db.find_one(collection_name, {user_id_field: user_id})
            
            if user:
                # Remove sensitive information
                user.pop('password', None)
                user.pop('password_hash', None)
                return user
            
            return None
        
        except Exception as e:
            logger.error(f"Error getting {user_type} info for {user_id}: {str(e)}")
            return None
    
    async def bulk_delete_users(self, user_data_list: list, permanent: bool = False) -> Dict[str, Any]:
        """
        Delete multiple users in bulk
        
        Args:
            user_data_list: List of dicts with 'user_id' and 'user_type'
            permanent: If True, permanently deletes users, otherwise soft delete
        
        Returns:
            Dict with bulk operation results
        """
        try:
            if not user_data_list:
                return {
                    "success": False,
                    "message": "No users provided for deletion",
                    "error": "NO_USERS_PROVIDED"
                }
            
            results = {
                "success": True,
                "total_count": len(user_data_list),
                "successful_deletions": 0,
                "failed_deletions": 0,
                "deletion_details": [],
                "errors": []
            }
            
            for user_data in user_data_list:
                user_id = user_data.get('user_id')
                user_type = user_data.get('user_type')
                
                if not user_id or not user_type:
                    results["failed_deletions"] += 1
                    results["errors"].append(f"Invalid user data: {user_data}")
                    continue
                
                deletion_result = await self.delete_user(user_id, user_type, permanent)
                
                if deletion_result["success"]:
                    results["successful_deletions"] += 1
                else:
                    results["failed_deletions"] += 1
                    results["errors"].append(f"{user_type} {user_id}: {deletion_result.get('message', 'Unknown error')}")
                
                results["deletion_details"].append({
                    "user_id": user_id,
                    "user_type": user_type,
                    "success": deletion_result["success"],
                    "message": deletion_result.get("message", "")
                })
            
            # Update overall success status
            results["success"] = results["successful_deletions"] > 0
            results["message"] = f"Deleted {results['successful_deletions']}/{results['total_count']} users successfully"
            
            logger.info(f"Bulk deletion completed: {results['successful_deletions']}/{results['total_count']} successful")
            
            return results
        
        except Exception as e:
            logger.error(f"Error in bulk user deletion: {str(e)}")
            return {
                "success": False,
                "message": f"Bulk deletion failed: {str(e)}",
                "error": "BULK_DELETION_ERROR"
            }

# Create singleton instance
user_management_service = UserManagementService()
