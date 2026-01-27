"""
Export API Routes
================
Admin routes for generating various reports and export documents.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Form, UploadFile, File
from fastapi.responses import HTMLResponse
from typing import Optional, Dict, Any, List
import json

from dependencies.auth import require_admin
from models.admin_user import AdminUser
from services.export_service import export_service
from core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()

@router.get("/report")
async def generate_report(
    event_id: str = Query(..., description="Event ID for the report"),
    report_type: str = Query(..., description="Type of report to generate", regex="^(sign_sheet|attendance_report|feedback_report|budget_report|event_report)$"),
    format: str = Query("html", description="Output format", regex="^(html|json)$"),
    include_empty_rows: Optional[int] = Query(10, description="Number of empty rows to add (for sign sheets)", ge=0, le=50),
    admin: AdminUser = Depends(require_admin)
):
    """
    Generate various reports for events
    
    Supported report types:
    - sign_sheet: Attendance sign sheet with participant details
    - attendance_report: Attendance summary and statistics
    - feedback_report: Feedback responses and analytics
    - budget_report: Financial summary and budget breakdown
    - event_report: Comprehensive event report with all details
    """
    try:
        # Prepare options
        options = {
            "include_empty_rows": include_empty_rows,
            "generated_by": admin.username,
            "admin_role": admin.role
        }
        
        # Route to appropriate service method
        if report_type == "sign_sheet":
            result = await export_service.generate_sign_sheet(event_id, options)
        elif report_type == "attendance_report":
            result = await export_service.generate_attendance_report(event_id, options)
        elif report_type == "feedback_report":
            result = await export_service.generate_feedback_report(event_id, options)
        elif report_type == "budget_report":
            result = await export_service.generate_budget_report(event_id, options)
        elif report_type == "event_report":
            result = await export_service.generate_event_report(event_id, options)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported report type: {report_type}")
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail="Failed to generate report")
        
        # Return based on requested format
        if format == "html":
            return HTMLResponse(
                content=result["html_content"],
                headers={
                    "Content-Disposition": f"inline; filename={report_type}_{event_id}.html",
                    "Cache-Control": "no-cache"
                }
            )
        else:
            # Return JSON with metadata
            return {
                "success": True,
                "data": {
                    "html_content": result["html_content"],
                    "metadata": result["metadata"]
                },
                "message": f"{report_type.replace('_', ' ').title()} generated successfully"
            }
            
    except ValueError as e:
        logger.warning(f"Invalid request for report generation: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating {report_type} for event {event_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate {report_type}: {str(e)}"
        )

@router.get("/sign-sheet/{event_id}")
async def get_sign_sheet(
    event_id: str,
    format: str = Query("html", description="Output format", regex="^(html|json)$"),
    empty_rows: int = Query(10, description="Number of empty rows to add", ge=0, le=50),
    admin: AdminUser = Depends(require_admin)
):
    """
    Quick endpoint for generating sign sheets (legacy compatibility)
    """
    return await generate_report(
        event_id=event_id,
        report_type="sign_sheet",
        format=format,
        include_empty_rows=empty_rows,
        admin=admin
    )

@router.get("/attendance-report/{event_id}")
async def get_attendance_report(
    event_id: str,
    format: str = Query("html", description="Output format", regex="^(html|json)$"),
    admin: AdminUser = Depends(require_admin)
):
    """
    Quick endpoint for generating attendance reports (legacy compatibility)
    """
    return await generate_report(
        event_id=event_id,
        report_type="attendance_report",
        format=format,
        admin=admin
    )

@router.get("/feedback-report/{event_id}")
async def get_feedback_report(
    event_id: str,
    format: str = Query("html", description="Output format", regex="^(html|json)$"),
    admin: AdminUser = Depends(require_admin)
):
    """
    Quick endpoint for generating feedback reports (legacy compatibility)
    """
    return await generate_report(
        event_id=event_id,
        report_type="feedback_report",
        format=format,
        admin=admin
    )

@router.get("/budget-report/{event_id}")
async def get_budget_report(
    event_id: str,
    format: str = Query("html", description="Output format", regex="^(html|json)$"),
    admin: AdminUser = Depends(require_admin)
):
    """
    Quick endpoint for generating budget reports (legacy compatibility)
    """
    return await generate_report(
        event_id=event_id,
        report_type="budget_report",
        format=format,
        admin=admin
    )
