#!/usr/bin/env node
/**
 * Frontend Integration Script for Simple Registration System
 * =========================================================
 * Updates frontend API calls to use the new simple registration system
 * as specified in event_lifecycle.txt
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FrontendSimpleIntegration {
    constructor() {
        this.frontendDir = path.join(__dirname, '..');
        this.changes = [];
        this.errors = [];
    }

    async updateFrontendAPIs() {
        console.log('🔄 FRONTEND INTEGRATION: Simple Registration System');
        console.log('='.repeat(60));
        console.log('Updating frontend to use simple registration APIs');
        console.log();

        // 1. Update admin.js API endpoints
        await this.updateAdminAPI();
        
        // 2. Update client.js API endpoints  
        await this.updateClientAPI();
        
        // 3. Create new simple API module
        await this.createSimpleAPI();
        
        // 4. Update component imports
        await this.updateComponentImports();

        // 5. Generate summary
        this.generateSummary();
    }

    async updateAdminAPI() {
        console.log('📊 Updating Admin API (admin.js)');
        console.log('-'.repeat(40));

        const adminAPIPath = path.join(this.frontendDir, 'src', 'api', 'admin.js');
        
        try {
            if (!fs.existsSync(adminAPIPath)) {
                console.log('ℹ️  admin.js not found, skipping admin API update');
                return;
            }

            let content = fs.readFileSync(adminAPIPath, 'utf8');
            
            // Add simple registration endpoints to admin API
            const simpleEndpoints = `
  // SIMPLE REGISTRATION SYSTEM (event_lifecycle.txt implementation)
  // Fast, efficient endpoints as specified in the plan
  getEventRegistrationsSimple: (eventId, options = {}) => {
    const { limit = 50, offset = 0 } = options;
    return api.get(\`/api/v1/registrations/event/\${eventId}/registrations\`, { 
      params: { limit, offset } 
    });
  },
  
  markAttendanceSimple: (eventId, attendanceData) => 
    api.post(\`/api/v1/registrations/attendance/\${eventId}/mark-bulk\`, attendanceData),
  
  issueSimpleCertificates: (eventId, certificateData) => 
    api.post(\`/api/v1/registrations/certificates/\${eventId}/issue-bulk\`, certificateData),
  
  getEventStatisticsSimple: (eventId) => 
    api.get(\`/api/v1/registrations/statistics/\${eventId}\`),
`;

            // Insert before the closing brace
            const insertPoint = content.lastIndexOf('};');
            if (insertPoint !== -1) {
                content = content.slice(0, insertPoint) + simpleEndpoints + '\n};';
                
                fs.writeFileSync(adminAPIPath, content);
                console.log('✅ Added simple registration endpoints to admin API');
                this.changes.push('Updated admin.js with simple endpoints');
            } else {
                throw new Error('Could not find insertion point in admin.js');
            }
            
        } catch (error) {
            console.log(`❌ Error updating admin API: ${error.message}`);
            this.errors.push(`Admin API update failed: ${error.message}`);
        }
    }

    async updateClientAPI() {
        console.log('\n📱 Updating Client API (client.js)');
        console.log('-'.repeat(40));

        const clientAPIPath = path.join(this.frontendDir, 'src', 'api', 'client.js');
        
        try {
            if (!fs.existsSync(clientAPIPath)) {
                console.log('ℹ️  client.js not found, skipping client API update');
                return;
            }

            let content = fs.readFileSync(clientAPIPath, 'utf8');
            
            // Add simple registration endpoints
            const simpleClientEndpoints = `
  // SIMPLE REGISTRATION ENDPOINTS (event_lifecycle.txt implementation)
  // Individual registration
  registerIndividualSimple: (eventId, registrationData) => 
    api.post(\`/api/v1/registrations/individual/\${eventId}\`, registrationData),
  
  // Team registration
  registerTeamSimple: (eventId, teamData) => 
    api.post(\`/api/v1/registrations/team/\${eventId}\`, teamData),
  
  // Registration status
  getRegistrationStatusSimple: (eventId) => 
    api.get(\`/api/v1/registrations/status/\${eventId}\`),
  
  // Cancel registration
  cancelRegistrationSimple: (eventId) => 
    api.delete(\`/api/v1/registrations/cancel/\${eventId}\`),
  
  // Mark attendance
  markAttendanceSimple: (eventId, attendanceData) => 
    api.post(\`/api/v1/registrations/attendance/\${eventId}/mark\`, attendanceData),
  
  // Submit feedback
  submitFeedbackSimple: (eventId, feedbackData) => 
    api.post(\`/api/v1/registrations/feedback/\${eventId}/submit\`, feedbackData),
`;

            // Insert before the closing brace
            const insertPoint = content.lastIndexOf('};');
            if (insertPoint !== -1) {
                content = content.slice(0, insertPoint) + simpleClientEndpoints + '\n};';
                
                fs.writeFileSync(clientAPIPath, content);
                console.log('✅ Added simple registration endpoints to client API');
                this.changes.push('Updated client.js with simple endpoints');
            } else {
                throw new Error('Could not find insertion point in client.js');
            }
            
        } catch (error) {
            console.log(`❌ Error updating client API: ${error.message}`);
            this.errors.push(`Client API update failed: ${error.message}`);
        }
    }

    async createSimpleAPI() {
        console.log('\n⚡ Creating Simple Registration API Module');
        console.log('-'.repeat(40));

        const apiDir = path.join(this.frontendDir, 'src', 'api');
        const simpleAPIPath = path.join(apiDir, 'simple.js');
        
        // Ensure api directory exists
        if (!fs.existsSync(apiDir)) {
            fs.mkdirSync(apiDir, { recursive: true });
        }
        
        const simpleAPIContent = `import api from './base';

/**
 * Simple Registration API Module
 * =============================
 * Clean, fast API endpoints implementing the simple system from event_lifecycle.txt
 * 
 * Features:
 * - Single collection queries
 * - Fast response times (< 2 seconds)
 * - Simple request/response format
 * - Proper error handling
 */

