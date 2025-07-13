"""
API tests for authentication endpoints
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock
from main import app


class TestAuthAPI:
    """Test cases for authentication API endpoints."""
    
    @pytest.mark.asyncio
    async def test_student_login_success(self, test_client: AsyncClient, mock_database):
        """Test successful student login."""
        # Mock student data in database
        mock_student = {
            "enrollment_no": "TEST001",
            "email": "test@college.edu",
            "password": "$2b$12$hashedpassword",
            "full_name": "Test Student",
            "is_active": True
        }
        
        mock_database["students"].documents.append(mock_student)
        
        with patch('passlib.context.CryptContext.verify', return_value=True):
            response = await test_client.post(
                "/api/v1/auth/student/login",
                json={
                    "enrollment_no": "TEST001",
                    "password": "password123"
                }
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"]
        assert data["message"] == "Login successful"
        assert "student" in data["data"]
    
    @pytest.mark.asyncio
    async def test_student_login_invalid_credentials(self, test_client: AsyncClient, mock_database):
        """Test student login with invalid credentials."""
        response = await test_client.post(
            "/api/v1/auth/student/login",
            json={
                "enrollment_no": "INVALID",
                "password": "wrongpassword"
            }
        )
        
        assert response.status_code == 401
        data = response.json()
        assert not data["success"]
        assert "Invalid credentials" in data["message"]
    
    @pytest.mark.asyncio
    async def test_student_register_success(self, test_client: AsyncClient, mock_database):
        """Test successful student registration."""
        with patch('core.id_generator.generate_student_id', return_value="STU12345678"):
            response = await test_client.post(
                "/api/v1/auth/student/register",
                json={
                    "enrollment_no": "NEW001",
                    "email": "new.student@college.edu",
                    "mobile_no": "9876543210",
                    "full_name": "New Student",
                    "department": "Computer Science",
                    "semester": 3,
                    "password": "password123",
                    "date_of_birth": "2000-01-15T00:00:00",
                    "gender": "Male"
                }
            )
        
        assert response.status_code == 201
        data = response.json()
        assert data["success"]
        assert data["message"] == "Student registered successfully"
    
    @pytest.mark.asyncio
    async def test_student_register_duplicate_enrollment(self, test_client: AsyncClient, mock_database):
        """Test student registration with duplicate enrollment number."""
        # Mock existing student
        mock_database["students"].documents.append({
            "enrollment_no": "EXISTING001",
            "email": "existing@college.edu"
        })
        
        response = await test_client.post(
            "/api/v1/auth/student/register",
            json={
                "enrollment_no": "EXISTING001",
                "email": "duplicate@college.edu",
                "mobile_no": "9876543210",
                "full_name": "Duplicate Student",
                "department": "IT",
                "semester": 2,
                "password": "password123"
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert not data["success"]
        assert "already registered" in data["message"]
    
    @pytest.mark.asyncio
    async def test_admin_login_success(self, test_client: AsyncClient, mock_database):
        """Test successful admin login."""
        # Mock admin data in database
        mock_admin = {
            "username": "testadmin",
            "password": "$2b$12$hashedpassword",
            "full_name": "Test Admin",
            "role": "admin",
            "is_active": True
        }
        
        mock_database["admin_users"].documents.append(mock_admin)
        
        with patch('passlib.context.CryptContext.verify', return_value=True):
            response = await test_client.post(
                "/api/v1/auth/admin/login",
                json={
                    "username": "testadmin",
                    "password": "adminpass"
                }
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"]
        assert data["message"] == "Login successful"
        assert "admin" in data["data"]
    
    @pytest.mark.asyncio
    async def test_admin_login_inactive_account(self, test_client: AsyncClient, mock_database):
        """Test admin login with inactive account."""
        # Mock inactive admin
        mock_admin = {
            "username": "inactiveadmin",
            "password": "$2b$12$hashedpassword",
            "is_active": False
        }
        
        mock_database["admin_users"].documents.append(mock_admin)
        
        response = await test_client.post(
            "/api/v1/auth/admin/login",
            json={
                "username": "inactiveadmin",
                "password": "password"
            }
        )
        
        assert response.status_code == 403
        data = response.json()
        assert not data["success"]
        assert "Account is deactivated" in data["message"]
    
    @pytest.mark.asyncio
    async def test_student_logout(self, test_client: AsyncClient):
        """Test student logout."""
        # Mock authenticated session
        with patch.object(test_client, 'cookies', {"session": "mock_session"}):
            response = await test_client.post("/api/v1/auth/student/logout")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"]
        assert data["message"] == "Logged out successfully"
    
    @pytest.mark.asyncio
    async def test_admin_logout(self, test_client: AsyncClient):
        """Test admin logout."""
        # Mock authenticated session
        with patch.object(test_client, 'cookies', {"session": "mock_session"}):
            response = await test_client.post("/api/v1/auth/admin/logout")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"]
        assert data["message"] == "Logged out successfully"
    
    @pytest.mark.asyncio
    async def test_check_student_auth_authenticated(self, test_client: AsyncClient):
        """Test checking student authentication status when authenticated."""
        # Mock session with student data
        mock_session = {
            "student": {
                "enrollment_no": "TEST001",
                "full_name": "Test Student",
                "email": "test@college.edu"
            }
        }
        
        with patch('fastapi.Request.session', mock_session):
            response = await test_client.get("/api/v1/auth/student/check")
        
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"]
        assert "student" in data
    
    @pytest.mark.asyncio
    async def test_check_student_auth_unauthenticated(self, test_client: AsyncClient):
        """Test checking student authentication status when not authenticated."""
        response = await test_client.get("/api/v1/auth/student/check")
        
        assert response.status_code == 200
        data = response.json()
        assert not data["authenticated"]
        assert data["student"] is None
    
    @pytest.mark.asyncio
    async def test_invalid_json_request(self, test_client: AsyncClient):
        """Test API request with invalid JSON."""
        response = await test_client.post(
            "/api/v1/auth/student/login",
            content="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_missing_required_fields(self, test_client: AsyncClient):
        """Test API request with missing required fields."""
        response = await test_client.post(
            "/api/v1/auth/student/login",
            json={
                "enrollment_no": "TEST001"
                # Missing password field
            }
        )
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
    
    @pytest.mark.asyncio
    async def test_password_validation(self, test_client: AsyncClient, mock_database):
        """Test password validation during registration."""
        response = await test_client.post(
            "/api/v1/auth/student/register",
            json={
                "enrollment_no": "TEST002",
                "email": "test2@college.edu",
                "mobile_no": "9876543210",
                "full_name": "Test Student 2",
                "department": "IT",
                "semester": 1,
                "password": "123",  # Too short
                "gender": "Female"
            }
        )
        
        assert response.status_code == 422
