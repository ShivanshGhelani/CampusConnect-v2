"""
Unit tests for core utilities
"""
import pytest
from datetime import datetime, timedelta
from core.logger import setup_logger
from core.json_encoder import CustomJSONEncoder
import logging
import json
from bson import ObjectId


class TestLogger:
    """Test cases for logger utility."""
    
    def test_setup_logger_default_level(self):
        """Test logger setup with default level."""
        logger = setup_logger()
        
        assert logger.level == logging.INFO
        assert logger.name == "CampusConnect"
    
    def test_setup_logger_custom_level(self):
        """Test logger setup with custom level."""
        logger = setup_logger(logging.DEBUG)
        
        assert logger.level == logging.DEBUG
    
    def test_setup_logger_custom_name(self):
        """Test logger setup with custom name."""
        logger = setup_logger(name="TestLogger")
        
        assert logger.name == "TestLogger"
    
    def test_logger_handlers(self):
        """Test that logger has proper handlers."""
        logger = setup_logger()
        
        # Should have at least one handler
        assert len(logger.handlers) > 0


class TestCustomJSONEncoder:
    """Test cases for custom JSON encoder."""
    
    def test_encode_datetime(self):
        """Test encoding datetime objects."""
        encoder = CustomJSONEncoder()
        test_datetime = datetime(2023, 1, 15, 10, 30, 45)
        
        result = encoder.default(test_datetime)
        
        assert result == "2023-01-15T10:30:45"
    
    def test_encode_objectid(self):
        """Test encoding MongoDB ObjectId."""
        encoder = CustomJSONEncoder()
        test_id = ObjectId("507f1f77bcf86cd799439011")
        
        result = encoder.default(test_id)
        
        assert result == "507f1f77bcf86cd799439011"
    
    def test_encode_regular_object(self):
        """Test encoding regular objects (should raise TypeError)."""
        encoder = CustomJSONEncoder()
        
        class CustomObject:
            pass
        
        test_obj = CustomObject()
        
        with pytest.raises(TypeError):
            encoder.default(test_obj)
    
    def test_json_dumps_with_encoder(self):
        """Test json.dumps with custom encoder."""
        test_data = {
            "datetime": datetime(2023, 1, 15, 10, 30, 45),
            "objectid": ObjectId("507f1f77bcf86cd799439011"),
            "string": "test",
            "number": 42
        }
        
        result = json.dumps(test_data, cls=CustomJSONEncoder)
        
        assert "2023-01-15T10:30:45" in result
        assert "507f1f77bcf86cd799439011" in result
        assert "test" in result
        assert "42" in result
