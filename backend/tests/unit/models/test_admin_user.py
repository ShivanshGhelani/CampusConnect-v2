"""
Unit tests for AdminUser model
"""
import pytest
from datetime import datetime
from pydantic import ValidationError
from models.admin_user import AdminUser, AdminRole


class TestAdminUser:
    """Test cases for AdminUser model."""
    
    def test_admin_user_creation_valid_data(self, sample_admin_data):
        """Test admin user creation with valid data."""
        admin = AdminUser(**sample_admin_data)
        
        assert admin.username == "test_admin"
        assert admin.email == "admin@college.edu"
        assert admin.fullname == "Test Admin"
        assert admin.role == AdminRole.EVENT_ADMIN
        assert admin.is_active == True
        assert admin.password == "admin_password123"
        assert admin.role == "admin"
        assert admin.is_active
    
    def test_admin_user_creation_invalid_email(self, sample_admin_data):
        """Test admin user creation with invalid email."""
        sample_admin_data["email"] = "invalid-email"
        
        with pytest.raises(ValidationError):
            AdminUser(**sample_admin_data)
    
    def test_admin_user_creation_short_password(self, sample_admin_data):
        """Test admin user creation with short password."""
        sample_admin_data["password"] = "123"
        
        with pytest.raises(ValidationError):
            AdminUser(**sample_admin_data)
    
    def test_admin_user_creation_short_username(self, sample_admin_data):
        """Test admin user creation with short username."""
        sample_admin_data["username"] = "ab"
        
        with pytest.raises(ValidationError):
            AdminUser(**sample_admin_data)
    
    def test_admin_user_default_role(self):
        """Test admin user creation with default role."""
        admin_data = {
            "fullname": "New Admin",
            "username": "new_admin",
            "email": "new@college.edu",
            "password": "password123"
        }
        
        admin = AdminUser(**admin_data)
        
        assert admin.role == AdminRole.EVENT_ADMIN
    
    def test_admin_user_super_admin_role(self, sample_admin_data):
        """Test admin user with super admin role."""
        sample_admin_data["role"] = AdminRole.SUPER_ADMIN
        
        admin = AdminUser(**sample_admin_data)
        
        assert admin.role == AdminRole.SUPER_ADMIN
    
    def test_admin_user_executive_admin_role(self, sample_admin_data):
        """Test admin user with executive admin role."""
        sample_admin_data["role"] = AdminRole.EXECUTIVE_ADMIN
        
        admin = AdminUser(**sample_admin_data)
        
        assert admin.role == AdminRole.EXECUTIVE_ADMIN
    
    def test_admin_user_content_admin_role(self, sample_admin_data):
        """Test admin user with content admin role."""
        sample_admin_data["role"] = AdminRole.CONTENT_ADMIN
        
        admin = AdminUser(**sample_admin_data)
        
        assert admin.role == AdminRole.CONTENT_ADMIN
    
    def test_admin_user_with_assigned_events(self, sample_admin_data):
        """Test admin user with assigned events."""
        sample_admin_data["assigned_events"] = ["EVT001", "EVT002", "EVT003"]
        
        admin = AdminUser(**sample_admin_data)
        
        assert len(admin.assigned_events) == 3
        assert "EVT001" in admin.assigned_events
        assert "EVT002" in admin.assigned_events
        assert "EVT003" in admin.assigned_events
    
    def test_admin_user_with_permissions(self, sample_admin_data):
        """Test admin user with specific permissions."""
        sample_admin_data["permissions"] = [
            "manage_events",
            "view_reports",
            "send_certificates"
        ]
        
        admin = AdminUser(**sample_admin_data)
        
        assert len(admin.permissions) == 3
        assert "manage_events" in admin.permissions
        assert "view_reports" in admin.permissions
        assert "send_certificates" in admin.permissions
    
    def test_admin_user_created_by_tracking(self, sample_admin_data):
        """Test admin user creation tracking."""
        sample_admin_data["created_by"] = "super_admin"
        
        admin = AdminUser(**sample_admin_data)
        
        assert admin.created_by == "super_admin"
    
    def test_admin_user_last_login_update(self, sample_admin_data):
        """Test admin user last login update."""
        now = datetime.utcnow()
        sample_admin_data["last_login"] = now
        
        admin = AdminUser(**sample_admin_data)
        
        assert admin.last_login == now
    
    def test_admin_user_inactive_account(self, sample_admin_data):
        """Test admin user with inactive account."""
        sample_admin_data["is_active"] = False
        
        admin = AdminUser(**sample_admin_data)
        
        assert not admin.is_active
    
    def test_admin_user_default_values(self):
        """Test admin user default values."""
        minimal_data = {
            "fullname": "Minimal Admin",
            "username": "minimal_admin",
            "email": "minimal@college.edu",
            "password": "password123"
        }
        
        admin = AdminUser(**minimal_data)
        
        assert admin.is_active
        assert admin.role == AdminRole.EVENT_ADMIN
        assert admin.assigned_events == []
        assert admin.permissions == []
        assert admin.last_login is None
        assert admin.created_by is None
        assert isinstance(admin.created_at, datetime)


class TestAdminRole:
    """Test cases for AdminRole enum."""
    
    def test_admin_role_values(self):
        """Test admin role enum values."""
        assert AdminRole.SUPER_ADMIN.value == "super_admin"
        assert AdminRole.EXECUTIVE_ADMIN.value == "executive_admin"
        assert AdminRole.EVENT_ADMIN.value == "event_admin"
        assert AdminRole.CONTENT_ADMIN.value == "content_admin"
    
    def test_admin_role_from_string(self):
        """Test creating admin role from string."""
        role = AdminRole("super_admin")
        assert role == AdminRole.SUPER_ADMIN
        
        role = AdminRole("event_admin")
        assert role == AdminRole.EVENT_ADMIN
    
    def test_admin_role_invalid_value(self):
        """Test creating admin role with invalid value."""
        with pytest.raises(ValueError):
            AdminRole("invalid_role")
