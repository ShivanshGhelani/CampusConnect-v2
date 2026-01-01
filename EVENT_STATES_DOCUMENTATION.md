# Event Detail Page - States & Conditions Documentation

## 📍 Access the Preview Tool
Navigate to: `/admin/event-preview`

This interactive tool allows you to select different combinations of:
- Event Status
- Event Type
- User Login State
- Registration Status
- Attendance Status
- Feedback Status
- Certificate Availability

## 🎯 Event States Overview

### 1. Event Status
| Status | Description | Timeline Phase |
|--------|-------------|----------------|
| **Upcoming** | Event hasn't started yet | Registration may be open/closed |
| **Ongoing** | Event is currently happening | Attendance can be marked |
| **Completed** | Event has ended | Feedback & certificates available |
| **Cancelled** | Event was cancelled | No actions available |

### 2. Event Types
- Workshop
- Seminar
- Webinar
- Competition
- Cultural
- Sports
- Hackathon
- Conference

Each type may have different registration requirements and features.

---

## 👤 User States & Permissions

### A. Not Logged In
**What the user sees:**
- Event details (limited)
- "Login to Register" button
- Public information only

**Available Actions:**
- View event information
- Click to login/register

**Timeline:** Visible but no interactive elements

---

### B. Logged In - Not Registered

#### B1. Before Registration Opens
**Conditions:**
- User logged in
- Registration hasn't started yet
- Event status: Upcoming

**What the user sees:**
- Full event details
- Countdown to registration opening
- "Registration Opens In X days" message

**Available Actions:**
- View event details
- Set reminder (if implemented)

**Timeline:** 
- ⏳ Registration Period: PENDING (shows countdown)
- ⏳ Event Day: PENDING
- ⏳ Feedback & Certificates: PENDING

---

#### B2. Registration Open
**Conditions:**
- User logged in
- Registration period is active
- Event status: Upcoming
- Seats available

**What the user sees:**
- Full event details
- "Register Now" button (prominent, green)
- Available seats count
- Registration deadline

**Available Actions:**
- Register for event (individual/team based on event type)
- View registration requirements

**Timeline:**
- ✅ Registration Period: ACTIVE (highlighted)
- ⏳ Event Day: PENDING
- ⏳ Feedback & Certificates: PENDING

---

#### B3. Registration Closed (No Seats)
**Conditions:**
- User logged in
- Registration period ended OR seats full
- Event status: Upcoming

**What the user sees:**
- Full event details
- "Registration Closed" message (gray/red)
- Reason (seats full or period ended)

**Available Actions:**
- View event details only
- Join waiting list (if available)

**Timeline:**
- ✅ Registration Period: COMPLETED
- ⏳ Event Day: PENDING (with countdown)
- ⏳ Feedback & Certificates: PENDING

---

### C. Logged In - Registered

#### C1. Registered - Before Event Starts
**Conditions:**
- User logged in
- Successfully registered
- Event status: Upcoming
- Event hasn't started

**What the user sees:**
- Full event details
- "You're Registered!" badge (blue)
- Registration details (ticket/QR code)
- Event countdown

**Available Actions:**
- View registration details
- Cancel registration (if allowed)
- Download registration confirmation
- Add to calendar

**Timeline:**
- ✅ Registration Period: COMPLETED
- ⏳ Event Day: PENDING (countdown showing)
- ⏳ Feedback & Certificates: PENDING

---

#### C2. Registered - Event Ongoing

##### C2a. Attendance Not Marked
**Conditions:**
- User logged in & registered
- Event status: Ongoing
- Attendance not yet marked

**What the user sees:**
- Full event details
- "Mark Attendance" button (prominent, green)
- QR code for scanning
- Event progress indicator

**Available Actions:**
- Mark attendance (scan QR or manual)
- View event materials
- Access event links
- Start providing feedback (if enabled)

**Timeline:**
- ✅ Registration Period: COMPLETED
- 🔵 Event Day: ACTIVE (highlighted, pulsing)
- ⏳ Feedback & Certificates: PENDING

---

##### C2b. Attendance Marked
**Conditions:**
- User logged in & registered
- Event status: Ongoing
- Attendance successfully marked

**What the user sees:**
- Full event details
- "Attendance Confirmed" badge (green)
- Timestamp of attendance
- Event materials access

**Available Actions:**
- View event materials
- Access live sessions
- Submit early feedback (if enabled)

**Timeline:**
- ✅ Registration Period: COMPLETED
- ✅ Event Day: ACTIVE & ATTENDED (green checkmark)
- ⏳ Feedback & Certificates: PENDING

---

#### C3. Registered - Event Completed

##### C3a. Attended + Feedback Not Submitted
**Conditions:**
- User logged in & registered
- Event status: Completed
- Attendance was marked
- Feedback not submitted

**What the user sees:**
- Full event details
- "Attended" badge (green)
- "Submit Feedback" button (prominent, purple)
- Event summary

**Available Actions:**
- Submit feedback form
- View event recordings (if available)
- View attendance record

**Timeline:**
- ✅ Registration Period: COMPLETED
- ✅ Event Day: COMPLETED
- 🔵 Feedback & Certificates: ACTIVE (pending feedback)

---

##### C3b. Attended + Feedback Submitted + Certificate Available
**Conditions:**
- User logged in & registered
- Event status: Completed
- Attendance was marked
- Feedback submitted
- Certificate is ready

**What the user sees:**
- Full event details
- "Attended" badge (green)
- "Feedback Submitted" badge (purple)
- "Download Certificate" button (prominent, gold/green)
- Certificate preview

**Available Actions:**
- Download certificate (PDF)
- Share certificate
- View certificate online
- View event recordings

**Timeline:**
- ✅ Registration Period: COMPLETED
- ✅ Event Day: COMPLETED
- ✅ Feedback & Certificates: COMPLETED (all done!)

---

##### C3c. Attended + Feedback Submitted + Certificate Not Available
**Conditions:**
- User logged in & registered
- Event status: Completed
- Attendance was marked
- Feedback submitted
- Certificate not yet generated

**What the user sees:**
- Full event details
- "Attended" badge (green)
- "Feedback Submitted" badge (purple)
- "Certificate will be available soon" message

**Available Actions:**
- View event recordings
- View attendance record
- View feedback submitted

**Timeline:**
- ✅ Registration Period: COMPLETED
- ✅ Event Day: COMPLETED
- 🔵 Feedback & Certificates: PROCESSING (waiting for cert)

---

##### C3d. Attended + No Feedback Required
**Conditions:**
- User logged in & registered
- Event status: Completed
- Attendance was marked
- Event doesn't require feedback

**What the user sees:**
- Full event details
- "Attended" badge (green)
- Certificate download (if available)

**Available Actions:**
- Download certificate
- View event recordings
- View attendance record

**Timeline:**
- ✅ Registration Period: COMPLETED
- ✅ Event Day: COMPLETED
- ✅ Feedback & Certificates: COMPLETED

---

##### C3e. Registered But Did Not Attend
**Conditions:**
- User logged in & registered
- Event status: Completed
- Attendance was NOT marked

**What the user sees:**
- Full event details
- "Registered but did not attend" message (yellow/orange)
- No certificate available
- Optional late feedback (if enabled)

**Available Actions:**
- View event recordings (limited access)
- Submit late feedback (if allowed)
- View reason for non-attendance

**Timeline:**
- ✅ Registration Period: COMPLETED
- ⚠️ Event Day: MISSED (warning icon)
- ❌ Feedback & Certificates: NOT AVAILABLE

---

### D. Logged In - Waitlisted

**Conditions:**
- User logged in
- Tried to register but event was full
- On waiting list

**What the user sees:**
- Full event details
- "On Waiting List" badge (yellow)
- Position in waiting list (#5 of 10)
- Expected confirmation date

**Available Actions:**
- View waiting list position
- Cancel waiting list spot
- Get notifications if spot opens

**Timeline:**
- ⏳ Registration Period: WAITLISTED
- ⏳ Event Day: PENDING
- ⏳ Feedback & Certificates: PENDING

---

### E. Logged In - Registration Cancelled

**Conditions:**
- User logged in
- Was registered but cancelled
- Event status: Any

**What the user sees:**
- Full event details
- "Registration Cancelled" badge (red)
- Reason for cancellation
- Re-registration option (if available)

**Available Actions:**
- Re-register (if registration still open)
- View cancellation details

**Timeline:**
- ❌ Registration Period: CANCELLED
- ⏳ Event Day: PENDING (if before event)
- ❌ Feedback & Certificates: NOT AVAILABLE

---

## 🎨 UI Elements by State

### Buttons
| Button | Color | When Visible | Action |
|--------|-------|--------------|--------|
| Login to Register | Blue | Not logged in | Redirect to login |
| Register Now | Green | Logged in, registration open | Open registration form |
| Registration Opens Soon | Gray (disabled) | Before registration | Show countdown |
| Registration Closed | Red (disabled) | After registration | No action |
| Already Registered | Blue | Registered, before event | Show registration details |
| Mark Attendance | Green | Ongoing event, registered | Open QR scanner |
| Attendance Confirmed | Green (disabled) | Attendance marked | Show confirmation |
| Submit Feedback | Purple | Event completed, attended | Open feedback form |
| Feedback Submitted | Purple (disabled) | Feedback done | Show thank you |
| Download Certificate | Gold/Green | Certificate available | Download PDF |

### Badges
| Badge | Color | Condition |
|-------|-------|-----------|
| Upcoming | Blue | Event not started |
| Ongoing | Green (pulsing) | Event happening now |
| Completed | Gray | Event finished |
| Cancelled | Red | Event cancelled |
| Registered | Blue | User registered |
| Attended | Green | Attendance marked |
| Waitlisted | Yellow | On waiting list |
| Missed | Orange/Red | Registered but didn't attend |

### Timeline Icons
| Icon | Meaning | Color |
|------|---------|-------|
| ⏳ (Clock) | Pending/Waiting | Gray |
| 🔵 (Spinning) | Active/In Progress | Blue |
| ✅ (Checkmark) | Completed | Green |
| ⚠️ (Warning) | Issue/Missed | Orange |
| ❌ (Cross) | Failed/Cancelled | Red |

---

## 📊 State Combinations Matrix

| User State | Event Status | Registration Status | Attendance | Feedback | Certificate | Main Action |
|-----------|--------------|-------------------|------------|----------|-------------|-------------|
| Not Logged In | Any | - | - | - | - | Login to Register |
| Logged In | Upcoming | Not Registered (Before Reg) | - | - | - | Wait for Registration |
| Logged In | Upcoming | Not Registered (Reg Open) | - | - | - | Register Now |
| Logged In | Upcoming | Not Registered (Reg Closed) | - | - | - | Registration Closed |
| Logged In | Upcoming | Registered | - | - | - | View Registration Details |
| Logged In | Ongoing | Registered | Not Marked | - | - | Mark Attendance |
| Logged In | Ongoing | Registered | Marked | - | - | Access Event |
| Logged In | Completed | Registered | Marked | Not Submitted | - | Submit Feedback |
| Logged In | Completed | Registered | Marked | Submitted | Available | Download Certificate |
| Logged In | Completed | Registered | Not Marked | - | - | Missed Event |
| Logged In | Completed | Not Registered | - | - | - | View Only |

---

## 🔧 Testing Combinations

Use the Event Detail Preview tool (`/admin/event-preview`) to test these combinations:

### Essential Test Cases:
1. **Guest User Flow**
   - Not logged in → View event → Login prompt

2. **Registration Flow**
   - Before registration → During registration → After registration

3. **Event Participation Flow**
   - Registered → Mark attendance → Submit feedback → Get certificate

4. **Edge Cases**
   - Waitlisted user
   - Cancelled registration
   - Missed event (registered but didn't attend)
   - Event cancelled after registration

### Recommended Testing Sequence:
1. Start as not logged in
2. Login as student
3. Register for event
4. Mark attendance during event
5. Submit feedback after event
6. Download certificate

---

## 💡 Best Practices

### For Developers:
- Always check authentication state first
- Handle loading states gracefully
- Show clear error messages
- Use optimistic UI updates
- Cache event data appropriately

### For Designers:
- Use consistent colors for states
- Make CTAs prominent and clear
- Show progress clearly
- Provide helpful messages
- Use icons to reinforce states

### For Testers:
- Test all state combinations
- Verify button states
- Check timeline accuracy
- Test with different user roles
- Verify permission checks

---

## 📱 Responsive Behavior

All states should be properly displayed on:
- Mobile (320px - 768px)
- Tablet (768px - 1024px)
- Desktop (1024px+)

Key responsive considerations:
- Buttons should be touch-friendly on mobile
- Timeline should adapt to screen size
- Cards should stack on mobile
- Text should remain readable
- CTAs should stay prominent

---

## 🚀 Quick Reference

**Access Preview Tool:** `/admin/event-preview`

**Primary States:**
1. Not Logged In
2. Logged In - Not Registered
3. Logged In - Registered
4. Logged In - Attended
5. Logged In - Completed

**Key Transitions:**
- Registration: Not Registered → Registered
- Attendance: Registered → Attended
- Completion: Attended → Feedback → Certificate

**Critical Actions:**
- Register
- Mark Attendance
- Submit Feedback
- Download Certificate
