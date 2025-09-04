# CampusConnect Endpoint Consolidation Matrix

**Date:** September 4, 2025  
**Purpose:** Detailed mapping of which endpoints can be safely consolidated

---

## CONSOLIDATION MAPPING TABLE

| Current Endpoints | Consolidation Target | Priority | Risk Level | Estimated Savings |
|-------------------|---------------------|----------|------------|------------------|
| **AUTHENTICATION & STATUS** | | | | |
| `/api/v1/auth/admin/status`<br>`/api/v1/auth/student/status`<br>`/api/v1/auth/faculty/status`<br>`/api/v1/auth/api/status`<br>`/api/auth/api/status` | `/api/v1/auth/status` | HIGH | LOW | 5 endpoints |
| **LOGIN REDIRECTS** | | | | |
| 6 different login redirect endpoints | 2 unified redirects | HIGH | LOW | 4 endpoints |
| 2 different logout redirect endpoints | 1 unified logout | HIGH | LOW | 1 endpoint |
| **PROFILE MANAGEMENT** | | | | |
| `/api/v1/client/profile/team-details/{event_id}/{team_id}`<br>`/api/v1/client/profile/team-info/{event_id}/{team_id}`<br>`/api/v1/client/profile/team-info-debug/{event_id}/{team_id}`<br>`/api/v1/client/profile/team-registration-details/{event_id}` | `/api/v1/client/profile/team/{event_id}/complete` | MEDIUM | MEDIUM | 4 → 1 endpoint |
| 5 separate team management endpoints | `/api/v1/client/profile/team/{event_id}/actions` | MEDIUM | MEDIUM | 5 → 1 endpoint |
| **EVENT MANAGEMENT** | | | | |
| `/api/v1/client/events/list`<br>`/api/v1/client/events/upcoming`<br>`/api/v1/client/events/search`<br>`/api/v1/client/events/categories` | `/api/v1/client/events/unified` | MEDIUM | LOW | 4 → 1 endpoint |
| **REGISTRATION** | | | | |
| `/api/v1/client/registration/status/{event_id}`<br>`/api/v1/client/registration/event/{event_id}/status`<br>`/api/v1/registrations/status/{event_id}` | `/api/v1/client/registration/status/{event_id}` | HIGH | LOW | 3 → 1 endpoint |
| `/api/v1/client/registration/lookup/faculty/{employee_id}`<br>`/api/v1/client/registration/lookup/student/{enrollment_no}`<br>`/api/v1/client/registration/lookup/student/{enrollment_no}/eligibility/{event_id}` | `/api/v1/client/registration/lookup/{user_id}` | MEDIUM | MEDIUM | 3 → 1 endpoint |
| **ASSET MANAGEMENT** | | | | |
| 10 separate asset endpoints | 4 RESTful endpoints | MEDIUM | MEDIUM | 10 → 4 endpoints |
| **LEGACY CLEANUP** | | | | |
| 12 legacy auth endpoints | REMOVE | HIGH | LOW | 12 endpoints |
| 10 legacy redirect endpoints | REMOVE | HIGH | LOW | 10 endpoints |

---

## USAGE ANALYSIS BY ENDPOINT

### High-Traffic Endpoints (Keep & Optimize)
```
✅ /api/v1/client/profile/complete-profile - OPTIMIZED
✅ /api/v1/client/profile/faculty/complete-profile - OPTIMIZED  
⚡ /api/v1/client/events/details/{event_id} - CACHING IN PROGRESS
🔄 /api/v1/client/events/list - NEEDS CACHING
🔄 /api/v1/auth/student/login - OPTIMIZED
🔄 /api/v1/auth/faculty/login - OPTIMIZED
```

### Medium-Traffic Endpoints (Consolidate)
```
🟡 Team management endpoints (9 endpoints → 3)
🟡 Asset management endpoints (10 endpoints → 4)
🟡 Registration status endpoints (3 endpoints → 1)
🟡 Event search/filter endpoints (4 endpoints → 1)
```

### Low-Traffic Endpoints (Remove/Merge)
```
🔴 Legacy auth redirects (12 endpoints)
🔴 Debug endpoints in production (5 endpoints)  
🔴 Duplicate status checks (5 endpoints)
🔴 Old direct route handlers (10 endpoints)
```

---

## FRONTEND USAGE MAPPING

### EventDetail.jsx
**Currently Uses:**
- `GET /api/v1/client/events/details/{event_id}`

**Optimization Applied:** ✅ Event caching implemented  
**Expected Reduction:** 50% fewer API calls

