from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
import random

from amadeus import router as amadeus_router, get_places
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

    # mapare activități către categorii Amadeus dacă vrei să filtrezi mai fin
    activity_to_category = {
        "Cultural": "SIGHTS",
        "Outdoor": "SIGHTS",
        "Relaxation": "SIGHTS",
        "Gastronomy": "RESTAURANT",
    }

    # Momentan folosim doar lat/lon, fără filtrare suplimentară
    from opentripmap import get_lat_lon_by_city  # temporar pentru geocodare
    latlon = await get_lat_lon_by_city(city)
    if not latlon:
        return {"recommendations": ["Invalid city or no results found."]}

    lat, lon = latlon
    recommendations = await get_places(lat, lon)

    new_pref = Preference(
        activities=", ".join(activities),
        time=time,
        destination=city
    )
    db.add(new_pref)
    await db.commit()

    return {
        "recommendations": recommendations,
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
    from opentripmap import get_lat_lon_by_city  # temporar reutilizat
    latlon = await get_lat_lon_by_city(random_city)

    if not latlon:
        return {"places": ["Could not load random city."], "city": random_city}

    lat, lon = latlon
    places = await get_places(lat, lon)

    return {"places": places, "city": random_city}
