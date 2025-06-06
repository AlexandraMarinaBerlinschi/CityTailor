import os
import sys
from datetime import timedelta

# Set UTF-8 encoding for Windows console
if os.name == 'nt':  # Windows
    os.environ['PYTHONIOENCODING'] = 'utf-8'

from fastapi import FastAPI, Request, Depends, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc
import httpx
import random
import uuid
from datetime import datetime
from typing import Optional

from amadeus import router as amadeus_router, get_lat_lon_by_city, get_amadeus_token, get_tours
from database import get_db
from models import Preference, UserActivity, UserProfile, PlacePopularity
from init_db import init_db
from auth import router as auth_router, get_current_user
from itineraries import router as itineraries_router

# Import ML system
from ml_recommender import MLRecommender

app = FastAPI(title="CityTailor API", description="Travel recommendations with ML", version="2.0.0")

# Initialize ML system
ml_recommender = MLRecommender()

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include existing routers
app.include_router(auth_router)
app.include_router(amadeus_router)
app.include_router(itineraries_router, prefix="/itineraries", tags=["itineraries"])

# User routes
users_router = APIRouter(prefix="/users", tags=["users"])

@users_router.get("/me")
async def get_current_user_info(current_user=Depends(get_current_user)):
    """Get current authenticated user information"""
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "message": "User authenticated successfully"
    }

app.include_router(users_router)

# ===== BASIC ENDPOINTS =====

@app.get("/")
def home():
    return {
        "message": "CityTailor backend is running!",
        "version": "2.0.0",
        "features": ["ML Recommendations", "User Tracking", "Personalized Experience", "Real Data Integration"]
    }

@app.get("/init-db")
async def initialize_db():
    await init_db()
    return {"status": "Database initialized"}

# ===== DATABASE POPULATION ENDPOINTS =====

