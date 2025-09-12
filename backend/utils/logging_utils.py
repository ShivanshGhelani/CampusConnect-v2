"""
Utility functions for logging sensitive information safely
"""

def mask_redis_url(redis_url: str) -> str:
    """
    Mask the password in a Redis URL for safe logging
    
    Args:
        redis_url: Full Redis URL with credentials
        
    Returns:
        Masked Redis URL suitable for logging
    """
    if not redis_url:
        return redis_url
    
    try:
        # Split the URL to extract components
        if '@' in redis_url:
            # Format: redis://user:password@host:port
            auth_part, host_part = redis_url.split('@', 1)
            if ':' in auth_part:
                # Extract protocol and user, mask password
                protocol_user = auth_part.rsplit(':', 1)[0]
                return f"{protocol_user}:****@{host_part}"
        return redis_url
    except Exception:
        # If URL parsing fails, just return a generic message
        return "redis://****:****@****.upstash.io:****"