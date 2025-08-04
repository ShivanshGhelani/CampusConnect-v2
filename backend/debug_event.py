#!/usr/bin/env python3
"""
Debug script to check event document structure in database
"""

import asyncio
import motor.motor_asyncio
from config.database import Database

async def check_event_structure():
    print("🔍 Checking event document structure...")
    
    try:
        db = await Database.get_database()
        
        # Find the MANOTECH event
        event = await db.events.find_one({"event_id": "MANOTECH"})
        
        if event:
            print(f"📄 Found event: {event['event_name']}")
            print("🗂️ Available fields:")
            for key, value in event.items():
                if key == "_id":
                    continue
                print(f"  {key}: {value}")
        else:
            print("❌ Event not found")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_event_structure())
