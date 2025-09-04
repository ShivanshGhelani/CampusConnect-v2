# Phase 2 Frontend Testing Plan - Event Endpoint Consolidation

**Date:** September 4, 2025  
**Phase:** Phase 2 - Aggressive Consolidation Completed  
**Endpoints Changed:** 18 endpoints reduced (191 → 173)

---

## 🔥 CRITICAL CHANGES MADE (Backend)

### 1. **Events API - CONSOLIDATED (4 → 1 endpoint)**
```bash
BEFORE:
- GET /api/v1/client/events/list
- GET /api/v1/client/events/search  
- GET /api/v1/client/events/upcoming
- GET /api/v1/client/events/categories

AFTER:
- GET /api/v1/client/events/unified?mode={list|search|upcoming|categories}
- Legacy endpoints redirect to unified (backward compatible)
```

### 2. **Registration Status - CONSOLIDATED (3 → 1 endpoint)**
```bash
BEFORE:
- GET /api/v1/client/registration/status/{event_id}
- GET /api/v1/client/registration/event/{event_id}/status  
- GET /api/v1/registrations/status/{event_id}

AFTER:  
- GET /api/v1/client/registration/event/{event_id}/status (primary)
- Other duplicates removed
```

### 3. **Legacy Routes - REMOVED (6 endpoints)**
```bash
REMOVED:
- All frontend direct redirect routes from legacy/direct_routes.py
- 6 legacy auth redirect endpoints
```

---

## 🎯 FRONTEND COMPONENTS TO TEST

### **HIGH PRIORITY - Event Display Components**

#### 1. **Homepage.jsx** ⚠️ CRITICAL
**Line 80:** `const response = await clientAPI.getEvents();`
```javascript
// CURRENT CALL (still works via legacy compatibility):
await clientAPI.getEvents()

// BACKEND PROCESSING:
events/list → events/unified?mode=list (automatic redirect)
```
**TESTS NEEDED:**
- [ ] Upcoming events section loads correctly 
- [ ] No console errors from API calls
- [ ] Event cards display properly
- [ ] Filter by "upcoming" status works
- [ ] Performance acceptable (caching active)

#### 2. **EventList.jsx** ⚠️ CRITICAL  
**Lines 334, 358:** Multiple `clientAPI.getEvents()` calls
```javascript
// CURRENT CALLS (still work via legacy compatibility):
await clientAPI.getEvents({ status: 'all', limit: 1000 })
await clientAPI.getEvents({ status: 'all', page: 2, limit: 1000 })
```
**TESTS NEEDED:**
- [ ] **Pagination works correctly** (high limit requests)
- [ ] **"All events" view loads** without errors
- [ ] **Search functionality works** (if implemented)
- [ ] **Category filtering works** (if implemented)
- [ ] **Status filtering works** (upcoming/ongoing/completed)
- [ ] **Performance is acceptable** with large datasets
- [ ] **Error handling** for failed requests
- [ ] **Loading states** display properly

### **MEDIUM PRIORITY - Admin Components**

#### 3. **Admin Events.jsx**
**Line 193:** `await adminAPI.getEvents()`
**STATUS:** ✅ NOT AFFECTED (uses admin API, not client API)

#### 4. **QR Scanner Components**
**STATUS:** ✅ NOT AFFECTED (uses admin API, not client API)

---

## 🔧 UNIFIED ENDPOINT TESTING

### **New Unified Endpoint Parameters**
```bash
GET /api/v1/client/events/unified

Query Parameters:
- mode: "list" | "search" | "upcoming" | "categories" (default: "list")
- status: "all" | "upcoming" | "ongoing" | "completed" (default: "all")  
- category: string (optional)
- q: string (search query - required for search mode)
- page: number (default: 1)
- limit: number (default: 10)
- force_refresh: boolean (default: false)
```

### **Test Cases for Unified Endpoint**

#### **Mode: "list" (Default)**
```bash
# Test normal event listing
curl "http://localhost:8000/api/v1/client/events/unified"

# Test with filters
curl "http://localhost:8000/api/v1/client/events/unified?status=upcoming&limit=50"

# Test pagination
curl "http://localhost:8000/api/v1/client/events/unified?page=2&limit=10"
```

#### **Mode: "search"**
```bash  
# Test event search
curl "http://localhost:8000/api/v1/client/events/unified?mode=search&q=hackathon"

# Test search with filters
curl "http://localhost:8000/api/v1/client/events/unified?mode=search&q=tech&status=upcoming"
```

#### **Mode: "upcoming"**
```bash
# Test upcoming events
curl "http://localhost:8000/api/v1/client/events/unified?mode=upcoming&limit=5"
```

#### **Mode: "categories"**
```bash
# Test categories list
curl "http://localhost:8000/api/v1/client/events/unified?mode=categories"
```