### ProfilePage.jsx (Student)
**Currently Uses:**
- `GET /api/v1/client/profile/complete-profile`

**Optimization Applied:** ✅ Profile caching implemented  
**Expected Reduction:** 71% fewer API calls

### ProfilePage.jsx (Faculty)  
**Currently Uses:**
- `GET /api/v1/client/profile/faculty/complete-profile`

**Optimization Applied:** ✅ Profile caching implemented
**Expected Reduction:** 50% fewer API calls

### Event Registration Components
**Currently Uses:** 3 different registration status endpoints
**Recommended:** Consolidate to 1 endpoint
**Expected Impact:** Cleaner code, fewer duplicate calls

### Team Management Components
**Currently Uses:** 9 separate endpoints for team operations
**Recommended:** 3 consolidated endpoints
**Expected Impact:** 66% reduction in team-related API calls

---

## IMPLEMENTATION PRIORITY MATRIX

### Phase 1: Immediate (This Week)
| Action | Endpoints Affected | Difficulty | Risk | Impact |
|--------|-------------------|------------|------|---------|
| Remove legacy auth | 12 endpoints | LOW | LOW | HIGH |
| Consolidate status | 5 → 1 endpoint | LOW | LOW | HIGH |
| Clean redirects | 8 → 2 endpoints | LOW | LOW | MEDIUM |
| **TOTAL PHASE 1** | **-25 endpoints** | | | |

### Phase 2: Strategic (Next Week)  
| Action | Endpoints Affected | Difficulty | Risk | Impact |
|--------|-------------------|------------|------|---------|
| Event list unification | 4 → 1 endpoint | MEDIUM | LOW | HIGH |
| Registration status | 3 → 1 endpoint | LOW | LOW | MEDIUM |
| Add event caching | 0 new endpoints | MEDIUM | LOW | HIGH |
| **TOTAL PHASE 2** | **-6 endpoints** | | | |

### Phase 3: Advanced (Week 3-4)
| Action | Endpoints Affected | Difficulty | Risk | Impact |
|--------|-------------------|------------|------|---------|
| Team management | 9 → 3 endpoints | HIGH | MEDIUM | HIGH |
| Asset management | 10 → 4 endpoints | MEDIUM | MEDIUM | MEDIUM |
| Lookup consolidation | 3 → 1 endpoint | MEDIUM | MEDIUM | LOW |
| **TOTAL PHASE 3** | **-15 endpoints** | | | |

---

## CACHE-FIRST ENDPOINTS STRATEGY

### Implement Caching (18 endpoints)
```javascript
// High-frequency endpoints that need caching
const CACHEABLE_ENDPOINTS = [
  '/api/v1/client/events/details/{event_id}',     // 5min cache ⚡ IN PROGRESS
  '/api/v1/client/events/list',                  // 2min cache
  '/api/v1/admin/events/stats',                  // 10min cache  
  '/api/v1/admin/assets/list',                   // 15min cache
  '/api/v1/admin/venues/list',                   // 1hr cache
  '/api/v1/client/events/categories',            // 1hr cache
  // ... 12 more endpoints
];
```

### Cache Implementation Pattern
```javascript
// Pattern already proven successful with profile endpoints
1. Fast cache check first
2. Prevent duplicate calls (1-second threshold)
3. Smart cache invalidation
4. Comprehensive error handling
```

---

## ENDPOINT ELIMINATION CHECKLIST

### ✅ Safe to Remove (32 endpoints)
- [x] Legacy auth endpoints (12)
- [x] Duplicate status endpoints (5) 
- [x] Redundant redirects (8)
- [x] Debug endpoints (4)
- [x] Unused profile endpoints (3)

### ⚠️ Consolidate Carefully (24 endpoints)
- [ ] Team management (9 → 3)
- [ ] Asset management (10 → 4) 
- [ ] Event operations (4 → 1)
- [ ] Registration lookups (3 → 1)

### 🚫 Keep As-Is (Critical endpoints)
- Core authentication flows
- Primary event registration
- Essential admin functions
- Active communication systems

---

## SUCCESS METRICS

### Target Reductions
- **Total Endpoints:** 185 → 132 (28.6% reduction)
- **High-traffic duplicates:** Eliminated 
- **Cache hit rate:** >80% for frequent endpoints
- **API response time:** <200ms for cached endpoints
- **Database load:** 50-70% reduction

### Quality Measures  
- Zero functionality loss
- Maintained backward compatibility
- Improved developer experience
- Better error handling
- Cleaner API documentation

---

**Last Updated:** September 4, 2025  
**Review Schedule:** Weekly during implementation phases
