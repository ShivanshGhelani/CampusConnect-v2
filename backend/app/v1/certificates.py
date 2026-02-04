"""
Certificate PDF Generation API Routes
Server-side PDF generation using Playwright for perfect rendering
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel
import logging
from playwright.async_api import async_playwright
import asyncio
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter()


class CertificateGenerateRequest(BaseModel):
    html: str
    filename: str
    width: int = 1052
    height: int = 744


@router.post("/generate-pdf")
async def generate_certificate_pdf(request: CertificateGenerateRequest):
    """
    Generate PDF from HTML using Playwright (headless browser)
    Works perfectly with Google Fonts and complex styling
    """
    try:
        logger.info(f"Generating PDF certificate: {request.filename}")
        
        # Generate PDF using Playwright
        pdf_bytes = await generate_pdf_with_playwright(
            request.html,
            request.width,
            request.height
        )
        
        # Return PDF as downloadable response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{request.filename}"',
                "Content-Type": "application/pdf"
            }
        )
        
    except Exception as e:
        logger.error(f"Error generating PDF: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate PDF: {str(e)}"
        )


async def generate_pdf_with_playwright(html: str, width: int, height: int) -> bytes:
    """
    Use Playwright to render HTML and generate PDF
    Playwright is a headless browser that handles fonts perfectly
    """
    try:
        async with async_playwright() as p:
            # Launch headless browser
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--no-sandbox'
                ]
            )
            
            # Create new page with exact dimensions
            page = await browser.new_page(
                viewport={'width': width, 'height': height}
            )
            
            # Set content and wait for fonts/images to load
            await page.set_content(html, wait_until='networkidle')
            
            # Additional wait for Google Fonts
            await asyncio.sleep(2)
            
            # Generate PDF with exact dimensions
            pdf_bytes = await page.pdf(
                width=f'{width}px',
                height=f'{height}px',
                print_background=True,
                prefer_css_page_size=True,
                margin={'top': '0', 'right': '0', 'bottom': '0', 'left': '0'}
            )
            
            await browser.close()
            
            logger.info(f"PDF generated successfully, size: {len(pdf_bytes)} bytes")
            return pdf_bytes
            
    except Exception as e:
        logger.error(f"Playwright PDF generation failed: {str(e)}")
        raise Exception(f"PDF generation failed: {str(e)}")
