from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime, timezone


class RegistrationForm(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, description="Full name of the participant")
    enrollment_no: str = Field(..., min_length=3, max_length=20, description="Student enrollment number")
    email: EmailStr = Field(..., description="Valid institute email address")
    mobile_no: str = Field(..., pattern="^[0-9]{10}$", description="10-digit mobile number")
    department: str = Field(..., min_length=2, max_length=50, description="Department name")
    semester: int = Field(..., ge=1, le=8, description="Current semester (1-8)")
    gender: str = Field(..., description="Gender (male/female/other)")
    date_of_birth: datetime = Field(..., description="Date of birth")
    registrar_id: Optional[str] = Field(default=None, description="Auto-generated registrar ID")
    registration_datetime: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Registration timestamp")

    @property
    def year(self) -> int:
        """Calculate year based on semester"""
        return (self.semester - 1) // 2 + 1

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
    def generate_registrar_id(cls, enrollment_no: str, full_name: str, department: str) -> str:
        """Generate a unique registrar ID
        Format: DEPARTMENTCODE + LAST3DIGITS + INITIALS
        Example: IT043SG for Shivansh Ghelani with enrollment 22BEIT30043 in Information Technology
        """
        # Get department code (e.g., IT for Information Technology)
        dept_code = cls.get_department_code(department)
        
        # Get last 3 digits from enrollment number
        last_three_digits = "".join(filter(str.isdigit, enrollment_no))[-3:]
        
        # Get initials from full name
        name_parts = full_name.split()
        initials = ''.join(part[0].upper() for part in name_parts)
        
        return f"{dept_code}{last_three_digits}{initials}"


# # Example registrations showing the new registrar ID format
# registration1 = RegistrationForm(
#     full_name="Shivansh Ghelani",
#     enrollment_no="22BEIT30043",
#     email="shivansh_22043@ldrp.ac.in",
#     mobile_no="8980811621",
#     department="Information Technology",
#     semester=7,
#     gender="male",
#     date_of_birth=datetime(2004, 5, 15),
# )

# registration2 = RegistrationForm(
#     full_name="Shivansh Ghelani",
#     enrollment_no="22BEIT30043",
#     email="shivansh_22043@ldrp.ac.in",
#     mobile_no="8980811621",
#     department="Computer Science",
#     semester=7,
#     gender="male",
#     date_of_birth=datetime(2004, 5, 15),
# )

# registration3 = RegistrationForm(
#     full_name="Priya Patel",
#     enrollment_no="21BECE40015",
#     email="priya_40015@ldrp.ac.in",
#     mobile_no="9876543210",
#     department="Electronics",
#     semester=5,
#     gender="female",
#     date_of_birth=datetime(2003, 8, 22),
# )

# # Generate and print example registrar IDs
# registration1.registrar_id = RegistrationForm.generate_registrar_id(
#     registration1.enrollment_no, registration1.full_name, registration1.department
# )
# print(f"Generated Registrar ID1: {registration1.registrar_id}")  # Should be IT043SG

# registration2.registrar_id = RegistrationForm.generate_registrar_id(
#     registration2.enrollment_no, registration2.full_name, registration2.department
# )
# print(f"Generated Registrar ID2: {registration2.registrar_id}")  # Should be CS043SG

# registration3.registrar_id = RegistrationForm.generate_registrar_id(
#     registration3.enrollment_no, registration3.full_name, registration3.department
# )
# print(f"Generated Registrar ID3: {registration3.registrar_id}")  # Should be EL015PP