@app.post("/populate-db-from-amadeus")
async def populate_db_from_amadeus(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Populează PlacePopularity cu rezultate din căutările Amadeus - AUTOMAT"""
    try:
        data = await request.json()
        recommendations = data.get("recommendations", [])
        city = data.get("city", "")
        
        if not recommendations or not city:
            return {"status": "skipped", "message": "No recommendations or city provided"}
        
        print(f"🔄 Auto-populating database with {len(recommendations)} places from {city}")
        
        places_added = 0
        places_updated = 0
        
        for rec in recommendations:
            place_name = rec.get('name', '')
            if not place_name:
                continue
                
            # Creează un place_id consistent
            place_id = f"{place_name}_{city}".lower().replace(' ', '_').replace("'", "")
            
            # Verifică dacă locul există deja
            result = await db.execute(
                select(PlacePopularity).where(PlacePopularity.place_id == place_id)
            )
            existing_place = result.scalar_one_or_none()
            
            if existing_place:
                # Incrementează view-urile pentru locul existent
                existing_place.total_views = (existing_place.total_views or 0) + 1
                existing_place.popularity_score = (
                    (existing_place.total_views or 0) * 1.0 +
                    (existing_place.total_favorites or 0) * 3.0 +
                    (existing_place.total_itinerary_adds or 0) * 5.0 +
                    (existing_place.total_shares or 0) * 2.0
                )
                
                # Update trending score (recent activity)
                week_ago = datetime.utcnow() - timedelta(days=7)
                recent_activities = await db.execute(
                    select(func.count(UserActivity.id))
                    .where(UserActivity.place_name == place_name)
                    .where(UserActivity.created_at >= week_ago)
                )
                recent_count = recent_activities.scalar() or 0
                existing_place.trending_score = recent_count * 10.0
                
                existing_place.updated_at = datetime.utcnow()
                places_updated += 1
            else:
                # Creează loc nou cu date de bază
                rating = rec.get('rating', 4.0)
                if rating is None:
                    rating = 4.0
                    
                initial_popularity = max(10.0, float(rating) * 20) if rating else 50.0
                
                new_place = PlacePopularity(
                    place_id=place_id,
                    place_name=place_name,
                    city=city,
                    popularity_score=initial_popularity,
                    trending_score=15.0,  # Score inițial pentru trending
                    total_views=1,
                    total_favorites=0,
                    total_itinerary_adds=0,
                    total_shares=0,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(new_place)
                places_added += 1
        
        await db.commit()
        
        print(f"✅ Auto-populated: {places_added} new, {places_updated} updated places")
        
        return {
            "status": "success",
            "message": f"Auto-populated database with {places_added + places_updated} places",
            "details": {
                "city": city,
                "places_added": places_added,
                "places_updated": places_updated,
                "total_processed": len(recommendations)
            }
        }
        
    except Exception as e:
        print(f"❌ Error auto-populating database: {e}")
        await db.rollback()
        return {
            "status": "error", 
            "message": f"Failed to auto-populate: {str(e)}"
        }

@app.post("/initialize-sample-places")
async def initialize_sample_places(db: AsyncSession = Depends(get_db)):
    """Inițializează baza de date cu câteva locuri sample pentru testare"""
    
    sample_places = [
        {
            "place_id": "paris_eiffel_tower",
            "place_name": "Eiffel Tower",
            "city": "Paris",
            "popularity_score": 950,
            "trending_score": 85,
            "total_views": 1500,
            "total_favorites": 120,
            "total_itinerary_adds": 80,
            "total_shares": 60
        },
        {
            "place_id": "paris_louvre_museum",
            "place_name": "Louvre Museum", 
            "city": "Paris",
            "popularity_score": 920,
            "trending_score": 75,
            "total_views": 1200,
            "total_favorites": 95,
            "total_itinerary_adds": 70,
            "total_shares": 50
        },
        {
            "place_id": "rome_colosseum",
            "place_name": "Colosseum",
            "city": "Rome",
            "popularity_score": 940,
            "trending_score": 90,
            "total_views": 1400,
            "total_favorites": 110,
            "total_itinerary_adds": 85,
            "total_shares": 65
        },
        {
            "place_id": "rome_vatican_museums",
            "place_name": "Vatican Museums",
            "city": "Rome", 
            "popularity_score": 890,
            "trending_score": 70,
            "total_views": 1100,
            "total_favorites": 88,
            "total_itinerary_adds": 65,
            "total_shares": 45
        },
        {
            "place_id": "barcelona_sagrada_familia",
            "place_name": "Sagrada Familia",
            "city": "Barcelona",
            "popularity_score": 930,
            "trending_score": 80,
            "total_views": 1300,
            "total_favorites": 105,
            "total_itinerary_adds": 75,
            "total_shares": 55
        },
        {
            "place_id": "barcelona_park_guell",
            "place_name": "Park Güell",
            "city": "Barcelona",
            "popularity_score": 870,
            "trending_score": 65,
            "total_views": 1050,
            "total_favorites": 82,
            "total_itinerary_adds": 60,
            "total_shares": 40
        },
        {
            "place_id": "london_big_ben",
            "place_name": "Big Ben",
            "city": "London",
            "popularity_score": 900,
            "trending_score": 72,
            "total_views": 1180,
            "total_favorites": 90,
            "total_itinerary_adds": 68,
            "total_shares": 48
        },
        {
            "place_id": "london_tower_bridge", 
            "place_name": "Tower Bridge",
            "city": "London",
            "popularity_score": 850,
            "trending_score": 60,
            "total_views": 980,
            "total_favorites": 75,
            "total_itinerary_adds": 55,
            "total_shares": 35
        }
    ]
    
    try:
        places_added = 0
        
        for place_data in sample_places:
            # Verifică dacă există deja
            result = await db.execute(
                select(PlacePopularity).where(PlacePopularity.place_id == place_data["place_id"])
            )
            
            existing = result.scalar_one_or_none()
            
            if not existing:
                new_place = PlacePopularity(
                    place_id=place_data["place_id"],
                    place_name=place_data["place_name"],
                    city=place_data["city"],
                    popularity_score=place_data["popularity_score"],
                    trending_score=place_data["trending_score"],
                    total_views=place_data["total_views"],
                    total_favorites=place_data["total_favorites"],
                    total_itinerary_adds=place_data["total_itinerary_adds"],
                    total_shares=place_data["total_shares"],
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(new_place)
                places_added += 1
        
        await db.commit()
        
        return {
            "status": "success",
            "message": f"Initialized database with {places_added} sample places",
            "places_added": places_added,
            "note": "Now the ML system will have real data to work with!"
        }
        
    except Exception as e:
        await db.rollback()
        return {
            "status": "error",
            "message": f"Failed to initialize: {str(e)}"
        }

@app.get("/check-db-status")
async def check_db_status(db: AsyncSession = Depends(get_db)):
    """Verifică starea bazei de date pentru debugging"""
    
    try:
        # Count places in database
        places_result = await db.execute(select(func.count(PlacePopularity.id)))
        total_places = places_result.scalar() or 0
        
        # Count activities
        activities_result = await db.execute(select(func.count(UserActivity.id)))
        total_activities = activities_result.scalar() or 0
        
        # Get sample places
        sample_result = await db.execute(
            select(PlacePopularity)
            .order_by(desc(PlacePopularity.popularity_score))
            .limit(5)
        )
        sample_places = sample_result.scalars().all()
        
        return {
            "status": "success",
            "database_status": {
                "total_places": total_places,
                "total_activities": total_activities,
                "has_data": total_places > 0,
                "sample_places": [
                    {
                        "name": place.place_name,
                        "city": place.city,
                        "popularity_score": place.popularity_score
                    }
                    for place in sample_places
                ]
            },
            "recommendations_available": total_places > 0,
            "message": "Database ready for ML recommendations" if total_places > 0 else "Database empty - run /initialize-sample-places or search for places first"
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Database check failed: {str(e)}"
        }

# ===== ML ENDPOINTS (IMPROVED) =====

@app.get("/ml/home-recommendations")
async def get_ml_home_recommendations(
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    limit: int = 8,
    db: AsyncSession = Depends(get_db)
):
    """Obține recomandări ML pentru homepage - DOAR DATE REALE"""
    
    try:
        recommendations = await ml_recommender.get_home_recommendations(
            db=db,
            user_id=user_id,
            session_id=session_id,
            limit=limit
        )
        
        return {
            "status": "success",
            "recommendations": recommendations,
            "timestamp": datetime.utcnow().isoformat(),
            "ml_version": "2.0_real_data_only"
        }
        
    except Exception as e:
        print(f"Error in ML recommendations: {e}")
        
        return {
            "status": "error",
            "recommendations": {
                "main_recommendations": [],
                "message": f"ML system error: {str(e)}",
                "suggestion": "Try initializing sample places or search for places first"
            },
            "error": "ML system error",
            "timestamp": datetime.utcnow().isoformat()
        }

@app.post("/ml/track-search")
async def track_search_ml(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Tracking pentru căutări - versiune ML"""
    
    try:
        data = await request.json()
        
        user_id = data.get("user_id")
        session_id = data.get("session_id") or str(uuid.uuid4())
        city = data.get("city")
        activities = data.get("activities", [])
        time = data.get("time")
        
        if not city:
            raise HTTPException(status_code=400, detail="City is required")
        
        # Track cu sistemul ML
        await ml_recommender.track_search(
            db=db,
            user_id=user_id,
            session_id=session_id,
            city=city,
            activities=activities,
            time=time
        )
        
        return {
            "status": "success",
            "message": "Search tracked successfully",
            "session_id": session_id
        }
        
    except Exception as e:
        print(f"Error tracking search: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to track search: {str(e)}")

@app.post("/ml/track-interaction")
async def track_interaction_ml(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Tracking pentru interacțiuni cu locuri"""
    
    try:
        data = await request.json()
        
        user_id = data.get("user_id")
        session_id = data.get("session_id") or str(uuid.uuid4())
        interaction_type = data.get("interaction_type")  # 'view', 'favorite', 'add_to_itinerary'
        place_name = data.get("place_name")
        place_id = data.get("place_id")
        city = data.get("city")
        
        if not all([interaction_type, place_name]):
            raise HTTPException(
                status_code=400, 
                detail="interaction_type and place_name are required"
            )
        
        # Track cu sistemul ML
        await ml_recommender.track_interaction(
            db=db,
            user_id=user_id,
            session_id=session_id,
            interaction_type=interaction_type,
            place_name=place_name,
            place_id=place_id,
            city=city
        )
        
        return {
            "status": "success",
            "message": f"{interaction_type} tracked successfully",
            "place": place_name
        }
        
    except Exception as e:
        print(f"Error tracking interaction: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to track interaction: {str(e)}")

@app.get("/ml/user-profile/{user_id}")
async def get_ml_user_profile(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Obține profilul ML al utilizatorului"""
    
    try:
        # Analizează comportamentul
        behavior = await ml_recommender._analyze_user_behavior(db, user_id)
        
        # Obține profilul din baza de date
        user_uuid = uuid.UUID(user_id)
        result = await db.execute(
            select(UserProfile).where(UserProfile.user_id == user_uuid)
        )
        
        profile = result.scalar_one_or_none()
        
        return {
            "status": "success",
            "user_id": user_id,
            "profile": {
                "preferences": {
                    "cultural": profile.cultural_preference if profile else behavior['preferences'].get('Cultural', 0.5),
                    "outdoor": profile.outdoor_preference if profile else behavior['preferences'].get('Outdoor', 0.5),
                    "relaxation": profile.relaxation_preference if profile else behavior['preferences'].get('Relaxation', 0.5),
                    "gastronomy": profile.gastronomy_preference if profile else behavior['preferences'].get('Gastronomy', 0.5)
                },
                "favorite_cities": behavior['favorite_cities'],
                "stats": {
                    "total_activities": behavior['total_activities'],
                    "engagement_level": behavior['engagement_level'],
                    "is_new_user": behavior['is_new_user']
                }
            },
            "last_updated": profile.updated_at.isoformat() if profile else None
        }
        
    except Exception as e:
        print(f"Error getting user profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user profile: {str(e)}")

@app.get("/ml/trending")
async def get_ml_trending(
    city: Optional[str] = None,
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """Obține locurile trending"""
    
    try:
        query = select(PlacePopularity).order_by(desc(PlacePopularity.trending_score))
        
        if city:
            query = query.where(PlacePopularity.city == city)
        
        query = query.limit(limit)
        result = await db.execute(query)
        trending_places = result.scalars().all()
        
        return {
            "status": "success",
            "trending_places": [
                {
                    "place_id": place.place_id,
                    "name": place.place_name,
                    "city": place.city,
                    "trending_score": place.trending_score,
                    "popularity_score": place.popularity_score,
                    "stats": {
                        "views": place.total_views,
                        "favorites": place.total_favorites,
                        "itinerary_adds": place.total_itinerary_adds
                    }
                }
                for place in trending_places
            ],
            "filter": {"city": city} if city else None,
            "count": len(trending_places)
        }
        
    except Exception as e:
        print(f"Error getting trending places: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get trending places: {str(e)}")

@app.get("/ml/popular")
async def get_ml_popular(
    city: Optional[str] = None,
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """Obține locurile populare"""
    
    try:
        query = select(PlacePopularity).order_by(desc(PlacePopularity.popularity_score))
        
        if city:
            query = query.where(PlacePopularity.city == city)
        
        query = query.limit(limit)
        result = await db.execute(query)
        popular_places = result.scalars().all()
        
        return {
            "status": "success",
            "popular_places": [
                {
                    "place_id": place.place_id,
                    "name": place.place_name,
                    "city": place.city,
                    "popularity_score": place.popularity_score,
                    "rating": min(5.0, 3.5 + (place.popularity_score / 1000)),
                    "stats": {
                        "views": place.total_views,
                        "favorites": place.total_favorites,
                        "itinerary_adds": place.total_itinerary_adds,
                        "shares": place.total_shares
                    }
                }
                for place in popular_places
            ],
            "filter": {"city": city} if city else None,
            "count": len(popular_places)
        }
        
    except Exception as e:
        print(f"Error getting popular places: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get popular places: {str(e)}")

@app.get("/ml/stats")
async def get_ml_stats(db: AsyncSession = Depends(get_db)):
    """Obține statistici despre sistemul ML"""
    
    try:
        # Statistici despre activități
        activities_result = await db.execute(
            select(func.count(UserActivity.id))
        )
        total_activities = activities_result.scalar()
        
        # Statistici despre utilizatori activi
        users_result = await db.execute(
            select(func.count(UserProfile.id))
        )
        total_profiles = users_result.scalar()
        
        # Statistici despre locuri
        places_result = await db.execute(
            select(func.count(PlacePopularity.id))
        )
        total_places = places_result.scalar()
        
        # Top orașele
        top_cities_result = await db.execute(
            select(
                PlacePopularity.city,
                func.sum(PlacePopularity.total_views).label('total_views')
            )
            .group_by(PlacePopularity.city)
            .order_by(desc('total_views'))
            .limit(5)
        )
        
        top_cities = [
            {"city": city, "total_views": views} 
            for city, views in top_cities_result
        ]
        
        return {
            "status": "success",
            "ml_system_stats": {
                "total_activities_tracked": total_activities,
                "users_with_profiles": total_profiles,
                "places_in_database": total_places,
                "top_cities": top_cities,
                "system_health": "healthy" if total_places > 0 else "needs_data",
                "data_ready": total_places > 0
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        print(f"Error getting ML stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get ML stats: {str(e)}")

@app.get("/ml/test")
async def test_ml_system(db: AsyncSession = Depends(get_db)):
    """Endpoint pentru testarea rapidă a sistemului ML"""
    
    try:
        # Test 1: Verifică conexiunea la baza de date
        result = await db.execute(select(func.count(PlacePopularity.id)))
        place_count = result.scalar()
        
        # Test 2: Verifică dacă există date
        activities_result = await db.execute(select(func.count(UserActivity.id)))
        activities_count = activities_result.scalar()
        
        # Test 3: Generează recomandări de test
        test_recommendations = await ml_recommender.get_home_recommendations(db, None, None, 5)
        
        return {
            "status": "success",
            "ml_system_health": {
                "database_connected": True,
                "places_in_db": place_count,
                "activities_tracked": activities_count,
                "can_generate_recommendations": len(test_recommendations.get('main_recommendations', [])) > 0,
                "ready_for_production": place_count > 0
            },
            "test_recommendations": test_recommendations,
            "message": "ML system is working correctly!" if place_count > 0 else "ML system connected but needs data. Run /initialize-sample-places"
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "ml_system_health": {
                "database_connected": False,
                "error_details": str(e)
            }
        }

# ===== ML USER SESSION MANAGEMENT ENDPOINTS =====

@app.post("/ml/clear-anonymous-data")
async def clear_anonymous_ml_data(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Clear anonymous ML data for a specific session"""
    
    try:
        data = await request.json()
        session_id = data.get('session_id')
        
        if not session_id:
            raise HTTPException(status_code=400, detail="Session ID is required")
        
        # Clear anonymous activities for this session
        result = await db.execute(
            select(UserActivity)
            .where(UserActivity.session_id == session_id)
            .where(UserActivity.user_id.is_(None))  # Only anonymous activities
        )
        
        anonymous_activities = result.scalars().all()
        activities_count = len(anonymous_activities)
        
        # Delete anonymous activities
        for activity in anonymous_activities:
            await db.delete(activity)
        
        await db.commit()
        
        print(f"Cleared {activities_count} anonymous activities for session {session_id[:8]}...")
        
        return {
            "status": "success",
            "message": f"Cleared {activities_count} anonymous activities",
            "session_id": session_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        print(f"Error clearing anonymous data: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to clear anonymous data: {str(e)}")

@app.post("/ml/clear-user-session")
async def clear_user_ml_session(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Clear user session data but keep user profile intact"""
    
    try:
        data = await request.json()
        user_id = data.get('user_id')
        session_id = data.get('session_id')
        
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID is required")
        
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid user ID format")
        
        # Clear session-specific activities but keep historical data
        cleared_count = 0
        
        if session_id:
            # Clear only current session activities
            result = await db.execute(
                select(UserActivity)
                .where(UserActivity.user_id == user_uuid)
                .where(UserActivity.session_id == session_id)
            )
            
            session_activities = result.scalars().all()
            cleared_count = len(session_activities)
            
            for activity in session_activities:
                await db.delete(activity)
        
        # Note: We keep the user profile intact - only clear session data
        await db.commit()
        
        print(f"Cleared {cleared_count} session activities for user {user_id[:8]}...")
        
        return {
            "status": "success",
            "message": f"Cleared {cleared_count} session activities",
            "user_id": user_id,
            "session_id": session_id,
            "profile_preserved": True,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error clearing user session: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to clear user session: {str(e)}")

@app.post("/ml/initialize-user")
async def initialize_ml_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Initialize ML tracking for a user (called when user logs in)"""
    
    try:
        data = await request.json()
        user_id = data.get('user_id')
        session_id = data.get('session_id')
        
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID is required")
        
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid user ID format")
        
        # Check if user exists in auth.users
        user_exists = await ml_recommender._check_user_exists(db, user_id)
        if not user_exists:
            print(f"User {user_id} not found in auth.users")
            return {
                "status": "warning",
                "message": "User not found in auth system",
                "user_id": user_id,
                "initialized": False
            }
        
        # Check if user already has a profile
        result = await db.execute(
            select(UserProfile).where(UserProfile.user_id == user_uuid)
        )
        
        existing_profile = result.scalar_one_or_none()
        
        if not existing_profile:
            # Create a basic profile for new users
            new_profile = UserProfile(
                user_id=user_uuid,
                cultural_preference=0.5,
                outdoor_preference=0.5,
                relaxation_preference=0.5,
                gastronomy_preference=0.5,
                favorite_cities={},
                total_searches=0,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(new_profile)
            await db.commit()
            
            print(f"Created new ML profile for user {user_id[:8]}...")
            profile_status = "created"
        else:
            print(f"ML profile already exists for user {user_id[:8]}...")
            profile_status = "existing"
        
        # Log initialization activity
        init_activity = UserActivity(
            user_id=user_uuid,
            session_id=session_id or str(uuid.uuid4()),
            activity_type='ml_initialization',
            created_at=datetime.utcnow()
        )
        db.add(init_activity)
        await db.commit()
        
        return {
            "status": "success",
            "message": "ML tracking initialized successfully",
            "user_id": user_id,
            "session_id": session_id,
            "profile_status": profile_status,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error initializing ML user: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to initialize ML user: {str(e)}")

@app.post("/ml/migrate-anonymous-to-user")
async def migrate_anonymous_to_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Migrate anonymous session data to authenticated user"""
    
    try:
        data = await request.json()
        user_id = data.get('user_id')
        session_id = data.get('session_id')
        
        if not user_id or not session_id:
            raise HTTPException(status_code=400, detail="Both user_id and session_id are required")
        
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid user ID format")
        
        # Check if user exists
        user_exists = await ml_recommender._check_user_exists(db, user_id)
        if not user_exists:
            raise HTTPException(status_code=404, detail="User not found in auth system")
        
        # Find anonymous activities from this session
        result = await db.execute(
            select(UserActivity)
            .where(UserActivity.session_id == session_id)
            .where(UserActivity.user_id.is_(None))
        )
        
        anonymous_activities = result.scalars().all()
        migrated_count = 0
        
        # Migrate anonymous activities to the authenticated user
        for activity in anonymous_activities:
            activity.user_id = user_uuid
            migrated_count += 1
        
        await db.commit()
        
        # Trigger profile update based on migrated data if there are activities
        if migrated_count > 0:
            try:
                behavior = await ml_recommender._analyze_user_behavior(db, user_id)
                await ml_recommender._update_user_profile(db, user_id, behavior)
                print(f"Updated user profile after migration")
            except Exception as profile_error:
                print(f"Failed to update profile after migration: {profile_error}")
        
        print(f"Migrated {migrated_count} anonymous activities to user {user_id[:8]}...")
        
        return {
            "status": "success",
            "message": f"Migrated {migrated_count} activities from anonymous to user",
            "user_id": user_id,
            "session_id": session_id,
            "migrated_activities": migrated_count,
            "profile_updated": migrated_count > 0,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error migrating anonymous data: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to migrate anonymous data: {str(e)}")

@app.delete("/ml/user-data/{user_id}")
async def delete_user_ml_data(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)  # Require authentication
):
    """Completely delete all ML data for a user (for account deletion)"""
    
    try:
        # Verify the requesting user can delete this data
        if current_user["id"] != user_id:
            raise HTTPException(status_code=403, detail="Can only delete your own data")
        
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid user ID format")
        
        deleted_counts = {
            "activities": 0,
            "profile": 0,
            "place_popularity_updates": 0
        }
        
        # Delete all user activities
        result = await db.execute(
            select(UserActivity).where(UserActivity.user_id == user_uuid)
        )
        user_activities = result.scalars().all()
        deleted_counts["activities"] = len(user_activities)
        
        for activity in user_activities:
            await db.delete(activity)
        
        # Delete user profile
        result = await db.execute(
            select(UserProfile).where(UserProfile.user_id == user_uuid)
        )
        user_profile = result.scalar_one_or_none()
        if user_profile:
            await db.delete(user_profile)
            deleted_counts["profile"] = 1
        
        # Note: We don't delete PlacePopularity data as it's aggregated from all users
        # But we could adjust the scores to remove this user's contributions
        
        await db.commit()
        
        print(f"Completely deleted ML data for user {user_id[:8]}...")
        
        return {
            "status": "success",
            "message": "All user ML data deleted successfully",
            "user_id": user_id,
            "deleted_counts": deleted_counts,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting user ML data: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete user ML data: {str(e)}")

@app.get("/ml/user-session-info/{user_id}")
async def get_user_session_info(
    user_id: str,
    session_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get information about user's current session and ML data"""
    
    try:
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid user ID format")
        
        # Check if user exists
        user_exists = await ml_recommender._check_user_exists(db, user_id)
        
        # Get total activities
        result = await db.execute(
            select(func.count(UserActivity.id))
            .where(UserActivity.user_id == user_uuid)
        )
        total_activities = result.scalar() or 0
        
        # Get session activities if session_id provided
        session_activities = 0
        if session_id:
            result = await db.execute(
                select(func.count(UserActivity.id))
                .where(UserActivity.user_id == user_uuid)
                .where(UserActivity.session_id == session_id)
            )
            session_activities = result.scalar() or 0
        
        # Get profile status
        result = await db.execute(
            select(UserProfile).where(UserProfile.user_id == user_uuid)
        )
        profile = result.scalar_one_or_none()
        
        return {
            "status": "success",
            "user_id": user_id,
            "session_id": session_id,
            "user_exists_in_auth": user_exists,
            "has_ml_profile": profile is not None,
            "total_activities": total_activities,
            "session_activities": session_activities,
            "profile_last_updated": profile.updated_at.isoformat() if profile else None,
            "is_new_user": total_activities < 3,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting user session info: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user session info: {str(e)}")

# ===== ML ANALYTICS ENDPOINTS =====

@app.get("/ml/analytics/user-distribution")
async def get_ml_user_distribution(db: AsyncSession = Depends(get_db)):
    """Get analytics about user distribution in ML system"""
    
    try:
        # Count authenticated vs anonymous activities
        auth_result = await db.execute(
            select(func.count(UserActivity.id))
            .where(UserActivity.user_id.is_not(None))
        )
        authenticated_activities = auth_result.scalar() or 0
        
        anon_result = await db.execute(
            select(func.count(UserActivity.id))
            .where(UserActivity.user_id.is_(None))
        )
        anonymous_activities = anon_result.scalar() or 0
        
        # Count unique users with profiles
        profile_result = await db.execute(
            select(func.count(UserProfile.id))
        )
        users_with_profiles = profile_result.scalar() or 0
        
        # Count unique sessions
        session_result = await db.execute(
            select(func.count(func.distinct(UserActivity.session_id)))
        )
        unique_sessions = session_result.scalar() or 0
        
        return {
            "status": "success",
            "analytics": {
                "authenticated_activities": authenticated_activities,
                "anonymous_activities": anonymous_activities,
                "total_activities": authenticated_activities + anonymous_activities,
                "users_with_profiles": users_with_profiles,
                "unique_sessions": unique_sessions,
                "auth_vs_anon_ratio": {
                    "authenticated_percentage": round(
                        (authenticated_activities / max(1, authenticated_activities + anonymous_activities)) * 100, 1
                    ),
                    "anonymous_percentage": round(
                        (anonymous_activities / max(1, authenticated_activities + anonymous_activities)) * 100, 1
                    )
                }
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        print(f"Error getting ML analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get ML analytics: {str(e)}")

# ===== DEBUGGING ENDPOINTS =====

@app.get("/ml/debug/recent-activities")
async def get_recent_ml_activities(
    limit: int = 20,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get recent ML activities for debugging"""
    
    try:
        query = select(UserActivity).order_by(desc(UserActivity.created_at))
        
        if user_id:
            try:
                user_uuid = uuid.UUID(user_id)
                query = query.where(UserActivity.user_id == user_uuid)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid user ID format")
        
        if session_id:
            query = query.where(UserActivity.session_id == session_id)
        
        query = query.limit(limit)
        result = await db.execute(query)
        activities = result.scalars().all()
        
        return {
            "status": "success",
            "activities": [
                {
                    "id": str(activity.id),
                    "user_id": str(activity.user_id) if activity.user_id else None,
                    "session_id": activity.session_id,
                    "activity_type": activity.activity_type,
                    "place_name": activity.place_name,
                    "city": activity.city,
                    "search_activities": activity.search_activities,
                    "search_time": activity.search_time,
                    "created_at": activity.created_at.isoformat()
                }
                for activity in activities
            ],
            "count": len(activities),
            "filters": {
                "user_id": user_id,
                "session_id": session_id,
                "limit": limit
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting recent activities: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get recent activities: {str(e)}")

# ===== ENHANCED SEARCH ENDPOINTS =====

@app.post("/submit-preferences")
async def submit_preferences(request: Request, db: AsyncSession = Depends(get_db)):
    """Endpoint original pentru compatibilitate"""
    data = await request.json()
    city = data.get("city", "")
    activities = data.get("activities", [])
    time = data.get("time", "")

    geo = await get_lat_lon_by_city(city)
    if not geo:
        return {"recommendations": ["Invalid city or no results found."], "city": city}

    lat, lon = geo
    token = await get_amadeus_token()
    if not token:
        return {"recommendations": ["Authentication failed"], "city": city}

    keywords = {
        "Cultural": ["museum", "exhibition", "monument", "heritage", "history", "art", "culture", "tour", "palace", "castle"],
        "Outdoor": ["bike", "walking", "hike", "nature", "outdoor", "adventure", "mountain", "park", "boat", "cruise", "beach"],
        "Relaxation": ["spa", "relax", "massage", "thermal", "wellness", "yoga", "meditation", "retreat"],
        "Gastronomy": ["food", "wine", "tasting", "chocolate", "gastronomy", "cooking", "culinary", "dinner", "lunch", "restaurant", "dining"]
    }

    radius_map = {
        "<2h": 5,
        "2-4h": 15,
        ">4h": 30
    }
    radius = radius_map.get(time, 10)

    headers = {"Authorization": f"Bearer {token}"}
    tours_url = "https://test.api.amadeus.com/v1/shopping/activities"
    params = {
        "latitude": lat,
        "longitude": lon,
        "radius": radius,
        "page[limit]": 50
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(tours_url, headers=headers, params=params, timeout=30.0)
            if response.status_code != 200:
                return {"recommendations": ["Tours request failed"], "city": city, "lat": lat, "lon": lon}

            data = response.json().get("data", [])
            filtered_results = []

            for item in data:
                if not item.get("geoCode"):
                    continue
                name = item.get("name", "").lower()
                description = item.get("shortDescription", "").lower() if item.get("shortDescription") else ""
                combined_text = f"{name} {description}"

                matches_any_category = False
                if not activities:
                    matches_any_category = True
                else:
                    for category in activities:
                        selected_keywords = keywords.get(category, [])
                        if any(keyword in combined_text for keyword in selected_keywords):
                            matches_any_category = True
                            break

                if matches_any_category:
                    min_duration = item.get("minimumDuration", "").lower()
                    include_by_time = True
                    if time == "<2h" and ("day" in min_duration or "full day" in min_duration):
                        include_by_time = False

                    if include_by_time:
                        filtered_results.append({
                            "name": item.get("name", ""),
                            "lat": item.get("geoCode", {}).get("latitude"),
                            "lon": item.get("geoCode", {}).get("longitude"),
                            "rating": item.get("rating"),
                            "pictures": item.get("pictures", []),
                            "minimumDuration": item.get("minimumDuration"),
                            "id": item.get("id")
                        })

    except Exception as e:
        return {"recommendations": [f"Error retrieving recommendations: {str(e)}"], "city": city, "lat": lat, "lon": lon}

    new_pref = Preference(
        activities=", ".join(activities),
        time=time,
        destination=city
    )
    db.add(new_pref)
    await db.commit()

    return {
        "recommendations": filtered_results,
        "city": city,
        "lat": lat,
        "lon": lon
    }

@app.post("/submit-preferences-v2")
async def submit_preferences_v2_enhanced(request: Request, db: AsyncSession = Depends(get_db)):
    """Versiunea îmbunătățită care populează AUTOMAT baza de date cu rezultatele reale"""
    
    data = await request.json()
    city = data.get("city", "")
    activities = data.get("activities", [])
    time = data.get("time", "")
    
    session_id = data.get("session_id") or str(uuid.uuid4())
    user_id = data.get("user_id")
    
    print(f"🔍 Enhanced search with auto-populate: {city} - {activities} - {time}")
    
    # Track search cu ML (păstrează logica existentă)
    try:
        await ml_recommender.track_search(
            db=db,
            user_id=user_id,
            session_id=session_id,
            city=city,
            activities=activities,
            time=time
        )
        print("✅ ML tracking successful")
    except Exception as tracking_error:
        print(f"⚠️ ML tracking failed: {tracking_error}")
    
    # Logica EXACTĂ pentru Amadeus API
    geo = await get_lat_lon_by_city(city)
    if not geo:
        return {"recommendations": [], "city": city, "error": "City not found"}

    lat, lon = geo
    token = await get_amadeus_token()
    if not token:
        return {"recommendations": [], "city": city, "error": "API authentication failed"}

    headers = {"Authorization": f"Bearer {token}"}
    tours_url = "https://test.api.amadeus.com/v1/shopping/activities"
    params = {
        "latitude": lat,
        "longitude": lon,
        "radius": 15,
        "page[limit]": 50
    }

    amadeus_results = []
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(tours_url, headers=headers, params=params, timeout=30.0)
            
            if response.status_code == 200:
                api_data = response.json().get("data", [])
                
                keywords = {
                    "Cultural": ["museum", "exhibition", "monument", "heritage", "history", "art", "culture"],
                    "Outdoor": ["bike", "walking", "hike", "nature", "outdoor", "adventure", "park"],
                    "Relaxation": ["spa", "relax", "massage", "thermal", "wellness"],
                    "Gastronomy": ["food", "wine", "tasting", "restaurant", "dining", "culinary"]
                }
                
                for item in api_data:
                    if not item.get("geoCode"):
                        continue
                        
                    name = item.get("name", "").lower()
                    description = item.get("shortDescription", "").lower()
                    combined_text = f"{name} {description}"
                    
                    matches_category = False
                    if not activities:
                        matches_category = True
                    else:
                        for category in activities:
                            if category in keywords:
                                category_keywords = keywords[category]
                                if any(keyword in combined_text for keyword in category_keywords):
                                    matches_category = True
                                    break
                    
                    if matches_category:
                        amadeus_results.append({
                            "name": item.get("name", ""),
                            "lat": item.get("geoCode", {}).get("latitude"),
                            "lon": item.get("geoCode", {}).get("longitude"),
                            "rating": item.get("rating"),
                            "pictures": item.get("pictures", []),
                            "minimumDuration": item.get("minimumDuration"),
                            "id": item.get("id"),
                            "description": item.get("shortDescription", ""),
                            "data_source": "amadeus"
                        })
                
                print(f"✅ Found {len(amadeus_results)} places from Amadeus API")
                
    except Exception as api_error:
        print(f"❌ Amadeus API error: {api_error}")

    # IMPORTANT: Auto-populează baza de date cu rezultatele Amadeus
    if amadeus_results:
        try:
            populate_result = await populate_db_from_amadeus(
                request=type('MockRequest', (), {
                    'json': lambda: {
                        'recommendations': amadeus_results,
                        'city': city
                    }
                })(),
                db=db
            )
            if populate_result.get('status') == 'success':
                print(f"✅ Auto-populated database with {len(amadeus_results)} places")
        except Exception as populate_error:
            print(f"⚠️ Failed to auto-populate database: {populate_error}")

    # Acum că am populat DB-ul, încearcă să obții recomandări ML îmbunătățite
    ml_recommendations = []
    if user_id:
        try:
            ml_data = await ml_recommender.get_home_recommendations(db, user_id, session_id, 8)
            if ml_data and ml_data.get('main_recommendations'):
                ml_recommendations = ml_data['main_recommendations']
                print(f"✅ Added {len(ml_recommendations)} ML recommendations from newly populated DB")
        except Exception as ml_error:
            print(f"⚠️ ML recommendations failed: {ml_error}")

    # Combină rezultatele (păstrează logica existentă)
    all_recommendations = amadeus_results + ml_recommendations
    
    seen_names = set()
    unique_recommendations = []
    
    for rec in all_recommendations:
        name = rec.get('name', '').lower()
        if name and name not in seen_names:
            seen_names.add(name)
            unique_recommendations.append(rec)

    # Salvează preferința (păstrează logica existentă)
    if user_id:
        try:
            user_uuid = uuid.UUID(user_id)
            new_pref = Preference(
                user_id=user_uuid,
                activities=", ".join(activities),
                time=time,
                destination=city
            )
            db.add(new_pref)
            await db.commit()
        except Exception as pref_error:
            print(f"⚠️ Failed to save preference: {pref_error}")
    
    return {
        "recommendations": unique_recommendations[:20],
        "city": city,
        "lat": lat,
        "lon": lon,
        "session_id": session_id,
        "ml_enhanced": len(ml_recommendations) > 0,
        "total_found": len(unique_recommendations),
        "sources": {
            "amadeus": len(amadeus_results),
            "ml_personalized": len(ml_recommendations)
        },
        "database_auto_populated": len(amadeus_results) > 0,
        "message": f"Enhanced search with real data: {len(unique_recommendations)} total recommendations"
    }

# ===== LEGACY ENDPOINTS =====

CITIES = [
    "Paris", "Tokyo", "Rome", "New York", "Barcelona",
    "London", "Vienna", "Prague", "Budapest", "Lisbon"
]

@app.get("/random-places")
async def get_random():
    random_city = random.choice(CITIES)
    latlon = await get_lat_lon_by_city(random_city)

    if not latlon:
        return {"places": ["Could not load random city."], "city": random_city}

    lat, lon = latlon
    places = await get_tours(random_city)

    return {"places": places, "city": random_city}

# ===== STARTUP EVENT =====

@app.on_event("startup")
async def startup_event():
    """Task-uri care se execută la pornirea aplicației"""
    print("Starting CityTailor API v2.0.0...")
    print("ML Recommendation System loaded!")
    print("Supabase integration active!")
    print("ML User Session Management active!")
    print("Auto-database population enabled!")
    print("Fixed image URLs for better visuals!")
    print("Ready to provide REAL DATA personalized travel recommendations!")

# ===== HEALTH CHECK =====

@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health check pentru aplicație"""
    try:
        # Test conexiunea la baza de date
        await db.execute(select(1))
        
        # Check ML system status
        places_count = await db.execute(select(func.count(PlacePopularity.id)))
        total_places = places_count.scalar() or 0
        
        return {
            "status": "healthy",
            "version": "2.0.0",
            "database": "connected",
            "ml_system": "active",
            "user_session_management": "active",
            "places_in_database": total_places,
            "ml_ready": total_places > 0,
            "features": [
                "Real Data ML Recommendations",
                "Auto Database Population",
                "Fixed Image URLs",
                "Enhanced User Tracking"
            ],
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }