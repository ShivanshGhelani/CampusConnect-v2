#!/usr/bin/env python3
"""Test script for RecentActivityService with enhanced messaging."""

import asyncio
from services.recent_activity_service import RecentActivityService

async def test_service():
    service = RecentActivityService()
    logs = await service.get_recent_activity(limit=5)
    
    print('Enhanced Recent Activity Data:')
    print('=' * 50)
    
    for i, log in enumerate(logs, 1):
        activity = log['activity']
        print(f'{i}. Action: {activity["action"]}')
        print(f'   Message: {activity["message"]}')
        print(f'   Description: {activity["description"]}')
        print(f'   Icon: {activity["icon"]}')
        print(f'   Time: {log["time_ago"]}')
        print(f'   Raw Trigger: {log["trigger_type"]}')
        print(f'   Color: {activity["color"]}')
        print('-' * 30)

if __name__ == "__main__":
    asyncio.run(test_service())
