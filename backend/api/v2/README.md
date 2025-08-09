# 🚀 CAMPUSCONNECT GRAPHQL API V2 - COMPLETE IMPLEMENTATION

## 📋 **OVERVIEW**

This is a **complete GraphQL API v2 implementation** for CampusConnect, built alongside your existing REST API. It provides a modern, efficient alternative to REST endpoints with powerful query capabilities, real-time subscriptions, and type safety.

---

## 🏗️ **ARCHITECTURE**

```
api/v2/
├── __init__.py              # Package initialization
├── schema.py                # GraphQL type definitions and input types
├── resolvers.py             # Query and Mutation implementations
├── subscriptions.py         # Real-time WebSocket subscriptions
├── context.py               # Authentication and context management
├── router.py                # FastAPI integration
├── requirements.txt         # Dependencies needed
└── README.md               # This documentation
```

---

## 🔧 **INSTALLATION INSTRUCTIONS**

### **Step 1: Install Dependencies**
```bash
# Navigate to backend directory
cd s:\Projects\ClgCerti\CampusConnect\backend

# Install GraphQL dependencies
pip install strawberry-graphql[fastapi]==0.206.0
pip install graphql-core==3.2.3
pip install websockets==11.0.3
pip install PyJWT==2.8.0

# Or install from requirements file
pip install -r api/v2/requirements.txt
```

### **Step 2: Integrate with Main Application**
Add to your `main.py`:

```python
# Add this import
from api.v2.router import router as graphql_v2_router

# Add this after existing router includes
app.include_router(graphql_v2_router)  # GraphQL API v2
```

### **Step 3: Start Server**
```bash
# Start with WebSocket support
uvicorn main:app --reload --ws-ping-interval 20 --ws-ping-timeout 20
```

---

## 🎯 **API ENDPOINTS**

### **Primary GraphQL Endpoint**
- **URL**: `http://localhost:8000/api/v2/graphql`
- **Method**: POST (queries/mutations), GET (introspection)
- **Content-Type**: `application/json`

### **Development Interface**
- **GraphiQL**: `http://localhost:8000/api/v2/graphql` (browser interface)
- **Health Check**: `http://localhost:8000/api/v2/health`
- **Schema**: `http://localhost:8000/api/v2/schema`

### **WebSocket Subscriptions**
- **URL**: `ws://localhost:8000/api/v2/graphql`
- **Protocol**: GraphQL WebSocket Protocol

---

## 📚 **USAGE EXAMPLES**

### **1. Authentication Queries**

```graphql
# Check authentication status
query AuthStatus {
  authStatus {
    success
    message
    user {
      userType
      fullName
      email
      department
    }
  }
}

# Universal login
mutation Login {
  login(credentials: {
    enrollmentNo: "22CS12345"
    password: "your_password"
    rememberMe: true
  }) {
    success
    message
    user {
      enrollmentNo
      fullName
      userType
    }
    authType
    expiresIn
  }
}
```

### **2. Event Operations**

```graphql
# Get events with filtering
query GetEvents {
  events(
    filters: {
      status: REGISTRATION_OPEN
      department: "Computer Science"
    }
    page: 1
    limit: 10
  ) {
    events {
      eventId
      eventName
      shortDescription
      startDate
      venue
      registrationMode
      maxParticipants
    }
    totalCount
    hasNext
  }
}

# Get single event details
query GetEvent {
  event(eventId: "EVENT-001") {
    eventId
    eventName
    detailedDescription
    facultyOrganizers
    registrationStartDate
    registrationEndDate
    mode
    status
  }
}

# Create new event (Admin only)
mutation CreateEvent {
  createEvent(eventData: {
    eventId: "EVENT-NEW-001"
    eventName: "GraphQL Workshop"
    eventType: "Workshop"
    organizingDepartment: "Computer Science"
    shortDescription: "Learn GraphQL basics"
    detailedDescription: "Comprehensive GraphQL workshop..."
    startDate: "2025-08-15"
    startTime: "10:00"
    endDate: "2025-08-15"
    endTime: "16:00"
    venue: "Lab 1"
    mode: OFFLINE
    status: "active"
    targetAudience: ["Students", "Faculty"]
    facultyOrganizers: ["EMP001"]
    contacts: ["contact@college.edu"]
    registrationStartDate: "2025-08-10"
    registrationEndDate: "2025-08-14"
    certificateEndDate: "2025-08-20"
    registrationMode: INDIVIDUAL
    maxParticipants: 50
    registrationType: "free"
  }) {
    success
    message
    data
  }
}
```

