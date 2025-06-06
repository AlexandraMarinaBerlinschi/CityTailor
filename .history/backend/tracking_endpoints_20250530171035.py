# tracking_endpoints.py - Endpoint-uri pentru tracking în main.py

from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional
import uuid
from tracking_service import UserTrackingService
from database import get_db

# Modele Pydantic pentru request-uri
class SearchTrackingRequest(BaseModel):
    city: str
    activities: List[str]
    time: str
    session_id: Optional[str] = None
    user_id: Optional[str] = None

class PlaceInteractionRequest(BaseModel):
    activity_type: str  # 'view', 'favorite', 'add_to_itinerary', 'share'
    place_name: str
    place_id: Optional[str] = None
    city: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    time_spent: Optional[float] = None
    click_position: Optional[int] = None
    rating_given: Optional[float] = None
    session_id: Optional[str] = None
    user_id: Optional[str] = None

class RecommendationFeedbackRequest(BaseModel):
    recommendation_id: int
    place_name: str
    place_id: str
    feedback_type: str  # 'click', 'favorite', 'ignore', 'dislike'
    position_in_list: int
    time_to_action: Optional[float] = None
    user_id: Optional[str] = None

# Router pentru tracking
tracking_router = APIRouter(prefix="/tracking", tags=["tracking"])

@tracking_router.post("/search")
async def track_search(
    request: SearchTrackingRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Înregistrează o căutare făcută de utilizator"""
    
    # Generează session_id dacă nu există
    session_id = request.session_id or str(uuid.uuid4())
    
    # Obține user_id
    user_id = await UserTrackingService.get_or_create_user_id(
        session_id, request.user_id
    )
    
    # Obține informații despre cerere
    user_agent = http_request.headers.get("user-agent")
    ip_address = http_request.client.host if http_request.client else None
    
    try:
        await UserTrackingService.track_search(
            db=db,
            user_id=user_id,
            session_id=session_id,
            city=request.city,
            activities=request.activities,
            time=request.time,
            user_agent=user_agent,
            ip_address=ip_address
        )
        
        return {
            "status": "success",
            "message": "Search tracked successfully",
            "user_id": user_id,
            "session_id": session_id
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to track search: {str(e)}")

@tracking_router.post("/interaction")
async def track_place_interaction(
    request: PlaceInteractionRequest,
    db: AsyncSession = Depends(get_db)
):
    """Înregistrează interacțiunea cu un loc"""
    
    # Generează session_id dacă nu există
    session_id = request.session_id or str(uuid.uuid4())
    
    # Obține user_id
    user_id = await UserTrackingService.get_or_create_user_id(
        session_id, request.user_id
    )
    
    try:
        await UserTrackingService.track_place_interaction(
            db=db,
            user_id=user_id,
            session_id=session_id,
            activity_type=request.activity_type,
            place_name=request.place_name,
            place_id=request.place_id,
            city=request.city,
            lat=request.lat,
            lon=request.lon,
            time_spent=request.time_spent,
            click_position=request.click_position,
            rating_given=request.rating_given
        )
        
        return {
            "status": "success",
            "message": "Interaction tracked successfully",
            "user_id": user_id
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to track interaction: {str(e)}")

@tracking_router.post("/recommendation-feedback")
async def track_recommendation_feedback(
    request: RecommendationFeedbackRequest,
    db: AsyncSession = Depends(get_db)
):
    """Înregistrează feedback-ul pe recomandări"""
    
    user_id = request.user_id
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required for recommendation feedback")
    
    try:
        await UserTrackingService.track_recommendation_feedback(
            db=db,
            user_id=user_id,
            recommendation_id=request.recommendation_id,
            place_name=request.place_name,
            place_id=request.place_id,
            feedback_type=request.feedback_type,
            position_in_list=request.position_in_list,
            time_to_action=request.time_to_action
        )
        
        return {
            "status": "success",
            "message": "Recommendation feedback tracked successfully"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to track recommendation feedback: {str(e)}")

@tracking_router.get("/profile/{user_id}")
async def get_user_profile(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Obține profilul utilizatorului"""
    
    profile = await UserTrackingService.get_user_profile(db, user_id)
    
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    return {
        "user_id": profile.user_id,
        "preferences": {
            "cultural": profile.cultural_preference,
            "outdoor": profile.outdoor_preference,
            "relaxation": profile.relaxation_preference,
            "gastronomy": profile.gastronomy_preference
        },
        "time_preferences": {
            "short_duration": profile.short_duration_preference,
            "medium_duration": profile.medium_duration_preference,
            "long_duration": profile.long_duration_preference
        },
        "quality_preferences": {
            "min_rating": profile.min_rating_preference,
            "max_price": profile.max_price_preference
        },
        "favorite_cities": profile.favorite_cities,
        "statistics": {
            "total_searches": profile.total_searches,
            "total_favorites": profile.total_favorites,
            "total_itineraries": profile.total_itineraries,
            "avg_time_per_session": profile.avg_time_per_session,
            "last_activity": profile.last_activity
        }
    }

@tracking_router.get("/activity/{user_id}")
async def get_user_activity(
    user_id: str,
    limit: int = 50,
    activity_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Obține istoricul activităților utilizatorului"""
    
    activities = await UserTrackingService.get_user_activity_history(
        db, user_id, limit, activity_type
    )
    
    return {
        "user_id": user_id,
        "activities": [
            {
                "id": activity.id,
                "activity_type": activity.activity_type,
                "place_name": activity.place_name,
                "city": activity.city,
                "search_activities": activity.search_activities,
                "search_time": activity.search_time,
                "time_spent": activity.time_spent,
                "rating_given": activity.rating_given,
                "timestamp": activity.timestamp
            }
            for activity in activities
        ]
    }

# Adaugă router-ul în main.py
# app.include_router(tracking_router)