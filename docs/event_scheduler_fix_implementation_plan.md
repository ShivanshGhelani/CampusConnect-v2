# Event Scheduler Trigger Bug Fix Implementation Plan

## Overview
This document outlines the specific changes needed to fix the bug where event triggers are added to the scheduler queue immediately upon creation, even for events that require approval.

## Changes Required

### 1. Backend Event Creation (`backend/api/v1/admin/events/__init__.py`)

**Current Problem (Lines 547-552):**
```python
# Add event to scheduler for real-time status updates
try:
    await add_event_to_scheduler(event_doc)
    logger.info(f"✅ Added event {event_data.event_id} to scheduler")
except Exception as scheduler_error:
    logger.warning(f"⚠️ Failed to add event to scheduler: {scheduler_error}")
    # Don't fail event creation if scheduler fails
```

**Fix Required:**
```python
# Add event to scheduler only if no approval required
if not event_data.approval_required:
    try:
        await add_event_to_scheduler(event_doc)
        logger.info(f"✅ Added event {event_data.event_id} to scheduler (no approval required)")
    except Exception as scheduler_error:
        logger.warning(f"⚠️ Failed to add event to scheduler: {scheduler_error}")
        # Don't fail event creation if scheduler fails
else:
    logger.info(f"⏸️ Event {event_data.event_id} requires approval - not adding to scheduler yet")
```

### 2. Backend Event Approval (`backend/api/v1/admin/events/approval.py`)

**Current Problem:**
No trigger addition when event is approved.

**Fix Required (After line 91):**
```python
# Add approved event to scheduler
try:
    # Get the updated event data
    updated_event = await db.events.find_one({"event_id": event_id})
    if updated_event:
        from utils.dynamic_event_scheduler import add_event_to_scheduler
        await add_event_to_scheduler(updated_event)
        logger.info(f"✅ Added approved event {event_id} to scheduler")
except Exception as scheduler_error:
    logger.warning(f"⚠️ Failed to add approved event to scheduler: {scheduler_error}")
    # Don't fail the approval if scheduler fails
```

### 3. Frontend Event Creation (`frontend/src/pages/admin/CreateEvent.jsx`)

**Current Problem (Lines 1937-1943):**
```javascript
// Add event to client-side scheduler
try {
  addEventToScheduler(eventData);
  console.log('✅ Added event to client scheduler');
} catch (schedulerError) {
  console.warn('⚠️ Failed to add event to client scheduler:', schedulerError);
  // Don't fail the creation process
}
```

**Fix Required:**
```javascript
// Add event to client-side scheduler only if no approval required
if (!pendingApproval && (user?.role === 'super_admin' || user?.role === 'organizer_admin')) {
  try {
    addEventToScheduler(eventData);
    console.log('✅ Added event to client scheduler (no approval required)');
  } catch (schedulerError) {
    console.warn('⚠️ Failed to add event to client scheduler:', schedulerError);
    // Don't fail the creation process
  }
} else {
  console.log('⏸️ Event requires approval - not adding to client scheduler yet');
}
```

### 4. Frontend Event Scheduler Utils (`frontend/src/utils/eventSchedulerUtils.js`)

**Enhancement Required:**
Add a function to handle approval state changes and respect approval flags.