---

## 📋 MANUAL TESTING CHECKLIST

### **Before Testing - Setup**
- [ ] Backend server running on localhost:8000
- [ ] Frontend server running on localhost:5173  
- [ ] Database populated with test events
- [ ] Redis cache cleared for fresh testing
- [ ] Browser dev tools open for monitoring

### **Critical User Flows**

#### **🔥 Homepage Event Loading**
- [ ] Navigate to homepage (/)
- [ ] Verify "Upcoming Events" section loads 
- [ ] Check browser console for errors
- [ ] Verify event cards display correctly
- [ ] Test event card click → EventDetail page

#### **🔥 Event List Page**
- [ ] Navigate to events list page
- [ ] Verify events load with pagination
- [ ] Test "Load More" or pagination buttons
- [ ] Verify filter dropdowns work (if present)
- [ ] Test search box (if present)
- [ ] Check performance with large event lists

#### **🔥 Event Detail Pages**
- [ ] Click individual event cards
- [ ] Verify EventDetail.jsx loads correctly
- [ ] Check event registration status
- [ ] Verify all event information displays
- [ ] Test registration buttons (if applicable)

#### **⚠️ Registration Status**
- [ ] Navigate to events where user is registered
- [ ] Verify registration status shows correctly
- [ ] Check "My Registrations" page (if exists)
- [ ] Test registration status updates

### **Error Handling Tests**

#### **Network Errors**
- [ ] Disconnect internet, test error messages
- [ ] Test slow network conditions  
- [ ] Verify retry mechanisms work

#### **Invalid Requests**
- [ ] Test with invalid event IDs
- [ ] Test search with empty queries
- [ ] Test pagination beyond available pages

### **Performance Tests**

#### **Caching Verification**
- [ ] First page load (cache miss) - time response
- [ ] Second page load (cache hit) - verify faster
- [ ] Check Redis cache info in API responses
- [ ] Monitor network tab for reduced API calls

#### **Large Dataset Tests**
- [ ] Test with 100+ events
- [ ] Verify pagination handles large datasets
- [ ] Check memory usage in browser
- [ ] Test search performance with large datasets

---

## 🐛 KNOWN RISKS & MITIGATION

### **Potential Issues**

#### **1. Frontend Caching Conflicts**
**Risk:** Old cached API responses interfere with new unified responses  
**Mitigation:** Clear browser cache before testing
**Test:** Compare responses in Network tab

#### **2. Pagination Behavior Changes**  
**Risk:** EventList.jsx pagination logic breaks with unified endpoint
**Mitigation:** Test all pagination scenarios thoroughly
**Test:** Load 1000+ events, verify complete loading

#### **3. Search Functionality**
**Risk:** If frontend implements client-side search, may break with server-side search  
**Mitigation:** Verify search works end-to-end
**Test:** Search for specific event names, categories

#### **4. Filter State Management**
**Risk:** Frontend filter state doesn't match unified endpoint parameters
**Mitigation:** Check filter dropdowns map correctly to API parameters  
**Test:** Apply various filters, verify API calls match

### **Rollback Plan**
If critical issues found:
1. **Immediate:** Revert `backend/app/v1/client/events/__init__.py`
2. **Backup available:** `events-consolidated-backup.py` 
3. **Legacy endpoints** remain for compatibility
4. **No frontend changes needed** for rollback

---

## 📊 SUCCESS METRICS

### **Performance Targets**
- **Homepage load time:** < 2 seconds
- **Event list load time:** < 3 seconds  
- **Search response time:** < 1 second
- **Cache hit rate:** > 80% for repeat requests

### **Functional Targets**
- **Zero breaking changes** to existing user flows
- **All event display components** work correctly
- **Registration status** displays accurately  
- **Search and filtering** work as expected

### **API Efficiency**
- **Backend endpoints:** 191 → 173 (18 reduction achieved ✅)
- **API response consistency:** Unified format across all event operations
- **Cache effectiveness:** Reduced database queries for repeated requests

---

## 🚀 NEXT PHASE PREPARATION

### **Phase 3 Targets Identified:**
1. **Team Management:** 9 → 2 endpoints (-7 endpoints)
2. **Asset Management:** 10 → 4 endpoints (-6 endpoints)  
3. **Profile Lookup:** 3 → 1 endpoint (-2 endpoints)

### **Phase 3 Frontend Impact:**
- Team management components will need testing
- Asset-related admin pages will need verification
- Profile lookup forms need validation

**Total Phase 3 Target:** Additional 15 endpoint reduction (173 → 158)

---

**Last Updated:** September 4, 2025  
**Status:** Phase 2 Complete - Ready for Frontend Testing  
**Next:** Execute testing plan and prepare Phase 3 consolidation
