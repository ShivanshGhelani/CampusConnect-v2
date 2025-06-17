from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path

class Settings(BaseSettings):
    # JWT Settings
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # MongoDB Settings
    MONGODB_URL: str
    DB_NAME: str = "CampusConnect"

    # Server Settings
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    # Admin Settings
    DEFAULT_ADMIN_USERNAME: str = "admin"
    DEFAULT_ADMIN_EMAIL: str = "admin@campusconnect.edu"
    DEFAULT_ADMIN_PASSWORD: str = "admin123"

    # Email Settings
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    EMAIL_USER: str = ""
    EMAIL_PASSWORD: str = ""
    FROM_EMAIL: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

# Initialize settings
settings = Settings()

# Export settings variables
JWT_SECRET_KEY = settings.JWT_SECRET_KEY
JWT_ALGORITHM = settings.JWT_ALGORITHM
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES

MONGODB_URL = settings.MONGODB_URL
DB_NAME = settings.DB_NAME

# DEFAULT_ADMIN_USERNAME = settings.DEFAULT_ADMIN_USERNAME
# DEFAULT_ADMIN_EMAIL = settings.DEFAULT_ADMIN_EMAIL
# DEFAULT_ADMIN_PASSWORD = settings.DEFAULT_ADMIN_PASSWORD

DEBUG = settings.DEBUG
ENVIRONMENT = settings.ENVIRONMENT

@lru_cache()
def get_settings():
    return settings
