# Quick Start: Testing Dynamic Attendance Portal Integration

## Prerequisites
- Backend server running on `localhost:8000`
- Frontend development server running
- Admin authentication token
- Test event with registrations

## Step 1: Test API Compatibility

### Run Backend Migration Test
```bash
cd backend
python scripts/test_api_migration.py [EVENT_ID] [AUTH_TOKEN]
```

**Example:**
```bash
python scripts/test_api_migration.py EVT_123456 eyJ0eXAiOiJKV1Q...
```

**Expected Output:**
```
🔄 Starting Migration Compatibility Test for Event: EVT_123456
============================================================

🔍 Testing Old API Endpoints...
✅ PASS Old API: Get Registrations
    Found 15 registrations
✅ PASS Old API: Get Attendance Stats

🚀 Testing New Dynamic API Endpoints...
✅ PASS New API: Get Configuration
    Strategy: session_based, Sessions: 3
✅ PASS New API: Get Active Sessions
    Active: 1, Upcoming: 2
✅ PASS New API: Get Analytics
    Registered: 15, Sessions: 3

🎯 Testing Attendance Marking Compatibility...
✅ PASS New API: Mark Attendance
    Marked for Session 1, ID: ATT_789

📊 Comparing Data Consistency...
✅ PASS Data Consistency: Registration Count
    Both systems show 15 registrations
✅ PASS Strategy Analysis
    Detected strategy: session_based with 3 sessions

============================================================
📋 Migration Test Summary
============================================================
Total Tests: 8
Passed: 8
Failed: 0
Success Rate: 100.0%

🎉 Migration compatibility: EXCELLENT
💾 Detailed report saved to: attendance_api_migration_report.json
```

## Step 2: Test Frontend Integration

### Run Frontend Debug Script
```bash
cd frontend
node scripts/debug_attendance_portal.js [EVENT_ID]
```

**Interactive Mode:**
```bash
node scripts/debug_attendance_portal.js
```

**Example Session:**
```
🔧 Dynamic Attendance Portal Interactive Debugger
==================================================

Enter Event ID to debug: EVT_123456

🎯 Debugging Event: EVT_123456

📋 Debug Options:
   1. Full Debug (All Tests)
   2. Event Configuration Only
   3. Active Sessions Only
   4. Student Registrations Only
   5. Analytics Only
   6. Test Attendance Marking
   7. API Compatibility Check
   8. Exit

Select option (1-8): 1

============================================================
🔍 Debugging Event Configuration for: EVT_123456
==================================================

1. Checking Event Existence...
🌐 GET /api/v1/admin/events/EVT_123456
✅ Success (200)
📅 Event: Annual Tech Symposium
📝 Type: symposium
⏰ Duration: 2024-08-20 to 2024-08-22

2. Checking Attendance Configuration...
🌐 GET /api/v1/attendance/config/EVT_123456
✅ Success (200)
🎯 Strategy: session_based
📊 Sessions: 3
🤖 Auto-generated: true

📋 Session Details:
   1. Opening Ceremony
      Type: session
      Status: completed
      Time: 2024-08-20T09:00:00Z - 2024-08-20T10:00:00Z
      Mandatory: Yes
   2. Technical Presentations
      Type: session
      Status: active
      Time: 2024-08-20T10:30:00Z - 2024-08-20T16:00:00Z
      Mandatory: Yes
   3. Closing Ceremony
      Type: session
      Status: pending
      Time: 2024-08-20T16:30:00Z - 2024-08-20T17:30:00Z
      Mandatory: Yes
```

## Step 3: Test Strategy-Specific Interfaces

### Test Different Event Types

#### 1. Single Mark Event (Conference/Seminar)
```bash
# Create or find a conference event
python scripts/test_api_migration.py CONF_123 [AUTH_TOKEN]
```
**Expected Strategy:** `single_mark`

#### 2. Session-Based Event (Hackathon/Competition)
```bash
# Create or find a hackathon event
python scripts/test_api_migration.py HACK_456 [AUTH_TOKEN]
```
**Expected Strategy:** `session_based`

#### 3. Day-Based Event (Workshop/Training)
```bash
# Create or find a multi-day workshop
python scripts/test_api_migration.py WORK_789 [AUTH_TOKEN]
```
**Expected Strategy:** `day_based`

## Step 4: Manual Portal Testing

### Test Current Portal vs. New Portal

#### Access Current Portal
```
http://localhost:3000/admin/events/[EVENT_ID]/attendance
```

**Checklist:**
- [ ] Portal loads successfully
- [ ] Student list displays correctly
- [ ] Attendance marking works
- [ ] Statistics show accurate data

#### Test New Portal Component
```bash
# Copy the new portal component
cp frontend/scripts/DynamicAttendancePortal.jsx \
   src/components/admin/attendance/DynamicAttendancePortal.jsx

# Update route temporarily for testing
# In src/routes/index.jsx, import and use DynamicAttendancePortal
```

**Checklist:**
- [ ] Strategy detection works
- [ ] Session management displays
- [ ] Real-time updates function
- [ ] Attendance marking via new APIs
- [ ] Strategy-specific interfaces render

## Step 5: Performance Testing

### Test Portal Load Times
```javascript
// In browser console
console.time('Portal Load');
// Navigate to attendance portal
console.timeEnd('Portal Load');
// Should be < 2 seconds
```

### Test API Response Times
```bash
# Test with curl for quick timing
curl -w "@curl-format.txt" \
     -H "Authorization: Bearer [TOKEN]" \
     http://localhost:8000/api/v1/attendance/config/[EVENT_ID]
```

Create `curl-format.txt`:
```
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
```

## Step 6: Error Scenario Testing

### Test Error Handling

#### 1. Invalid Event ID
```bash
python scripts/test_api_migration.py INVALID_EVENT [AUTH_TOKEN]
```
**Expected:** Graceful error handling

#### 2. No Authentication
```bash
python scripts/test_api_migration.py EVT_123456
```
**Expected:** Auth error with helpful message

#### 3. Network Issues
```bash
# Stop backend server and test
python scripts/test_api_migration.py EVT_123456 [AUTH_TOKEN]
```
**Expected:** Network error handling

## Step 7: Data Consistency Verification

### Compare Old vs New Data
```sql
-- Check registration counts
SELECT COUNT(*) FROM student_event_participations WHERE event_id = 'EVT_123456';
SELECT COUNT(*) FROM student_registrations WHERE "event.event_id" = 'EVT_123456';

-- Check attendance records
SELECT * FROM student_attendance_records WHERE event_id = 'EVT_123456' LIMIT 5;
```

### Verify Strategy Detection
```bash
# Test strategy detection accuracy
python -c "
import requests
events = ['EVT_123', 'HACK_456', 'CONF_789', 'WORK_101']
for event in events:
    resp = requests.get(f'http://localhost:8000/api/v1/attendance/config/{event}')
    print(f'{event}: {resp.json().get(\"data\", {}).get(\"strategy\", \"unknown\")}')
"
```

## Troubleshooting Common Issues

### Issue 1: Strategy Not Detected
**Symptoms:** Portal shows single-mark for multi-session events
**Debug Steps:**
```bash
# Check event metadata
curl -H "Authorization: Bearer [TOKEN]" \
     http://localhost:8000/api/v1/admin/events/[EVENT_ID]

# Initialize attendance config
curl -X POST \
     -H "Authorization: Bearer [TOKEN]" \
     http://localhost:8000/api/v1/attendance/initialize/[EVENT_ID]
```

### Issue 2: Session Times Incorrect
**Symptoms:** Sessions show wrong status or timing
**Debug Steps:**
```bash
# Check server time
date
curl http://localhost:8000/api/v1/system/time

# Check session configuration
curl -H "Authorization: Bearer [TOKEN]" \
     http://localhost:8000/api/v1/attendance/sessions/[EVENT_ID]/active
```

### Issue 3: Attendance Marking Fails
**Symptoms:** Error when marking attendance
**Debug Steps:**
```bash
# Test with debug script
node scripts/debug_attendance_portal.js [EVENT_ID]
# Select option 6: Test Attendance Marking

# Check student enrollment exists
curl -H "Authorization: Bearer [TOKEN]" \
     "http://localhost:8000/api/v1/admin/event-registration/event/[EVENT_ID]"
```

## Expected Test Results

### Successful Migration Indicators
- [ ] ✅ API compatibility test shows 90%+ success rate
- [ ] ✅ Strategy detection works for different event types
- [ ] ✅ Session management displays correct timing
- [ ] ✅ Attendance marking works via new APIs
- [ ] ✅ Data consistency maintained between systems
- [ ] ✅ Performance meets requirements (< 2s load, < 500ms API)

### Ready for Production Indicators
- [ ] ✅ All test scenarios pass
- [ ] ✅ Error handling works gracefully
- [ ] ✅ Real-time updates function correctly
- [ ] ✅ Strategy-specific interfaces render properly
- [ ] ✅ No breaking changes for existing events

## Quick Commands Reference

```bash
# Backend tests
python scripts/test_api_migration.py [EVENT_ID] [TOKEN]

# Frontend debug
node scripts/debug_attendance_portal.js [EVENT_ID]

# API testing
curl -H "Authorization: Bearer [TOKEN]" \
     http://localhost:8000/api/v1/attendance/config/[EVENT_ID]

# Portal access
http://localhost:3000/admin/events/[EVENT_ID]/attendance

# Performance test
curl -w "@curl-format.txt" [API_ENDPOINT]
```

## Next Steps After Testing

1. **If Tests Pass**: Proceed with migration implementation
2. **If Tests Fail**: Review issues and update implementation
3. **Performance Issues**: Optimize problematic components
4. **Data Inconsistencies**: Review database migration scripts
5. **Strategy Issues**: Update event type detection logic

The testing process validates that the dynamic attendance system integration will work correctly and maintains backward compatibility while adding powerful new features.
