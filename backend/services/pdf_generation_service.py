"""
PDF Generation Service using Playwright
Handles certificate PDF generation with PERFECT rendering (Google Fonts, CSS, backgrounds)
Uses subprocess to isolate from FastAPI's event loop (Windows compatibility)

For cloud deployment: Most providers (Railway, Render, Fly.io) support Playwright.
"""
import asyncio
import uuid
import os
import sys
import json
import base64
import subprocess
from datetime import datetime
from typing import Optional, Dict
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from core.logger import get_logger

logger = get_logger(__name__)

# Temp directory for PDFs
PDF_TEMP_DIR = Path("./temp_pdfs")
PDF_TEMP_DIR.mkdir(exist_ok=True)

# Thread pool for running PDF generation
_executor = ThreadPoolExecutor(max_workers=4)

# Standalone script for PDF generation (runs in separate process)
PDF_GENERATOR_SCRIPT = '''
import sys
import json
import base64
import time

def generate_pdf(html_content, width, height):
    from playwright.sync_api import sync_playwright
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        )
        
        try:
            page = browser.new_page(viewport={'width': width, 'height': height})
            page.set_content(html_content, wait_until='networkidle')
            time.sleep(1)  # Wait for fonts to load
            
            pdf_bytes = page.pdf(
                width=f'{width}px',
                height=f'{height}px',
                print_background=True,
                prefer_css_page_size=True,
                margin={'top': '0', 'right': '0', 'bottom': '0', 'left': '0'}
            )
            return pdf_bytes
        finally:
            browser.close()

if __name__ == '__main__':
    try:
        input_data = json.loads(sys.stdin.read())
        html_content = input_data['html']
        width = input_data.get('width', 1052)
        height = input_data.get('height', 744)
        
        pdf_bytes = generate_pdf(html_content, width, height)
        
        result = {
            'success': True,
            'pdf_base64': base64.b64encode(pdf_bytes).decode('utf-8'),
            'size': len(pdf_bytes)
        }
        print(json.dumps(result))
        
    except Exception as e:
        import traceback
        result = {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }
        print(json.dumps(result))
        sys.exit(1)
'''


class PDFGenerationService:
    """
    PDF Generation Service
    Supports both sync and async (job-based) generation
    """
    
    def __init__(self):
        self.jobs: Dict[str, dict] = {}
        self._browser = None
        self._playwright = None
    
    def create_job(self) -> str:
        """Create a new PDF generation job"""
        job_id = str(uuid.uuid4())
        self.jobs[job_id] = {
            "status": "pending",
            "created_at": datetime.utcnow().isoformat(),
            "file_path": None,
            "error": None
        }
        return job_id
    
    def get_job_status(self, job_id: str) -> Optional[dict]:
        """Get the status of a PDF generation job"""
        return self.jobs.get(job_id)
    
    async def generate_pdf(
        self,
        job_id: str,
        html_content: str,
        filename: str,
        width: int = 1052,
        height: int = 744
    ) -> str:
        """
        Generate PDF from HTML content
        Updates job status throughout the process
        """
        try:
            # Update status
            if job_id in self.jobs:
                self.jobs[job_id]["status"] = "processing"
            
            logger.info(f"📝 Starting PDF generation for job {job_id}")
            
            # Generate PDF
            pdf_bytes = await self.generate_pdf_bytes(html_content, width, height)
            
            # Save to file
            safe_filename = "".join(c for c in filename if c.isalnum() or c in ('_', '-', '.'))
            if not safe_filename.endswith('.pdf'):
                safe_filename += '.pdf'
            
            file_path = PDF_TEMP_DIR / f"{job_id}_{safe_filename}"
            
            with open(file_path, 'wb') as f:
                f.write(pdf_bytes)
            
            # Update job status
            if job_id in self.jobs:
                self.jobs[job_id]["status"] = "completed"
                self.jobs[job_id]["file_path"] = str(file_path)
            
            logger.info(f"✅ PDF generated successfully: {file_path} ({len(pdf_bytes)} bytes)")
            return str(file_path)
            
        except Exception as e:
            logger.error(f"❌ PDF generation failed for job {job_id}: {str(e)}")
            if job_id in self.jobs:
                self.jobs[job_id]["status"] = "failed"
                self.jobs[job_id]["error"] = str(e)
            raise
    
    async def generate_pdf_bytes(
        self,
        html_content: str,
        width: int = 1052,
        height: int = 744
    ) -> bytes:
        """
        Generate PDF and return bytes directly
        Uses Playwright in subprocess for PERFECT rendering
        ~3-4 seconds but produces professional quality PDFs
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _executor,
            self._render_pdf_playwright,
            html_content,
            width,
            height
        )
    
    def _render_pdf_playwright(
        self,
        html_content: str,
        width: int,
        height: int
    ) -> bytes:
        """
        Run Playwright in a separate subprocess
        This isolates it from FastAPI's event loop (Windows fix)
        Produces PERFECT PDFs with Google Fonts, CSS, backgrounds
        """
        import time
        start_time = time.time()
        
        try:
            logger.info("🚀 Starting Playwright PDF generation...")
            
            # Prepare input data
            input_data = json.dumps({
                'html': html_content,
                'width': width,
                'height': height
            })
            
            # Run the generator script in a separate process
            result = subprocess.run(
                [sys.executable, '-c', PDF_GENERATOR_SCRIPT],
                input=input_data,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode != 0:
                error_output = result.stderr or result.stdout or "Unknown error"
                logger.error(f"❌ Subprocess failed: {error_output}")
                raise Exception(f"PDF subprocess failed: {error_output}")
            
            # Parse output
            output = json.loads(result.stdout)
            
            if not output.get('success'):
                raise Exception(f"PDF generation failed: {output.get('error', 'Unknown')}")
            
            # Decode PDF bytes
            pdf_bytes = base64.b64decode(output['pdf_base64'])
            
            elapsed = time.time() - start_time
            logger.info(f"✅ PDF generated in {elapsed:.2f}s: {len(pdf_bytes)} bytes")
            return pdf_bytes
            
        except subprocess.TimeoutExpired:
            logger.error("❌ PDF generation timed out")
            raise Exception("PDF generation timed out")
        except Exception as e:
            logger.error(f"❌ PDF error: {str(e)}")
            raise Exception(f"PDF generation failed: {str(e)}")
    
    def cleanup_old_files(self, max_age_hours: int = 1):
        """Clean up old PDF files"""
        try:
            cutoff = datetime.utcnow().timestamp() - (max_age_hours * 3600)
            
            for file_path in PDF_TEMP_DIR.glob("*.pdf"):
                if file_path.stat().st_mtime < cutoff:
                    file_path.unlink()
                    logger.info(f"🗑️ Cleaned up old PDF: {file_path}")
                    
        except Exception as e:
            logger.error(f"Error cleaning up PDFs: {e}")


# Singleton instance
pdf_service = PDFGenerationService()
