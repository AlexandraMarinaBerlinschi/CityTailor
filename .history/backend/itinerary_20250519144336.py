from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from database import get_db
from models import Itinerary, ItineraryActivity
from schemas import ItineraryCreate, ItineraryResponse, ItineraryActivityCreate, ItineraryActivityResponse
from auth import get_current_user
from typing import List

router = APIRouter()

@router.post("/", response_model=ItineraryResponse)
async def create_itinerary(
    itinerary: ItineraryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    new_itinerary = Itinerary(
        user_id=current_user["id"],
        city=itinerary.city,
        name=itinerary.name,
        activities=itinerary.activities,
    )
    db.add(new_itinerary)
    await db.commit()
    await db.refresh(new_itinerary)
    return new_itinerary

@router.get("/", response_model=List[ItineraryResponse])
async def get_user_itineraries(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Itinerary).where(Itinerary.user_id == current_user["id"]))
    return result.scalars().all()

@router.post("/{itinerary_id}/activities", response_model=ItineraryActivityResponse)
async def add_activity_to_itinerary(
    itinerary_id: int,
    activity: ItineraryActivityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Ensure the itinerary belongs to the current user
    result = await db.execute(select(Itinerary).where(Itinerary.id == itinerary_id, Itinerary.user_id == current_user["id"]))
    itinerary = result.scalar_one_or_none()
    if not itinerary:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    new_activity = ItineraryActivity(**activity.dict())
    db.add(new_activity)
    await db.commit()
    await db.refresh(new_activity)
    return new_activity

@router.get("/{itinerary_id}/activities", response_model=List[ItineraryActivityResponse])
async def get_activities_for_itinerary(
    itinerary_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Check if itinerary belongs to user
    result = await db.execute(select(Itinerary).where(Itinerary.id == itinerary_id, Itinerary.user_id == current_user["id"]))
    itinerary = result.scalar_one_or_none()
    if not itinerary:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    result = await db.execute(select(ItineraryActivity).where(ItineraryActivity.itinerary_id == itinerary_id))
    return result.scalars().all()
