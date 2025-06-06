# tracking_service.py - Serviciu pentru tracking-ul comportamentului utilizatorului

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc
from models import UserActivity, UserProfile, RecommendationFeedback, PlacePopularity, User
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union

class UserTrackingService:
    
    @staticmethod
    async def get_or_create_user_id(session_id: str, user_id: Optional[Union[str, uuid.UUID]] = None) -> str:
        """Obține sau creează un user_id pentru tracking"""
        if user_id:
            # Convertește UUID la string dacă e necesar
            return str(user_id)
        # Pentru utilizatori anonimi, folosim session_id
        return f"anonymous_{session_id}"
    
    @staticmethod
    async def track_search(
        db: AsyncSession,
        user_id: Union[str, uuid.UUID, None],
        session_id: str,
        city: str,
        activities: List[str],
        time: str,
        user_agent: str = None,
        ip_address: str = None
    ):
        """Înregistrează o căutare"""
        
        # Handle user_id pentru utilizatori autentificați vs anonimi
        db_user_id = None
        if user_id and not str(user_id).startswith("anonymous_"):
            if isinstance(user_id, str):
                try:
                    db_user_id = uuid.UUID(user_id)
                except ValueError:
                    db_user_id = None
            else:
                db_user_id = user_id
        
        activity = UserActivity(
            user_id=db_user_id,
            session_id=session_id,
            activity_type="search",
            city=city,
            search_activities=activities,
            search_time=time,
            user_agent=user_agent,
            ip_address=ip_address
        )
        
        db.add(activity)
        await db.commit()
        
        # Actualizează profilul utilizatorului dacă e autentificat
        if db_user_id:
            await UserTrackingService._update_user_profile(db, db_user_id, {
                'search_activities': activities,
                'search_time': time,
                'city': city,
                'activity_type': 'search'
            })
    
    @staticmethod
    async def track_place_interaction(
        db: AsyncSession,
        user_id: Union[str, uuid.UUID, None],
        session_id: str,
        activity_type: str,  # 'view', 'favorite', 'add_to_itinerary', 'share'
        place_name: str,
        place_id: str = None,
        city: str = None,
        lat: float = None,
        lon: float = None,
        time_spent: float = None,
        click_position: int = None,
        rating_given: float = None
    ):
        """Înregistrează interacțiunea cu un loc"""
        
        # Handle user_id pentru utilizatori autentificați vs anonimi
        db_user_id = None
        if user_id and not str(user_id).startswith("anonymous_"):
            if isinstance(user_id, str):
                try:
                    db_user_id = uuid.UUID(user_id)
                except ValueError:
                    db_user_id = None
            else:
                db_user_id = user_id
        
        activity = UserActivity(
            user_id=db_user_id,
            session_id=session_id,
            activity_type=activity_type,
            place_name=place_name,
            place_id=place_id,
            city=city,
            lat=lat,
            lon=lon,
            time_spent=time_spent,
            click_position=click_position,
            rating_given=rating_given
        )
        
        db.add(activity)
        
        # Actualizează popularitatea locului
        await UserTrackingService._update_place_popularity(
            db, place_id, place_name, city, activity_type
        )
        
        await db.commit()
        
        # Actualizează profilul utilizatorului dacă e autentificat
        if db_user_id:
            await UserTrackingService._update_user_profile(db, db_user_id, {
                'activity_type': activity_type,
                'place_name': place_name,
                'city': city,
                'rating': rating_given
            })
    
    @staticmethod
    async def _update_place_popularity(
        db: AsyncSession,
        place_id: str,
        place_name: str,
        city: str,
        activity_type: str
    ):
        """Actualizează popularitatea unui loc"""
        if not place_id:
            return
        
        # Găsește sau creează intrarea de popularitate
        result = await db.execute(
            select(PlacePopularity).where(PlacePopularity.place_id == place_id)
        )
        popularity = result.scalar_one_or_none()
        
        if not popularity:
            popularity = PlacePopularity(
                place_id=place_id,
                place_name=place_name,
                city=city
            )
            db.add(popularity)
        
        # Actualizează contoarele pe baza tipului de activitate
        if activity_type == 'view':
            popularity.total_views += 1
        elif activity_type == 'favorite':
            popularity.total_favorites += 1
        elif activity_type == 'add_to_itinerary':
            popularity.total_itinerary_adds += 1
        elif activity_type == 'share':
            popularity.total_shares += 1
        
        # Calculează scorul de popularitate
        # Weighted scoring: favorites și itinerary adds au greutate mai mare
        popularity.popularity_score = (
            popularity.total_views * 1.0 +
            popularity.total_favorites * 3.0 +
            popularity.total_itinerary_adds * 5.0 +
            popularity.total_shares * 2.0
        )
        
        # Calculează trending score (bazat pe activitatea din ultimele 7 zile)
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_activities = await db.execute(
            select(func.count(UserActivity.id))
            .where(UserActivity.place_id == place_id)
            .where(UserActivity.created_at >= week_ago)
        )
        recent_count = recent_activities.scalar() or 0
        popularity.trending_score = recent_count * 10.0  # Amplificare pentru trending
    
    @staticmethod
    async def _update_user_profile(db: AsyncSession, user_id: uuid.UUID, activity_data: Dict):
        """Actualizează profilul utilizatorului bazat pe activitate"""
        
        # Găsește sau creează profilul utilizatorului
        result = await db.execute(
            select(UserProfile).where(UserProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()
        
        if not profile:
            profile = UserProfile(user_id=user_id)
            db.add(profile)
        
        # Actualizează contoarele
        if activity_data.get('activity_type') == 'search':
            profile.total_searches += 1
        elif activity_data.get('activity_type') == 'favorite':
            profile.total_favorites += 1
        elif activity_data.get('activity_type') == 'add_to_itinerary':
            profile.total_itineraries += 1
        
        # Actualizează preferințele pe baza activităților de căutare
        if 'search_activities' in activity_data:
            activities = activity_data['search_activities']
            learning_rate = 0.1  # Cât de repede învață sistemul
            
            for activity in activities:
                if activity == 'Cultural':
                    profile.cultural_preference = min(1.0, profile.cultural_preference + learning_rate)
                elif activity == 'Outdoor':
                    profile.outdoor_preference = min(1.0, profile.outdoor_preference + learning_rate)
                elif activity == 'Relaxation':
                    profile.relaxation_preference = min(1.0, profile.relaxation_preference + learning_rate)
                elif activity == 'Gastronomy':
                    profile.gastronomy_preference = min(1.0, profile.gastronomy_preference + learning_rate)
        
        # Actualizează preferințele de timp
        if 'search_time' in activity_data:
            time_pref = activity_data['search_time']
            learning_rate = 0.1
            
            if time_pref == '<2h':
                profile.short_duration_preference = min(1.0, profile.short_duration_preference + learning_rate)
            elif time_pref == '2-4h':
                profile.medium_duration_preference = min(1.0, profile.medium_duration_preference + learning_rate)
            elif time_pref == '>4h':
                profile.long_duration_preference = min(1.0, profile.long_duration_preference + learning_rate)
        
        # Actualizează orașele preferate
        if 'city' in activity_data and activity_data['city']:
            favorite_cities = profile.favorite_cities or {}
            city = activity_data['city']
            
            # Incrementează scorul pentru oraș
            if city in favorite_cities:
                favorite_cities[city] += 1
            else:
                favorite_cities[city] = 1
            
            # Păstrează doar top 10 orașe
            sorted_cities = dict(sorted(favorite_cities.items(), key=lambda x: x[1], reverse=True)[:10])
            profile.favorite_cities = sorted_cities
        
        # Actualizează rating-ul minim preferat
        if 'rating' in activity_data and activity_data['rating']:
            rating = activity_data['rating']
            if rating > profile.min_rating_preference:
                # Ajustează încet rating-ul minim preferat în sus
                profile.min_rating_preference = (profile.min_rating_preference * 0.9) + (rating * 0.1)
        
        profile.updated_at = datetime.utcnow()
        profile.last_activity = datetime.utcnow()
    
    @staticmethod
    async def get_user_profile(db: AsyncSession, user_id: Union[str, uuid.UUID]) -> Optional[UserProfile]:
        """Obține profilul utilizatorului"""
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        
        result = await db.execute(
            select(UserProfile).where(UserProfile.user_id == user_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user_activity_history(
        db: AsyncSession, 
        user_id: Union[str, uuid.UUID], 
        limit: int = 100,
        activity_type: str = None
    ) -> List[UserActivity]:
        """Obține istoricul activităților utilizatorului"""
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        
        query = select(UserActivity).where(UserActivity.user_id == user_id)
        
        if activity_type:
            query = query.where(UserActivity.activity_type == activity_type)
        
        query = query.order_by(desc(UserActivity.created_at)).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_trending_places(db: AsyncSession, city: str = None, limit: int = 10) -> List[PlacePopularity]:
        """Obține locurile trending"""
        query = select(PlacePopularity).order_by(desc(PlacePopularity.trending_score))
        
        if city:
            query = query.where(PlacePopularity.city == city)
        
        query = query.limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_popular_places(db: AsyncSession, city: str = None, limit: int = 10) -> List[PlacePopularity]:
        """Obține locurile populare"""
        query = select(PlacePopularity).order_by(desc(PlacePopularity.popularity_score))
        
        if city:
            query = query.where(PlacePopularity.city == city)
        
        query = query.limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def cleanup_old_activities(db: AsyncSession, days: int = 90):
        """Curăță activitățile vechi pentru a optimiza baza de date"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        await db.execute(
            UserActivity.__table__.delete().where(
                UserActivity.created_at < cutoff_date
            )
        )
        await db.commit()