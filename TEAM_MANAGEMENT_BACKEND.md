# Team Management Backend Architecture
## CampusConnect Enhanced Team Features

### Overview
This document outlines the backend architecture for team management features including task management, role assignments, team communication, and report generation.

## 🏗️ Architecture Overview

### Collections Used
1. **student_registrations** - Primary collection for team data
2. **students** - Individual student profiles with event participations
3. **events** - Event information and configurations
4. **team_invitations** - Team invitation management (existing)

### Data Flow
```
Frontend Team Management UI
    ↓ API Calls
Team Tools API (/api/v1/client/profile/team-tools/)
    ↓ Database Operations
student_registrations Collection (Enhanced)
    ↓ Student Profile Updates
students Collection (event_participations)
```

## 📊 Data Structure

### Enhanced student_registrations Collection

Each team registration document now includes:

```json
{
  "_id": "registration_id",
  "student": { /* Team leader info */ },
  "event": { /* Event info */ },
  "registration": { /* Registration details */ },
  "team": { /* Team info */ },
  "team_members": [ /* Enhanced team member data */ ],
  
  // NEW TEAM MANAGEMENT FIELDS
  "tasks": [
    {
      "task_id": "task_evt123_1672531200",
      "title": "Design Team Logo",
      "description": "Create a logo for our team presentation",
      "priority": "high",
      "deadline": "2024-01-15T10:00:00Z",
      "assigned_to": ["22BEIT30043", "22BEIT30044"],
      "category": "design",
      "status": "pending",
      "created_by": "22BEIT30001",
      "created_at": "2024-01-10T08:00:00Z",
      "updated_at": "2024-01-10T08:00:00Z",
      "completed_by": null,
      "completed_at": null,
      "reviews": []
    }
  ],
  
  "messages": [
    {
      "message_id": "msg_evt123_1672531200",
      "content": "Team meeting tomorrow at 3 PM!",
      "priority": "normal",
      "mentions": ["22BEIT30043"],
      "category": "announcement",
      "sent_by": "22BEIT30001",
      "sent_at": "2024-01-10T08:00:00Z",
      "read_by": ["22BEIT30001", "22BEIT30043"],
      "reactions": {
        "👍": ["22BEIT30043", "22BEIT30044"],
        "❤️": ["22BEIT30043"]
      },
      "replies": []
    }
  ],
  
  "team_roles": {
    "22BEIT30043": {
      "role": "Frontend Developer",
      "permissions": ["view", "edit_tasks", "post_messages"],
      "description": "Responsible for UI/UX development",
      "assigned_by": "22BEIT30001",
      "assigned_at": "2024-01-10T08:00:00Z"
    },
    "22BEIT30044": {
      "role": "Backend Developer", 
      "permissions": ["view", "edit_tasks"],
      "description": "Handles server-side development",
      "assigned_by": "22BEIT30001",
      "assigned_at": "2024-01-10T08:00:00Z"
    }
  }
}
```

### Enhanced students Collection

Each student's `event_participations` now includes team role data:

```json
{
  "enrollment_no": "22BEIT30043",
  "event_participations": [
    {
      "registration_id": "reg_123",
      "registration_type": "team_member",
      "team_name": "Tech Innovators",
      "team_registration_id": "team_reg_123",
      
      // NEW ROLE FIELDS
      "assigned_roles": ["Frontend Developer", "UI Designer"],
      "team_permissions": ["view", "edit_tasks", "post_messages"],
      "role_assigned_by": "22BEIT30001",
      "role_assigned_at": "2024-01-10T08:00:00Z"
    }
  ]
}
```

## 🔌 API Endpoints

### Base URL: `/api/v1/client/profile/team-tools/`

### Task Management
- **POST** `/create-task/{event_id}` - Create new task (team leader only)
- **GET** `/tasks/{event_id}` - Get team tasks (filtered by permissions)
- **PUT** `/task/{event_id}/{task_id}/complete` - Mark task as completed

### Role Assignment  
- **POST** `/assign-role/{event_id}` - Assign role to team member (team leader only)
- **GET** `/roles/{event_id}` - Get all team role assignments

### Team Communication
- **POST** `/post-message/{event_id}` - Post message to team board
- **GET** `/messages/{event_id}` - Get team messages (with pagination)

### Report Generation
- **POST** `/generate-report/{event_id}` - Generate team reports (team leader only)
- **GET** `/team-overview/{event_id}` - Get comprehensive team overview

## 🛡️ Security & Permissions

### Team Leadership Verification
```python
async def verify_team_leadership(event_id: str, student_enrollment: str) -> bool:
    """Verify if student is team leader for the event"""
    # Checks if student is the primary registrant for team registration
```

### Permission Levels
1. **Team Leader** - Full access (create/edit/delete all)
2. **Team Member** - Limited access based on assigned permissions
3. **View Only** - Read-only access to team data

### Permission Types
- `view` - Read team data
- `edit_tasks` - Modify task assignments  
- `post_messages` - Send team messages
- `assign_roles` - Assign roles to other members (leader only)
- `generate_reports` - Create team reports (leader only)

