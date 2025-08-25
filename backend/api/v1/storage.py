"""
Unified Supabase Storage API Endpoints
Handles all file uploads securely through backend with correct bucket routing
"""
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional, List
from services.supabase_storage_service import SupabaseStorageService
from config.settings import get_settings

router = APIRouter(prefix="/api/v1/storage", tags=["Storage"])

# Get settings for bucket names
settings = get_settings()

@router.post("/upload/event-files")
async def upload_event_files(
    event_id: str = Form(...),
    file_type: str = Form(...),  # 'event_poster', 'Certificate of Participation', etc.
    file: UploadFile = File(...)
):
    """Upload event-related files (posters, certificates) to campusconnect-event-data bucket"""
    try:
        # Validate file type
        allowed_types = {
            'event_poster': ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
            'certificate': 'any'  # Allow any file type for certificates (HTML, PDF, custom extensions like .crtf, .ldrp, .certi)
        }
        
        file_category = 'event_poster' if file_type == 'event_poster' else 'certificate'
        
        # Only validate event posters, allow any file type for certificates
        if file_category == 'event_poster' and file.content_type not in allowed_types[file_category]:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type. Allowed: {allowed_types[file_category]}"
            )
        
        # Read file content
        file_content = await file.read()
        
        # Generate file path: event_id/file_type_timestamp.ext
        import time
        timestamp = int(time.time())
        # Preserve original file extension for certificates (could be .html, .crtf, .ldrp, .certi, etc.)
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'html'
        safe_file_type = file_type.replace(' ', '_').replace('of', 'of')
        filename = f"{safe_file_type}_{timestamp}.{file_extension}"
        file_path = f"{event_id}/{filename}"
        
        # Upload to EVENT bucket
        result = await SupabaseStorageService.upload_file(
            bucket_name=settings.SUPABASE_EVENT_BUCKET,  # campusconnect-event-data
            file_path=file_path,
            file_content=file_content,
            content_type=file.content_type
        )
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return {
            "success": True,
            "file_url": result["file_url"],
            "file_path": result["file_path"],
            "file_type": file_type,
            "event_id": event_id,
            "bucket": settings.SUPABASE_EVENT_BUCKET
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload/avatar")
async def upload_avatar(
    user_type: str = Form(...),  # 'student' or 'faculty'
    user_id: str = Form(...),    # enrollment_no or employee_id
    full_name: str = Form(...),
    file: UploadFile = File(...)
):
    """Upload user avatar to campusconnect bucket"""
    try:
        # Validate file type
        if file.content_type not in ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']:
            raise HTTPException(status_code=400, detail="Invalid file type. Use PNG, JPG, JPEG, or WebP")
        
        # Read file content
        file_content = await file.read()
        
        # Generate file path based on user type
        import time
        timestamp = int(time.time())
        safe_name = full_name.replace(' ', '_').replace('-', '_')
        
        # Determine file extension based on content type
        extension_map = {
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/webp': 'webp'
        }
        extension = extension_map.get(file.content_type, 'png')
        filename = f"{safe_name}_{timestamp}.{extension}"
        
        if user_type == 'faculty':
            file_path = f"faculties/{user_id}/{filename}"
        else:
            file_path = f"students/{user_id}/{filename}"
        
        # Delete existing avatars first
        await delete_user_avatars(user_type, user_id)
        
        # Upload new avatar to MAIN bucket
        result = await SupabaseStorageService.upload_file(
            bucket_name=settings.SUPABASE_STORAGE_BUCKET,  # campusconnect
            file_path=file_path,
            file_content=file_content,
            content_type=file.content_type
        )
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return {
            "success": True,
            "avatar_url": result["file_url"],
            "file_path": result["file_path"],
            "bucket": settings.SUPABASE_STORAGE_BUCKET
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload/certificate-template")
async def upload_certificate_template(
    template_name: str = Form(...),
    category: str = Form(...),  # 'Academic', 'Sports', etc.
    file: UploadFile = File(...)
):
    """Upload certificate template to campusconnect bucket"""
    try:
        # Allow any file type for certificate templates (HTML, PDF, custom extensions like .crtf, .ldrp, .certi)
        # No file type validation - templates can be any format
        
        # Read file content
        file_content = await file.read()
        
        # Generate file path: certificate-templates/category/template_name_timestamp.ext
        import time
        timestamp = int(time.time())
        # Preserve original file extension for templates (could be .html, .crtf, .ldrp, .certi, etc.)
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'html'
        safe_name = template_name.replace(' ', '_').replace('-', '_')
        safe_category = category.replace(' ', '_').replace('&', 'and')
        filename = f"{safe_name}_{timestamp}.{file_extension}"
        file_path = f"certificate-templates/{safe_category}/{filename}"
        
        # Upload to MAIN bucket
        result = await SupabaseStorageService.upload_file(
            bucket_name=settings.SUPABASE_STORAGE_BUCKET,  # campusconnect
            file_path=file_path,
            file_content=file_content,
            content_type=file.content_type
        )
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return {
            "success": True,
            "template_url": result["file_url"],
            "file_path": result["file_path"],
            "template_name": template_name,
            "category": category,
            "bucket": settings.SUPABASE_STORAGE_BUCKET
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload/asset")
async def upload_asset(
    asset_type: str = Form(...),     # 'logo' or 'signature'
    sub_type: Optional[str] = Form(None),  # 'principal', 'faculty', 'head-of-department'
    department: Optional[str] = Form(None),
    asset_name: str = Form(...),
    file: UploadFile = File(...)
):
    """Upload college assets (logos, signatures) to campusconnect-assets-private bucket"""
    try:
        # Validate file type
        if file.content_type not in ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']:
            raise HTTPException(status_code=400, detail="Invalid file type. Use PNG, JPG, JPEG, or WebP")
        
        # Read file content
        file_content = await file.read()
        
        # Generate file path
        import time
        timestamp = int(time.time())
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'png'
        safe_name = asset_name.replace(' ', '_').replace('-', '_')
        filename = f"{safe_name}_{timestamp}.{file_extension}"
        
        if asset_type == 'logo':
            file_path = f"assets/logos/{filename}"
        elif asset_type == 'signature':
            if sub_type == 'principal':
                file_path = f"assets/signatures/principal/college/{filename}"
            elif sub_type == 'faculty':
                if not department:
                    raise HTTPException(status_code=400, detail="Department required for faculty signatures")
                file_path = f"assets/signatures/faculty/{department}/{filename}"
            elif sub_type == 'head-of-department':
                if not department:
                    raise HTTPException(status_code=400, detail="Department required for HOD signatures")
                file_path = f"assets/signatures/hod/{department}/{filename}"
            else:
                raise HTTPException(status_code=400, detail="Invalid signature sub-type")
        else:
            raise HTTPException(status_code=400, detail="Invalid asset type")
        
        # Upload to ASSETS bucket (private)
        result = await SupabaseStorageService.upload_file(
            bucket_name=settings.SUPABASE_ASSETS_BUCKET,  # campusconnect-assets-private
            file_path=file_path,
            file_content=file_content,
            content_type=file.content_type
        )
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return {
            "success": True,
            "asset_url": result["file_url"],
            "file_path": result["file_path"],
            "asset_type": asset_type,
            "sub_type": sub_type,
            "department": department,
            "bucket": settings.SUPABASE_ASSETS_BUCKET
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete/event-files/{event_id}")
async def delete_event_files(event_id: str):
    """Delete all files for an event from campusconnect-event-data bucket"""
    try:
        # List files in event folder
        files_result = await SupabaseStorageService.list_files(
            bucket_name=settings.SUPABASE_EVENT_BUCKET,  # campusconnect-event-data
            folder_path=event_id
        )
        
        if not files_result["success"]:
            # Return success even if we can't list files (folder might not exist)
            return {
                "success": True,
                "deleted_count": 0,
                "bucket": settings.SUPABASE_EVENT_BUCKET,
                "message": f"No files found for event {event_id} or folder does not exist"
            }
        
        # Delete each file
        deleted_count = 0
        errors = []
        
        for file_obj in files_result["files"]:
            if file_obj["name"] != ".emptyFolderPlaceholder":
                file_path = f"{event_id}/{file_obj['name']}"
                try:
                    success = await SupabaseStorageService.delete_file(
                        bucket_name=settings.SUPABASE_EVENT_BUCKET,
                        file_path=file_path
                    )
                    if success:
                        deleted_count += 1
                    else:
                        errors.append(f"Failed to delete {file_path}")
                except Exception as file_error:
                    errors.append(f"Error deleting {file_path}: {str(file_error)}")
        
        return {
            "success": True,
            "deleted_count": deleted_count,
            "bucket": settings.SUPABASE_EVENT_BUCKET,
            "errors": errors if errors else None
        }
        
    except Exception as e:
        # Return graceful error response instead of raising HTTP exception
        return {
            "success": False,
            "deleted_count": 0,
            "bucket": settings.SUPABASE_EVENT_BUCKET,
            "error": str(e)
        }

@router.delete("/delete/event-specific-files/{event_id}")
async def delete_specific_event_files(
    event_id: str,
    file_types: str = Query(..., description="Comma-separated list of file types to delete (e.g., 'event_poster,Certificate of Participation')")
):
    """Delete specific file types for an event from campusconnect-event-data bucket"""
    try:
        file_types_list = [ft.strip() for ft in file_types.split(',')]
        
        # List files in event folder
        files_result = await SupabaseStorageService.list_files(
            bucket_name=settings.SUPABASE_EVENT_BUCKET,  # campusconnect-event-data
            folder_path=event_id
        )
        
        if not files_result["success"]:
            return {
                "success": True,
                "deleted_count": 0,
                "bucket": settings.SUPABASE_EVENT_BUCKET,
                "message": f"No files found for event {event_id} or folder does not exist"
            }
        
        # Delete only files that match the specified types
        deleted_count = 0
        errors = []
        
        for file_obj in files_result["files"]:
            if file_obj["name"] != ".emptyFolderPlaceholder":
                file_name = file_obj["name"]
                
                # Check if this file matches any of the types we want to delete
                should_delete = False
                matched_type = None
                for file_type in file_types_list:
                    # More comprehensive matching patterns
                    if file_type == 'event_poster':
                        # Match any file that contains 'event_poster' or starts with 'poster'
                        if ('event_poster' in file_name.lower() or 
                            file_name.lower().startswith('poster') or
                            file_name.lower().startswith('event_poster')):
                            should_delete = True
                            matched_type = file_type
                            break
                    else:
                        # For certificate templates, use more flexible matching
                        file_type_normalized = file_type.lower().replace(' ', '_')
                        file_name_normalized = file_name.lower().replace(' ', '_')
                        
                        if (file_type_normalized in file_name_normalized or
                            file_type.lower() in file_name.lower() or
                            # Also check for common certificate patterns
                            ('certificate' in file_name_normalized and 
                             any(word in file_name_normalized for word in file_type.lower().split()))):
                            should_delete = True
                            matched_type = file_type
                            break
                
                if should_delete:
                    file_path = f"{event_id}/{file_name}"
                    try:
                        success = await SupabaseStorageService.delete_file(
                            bucket_name=settings.SUPABASE_EVENT_BUCKET,
                            file_path=file_path
                        )
                        if success:
                            deleted_count += 1
                        else:
                            errors.append(f"Failed to delete {file_path}")
                    except Exception as file_error:
                        errors.append(f"Error deleting {file_path}: {str(file_error)}")
        
        return {
            "success": True,
            "deleted_count": deleted_count,
            "bucket": settings.SUPABASE_EVENT_BUCKET,
            "file_types_deleted": file_types_list,
            "errors": errors if errors else None
        }
        
    except Exception as e:
        return {
            "success": False,
            "deleted_count": 0,
            "bucket": settings.SUPABASE_EVENT_BUCKET,
            "error": str(e)
        }

@router.delete("/delete/avatar")
async def delete_avatar_endpoint(
    user_type: str = Form(...),
    user_id: str = Form(...)
):
    """Delete user avatar from campusconnect bucket"""
    try:
        success = await delete_user_avatars(user_type, user_id)
        return {
            "success": success,
            "bucket": settings.SUPABASE_STORAGE_BUCKET
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete/asset")
async def delete_asset_endpoint(
    asset_type: str = Form(...),
    filename: str = Form(...),
    sub_type: Optional[str] = Form(None),
    department: Optional[str] = Form(None)
):
    """Delete college asset from campusconnect-assets-private bucket"""
    try:
        # Determine file path
        if asset_type == 'logo':
            file_path = f"assets/logos/{filename}"
        elif asset_type == 'signature':
            if sub_type == 'principal':
                file_path = f"assets/signatures/principal/college/{filename}"
            elif sub_type == 'faculty':
                if not department:
                    raise HTTPException(status_code=400, detail="Department required for faculty signatures")
                file_path = f"assets/signatures/faculty/{department}/{filename}"
            elif sub_type == 'head-of-department':
                if not department:
                    raise HTTPException(status_code=400, detail="Department required for HOD signatures")
                file_path = f"assets/signatures/hod/{department}/{filename}"
            else:
                raise HTTPException(status_code=400, detail="Invalid signature sub-type")
        else:
            raise HTTPException(status_code=400, detail="Invalid asset type")
        
        # Delete from ASSETS bucket
        success = await SupabaseStorageService.delete_file(
            bucket_name=settings.SUPABASE_ASSETS_BUCKET,  # campusconnect-assets-private
            file_path=file_path
        )
        
        return {
            "success": success,
            "bucket": settings.SUPABASE_ASSETS_BUCKET
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Helper function to delete user avatars
async def delete_user_avatars(user_type: str, user_id: str):
    """Delete existing avatar for a user from campusconnect bucket"""
    try:
        from database.operations import DatabaseOperations
        
        # Get current avatar info from database
        collection_name = "faculties" if user_type == 'faculty' else "students"
        id_field = "employee_id" if user_type == 'faculty' else "enrollment_no"
        
        user_doc = await DatabaseOperations.find_one(
            collection_name=collection_name,
            query={id_field: user_id}
        )
        
        if user_doc and user_doc.get('avatar_url'):
            avatar_url = user_doc['avatar_url']
            
            # Extract file path from Supabase URL
            # URL format: https://[project].supabase.co/storage/v1/object/public/campusconnect/[file_path]
            if '/storage/v1/object/public/campusconnect/' in avatar_url:
                # Get the file path after the bucket name
                file_path = avatar_url.split('/storage/v1/object/public/campusconnect/')[-1]
                
                # Delete the specific file
                delete_result = await SupabaseStorageService.delete_file(
                    bucket_name=settings.SUPABASE_STORAGE_BUCKET,
                    file_path=file_path
                )
                    
        return True
        
    except Exception as e:
        # Don't fail the upload if delete fails - just log the error
        return True
