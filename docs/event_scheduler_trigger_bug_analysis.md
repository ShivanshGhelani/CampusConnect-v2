# Event Scheduler Trigger Bug Analysis

## Issue Summary

**Bug**: Event triggers are being added to the scheduler queue immediately upon event creation, even when events require approval. This is incorrect because unapproved events should not have active triggers.

**Impact**: 
- Unapproved events are getting status updates from the scheduler
- Trigger queue contains triggers for events that may never be approved
- System resources are wasted on events that might be declined

## Current Problematic Behavior

### Backend (`backend/api/v1/admin/events/__init__.py`)
```python
# Lines 547-552: INCORRECT - Always adds to scheduler
try:
    await add_event_to_scheduler(event_doc)
    logger.info(f"✅ Added event {event_data.event_id} to scheduler")
except Exception as scheduler_error:
    logger.warning(f"⚠️ Failed to add event to scheduler: {scheduler_error}")
```

### Frontend (`frontend/src/pages/admin/CreateEvent.jsx`)
```javascript
// Lines 1937-1943: INCORRECT - Always adds to client scheduler
try {
  addEventToScheduler(eventData);
  console.log('✅ Added event to client scheduler');
} catch (schedulerError) {
  console.warn('⚠️ Failed to add event to client scheduler:', schedulerError);
}
```

### Approval Process (`backend/api/v1/admin/events/approval.py`)
```python
# MISSING: No trigger addition when event is approved
# Should add triggers here when event status changes from pending to approved
```

## Expected Correct Behavior

### Role-Based Event Creation:

1. **Executive Admin**:
   - Creates event with `approval_required = true`
   - Event status: `pending_approval`
   - **Should NOT add triggers to scheduler**
   - Triggers added only after approval

2. **Super Admin / Organizer Admin**:
   - Creates event with `approval_required = false`
   - Event status: `upcoming` (approved immediately)
   - **Should add triggers to scheduler immediately**

3. **Event Approval**:
   - When event is approved: **Add triggers to scheduler**
   - When event is declined: **Remove from database, no triggers**

## Files That Need Changes

### Backend Files:
1. `backend/api/v1/admin/events/__init__.py` - Event creation logic
2. `backend/api/v1/admin/events/approval.py` - Approval process
3. `backend/utils/dynamic_event_scheduler.py` - Scheduler functions
4. `backend/utils/event_status_manager.py` - Status management

### Frontend Files:
1. `frontend/src/pages/admin/CreateEvent.jsx` - Event creation
2. `frontend/src/utils/eventSchedulerUtils.js` - Client scheduler
3. `frontend/src/api/admin.js` - API calls

## Test Scenarios to Verify

### Scenario 1: Executive Admin Creates Event
- **Action**: Executive admin creates an event
- **Expected**: Event saved with `pending_approval` status, NO triggers added
- **Verify**: Check scheduler queue is empty for this event

### Scenario 2: Super Admin Creates Event  
- **Action**: Super admin creates an event
- **Expected**: Event saved with `upcoming` status, triggers added immediately
- **Verify**: Check scheduler queue contains triggers for this event

### Scenario 3: Event Approval
- **Action**: Super admin approves a pending event
- **Expected**: Event status changes to `upcoming`, triggers added to scheduler
- **Verify**: Check scheduler queue now contains triggers for approved event

### Scenario 4: Event Decline
- **Action**: Super admin declines a pending event
- **Expected**: Event deleted, no triggers added
- **Verify**: Event not in database, no triggers in scheduler

## Implementation Plan

### Phase 1: Create Tests
1. Create test script to verify current broken behavior
2. Create test data for all scenarios
3. Document current trigger counts

### Phase 2: Fix Backend
1. Modify event creation to check approval status before adding triggers
2. Add trigger creation to approval process
3. Ensure decline process doesn't add triggers

### Phase 3: Fix Frontend
1. Modify client scheduler to respect approval status
2. Update event creation flow
3. Handle approval/decline responses

### Phase 4: Verify Fix
1. Run tests to ensure triggers are only added when appropriate
2. Clean up any existing incorrect triggers
3. Document new behavior

## Success Criteria

✅ Executive admin events do NOT get triggers until approved
✅ Super admin events get triggers immediately  
✅ Approved events get triggers added at approval time
✅ Declined events never get triggers
✅ Scheduler queue only contains triggers for approved events
✅ No resource waste on unapproved events
