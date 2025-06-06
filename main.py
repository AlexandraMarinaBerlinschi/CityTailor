from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Preference
from init_db import init_db  # 👈 importat pentru ruta /init-db

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # modifică dacă frontend-ul e hostat în altă parte
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "CityTailor backend is running!"}

@app.get("/init-db")  # 👈 endpoint temporar pentru a crea tabelele
async def initialize_db():
    await init_db()
    return {"status": "Database initialized"}

@app.post("/submit-preferences")
async def submit_preferences(request: Request, db: AsyncSession = Depends(get_db)):
    data = await request.json()
    activities = data.get("activities", [])
    time = data.get("time", "")

    new_pref = Preference(
        activities=", ".join(activities),
        time=time
    )
    db.add(new_pref)
    await db.commit()

    all_recommendations = {
        "Cultural": ["Visit the local art museum", "Attend a history tour"],
        "Outdoor": ["Explore a nature park", "Go hiking in nearby hills"],
        "Relaxation": ["Try a spa experience", "Relax in a botanical garden"],
        "Gastronomy": ["Take a food tour", "Join a local cooking class"],
    }

    recommendations = []

    for activity in activities:
        if activity in all_recommendations:
            recommendations.extend(all_recommendations[activity])

    if time == "<2h":
        recommendations = [rec for rec in recommendations if "tour" in rec or "museum" in rec]

    if not recommendations:
        recommendations = ["No matching recommendations found. Try selecting more preferences."]

    print("Generated recommendations:", recommendations)

    return {"recommendations": recommendations}
