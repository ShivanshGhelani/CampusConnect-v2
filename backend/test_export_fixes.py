#!/usr/bin/env python3
"""
Test script to validate the export service fixes:
1. Target audience filtering
2. Image upload functionality  
3. Database field mapping
"""

import sys
import os
import json
import logging
from pathlib import Path

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.operations import DatabaseOperations
from services.export_service import ExportService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_export_service():
    """Test the export service with real data"""
    
    try:
        # Initialize export service
        export_service = ExportService()
        
        # Get a list of events to test with
        events = await DatabaseOperations.find_many("events", {})
        
        if not events:
            logger.error("No events found in database")
            return
        
        logger.info(f"Found {len(events)} events in database")
        
        for event in events[:3]:  # Test first 3 events
            event_id = event.get('event_id', str(event['_id']))  # Use event_id field or fallback to _id
            event_name = event.get('event_name', 'Unknown Event')
            target_audience = event.get('target_audience', 'Unknown')
            
            logger.info(f"\n=== Testing Event: {event_name} (ID: {event_id}) ===")
            logger.info(f"Target Audience: {target_audience}")
            
            # Test export generation
            try:
                report_path = await export_service.generate_event_report(event_id)
                logger.info(f"✅ Report generated successfully: {report_path}")
                
                # Check if report file exists and has content
                if os.path.exists(report_path):
                    file_size = os.path.getsize(report_path)
                    logger.info(f"Report file size: {file_size} bytes")
                    
                    # Check for image references in the report
                    with open(report_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                    if 'static/uploads/events' in content:
                        logger.info("✅ Report contains image references")
                    else:
                        logger.warning("⚠️ No image references found in report")
                    
                    if 'N/A' in content:
                        logger.warning("⚠️ Report still contains 'N/A' values")
                    else:
                        logger.info("✅ No 'N/A' values found in report")
                        
                else:
                    logger.error(f"❌ Report file not created: {report_path}")
                    
            except Exception as e:
                logger.error(f"❌ Error generating report for {event_name}: {str(e)}")
                import traceback
                traceback.print_exc()
    
    except Exception as e:
        logger.error(f"❌ Database connection error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_export_service())
