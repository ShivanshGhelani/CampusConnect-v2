# Certificate Asset Usage Guide

## Overview
This guide shows how to use the asset management system in certificate templates for easy and clean asset referencing.

## Before (Old Way)
```html
<!-- Long, error-prone relative paths -->
<img src="../../../static/uploads/assets/signature/faculty/information-technology/nilam.jpg">
<img src="../../../static/uploads/assets/logo/ksv.png">
```

## After (New Way)
```html
<!-- Clean, short function calls -->
<img src="{{ cert_faculty_signature('information-technology', 'nilam.jpg') }}">
<img src="{{ cert_logo_url('ksv.png') }}">
```

## Available Certificate Asset Functions

### 1. Logo Functions
```html
<!-- University/College logos -->
<img src="{{ cert_logo_url('ksv.png') }}" alt="KSV Logo">
<img src="{{ cert_logo_url('ldrp.png') }}" alt="LDRP Logo">
<img src="{{ cert_logo_url('svkm.png') }}" alt="SVKM Logo">
```

### 2. Signature Functions

#### Faculty Signatures
```html
<!-- Information Technology Department -->
<img src="{{ cert_faculty_signature('information-technology', 'nilam.jpg') }}">
<img src="{{ cert_faculty_signature('information-technology', 'john_doe.png') }}">

<!-- Computer Science Department -->
<img src="{{ cert_faculty_signature('computer-science', 'jane_smith.jpg') }}">
```

#### Head of Department Signatures
```html
<!-- HOD signatures -->
<img src="{{ cert_hod_signature('information-technology', 'mehulbarot.png') }}">
<img src="{{ cert_hod_signature('computer-science', 'hod_cs.jpg') }}">
```

#### Principal Signatures
```html
<!-- Principal signatures (no department needed) -->
<img src="{{ cert_principal_signature('gargi.png') }}">
<img src="{{ cert_principal_signature('alternate_principal.jpg') }}">
```

### 3. Generic Asset Functions (Still Available)
```html
<!-- For any other assets -->
<img src="{{ upload_url('assets/custom-folder/image.png') }}">
<img src="{{ static_url('css/certificate-styles.css') }}">
```

## Complete Certificate Template Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>Certificate</title>
    <!-- CSS assets -->
    <link rel="stylesheet" href="{{ css_url('certificate.css') }}">
</head>
<body>
    <!-- Logo Section -->
    <div class="logos">
        <img src="{{ cert_logo_url('ksv.png') }}" alt="KSV Logo">
        <img src="{{ cert_logo_url('ldrp.png') }}" alt="LDRP Logo">
        <img src="{{ cert_logo_url('svkm.png') }}" alt="SVKM Logo">
    </div>

    <!-- Certificate Content -->
    <div class="certificate-content">
        <h1>Certificate of Participation</h1>
        <p>This certifies that <strong>{{participant_name}}</strong></p>
        <p>from team <strong>"{{team_name}}"</strong></p>
        <p>has successfully participated in {{event_title}}</p>
    </div>

    <!-- Signature Section -->
    <div class="signatures">
        <div class="signature">
            <img src="{{ cert_faculty_signature('information-technology', 'nilam.jpg') }}" alt="Coordinator">
            <p>Prof. Nilam Thakkar<br>Event Coordinator</p>
        </div>
        
        <div class="signature">
            <img src="{{ cert_hod_signature('information-technology', 'mehulbarot.png') }}" alt="HOD">
            <p>Dr. Mehul Barot<br>H.O.D - I.T</p>
        </div>
        
        <div class="signature">
            <img src="{{ cert_principal_signature('gargi.png') }}" alt="Principal">
            <p>Dr. Gargi Rajpara<br>Principal</p>
        </div>
    </div>
</body>
</html>
```

## Asset Organization Structure

Your assets should be organized in the uploads folder like this:

```
static/uploads/assets/
├── logo/
│   ├── ksv.png
│   ├── ldrp.png
│   ├── svkm.png
│   └── additional.png
└── signature/
    ├── faculty/
    │   ├── information-technology/
    │   │   ├── nilam.jpg
    │   │   ├── john_doe.png
    │   │   └── jane_smith.jpg
    │   └── computer-science/
    │       ├── faculty1.jpg
    │       └── faculty2.png
    ├── head-of-department/
    │   ├── information-technology/
    │   │   └── mehulbarot.png
    │   └── computer-science/
    │       └── hod_cs.jpg
    └── principal/
        ├── gargi.png
        └── alternate_principal.jpg
```

## Benefits

1. **Clean Code**: No more long relative paths
2. **Error Prevention**: Functions handle path construction
3. **Maintainability**: Easy to reorganize assets
4. **Consistency**: Same pattern across all certificates
5. **Readability**: Clear, descriptive function names

## Migration from Old Templates

### Find and Replace Patterns:

1. **Logos:**
   ```
   Find: ../../../static/uploads/assets/logo/ksv.png
   Replace: {{ cert_logo_url('ksv.png') }}
   ```

2. **Faculty Signatures:**
   ```
   Find: ../../../static/uploads/assets/signature/faculty/information-technology/nilam.jpg
   Replace: {{ cert_faculty_signature('information-technology', 'nilam.jpg') }}
   ```

3. **HOD Signatures:**
   ```
   Find: ../../../static/uploads/assets/signature/head-of-department/information-technology/mehulbarot.png
   Replace: {{ cert_hod_signature('information-technology', 'mehulbarot.png') }}
   ```

4. **Principal Signatures:**
   ```
   Find: ../../../static/uploads/assets/signature/principal/gargi.png
   Replace: {{ cert_principal_signature('gargi.png') }}
   ```

## Testing

You can test your certificate templates by checking if assets exist:

```html
<!-- Conditional asset loading -->
{% if assets.asset_exists('uploads/assets/logo/ksv.png') %}
    <img src="{{ cert_logo_url('ksv.png') }}" alt="KSV Logo">
{% else %}
    <div class="placeholder-logo">Logo Not Found</div>
{% endif %}
```

This system makes certificate template management much cleaner and more maintainable!
