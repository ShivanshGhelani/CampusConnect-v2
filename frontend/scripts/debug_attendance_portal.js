#!/usr/bin/env node
/**
 * Dynamic Attendance Portal Debug Script
 * =====================================
 * 
 * This script helps debug issues with the dynamic attendance portal
 * by testing various scenarios and API endpoints.
 * 
 * Usage:
 *   node debug_attendance_portal.js [event_id] [base_url]
 * 
 * Example:
 *   node debug_attendance_portal.js EVT_123456 http://localhost:8000
 */

const axios = require('axios');
const readline = require('readline');

class AttendancePortalDebugger {
  constructor(baseUrl = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
    this.authToken = null;
    this.eventId = null;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async promptForInput(question) {
    return new Promise(resolve => {
      this.rl.question(question, resolve);
    });
  }

  async getAuthToken() {
    if (!this.authToken) {
      console.log('\n🔐 Authentication Required');
      console.log('You can get your token from:');
      console.log('1. Browser localStorage: localStorage.getItem("token")');
      console.log('2. Login API response');
      console.log('3. Browser DevTools > Application > Local Storage');
      
      this.authToken = await this.promptForInput('\nEnter your auth token: ');
    }
    return this.authToken;
  }

  async makeRequest(method, endpoint, data = null) {
    try {
      const token = await this.getAuthToken();
      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        config.data = data;
      }

      console.log(`🌐 ${method.toUpperCase()} ${endpoint}`);
      const response = await axios(config);
      
      console.log(`✅ Success (${response.status})`);
      return response.data;
      
    } catch (error) {
      console.log(`❌ Error (${error.response?.status || 'Network'}): ${error.response?.data?.message || error.message}`);
      return null;
    }
  }

  async debugEventConfiguration(eventId) {
    console.log(`\n🔍 Debugging Event Configuration for: ${eventId}`);
    console.log('=' * 50);

    // Test 1: Check if event exists
    console.log('\n1. Checking Event Existence...');
    const eventData = await this.makeRequest('GET', `/api/v1/admin/events/${eventId}`);
    
    if (!eventData) {
      console.log('❌ Event not found. Please check the event ID.');
      return false;
    }

    console.log(`📅 Event: ${eventData.event_name || 'Unknown'}`);
    console.log(`📝 Type: ${eventData.event_type || 'Unknown'}`);
    console.log(`⏰ Duration: ${eventData.start_date} to ${eventData.end_date}`);

    // Test 2: Check attendance configuration
    console.log('\n2. Checking Attendance Configuration...');
    let configData = await this.makeRequest('GET', `/api/v1/attendance/config/${eventId}`);
    
    if (!configData) {
      console.log('⚠️  No attendance configuration found. Attempting to initialize...');
      
      const initResult = await this.makeRequest('POST', `/api/v1/attendance/initialize/${eventId}`);
      if (initResult) {
        console.log('✅ Configuration initialized successfully');
        configData = await this.makeRequest('GET', `/api/v1/attendance/config/${eventId}`);
      } else {
        console.log('❌ Failed to initialize configuration');
        return false;
      }
    }

    if (configData?.data) {
      const config = configData.data;
      console.log(`🎯 Strategy: ${config.strategy}`);
      console.log(`📊 Sessions: ${config.sessions?.length || 0}`);
      console.log(`🤖 Auto-generated: ${config.auto_generated}`);
      
      // Display sessions
      if (config.sessions?.length > 0) {
        console.log('\n📋 Session Details:');
        config.sessions.forEach((session, index) => {
          console.log(`   ${index + 1}. ${session.session_name}`);
          console.log(`      Type: ${session.session_type}`);
          console.log(`      Status: ${session.status}`);
          console.log(`      Time: ${session.start_time} - ${session.end_time}`);
          console.log(`      Mandatory: ${session.is_mandatory ? 'Yes' : 'No'}`);
        });
      }
    }

    return true;
  }

