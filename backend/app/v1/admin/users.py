"""
Admin Users API Routes - ULTRA CONSOLIDATED
Single endpoint handles all user operations via HTTP methods + action parameters
"""
import logging
from datetime import datetime
import pytz
from fastapi import APIRouter, HTTPException, Depends, Query, Body, Request
from typing import Optional, List, Dict, Any, Union
from dependencies.auth import require_admin, require_super_admin_access
from models.admin_user import AdminUser
from database.operations import DatabaseOperations
from bson import ObjectId
# from services.audit_service import audit_log_service  # TODO: Enable when audit types are added

router = APIRouter()
logger = logging.getLogger(__name__)

def fix_objectid(doc):
    """Convert ObjectId to string in documents"""
    if isinstance(doc, list):
        return [fix_objectid(d) for d in doc]
    if isinstance(doc, dict):
        return {k: fix_objectid(v) for k, v in doc.items()}
    if isinstance(doc, ObjectId):
        return str(doc)
    return doc

async def _bulk_create_users(user_data_list: List[dict], admin: AdminUser):
    """Helper function to handle bulk user creation"""
    results = []
    errors = []
    
    for idx, user_data in enumerate(user_data_list):
        try:
            # Process each user individually
            user_type = user_data.get("user_type")
            if not user_type or user_type not in ["student", "faculty", "admin"]:
                errors.append(f"Item {idx}: Invalid user_type")
                continue
                
            # Add creation metadata
            user_data["created_at"] = datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)
            user_data["created_by"] = admin.username
            user_data["is_active"] = user_data.get("is_active", True)
            
            # Determine collection and create user - FIXED collection names
            collection = "students" if user_type == "student" else "faculties" if user_type == "faculty" else "users"
            
            result = await DatabaseOperations.create_document(collection, user_data)
            results.append({
                "index": idx,
                "user_type": user_type,
                "id": str(result),
                "status": "created"
            })
            
        except Exception as e:
            errors.append(f"Item {idx}: {str(e)}")
    
    return {
        "success": len(errors) == 0,
        "created_count": len(results),
        "error_count": len(errors),
        "results": results,
        "errors": errors if errors else None
    }

# =============================================================================
# CONSOLIDATED USER MANAGEMENT ENDPOINTS (Simplified & Optimized)
# =============================================================================