### **3. Registration Operations**

```graphql
# Individual registration
mutation RegisterIndividual {
  registerIndividual(registrationData: {
    eventId: "EVENT-001"
    additionalFields: "{ \"dietary_preference\": \"vegetarian\" }"
  }) {
    success
    message
    registrationId
    eventId
  }
}

# Team registration
mutation RegisterTeam {
  registerTeam(registrationData: {
    eventId: "EVENT-002"
    teamName: "Code Warriors"
    teamMembers: [
      {
        enrollmentNo: "22CS12345"
        fullName: "John Doe"
        email: "john@college.edu"
        department: "Computer Science"
      },
      {
        enrollmentNo: "22CS12346"
        fullName: "Jane Smith"
        email: "jane@college.edu"
        department: "Computer Science"
      }
    ]
  }) {
    success
    message
    registrationId
  }
}

# Check registration status
query RegistrationStatus {
  registrationStatus(eventId: "EVENT-001") {
    registrationId
    eventId
    registrationType
    attendanceMarked
    certificateGenerated
  }
}

# Get my registrations
query MyRegistrations {
  myRegistrations {
    registrationId
    eventId
    registrationType
    teamName
    registrationDate
    attendanceMarked
  }
}
```

### **4. Admin Operations**

```graphql
# Get event statistics
query EventStats {
  eventStatistics(eventId: "EVENT-001") {
    totalRegistrations
    individualRegistrations
    teamRegistrations
    totalParticipants
    attendanceMarked
    certificatesGenerated
    averageRating
  }
}

# Admin dashboard
query AdminDashboard {
  adminDashboard {
    totalEvents
    activeEvents
    totalRegistrations
    pendingApprovals
    certificatesGenerated
  }
}

# Delete event (Executive Admin+)
mutation DeleteEvent {
  deleteEvent(eventId: "EVENT-OLD-001") {
    success
    message
  }
}
```

### **5. Certificate Operations**

```graphql
# Get certificate data
query CertificateData {
  certificateData(eventId: "EVENT-001") {
    studentName
    enrollmentNo
    department
    eventName
    eventDate
    certificateId
    teamName
  }
}

# Send certificate email
mutation SendCertificate {
  sendCertificateEmail(certificateData: {
    eventId: "EVENT-001"
    enrollmentNo: "22CS12345"
    pdfBase64: "base64_encoded_pdf_data..."
    fileName: "certificate_EVENT-001_22CS12345.pdf"
  }) {
    success
    message
  }
}
```

### **6. Real-time Subscriptions**

```graphql
# Subscribe to event updates
subscription EventUpdates {
  eventUpdates(eventId: "EVENT-001")
}

# Subscribe to registration notifications (Admin)
subscription RegistrationNotifications {
  registrationNotifications
}

# Subscribe to certificate generation status
subscription CertificateStatus {
  certificateGenerationStatus(eventId: "EVENT-001")
}

# Subscribe to system notifications
subscription SystemNotifications {
  systemNotifications
}
```

---

## 🔐 **AUTHENTICATION**

### **Session-based (Current System)**
```javascript
// No additional headers needed - uses existing session cookies
fetch('/api/v2/graphql', {
  method: 'POST',
  credentials: 'include',  // Include cookies
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: '{ authStatus { success user { fullName } } }'
  })
});
```

### **Token-based (Future)**
```javascript
// Include JWT token in Authorization header
fetch('/api/v2/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_jwt_token_here'
  },
  body: JSON.stringify({
    query: '{ authStatus { success user { fullName } } }'
  })
});
```

---

## ⚡ **PERFORMANCE ADVANTAGES**

### **1. Efficient Data Fetching**
```graphql
# Get only the data you need
query OptimizedEventList {
  events(limit: 5) {
    events {
      eventId
      eventName
      startDate      # Only these 3 fields returned
    }
  }
}
```

### **2. Single Request for Complex Data**
```graphql
# Get user + registrations + events in one request
query UserDashboard {
  authStatus {
    user {
      fullName
      department
    }
  }
  myRegistrations {
    eventId
    registrationDate
  }
  events(filters: { status: REGISTRATION_OPEN }, limit: 3) {
    events {
      eventName
      registrationEndDate
    }
  }
}
```

### **3. Real-time Updates**
```graphql
# WebSocket subscription for live updates
subscription LiveEventData {
  eventUpdates(eventId: "EVENT-001")
}
```

