# CampusConnect Backend

This is the backend system for CampusConnect, providing comprehensive functionality for campus event management, student registration, administrative tasks, and email services.

## Features

- **Event Management**: Complete event lifecycle management with dynamic scheduling
- **Student Registration**: Secure student registration and management system
- **Email Integration**: Advanced email services with SMTP pooling and queue processing
- **Certificate Generation**: Automated certificate creation and delivery
- **Admin User Management**: Role-based access control with hierarchical permissions
- **Database Operations**: Optimized MongoDB operations with connection pooling
- **Core Utilities**: Essential system utilities and monitoring tools
- **Comprehensive API**: RESTful API with FastAPI framework

## Architecture Overview

The backend follows a **layered architecture** with clear separation of concerns:

- **API Layer**: FastAPI endpoints in `api/` and `routes/`
- **Service Layer**: Business logic in `services/`
- **Database Layer**: Data access in `database/`
- **Core Layer**: System utilities in `core/`
- **Utils Layer**: Application utilities in `utils/`

## Updated Project Structure

```
├── api/                    # API endpoints (v1, v2)
├── config/                 # Configuration files and settings
├── core/                   # Core system utilities and infrastructure
│   ├── logger.py           # Centralized logging
│   ├── id_generator.py     # Unique ID generation
│   ├── permissions.py      # Role-based access control
│   └── ...                 # Other core utilities
├── database/               # Database operations and utilities
│   ├── operations.py       # Main database operations
│   ├── backup.py          # Backup utilities
│   ├── migration.py       # Data migration tools
│   └── statistics.py      # Database statistics
├── dependencies/           # FastAPI dependencies
├── logs/                   # Application logs
├── models/                 # Pydantic data models
├── routes/                 # FastAPI route handlers
├── scripts/                # Administrative and utility scripts
├── services/               # Business logic layer
│   ├── venue_service.py    # Venue management service
│   └── email/              # Email services
│       ├── service.py      # Email service
│       ├── optimized_service.py  # High-performance email
│       ├── smtp_pool.py    # SMTP connection pooling
│       └── queue.py        # Background email queue
├── static/                 # Static files and assets
├── templates/              # Jinja2 templates
├── utils/                  # Application utilities
│   ├── event_scheduler.py  # Dynamic event scheduling
│   ├── event_status.py     # Event status management
│   ├── event_lifecycle.py  # Event lifecycle operations
│   └── ...                 # Other utilities
└── main.py                 # FastAPI application entry point
```
├── dependencies/   # Core dependencies and middlewares
├── docs/           # Documentation
├── logs/           # Application logs
├── models/         # Database models
├── routes/         # Route handlers
│   ├── admin/      # Admin routes
│   └── client/     # Client-facing routes
├── scripts/        # Utility scripts
│   ├── automation/ # Automation scripts
│   ├── debug/      # Debugging and verification tools
│   ├── testing/    # Test scripts
│   └── data_migration/ # Data migration scripts
├── static/         # Static files
├── temp/           # Temporary test HTML templates
├── templates/      # HTML templates
└── utils/          # Utility functions
```

## Setup

1. Clone the repository
```bash
git clone <repository-url>
cd UCG_v2_Admin
```

2. Create and activate virtual environment
```bash
python -m venv admin
admin\Scripts\activate  # On Windows
source admin/bin/activate  # On Unix/MacOS
```

3. Install dependencies
```bash
pip install -r requirements.txt
```

4. Set up environment variables
- Copy `.env.example` to `.env`
- Update the variables in `.env` with your configuration

5. Initialize the database
```bash
python scripts/create_admin.py
```

## Running the Application

1. Activate the virtual environment
2. Run the application:
```bash
python main.py
```

## Development

- Follow PEP 8 style guidelines
- Write tests for new features
- Update documentation as needed

## Testing

Run the tests using:
```bash
python -m pytest
```

For specific component testing:
```bash
python scripts/testing/test_specific_component.py
```

## Debugging

Debug tools are available in the `scripts/debug/` directory:

```bash
python scripts/debug/check_events.py
```

## Documentation

Detailed documentation can be found in the `docs/` directory:
- [Certificate Implementation](docs/CERTIFICATE_BUTTON_IMPLEMENTATION.md)
- [Email Integration](docs/EMAIL_TEMPLATE_ENHANCEMENT_SUMMARY.md)
- [Implementation Summary](docs/IMPLEMENTATION_SUMMARY.md)
- [Feedback Form Fixes](docs/FEEDBACK_FORM_FIXES_FINAL.md)
- [Logging](docs/logging.md)
