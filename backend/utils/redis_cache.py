"""
Redis caching utility for high-performance event data caching.

This module provides Redis-based caching for event data to complement 
the frontend localStorage caching system.

Installation requirements:
pip install redis

Usage:
    from utils.redis_cache import EventCache
    
    cache = EventCache()
    
    # Cache events
    cache.set_events(events_data)
    
    # Get cached events
    cached_events = cache.get_events()
    
    # Clear cache
    cache.clear_events()
"""

import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import pytz
import os

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

from utils.logging_utils import mask_redis_url

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logging.warning("Redis not installed. Run 'pip install redis' to enable Redis caching.")

logger = logging.getLogger(__name__)

class EventCache:
    """Redis-based cache for event data with automatic expiration."""
    
    def __init__(self, redis_host=None, redis_port=None, redis_db=0, expire_minutes=5):
        """
        Initialize Redis cache connection.
        
        Args:
            redis_host: Redis server host (overridden by env if set)
            redis_port: Redis server port  (overridden by env if set)
            redis_db: Redis database number
            expire_minutes: Cache expiration time in minutes
        """
        self.expire_seconds = expire_minutes * 60
        self.events_key = 'campus_connect:events'
        self.redis_client = None
        
        redis_url = os.getenv("UPSTASH_REDIS_URL") or os.getenv("REDIS_URL")
        if REDIS_AVAILABLE and redis_url:
            try:
                # Redis-py 5.x automatically handles SSL from rediss:// URL
                self.redis_client = redis.from_url(
                    redis_url, 
                    decode_responses=True,
                    socket_connect_timeout=10,
                    socket_timeout=10,
                    retry_on_timeout=True
                )
                self.redis_client.ping()
                logger.info(f"Redis cache initialized successfully on {mask_redis_url(redis_url)}")
            except Exception as e:
                logger.warning(f"Failed to connect to Redis: {e}")
                self.redis_client = None
        elif REDIS_AVAILABLE:
            try:
                self.redis_client = redis.Redis(
                    host=redis_host or 'localhost',
                    port=redis_port or 6379,
                    db=redis_db,
                    decode_responses=True,
                    socket_connect_timeout=2,
                    socket_timeout=2
                )
                self.redis_client.ping()
                logger.info(f"Redis cache initialized successfully on {redis_host or 'localhost'}:{redis_port or 6379}")
            except Exception as e:
                logger.warning(f"Failed to connect to Redis: {e}")
                self.redis_client = None
        else:
            logger.warning("Redis not available, caching disabled")
    
    def is_available(self) -> bool:
        """Check if Redis caching is available."""
        return self.redis_client is not None
    
    def set_events(self, events: List[Dict[str, Any]]) -> bool:
        """
        Cache events data in Redis.
        
        Args:
            events: List of event dictionaries
            
        Returns:
            True if cached successfully, False otherwise
        """
        if not self.is_available():
            return False
            
        try:
            # Store events with metadata
            cache_data = {
                'events': events,
                'cached_at': datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None).isoformat(),
                'count': len(events)
            }
            
            # Set with expiration
            result = self.redis_client.setex(
                self.events_key,
                self.expire_seconds,
                json.dumps(cache_data, default=str)
            )
            
            if result:
                logger.info(f"Cached {len(events)} events in Redis, expires in {self.expire_seconds}s")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to cache events in Redis: {e}")
            return False
    
    def get_events(self) -> Optional[List[Dict[str, Any]]]:
        """
        Retrieve cached events from Redis.
        
        Returns:
            List of events if cache hit, None if cache miss or error
        """
        if not self.is_available():
            return None
            
        try:
            cached_data = self.redis_client.get(self.events_key)
            if not cached_data:
                logger.debug("No events found in Redis cache")
                return None
                
            cache_data = json.loads(cached_data)
            events = cache_data.get('events', [])
            cached_at = cache_data.get('cached_at')
            
            logger.info(f"Retrieved {len(events)} events from Redis cache (cached at {cached_at})")
            return events
            
        except Exception as e:
            logger.error(f"Failed to retrieve events from Redis: {e}")
            return None
    
    def clear_events(self) -> bool:
        """
        Clear cached events from Redis.
        
        Returns:
            True if cleared successfully, False otherwise
        """
        if not self.is_available():
            return False
            
        try:
            result = self.redis_client.delete(self.events_key)
            if result:
                logger.info("Cleared events cache from Redis")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to clear events cache from Redis: {e}")
            return False
    
    def get_cache_info(self) -> Dict[str, Any]:
        """
        Get information about the current cache state.
        
        Returns:
            Dictionary with cache information
        """
        if not self.is_available():
            return {'available': False, 'reason': 'Redis not available'}
            
        try:
            cached_data = self.redis_client.get(self.events_key)
            if not cached_data:
                return {
                    'available': True,
                    'cached': False,
                    'events_count': 0,
                    'ttl': 0
                }
                
            cache_data = json.loads(cached_data)
            ttl = self.redis_client.ttl(self.events_key)
            
            return {
                'available': True,
                'cached': True,
                'events_count': len(cache_data.get('events', [])),
                'cached_at': cache_data.get('cached_at'),
                'ttl': ttl
            }
            
        except Exception as e:
            logger.error(f"Failed to get cache info from Redis: {e}")
            return {'available': True, 'error': str(e)}


# Singleton instance for easy import
event_cache = EventCache()
