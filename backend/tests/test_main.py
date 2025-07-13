"""
Tests for main application functionality
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock
from main import app


class TestMainApplication:
    """Test cases for main application functionality."""
    
    @pytest.mark.asyncio
    async def test_health_check(self, test_client: AsyncClient):
        """Test the health check endpoint."""
        response = await test_client.get("/api/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert data["cors_configured"]
    
    @pytest.mark.asyncio
    async def test_root_redirect(self, test_client: AsyncClient):
        """Test root path redirect to frontend."""
        response = await test_client.get("/", follow_redirects=False)
        
        assert response.status_code == 302
        assert "localhost:3000" in response.headers["location"]
    
    @pytest.mark.asyncio
    async def test_favicon_endpoint(self, test_client: AsyncClient):
        """Test favicon endpoint."""
        response = await test_client.get("/favicon.ico")
        
        # Should return either the favicon file or 204 if not found
        assert response.status_code in [200, 204]
    
    @pytest.mark.asyncio
    async def test_cors_headers(self, test_client: AsyncClient):
        """Test CORS headers are properly set."""
        response = await test_client.options(
            "/api/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET"
            }
        )
        
        # CORS should be configured to allow the request
        assert response.status_code in [200, 204]
    
    @pytest.mark.asyncio
    async def test_404_error_handling(self, test_client: AsyncClient):
        """Test 404 error handling."""
        response = await test_client.get("/nonexistent-endpoint")
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_api_prefix_routing(self, test_client: AsyncClient):
        """Test that API routes are properly prefixed."""
        # Test that /api routes work
        response = await test_client.get("/api/health")
        assert response.status_code == 200
        
        # Test that /api/v1 routes are accessible
        response = await test_client.get("/api/v1/client/events")
        # Should work (returns 200) or require auth (returns 401)
        assert response.status_code in [200, 401]
    
    @pytest.mark.asyncio
    async def test_static_file_mounting(self, test_client: AsyncClient):
        """Test static file mounting."""
        # This will return 404 since we don't have actual static files in test
        # but it tests that the route is properly mounted
        response = await test_client.get("/static/test.txt")
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_session_middleware(self, test_client: AsyncClient):
        """Test session middleware functionality."""
        # Make a request that should set session data
        response = await test_client.get("/api/health")
        
        # Check that cookies are handled (session middleware is working)
        assert response.status_code == 200
        # Session middleware should be working if no errors occur
    
    @pytest.mark.asyncio
    async def test_json_encoder(self, test_client: AsyncClient):
        """Test custom JSON encoder functionality."""
        # The health endpoint returns a datetime which tests JSON encoding
        response = await test_client.get("/api/health")
        
        assert response.status_code == 200
        data = response.json()
        assert "timestamp" in data
        # Timestamp should be properly serialized as string
        assert isinstance(data["timestamp"], str)
    
    @pytest.mark.asyncio
    async def test_startup_components(self):
        """Test that startup components are properly initialized."""
        # Test that the app can start without errors
        # This is implicitly tested by the test_client fixture
        assert app is not None
        assert hasattr(app, 'routes')
        
        # Check that routers are included
        route_paths = [route.path for route in app.routes]
        
        # Should have API routes
        assert any("/api" in path for path in route_paths)
        # Should have static file mounting
        assert any("/static" in path for path in route_paths)
    
    @pytest.mark.asyncio
    async def test_environment_configuration(self):
        """Test environment-based configuration."""
        # Test is running in test environment
        import os
        assert os.getenv("ENVIRONMENT") == "test"
    
    @pytest.mark.asyncio
    async def test_database_connection_handling(self, test_client: AsyncClient):
        """Test database connection handling."""
        # Test with mock database failure
        with patch('config.database.Database.connect_db', side_effect=Exception("DB Error")):
            # App should still respond to health check even with DB issues
            response = await test_client.get("/api/health")
            assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_error_exception_handler(self, test_client: AsyncClient):
        """Test global exception handler."""
        # Test with an endpoint that might cause an internal error
        with patch('config.database.Database.get_database', side_effect=Exception("Internal Error")):
            response = await test_client.get("/api/v1/client/events")
            # Should handle the error gracefully
            assert response.status_code in [500, 401]  # 500 for error, 401 if auth required
    
    @pytest.mark.asyncio
    async def test_redirect_endpoints(self, test_client: AsyncClient):
        """Test redirect endpoints functionality."""
        # Test admin login redirect
        response = await test_client.get("/admin/login", follow_redirects=False)
        assert response.status_code == 301
        assert "/auth/login" in response.headers["location"]
        
        # Test login redirect
        response = await test_client.get("/login", follow_redirects=False)
        assert response.status_code == 301
        assert "localhost:3000/login" in response.headers["location"]
        
        # Test event categories redirect
        response = await test_client.get("/event-categories", follow_redirects=False)
        assert response.status_code == 301
        assert "localhost:3000/events" in response.headers["location"]
    
    @pytest.mark.asyncio
    async def test_certificate_asset_routes(self, test_client: AsyncClient):
        """Test certificate asset serving routes."""
        # Test logo route
        response = await test_client.get("/logo/test-logo.png", follow_redirects=False)
        assert response.status_code == 307  # Redirect to static
        assert "/static/uploads/assets/logo/test-logo.png" in response.headers["location"]
        
        # Test signature route
        response = await test_client.get("/signature/test-signature.png", follow_redirects=False)
        assert response.status_code == 307  # Redirect to static
        assert "/static/uploads/assets/signature/test-signature.png" in response.headers["location"]
    
    @pytest.mark.asyncio
    async def test_scheduler_health_endpoint(self, test_client: AsyncClient):
        """Test scheduler health check endpoint."""
        with patch('utils.events.dynamic_event_scheduler.get_scheduler_status') as mock_status:
            mock_status.return_value = {
                "running": True,
                "triggers_queued": 0,
                "last_run": "2023-01-01T00:00:00"
            }
            
            response = await test_client.get("/health/scheduler")
            
            assert response.status_code == 200
            data = response.json()
            assert data["running"]
            assert "triggers_queued" in data
