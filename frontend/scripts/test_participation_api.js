/**
 * Participation API Testing Utilities
 * ==================================
 * Test new participation API endpoints from frontend perspective.
 */

import { participationAPI, clientAPI, adminAPI } from '../src/api';

class ParticipationAPITester {
    constructor() {
        this.testResults = [];
        this.testData = {
            testEventId: 'test-event-001',
            testStudentId: 'TEST123',
            testRegistrationData: {
                event_id: 'test-event-001',
                registration_type: 'individual',
                additional_data: {
                    name: 'Test Student',
                    email: 'test@example.com',
                    phone: '1234567890'
                }
            }
        };
    }

    logTest(testName, status, details = '') {
        const result = {
            test: testName,
            status: status,
            details: details,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        console.log(`[${status}] ${testName}: ${details}`);
    }

    // Test student registration endpoints
    async testStudentRegistration() {
        try {
            // Test registration
            const registrationResult = await participationAPI.registerStudentForEvent(this.testData.testRegistrationData);
            this.logTest('Student Registration', 'PASS', 'Registration endpoint accessible');
            
            // Test getting registrations
            const registrationsResult = await participationAPI.getStudentRegistrations();
            this.logTest('Get Student Registrations', 'PASS', 'Registrations endpoint accessible');
            
            // Test registration status
            const statusResult = await participationAPI.getStudentRegistrationStatus(this.testData.testEventId);
            this.logTest('Get Registration Status', 'PASS', 'Status endpoint accessible');
            
        } catch (error) {
            this.logTest('Student Registration Tests', 'FAIL', error.message);
        }
    }

    // Test admin participation endpoints
    async testAdminParticipation() {
        try {
            // Test getting participants
            const participantsResult = await participationAPI.getEventParticipants(this.testData.testEventId);
            this.logTest('Get Event Participants', 'PASS', 'Participants endpoint accessible');
            
            // Test event statistics
            const statsResult = await participationAPI.getEventStatistics(this.testData.testEventId);
            this.logTest('Get Event Statistics', 'PASS', 'Statistics endpoint accessible');
            
        } catch (error) {
            this.logTest('Admin Participation Tests', 'FAIL', error.message);
        }
    }

    // Test backward compatibility
    async testBackwardCompatibility() {
        try {
            // Test legacy client API endpoints
            const registrationsResult = await clientAPI.getMyRegistrations();
            this.logTest('Legacy Client API', 'PASS', 'Legacy endpoints still accessible');
            
            // Test legacy admin API endpoints  
            const studentsResult = await adminAPI.getStudents();
            this.logTest('Legacy Admin API', 'PASS', 'Legacy admin endpoints still accessible');
            
        } catch (error) {
            this.logTest('Backward Compatibility Tests', 'FAIL', error.message);
        }
    }

    // Run all tests
    async runAllTests() {
        console.log('STARTING: Participation API Tests...');
        console.log('=======================================\n');
        
        await this.testStudentRegistration();
        await this.testAdminParticipation();
        await this.testBackwardCompatibility();
        
        this.generateTestReport();
    }

    generateTestReport() {
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const total = this.testResults.length;
        
        console.log('\nTEST SUMMARY');
        console.log('================');
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
        
        if (failed > 0) {
            console.log('\nFAILED TESTS:');
            this.testResults.filter(r => r.status === 'FAIL').forEach(test => {
                console.log(`- ${test.test}: ${test.details}`);
            });
        }
        
        console.log('\nSUCCESS: Participation API testing completed!');
    }
}

// Export for use in React components or other scripts
export default ParticipationAPITester;

// Node.js execution
if (typeof window === 'undefined') {
    const tester = new ParticipationAPITester();
    tester.runAllTests().catch(console.error);
}
