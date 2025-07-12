"""Event status update task."""
from datetime import datetime
from utils.event_status_manager import EventStatusManager


async def update_event_statuses():
    """Update the status of all events."""
    try:
        stats = await EventStatusManager.update_all_events_status(force_update=True)
        print(f"\nEvent status update summary ({datetime.now().isoformat()}):")
        print(f"Updated: {stats['updated']} events")
        print(f"Errors: {stats['errors']} events")
        print("\nCurrent status distribution:")
        for status, count in stats['by_status'].items():
            print(f"- {status}: {count} events")
    except Exception as e:
        print(f"Error updating event statuses: {str(e)}")
