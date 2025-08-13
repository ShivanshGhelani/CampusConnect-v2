/**
 * Frontend Component Migration Script
 * ==================================
 * Helps migrate React components to use new participation API endpoints.
 * Run this script to find and update component files.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ComponentMigrationHelper {
    constructor() {
        this.srcDir = path.join(__dirname, '..', 'src');
        this.componentsDir = path.join(this.srcDir, 'components');
        this.pagesDir = path.join(this.srcDir, 'pages');
        this.migrationsLog = [];
        this.filesToUpdate = [];
    }

    // API endpoint mappings from old to new
    getMappings() {
        return {
            // Client API mappings
            'clientAPI.registerIndividual': 'participationAPI.registerStudentForEvent',
            'clientAPI.registerTeam': 'participationAPI.registerStudentForEvent',
            'clientAPI.getMyRegistrations': 'participationAPI.getStudentRegistrations',
            'clientAPI.getRegistrationStatus': 'participationAPI.getStudentRegistrationStatus',
            'clientAPI.cancelRegistration': 'participationAPI.unregisterStudentFromEvent',
            
            // Admin API mappings
            'adminAPI.getEventRegistrations': 'participationAPI.getEventParticipants',
            'adminAPI.markStudentAttendance': 'participationAPI.markAttendance',
            'adminAPI.bulkMarkAttendance': 'participationAPI.bulkMarkAttendance',
            'adminAPI.issueStudentCertificate': 'participationAPI.issueCertificate',
            'adminAPI.getStudentParticipations': 'participationAPI.getStudentHistory',
            'adminAPI.getEventStatistics': 'participationAPI.getEventStatistics'
        };
    }

    // Find files that need migration
    async findFilesToMigrate() {
        const extensions = ['.js', '.jsx', '.ts', '.tsx'];
        const directories = [this.componentsDir, this.pagesDir];
        
        for (const dir of directories) {
            if (fs.existsSync(dir)) {
                await this.scanDirectory(dir, extensions);
            }
        }
        
        return this.filesToUpdate;
    }

    async scanDirectory(directory, extensions) {
        const files = fs.readdirSync(directory);
        
        for (const file of files) {
            const filePath = path.join(directory, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                await this.scanDirectory(filePath, extensions);
            } else if (extensions.some(ext => file.endsWith(ext))) {
                await this.analyzeFile(filePath);
            }
        }
    }

    async analyzeFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const mappings = this.getMappings();
            const foundMappings = [];
            
            for (const [oldEndpoint, newEndpoint] of Object.entries(mappings)) {
                if (content.includes(oldEndpoint)) {
                    foundMappings.push({ old: oldEndpoint, new: newEndpoint });
                }
            }
            
            if (foundMappings.length > 0) {
                this.filesToUpdate.push({
                    path: filePath,
                    relativePath: path.relative(this.srcDir, filePath),
                    mappings: foundMappings
                });
            }
        } catch (error) {
            console.error(`Error analyzing file ${filePath}:`, error.message);
        }
    }

    // Generate migration report
    generateMigrationReport() {
        console.log('\n=== FRONTEND COMPONENT MIGRATION ANALYSIS ===\n');
        
        if (this.filesToUpdate.length === 0) {
            console.log('SUCCESS: No files found that need migration to new participation API.');
            return;
        }
        
        console.log(`ANALYSIS: Found ${this.filesToUpdate.length} files that need migration:\n`);
        
        for (const file of this.filesToUpdate) {
            console.log(`FILE: ${file.relativePath}`);
            console.log(`   Endpoints to update:`);
            
            for (const mapping of file.mappings) {
                console.log(`   - ${mapping.old} → ${mapping.new}`);
            }
            console.log('');
        }
        
        console.log('\n=== MIGRATION INSTRUCTIONS ===\n');
        console.log('1. Import the new participation API:');
        console.log('   import { participationAPI } from \'../api\';');
        console.log('');
        console.log('2. Update API calls according to the mappings above');
        console.log('');
        console.log('3. Update data structures if needed:');
        console.log('   - Registration data now uses unified format');
        console.log('   - Attendance data includes session_id field');
        console.log('   - Certificate data includes download_url field');
        console.log('');
        console.log('4. Test the updated components thoroughly');
        console.log('');
        console.log('TIP: Keep backup of original files before making changes');
    }
}

// Main execution
async function main() {
    console.log('STARTING: Frontend Component Migration Analysis...');
    
    const migrator = new ComponentMigrationHelper();
    
    try {
        await migrator.findFilesToMigrate();
        migrator.generateMigrationReport();
        
        console.log('\nSUCCESS: Migration analysis completed!');
    } catch (error) {
        console.error('ERROR: Migration analysis failed:', error.message);
        process.exit(1);
    }
}

// Check if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default ComponentMigrationHelper;
