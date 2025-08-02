import asyncio
from config.database import Database

async def test_connection():
    try:
        db = await Database.get_database()
        if db is not None:
            print("✅ Connected to MongoDB Atlas")
            collections = await db.list_collection_names()
            print(f"📋 Collections: {collections}")
            
            # Check if there are registrations
            if "event_registrations" in collections:
                count = await db["event_registrations"].count_documents({})
                print(f"📊 Individual registrations: {count}")
            
            if "team_event_registrations" in collections:
                count = await db["team_event_registrations"].count_documents({})
                print(f"👥 Team registrations: {count}")
                
            # Check for a specific event
            if "events" in collections:
                events = await db["events"].find({}, {"event_id": 1, "title": 1}).limit(5).to_list(5)
                print(f"🎉 Sample events: {events}")
                
        else:
            print("❌ Failed to connect to MongoDB Atlas")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
