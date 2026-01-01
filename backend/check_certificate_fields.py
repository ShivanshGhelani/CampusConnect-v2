"""
Quick script to check what certificate-related fields exist in actual event documents
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import Settings
from pprint import pprint

async def check_certificate_fields():
    settings = Settings()
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DB_NAME]
    events_collection = db["events"]
    
    # Get a sample of events
    print("=" * 80)
    print("CHECKING CERTIFICATE FIELDS IN EVENT DOCUMENTS")
    print("=" * 80)
    
    # Check all unique field names across all events
    pipeline = [
        {
            "$project": {
                "arrayofkeyvalue": {"$objectToArray": "$$ROOT"}
            }
        },
        {
            "$unwind": "$arrayofkeyvalue"
        },
        {
            "$group": {
                "_id": None,
                "allkeys": {"$addToSet": "$arrayofkeyvalue.k"}
            }
        }
    ]
    
    result = await events_collection.aggregate(pipeline).to_list(length=1)
    if result:
        all_fields = sorted(result[0]['allkeys'])
        certificate_fields = [f for f in all_fields if 'cert' in f.lower()]
        
        print(f"\n📋 Total unique fields in events collection: {len(all_fields)}")
        print(f"\n🎓 Certificate-related fields found: {len(certificate_fields)}")
        print("-" * 80)
        for field in certificate_fields:
            print(f"  • {field}")
    
    # Get sample events with certificate data
    print("\n" + "=" * 80)
    print("SAMPLE EVENT DOCUMENTS (showing certificate fields)")
    print("=" * 80)
    
    cursor = events_collection.find({}).limit(5)
    events = await cursor.to_list(length=5)
    
    for i, event in enumerate(events, 1):
        print(f"\n{'─' * 80}")
        print(f"Event #{i}: {event.get('event_name', 'N/A')} (ID: {event.get('event_id', 'N/A')})")
        print(f"{'─' * 80}")
        
        # Show all certificate-related fields
        cert_data = {}
        for key, value in event.items():
            if 'cert' in key.lower():
                cert_data[key] = value
        
        if cert_data:
            print("Certificate fields found:")
            for key, value in cert_data.items():
                print(f"  {key}: {value}")
        else:
            print("  ⚠️  No certificate fields found in this event")
    
    # Statistics
    print("\n" + "=" * 80)
    print("STATISTICS")
    print("=" * 80)
    
    total_events = await events_collection.count_documents({})
    
    # Check different possible field names
    field_checks = [
        "has_certificates",
        "certificate_enabled",
        "certificates_enabled", 
        "enable_certificates",
        "certificate_start_date",
        "certificate_end_date"
    ]
    
    print(f"\n📊 Total events in database: {total_events}")
    print("\n🔍 Field usage statistics:")
    print("-" * 80)
    
    for field_name in field_checks:
        count = await events_collection.count_documents({field_name: {"$exists": True}})
        percentage = (count / total_events * 100) if total_events > 0 else 0
        
        # Also check how many have it set to True/truthy
        truthy_count = await events_collection.count_documents({
            field_name: {"$in": [True, "true", "True", 1]}
        }) if count > 0 else 0
        
        print(f"  {field_name}:")
        print(f"    - Exists: {count}/{total_events} ({percentage:.1f}%)")
        if truthy_count > 0:
            print(f"    - Set to True: {truthy_count}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_certificate_fields())
