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

# ===== ENHANCED HOME ML ENDPOINTS =====

@app.get("/ml/home-recommendations")
async def get_ml_home_recommendations(
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    limit: int = 8,
    db: AsyncSession = Depends(get_db)
):
    """Endpoint principal pentru recomandări de Home cu detectare activitate"""
    
    try:
        print(f"Getting home recommendations for user: {user_id or 'anonymous'}")
        
        # Verifică activitatea utilizatorului
        activity_count = 0
        if user_id:
            try:
                user_uuid = uuid.UUID(user_id)
                result = await db.execute(
                    select(func.count(UserActivity.id))
                    .where(UserActivity.user_id == user_uuid)
                )
                activity_count = result.scalar() or 0
            except ValueError:
                user_id = None
        
        if not user_id and session_id:
            result = await db.execute(
                select(func.count(UserActivity.id))
                .where(UserActivity.session_id == session_id)
                .where(UserActivity.user_id.is_(None))
            )
            activity_count = result.scalar() or 0
        
        # Determină dacă să afișeze "Try it out"
        has_activity = activity_count > 0
        
        if not has_activity:
            # Utilizator nou - returnează mesaj pentru "Try it out"
            return {
                "status": "success",
                "recommendations": {
                    "main_recommendations": [],
                    "recommendation_type": "no_activity",
                    "message": "Start exploring to get personalized recommendations!",
                    "show_try_it_out": True
                },
                "metadata": {
                    "user_id": user_id,
                    "session_id": session_id,
                    "has_activity": False,
                    "activity_count": 0
                }
            }
        
        # Utilizator cu activitate - obține recomandări ML
        recommendations = await ml_recommender.get_home_recommendations(
            db=db,
            user_id=user_id,
            session_id=session_id,
            limit=limit
        )
        
        return {
            "status": "success",
            "recommendations": recommendations,
            "metadata": {
                "user_id": user_id,
                "session_id": session_id,
                "has_activity": True,
                "activity_count": activity_count,
                "ml_version": "2.0_activity_aware"
            }
        }
        
    except Exception as e:
        print(f"Error in ML home recommendations: {e}")
        
        return {
            "status": "success",
            "recommendations": {
                "main_recommendations": [],
                "recommendation_type": "error_fallback",
                "message": "Start exploring to get personalized recommendations!",
                "show_try_it_out": True
            },
            "metadata": {
                "user_id": user_id,
                "session_id": session_id,
                "has_activity": False,
                "error": str(e)
            }
        }

