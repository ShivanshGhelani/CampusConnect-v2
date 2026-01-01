import os
import sys
import re
import requests
from pymongo import MongoClient
from collections import defaultdict

# MongoDB connection
MONGODB_URI = "mongodb+srv://autobotmyra:autobotmyra28@autobotmyra.matjavv.mongodb.net/?retryWrites=true&w=majority&appName=autobotmyra"
DATABASE_NAME = "CampusConnect"

# Common placeholder patterns to check for certificate data
PLACEHOLDER_PATTERNS = {
    'square': r'\[([A-Z_\s]+)\]',              # [PARTICIPANT_NAME] - Primary format
    'curly_double': r'\{\{([A-Z_\s]+)\}\}',    # {{PARTICIPANT_NAME}} - Alternative
    'paren': r'\(([A-Z_\s]+)\)',               # (PARTICIPANT_NAME) - Alternative
}

def fetch_html_content(url):
    """Fetch HTML content from URL"""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.text
    except Exception as e:
        print(f"  ❌ Error fetching {url}: {e}")
        return None

def find_placeholders(html_content, pattern_name, pattern):
    """Find all matches for a specific pattern - focused on certificate data placeholders"""
    matches = re.findall(pattern, html_content, re.IGNORECASE)
    
    # Filter to only uppercase placeholders that look like certificate data
    # Example: PARTICIPANT_NAME, EVENT_NAME, etc.
    filtered_matches = []
    for match in matches:
        match_clean = match.strip()
        # Keep only if it's mostly uppercase and looks like a data placeholder
        if match_clean and (match_clean.isupper() or '_' in match_clean):
            filtered_matches.append(match_clean)
    
    return filtered_matches

def analyze_certificate_templates():
    """Analyze all certificate templates for placeholder patterns"""
    
    try:
        client = MongoClient(MONGODB_URI)
        db = client[DATABASE_NAME]
        events_collection = db['events']
        
        print("=" * 100)
        print("CERTIFICATE TEMPLATE PLACEHOLDER ANALYSIS")
        print("=" * 100)
        
        # Get events with certificate templates
        events_with_templates = list(events_collection.find({
            'certificate_templates': {'$exists': True, '$ne': {}}
        }))
        
        print(f"\nFound {len(events_with_templates)} event(s) with certificate templates\n")
        
        all_placeholders = defaultdict(lambda: defaultdict(set))
        
        for event in events_with_templates:
            event_name = event.get('event_name', 'Unnamed Event')
            certificate_templates = event.get('certificate_templates', {})
            
            print("=" * 100)
            print(f"EVENT: {event_name}")
            print("=" * 100)
            
            for template_name, template_url in certificate_templates.items():
                print(f"\n📜 Template: {template_name}")
                print(f"   URL: {template_url}")
                print("-" * 100)
                
                # Fetch HTML content
                html_content = fetch_html_content(template_url)
                
                if not html_content:
                    continue
                
                print(f"\n   ✓ Successfully fetched template (Size: {len(html_content)} bytes)")
                
                # Check each placeholder pattern
                found_any = False
                for pattern_name, pattern in PLACEHOLDER_PATTERNS.items():
                    matches = find_placeholders(html_content, pattern_name, pattern)
                    
                    if matches:
                        found_any = True
                        unique_matches = set(matches)
                        print(f"\n   🔍 Pattern: {pattern_name} - Found {len(unique_matches)} unique placeholder(s)")
                        
                        for match in sorted(unique_matches):
                            print(f"      • {match}")
                            all_placeholders[pattern_name][match].add(event_name)
                
                if not found_any:
                    print(f"\n   ⚠️  No placeholders found with common patterns")
                
                # Show a sample of the HTML for manual inspection
                print(f"\n   📄 HTML Sample (first 500 chars):")
                print(f"   {'-' * 96}")
                sample = html_content[:500].replace('\n', '\n   ')
                print(f"   {sample}...")
                print(f"   {'-' * 96}")
        
        # Summary
        print("\n" + "=" * 100)
        print("SUMMARY - ALL PLACEHOLDER PATTERNS FOUND")
        print("=" * 100)
        
        if not all_placeholders:
            print("\n⚠️  NO PLACEHOLDERS FOUND IN ANY TEMPLATE")
            print("\nThis could mean:")
            print("  1. Templates use a different placeholder format")
            print("  2. Templates have hardcoded values")
            print("  3. Templates use JavaScript/dynamic rendering")
        else:
            for pattern_name, placeholders in sorted(all_placeholders.items()):
                print(f"\n🔸 Pattern Type: {pattern_name}")
                print(f"   Total unique placeholders: {len(placeholders)}")
                print("-" * 100)
                
                for placeholder, events in sorted(placeholders.items()):
                    print(f"   • {placeholder}")
                    print(f"     Used in: {', '.join(events)}")
        
        print("\n" + "=" * 100)
        print("RECOMMENDATIONS")
        print("=" * 100)
        
        if all_placeholders:
            most_common_pattern = max(all_placeholders.items(), key=lambda x: len(x[1]))
            print(f"\n✓ Most commonly used pattern: {most_common_pattern[0]}")
            print(f"  This pattern appears {len(most_common_pattern[1])} time(s)")
            print(f"\n💡 Recommended: Use this pattern for new certificate templates")
        else:
            print("\n💡 Suggested placeholder formats:")
            print("  • {{PARTICIPANT_NAME}} - Most readable")
            print("  • {participant_name} - Simple and clean")
            print("  • [PARTICIPANT_NAME] - Clear distinction from HTML")
            print("  • ${participant_name} - JavaScript-style")
        
        print("\n" + "=" * 100)
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if 'client' in locals():
            client.close()
            print("\nMongoDB connection closed.")

if __name__ == "__main__":
    analyze_certificate_templates()
