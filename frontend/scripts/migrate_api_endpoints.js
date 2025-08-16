#!/usr/bin/env node
/**
 * Frontend API Migration Script
 * Updates frontend API calls to use the new participation-based endpoints
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Files to update
const filesToUpdate = [
    '../src/api/admin.js',
    '../src/pages/admin/EventDetail.jsx'
];

// API endpoint mappings
const endpointMappings = {
    // Old endpoint -> New endpoint
    '/api/v1/admin/events/registrations/': '/api/v1/admin/participation/event/',
    'getEventRegistrations': 'getEventParticipants',
    'registrations/${eventId}': 'participation/event/${eventId}/participants'
};

function updateFile(filePath) {
    console.log(`\n🔧 Updating ${filePath}...`);
    
    if (!fs.existsSync(filePath)) {
        console.log(`❌ File not found: ${filePath}`);
        return false;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let changesMade = 0;
    
    // Update API endpoint mappings
    for (const [oldPattern, newPattern] of Object.entries(endpointMappings)) {
        const regex = new RegExp(oldPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        const matches = content.match(regex);
        if (matches) {
            content = content.replace(regex, newPattern);
            changesMade += matches.length;
            console.log(`   ✅ Replaced "${oldPattern}" with "${newPattern}" (${matches.length} times)`);
        }
    }
    
    // Specific updates for admin.js
    if (filePath.includes('admin.js')) {
        // Update getEventRegistrations to getEventParticipants
        if (content.includes('getEventRegistrations:')) {
            content = content.replace(
                /getEventRegistrations:\s*\([^)]*\)\s*=>\s*api\.get\([^)]+\)/g,
                'getEventParticipants: (eventId, filters) => api.get(`/api/v1/admin/participation/event/${eventId}/participants`, { params: filters })'
            );
            changesMade++;
            console.log('   ✅ Updated getEventRegistrations method');
        }
        
        // Add the new method if it doesn't exist
        if (!content.includes('getEventParticipants:')) {
            const insertPoint = content.indexOf('getEventRegistrations:');
            if (insertPoint !== -1) {
                const lineEnd = content.indexOf('\n', insertPoint);
                const newMethod = `  getEventParticipants: (eventId, filters) => api.get(\`/api/v1/admin/participation/event/\${eventId}/participants\`, { params: filters }),\n`;
                content = content.slice(0, lineEnd + 1) + newMethod + content.slice(lineEnd + 1);
                changesMade++;
                console.log('   ✅ Added getEventParticipants method');
            }
        }
    }
    
    // Specific updates for EventDetail.jsx
    if (filePath.includes('EventDetail.jsx')) {
        // Update API call from getEventRegistrations to getEventParticipants
        if (content.includes('adminAPI.getEventRegistrations')) {
            content = content.replace(
                /adminAPI\.getEventRegistrations/g,
                'adminAPI.getEventParticipants'
            );
            changesMade++;
            console.log('   ✅ Updated API method calls from getEventRegistrations to getEventParticipants');
        }
        
        // Update response data handling to match new format
        const responseHandlingOld = `if (recentRegsResponse.data.registrations) {
          registrations = Array.isArray(recentRegsResponse.data.registrations) 
            ? recentRegsResponse.data.registrations 
            : [recentRegsResponse.data.registrations];
        } else if (recentRegsResponse.data.data && Array.isArray(recentRegsResponse.data.data)) {
          registrations = recentRegsResponse.data.data;
        }`;
        
        const responseHandlingNew = `if (recentRegsResponse.data.registrations) {
          registrations = Array.isArray(recentRegsResponse.data.registrations) 
            ? recentRegsResponse.data.registrations 
            : [recentRegsResponse.data.registrations];
        }`;
        
        if (content.includes(responseHandlingOld)) {
            content = content.replace(responseHandlingOld, responseHandlingNew);
            changesMade++;
            console.log('   ✅ Updated response data handling for new API format');
        }
    }
    
    if (changesMade > 0) {
        // Create backup
        const backupPath = `${filePath}.backup.${Date.now()}`;
        fs.writeFileSync(backupPath, originalContent);
        console.log(`   💾 Backup created: ${backupPath}`);
        
        // Write updated content
        fs.writeFileSync(filePath, content);
        console.log(`   ✅ File updated successfully (${changesMade} changes)`);
        return true;
    } else {
        console.log('   ℹ️  No changes needed');
        return false;
    }
}

function main() {
    console.log('🚀 Starting Frontend API Migration');
    console.log('=====================================');
    console.log('Current directory:', process.cwd());
    console.log('Script directory:', __dirname);
    
    let totalFilesUpdated = 0;
    
    for (const file of filesToUpdate) {
        const fullPath = path.resolve(__dirname, file);
        if (updateFile(fullPath)) {
            totalFilesUpdated++;
        }
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`   Files updated: ${totalFilesUpdated}/${filesToUpdate.length}`);
    console.log(`   Status: ${totalFilesUpdated > 0 ? '✅ Success' : 'ℹ️  No changes needed'}`);
    
    if (totalFilesUpdated > 0) {
        console.log(`\n🎯 Next Steps:`);
        console.log(`   1. Test the frontend application`);
        console.log(`   2. Verify that registration lists are now displaying`);
        console.log(`   3. Check that pagination and filtering work correctly`);
        console.log(`   4. Remove backup files once confirmed working`);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
