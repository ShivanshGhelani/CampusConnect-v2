# Attendance Session Customization Guide
=======================================

## Overview

The CampusConnect Dynamic Attendance System now includes powerful customization capabilities that allow event organizers to modify auto-generated attendance sessions to match their specific event structure.

## Understanding Attendance Strategies

### 1. SINGLE_MARK ✅ (No customization needed)
- **Use Case**: Conferences, seminars, guest lectures, awards ceremonies
- **Logic**: One attendance mark = Present/Absent (100% required)
- **Examples**: 
  - "Industry Expert Guest Lecture"
  - "Convocation Ceremony"
  - "Blood Donation Camp"

### 2. DAY_BASED ✅ (Minimal customization)
- **Use Case**: Multi-day workshops, sports tournaments, training programs
- **Logic**: One mark per day, typically 75% of days required
- **Examples**:
  - "3-Day Python Workshop" (attend 2/3 days = Pass)
  - "Sports Week Tournament" (attend 3/4 days = Pass)

### 3. SESSION_BASED 🎯 (FULL CUSTOMIZATION AVAILABLE)
- **Use Case**: Competitions, hackathons with rounds/phases
- **Logic**: Multiple checkpoints during event, custom pass criteria
- **Examples**:
  - "RoboBattle Championship" (4 rounds: Preliminary → Round 2 → Round 3 → Final)
  - "Coding Competition" (3 rounds: Qualification → Semi-final → Final)
  - "Debate Tournament" (5 rounds based on elimination structure)

### 4. MILESTONE_BASED 🔧 (CUSTOMIZATION NEEDED)
- **Use Case**: Project exhibitions, cultural events with distinct phases
- **Logic**: Attendance at specific key phases/milestones
- **Examples**:
  - "Science Fair": Registration & Setup → Project Presentation → Judging → Awards
  - "Cultural Fest": Rehearsal → Soundcheck → Main Performance → Closing
  - **Pass Criteria**: Must attend critical milestones + 1 other

### 5. CONTINUOUS 📊 (For long-term tracking)
- **Use Case**: Semester projects, research programs, internships
- **Logic**: Regular progress checks over weeks/months
- **Examples**: "Final Year Project" with weekly reviews

## Your RoboBattle Championship Example

### Default Auto-Generation (Before Customization):
```
Event: RoboBattle Championship 2025 (31 hours)
Strategy: SESSION_BASED (Competition detected)

Auto-Generated Sessions:
1. Preliminary Round (7h 45m)
2. Round 2 (7h 45m) 
3. Round 3 (7h 45m)
4. Final Round (7h 45m)

Pass Criteria: 75% attendance (3/4 rounds)
```

### With Customization (What You Can Do):
```
Customize to Match Your Actual Structure:

Option A - More Rounds:
1. Registration & Robot Inspection (2h)
2. Qualification Round (4h)
3. Round of 16 (3h)
4. Quarter Finals (4h)
5. Semi Finals (4h)
6. Final Battle (3h)
7. Robo Soccer Exhibition (2h)

Option B - Fewer Rounds:
1. Qualification Round (12h)
2. Final Championship (12h)

Option C - Different Round Names:
1. "Bot Registration & Safety Check" (2h)
2. "Combat Arena Battles" (15h)
3. "Championship Finals" (8h)
4. "Victory Ceremony" (1h)
```

## Customization API Endpoints

### 1. Preview Auto-Generated Sessions
```http
GET /api/v1/attendance/customize/preview/{event_id}
```

**Response Example:**
```json
{
  "event_id": "ROBOCHAMP2025",
  "strategy": "session_based",
  "sessions": [
    {
      "session_id": "round_1",
      "session_name": "Preliminary Round",
      "start_time": "2025-10-22T10:00:00Z",
      "end_time": "2025-10-22T17:45:00Z",
      "is_mandatory": true,
      "weight": 0.8
    }
  ],
  "customization_options": {
    "can_add_sessions": true,
    "can_remove_sessions": true,
    "suggested_improvements": [
      "Consider adding more rounds if your competition has preliminary qualifiers",
      "You can rename rounds to match your competition structure"
    ]
  }
}
```

### 2. Bulk Customize Sessions
```http
PUT /api/v1/attendance/customize/sessions/{event_id}
```

**Request Example:**
```json
{
  "sessions": [
    {
      "session_id": "round_1",
      "session_name": "Robot Registration & Inspection",
      "start_time": "2025-10-22T09:00:00Z",
      "end_time": "2025-10-22T11:00:00Z",
      "is_mandatory": true,
      "weight": 0.5
    }
  ],
  "new_sessions": [
    {
      "session_name": "Robo Soccer Exhibition",
      "start_time": "2025-10-23T16:00:00Z", 
      "end_time": "2025-10-23T17:00:00Z",
      "is_mandatory": false,
      "weight": 0.3
    }
  ],
  "criteria_updates": {
    "minimum_percentage": 80
  }
}
```