**New Function to Add:**
```javascript
/**
 * Add event to scheduler only if it doesn't require approval
 * @param {Object} event - Event object
 * @returns {boolean} True if added, false if skipped
 */
export const addEventToSchedulerSafe = (event) => {
  // Don't add events that require approval and are still pending
  if (event.approval_required && event.event_approval_status === 'pending_approval') {
    console.log(`⏸️ Skipping scheduler addition for pending approval event: ${event.event_id}`);
    return false;
  }
  
  // Add approved events or events that don't require approval
  try {
    globalScheduler.addEvent(event);
    console.log(`✅ Added event ${event.event_id} to scheduler (approved or no approval required)`);
    return true;
  } catch (error) {
    console.warn(`⚠️ Failed to add event ${event.event_id} to scheduler:`, error);
    return false;
  }
};

/**
 * Handle event approval - add triggers when event is approved
 * @param {string} eventId - Event ID
 * @param {Object} approvedEventData - Updated event data after approval
 */
export const handleEventApproval = (eventId, approvedEventData) => {
  try {
    // Remove any existing triggers (shouldn't be any, but cleanup)
    globalScheduler.removeEvent(eventId);
    
    // Add triggers for the now-approved event
    globalScheduler.addEvent(approvedEventData);
    
    console.log(`✅ Added triggers for approved event: ${eventId}`);
  } catch (error) {
    console.error(`❌ Failed to handle approval for event ${eventId}:`, error);
  }
};

/**
 * Handle event decline - ensure no triggers exist
 * @param {string} eventId - Event ID
 */
export const handleEventDecline = (eventId) => {
  try {
    // Remove any triggers for declined event
    globalScheduler.removeEvent(eventId);
    console.log(`🗑️ Removed triggers for declined event: ${eventId}`);
  } catch (error) {
    console.warn(`⚠️ Failed to remove triggers for declined event ${eventId}:`, error);
  }
};
```

### 5. Frontend Admin API (`frontend/src/api/admin.js`)

**Enhancement Required:**
Update approve/decline handlers to manage client-side triggers.

**Current approve function enhancement:**
```javascript
approveEvent: async (eventId) => {
  const response = await api.post(`/api/v1/admin/events/approve/${eventId}`);
  
  // If approval successful, handle client-side trigger addition
  if (response.data.success) {
    try {
      // Get updated event data and add to client scheduler
      const eventResponse = await api.get(`/api/v1/admin/events/details/${eventId}`);
      if (eventResponse.data.success) {
        const { handleEventApproval } = await import('../utils/eventSchedulerUtils.js');
        handleEventApproval(eventId, eventResponse.data.event);
      }
    } catch (error) {
      console.warn('Failed to update client scheduler after approval:', error);
    }
  }
  
  return response;
},

declineEvent: async (eventId, declineData) => {
  const response = await api.post(`/api/v1/admin/events/decline/${eventId}`, declineData);
  
  // If decline successful, handle client-side trigger removal
  if (response.data.success) {
    try {
      const { handleEventDecline } = await import('../utils/eventSchedulerUtils.js');
      handleEventDecline(eventId);
    } catch (error) {
      console.warn('Failed to update client scheduler after decline:', error);
    }
  }
  
  return response;
}
```

## Testing Strategy

### Before Fix Testing:
1. Run `backend/scripts/test_scheduler_trigger_bug.py`
2. Run frontend test in browser console
3. Document current broken behavior

### After Fix Testing:
1. Re-run both test scripts
2. Verify only approved events have triggers
3. Test approval process adds triggers
4. Test decline process doesn't add triggers

### Test Scenarios:
1. **Executive Admin creates event** → No triggers added
2. **Super Admin creates event** → Triggers added immediately  
3. **Event gets approved** → Triggers added during approval
4. **Event gets declined** → No triggers, event deleted
5. **Event updated** → Triggers updated appropriately

## Risk Assessment

### Low Risk Changes:
- Frontend scheduler utilities (new functions)
- Backend approval trigger addition (new code)

### Medium Risk Changes:
- Backend event creation conditional trigger addition
- Frontend event creation conditional trigger addition

### Mitigation:
- All changes include fallback error handling
- Scheduler failures don't break event creation/approval
- Extensive logging for debugging
- Test scripts verify behavior before/after

## Rollback Plan

If issues arise:
1. Revert backend event creation changes
2. Revert frontend event creation changes  
3. Keep approval trigger addition (improvement)
4. Keep new utility functions (no breaking changes)

## Success Metrics

✅ Executive admin events: 0 triggers until approved
✅ Super admin events: Triggers added immediately
✅ Approved events: Triggers added during approval
✅ Declined events: No triggers, proper cleanup
✅ Scheduler queue: Only contains approved event triggers
✅ No breaking changes to existing functionality
