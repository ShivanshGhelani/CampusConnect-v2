# Configuration Directory

## Overview
The configuration directory contains all system configuration modules that handle database connections, application settings, deployment configurations, and path management for the CampusConnect system.

## Configuration Modules

### 🗄️ **Database Configuration** (`database.py`)
- **Purpose**: MongoDB connection management using Motor async driver
- **Features**:
  - Async database connection handling
  - Connection pooling and reuse
  - Database instance management
  - Error handling for connection failures
- **Key Components**:
  - `Database.connect_db()` - Establish connection
  - `Database.get_database()` - Retrieve database instance
  - `Database.close_db()` - Clean connection closure

### ⚙️ **Application Settings** (`settings.py`)
- **Purpose**: Environment-based configuration management
- **Features**:
  - SMTP server configuration
  - Email service settings
  - Database connection strings
  - API keys and secrets
  - Environment-specific configurations
- **Key Settings**:
  - `SMTP_SERVER`, `SMTP_PORT` - Email configuration
  - `EMAIL_USER`, `EMAIL_PASSWORD` - Authentication
  - `DATABASE_URL` - MongoDB connection
  - `SECRET_KEY` - Application security

### 📁 **Path Management** (`paths.py`)
- **Purpose**: Centralized path and URL management
- **Features**:
  - Static file path generation
  - Upload directory management
  - Asset URL builders
  - Cross-platform path handling
- **Key Functions**:
  - `static_url()` - Static file URLs
  - `upload_url()` - Upload file URLs
  - `css_url()`, `js_url()` - Asset-specific URLs
  - `image_url()` - Image asset URLs

### 🚀 **Deployment Configuration** (`deployment.py`)
- **Purpose**: Production deployment settings
- **Features**:
  - Environment detection
  - Production vs development configs
  - Security settings for production
  - Performance optimizations

### 💾 **Database Backup** (`database_backup.py`)
- **Purpose**: Database backup and restore operations
- **Features**:
  - Automated backup scheduling
  - Collection-specific backups
  - Restore functionality
  - Backup validation

## Configuration Patterns

### **Environment Variables**
```python
import os
from typing import Optional

class Settings:
    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "CampusConnect")
    
    # Email Configuration
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    EMAIL_USER: str = os.getenv("EMAIL_USER", "")
    EMAIL_PASSWORD: str = os.getenv("EMAIL_PASSWORD", "")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "development-key")
    
    # Application
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

def get_settings() -> Settings:
    return Settings()
```

### **Database Connection Pattern**
```python
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional

class Database:
    client: Optional[AsyncIOMotorClient] = None
    database = None

    @classmethod
    async def connect_db(cls):
        """Create database connection"""
        try:
            settings = get_settings()
            cls.client = AsyncIOMotorClient(settings.DATABASE_URL)
            cls.database = cls.client[settings.DATABASE_NAME]
            # Test connection
            await cls.client.admin.command('ping')
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            cls.client = None
            cls.database = None

    @classmethod
    async def get_database(cls, db_name: str = None):
        """Get database instance"""
        if cls.client is None:
            await cls.connect_db()
        return cls.database if db_name is None else cls.client[db_name]
```

### **Path Configuration Pattern**
```python
import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).parent.parent
STATIC_DIR = BASE_DIR / "static"
UPLOAD_DIR = STATIC_DIR / "uploads"
TEMPLATE_DIR = BASE_DIR / "templates"

def static_url(path: str) -> str:
    """Generate static file URL"""
    return f"/static/{path}"

def upload_url(path: str) -> str:
    """Generate upload file URL"""
    return f"/static/uploads/{path}"
```

## Environment Management

### **Development Environment** (`.env.development`)
```env
# Database
DATABASE_URL=mongodb://localhost:27017
DATABASE_NAME=CampusConnect_Dev

# Email (Development)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=dev@example.com
EMAIL_PASSWORD=dev_password

# Security
SECRET_KEY=development-secret-key
DEBUG=true
ENVIRONMENT=development

# Logging
LOG_LEVEL=DEBUG
```

### **Production Environment** (`.env.production`)
```env
# Database
DATABASE_URL=mongodb://prod-server:27017
DATABASE_NAME=CampusConnect

# Email (Production)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=noreply@campusconnect.edu
EMAIL_PASSWORD=${EMAIL_PASSWORD}

# Security
SECRET_KEY=${SECRET_KEY}
DEBUG=false
ENVIRONMENT=production

# Performance
WORKER_PROCESSES=4
MAX_CONNECTIONS=100
```

## Security Considerations

### **Environment Variables**
- Sensitive data stored in environment variables
- No hardcoded credentials in source code
- Different configurations for dev/staging/production
- Secrets management integration

### **Database Security**
- Connection string encryption
- Access control and authentication
- Network security and SSL/TLS
- Regular backup and monitoring

### **Application Security**
- CORS configuration
- Rate limiting settings
- Session security configuration
- API key management

## Configuration Loading

### **Startup Sequence**
1. Load environment variables
2. Initialize settings object
3. Establish database connection
4. Configure logging
5. Set up static file serving
6. Initialize email services

### **Runtime Configuration**
- Settings accessible via dependency injection
- Database connections managed per request
- Path resolution on-demand
- Environment-specific behavior

## Best Practices

### **Configuration Management**
1. **Environment Separation**: Different configs for different environments
2. **Secret Management**: Use environment variables for sensitive data
3. **Validation**: Validate configuration values at startup
4. **Documentation**: Document all configuration options
5. **Defaults**: Provide sensible defaults for development

### **Database Configuration**
1. **Connection Pooling**: Configure appropriate pool sizes
2. **Timeout Settings**: Set reasonable connection timeouts
3. **Retry Logic**: Implement connection retry mechanisms
4. **Monitoring**: Log connection status and performance
5. **Backup Strategy**: Regular automated backups

### **Path Management**
1. **Cross-Platform**: Use pathlib for path operations
2. **Absolute Paths**: Use absolute paths for reliability
3. **URL Generation**: Centralized URL generation functions
4. **Asset Organization**: Logical directory structure
5. **Security**: Validate file paths and uploads

## Integration Points

### **With Main Application**
- Settings injected via FastAPI dependencies
- Database connections used by services
- Paths used for static file serving
- Email configuration for notification services

### **With Services**
- Services use database configuration
- Path management for file operations
- Settings for service behavior
- Email settings for communication

### **With Utils**
- Utilities use configuration for operations
- Path utilities for asset management
- Database utilities for operations
- Email utilities for messaging

## Deployment Configuration

### **Docker Configuration**
```dockerfile
# Environment variables
ENV DATABASE_URL=mongodb://mongo:27017
ENV DATABASE_NAME=CampusConnect
ENV SMTP_SERVER=smtp.gmail.com
ENV SMTP_PORT=587

# Volume mounts for uploads
VOLUME ["/app/static/uploads"]

# Health checks
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1
```

### **Production Deployment**
- Load balancer configuration
- Database cluster settings
- CDN integration for static files
- Monitoring and alerting setup
- Backup and disaster recovery

---

*Last Updated: July 12, 2025*
*Part of CampusConnect Backend Architecture*
