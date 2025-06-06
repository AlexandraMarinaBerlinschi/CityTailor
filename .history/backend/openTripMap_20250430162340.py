import httpx
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

router = APIRouter()

API_KEY = "5ae2e3f221c38a28845f05b69dfedf8ce799d80ca00ab558a5aee9f1"

BASE_URL = "https://api.opentripmap.com/0.1/en/places/radius"
DETAIL_URL = "https://api.opentripmap.com/0.1/en/places/xid/"
GEONAME_URL = "https://api.opentripmap.com/0.1/en/places/geoname"


@router.get("/places")
async def get_places(
    lat: float = Query(...),
    lon: float = Query(...),
    radius: int = Query(5000),
    kinds: str = Query("interesting_places"),
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


async def get_lat_lon_by_city(city: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(GEONAME_URL, params={
            "apikey": API_KEY,
            "name": city
        })

    if response.status_code != 200:
        return None

    data = response.json()
    return data.get("lat"), data.get("lon")


async def get_places_by_kinds(lat: float, lon: float, kinds: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(BASE_URL, params={
            "apikey": API_KEY,
            "lat": lat,
            "lon": lon,
            "radius": 5000,
            "kinds": kinds,
            "format": "json",
            "limit": 10
        })

    if response.status_code != 200:
        return []

    return [
        {
            "name": item.get("name", "Unknown"),
            "dist": round(item.get("dist", 0)),
            "lat": item.get("point", {}).get("lat"),
            "lon": item.get("point", {}).get("lon")
        }
        for item in response.json()
        if item.get("name") and item.get("point") and "lat" in item["point"] and "lon" in item["point"]
    ]


async def get_random_places(lat: float, lon: float):
    async with httpx.AsyncClient() as client:
        response = await client.get(BASE_URL, params={
            "apikey": API_KEY,
            "lat": lat,
            "lon": lon,
            "radius": 5000,
            "format": "json",
            "limit": 10
        })

    if response.status_code != 200:
        return []

    return [
        {
            "name": item.get("name", "Unknown"),
            "dist": round(item.get("dist", 0)),
            "lat": item.get("point", {}).get("lat"),
            "lon": item.get("point", {}).get("lon")
        }
        for item in response.json()
        if item.get("name") and item.get("point") and "lat" in item["point"] and "lon" in item["point"]
    ]
