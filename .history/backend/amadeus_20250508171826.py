import httpx
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

router = APIRouter()

AMADEUS_API_KEY = "ay2umnv9ZwnAAEL5Uf4p8jqlPph4QVL0"
AMADEUS_API_SECRET = "8VofrqDXOYHwo7pb"

TOKEN_URL = "https://test.api.amadeus.com/v1/security/oauth2/token"
CITY_SEARCH_URL = "https://test.api.amadeus.com/v1/reference-data/locations"
TOURS_URL = "https://test.api.amadeus.com/v1/shopping/activities"


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
            print("Error fetching token:", response.text)
            return None
        return response.json().get("access_token")


async def get_lat_lon_by_city(city: str):
    token = await get_amadeus_token()
    if not token:
        return None

    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "keyword": city,
        "subType": "CITY",
        "page[limit]": 1
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(CITY_SEARCH_URL, headers=headers, params=params)
        if response.status_code != 200:
            print("Geocoding error:", response.text)
            return None

    data = response.json().get("data", [])
    if not data:
        return None

    geo = data[0].get("geoCode")
    return geo["latitude"], geo["longitude"]


@router.get("/places")
async def get_tours(city: str = Query(...), radius: int = 10):
    geo = await get_lat_lon_by_city(city)
    if not geo:
        return JSONResponse(status_code=400, content={"error": "Invalid city"})

    lat, lon = geo
    token = await get_amadeus_token()
    if not token:
        return JSONResponse(status_code=500, content={"error": "Authentication failed"})

    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "latitude": lat,
        "longitude": lon,
        "radius": radius,
        "page[limit]": 10
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(TOURS_URL, headers=headers, params=params)
        print("Tours response:", response.status_code, response.text)

        if response.status_code != 200:
            return JSONResponse(status_code=500, content={"error": "Tours request failed"})

        data = response.json().get("data", [])

        return [
            {
                "name": item.get("name"),
                "lat": item.get("geoCode", {}).get("latitude"),
                "lon": item.get("geoCode", {}).get("longitude"),
                "rating": item.get("rating"),
                "pictures": item.get("pictures", []),
                "minimumDuration": item.get("minimumDuration"),
                "id": item.get("id")
            }
            for item in data if item.get("geoCode")
        ]
