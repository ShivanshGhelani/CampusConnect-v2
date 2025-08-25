# Event Scheduler Synchronization Bug Analysis

## Issue Summary
The event scheduling system is not updating when events are created, updated, or modified. New events only appear in the scheduler queue after server restart, and event modifications don't trigger scheduler updates. Only event deletion properly removes events from the scheduler.

## Root Cause Analysis

### 🚨 **Primary Issues Identified:**

#### 1. **Backend API Endpoints Missing Scheduler Integration**
**Location:** `backend/api/v1/admin/events/__init__.py`
- **Create Event Endpoint (`/create`):** No call to `add_event_to_scheduler()`
- **Update Event Endpoint (`/update/{event_id}`):** No call to `update_event_in_scheduler()`
- **Delete Event Endpoint (`/delete/{event_id}`):** ✅ Correctly calls `remove_event_from_scheduler()`

#### 2. **Frontend Components Missing Scheduler Integration**
**Location:** `frontend/src/pages/admin/`
- **CreateEvent.jsx:** No call to `addEventToScheduler()` after successful creation
- **EditEvent.jsx:** No call to `updateEventInScheduler()` after successful update
- **EventDetail.jsx:** ✅ Deletion works correctly via backend

#### 3. **Scheduler Functions Exist But Are Not Called**
**Backend Functions Available:**
```python
# Available in backend/utils/dynamic_event_scheduler.py
async def add_event_to_scheduler(event: Dict[str, Any])
async def update_event_in_scheduler(event_id: str, updated_event: Dict[str, Any])
async def remove_event_from_scheduler(event_id: str)  # ✅ Used correctly
```

**Frontend Functions Available:**
```javascript
// Available in frontend/src/utils/eventSchedulerUtils.js
export const addEventToScheduler = (event) => {...}
export const updateEventInScheduler = (eventId, updatedEvent) => {...}
export const removeEventFromScheduler = (eventId) => {...}  // Not used but backend handles it
```

## Impact Assessment

### **Current Behavior:**
1. ❌ **Event Creation:** New events don't appear in scheduler queue until server restart
2. ❌ **Event Updates:** Modified events keep old scheduling triggers
3. ✅ **Event Deletion:** Correctly removes from scheduler queue
4. ❌ **Status Updates:** Events with changed dates/times don't update their triggers

### **Expected Behavior:**
1. ✅ Event creation should immediately add triggers to scheduler
2. ✅ Event updates should refresh triggers with new dates/times
3. ✅ Event deletion should remove all triggers (working)
4. ✅ Real-time status updates should work correctly

## Technical Details

### **Backend Scheduler Architecture:**
- `DynamicEventScheduler` class maintains a priority queue of triggers
- Triggers are created for: registration_open, registration_close, event_start, event_end, certificate_start, certificate_end
- Queue is sorted by trigger time for efficient processing
- Only reloads from database on server restart

### **Frontend Scheduler Architecture:**
- `ClientEventScheduler` class mirrors backend functionality
- Maintains local event cache and trigger queue
- Processes triggers every 10 seconds
- Should sync with backend scheduler state

### **Missing Integration Points:**

#### Backend:
```python
# Missing in create_event():
await add_event_to_scheduler(event_doc)

# Missing in update_event():  
await update_event_in_scheduler(event_id, updated_event)
```

#### Frontend:
```javascript
// Missing in CreateEvent.jsx after successful creation:
import { addEventToScheduler } from '../utils/eventSchedulerUtils';
addEventToScheduler(newEvent);

// Missing in EditEvent.jsx after successful update:
import { updateEventInScheduler } from '../utils/eventSchedulerUtils';  
updateEventInScheduler(eventId, updatedEvent);
```

## Affected Files

### **Backend Files:**
- `backend/api/v1/admin/events/__init__.py` - Missing scheduler calls
- `backend/utils/dynamic_event_scheduler.py` - Functions exist but not used
- `backend/utils/event_status_manager.py` - Simple status manager, no scheduler integration

### **Frontend Files:**
- `frontend/src/pages/admin/CreateEvent.jsx` - Missing scheduler call after creation
- `frontend/src/pages/admin/EditEvent.jsx` - Missing scheduler call after update
- `frontend/src/utils/eventSchedulerUtils.js` - Functions exist but not imported/used

## Solution Requirements

### **Backend Changes Needed:**
1. Add `await add_event_to_scheduler(event_doc)` in create event endpoint
2. Add `await update_event_in_scheduler(event_id, updated_event)` in update event endpoint
3. Ensure proper error handling for scheduler operations

### **Frontend Changes Needed:**
1. Import and call `addEventToScheduler()` in CreateEvent.jsx after successful creation
2. Import and call `updateEventInScheduler()` in EditEvent.jsx after successful update
3. Handle scheduler errors gracefully

### **Testing Requirements:**
1. Verify new events appear in scheduler queue immediately
2. Verify updated events refresh their triggers
3. Verify scheduler queue maintains correct order
4. Test error scenarios (scheduler failures, invalid dates)

## Priority Level: HIGH
This bug affects real-time event status updates and could cause events to not trigger status changes at the correct times, impacting registration windows, event notifications, and certificate availability.
