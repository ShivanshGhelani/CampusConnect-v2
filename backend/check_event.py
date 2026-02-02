import asyncio
from database.operations import DatabaseOperations

async def check():
    await DatabaseOperations.initialize()
    event = await DatabaseOperations.find_one('events', {'event_id': 'IS2TESTU2026'})
    
    print('=== Event Data ===')
    print('Event ID:', event.get('event_id'))
    print('Event Name:', event.get('event_name'))
    print('\nattendance_strategy:', event.get('attendance_strategy'))
    print('\nteam_rounds:', event.get('team_rounds'))
    print('\nevent_date:', event.get('event_date'))
    print('\nevent_end_date:', event.get('event_end_date'))

asyncio.run(check())
