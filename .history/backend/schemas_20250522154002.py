from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class PreferenceBase(BaseModel):
    activities: str
    time: str
    destination: str

class PreferenceCreate(PreferenceBase):
    pass

class PreferenceResponse(PreferenceBase):
    id: int
    created_at: datetime
    user_id: Optional[UUID]

    class Config:
        orm_mode = True

class ItineraryBase(BaseModel):
    city: str
    name: Optional[str] = "Untitled itinerary"

class ItineraryCreate(ItineraryBase):
    activities: Optional[List[dict]] = []

class ItineraryResponse(ItineraryBase):
    id: int
    created_at: datetime
    user_id: UUID
    activities: List[dict]

    class Config:
        orm_mode = True

class ItineraryActivityBase(BaseModel):
    activity_id: str
    name: str
    lat: float
    lon: float
    rating: Optional[float] = None
    duration: Optional[str] = None
    picture_url: Optional[str] = None
    position: Optional[int] = None

class ItineraryActivityCreate(ItineraryActivityBase):
    pass

class ItineraryActivityResponse(ItineraryActivityBase):
    id: int
    itinerary_id: int
    created_at: datetime

    class Config:
        orm_mode = True