---

## 🛠️ **DEVELOPMENT TOOLS**

### **GraphiQL Interface**
1. Navigate to `http://localhost:8000/api/v2/graphql`
2. Use the built-in query explorer
3. Auto-completion and documentation
4. Real-time query testing

### **Schema Introspection**
```graphql
# Get full schema information
query IntrospectionQuery {
  __schema {
    types {
      name
      description
      fields {
        name
        type {
          name
        }
      }
    }
  }
}
```

---

## 🔍 **ERROR HANDLING**

### **GraphQL Error Format**
```json
{
  "data": null,
  "errors": [
    {
      "message": "Student authentication required",
      "locations": [{"line": 2, "column": 3}],
      "path": ["registrationStatus"]
    }
  ]
}
```

### **Success Response Format**
```json
{
  "data": {
    "events": {
      "events": [...],
      "totalCount": 25,
      "hasNext": true
    }
  }
}
```

---

## 🚀 **PRODUCTION DEPLOYMENT**

### **Environment Variables**
```bash
# Add to your .env file
GRAPHQL_PLAYGROUND_ENABLED=false  # Disable in production
GRAPHQL_INTROSPECTION_ENABLED=false  # Disable in production
JWT_SECRET_KEY=your_production_secret
WEBSOCKET_PING_INTERVAL=30
WEBSOCKET_TIMEOUT=300
```

### **Security Considerations**
1. **Disable introspection** in production
2. **Implement query depth limiting**
3. **Add rate limiting** for GraphQL endpoints
4. **Validate query complexity**
5. **Use HTTPS** for all connections

---

## 📊 **MIGRATION FROM REST TO GRAPHQL**

### **Gradual Migration Strategy**
1. **Phase 1**: Use GraphQL for new features
2. **Phase 2**: Migrate read-only operations
3. **Phase 3**: Migrate write operations
4. **Phase 4**: Deprecate REST endpoints

### **Side-by-side Comparison**

| REST API | GraphQL API |
|----------|-------------|
| `GET /api/v1/client/events/list` | `query { events { events { ... } } }` |
| `POST /api/v1/client/registration/individual` | `mutation { registerIndividual(...) }` |
| `GET /api/v1/admin/events/stats` | `query { eventStatistics(...) }` |

---

## 🎯 **FUTURE ENHANCEMENTS**

### **Planned Features**
1. **Query Caching** - Redis-based query result caching
2. **DataLoader** - Batch and cache database queries
3. **Federation** - Split schema across microservices
4. **Persisted Queries** - Pre-approved query optimization
5. **Custom Scalars** - Date, Email, URL validation

### **Advanced Subscriptions**
1. **Filtered Subscriptions** - Subscribe to specific events
2. **User-specific Notifications** - Personalized updates
3. **Real-time Analytics** - Live dashboard updates

---

## ✅ **TESTING**

### **Query Testing**
```bash
# Test health endpoint
curl http://localhost:8000/api/v2/health

# Test GraphQL query
curl -X POST http://localhost:8000/api/v2/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ hello }"}'
```

### **WebSocket Testing**
```javascript
// Test WebSocket connection
const ws = new WebSocket('ws://localhost:8000/api/v2/graphql', 'graphql-ws');
ws.onopen = () => console.log('GraphQL WebSocket connected');
```

---

## 🏆 **BENEFITS OVER REST API**

### **1. Efficiency**
- **Single endpoint** for all operations
- **Exact data fetching** - no over/under-fetching
- **Reduced network requests** - combine multiple operations

### **2. Type Safety**
- **Strong typing** with schema validation
- **Auto-generated documentation** from schema
- **Client-side type generation** possible

### **3. Real-time Features**
- **WebSocket subscriptions** for live updates
- **Event-driven architecture** support
- **Real-time collaboration** capabilities

### **4. Developer Experience**
- **GraphiQL interface** for API exploration
- **Introspection** for schema discovery
- **Better tooling** and IDE support

---

## 📝 **CONCLUSION**

This GraphQL API v2 implementation provides:

✅ **Complete feature parity** with REST API  
✅ **Enhanced query capabilities** and flexibility  
✅ **Real-time subscriptions** for modern UX  
✅ **Type-safe operations** with validation  
✅ **Future-proof architecture** for scaling  

**Ready for production use** alongside your existing REST API! 🚀

The implementation is **backward compatible** and doesn't affect your current system. You can gradually migrate features to GraphQL as needed while maintaining full REST API functionality.
