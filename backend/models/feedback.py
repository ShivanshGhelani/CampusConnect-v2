"""Event feedback model."""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class EventFeedback(BaseModel):
    """Event feedback model."""
    feedback_id: str
    registration_id: str
    event_id: str
    enrollment_no: str
    name: str
    email: Optional[str] = None
    overall_satisfaction: int = Field(..., ge=1, le=5)
    event_organization: int = Field(..., ge=1, le=5)
    venue_facilities: int = Field(..., ge=1, le=5)
    speaker_quality: int = Field(..., ge=1, le=5)
    time_management: int = Field(..., ge=1, le=5)
    met_expectations: bool
    event_usefulness: int = Field(..., ge=1, le=5)
    would_recommend: bool
    liked_most: Optional[str] = None
    areas_for_improvement: Optional[str] = None
    additional_comments: Optional[str] = None
    submitted_at: datetime = Field(default_factory=datetime.now)

    def dict_for_db(self):
        """Convert to a dictionary for database storage."""
        return self.model_dump(by_alias=True)
