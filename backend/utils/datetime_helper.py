"""
Helper functions for datetime operations with timezone handling
Handles comparison between timezone-aware and timezone-naive datetime objects
"""
from datetime import datetime
import pytz

IST = pytz.timezone('Asia/Kolkata')

def get_current_ist():
    """Get current datetime in IST timezone"""
    return datetime.now(IST)

def safe_datetime_compare(dt1, dt2, comparison='gt'):
    """
    Safely compare two datetime objects, handling timezone-aware and naive datetimes
    
    Args:
        dt1: First datetime (can be aware or naive)
        dt2: Second datetime (can be aware or naive)
        comparison: 'gt', 'lt', 'gte', 'lte', 'eq'
    
    Returns:
        Boolean result of comparison
    """
    # Convert both to naive UTC for comparison
    if dt1 is None or dt2 is None:
        return False
    
    # Convert to naive datetime for comparison
    dt1_naive = dt1.replace(tzinfo=None) if hasattr(dt1, 'tzinfo') and dt1.tzinfo else dt1
    dt2_naive = dt2.replace(tzinfo=None) if hasattr(dt2, 'tzinfo') and dt2.tzinfo else dt2
    
    if comparison == 'gt':
        return dt1_naive > dt2_naive
    elif comparison == 'lt':
        return dt1_naive < dt2_naive
    elif comparison == 'gte':
        return dt1_naive >= dt2_naive
    elif comparison == 'lte':
        return dt1_naive <= dt2_naive
    elif comparison == 'eq':
        return dt1_naive == dt2_naive
    else:
        raise ValueError(f"Invalid comparison operator: {comparison}")

def make_aware(dt, timezone=IST):
    """
    Make a naive datetime timezone-aware
    
    Args:
        dt: Naive datetime object
        timezone: Target timezone (default: IST)
    
    Returns:
        Timezone-aware datetime
    """
    if dt is None:
        return None
    
    if hasattr(dt, 'tzinfo') and dt.tzinfo is not None:
        # Already aware, convert to target timezone
        return dt.astimezone(timezone)
    
    # Naive datetime, localize it
    return timezone.localize(dt)

def make_naive(dt):
    """
    Convert timezone-aware datetime to naive (remove timezone info)
    
    Args:
        dt: Timezone-aware datetime
    
    Returns:
        Naive datetime
    """
    if dt is None:
        return None
    
    if hasattr(dt, 'tzinfo') and dt.tzinfo is not None:
        return dt.replace(tzinfo=None)
    
    return dt
