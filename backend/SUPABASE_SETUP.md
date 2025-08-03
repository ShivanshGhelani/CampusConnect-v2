# Supabase Storage Setup for Certificate Templates

## Overview
The CampusConnect certificate template system now uses Supabase Storage to store HTML template files instead of local file storage. This provides better scalability, CDN distribution, and centralized file management.

## Setup Instructions

### 1. Create a Supabase Project
1. Go to [Supabase](https://supabase.com/) and create a new project
2. Wait for the project to be ready (usually takes 2-3 minutes)

### 2. Get Your Credentials
1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://abcdefghijk.supabase.co`)
   - **anon public key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
   - **service_role secret key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### 3. Configure Environment Variables
Add these to your `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_ANON_KEY="your_anon_key_here"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"
SUPABASE_STORAGE_BUCKET="certificate-templates"
```

### 4. Create Storage Bucket (Automatic)
The system will automatically create the `certificate-templates` bucket when you first upload a template. The bucket will be:
- **Public**: Templates can be accessed via direct URLs
- **Organized by category**: Files are stored in folders like `Academics/` and `Events_and_Fests/`

### 5. Manual Bucket Setup (Optional)
If you prefer to create the bucket manually:

1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**
3. Name: `certificate-templates`
4. Set to **Public** (check the public option)
5. Click **Create bucket**

## File Organization
Templates are stored with this structure:
```
certificate-templates/
├── Academics/
│   ├── uuid1.html
│   ├── uuid2.html
│   └── ...
└── Events_and_Fests/
    ├── uuid3.html
    ├── uuid4.html
    └── ...
```

## Features

### Automatic Fallback
If Supabase Storage is not configured or unavailable, the system automatically falls back to local file storage in the `static/templates/` directory.

### Unique File Names
Each uploaded file gets a unique UUID-based filename to prevent conflicts and overwrites.

### Public URLs
All uploaded templates get public URLs that can be accessed directly:
```
https://your-project-id.supabase.co/storage/v1/object/public/certificate-templates/Academics/uuid.html
```

### Metadata Tracking
The MongoDB database stores:
- Template metadata (name, category, tags, etc.)
- File information (size, filename, storage path)
- Storage type (`supabase` or `local`)
- Public URL for direct access

## API Endpoints

### Upload Template
- **POST** `/api/v1/admin/certificate-templates/upload`
- Uploads file to Supabase Storage and saves metadata to MongoDB

### Preview Template
- **GET** `/api/v1/admin/certificate-templates/{id}/preview`
- Downloads content from Supabase Storage for preview

### Delete Template
- **DELETE** `/api/v1/admin/certificate-templates/{id}`
- Removes file from Supabase Storage and marks as inactive in MongoDB

## Benefits of Supabase Storage

1. **Scalability**: No local disk space limitations
2. **Performance**: Global CDN distribution
3. **Reliability**: Automatic backups and redundancy
4. **Security**: Built-in access controls and policies
5. **Cost-effective**: Only pay for what you use

## Troubleshooting

### Storage Not Working
1. Check your environment variables are set correctly
2. Verify your Supabase project is active
3. Ensure the service role key has storage permissions
4. Check the logs for specific error messages

### Files Not Accessible
1. Make sure the bucket is set to **Public**
2. Verify the storage policies allow public read access
3. Check if the file was uploaded successfully

### Fallback to Local Storage
If you see "Supabase Storage not available, falling back to local storage" in logs:
1. Check your Supabase credentials
2. Verify your internet connection
3. Ensure the Supabase project is running

The system will continue to work with local storage if Supabase is unavailable.
