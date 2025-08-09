# PowerShell script to migrate all remaining axios imports to optimized API modules

$rootPath = "s:\Projects\ClgCerti\CampusConnect\frontend\src"

# Define replacement patterns
$replacements = @(
    @{
        Find = "from '../../../../api/axios'"
        Replace = "from '../../../../api/client'"
        FilePattern = "*Client*"
    },
    @{
        Find = "from '../../../api/axios'"
        Replace = "from '../../../api/client'"
        FilePattern = "*Client*"
    },
    @{
        Find = "from '../../api/axios'"
        Replace = "from '../../api/client'"
        FilePattern = "*Client*"
    },
    @{
        Find = "from '../../../../api/axios'"
        Replace = "from '../../../../api/admin'"
        FilePattern = "*Admin*"
    },
    @{
        Find = "from '../../../api/axios'"
        Replace = "from '../../../api/admin'"
        FilePattern = "*Admin*"
    },
    @{
        Find = "from '../../api/axios'"
        Replace = "from '../../api/admin'"
        FilePattern = "*Admin*"
    },
    @{
        Find = "from '../../api/axios'"
        Replace = "from '../../api/auth'"
        FilePattern = "*Auth*"
    }
)

Write-Host "Starting API import migration..."

# List of files to update with their correct API module
$fileUpdates = @(
    # Client API files
    @{ File = "pages\client\student\EventRegistration\AlreadyRegistered.jsx"; API = "client" },
    @{ File = "pages\client\student\Attendance\MarkAttendance.jsx"; API = "client" },
    @{ File = "pages\client\student\Account\TeamManagement.jsx"; API = "client" },
    @{ File = "pages\client\student\Account\ProfilePage.jsx"; API = "base" },
    @{ File = "pages\client\student\Account\EditProfile.jsx"; API = "base" },
    @{ File = "pages\client\faculty\EventRegistration\FacultyEventRegistration.jsx"; API = "client" },
    @{ File = "pages\client\faculty\EventRegistration\FacultyAlreadyRegistered.jsx"; API = "client" },
    @{ File = "pages\client\faculty\Account\FacultyProfilePage.jsx"; API = "base" },
    @{ File = "pages\client\faculty\Account\FacultyProfileEdit.jsx"; API = "base" },
    
    # Admin API files
    @{ File = "components\admin\AdminLayout.jsx"; API = "admin" },
    @{ File = "components\admin\FacultyCard.jsx"; API = "admin" },
    @{ File = "components\admin\StudentCard.jsx"; API = "admin" },
    @{ File = "components\admin\attendance\PhysicalAttendancePortal.jsx"; API = "base" },
    @{ File = "components\admin\certificates\EditModal.jsx"; API = "admin" },
    @{ File = "components\admin\certificates\UploadForm.jsx"; API = "admin" },
    @{ File = "components\admin\organizer\OrganizerDashboard.jsx"; API = "admin" },
    @{ File = "pages\admin\CreateEvent.jsx"; API = "admin" },
    @{ File = "pages\admin\Dashboard.jsx"; API = "admin" },
    @{ File = "pages\admin\EditEvent.jsx"; API = "admin" },
    @{ File = "pages\admin\EventDetail.jsx"; API = "admin" },
    @{ File = "pages\admin\Events.jsx"; API = "admin" },
    @{ File = "pages\admin\ExportData.jsx"; API = "admin" },
    @{ File = "pages\admin\Faculty.jsx"; API = "admin" },
    @{ File = "pages\admin\ManageAdmin.jsx"; API = "admin" },
    @{ File = "pages\admin\ManageCertificates.jsx"; API = "admin" },
    @{ File = "pages\admin\OrganizerDashboard.jsx"; API = "base" },
    @{ File = "pages\admin\SettingsProfile.jsx"; API = "admin" },
    @{ File = "pages\admin\Students.jsx"; API = "admin" },
    @{ File = "pages\admin\Venues.jsx"; API = "admin" },
    
    # Auth API files
    @{ File = "pages\auth\ForgotPasswordPage.jsx"; API = "auth" },
    
    # Context and components
    @{ File = "components\client\AvatarUpload.jsx"; API = "base" },
    @{ File = "components\client\Navigation.jsx"; API = "base" },
    @{ File = "components\client\ProfileEventCard.jsx"; API = "base" },
    @{ File = "components\common\RegistrationRouter.jsx"; API = "client" },
    @{ File = "context\AuthContext.jsx"; API = "auth" },
    @{ File = "context\NotificationContext.jsx"; API = "admin" }
)

foreach ($update in $fileUpdates) {
    $filePath = Join-Path $rootPath $update.File
    $api = $update.API
    
    if (Test-Path $filePath) {
        Write-Host "Updating $($update.File) to use $api API..."
        
        $content = Get-Content $filePath -Raw
        
        # Replace axios import with correct API module
        $patterns = @(
            "from '../../../../api/axios'",
            "from '../../../api/axios'",
            "from '../../api/axios'",
            "from '../api/axios'"
        )
        
        foreach ($pattern in $patterns) {
            $replacement = switch ($api) {
                "client" { $pattern -replace "axios", "client" }
                "admin" { $pattern -replace "axios", "admin" }
                "auth" { $pattern -replace "axios", "auth" }
                "base" { $pattern -replace "axios", "base" }
            }
            
            if ($content.Contains($pattern)) {
                $content = $content.Replace($pattern, $replacement)
                Write-Host "  - Replaced: $pattern -> $replacement"
            }
        }
        
        # Also update API object imports if needed
        if ($api -eq "base") {
            $content = $content -replace "import \{ (adminAPI|clientAPI|authAPI) \} from", "import api from"
        }
        
        Set-Content $filePath $content -NoNewline
    } else {
        Write-Host "Warning: File not found: $filePath" -ForegroundColor Yellow
    }
}

Write-Host "Migration completed!" -ForegroundColor Green
Write-Host "Files updated: $($fileUpdates.Count)" -ForegroundColor Green
