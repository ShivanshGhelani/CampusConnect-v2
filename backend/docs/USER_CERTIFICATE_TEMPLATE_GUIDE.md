# Certificate Template Asset Usage Guide

## For Users Creating Certificate Templates

When creating certificate templates, you can use simple, clean paths for your assets instead of long relative paths. The system will automatically convert these to the correct URLs.

## Simple Asset Path Patterns

### 1. Logo Assets
Use this pattern for logos:
```html
<img src="{{ cert_asset_path('/logo/filename.ext') }}" alt="Logo">
```

**Examples:**
```html
<!-- For logos in /static/uploads/assets/logo/ -->
<img src="{{ cert_asset_path('/logo/ksv.png') }}" alt="KSV Logo">
<img src="{{ cert_asset_path('/logo/ldrp.png') }}" alt="LDRP Logo">
<img src="{{ cert_asset_path('/logo/svkm.png') }}" alt="SVKM Logo">
```

### 2. Signature Assets
Use these patterns for signatures:

**Faculty Signatures:**
```html
<img src="{{ cert_asset_path('/signature/faculty/department-name/filename.ext') }}" alt="Faculty Signature">
```

**Head of Department Signatures:**
```html
<img src="{{ cert_asset_path('/signature/head-of-department/department-name/filename.ext') }}" alt="HOD Signature">
```

**Principal Signatures:**
```html
<img src="{{ cert_asset_path('/signature/principal/filename.ext') }}" alt="Principal Signature">
```

**Examples:**
```html
<!-- Faculty signature -->
<img src="{{ cert_asset_path('/signature/faculty/information-technology/nilam.jpg') }}" alt="Coordinator Signature">

<!-- HOD signature -->
<img src="{{ cert_asset_path('/signature/head-of-department/information-technology/mehulbarot.png') }}" alt="HOD Signature">

<!-- Principal signature -->
<img src="{{ cert_asset_path('/signature/principal/gargi.png') }}" alt="Principal Signature">
```

## What Gets Converted

The `cert_asset_path()` function automatically converts your simple paths:

| Your Input | Converted To |
|------------|-------------|
| `/logo/ksv.png` | `/static/uploads/assets/logo/ksv.png` |
| `/signature/faculty/information-technology/nilam.jpg` | `/static/uploads/assets/signature/faculty/information-technology/nilam.jpg` |
| `/signature/head-of-department/information-technology/mehulbarot.png` | `/static/uploads/assets/signature/head-of-department/information-technology/mehulbarot.png` |
| `/signature/principal/gargi.png` | `/static/uploads/assets/signature/principal/gargi.png` |

## Department Name Format

For department names in signatures, use kebab-case (lowercase with hyphens):

- `information-technology` (for IT Department)
- `computer-science` (for CS Department)
- `mechanical-engineering` (for Mechanical Department)
- `electrical-engineering` (for Electrical Department)
- etc.

## Complete Template Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Certificate Template</title>
</head>
<body>
    <!-- Logos -->
    <div class="logos">
        <img src="{{ cert_asset_path('/logo/ksv.png') }}" alt="KSV Logo">
        <img src="{{ cert_asset_path('/logo/ldrp.png') }}" alt="LDRP Logo">
        <img src="{{ cert_asset_path('/logo/svkm.png') }}" alt="SVKM Logo">
    </div>

    <!-- Certificate Content -->
    <div class="content">
        <h1>Certificate of Achievement</h1>
        <p>This is to certify that</p>
        <h2>{{participant_name}}</h2>
        <p>has successfully completed...</p>
    </div>

    <!-- Signatures -->
    <div class="signatures">
        <div class="signature">
            <img src="{{ cert_asset_path('/signature/faculty/information-technology/nilam.jpg') }}" alt="Coordinator">
            <p>Prof. Nilam Thakkar</p>
            <p>Event Coordinator</p>
        </div>
        <div class="signature">
            <img src="{{ cert_asset_path('/signature/head-of-department/information-technology/mehulbarot.png') }}" alt="HOD">
            <p>Dr. Mehul Barot</p>
            <p>H.O.D - I.T</p>
        </div>
        <div class="signature">
            <img src="{{ cert_asset_path('/signature/principal/gargi.png') }}" alt="Principal">
            <p>Dr. Gargi Rajpara</p>
            <p>Principal</p>
        </div>
    </div>
</body>
</html>
```

## Benefits

1. **Simple Paths**: No need to remember complex relative paths
2. **No Breaking**: Templates work regardless of folder nesting
3. **Consistent**: Same pattern for all certificate templates
4. **Easy Migration**: When assets move, only one function needs updating

## File Organization

Your assets should be organized in the uploads folder like this:
```
static/uploads/assets/
├── logo/
│   ├── ksv.png
│   ├── ldrp.png
│   └── svkm.png
└── signature/
    ├── faculty/
    │   └── information-technology/
    │       ├── nilam.jpg
    │       └── other-faculty.jpg
    ├── head-of-department/
    │   └── information-technology/
    │       └── mehulbarot.png
    └── principal/
        └── gargi.png
```

Just use the simple paths shown above, and the system handles the rest!
