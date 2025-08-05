import asyncio
from database.operations import DatabaseOperations

async def check_venues():
    try:
        from config.database import Database
        await Database.connect_db()
        
        venues = await DatabaseOperations.find_many('venues', {})
        print(f'Found {len(venues)} venues in database:')
        for venue in venues:
            print(f'- {venue.get("venue_id", "NO_ID")}: {venue.get("name", "NO_NAME")} (active: {venue.get("is_active", "UNKNOWN")})')
        
        active_venues = await DatabaseOperations.find_many('venues', {'is_active': True})
        print(f'\nFound {len(active_venues)} active venues in database.')
        
        await Database.close_db()
    except Exception as e:
        print(f'Error: {e}')

if __name__ == "__main__":
    asyncio.run(check_venues())
