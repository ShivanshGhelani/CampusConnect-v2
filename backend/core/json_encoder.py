from datetime import datetime
from json import JSONEncoder
from bson import ObjectId

class CustomJSONEncoder(JSONEncoder):
    """Custom JSON encoder that handles datetime objects and ObjectId"""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)
