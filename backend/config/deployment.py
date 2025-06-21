"""
Deployment configuration for production environments
"""
import os
from typing import List

class DeploymentConfig:
    """Configuration for deployment environments"""
    
    @staticmethod
    def get_environment() -> str:
        """Get current environment"""
        return os.getenv("ENVIRONMENT", "development").lower()
    
    @staticmethod
    def is_production() -> bool:
        """Check if running in production"""
        return DeploymentConfig.get_environment() == "production"
    
    @staticmethod
    def get_cors_origins() -> List[str]:
        """Get CORS origins based on environment"""
        if DeploymentConfig.is_production():
            # Production origins from environment variable
            origins_str = os.getenv("CORS_ORIGINS", "")
            if origins_str:
                return [origin.strip() for origin in origins_str.split(",")]
            else:
                # Fallback production origins
                return [
                    "https://yourapp.vercel.app",  # Replace with your actual domain
                ]
        else:
            # Development origins
            return [
                "http://localhost:3000",
                "http://localhost:5173",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:5173",
                "http://localhost:8080",
                "http://127.0.0.1:8080",
            ]
    
    @staticmethod
    def get_session_config() -> dict:
        """Get session configuration based on environment"""
        if DeploymentConfig.is_production():
            return {
                "secret_key": os.getenv("SESSION_SECRET_KEY", "change-in-production"),
                "max_age": 3600,
                "same_site": "none",  # For cross-site cookies in production
                "https_only": True,   # HTTPS required in production
                "domain": os.getenv("COOKIE_DOMAIN"),  # e.g., ".yourdomain.com"
            }
        else:
            return {
                "secret_key": "development-key",
                "max_age": 3600,
                "same_site": "lax",
                "https_only": False,
            }
    
    @staticmethod
    def get_database_url() -> str:
        """Get database URL based on environment"""
        if DeploymentConfig.is_production():
            return os.getenv("MONGODB_URL_PROD") or os.getenv("MONGODB_URL")
        else:
            return os.getenv("MONGODB_URL") or "mongodb://localhost:27017/CampusConnect"
