# Database Directory

## Overview
The database directory contains all database-related operations, utilities, and configurations for the CampusConnect system. This includes connection management, operations abstraction, data migration scripts, and database-specific utilities.

## Location Update
This directory was moved from `utils/database/` to `backend/database/` to better organize database-specific functionality at the backend root level, making it a core system component rather than a utility.

## Architecture Pattern
Database layer follows the **Repository Pattern** with:
- **Connection Pooling**: Efficient MongoDB connection management
- **Async Operations**: All database operations use async/await
- **Error Handling**: Comprehensive database error management
- **Abstraction**: Clean interface between services and database operations

## Modules

### **`operations.py`**
- **Purpose**: Centralized database operations abstraction
- **Features**:
  - Async CRUD operations for all collections
  - Error handling and connection management
  - Query optimization and pagination
  - Transaction support where needed

#### Key Classes and Functions
```python
class DatabaseOperations:
    @classmethod
    async def find_one(cls, collection_name: str, query: Dict) -> Optional[Dict]
    
    @classmethod
    async def find_many(cls, collection_name: str, query: Dict = {}, 
                       limit: int = 0, skip: int = 0, 
                       sort_by: Optional[List] = None) -> List[Dict]
    
    @classmethod
    async def insert_one(cls, collection_name: str, document: Dict) -> Optional[str]
    
    @classmethod
    async def update_one(cls, collection_name: str, query: Dict, 
                        update: Dict) -> bool
    
    @classmethod
    async def delete_one(cls, collection_name: str, query: Dict) -> bool
    
    @classmethod
    async def count_documents(cls, collection_name: str, query: Dict = {}) -> int
```

## Usage Patterns

### **Basic Operations**
```python
from database.operations import DatabaseOperations

# Find single document
user = await DatabaseOperations.find_one("users", {"username": "admin"})

# Find multiple documents with pagination
events = await DatabaseOperations.find_many(
    "events", 
    {"status": "active"}, 
    limit=10, 
    skip=0,
    sort_by=[("created_at", -1)]
)

# Insert new document
result_id = await DatabaseOperations.insert_one("students", student_data)

# Update document
success = await DatabaseOperations.update_one(
    "events", 
    {"event_id": event_id}, 
    {"$set": {"status": "completed"}}
)

# Count documents
total_students = await DatabaseOperations.count_documents("students", {"is_active": True})
```

### **Import Patterns**
```python
# Recommended import pattern
from database.operations import DatabaseOperations

# Alternative package-level import
from database import DatabaseOperations
```

## Integration Points

### **With Services**
- All services use DatabaseOperations for data persistence
- Services import: `from database.operations import DatabaseOperations`
- Provides consistent data access layer across all services

### **With Config**
- Uses `config.database.Database` for connection management
- Integrates with database configuration settings
- Handles connection pooling and management

### **With Utils**
- Used by utilities that need database access
- Provides standard database operations for utility functions
- Maintains consistency across all database interactions

## Error Handling

### **Connection Management**
```python
try:
    result = await DatabaseOperations.find_one("collection", query)
    if result is None:
        logger.warning("Document not found")
        return None
except Exception as e:
    logger.error(f"Database operation failed: {e}")
    raise
```

## Best Practices

### **Query Optimization**
- Use appropriate indexes for frequently queried fields
- Implement pagination for large result sets
- Use projection to limit returned fields when possible
- Optimize aggregation pipelines

### **Error Handling**
- Always wrap database operations in try-catch blocks
- Log errors with sufficient context for debugging
- Return meaningful error messages to calling code
- Implement retry logic for transient failures

### **Performance**
- Use connection pooling for optimal performance
- Implement proper timeout settings
- Monitor query performance and optimize as needed
- Use bulk operations for multiple document updates

---

*Last Updated: July 12, 2025*
*Moved from utils/database/ to backend/database/*