@router.get("/")
async def get_users(
    user_type: str = Query(..., regex="^(student|faculty|admin)$", description="Filter by user type - REQUIRED"),
    page: int = Query(1, ge=1, description="Page number for pagination"),
    limit: int = Query(50, ge=1, le=1000, description="Items per page"),
    include_inactive: bool = Query(False, description="Include soft-deleted users"),
    user_id: Optional[str] = Query(None, description="Specific user ID to fetch"),
    search: Optional[str] = Query(None, description="Search users by name or ID"),
    admin: AdminUser = Depends(require_admin)
):
    """
    CONSOLIDATED: Get users with comprehensive filtering and search options.
    
    This is now the ONLY user listing endpoint. All other listing endpoints redirect here.
    """
    try:
        # Build query filter
        query_filter = {}
        
        # Add inactive filter (soft-delete handling)
        if not include_inactive:
            query_filter["is_active"] = {"$ne": False}  # Include true and null values
        
        # If specific user_id is requested, return detailed info (replaces /info endpoint)
        if user_id:
            if user_type == "student":
                query_filter["enrollment_no"] = user_id
            elif user_type == "faculty":
                query_filter["employee_id"] = user_id
            elif user_type == "admin":
                query_filter["username"] = user_id
            
            # For single user request, return detailed info
            user = await DatabaseOperations.find_one(collection, query_filter)
            if not user:
                raise HTTPException(status_code=404, detail=f"{user_type.title()} with ID {user_id} not found")
            
            # Remove sensitive info and fix ObjectId
            user.pop('password', None)
            user.pop('password_hash', None)
            user = fix_objectid(user)
            user['user_type'] = user_type
            
            return {
                "success": True,
                "data": user,
                "message": f"{user_type.title()} information retrieved successfully"
            }
        
        # Add search functionality
        if search:
            search_regex = {"$regex": search, "$options": "i"}  # Case-insensitive
            query_filter["$or"] = [
                {"full_name": search_regex},
                {"email": search_regex},
                {"enrollment_no": search_regex},
                {"employee_id": search_regex},
                {"username": search_regex}
            ]
        
        # Determine collection based on user_type
        if user_type == "student":
            collection = "students"
        elif user_type == "faculty":
            collection = "faculties"
        elif user_type == "admin":
            collection = "users"
        
        # Calculate skip for pagination
        skip = (page - 1) * limit
        
        # Get users from database
        users = await DatabaseOperations.find_many(
            collection,
            query_filter,
            limit=limit,
            skip=skip,
            sort_by=[("created_at", -1)]
        )
        
        # Fix ObjectId fields
        users = fix_objectid(users)
        
        # Get total count for pagination
        total_count = await DatabaseOperations.count_documents(collection, query_filter)
        
        # Format response based on user type
        formatted_users = []
        for user in users:
            if user_type == "student":
                formatted_user = {
                    "id": user.get("_id"),
                    "enrollment_no": user.get("enrollment_no"),
                    "full_name": user.get("full_name"),
                    "email": user.get("email"),
                    "mobile_no": user.get("mobile_no"),
                    "department": user.get("department"),
                    "semester": user.get("semester"),
                    "gender": user.get("gender"),
                    "date_of_birth": user.get("date_of_birth"),
                    "created_at": user.get("created_at"),
                    "is_active": user.get("is_active", True),
                    "avatar_url": user.get("avatar_url"),
                    "user_type": "student",
                    "event_participations": user.get("event_participations", [])
                }
            elif user_type == "faculty":
                # Get organized events count from assigned_events field
                organized_events_count = 0
                assigned_events = user.get("assigned_events", [])
                if isinstance(assigned_events, list):
                    organized_events_count = len(assigned_events)
                elif isinstance(assigned_events, int):
                    organized_events_count = assigned_events
                
                formatted_user = {
                    "id": user.get("_id"),
                    "_id": user.get("_id"),
                    "user_id": user.get("_id"),
                    "employee_id": user.get("employee_id"),
                    "full_name": user.get("full_name"),
                    "email": user.get("email"),
                    "contact_no": user.get("contact_no"),
                    "department": user.get("department"),
                    "designation": user.get("designation"),
                    "qualification": user.get("qualification"),
                    "specialization": user.get("specialization"),
                    "experience_years": user.get("experience_years"),
                    "gender": user.get("gender"),
                    "date_of_birth": user.get("date_of_birth"),
                    "created_at": user.get("created_at"),
                    "date_of_joining": user.get("date_of_joining", user.get("created_at")),
                    "employment_type": user.get("employment_type") or "Full-time",
                    "updated_at": user.get("updated_at"),
                    "is_active": user.get("is_active", True),
                    "organized_events_count": organized_events_count,
                    "avatar_url": user.get("avatar_url"),
                    "user_type": "faculty"
                }
            elif user_type == "admin":
                formatted_user = {
                    "id": user.get("_id"),
                    "username": user.get("username"),
                    "fullname": user.get("fullname"),
                    "email": user.get("email"),
                    "role": user.get("role"),
                    "created_at": user.get("created_at"),
                    "last_login": user.get("last_login"),
                    "is_active": user.get("is_active", True),
                    "user_type": "admin"
                }
            
            formatted_users.append(formatted_user)
        
        # Return response with user-type-specific key for frontend compatibility
        response_data = {
            "success": True,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "pages": (total_count + limit - 1) // limit
            },
            "user_type": user_type,
            "data": formatted_users
        }
        
        # Add user-type-specific keys for frontend compatibility
        if user_type == "student":
            response_data["students"] = formatted_users
        elif user_type == "faculty":
            response_data["faculty"] = formatted_users
        elif user_type == "admin":
            response_data["users"] = formatted_users
            
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch users"
        )

