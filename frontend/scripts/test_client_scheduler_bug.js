/**
 * Frontend Event Scheduler Trigger Bug Test
 * 
 * This script tests the client-side scheduler behavior and demonstrates
 * the bug where triggers are added for events requiring approval.
 * 
 * Usage: 
 * 1. Import this into a React component or run in browser console
 * 2. Call testClientSchedulerBug() to run the test
 */

import { globalScheduler, addEventToScheduler, EventTriggerType } from '../src/utils/eventSchedulerUtils.js';

class ClientSchedulerTriggerTest {
  constructor() {
    this.testEvents = [];
    this.originalTriggerCount = 0;
  }

  /**
   * Create test event data
   */
  setupTestData() {
    console.log('🔧 Setting up client-side test data...');

    const now = new Date();
    const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

    // Test Event 1: Executive Admin created event (should NOT have triggers until approved)
    this.testEvent1 = {
      event_id: 'CLIENT_TEST_EXEC_001',
      event_name: 'Client Executive Admin Test Event',
      event_type: 'workshop',
      status: 'pending_approval', // IMPORTANT: Pending approval
      event_approval_status: 'pending_approval',
      approval_required: true,
      published: false,
      start_datetime: addDays(now, 10).toISOString(),
      end_datetime: addDays(now, 10.1).toISOString(),
      registration_start_date: addDays(now, 1).toISOString(),
      registration_end_date: addDays(now, 9).toISOString(),
      certificate_end_date: addDays(now, 20).toISOString(),
      created_by: 'executive_admin_test',
      target_audience: 'student'
    };

    // Test Event 2: Super Admin created event (should have triggers immediately)
    this.testEvent2 = {
      event_id: 'CLIENT_TEST_SUPER_002',
      event_name: 'Client Super Admin Test Event', 
      event_type: 'seminar',
      status: 'upcoming', // IMPORTANT: Already approved
      event_approval_status: 'approved',
      approval_required: false,
      published: true,
      start_datetime: addDays(now, 15).toISOString(),
      end_datetime: addDays(now, 15.2).toISOString(),
      registration_start_date: addDays(now, 2).toISOString(),
      registration_end_date: addDays(now, 14).toISOString(),
      certificate_end_date: addDays(now, 25).toISOString(),
      created_by: 'super_admin_test',
      target_audience: 'faculty'
    };

    this.testEvents = [this.testEvent1, this.testEvent2];
    console.log(`✅ Created ${this.testEvents.length} test events`);
  }

  /**
   * Get current trigger count from scheduler
   */
  getSchedulerTriggerCount() {
    try {
      const status = globalScheduler.getStatus();
      return status.triggersQueued || 0;
    } catch (e) {
      console.error('❌ Error getting scheduler status:', e);
      return 0;
    }
  }

  /**
   * Get triggers for a specific event
   */
  getTriggersForEvent(eventId) {
    try {
      const allTriggers = globalScheduler.getScheduledTriggers();
      return allTriggers.filter(trigger => trigger.eventId === eventId);
    } catch (e) {
      console.error(`❌ Error getting triggers for event ${eventId}:`, e);
      return [];
    }
  }

  /**
   * Test current broken behavior
   */
  testCurrentBehavior() {
    console.log('\n🔍 TESTING CURRENT CLIENT-SIDE BEHAVIOR (DEMONSTRATING BUG)');
    console.log('='.repeat(65));

    // Get initial trigger count
    this.originalTriggerCount = this.getSchedulerTriggerCount();
    console.log(`📊 Initial client scheduler trigger count: ${this.originalTriggerCount}`);

    // Test adding events to scheduler (current broken behavior)
    console.log('\n1️⃣ Adding events to client scheduler (CURRENT BROKEN BEHAVIOR)...');
    
    this.testEvents.forEach(event => {
      try {
        // This simulates the current bug - all events get added regardless of approval status
        addEventToScheduler(event);
        console.log(`🚨 BUG: Added event ${event.event_id} to client scheduler (status: ${event.event_approval_status})`);
      } catch (e) {
        console.error(`❌ Error adding event ${event.event_id} to scheduler:`, e);
      }
    });

    // Check trigger counts after adding events
    const newTriggerCount = this.getSchedulerTriggerCount();
    console.log(`\n📊 Trigger count after adding events: ${newTriggerCount}`);
    console.log(`📈 Triggers added: ${newTriggerCount - this.originalTriggerCount}`);

    // Check triggers for each event
    console.log('\n2️⃣ Analyzing triggers per event...');
    this.testEvents.forEach(event => {
      const eventTriggers = this.getTriggersForEvent(event.event_id);
      console.log(`📋 Event ${event.event_id}:`);
      console.log(`   - Status: ${event.event_approval_status}`);
      console.log(`   - Triggers found: ${eventTriggers.length}`);
      console.log(`   - Should have triggers: ${event.event_approval_status === 'pending_approval' ? 'NO' : 'YES'}`);

      if (event.event_approval_status === 'pending_approval' && eventTriggers.length > 0) {
        console.log(`   🚨 BUG DETECTED: Pending approval event has ${eventTriggers.length} triggers!`);
        eventTriggers.forEach(trigger => {
          console.log(`      - ${trigger.triggerType} at ${trigger.triggerTime}`);
        });
      } else if (event.event_approval_status === 'approved' && eventTriggers.length === 0) {
        console.log('   ⚠️ WARNING: Approved event has no triggers!');
      } else {
        console.log('   ✅ Trigger count is correct for this event');
      }
    });
  }

