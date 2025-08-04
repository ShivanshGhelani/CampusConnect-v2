"""
Event Organizer Service

Handles CRUD operations for event organizers.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from database.operations import DatabaseOperations
from models.organizer import Organizer, CreateOrganizer, UpdateOrganizer, OrganizerResponse
from core.id_generator import generate_organizer_id

class OrganizerService:
    def __init__(self):
        self.db = DatabaseOperations()
        self.collection_name = "organizers"
    
    async def create_organizer(self, organizer_data: CreateOrganizer) -> OrganizerResponse:
        """Create a new organizer"""
        # Check if organizer with same email or employee_id already exists
        existing_email = await self.get_organizer_by_email(organizer_data.email)
        if existing_email:
            raise ValueError(f"Organizer with email {organizer_data.email} already exists")
        
        existing_employee = await self.get_organizer_by_employee_id(organizer_data.employee_id)
        if existing_employee:
            raise ValueError(f"Organizer with employee ID {organizer_data.employee_id} already exists")
        
        # Generate unique organizer ID
        organizer_id = generate_organizer_id(organizer_data.name, organizer_data.email)
        
        # Create organizer object
        organizer = Organizer(
            id=organizer_id,
            name=organizer_data.name,
            email=organizer_data.email,
            employee_id=organizer_data.employee_id,
            department=organizer_data.department,
            phone=organizer_data.phone,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            is_active=True
        )
        
        # Save to database
        result = await self.db.insert_one(self.collection_name, organizer.model_dump())
        if not result:
            raise RuntimeError("Failed to create organizer")
        
        return OrganizerResponse(**organizer.model_dump())
    
    async def get_organizer(self, organizer_id: str) -> Optional[OrganizerResponse]:
        """Get organizer by ID"""
        organizer_data = await self.db.find_one(self.collection_name, {"id": organizer_id})
        if organizer_data:
            return OrganizerResponse(**organizer_data)
        return None
    
    async def get_organizer_by_email(self, email: str) -> Optional[OrganizerResponse]:
        """Get organizer by email"""
        organizer_data = await self.db.find_one(self.collection_name, {"email": email})
        if organizer_data:
            return OrganizerResponse(**organizer_data)
        return None
    
    async def get_organizer_by_employee_id(self, employee_id: str) -> Optional[OrganizerResponse]:
        """Get organizer by employee ID"""
        organizer_data = await self.db.find_one(self.collection_name, {"employee_id": employee_id})
        if organizer_data:
            return OrganizerResponse(**organizer_data)
        return None
    
    async def get_all_organizers(self, skip: int = 0, limit: int = 100, active_only: bool = True) -> List[OrganizerResponse]:
        """Get all organizers with pagination"""
        query = {}
        if active_only:
            query["is_active"] = True
        
        organizers_data = await self.db.find_many(self.collection_name, query, skip=skip, limit=limit)
        return [OrganizerResponse(**org) for org in organizers_data]
    
    async def update_organizer(self, organizer_id: str, update_data: UpdateOrganizer) -> Optional[OrganizerResponse]:
        """Update organizer"""
        # Check if organizer exists
        existing_organizer = await self.get_organizer(organizer_id)
        if not existing_organizer:
            return None
        
        # Check for duplicate email or employee_id if being updated
        update_dict = update_data.model_dump(exclude_unset=True)
        
        if "email" in update_dict and update_dict["email"] != existing_organizer.email:
            existing_email = await self.get_organizer_by_email(update_dict["email"])
            if existing_email and existing_email.id != organizer_id:
                raise ValueError(f"Organizer with email {update_dict['email']} already exists")
        
        if "employee_id" in update_dict and update_dict["employee_id"] != existing_organizer.employee_id:
            existing_employee = await self.get_organizer_by_employee_id(update_dict["employee_id"])
            if existing_employee and existing_employee.id != organizer_id:
                raise ValueError(f"Organizer with employee ID {update_dict['employee_id']} already exists")
        
        # Add updated timestamp
        update_dict["updated_at"] = datetime.utcnow()
        
        # Update in database
        result = await self.db.update_one(self.collection_name, {"id": organizer_id}, {"$set": update_dict})
        if result:
            return await self.get_organizer(organizer_id)
        return None
    
    async def delete_organizer(self, organizer_id: str) -> bool:
        """Delete organizer (soft delete by marking as inactive)"""
        update_data = UpdateOrganizer(is_active=False)
        result = await self.update_organizer(organizer_id, update_data)
        return result is not None
    
    async def search_organizers(self, search_term: str, skip: int = 0, limit: int = 100, active_only: bool = True) -> List[OrganizerResponse]:
        """Search organizers by name, email, or employee_id with pagination"""
        query = {}
        if active_only:
            query["is_active"] = True
        
        # Use MongoDB regex search for name, email, or employee_id
        search_query = {
            "$and": [
                query,
                {
                    "$or": [
                        {"name": {"$regex": search_term, "$options": "i"}},
                        {"email": {"$regex": search_term, "$options": "i"}},
                        {"employee_id": {"$regex": search_term, "$options": "i"}},
                        {"department": {"$regex": search_term, "$options": "i"}}
                    ]
                }
            ]
        }
        
        organizers_data = await self.db.find_many(self.collection_name, search_query, skip=skip, limit=limit)
        return [OrganizerResponse(**org) for org in organizers_data]
    
    async def get_organizers_by_department(self, department: str, skip: int = 0, limit: int = 100, active_only: bool = True) -> List[OrganizerResponse]:
        """Get organizers by department with pagination"""
        query = {"department": department}
        if active_only:
            query["is_active"] = True
        
        organizers_data = await self.db.find_many(self.collection_name, query, skip=skip, limit=limit)
        return [OrganizerResponse(**org) for org in organizers_data]
    
    async def get_unique_departments(self) -> List[str]:
        """Get list of unique departments from all organizers"""
        # Get all organizers and extract unique departments
        organizers_data = await self.db.find_many(self.collection_name, {"is_active": True})
        departments = set()
        for org in organizers_data:
            if "department" in org and org["department"]:
                departments.add(org["department"])
        return sorted(list(departments))
