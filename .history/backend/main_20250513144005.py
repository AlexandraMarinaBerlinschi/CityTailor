from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
import random

from amadeus import router as amadeus_router, get_lat_lon_by_city, get_amadeus_token
from database import get_db
from models import Preference
from init_db import init_db
from auth import router as auth_router

app = FastAPI()
app.include_router(auth_router)
app.include_router(amadeus_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "CityTailor backend is running!"}


@app.get("/init-db")
async def initialize_db():
    await init_db()
    return {"status": "Database initialized"}


@app.post("/submit-preferences")
async def submit_preferences(request: Request, db: AsyncSession = Depends(get_db)):
    data = await request.json()
    city = data.get("city", "")
    activities = data.get("activities", [])
    time = data.get("time", "")

    # Get city coordinates
    geo = await get_lat_lon_by_city(city)
    if not geo:
        return {"recommendations": ["Invalid city or no results found."], "city": city}

    lat, lon = geo
    
    # Get Amadeus access token
    token = await get_amadeus_token()
    if not token:
        return {"recommendations": ["Authentication failed"], "city": city}
    
    # Define keywords for activity categories
    keywords = {
        "Cultural": ["museum", "exhibition", "monument", "heritage", "history", "art", "culture", "tour", "palace", "castle"],
        "Outdoor": ["bike", "walking", "hike", "nature", "outdoor", "adventure", "mountain", "park", "boat", "cruise", "beach"],
        "Relaxation": ["spa", "relax", "massage", "thermal", "wellness", "yoga", "meditation", "retreat"],
        "Gastronomy": ["food", "wine", "tasting", "chocolate", "gastronomy", "cooking", "culinary", "dinner", "lunch", "restaurant", "dining"]
    }
    
    # Determine the radius based on time preference
    radius_map = {
        "<2h": 5,    # Smaller radius for less time
        "2-4h": 15,  # Medium radius
        ">4h": 30    # Larger radius for more time
    }
    radius = radius_map.get(time, 10)  # Default to 10 if time preference is not specified
    
    # Set up request headers and parameters
    headers = {"Authorization": f"Bearer {token}"}
    tours_url = "https://test.api.amadeus.com/v1/shopping/activities"
    params = {
        "latitude": lat,
        "longitude": lon,
        "radius": radius,
        "page[limit]": 50
    }
    
    # Get tours from Amadeus API
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(tours_url, headers=headers, params=params, timeout=30.0)
            
            if response.status_code != 200:
                return {"recommendations": ["Tours request failed"], "city": city, "lat": lat, "lon": lon}
            
            data = response.json().get("data", [])
            
            # Filter based on the selected activities
            filtered_results = []
            
            for item in data:
                if not item.get("geoCode"):
                    continue
                
                # Check if the activity matches any of the selected categories
                name = item.get("name", "").lower()
                description = item.get("shortDescription", "").lower() if item.get("shortDescription") else ""
                combined_text = f"{name} {description}"
                
                # Check if the activity matches any selected category
                matches_any_category = False
                
                # If no activities selected, include all
                if not activities:
                    matches_any_category = True
                else:
                    for category in activities:
                        selected_keywords = keywords.get(category, [])
                        if any(keyword in combined_text for keyword in selected_keywords):
                            matches_any_category = True
                            break
                
                # If there's a duration preference, filter accordingly
                # Note: This is a simplification as the API doesn't provide exact duration
                if matches_any_category:
                    min_duration = item.get("minimumDuration", "").lower()
                    # Simple time-based filtering logic
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
    
    # Save user preferences to database
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