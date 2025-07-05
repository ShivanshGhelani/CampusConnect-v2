# Venue Management System

## Overview

The Venue Management System provides comprehensive functionality for managing event venues, tracking bookings, and ensuring efficient space utilization for the CampusConnect platform.

## Features

### 1. Venue Management
- **Add Venues**: Create new venue entries with detailed information
- **View Venues**: Browse all venues with search and filtering capabilities
- **Edit Venues**: Update venue details and status
- **Venue Status**: Active, Inactive, or Under Maintenance

### 2. Booking System
- **Create Bookings**: Book venues for specific time slots
- **Conflict Detection**: Automatic checking for booking conflicts
- **Availability Check**: Real-time venue availability status
- **Booking History**: Track all past and upcoming bookings

### 3. Integration with Events
- **Event Creation**: Select venues during event creation
- **Availability Display**: Shows booked time slots with visual indicators
- **Custom Venues**: Option to use custom venues not in the system
- **Online Events**: Support for online platform links

## Backend API Endpoints

### Venue CRUD Operations
- `GET /api/v1/admin/venues` - List all venues
- `POST /api/v1/admin/venues` - Create new venue
- `GET /api/v1/admin/venues/{venue_id}` - Get venue details
- `PUT /api/v1/admin/venues/{venue_id}` - Update venue
- `DELETE /api/v1/admin/venues/{venue_id}` - Delete venue

### Booking Management
- `POST /api/v1/admin/venues/{venue_id}/book` - Book a venue
- `GET /api/v1/admin/venues/{venue_id}/availability` - Check availability
- `GET /api/v1/admin/venues/{venue_id}/bookings` - Get venue bookings

### Statistics
- `GET /api/v1/admin/venues/statistics` - Get venue statistics

## Data Models

### Venue Model
```python
{
    "id": "venue_12345",
    "name": "Main Auditorium",
    "location": "Academic Block A, Ground Floor",
    "capacity": 300,
    "description": "Large auditorium with modern AV equipment",
    "contactPersonName": "John Doe",
    "contactPersonEmail": "john.doe@college.edu",
    "contactPersonPhone": "+1-234-567-8900",
    "facilities": ["Projector", "Sound System", "Air Conditioning"],
    "accessibility": ["Wheelchair Accessible", "Elevator Access"],
    "equipmentAvailable": ["Microphones", "Speakers", "Laptop"],
    "status": "active",
    "bookings": [],
    "images": [],
    "createdAt": "2025-01-06T01:00:00Z",
    "updatedAt": "2025-01-06T01:00:00Z"
}
```

### Booking Model
```python
{
    "id": "booking_67890",
    "eventName": "Tech Conference 2025",
    "organizerName": "Jane Smith",
    "organizerEmail": "jane.smith@college.edu",
    "startTime": "10:00",
    "endTime": "17:00",
    "date": "2025-02-15",
    "attendees": 250,
    "purpose": "Annual technology conference",
    "status": "confirmed",
    "createdAt": "2025-01-06T01:00:00Z"
}
```

## Frontend Components

### Admin Venue Management (`/admin/venue`)
- **Venue List**: Grid view of all venues with search and filters
- **Add Venue Modal**: Form to create new venues
- **View Venue Modal**: Detailed venue information and booking history
- **Book Venue Modal**: Form to create new bookings
- **Statistics Dashboard**: Key metrics and utilization data

### Event Creation Integration
- **Venue Selection**: Dropdown of available venues
- **Availability Check**: Real-time booking conflict detection
- **Custom Venue Option**: Manual venue entry for non-listed locations
- **Online Event Support**: Platform link entry for virtual events

## Usage Guide

### Adding a New Venue

1. Navigate to **Admin → Venue Management**
2. Click **"Add Venue"** button
3. Fill in the venue information:
   - Basic details (name, location, capacity)
   - Contact person information
   - Optional: Facilities, accessibility features, equipment
4. Click **"Add Venue"** to save

### Booking a Venue

1. From the venue list, click **"Book"** on the desired venue
2. Fill in the booking details:
   - Event name and organizer information
   - Date and time slot
   - Expected attendees
   - Purpose/description
3. Click **"Book Venue"** to confirm

### Creating Events with Venues

1. Navigate to **Admin → Events → Create Event**
2. In the **"Mode & Location"** step:
   - Select **"Offline"** or **"Hybrid"** mode
   - Choose a venue from the dropdown
   - View venue details and availability
   - Check for booking conflicts
3. Proceed with event creation

### Checking Venue Availability

1. In the venue list, click **"View"** on any venue
2. Scroll to the **"Recent Bookings"** section
3. See all upcoming and past bookings
4. Or use the availability check during event creation

## Data Storage

The system currently uses JSON file storage for development:
- Venues: `backend/data/venues/venues.json`
- Bookings: `backend/data/venues/bookings.json`

For production, this should be migrated to a proper database system.

## Testing

Use the included test script to verify API functionality:

```bash
cd /path/to/CampusConnect
python test_venue_api.py
```

This will test:
- Venue creation and retrieval
- Booking functionality
- Availability checking
- Statistics generation

## Future Enhancements

1. **Database Integration**: Migrate from JSON to PostgreSQL/MongoDB
2. **Image Upload**: Support for venue photos
3. **Floor Plans**: Interactive venue layouts
4. **Equipment Management**: Detailed equipment tracking
5. **Maintenance Scheduling**: Planned maintenance periods
6. **Capacity Optimization**: Smart capacity management
7. **Mobile App**: Mobile interface for venue booking
8. **Integration APIs**: External calendar integration
9. **Notifications**: Email/SMS notifications for bookings
10. **Analytics**: Advanced utilization reports

## Security Considerations

1. **Authentication**: Ensure proper admin authentication
2. **Authorization**: Role-based access control
3. **Input Validation**: Sanitize all user inputs
4. **Rate Limiting**: Prevent API abuse
5. **Audit Logs**: Track all venue and booking changes

## Troubleshooting

### Common Issues

1. **"Venue not found" error**: Check venue ID and ensure venue exists
2. **Booking conflicts**: Verify time slots don't overlap with existing bookings
3. **API connection issues**: Ensure backend server is running
4. **Frontend not loading venues**: Check API endpoint accessibility

### Debug Commands

```bash
# Check if venue API module loads
python -c "from backend.api.v1.admin.venues import router; print('OK')"

# Test venue endpoints
python test_venue_api.py

# Check venue data files
ls -la backend/data/venues/
```

## Support

For issues or questions regarding the venue management system, please:

1. Check this documentation first
2. Review the API endpoint responses
3. Check the browser console for frontend errors
4. Examine backend logs for server-side issues
5. Contact the development team with specific error messages
