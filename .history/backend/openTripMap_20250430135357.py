# opentripmap.py
import httpx
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

router = APIRouter()

API_KEY = "5ae2e3f221c38a28845f05b69dfedf8ce799d80ca00ab558a5aee9f1"
BASE_URL = "https://api.opentripmap.com/0.1/en/places/radius"
DETAIL_URL = "https://api.opentripmap.com/0.1/en/places/xid/"

@router.get("/places")
async def get_places(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    radius: int = Query(1000, description="Search radius in meters"),
    kinds: str = Query("interesting_places", description="Filter types: architecture,historic,cultural etc.")
):
    async with httpx.AsyncClient() as client:
        response = await client.get(BASE_URL, params={
            "apikey": API_KEY,
            "lat": lat,
            "lon": lon,
            "radius": radius,
            "kinds": kinds,
            "format": "json",
            "limit": 20
        })

    if response.status_code != 200:
        return JSONResponse(status_code=response.status_code, content={"error": "API request failed"})

    return response.json()

@router.get("/place/{xid}")
async def get_place_details(xid: str):
    url = f"{DETAIL_URL}{xid}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params={"apikey": API_KEY})

    if response.status_code != 200:
        return JSONResponse(status_code=response.status_code, content={"error": "API request failed"})

    return response.json()