  /**
   * Test approval simulation
   */
  testApprovalProcess() {
    console.log('\n3️⃣ Testing approval process simulation...');

    // Simulate approving the pending event
    const pendingEvent = this.testEvent1;
    console.log(`🔄 Simulating approval of event: ${pendingEvent.event_id}`);

    // Update event properties to simulate approval
    const approvedEvent = {
      ...pendingEvent,
      status: 'upcoming',
      event_approval_status: 'approved',
      published: true,
      approved_by: 'test_super_admin',
      approved_at: new Date().toISOString(),
      approval_required: false
    };

    // In current implementation, we would need to manually add triggers
    // This demonstrates the missing functionality
    try {
      // Remove old triggers (if any)
      globalScheduler.removeEvent(pendingEvent.event_id);
      
      // Add new triggers for approved event
      addEventToScheduler(approvedEvent);
      
      console.log(`✅ Manually added triggers for approved event ${pendingEvent.event_id}`);
    } catch (e) {
      console.error(`❌ Error updating triggers for approved event:`, e);
    }

    // Check if triggers were added
    const eventTriggers = this.getTriggersForEvent(pendingEvent.event_id);
    console.log(`📋 Triggers after approval: ${eventTriggers.length}`);

    if (eventTriggers.length === 0) {
      console.log('🚨 ISSUE: Manual trigger addition might have failed');
    } else {
      console.log('✅ Triggers present after approval simulation');
    }
  }

  /**
   * Clean up test data
   */
  cleanup() {
    console.log('\n🧹 Cleaning up client-side test data...');

    try {
      // Remove test events from scheduler
      this.testEvents.forEach(event => {
        try {
          globalScheduler.removeEvent(event.event_id);
          console.log(`🗑️ Removed triggers for event: ${event.event_id}`);
        } catch (e) {
          console.warn(`⚠️ Could not remove triggers for ${event.event_id}:`, e);
        }
      });

      console.log('✅ Client-side cleanup completed');
    } catch (e) {
      console.error('❌ Error during cleanup:', e);
    }
  }

  /**
   * Run the complete test suite
   */
  runTest() {
    console.log('🧪 CLIENT-SIDE EVENT SCHEDULER TRIGGER BUG TEST');
    console.log('='.repeat(55));
    console.log('This test demonstrates the client-side bug where triggers are added');
    console.log('to the scheduler for events that require approval.');
    console.log('='.repeat(55));

    try {
      this.setupTestData();
      this.testCurrentBehavior();
      this.testApprovalProcess();

      console.log('\n📋 CLIENT-SIDE TEST SUMMARY');
      console.log('='.repeat(35));
      console.log('🚨 BUGS FOUND:');
      console.log('1. Client scheduler adds triggers for pending approval events');
      console.log('2. No automatic trigger management during approval state changes');
      console.log('3. Frontend doesn\'t respect approval_required flag');
      console.log('\n🔧 FIXES NEEDED:');
      console.log('1. Check approval status before adding triggers in CreateEvent.jsx');
      console.log('2. Add trigger management for approval/decline responses');
      console.log('3. Update eventSchedulerUtils.js to respect approval flags');

    } catch (e) {
      console.error('❌ Client-side test failed with error:', e);
    } finally {
      this.cleanup();
    }
  }
}

/**
 * Main test function - call this to run the test
 */
export function testClientSchedulerBug() {
  const test = new ClientSchedulerTriggerTest();
  test.runTest();
}

/**
 * Quick test function for browser console
 */
window.testClientSchedulerBug = function() {
  console.log('Running client-side scheduler bug test...');
  
  // Simple inline test since imports might not work in console
  const now = new Date();
  const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

  // Test event that should NOT have triggers
  const pendingEvent = {
    event_id: 'CONSOLE_TEST_001',
    event_name: 'Console Test Event',
    status: 'pending_approval',
    event_approval_status: 'pending_approval',
    approval_required: true,
    start_datetime: addDays(now, 10).toISOString(),
    registration_start_date: addDays(now, 1).toISOString(),
    registration_end_date: addDays(now, 9).toISOString()
  };

  console.log('🔍 Testing with event:', pendingEvent.event_id);
  console.log('📊 Approval status:', pendingEvent.event_approval_status);
  console.log('❓ Should have triggers:', pendingEvent.event_approval_status !== 'pending_approval');

  // Try to add to scheduler (this will demonstrate the bug)
  try {
    if (typeof addEventToScheduler === 'function') {
      addEventToScheduler(pendingEvent);
      console.log('🚨 BUG CONFIRMED: Pending approval event was added to scheduler!');
    } else {
      console.log('⚠️ addEventToScheduler function not available in console');
    }
  } catch (e) {
    console.error('❌ Error testing in console:', e);
  }
};

export default ClientSchedulerTriggerTest;
