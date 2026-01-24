"""
Timezone Utility for CampusConnect
Handles timezone conversion between UTC and IST (Indian Standard Time)
"""
from datetime import datetime, timedelta, timezone
import pytz
from typing import Union, Optional

# Indian Standard Time is UTC+5:30
IST_OFFSET = timedelta(hours=5, minutes=30)
IST_TIMEZONE = timezone(IST_OFFSET)

def utc_to_ist(dt: Union[datetime, str]) -> datetime:
    """Convert UTC datetime to IST"""
    if isinstance(dt, str):
        try:
            # Parse ISO format string
            dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
        except ValueError:
            # Try parsing without timezone info
            dt = datetime.fromisoformat(dt)
            
    # If datetime is naive (no timezone), assume it's UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
        
    # Convert to IST
    return dt.astimezone(IST_TIMEZONE)

def ist_to_utc(dt: Union[datetime, str]) -> datetime:
    """Convert IST datetime to UTC"""
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt)
        except ValueError as e:
            raise ValueError(f"Could not parse datetime string: {dt}")
            
    # If datetime is naive, assume it's IST
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST_TIMEZONE)
        
    # Convert to UTC
    return dt.astimezone(timezone.utc)

def format_for_display(dt: Union[datetime, str], format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
    """Format datetime for display in IST"""
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
        except ValueError:
            return dt  # Return as-is if can't parse
            
    # Convert to IST and format
    ist_dt = utc_to_ist(dt)
    return ist_dt.strftime(format_str)

def format_for_frontend(dt: Union[datetime, str]) -> str:
    """Format datetime for frontend display (IST)"""
    return format_for_display(dt, "%d %b %Y, %I:%M %p")

def parse_frontend_datetime(date_str: str, time_str: str) -> datetime:
    """Parse date and time strings from frontend and preserve IST datetime"""
    try:
        # Combine date and time
        dt_str = f"{date_str}T{time_str}"
        dt = datetime.fromisoformat(dt_str)
        
        # Strip timezone info to prevent MongoDB from converting to UTC
        return dt.replace(tzinfo=None)
        
    except ValueError as e:
        raise ValueError(f"Could not parse datetime: {date_str} {time_str} - {e}")

def get_current_ist() -> datetime:
    """Get current time in IST"""
    return datetime.now(IST_TIMEZONE)

def get_current_utc() -> datetime:
    """Get current time in UTC"""
    return datetime.now(pytz.timezone('Asia/Kolkata'))

# Example usage and testing
if __name__ == "__main__":
    print("Timezone Utility Test")
    print("=" * 40)
    
    # Current times
    now_utc = get_current_utc()
    now_ist = get_current_ist()
    
    print(f"Current UTC: {now_utc}")
    print(f"Current IST: {now_ist}")
    
    # Conversion test
    utc_time = datetime(2025, 7, 30, 10, 0, 0)  # 10:00 AM UTC
    ist_time = utc_to_ist(utc_time)
    print(f"10:00 AM UTC = {ist_time.strftime('%I:%M %p IST')}")
    
    # String parsing test
    parsed = parse_frontend_datetime("2025-07-30", "14:30")
    print(f"Frontend 2:30 PM IST = {parsed} UTC")
