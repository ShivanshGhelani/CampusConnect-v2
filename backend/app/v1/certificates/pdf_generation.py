"""
Certificate PDF Generation API Endpoints
"""
import asyncio
import os
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from typing import Optional
from services.pdf_generation_service import pdf_service
from core.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


class PDFGenerationRequest(BaseModel):
    html_content: str
    filename: str
    width: Optional[int] = 1052
    height: Optional[int] = 744


class PDFGenerationResponse(BaseModel):
    job_id: str
    status: str
    message: str


class PDFStatusResponse(BaseModel):
    job_id: str
    status: str  # pending, processing, completed, failed
    file_path: Optional[str] = None
    error: Optional[str] = None


@router.post("/generate", response_model=PDFGenerationResponse)
async def generate_certificate_pdf(
    request: PDFGenerationRequest,
    background_tasks: BackgroundTasks
):
    """
    Generate certificate PDF asynchronously
    Returns immediately with job_id for status checking
    
    Usage:
    1. POST to /generate with HTML content
    2. Get job_id in response
    3. Poll /status/{job_id} until status is 'completed'
    4. Download from /download/{job_id}
    """
    try:
        # Create job
        job_id = pdf_service.create_job()
        
        # Start PDF generation in background
        background_tasks.add_task(
            pdf_service.generate_pdf,
            job_id=job_id,
            html_content=request.html_content,
            filename=request.filename,
            width=request.width,
            height=request.height
        )
        
        logger.info(f"📝 Created PDF generation job: {job_id}")
        
        return PDFGenerationResponse(
            job_id=job_id,
            status="pending",
            message="PDF generation started. Use job_id to check status."
        )
        
    except Exception as e:
        logger.error(f"❌ Error creating PDF generation job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{job_id}", response_model=PDFStatusResponse)
async def get_pdf_status(job_id: str):
    """
    Check the status of a PDF generation job
    
    Status values:
    - pending: Job created, waiting to start
    - processing: PDF is being generated
    - completed: PDF ready for download
    - failed: Generation failed (check error field)
    """
    status = pdf_service.get_job_status(job_id)
    
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return PDFStatusResponse(
        job_id=job_id,
        status=status["status"],
        file_path=status.get("file_path"),
        error=status.get("error")
    )


@router.get("/download/{job_id}")
async def download_certificate_pdf(job_id: str):
    """
    Download the generated PDF file
    Only works if status is 'completed'
    """
    status = pdf_service.get_job_status(job_id)
    
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if status["status"] != "completed":
        raise HTTPException(
            status_code=400, 
            detail=f"PDF not ready. Current status: {status['status']}"
        )
    
    file_path = status.get("file_path")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF file not found")
    
    filename = os.path.basename(file_path)
    
    return FileResponse(
        path=file_path,
        media_type='application/pdf',
        filename=filename,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache"
        }
    )


@router.post("/generate-sync")
async def generate_certificate_pdf_sync(request: PDFGenerationRequest):
    """
    Generate certificate PDF synchronously (waits for completion)
    Use this only for testing or low-traffic scenarios
    """
    try:
        job_id = pdf_service.create_job()
        
        # Generate PDF and wait
        file_path = await pdf_service.generate_pdf(
            job_id=job_id,
            html_content=request.html_content,
            filename=request.filename,
            width=request.width,
            height=request.height
        )
        
        filename = os.path.basename(file_path)
        
        return FileResponse(
            path=file_path,
            media_type='application/pdf',
            filename=filename,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
        
    except Exception as e:
        logger.error(f"❌ Error generating PDF synchronously: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-direct")
async def generate_certificate_pdf_direct(request: PDFGenerationRequest):
    """
    Generate certificate PDF and return directly as downloadable response
    This is the fastest option - no file storage, direct bytes response
    
    Best for mobile devices where we need immediate download
    Each request is independent and doesn't block others
    """
    try:
        logger.info(f"📱 Generating direct PDF: {request.filename}")
        
        # Generate PDF bytes directly (no file storage)
        pdf_bytes = await pdf_service.generate_pdf_bytes(
            html_content=request.html_content,
            width=request.width,
            height=request.height
        )
        
        logger.info(f"✅ Direct PDF generated: {len(pdf_bytes)} bytes")
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{request.filename}"',
                "Content-Type": "application/pdf",
                "Content-Length": str(len(pdf_bytes))
            }
        )
        
    except Exception as e:
        logger.error(f"❌ Error generating direct PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
