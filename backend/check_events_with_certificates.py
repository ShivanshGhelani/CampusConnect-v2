import os
import sys
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime

# MongoDB connection - using correct connection string from .env
MONGODB_URI = "mongodb+srv://autobotmyra:autobotmyra28@autobotmyra.matjavv.mongodb.net/?retryWrites=true&w=majority&appName=autobotmyra"
DATABASE_NAME = "CampusConnect"

try:
    client = MongoClient(MONGODB_URI)
    db = client[DATABASE_NAME]
    events_collection = db['events']
    
    print("=" * 80)
    print("CHECKING EVENTS WITH CERTIFICATE TEMPLATES")
    print("=" * 80)
    
    # Get all events
    all_events = list(events_collection.find())
    print(f"\nTotal events in database: {len(all_events)}")
    
    # Check for events with certificate templates
    events_with_templates = []
    events_with_is_certificate_based = []
    
    print("\n" + "=" * 80)
    print("DETAILED EVENT CERTIFICATE STATUS")
    print("=" * 80)
    
    for event in all_events:
        event_id = str(event.get('_id', 'N/A'))
        event_name = event.get('event_name', event.get('name', 'Unnamed Event'))
        
        # Check various certificate-related fields
        is_certificate_based = event.get('is_certificate_based', False)
        certificate_templates = event.get('certificate_templates', [])
        certificate_template = event.get('certificate_template')
        certificate_end_date = event.get('certificate_end_date')
        has_certificate = event.get('has_certificate', False)
        
        print(f"\n{event_name[:50]}")
        print(f"  ID: {event_id}")
        print(f"  is_certificate_based: {is_certificate_based}")
        print(f"  certificate_templates: {certificate_templates}")
        print(f"  certificate_template: {certificate_template}")
        print(f"  certificate_end_date: {certificate_end_date}")
        print(f"  has_certificate: {has_certificate}")
        
        # Track events with templates
        if certificate_templates and len(certificate_templates) > 0:
            events_with_templates.append({
                'name': event_name,
                'id': event_id,
                'templates': certificate_templates
            })
            print(f"  ✓ HAS CERTIFICATE TEMPLATE(S)")
        
        if certificate_template:
            print(f"  ✓ HAS CERTIFICATE TEMPLATE FIELD")
        
        if is_certificate_based:
            events_with_is_certificate_based.append({
                'name': event_name,
                'id': event_id
            })
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"\nTotal events: {len(all_events)}")
    print(f"Events with is_certificate_based=True: {len(events_with_is_certificate_based)}")
    print(f"Events with certificate_templates (uploaded): {len(events_with_templates)}")
    
    if events_with_templates:
        print("\n" + "-" * 80)
        print("EVENTS WITH UPLOADED CERTIFICATE TEMPLATES:")
        print("-" * 80)
        for evt in events_with_templates:
            print(f"\n  {evt['name']}")
            print(f"    ID: {evt['id']}")
            print(f"    Templates: {evt['templates']}")
    
    if events_with_is_certificate_based:
        print("\n" + "-" * 80)
        print("EVENTS MARKED AS CERTIFICATE-BASED:")
        print("-" * 80)
        for evt in events_with_is_certificate_based:
            print(f"\n  {evt['name']}")
            print(f"    ID: {evt['id']}")
    
    print("\n" + "=" * 80)
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    if 'client' in locals():
        client.close()
        print("\nMongoDB connection closed.")
