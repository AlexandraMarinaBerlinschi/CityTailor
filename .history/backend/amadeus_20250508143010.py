import httpx
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
import base64
import os

router = APIRouter()

# 🔐 Înlocuiește cu cheile tale Amadeus
AMADEUS_API_KEY = "GarGYyyf25bxM3NG016S2YvoY0icPF5V"
AMADEUS_API_SECRET = "JUVlpe77rOGMyrCi"

TOKEN_URL = "https://test.api.amadeus.com/v1/security/oauth2/token"
POI_URL = "https://test.api.amadeus.com/v1/reference-data/locations/pois"


async def get_amadeus_token():
    async with httpx.AsyncClient() as client:
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        data = {
            "grant_type": "client_credentials",
            "client_id": AMADEUS_API_KEY,
            "client_secret": AMADEUS_API_SECRET,
        }
        response = await client.post(TOKEN_URL, headers=headers, data=data)
        if response.status_code != 200:
            print("Error fetching Amadeus token:", response.text)
            return None
        return response.json().get("access_token")


@router.get("/places")
async def get_places(lat: float = Query(...), lon: float = Query(...), radius: int = Query(10)):
    token = await get_amadeus_token()
    if not token:
        return JSONResponse(status_code=500, content={"error": "Auth failed"})

    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "latitude": lat,
        "longitude": lon,
        "radius": radius,
        "page[limit]": 10,
        "category": "SIGHTS"  # vezi documentația pentru alte categorii
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(POI_URL, headers=headers, params=params)
        if response.status_code != 200:
            print("Amadeus API error:", response.text)
            return JSONResponse(status_code=500, content={"error": "POI request failed"})

        data = response.json().get("data", [])

        return [
            {
                "name": item.get("name"),
                "category": item.get("category"),
                "tags": item.get("tags", []),
                "lat": item.get("geoCode", {}).get("latitude"),
                "lon": item.get("geoCode", {}).get("longitude"),
                "relevance": item.get("relevance")
            }
            for item in data if item.get("geoCode")
        ]