## 🔄 Business Logic Flow

### Task Creation Flow
1. **Verify Leadership** - Ensure only team leader can create tasks
2. **Validate Assignees** - Check all assigned members are in team
3. **Generate Task ID** - Create unique task identifier
4. **Update Registration** - Add task to team registration document
5. **Return Response** - Send created task data to frontend

### Message Posting Flow
1. **Verify Membership** - Ensure user is team member
2. **Process Mentions** - Validate mentioned users are team members
3. **Generate Message ID** - Create unique message identifier
4. **Update Read Status** - Mark sender as having read the message
5. **Store Message** - Add to team messages array
6. **Return Response** - Send posted message data

### Role Assignment Flow
1. **Verify Leadership** - Only team leader can assign roles
2. **Validate Member** - Ensure target member is in team
3. **Update Team Roles** - Store role assignment in registration
4. **Update Student Profile** - Update role info in student's event_participations
5. **Return Response** - Confirm role assignment

## 📈 Report Generation

### Report Types
1. **team_overview** - Complete team summary with members, tasks, messages
2. **task_summary** - Task statistics by priority, member, completion status
3. **communication_log** - Message timeline and participation metrics
4. **attendance_report** - Team attendance tracking (future enhancement)

### Report Formats
- **JSON** - Structured data for frontend display
- **CSV** - Tabular data for spreadsheet analysis
- **PDF** - Formatted document for printing (future enhancement)

## 🚀 Integration Points

### Frontend Integration
```javascript
// Task Management
clientAPI.createTask(eventId, taskData)
clientAPI.getTeamTasks(eventId, status)
clientAPI.completeTask(eventId, taskId, reviewData)

// Role Assignment
clientAPI.assignRole(eventId, roleData)
clientAPI.getTeamRoles(eventId)

// Communication
clientAPI.postMessage(eventId, messageData)
clientAPI.getTeamMessages(eventId, limit, skip)

// Reports
clientAPI.generateReport(eventId, reportData)
clientAPI.getTeamOverview(eventId)
```

### Database Operations
- Uses existing `DatabaseOperations` class for MongoDB interactions
- Implements proper error handling and logging
- Supports atomic updates for concurrent access

## ⚡ Performance Considerations

### Pagination
- Messages: 50 per page default
- Tasks: No pagination (typically small number per team)
- Reports: Generated on-demand, not cached

### Indexing Recommendations
```javascript
// Recommended MongoDB indexes
db.student_registrations.createIndex({"event.event_id": 1, "student.enrollment_no": 1})
db.student_registrations.createIndex({"event.event_id": 1, "registration.registration_type": 1})
db.student_registrations.createIndex({"team_members.student.enrollment_no": 1})
```

### Caching Strategy
- Team data cached in frontend state management
- Real-time updates through periodic polling
- Future: WebSocket integration for live updates

## 🔧 Future Enhancements

### Phase 2 Features
1. **Real-time Notifications** - WebSocket-based live updates
2. **File Sharing** - Attachment support for tasks and messages
3. **Calendar Integration** - Task deadlines in calendar view
4. **Advanced Analytics** - Team performance metrics
5. **External Integrations** - GitHub, Slack, etc.

### Scalability Considerations
1. **Message Archiving** - Move old messages to separate collection
2. **Task Templates** - Reusable task templates for common workflows
3. **Bulk Operations** - Mass task assignment and role updates
4. **Event Templates** - Team structure templates for recurring events

## 📝 Usage Examples

### Creating a Task
```python
# API Call
POST /api/v1/client/profile/team-tools/create-task/evt_123
{
  "title": "Prepare presentation slides",
  "description": "Create slides for final presentation",
  "priority": "high",
  "deadline": "2024-01-20T10:00:00Z",
  "assigned_to": ["22BEIT30043", "22BEIT30044"],
  "category": "presentation"
}

# Response
{
  "success": true,
  "message": "Task created successfully",
  "task": { /* created task object */ }
}
```

### Assigning Roles
```python
# API Call  
POST /api/v1/client/profile/team-tools/assign-role/evt_123
{
  "member_enrollment": "22BEIT30043",
  "role": "Frontend Developer",
  "permissions": ["view", "edit_tasks", "post_messages"],
  "description": "Lead frontend development"
}

# Response
{
  "success": true,
  "message": "Role 'Frontend Developer' assigned successfully",
  "assignment": { /* role assignment object */ }
}
```

## 🎯 Implementation Status

### ✅ Completed
- [x] API endpoint structure
- [x] Database schema design
- [x] Authentication and authorization
- [x] Basic CRUD operations for tasks, roles, messages
- [x] Report generation framework
- [x] Frontend API integration

### 🚧 In Progress
- [ ] Frontend modal implementations
- [ ] Real-time message updates
- [ ] Advanced report formatting

### 📋 Todo
- [ ] File attachment support
- [ ] Advanced notification system
- [ ] Performance optimization
- [ ] Comprehensive testing

This architecture provides a solid foundation for team management features while maintaining compatibility with the existing event registration system.