export const simpleAPI = {
  // ============================================================================
  // STUDENT REGISTRATION (Simple and Fast)
  // ============================================================================
  
  // Individual registration - single API call
  registerIndividual: (eventId, data) => 
    api.post(\`/api/v1/registrations/individual/\${eventId}\`, data),
  
  // Team registration - single API call
  registerTeam: (eventId, teamData) => 
    api.post(\`/api/v1/registrations/team/\${eventId}\`, teamData),
  
  // Get registration status - indexed query
  getStatus: (eventId) => 
    api.get(\`/api/v1/registrations/status/\${eventId}\`),
  
  // Cancel registration - single update
  cancel: (eventId) => 
    api.delete(\`/api/v1/registrations/cancel/\${eventId}\`),
  
  // ============================================================================
  // EVENT LIFECYCLE (Simple Operations)
  // ============================================================================
  
  // Mark attendance - single update
  markAttendance: (eventId, data = {}) => 
    api.post(\`/api/v1/registrations/attendance/\${eventId}/mark\`, data),
  
  // Submit feedback - single update
  submitFeedback: (eventId, feedback) => 
    api.post(\`/api/v1/registrations/feedback/\${eventId}/submit\`, feedback),
  
  // ============================================================================
  // ADMIN OPERATIONS (Fast Analytics)
  // ============================================================================
  
  // Get event registrations - indexed query
  getEventRegistrations: (eventId, options = {}) => 
    api.get(\`/api/v1/registrations/event/\${eventId}/registrations\`, { params: options }),
  
  // Bulk attendance marking - efficient batch operation
  markBulkAttendance: (eventId, attendanceList) => 
    api.post(\`/api/v1/registrations/attendance/\${eventId}/mark-bulk\`, attendanceList),
  
  // Bulk certificate issuance - efficient batch operation
  issueBulkCertificates: (eventId, certificateList) => 
    api.post(\`/api/v1/registrations/certificates/\${eventId}/issue-bulk\`, certificateList),
  
  // Get event statistics - fast aggregation
  getStatistics: (eventId) => 
    api.get(\`/api/v1/registrations/statistics/\${eventId}\`),
  
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  // Check if student is registered
  isRegistered: async (eventId) => {
    try {
      const response = await api.get(\`/api/v1/registrations/status/\${eventId}\`);
      return response.data?.registered || false;
    } catch (error) {
      console.error('Error checking registration status:', error);
      return false;
    }
  },
  
  // Get registration details
  getRegistrationDetails: async (eventId) => {
    try {
      const response = await api.get(\`/api/v1/registrations/status/\${eventId}\`);
      return response.data?.registration || null;
    } catch (error) {
      console.error('Error getting registration details:', error);
      return null;
    }
  },
  
  // Calculate completion percentage
  getCompletionStatus: (registration) => {
    if (!registration) return 0;
    
    let completed = 1; // Registration completed
    if (registration.attendance?.marked) completed++;
    if (registration.feedback?.submitted) completed++;
    if (registration.certificate?.issued) completed++;
    
    return (completed / 4) * 100; // 4 total stages
  }
};

export default simpleAPI;
`;

        try {
            fs.writeFileSync(simpleAPIPath, simpleAPIContent);
            console.log('✅ Created simple registration API module');
            this.changes.push('Created simple.js API module');
        } catch (error) {
            console.log(`❌ Error creating simple API: ${error.message}`);
            this.errors.push(`Simple API creation failed: ${error.message}`);
        }
    }

    async updateComponentImports() {
        console.log('\n🔗 Updating Component Imports');
        console.log('-'.repeat(40));

        // Update main API index file
        const apiIndexPath = path.join(this.frontendDir, 'src', 'api', 'index.js');
        
        try {
            let content = '';
            
            // Check if index.js exists, create if it doesn't
            if (fs.existsSync(apiIndexPath)) {
                content = fs.readFileSync(apiIndexPath, 'utf8');
            } else {
                // Create basic index.js if it doesn't exist
                content = `// API Module Exports
export { default as api } from './base';
`;
            }
            
            // Add simple API export
            const simpleExport = `export { simpleAPI } from './simple';\n`;
            
            if (!content.includes('simpleAPI')) {
                content += simpleExport;
                fs.writeFileSync(apiIndexPath, content);
                console.log('✅ Added simple API export to index.js');
                this.changes.push('Updated API index exports');
            } else {
                console.log('ℹ️  Simple API export already exists');
            }
            
        } catch (error) {
            console.log(`❌ Error updating API index: ${error.message}`);
            this.errors.push(`API index update failed: ${error.message}`);
        }
    }

    generateSummary() {
        console.log('\n📊 FRONTEND INTEGRATION SUMMARY');
        console.log('='.repeat(50));
        
        console.log(`Changes Made: ${this.changes.length}`);
        this.changes.forEach((change, index) => {
            console.log(`   ${index + 1}. ${change}`);
        });
        
        if (this.errors.length > 0) {
            console.log(`\nErrors Encountered: ${this.errors.length}`);
            this.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        }
        
        console.log('\n📋 NEXT STEPS:');
        console.log('1. Update registration components to use simpleAPI endpoints');
        console.log('2. Test registration flow with new endpoints');
        console.log('3. Verify performance improvements (target: < 2 seconds)');
        console.log('4. Phase out complex participation API calls');
        console.log('5. Update admin dashboard to use simple statistics');
        
        console.log('\n🎯 USAGE EXAMPLES:');
        console.log('// Import simple API');
        console.log("import { simpleAPI } from '../api';");
        console.log('');
        console.log('// Register student');
        console.log('const result = await simpleAPI.registerIndividual(eventId, data);');
        console.log('');
        console.log('// Check status');
        console.log('const status = await simpleAPI.getStatus(eventId);');
        console.log('');
        console.log('// Mark attendance');
        console.log('await simpleAPI.markAttendance(eventId);');
        
        if (this.errors.length === 0) {
            console.log('\n✅ FRONTEND INTEGRATION COMPLETE');
            console.log('   Simple registration system is ready for testing');
        } else {
            console.log('\n⚠️  FRONTEND INTEGRATION PARTIAL');
            console.log('   Some issues need to be resolved');
        }
    }
}

// Run the integration
const integration = new FrontendSimpleIntegration();
integration.updateFrontendAPIs().catch(console.error);