@router.post("/")
async def create_user(
    user_data: Union[dict, List[dict]],
    admin: AdminUser = Depends(require_super_admin_access)
):
    """
    CONSOLIDATED: Create users - supports both single and bulk creation
    
    This is now the ONLY user creation endpoint. All other creation endpoints redirect here.
    """
    try:
        # Handle bulk creation
        if isinstance(user_data, list):
            return await _bulk_create_users(user_data, admin)
        
        # Single user creation
        user_type = user_data.get("user_type")
        if not user_type or user_type not in ["student", "faculty", "admin"]:
            raise HTTPException(
                status_code=400,
                detail="Valid user_type is required (student|faculty|admin)"
            )
        
        # Determine collection - FIXED collection names
        if user_type == "student":
            collection = "students"
            required_fields = ["enrollment_no", "full_name", "email", "department"]
        elif user_type == "faculty":
            collection = "faculties"
            required_fields = ["employee_id", "full_name", "email", "department"]
        elif user_type == "admin":
            collection = "users"
            required_fields = ["username", "fullname", "role", "password"]
        
        # Check required fields
        missing_fields = [field for field in required_fields if not user_data.get(field)]
        if missing_fields:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required fields: {', '.join(missing_fields)}"
            )
        
        # Password hashing
        if user_type == "admin" and "password" in user_data:
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            user_data["password"] = pwd_context.hash(user_data["password"])
        elif user_type == "student" and "password" in user_data:
            from models.student import Student
            user_data["password_hash"] = Student.get_password_hash(user_data["password"])
            user_data.pop("password", None)
        elif user_type == "faculty" and "password" in user_data:
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            user_data["password"] = pwd_context.hash(user_data["password"])
        
        # Add metadata - STANDARDIZED to use username
        user_data["created_at"] = datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)
        user_data["created_by"] = admin.username
        user_data["is_active"] = True
        
        # Add default admin fields if creating admin
        if user_type == "admin":
            user_data["is_admin"] = True
            if user_data.get("role") == "super_admin":
                user_data["permissions"] = [
                    "admin.users.create", "admin.users.read", "admin.users.update", "admin.users.delete",
                    "admin.events.create", "admin.events.read", "admin.events.update", "admin.events.delete",
                    "admin.students.create", "admin.students.read", "admin.students.update", "admin.students.delete",
                    "admin.dashboard.view", "admin.analytics.view", "admin.settings.manage", 
                    "admin.logs.view", "admin.system.manage"
                ]
            elif user_data.get("role") == "executive_admin":
                user_data["permissions"] = [
                    "admin.events.create", "admin.events.read", "admin.events.update",
                    "admin.students.read", "admin.dashboard.view"
                ]
            else:
                user_data["permissions"] = []
        
        # Remove user_type from data before saving
        user_data.pop("user_type", None)
        
        # Insert user
        result = await DatabaseOperations.insert_one(collection, user_data)
        
        if result:
            logger.info(f"User created in {collection} by {admin.username}")
            return {
                "success": True,
                "message": f"User created successfully",
                "user_id": str(result)
            }
        else:
            raise HTTPException(
                status_code=400,
                detail="Failed to create user"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to create user"
        )

@router.put("/")
async def update_user(
    user_data: dict,
    admin: AdminUser = Depends(require_admin)
):
    """
    CONSOLIDATED: Update users - single endpoint for all user updates
    
    This is now the ONLY user update endpoint. All other update endpoints redirect here.
    """
    try:
        user_id = user_data.get("user_id")
        user_type = user_data.get("user_type")
        
        if not user_id or not user_type:
            raise HTTPException(
                status_code=400,
                detail="user_id and user_type are required"
            )
        
        # Determine collection and query field
        if user_type == "student":
            collection = "students"
            query_field = "enrollment_no"
        elif user_type == "faculty":
            collection = "faculties"
            query_field = "employee_id"
        elif user_type == "admin":
            collection = "users"
            query_field = "username"
        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid user_type (student|faculty|admin)"
            )
        
        # Remove metadata fields that shouldn't be updated
        update_data = {k: v for k, v in user_data.items() if k not in ["user_id", "user_type", "_id", "created_at", "created_by"]}
        update_data["updated_at"] = datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)
        update_data["updated_by"] = admin.username
        
        # Update user
        result = await DatabaseOperations.update_one(
            collection,
            {query_field: user_id},
            {"$set": update_data}
        )
        
        if result:
            logger.info(f"User updated in {collection}: {user_id} by {admin.username}")
            return {
                "success": True,
                "message": "User updated successfully"
            }
        else:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to update user"
        )