  async debugActiveSessions(eventId) {
    console.log('\n3. Checking Active Sessions...');
    
    const sessionsData = await this.makeRequest('GET', `/api/v1/attendance/sessions/${eventId}/active`);
    
    if (sessionsData?.data) {
      const { active_sessions, upcoming_sessions, can_mark_attendance } = sessionsData.data;
      
      console.log(`🟢 Active Sessions: ${active_sessions?.length || 0}`);
      console.log(`⏳ Upcoming Sessions: ${upcoming_sessions?.length || 0}`);
      console.log(`✅ Can Mark Attendance: ${can_mark_attendance ? 'Yes' : 'No'}`);
      
      if (active_sessions?.length > 0) {
        console.log('\n🟢 Currently Active:');
        active_sessions.forEach(session => {
          const remaining = Math.max(0, session.time_remaining || 0);
          const minutes = Math.floor(remaining / 60);
          console.log(`   • ${session.session_name} (${minutes} minutes remaining)`);
        });
      }
      
      if (upcoming_sessions?.length > 0) {
        console.log('\n⏳ Coming Up:');
        upcoming_sessions.forEach(session => {
          const until = Math.max(0, session.time_until_start || 0);
          const minutes = Math.floor(until / 60);
          console.log(`   • ${session.session_name} (starts in ${minutes} minutes)`);
        });
      }
    }
  }

  async debugStudentRegistrations(eventId) {
    console.log('\n4. Checking Student Registrations...');
    
    // Try both old and new APIs
    const oldRegistrations = await this.makeRequest('GET', `/api/v1/admin/event-registration/event/${eventId}`);
    
    if (oldRegistrations?.data) {
      const registrations = oldRegistrations.data.registrations || [];
      console.log(`👥 Total Registrations: ${registrations.length}`);
      
      if (registrations.length > 0) {
        const sample = registrations[0];
        console.log('\n📋 Sample Registration:');
        console.log(`   Name: ${sample.student_data?.full_name || 'Unknown'}`);
        console.log(`   Enrollment: ${sample.student_enrollment}`);
        console.log(`   Status: ${sample.final_attendance_status || 'pending'}`);
        console.log(`   Physical: ${sample.physical_attendance_id ? 'Marked' : 'Not marked'}`);
        console.log(`   Virtual: ${sample.virtual_attendance_id ? 'Marked' : 'Not marked'}`);
      }
    }
  }

  async debugAttendanceAnalytics(eventId) {
    console.log('\n5. Checking Analytics...');
    
    const analyticsData = await this.makeRequest('GET', `/api/v1/attendance/analytics/${eventId}`);
    
    if (analyticsData?.data) {
      const analytics = analyticsData.data;
      
      console.log(`📊 Total Registered: ${analytics.total_registered || 0}`);
      console.log(`📅 Total Sessions: ${analytics.total_sessions || 0}`);
      console.log(`🎯 Strategy: ${analytics.strategy || 'Unknown'}`);
      
      if (analytics.overall_statistics) {
        const stats = analytics.overall_statistics;
        console.log(`📈 Attendance Rate: ${stats.attendance_rate?.toFixed(1) || 0}%`);
        console.log(`✅ Completion Rate: ${stats.completion_rate?.toFixed(1) || 0}%`);
        
        if (stats.status_distribution) {
          console.log('\n📊 Status Distribution:');
          Object.entries(stats.status_distribution).forEach(([status, count]) => {
            console.log(`   ${status}: ${count}`);
          });
        }
      }
    }
  }

  async testAttendanceMarking(eventId) {
    console.log('\n6. Testing Attendance Marking...');
    
    // Get a sample student
    const registrations = await this.makeRequest('GET', `/api/v1/admin/event-registration/event/${eventId}`);
    
    if (!registrations?.data?.registrations?.length) {
      console.log('❌ No registrations found to test with');
      return;
    }

    const sampleStudent = registrations.data.registrations[0];
    const enrollment = sampleStudent.student_enrollment;
    
    console.log(`🧪 Testing with student: ${enrollment}`);
    
    const proceed = await this.promptForInput('Mark test attendance? (y/N): ');
    if (proceed.toLowerCase() !== 'y') {
      console.log('⏭️  Skipping attendance marking test');
      return;
    }

    // Test marking attendance
    const markResult = await this.makeRequest('POST', `/api/v1/attendance/mark/${eventId}`, {
      student_enrollment: enrollment,
      notes: 'Debug test attendance marking'
    });

    if (markResult?.data) {
      console.log('✅ Attendance marked successfully');
      console.log(`   Session: ${markResult.data.session_name}`);
      console.log(`   ID: ${markResult.data.attendance_id}`);
      console.log(`   Status: ${markResult.data.overall_status}`);
    }
  }

