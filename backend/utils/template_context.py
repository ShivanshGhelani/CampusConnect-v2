from fastapi import Request
from utils.db_operations import DatabaseOperations

async def get_template_context(request: Request):
    """Get common context data for templates"""
    is_student_logged_in = "student" in request.session
    student_data = request.session.get("student", None)
    
    # Get student count
    students = await DatabaseOperations.find_many("students", {})
    student_count = len(students)
    
    return {
        "is_student_logged_in": is_student_logged_in,
        "student_data": student_data,
        "student_count": student_count  # Add this to context
    }