@app.post("/ml/track-search")
async def track_search_ml(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Tracking pentru căutări"""
    
    try:
        data = await request.json()
        
        user_id = data.get("user_id")
        session_id = data.get("session_id") or str(uuid.uuid4())
        city = data.get("city")
        activities = data.get("activities", [])
        time = data.get("time")
        
        if not city:
            raise HTTPException(status_code=400, detail="City is required")
        
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
        interaction_type = data.get("interaction_type")
        place_name = data.get("place_name")
        place_id = data.get("place_id")
        city = data.get("city")
        
        if not all([interaction_type, place_name]):
            raise HTTPException(
                status_code=400, 
                detail="interaction_type and place_name are required"
            )
        
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

@app.post("/ml/update-user-activity")
async def update_user_activity_immediate(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Update immediate pentru activitatea utilizatorului - pentru refresh Home"""
    
    try:
        data = await request.json()
        user_id = data.get("user_id")
        session_id = data.get("session_id")
        activity_type = data.get("activity_type")
        place_name = data.get("place_name")
        city = data.get("city")
        
        if not all([activity_type, session_id]):
            raise HTTPException(status_code=400, detail="activity_type and session_id are required")
        
        print(f"Immediate activity update: {activity_type} for {place_name}")
        
        # Track direct cu ML recommender
        if activity_type == 'favorite':
            await ml_recommender.track_interaction(
                db=db,
                user_id=user_id,
                session_id=session_id,
                interaction_type='favorite',
                place_name=place_name,
                city=city
            )
        elif activity_type == 'itinerary':
            await ml_recommender.track_interaction(
                db=db,
                user_id=user_id,
                session_id=session_id,
                interaction_type='add_to_itinerary',
                place_name=place_name,
                city=city
            )
        elif activity_type == 'view':
            await ml_recommender.track_interaction(
                db=db,
                user_id=user_id,
                session_id=session_id,
                interaction_type='view',
                place_name=place_name,
                city=city
            )
        
        return {
            "status": "success",
            "message": f"Activity {activity_type} updated for Home refresh",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        print(f"Error updating activity: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update activity: {str(e)}")

# ===== DATABASE POPULATION ENDPOINTS =====

@app.post("/populate-db-from-amadeus")
async def populate_db_from_amadeus(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Populează PlacePopularity cu rezultate din căutările Amadeus"""
    try:
        data = await request.json()
        recommendations = data.get("recommendations", [])
        city = data.get("city", "")
        
        if not recommendations or not city:
            return {"status": "skipped", "message": "No recommendations or city provided"}
        
        print(f"Auto-populating database with {len(recommendations)} places from {city}")
        
        places_added = 0
        places_updated = 0
        
        for rec in recommendations:
            place_name = rec.get('name', '')
            if not place_name:
                continue
                
            place_id = f"{place_name}_{city}".lower().replace(' ', '_').replace("'", "")
            
            result = await db.execute(
                select(PlacePopularity).where(PlacePopularity.place_id == place_id)
            )
            existing_place = result.scalar_one_or_none()
            
            if existing_place:
                existing_place.total_views = (existing_place.total_views or 0) + 1
                existing_place.popularity_score = (
                    (existing_place.total_views or 0) * 1.0 +
                    (existing_place.total_favorites or 0) * 3.0 +
                    (existing_place.total_itinerary_adds or 0) * 5.0 +
                    (existing_place.total_shares or 0) * 2.0
                )
                existing_place.updated_at = datetime.utcnow()
                places_updated += 1
            else:
                rating = rec.get('rating', 4.0)
                if rating is None:
                    rating = 4.0
                    
                initial_popularity = max(10.0, float(rating) * 20) if rating else 50.0
                
                new_place = PlacePopularity(
                    place_id=place_id,
                    place_name=place_name,
                    city=city,
                    popularity_score=initial_popularity,
                    trending_score=15.0,
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
        
        print(f"Auto-populated: {places_added} new, {places_updated} updated places")
        
        return {
            "status": "success",
            "message": f"Database populated with {places_added + places_updated} places",
            "details": {
                "city": city,
                "places_added": places_added,
                "places_updated": places_updated,
                "total_processed": len(recommendations)
            }
        }
        
    except Exception as e:
        print(f"Error auto-populating database: {e}")
        await db.rollback()
        return {
            "status": "error", 
            "message": f"Failed to auto-populate: {str(e)}"
        }

@app.post("/initialize-sample-places")
async def initialize_sample_places(db: AsyncSession = Depends(get_db)):
    """Inițializează baza de date cu locuri sample pentru testare"""
    
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
            "place_id": "london_big_ben",
            "place_name": "Big Ben",
            "city": "London",
            "popularity_score": 900,
            "trending_score": 72,
            "total_views": 1180,
            "total_favorites": 90,
            "total_itinerary_adds": 68,
            "total_shares": 48
        }
    ]
    
    try:
        places_added = 0
        
        for place_data in sample_places:
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
            "places_added": places_added
        }
        
    except Exception as e:
        await db.rollback()
        return {
            "status": "error",
            "message": f"Failed to initialize: {str(e)}"
        }

# ===== ENHANCED SEARCH ENDPOINTS =====

@app.post("/submit-preferences-v2")
async def submit_preferences_v2_enhanced(request: Request, db: AsyncSession = Depends(get_db)):
    """Căutare îmbunătățită cu auto-populate database"""
    
    data = await request.json()
    city = data.get("city", "")
    activities = data.get("activities", [])
    time = data.get("time", "")
    session_id = data.get("session_id") or str(uuid.uuid4())
    user_id = data.get("user_id")
    
    print(f"Enhanced search: {city} - {activities} - {time}")
    
    # Track search cu ML
    try:
        await ml_recommender.track_search(
            db=db,
            user_id=user_id,
            session_id=session_id,
            city=city,
            activities=activities,
            time=time
        )
        print("ML tracking successful")
    except Exception as tracking_error:
        print(f"ML tracking failed: {tracking_error}")
    
    # Logica pentru Amadeus API
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
                
                print(f"Found {len(amadeus_results)} places from Amadeus API")
                
    except Exception as api_error:
        print(f"Amadeus API error: {api_error}")

    # Auto-populează baza de date
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
                print(f"Auto-populated database with {len(amadeus_results)} places")
        except Exception as populate_error:
            print(f"Failed to auto-populate database: {populate_error}")

    # Obține recomandări ML după populare
    ml_recommendations = []
    if user_id:
        try:
            ml_data = await ml_recommender.get_home_recommendations(db, user_id, session_id, 8)
            if ml_data and ml_data.get('main_recommendations'):
                ml_recommendations = ml_data['main_recommendations']
                print(f"Added {len(ml_recommendations)} ML recommendations")
        except Exception as ml_error:
            print(f"ML recommendations failed: {ml_error}")

    # Combină rezultatele
    all_recommendations = amadeus_results + ml_recommendations
    
    seen_names = set()
    unique_recommendations = []
    
    for rec in all_recommendations:
        name = rec.get('name', '').lower()
        if name and name not in seen_names:
            seen_names.add(name)
            unique_recommendations.append(rec)

    # Salvează preferința
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
            print(f"Failed to save preference: {pref_error}")
    
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
        "database_auto_populated": len(amadeus_results) > 0
    }

# ===== LEGACY ENDPOINTS =====

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
        "Cultural": ["museum", "exhibition", "monument", "heritage", "history", "art", "culture"],
        "Outdoor": ["bike", "walking", "hike", "nature", "outdoor", "adventure", "park"],
        "Relaxation": ["spa", "relax", "massage", "thermal", "wellness"],
        "Gastronomy": ["food", "wine", "tasting", "restaurant", "dining", "culinary"]
    }

    radius_map = {"<2h": 5, "2-4h": 15, ">4h": 30}
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
                return {"recommendations": ["Tours request failed"], "city": city}

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
        return {"recommendations": [f"Error: {str(e)}"], "city": city}

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

CITIES = ["Paris", "Tokyo", "Rome", "New York", "Barcelona", "London"]

@app.get("/random-places")
async def get_random():
    random_city = random.choice(CITIES)
    latlon = await get_lat_lon_by_city(random_city)
    if not latlon:
        return {"places": ["Could not load random city."], "city": random_city}
    lat, lon = latlon
    places = await get_tours(random_city)
    return {"places": places, "city": random_city}

# ===== STARTUP & HEALTH =====

@app.on_event("startup")
async def startup_event():
    print("Starting CityTailor API v2.0.0...")
    print("ML Home Recommendation System loaded!")
    print("Activity-aware recommendations active!")

@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(select(1))
        places_count = await db.execute(select(func.count(PlacePopularity.id)))
        total_places = places_count.scalar() or 0
        
        return {
            "status": "healthy",
            "version": "2.0.0",
            "database": "connected",
            "ml_system": "active",
            "places_in_database": total_places,
            "home_recommendations": "activity_aware",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }