# EventDetail Debug Mode Guide

## 🎯 Purpose
Test different UI states of the EventDetail page without creating real events or waiting for time-based conditions.

## 🔑 How to Activate

**Press `Alt + Shift + D` on any event detail page**

A black debug panel will appear in the bottom-right corner with a pulsing yellow dot.

## 🎮 Controls Available

### Event Status
Override the current event status:
- **Registration Not Started** - Shows "Registration Opens Soon"
- **Registration Open** - Shows "Register Now" button (green)
- **Registration Closed** - Shows "Registration Closed" (red)
- **Event Ongoing** - Shows "Mark Attendance" button (orange)
- **Event Completed** - Shows feedback/certificate options

### Registration Status
Override your registration state:
- **Registered** - Shows "You're Registered!" badge
- **Not Registered** - Shows registration buttons
- **Waitlisted** - Shows waiting list badge

### Attendance
- **Marked** - Shows "Processing..." / attendance confirmed
- **Not Marked** - Shows "Mark Attendance" button

### Feedback
- **Submitted** - Marks feedback as already submitted
- **Not Submitted** - Shows "Submit Feedback" button

### Certificate
- **Available** - Shows "Download Certificate" button
- **Not Available** - Hides certificate download

## 📌 Visual Indicators

When debug mode is active:
- 🛠️ **DEBUG MODE** badge appears in top-left corner
- Black control panel in bottom-right
- Yellow pulsing dot indicator
- All changes apply instantly

## 🔄 How to Reset

**Method 1:** Refresh the page (F5 or Ctrl+R)
- All debug overrides are cleared
- Page returns to actual event data

**Method 2:** Toggle off debug mode
- Press `Alt + Shift + D` again to hide the panel
- Or click the X button on the panel

**Method 3:** Select "-- Use Real --" for each control
- Manually reset individual fields to actual data

## 💡 Use Cases

### Test Registration Flow
1. Activate debug mode
2. Set Event Status to "Registration Open"
3. Set Registration Status to "Not Registered"
4. See the green "Register Now" button

### Test Event Day
1. Set Event Status to "Event Ongoing"
2. Set Registration Status to "Registered"
3. Set Attendance to "Not Marked"
4. See the "Mark Attendance" button

### Test Completion Flow
1. Set Event Status to "Event Completed"
2. Set Attendance to "Marked"
3. Set Feedback to "Not Submitted"
4. See the "Submit Feedback" button

### Test Certificate Download
1. Set Event Status to "Event Completed"
2. Set Attendance to "Marked"
3. Set Feedback to "Submitted"
4. Set Certificate to "Available"
5. See the "Download Certificate" button

## ⚠️ Important Notes

- **Temporary Only:** All changes are lost on page refresh
- **Visual Only:** Does not affect actual database data
- **Client-Side:** Works only in the browser, no backend changes
- **Development Tool:** For testing UI states during development
- **No Persistence:** Uses React state, not localStorage

## 🎨 Design States to Test

### Status Badge Colors
- Blue = Upcoming
- Green = Registration Open (pulsing)
- Orange/Red = Event Ongoing (pulsing)
- Red = Registration Closed
- Purple = Completed/Certificate Ready

### Button States
- **Green** = Primary action (Register, Download Certificate)
- **Orange/Red** = Active event (Mark Attendance)
- **Gray** = Disabled/Not available
- **Blue** = Informational (Already Registered)

### Timeline Phases
1. **Registration Period** - Before → Active → Completed
2. **Event Day** - Pending → Active → Completed
3. **Feedback & Certificates** - Pending → Active → Completed

## 🚀 Quick Test Scenarios

```
Scenario 1: New User Discovering Event
- Event: Registration Open
- User: Not Registered
- Expected: Green "Register Now" button

Scenario 2: Registered User Waiting
- Event: Registration Open
- User: Registered
- Expected: Blue "You're Registered!" badge

Scenario 3: Event Day - Mark Attendance
- Event: Event Ongoing
- User: Registered
- Attendance: Not Marked
- Expected: Orange "Mark Attendance" button

Scenario 4: Post-Event Feedback
- Event: Event Completed
- User: Registered
- Attendance: Marked
- Feedback: Not Submitted
- Expected: Purple "Submit Feedback" button

Scenario 5: Certificate Ready
- Event: Event Completed
- Attendance: Marked
- Feedback: Submitted
- Certificate: Available
- Expected: Gold "Download Certificate" button
```

## 🔧 Technical Details

**Implementation:**
- Uses React state (not persisted)
- Keyboard event listener for Ctrl+Shift+D
- Effective values override real API data
- Panel positioned with `z-index: 9999`

**Override Logic:**
```javascript
const effectiveValue = debugMode && debugOverrides.value !== null 
  ? debugOverrides.value 
  : actualValue;
```

**Reset on:**
- Page refresh/reload
- Navigation away from page
- Browser close

## 📝 Notes

- Perfect for designers to see all possible states
- Great for testing edge cases
- Helps document UI behavior
- No need to wait for actual events
- No need to manipulate database

---

**Remember:** This is a development/testing tool. Always refresh the page to see actual event data!