# =============================================================================
# FINAL CONSOLIDATED USER API STRUCTURE (4 ENDPOINTS TOTAL)
# All old endpoints have been removed - frontend uses new consolidated structure
# =============================================================================

@router.patch("/{user_id}/status")
async def manage_user_status(
    user_id: str,
    user_type: str = Query(..., regex="^(student|faculty|admin)$"),
    action: str = Query(..., regex="^(delete|restore|permanent_delete)$", description="Action: delete, restore, or permanent_delete"),
    admin: AdminUser = Depends(require_super_admin_access)
):
    """
    CONSOLIDATED: Manage user status - delete, restore, or permanently delete
    
    Actions:
    - delete: Soft delete (set is_active=false)
    - restore: Restore soft-deleted user (set is_active=true)
    - permanent_delete: Permanently remove from database (IRREVERSIBLE)
    """
    try:
        # Determine collection and query - support both _id and natural IDs
        if user_type == "student":
            collection = "students"
            query_field = "enrollment_no"
            from bson import ObjectId
            try:
                if len(user_id) == 24:
                    query = {"_id": ObjectId(user_id)}
                else:
                    query = {"enrollment_no": user_id}
            except:
                query = {"enrollment_no": user_id}
        elif user_type == "faculty":
            collection = "faculties"
            query_field = "employee_id"
            from bson import ObjectId
            try:
                if len(user_id) == 24:
                    query = {"_id": ObjectId(user_id)}
                else:
                    query = {"employee_id": user_id}
            except:
                query = {"employee_id": user_id}
        elif user_type == "admin":
            collection = "users"
            query_field = "username"
            from bson import ObjectId
            try:
                if len(user_id) == 24:
                    query = {"_id": ObjectId(user_id)}
                else:
                    query = {"username": user_id}
            except:
                query = {"username": user_id}
        
        # Check if user exists
        user = await DatabaseOperations.find_one(collection, query)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if action == "delete":
            # Soft delete
            result = await DatabaseOperations.update_one(
                collection, query,
                {"$set": {
                    "is_active": False,
                    "deleted_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None),
                    "deleted_by": admin.username
                }}
            )
            message = "User deactivated successfully"
            log_message = f"User soft deleted in {collection}: {user_id} by {admin.username}"
            
        elif action == "restore":
            # Restore user
            result = await DatabaseOperations.update_one(
                collection, query,
                {"$set": {
                    "is_active": True,
                    "restored_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None),
                    "restored_by": admin.username
                }, "$unset": {
                    "deleted_at": "",
                    "deleted_by": ""
                }}
            )
            message = "User restored successfully"
            log_message = f"User restored in {collection}: {user_id} by {admin.username}"
            
        elif action == "permanent_delete":
            # Hard delete
            result = await DatabaseOperations.delete_one(collection, query)
            message = "User permanently deleted from database"
            log_message = f"PERMANENT DELETION: User {user_id} in {collection} by {admin.username}"
        
        if not result:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to {action.replace('_', ' ')} user"
            )
        
        if action == "permanent_delete":
            logger.warning(log_message)
        else:
            logger.info(log_message)
            
        return {
            "success": True,
            "message": message
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error managing user status: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to {action.replace('_', ' ')} user"
        )

# =============================================================================
# REMOVED: Separate user info endpoint - now handled by GET / with user_id parameter
# Use GET /?user_type=X&user_id=Y instead of GET /{user_id}/info?user_type=X
# This saves 1 endpoint while maintaining same functionality
# =============================================================================


# =============================================================================
# REMOVED: Compatibility aliases - use main endpoints directly
# Frontend should use GET /, POST /, PUT / instead of /list variants
# This saves 3 endpoints while maintaining same functionality
# =============================================================================