### 3. Add Individual Session
```http
POST /api/v1/attendance/customize/sessions/{event_id}/add
```

### 4. Remove Session
```http
DELETE /api/v1/attendance/customize/sessions/{event_id}/{session_id}
```

### 5. Update Pass Criteria
```http
PATCH /api/v1/attendance/customize/criteria/{event_id}
```

## Frontend Interface

The React component (`AttendanceCustomization.jsx`) provides:

### Visual Session Editor
- **Drag & Drop Reordering**: Rearrange sessions
- **Inline Editing**: Click to edit session names, times
- **Duration Calculator**: Automatic duration display
- **Conflict Detection**: Warns about overlapping sessions

### Customization Features
- **Session Management**: Add, remove, rename sessions
- **Timing Adjustments**: Change start/end times with datetime picker
- **Weight Configuration**: Adjust importance of each session (0.1 - 2.0)
- **Mandatory Flags**: Mark sessions as optional/required
- **Pass Criteria**: Adjust percentage or required session count

### Smart Suggestions
- **Auto-Generated Tips**: Based on event type and current structure
- **Best Practices**: Guidance for optimal attendance tracking
- **Validation Warnings**: Prevent invalid configurations

## Best Practices

### For Competition Events (SESSION_BASED):
1. **Start with Registration**: Include setup/inspection sessions
2. **Weight Finals Higher**: Final rounds should have weight > 1.0
3. **Optional Exhibitions**: Mark non-competitive sessions as optional
4. **Reasonable Criteria**: 75-80% is typical for competitions

### For Workshop Events (DAY_BASED):
1. **Daily Consistency**: Keep sessions aligned with natural day breaks
2. **Flexible Attendance**: Allow missing 1 day for 3+ day events
3. **Practical Sessions**: Mark hands-on sessions as higher weight

### For Cultural Events (MILESTONE_BASED):
1. **Critical Phases**: Identify must-attend milestones (performance, judging)
2. **Preparation Phases**: Mark setup/rehearsal as lower weight
3. **Audience Engagement**: Include audience-facing events

## Integration with Event Creation

### In CreateEvent.jsx:
1. **Attendance Strategy Preview**: Shows auto-detected strategy
2. **Customize Button**: Direct link to customization interface
3. **Session Summary**: Quick overview of generated structure
4. **Real-time Updates**: Changes reflect in event creation flow

### Workflow:
```
1. Create Event → 2. Preview Attendance → 3. Customize (if needed) → 4. Finalize Event
```

## Example Customizations

### 1. Hackathon (36 hours):
```
Default: 4 equal sessions
Custom: 
- Registration & Team Formation (2h)
- Ideation & Planning (6h) 
- Development Sprint (24h) - Weight: 2.0
- Presentation & Judging (4h) - Weight: 1.5
```

### 2. Cultural Dance Competition:
```
Default: Day-based (3 days)
Custom: Milestone-based
- Auditions (Day 1) - Mandatory
- Rehearsals (Day 2) - Optional
- Semi-Finals (Day 3 Morning) - Mandatory
- Grand Finale (Day 3 Evening) - Mandatory, Weight: 2.0
```

### 3. Technical Workshop:
```
Default: 2-day workshop
Custom:
- Day 1: Theory & Concepts (6h)
- Day 1: Hands-on Lab (2h) - Weight: 1.5
- Day 2: Project Work (6h) - Weight: 2.0
- Day 2: Presentation (2h) - Weight: 1.5
```

## API Security & Permissions

- **Admin Only**: Only event organizers/admins can customize
- **Event Validation**: Changes validated against event constraints
- **Audit Trail**: All customizations logged for accountability
- **Rollback Support**: Can reset to auto-generated structure

## Error Handling

### Common Issues:
- **Session Overlap**: System prevents time conflicts
- **Minimum Sessions**: Must have at least 1 session
- **Invalid Weights**: Weight must be 0.1 - 2.0
- **Past Events**: Cannot modify sessions for completed events

### Validation Messages:
- ✅ "Session structure validated successfully"
- ⚠️ "Warning: Sessions overlap, please adjust timings"
- ❌ "Error: Cannot remove last remaining session"

---

This customization system makes the Dynamic Attendance System truly flexible while maintaining the intelligent auto-detection that makes it easy to use for standard events! 🎯
