# CampusConnect API Endpoint Testing Guide
# Generated: August 9, 2025
# Testing the fixed admin endpoints

## TEST 1: Analytics Endpoint (SHOULD WORK)
echo "Testing Analytics Endpoint..."
curl -X GET "http://localhost:8000/api/v1/admin/analytics/overview" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

## TEST 2: Venues List Endpoint (SHOULD WORK NOW)
echo "Testing Venues List Endpoint..."
curl -X GET "http://localhost:8000/api/v1/admin/venues/list" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

## TEST 3: Users List Endpoint (NEW - SHOULD WORK NOW)
echo "Testing Users List Endpoint for Students..."
curl -X GET "http://localhost:8000/api/v1/admin/users/list?user_type=student&limit=10" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

echo "Testing Users List Endpoint for Faculty..."
curl -X GET "http://localhost:8000/api/v1/admin/users/list?user_type=faculty&limit=10" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

## TEST 4: Events List Endpoint (SHOULD WORK)
echo "Testing Events List Endpoint..."
curl -X GET "http://localhost:8000/api/v1/admin/events/list?status=all" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

## FRONTEND TESTING NOTES:
## After these fixes, the following admin tabs should work:
## ✅ Dashboard (analytics overview)
## ✅ Events (events list)
## ✅ Students (users list with user_type=student)
## ✅ Faculty (users list with user_type=faculty)
## ✅ Venues (venues list)
## ✅ Certificates (certificate templates)

## REMAINING ISSUES TO CHECK:
## - Manage Admin tab might need admin users endpoint
## - Certificate templates might need separate endpoints
## - Asset management might need separate endpoints

## API ENDPOINTS ADDED/FIXED:
## 1. Added: GET /api/v1/admin/analytics/overview
## 2. Added: GET /api/v1/admin/venues/list (alias for /api/v1/admin/venues/)
## 3. Added: GET /api/v1/admin/users/list (with user_type filter)
## 4. Fixed: Frontend venue API calls to use proper RESTful endpoints

echo "API endpoint fixes completed!"
echo "Please test the admin dashboard tabs now."