  async debugAPICompatibility(eventId) {
    console.log('\n7. Testing API Compatibility...');
    
    // Test old vs new API consistency
    const oldStats = await this.makeRequest('GET', `/api/v1/admin/event-registration/attendance/stats/${eventId}`);
    const newAnalytics = await this.makeRequest('GET', `/api/v1/attendance/analytics/${eventId}`);
    
    if (oldStats && newAnalytics?.data) {
      console.log('📊 Comparing Old vs New APIs:');
      
      // Compare registration counts if both available
      const oldCount = oldStats.total_registrations || 0;
      const newCount = newAnalytics.data.total_registered || 0;
      
      if (oldCount === newCount) {
        console.log(`✅ Registration count consistent: ${oldCount}`);
      } else {
        console.log(`⚠️  Registration count mismatch: Old=${oldCount}, New=${newCount}`);
      }
    }
  }

  async runInteractiveDebug() {
    console.log('🔧 Dynamic Attendance Portal Interactive Debugger');
    console.log('==================================================');
    
    // Get event ID if not provided
    if (!this.eventId) {
      this.eventId = await this.promptForInput('\nEnter Event ID to debug: ');
    }

    console.log(`\n🎯 Debugging Event: ${this.eventId}`);
    
    const options = [
      'Full Debug (All Tests)',
      'Event Configuration Only',
      'Active Sessions Only', 
      'Student Registrations Only',
      'Analytics Only',
      'Test Attendance Marking',
      'API Compatibility Check',
      'Exit'
    ];

    while (true) {
      console.log('\n📋 Debug Options:');
      options.forEach((option, index) => {
        console.log(`   ${index + 1}. ${option}`);
      });

      const choice = await this.promptForInput('\nSelect option (1-8): ');
      const optionIndex = parseInt(choice) - 1;

      if (optionIndex === 7) break; // Exit

      console.log('\n' + '='.repeat(60));

      try {
        switch (optionIndex) {
          case 0: // Full debug
            await this.runFullDebug();
            break;
          case 1: // Event configuration
            await this.debugEventConfiguration(this.eventId);
            break;
          case 2: // Active sessions
            await this.debugActiveSessions(this.eventId);
            break;
          case 3: // Student registrations
            await this.debugStudentRegistrations(this.eventId);
            break;
          case 4: // Analytics
            await this.debugAttendanceAnalytics(this.eventId);
            break;
          case 5: // Test marking
            await this.testAttendanceMarking(this.eventId);
            break;
          case 6: // API compatibility
            await this.debugAPICompatibility(this.eventId);
            break;
          default:
            console.log('❌ Invalid option');
        }
      } catch (error) {
        console.log(`❌ Debug error: ${error.message}`);
      }

      await this.promptForInput('\nPress Enter to continue...');
    }

    console.log('\n👋 Debugging session ended');
    this.rl.close();
  }

  async runFullDebug() {
    const success = await this.debugEventConfiguration(this.eventId);
    if (success) {
      await this.debugActiveSessions(this.eventId);
      await this.debugStudentRegistrations(this.eventId);
      await this.debugAttendanceAnalytics(this.eventId);
      await this.debugAPICompatibility(this.eventId);
    }
  }

  async runAutoDebug(eventId) {
    this.eventId = eventId;
    console.log('🤖 Running Automated Debug...\n');
    await this.runFullDebug();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const eventId = args[0];
  const baseUrl = args[1] || 'http://localhost:8000';

  const portalDebugger = new AttendancePortalDebugger(baseUrl);

  if (eventId) {
    // Automated debug mode
    await portalDebugger.runAutoDebug(eventId);
  } else {
    // Interactive debug mode
    await portalDebugger.runInteractiveDebug();
  }
}

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\n\n👋 Debug session interrupted');
  process.exit(0);
});

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = AttendancePortalDebugger;
