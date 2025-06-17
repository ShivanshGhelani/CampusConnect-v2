# Asset Usage Examples

This document shows how to use static assets (images, CSS, JS, etc.) from anywhere in the project.

## 1. In Python Files (Routes, Models, etc.)

```python
# Import asset functions
from config.paths import assets, static_url, css_url, js_url, image_url

# Example usage in a route
@app.get("/example")
async def example_route():
    # Get URLs for assets
    logo_url = image_url("logo.png")  # /static/images/logo.png
    style_url = css_url("main.css")   # /static/css/main.css
    script_url = js_url("app.js")     # /static/js/app.js
    
    # Check if asset exists
    if assets.asset_exists("images/banner.jpg"):
        banner_url = image_url("banner.jpg")
    
    # Get file path for processing
    logo_path = assets.get_static_file_path("images/logo.png")
    
    return {
        "logo": logo_url,
        "stylesheet": style_url,
        "script": script_url
    }
```

## 2. In Jinja2 Templates

```html
<!-- All asset functions are available globally in templates -->
<!DOCTYPE html>
<html>
<head>
    <!-- CSS files -->
    <link rel="stylesheet" href="{{ css_url('main.css') }}">
    <link rel="stylesheet" href="{{ css_url('components.css') }}">
    
    <!-- Favicon -->
    <link rel="icon" href="{{ static_url('favicon.ico') }}">
</head>
<body>
    <!-- Images -->
    <img src="{{ image_url('logo.png') }}" alt="Logo">
    <img src="{{ image_url('hero-banner.jpg') }}" alt="Hero Banner">
    
    <!-- Uploaded files -->
    <img src="{{ upload_url('user-avatar.jpg') }}" alt="User Avatar">
    
    <!-- JavaScript files -->
    <script src="{{ js_url('main.js') }}"></script>
    <script src="{{ js_url('components.js') }}"></script>
    
    <!-- Dynamic asset checking -->
    {% if assets.asset_exists('images/special-banner.jpg') %}
        <img src="{{ image_url('special-banner.jpg') }}" alt="Special Banner">
    {% endif %}
    
    <!-- Generic static files -->
    <a href="{{ static_url('documents/brochure.pdf') }}">Download Brochure</a>
</body>
</html>
```

## 3. In Email Templates

```html
<!-- Email templates can also access assets -->
<html>
<body>
    <!-- Use absolute URLs for email images -->
    <img src="https://your-domain.com{{ image_url('email-logo.png') }}" alt="Logo">
    
    <!-- Background images -->
    <div style="background-image: url('https://your-domain.com{{ image_url('email-bg.jpg') }}');">
        Email content here...
    </div>
</body>
</html>
```

## 4. In JavaScript Files

```javascript
// If you need to reference assets in JS, pass them from templates
// In your template:
<script>
    const ASSETS = {
        logo: "{{ image_url('logo.png') }}",
        defaultAvatar: "{{ image_url('default-avatar.png') }}",
        loadingGif: "{{ image_url('loading.gif') }}"
    };
</script>
<script src="{{ js_url('app.js') }}"></script>

// In app.js:
function showLoadingImage() {
    const img = document.createElement('img');
    img.src = ASSETS.loadingGif;
    document.body.appendChild(img);
}
```

## 5. Asset Organization

```
static/
├── css/
│   ├── main.css
│   ├── admin.css
│   └── components.css
├── js/
│   ├── main.js
│   ├── admin.js
│   └── components.js
├── images/
│   ├── logo.png
│   ├── favicon.ico
│   ├── hero-banner.jpg
│   └── icons/
│       ├── edit.svg
│       └── delete.svg
├── uploads/
│   ├── certificates/
│   └── user-avatars/
└── documents/
    └── brochure.pdf
```

## 6. Programmatic Asset Management

```python
from config.paths import assets

# List all CSS files
css_files = assets.list_assets("css")
print(css_files)  # ['css/main.css', 'css/admin.css', ...]

# List all images
images = assets.list_assets("images")
print(images)  # ['images/logo.png', 'images/hero-banner.jpg', ...]

# Check if specific assets exist
if assets.asset_exists("images/logo.png"):
    print("Logo exists!")

# Get file path for processing
logo_path = assets.get_static_file_path("images/logo.png")
with open(logo_path, 'rb') as f:
    # Process the image file
    pass
```

## 7. Route Examples

```python
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from config.paths import image_url, css_url, js_url

@app.get("/dashboard")
async def dashboard(request: Request):
    context = {
        "request": request,
        "page_title": "Dashboard",
        # Assets are already available in templates globally,
        # but you can also pass them explicitly if needed
        "custom_logo": image_url("custom-logo.png")
    }
    return templates.TemplateResponse("dashboard.html", context)
```

## Benefits

1. **Centralized Management**: All asset paths managed in one place
2. **Global Access**: Available from anywhere in the project
3. **URL Generation**: Automatic URL generation for web access
4. **File Path Access**: Get actual file paths for server-side processing
5. **Existence Checking**: Verify assets exist before using them
6. **Easy Maintenance**: Change base paths without updating every reference
7. **Template Integration**: Seamlessly available in all Jinja2 templates
