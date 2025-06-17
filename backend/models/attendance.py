from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid


class AttendanceRecord(BaseModel):
    attendance_id: Optional[str] = Field(default=None, description="Auto-generated unique attendance ID")
    registration_id: str = Field(..., description="Registration ID of the student")
    event_id: str = Field(..., description="Event ID for which attendance is marked")
    enrollment_no: str = Field(..., description="Student enrollment number")
    full_name: str = Field(..., description="Full name of the student")
    email: str = Field(..., description="Email address of the student")
    mobile_no: str = Field(..., description="Mobile number of the student")
    department: str = Field(..., description="Department of the student")
    semester: int = Field(..., description="Current semester of the student")
    event_name: str = Field(..., description="Name of the event")
    attendance_marked_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Timestamp when attendance was marked")
    marked_by: str = Field(..., description="Who marked the attendance (e.g., Student Self-Service)")
    attendance_status: str = Field(default="present", description="Attendance status (present/absent)")

    @classmethod
    def get_department_code(cls, department: str) -> str:
        """Get department code from department name"""
        # Extract first two letters of the department name
        dept_parts = department.split()
        if len(dept_parts) > 1:
            # For "Information Technology" -> "IT"
            return "".join(word[0] for word in dept_parts)[:2].upper()
        else:
            # For single word departments
            return dept_parts[0][:2].upper()

    @classmethod
    def get_event_number(cls, event_id: str) -> str:
        """Extract event number from event ID
        Example: TECH_2025_101 -> 101, CULTURAL_2024_205 -> 205
        """
        parts = event_id.split('_')
        if len(parts) >= 3:
            return parts[-1]  # Get the last part (usually the event number)
        else:
            # Fallback to last 3 characters
            return event_id[-3:]

    @classmethod
    def generate_attendance_id(cls, enrollment_no: str, full_name: str, event_id: str) -> str:
        """Generate a simple, memorable attendance ID
        Format: ATD + LAST4DIGITS_OF_ENROLLMENT + EVENT_NUMBER
        Example: ATD0043-101 for enrollment 22BEIT30043 attending event TECH_2025_101
        
        This format is:
        - Easy to remember (only enrollment digits + event number)
        - Easy to type and share
        - Clearly identifies the student and event
        - Short and practical for certificates and records
        """
        # Get last 4 digits from enrollment number
        enrollment_digits = "".join(filter(str.isdigit, enrollment_no))
        last_four_digits = enrollment_digits[-4:] if len(enrollment_digits) >= 4 else enrollment_digits.zfill(4)
        
        # Get event number
        event_number = cls.get_event_number(event_id)
        
        # Format: ATD + 4digits + - + event_number
        return f"ATD{last_four_digits}-{event_number}"

    @classmethod
    def generate_unique_attendance_id(cls, enrollment_no: str, full_name: str, department: str, event_id: str) -> str:
        """Generate a unique attendance ID
        This method maintains backward compatibility but uses the simpler format
        """
        return cls.generate_attendance_id(enrollment_no, full_name, event_id)

    def dict_for_db(self) -> dict:
        """Convert to dictionary format suitable for database storage"""
        return {
            "attendance_id": self.attendance_id,
            "registration_id": self.registration_id,
            "event_id": self.event_id,
            "enrollment_no": self.enrollment_no,
            "full_name": self.full_name,
            "email": self.email,
            "mobile_no": self.mobile_no,
            "department": self.department,
            "semester": self.semester,
            "event_name": self.event_name,
            "attendance_marked_at": self.attendance_marked_at,
            "marked_by": self.marked_by,
            "attendance_status": self.attendance_status
        }


# Example usage and testing (commented out)
if __name__ == "__main__":
    # Example attendance record
    attendance = AttendanceRecord(
        registration_id="IT043SG",
        event_id="TECH_2025_101",
        enrollment_no="22BEIT30043",
        full_name="Shivansh Ghelani",
        email="shivansh_22043@ldrp.ac.in",
        mobile_no="8980811621",
        department="Information Technology",
        semester=7,
        event_name="Tech Talk on AI",
        marked_by="Student Self-Service (22BEIT30043)",
        attendance_status="present"
    )

    # Generate attendance ID
    attendance.attendance_id = AttendanceRecord.generate_unique_attendance_id(
        attendance.enrollment_no, 
        attendance.full_name, 
        attendance.department, 
        attendance.event_id
    )
    
    print(f"Generated Attendance ID: {attendance.attendance_id}")
    # Should be something like: ATD0043-101 (simple and memorable)
