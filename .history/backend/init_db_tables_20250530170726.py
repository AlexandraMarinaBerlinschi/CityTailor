# init_ml_tables.py - Script pentru crearea tabelelor ML

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from database import Base, DATABASE_URL
from models import UserActivity, UserProfile, RecommendationCache, RecommendationFeedback, PlacePopularity, UserSimilarity

async def init_ml_tables():
    """Inițializează tabelele pentru sistemul de recomandare ML"""
    
    # Creează engine-ul pentru conexiunea la baza de date
    engine = create_async_engine(DATABASE_URL, echo=True)
    
    try:
        # Creează toate tabelele
        async with engine.begin() as conn:
            # Creează doar tabelele noi pentru ML
            await conn.run_sync(Base.metadata.create_all)
        
        print("✅ Tabelele ML au fost create cu succes!")
        
        # Testează conexiunea și creează câteva înregistrări de test
        async_session = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )
        
        async with async_session() as session:
            # Verifică dacă tabelele sunt funcționale
            from sqlalchemy import text
            
            # Test pentru UserActivity
            result = await session.execute(text("SELECT COUNT(*) FROM user_activities"))
            activity_count = result.scalar()
            print(f"📊 UserActivities table: {activity_count} records")
            
            # Test pentru UserProfile
            result = await session.execute(text("SELECT COUNT(*) FROM user_profiles"))
            profile_count = result.scalar()
            print(f"👤 UserProfiles table: {profile_count} records")
            
            # Test pentru PlacePopularity
            result = await session.execute(text("SELECT COUNT(*) FROM place_popularity"))
            popularity_count = result.scalar()
            print(f"📈 PlacePopularity table: {popularity_count} records")
            
            # Test pentru RecommendationCache
            result = await session.execute(text("SELECT COUNT(*) FROM recommendation_cache"))
            cache_count = result.scalar()
            print(f"💾 RecommendationCache table: {cache_count} records")
            
            print("✅ Toate tabelele ML sunt funcționale!")
        
    except Exception as e:
        print(f"❌ Eroare la crearea tabelelor ML: {e}")
        raise
    
    finally:
        await engine.dispose()

async def add_sample_data():
    """Adaugă date de test pentru a demonstra funcționalitatea"""
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as session:
            # Adaugă câteva locuri populare de test
            sample_places = [
                {
                    "place_id": "test_eiffel_tower",
                    "place_name": "Eiffel Tower",
                    "city": "Paris",
                    "total_views": 1500,
                    "total_favorites": 300,
                    "total_itinerary_adds": 450,
                    "total_shares": 120
                },
                {
                    "place_id": "test_louvre",
                    "place_name": "Louvre Museum",
                    "city": "Paris",
                    "total_views": 1200,
                    "total_favorites": 280,
                    "total_itinerary_adds": 380,
                    "total_shares": 95
                },
                {
                    "place_id": "test_colosseum",
                    "place_name": "Colosseum",
                    "city": "Rome",
                    "total_views": 1100,
                    "total_favorites": 250,
                    "total_itinerary_adds": 320,
                    "total_shares": 85
                }
            ]
            
            for place_data in sample_places:
                # Verifică dacă locul există deja
                from sqlalchemy.future import select
                result = await session.execute(
                    select(PlacePopularity).where(PlacePopularity.place_id == place_data["place_id"])
                )
                existing_place = result.scalar_one_or_none()
                
                if not existing_place:
                    place = PlacePopularity(
                        place_id=place_data["place_id"],
                        place_name=place_data["place_name"],
                        city=place_data["city"],
                        total_views=place_data["total_views"],
                        total_favorites=place_data["total_favorites"],
                        total_itinerary_adds=place_data["total_itinerary_adds"],
                        total_shares=place_data["total_shares"]
                    )
                    
                    # Calculează scorurile
                    place.popularity_score = (
                        place.total_views * 1.0 +
                        place.total_favorites * 3.0 +
                        place.total_itinerary_adds * 5.0 +
                        place.total_shares * 2.0
                    )
                    place.trending_score = place.total_views * 0.5  # Score simplu pentru trending
                    
                    session.add(place)
            
            await session.commit()
            print("✅ Date de test adăugate cu succes!")
        
    except Exception as e:
        print(f"❌ Eroare la adăugarea datelor de test: {e}")
        raise
    
    finally:
        await engine.dispose()

async def main():
    """Funcția principală pentru inițializare"""
    print("🚀 Inițializare sistem de recomandare ML...")
    
    # Creează tabelele
    await init_ml_tables()
    
    # Adaugă date de test
    await add_sample_data()
    
    print("🎉 Sistemul de recomandare ML a fost inițializat cu succes!")
    print("\n📝 Pașii următori:")
    print("1. Rulează backend-ul: uvicorn main:app --reload")
    print("2. Testează endpoint-urile de tracking:")
    print("   - POST /tracking/search")
    print("   - POST /tracking/interaction")
    print("   - GET /profile/{user_id}")
    print("   - GET /trending")
    print("   - GET /popular")

if __name__ == "__main__":
    asyncio.run(main())