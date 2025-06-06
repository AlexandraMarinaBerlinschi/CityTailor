# ml_recommender.py - Sistem ML pentru recomandări (Supabase) cu suport anonim

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, func, and_
from models import UserActivity, UserProfile, PlacePopularity, User
from typing import List, Dict, Optional
import json
from datetime import datetime, timedelta
import uuid

class MLRecommender:
    """Sistem ML simplu și eficient pentru recomandări personalizate + utilizatori anonimi"""
    
    async def get_home_recommendations(
        self, 
        db: AsyncSession, 
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        limit: int = 8
    ) -> Dict:
        """Funcția principală - obține recomandări pentru homepage"""
        
        print(f"🤖 Generez recomandări ML pentru user: {user_id or 'anonymous'}")
        
        if not user_id:
            # Utilizator anonim - încearcă recomandări pe sesiune
            if session_id:
                return await self._get_session_based_recommendations(db, session_id, limit)
            else:
                return await self._get_general_recommendations(db, limit)
        
        # Verifică dacă utilizatorul există în auth.users
        user_exists = await self._check_user_exists(db, user_id)
        if not user_exists:
            print("⚠️  User not found in auth.users, treating as anonymous")
            if session_id:
                return await self._get_session_based_recommendations(db, session_id, limit)
            else:
                return await self._get_general_recommendations(db, limit)
        
        # Utilizator autentificat - analizează comportamentul
        user_behavior = await self._analyze_user_behavior(db, user_id)
        
        if user_behavior['is_new_user']:
            # Utilizator nou - recomandări generale + trending
            print("👤 Utilizator nou - recomandări generale")
            return await self._get_new_user_recommendations(db, limit)
        else:
            # Utilizator cu istoric - recomandări personalizate
            print("🎯 Utilizator cu istoric - recomandări personalizate")
            return await self._get_personalized_recommendations(db, user_id, user_behavior, limit)
    
    async def _check_user_exists(self, db: AsyncSession, user_id: str) -> bool:
        """Verifică dacă utilizatorul există în baza de date"""
        try:
            user_uuid = uuid.UUID(user_id)
            result = await db.execute(
                select(User).where(User.id == user_uuid)
            )
            return result.scalar_one_or_none() is not None
        except (ValueError, Exception):
            return False
    
    async def _get_session_based_recommendations(
        self, 
        db: AsyncSession, 
        session_id: str, 
        limit: int
    ) -> Dict:
        """Recomandări bazate pe activitatea din sesiunea curentă (utilizatori anonimi)"""
        
        print(f"👤 Analizez sesiunea anonimă: {session_id}")
        
        # Obține activitățile din această sesiune
        result = await db.execute(
            select(UserActivity)
            .where(UserActivity.session_id == session_id)
            .where(UserActivity.user_id.is_(None))  # Doar activități anonime
            .order_by(desc(UserActivity.created_at))
        )
        
        session_activities = result.scalars().all()
        
        if not session_activities:
            return await self._get_general_recommendations(db, limit)
        
        # Analizează preferințele din sesiune
        session_preferences = await self._analyze_session_preferences(session_activities)
        
        # Generează recomandări bazate pe sesiune
        recommendations = await self._get_recommendations_for_session(
            db, session_preferences, limit
        )
        
        return {
            'main_recommendations': recommendations[:4],
            'similar_to_your_searches': recommendations[4:6] if len(recommendations) > 4 else [],
            'trending_now': await self._get_trending_recommendations(db, 2),
            'personalization_level': 'session',
            'recommendation_type': 'anonymous_session',
            'session_insights': session_preferences
        }
    
    async def _analyze_session_preferences(self, activities: List[UserActivity]) -> Dict:
        """Analizează preferințele din activitățile unei sesiuni"""
        
        preferences = {'Cultural': 0, 'Outdoor': 0, 'Relaxation': 0, 'Gastronomy': 0}
        cities = {}
        time_preferences = {'<2h': 0, '2-4h': 0, '>4h': 0}
        
        for activity in activities:
            # Analizează căutările
            if activity.activity_type == 'search' and activity.search_activities:
                search_activities = activity.search_activities
                if isinstance(search_activities, str):
                    search_activities = json.loads(search_activities)
                
                for cat in search_activities:
                    if cat in preferences:
                        preferences[cat] += 1
                
                # Timp preferat
                if activity.search_time and activity.search_time in time_preferences:
                    time_preferences[activity.search_time] += 1
            
            # Orașe de interes
            if activity.city:
                cities[activity.city] = cities.get(activity.city, 0) + 1
        
        # Normalizează preferințele
        total_prefs = sum(preferences.values())
        if total_prefs > 0:
            preferences = {k: v/total_prefs for k, v in preferences.items()}
        
        return {
            'preferences': preferences,
            'cities_of_interest': cities,
            'time_preferences': time_preferences,
            'total_activities': len(activities)
        }
    
    async def _get_recommendations_for_session(
        self, 
        db: AsyncSession, 
        session_prefs: Dict, 
        limit: int
    ) -> List[Dict]:
        """Obține recomandări bazate pe preferințele sesiunii"""
        
        cities_of_interest = list(session_prefs['cities_of_interest'].keys())
        
        if cities_of_interest:
            # Recomandări pentru orașele de interes
            result = await db.execute(
                select(PlacePopularity)
                .where(PlacePopularity.city.in_(cities_of_interest))
                .order_by(desc(PlacePopularity.popularity_score))
                .limit(limit)
            )
            places = result.scalars().all()
            
            if places:
                return self._convert_places_to_recommendations(
                    places, 
                    "Based on your recent searches"
                )
        
        # Fallback - recomandări generale
        return await self._get_trending_recommendations(db, limit)
    
    async def _get_trending_recommendations(self, db: AsyncSession, limit: int) -> List[Dict]:
        """Obține recomandări trending"""
        result = await db.execute(
            select(PlacePopularity)
            .order_by(desc(PlacePopularity.trending_score))
            .limit(limit)
        )
        places = result.scalars().all()
        return self._convert_places_to_recommendations(places, "Trending now")
    
    async def _analyze_user_behavior(self, db: AsyncSession, user_id: str) -> Dict:
        """Analizează comportamentul utilizatorului autentificat"""
        
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            return {'is_new_user': True, 'total_activities': 0}
        
        # Obține toate activitățile din ultima lună
        month_ago = datetime.utcnow() - timedelta(days=30)
        
        result = await db.execute(
            select(UserActivity)
            .where(UserActivity.user_id == user_uuid)
            .where(UserActivity.created_at >= month_ago)
            .order_by(desc(UserActivity.created_at))
        )
        
        activities = result.scalars().all()
        
        if len(activities) < 3:
            return {'is_new_user': True, 'total_activities': len(activities)}
        
        # Analizează preferințele
        preferences = {'Cultural': 0, 'Outdoor': 0, 'Relaxation': 0, 'Gastronomy': 0}
        cities = {}
        time_preferences = {'<2h': 0, '2-4h': 0, '>4h': 0}
        
        for activity in activities:
            # Analizează activitățile de căutare
            if activity.activity_type == 'search' and activity.search_activities:
                search_activities = activity.search_activities
                if isinstance(search_activities, str):
                    search_activities = json.loads(search_activities)
                
                for cat in search_activities:
                    if cat in preferences:
                        preferences[cat] += 1
                
                # Timp preferat
                if activity.search_time and activity.search_time in time_preferences:
                    time_preferences[activity.search_time] += 1
            
            # Orașe vizitate
            if activity.city:
                cities[activity.city] = cities.get(activity.city, 0) + 1
        
        # Normalizează preferințele
        total_prefs = sum(preferences.values())
        if total_prefs > 0:
            preferences = {k: v/total_prefs for k, v in preferences.items()}
        
        # Orașele preferate
        favorite_cities = dict(sorted(cities.items(), key=lambda x: x[1], reverse=True)[:5])
        
        return {
            'is_new_user': False,
            'total_activities': len(activities),
            'preferences': preferences,
            'favorite_cities': favorite_cities,
            'time_preferences': time_preferences,
            'engagement_level': 'high' if len(activities) > 15 else 'medium'
        }
    
    async def _get_general_recommendations(self, db: AsyncSession, limit: int) -> Dict:
        """Recomandări generale pentru utilizatori anonimi fără activitate"""
        
        # Obține locurile cele mai populare
        result = await db.execute(
            select(PlacePopularity)
            .order_by(desc(PlacePopularity.popularity_score))
            .limit(limit)
        )
        
        popular_places = result.scalars().all()
        
        # Obține locurile trending
        result_trending = await db.execute(
            select(PlacePopularity)
            .order_by(desc(PlacePopularity.trending_score))
            .limit(limit//2)
        )
        
        trending_places = result_trending.scalars().all()
        
        return {
            'main_recommendations': self._convert_places_to_recommendations(popular_places[:4]),
            'trending_worldwide': self._convert_places_to_recommendations(trending_places),
            'most_popular': self._convert_places_to_recommendations(popular_places[4:]),
            'personalization_level': 'none',
            'recommendation_type': 'general'
        }
    
    async def _get_new_user_recommendations(self, db: AsyncSession, limit: int) -> Dict:
        """Recomandări pentru utilizatori noi (cu puține activități)"""
        
        # Mix de popular și trending
        result = await db.execute(
            select(PlacePopularity)
            .order_by(desc(PlacePopularity.popularity_score + PlacePopularity.trending_score))
            .limit(limit)
        )
        
        mixed_places = result.scalars().all()
        
        return {
            'main_recommendations': self._convert_places_to_recommendations(mixed_places[:4]),
            'trending_for_beginners': self._convert_places_to_recommendations(mixed_places[4:6]),
            'most_loved': self._convert_places_to_recommendations(mixed_places[6:]),
            'personalization_level': 'low',
            'recommendation_type': 'new_user'
        }
    
    async def _get_personalized_recommendations(
        self, 
        db: AsyncSession, 
        user_id: str, 
        behavior: Dict, 
        limit: int
    ) -> Dict:
        """Recomandări personalizate bazate pe comportament"""
        
        # Actualizează sau creează profilul utilizatorului
        await self._update_user_profile(db, user_id, behavior)
        
        # Obține recomandări bazate pe orașele preferate
        city_recommendations = await self._get_recommendations_for_favorite_cities(
            db, behavior['favorite_cities'], limit//2
        )
        
        # Obține recomandări bazate pe preferințe
        category_recommendations = await self._get_recommendations_by_preferences(
            db, behavior['preferences'], limit//2
        )
        
        # Combină rezultatele
        all_recommendations = city_recommendations + category_recommendations
        
        # Elimină duplicatele
        seen = set()
        unique_recommendations = []
        for rec in all_recommendations:
            if rec['place_id'] not in seen:
                seen.add(rec['place_id'])
                unique_recommendations.append(rec)
        
        return {
            'main_recommendations': unique_recommendations[:4],
            'in_your_favorite_cities': city_recommendations[:4],
            'matching_your_interests': category_recommendations[:4],
            'personalization_level': behavior['engagement_level'],
            'recommendation_type': 'personalized',
            'user_preferences': behavior['preferences'],
            'favorite_cities': list(behavior['favorite_cities'].keys())
        }
    
    async def _update_user_profile(self, db: AsyncSession, user_id: str, behavior: Dict):
        """Actualizează profilul ML al utilizatorului (doar pentru utilizatori autentificați)"""
        
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            return
        
        # Verifică dacă utilizatorul există
        if not await self._check_user_exists(db, user_id):
            print(f"⚠️  Cannot update profile - user {user_id} not found in auth.users")
            return
        
        # Găsește sau creează profilul
        result = await db.execute(
            select(UserProfile).where(UserProfile.user_id == user_uuid)
        )
        
        profile = result.scalar_one_or_none()
        
        if not profile:
            # Creează profil nou
            profile = UserProfile(
                user_id=user_uuid,
                cultural_preference=behavior['preferences'].get('Cultural', 0.5),
                outdoor_preference=behavior['preferences'].get('Outdoor', 0.5),
                relaxation_preference=behavior['preferences'].get('Relaxation', 0.5),
                gastronomy_preference=behavior['preferences'].get('Gastronomy', 0.5),
                favorite_cities=behavior['favorite_cities'],
                total_searches=behavior['total_activities']
            )
            db.add(profile)
        else:
            # Actualizează profilul existent cu învățare incrementală
            learning_rate = 0.1
            
            profile.cultural_preference = self._update_preference(
                profile.cultural_preference, behavior['preferences'].get('Cultural', 0), learning_rate
            )
            profile.outdoor_preference = self._update_preference(
                profile.outdoor_preference, behavior['preferences'].get('Outdoor', 0), learning_rate
            )
            profile.relaxation_preference = self._update_preference(
                profile.relaxation_preference, behavior['preferences'].get('Relaxation', 0), learning_rate
            )
            profile.gastronomy_preference = self._update_preference(
                profile.gastronomy_preference, behavior['preferences'].get('Gastronomy', 0), learning_rate
            )
            
            # Actualizează orașele preferate
            profile.favorite_cities = behavior['favorite_cities']
            profile.total_searches = behavior['total_activities']
            profile.updated_at = datetime.utcnow()
        
        await db.commit()
    
    def _update_preference(self, current: float, new_signal: float, learning_rate: float) -> float:
        """Actualizează o preferință cu învățare incrementală"""
        if new_signal > 0:
            # Folosește învățare incrementală
            return min(1.0, current + (new_signal * learning_rate))
        return current
    
    async def _get_recommendations_for_favorite_cities(
        self, 
        db: AsyncSession, 
        favorite_cities: Dict, 
        limit: int
    ) -> List[Dict]:
        """Obține recomandări pentru orașele preferate"""
        
        if not favorite_cities:
            return []
        
        # Obține locurile populare din orașele preferate
        city_names = list(favorite_cities.keys())[:3]  # Top 3 orașe
        
        result = await db.execute(
            select(PlacePopularity)
            .where(PlacePopularity.city.in_(city_names))
            .order_by(desc(PlacePopularity.popularity_score))
            .limit(limit)
        )
        
        places = result.scalars().all()
        return self._convert_places_to_recommendations(places, "Popular in your favorite cities")
    
    async def _get_recommendations_by_preferences(
        self, 
        db: AsyncSession, 
        preferences: Dict, 
        limit: int
    ) -> List[Dict]:
        """Obține recomandări bazate pe preferințele de categorie"""
        
        # Găsește categoria preferată
        top_category = max(preferences.items(), key=lambda x: x[1])[0] if preferences else 'Cultural'
        
        # Pentru simplitate, returnăm locurile populare
        # În viitor, aici vei integra cu API-ul Amadeus pentru a filtra pe categorii
        result = await db.execute(
            select(PlacePopularity)
            .order_by(desc(PlacePopularity.popularity_score))
            .limit(limit)
        )
        
        places = result.scalars().all()
        return self._convert_places_to_recommendations(
            places, 
            f"Matches your {top_category.lower()} interests"
        )
    
    def _convert_places_to_recommendations(
        self, 
        places: List, 
        reason: str = "Popular choice"
    ) -> List[Dict]:
        """Convertește PlacePopularity în format de recomandări"""
        
        recommendations = []
        
        for place in places:
            recommendations.append({
                'place_id': place.place_id,
                'name': place.place_name,
                'city': place.city,
                'rating': min(5.0, 3.5 + (place.popularity_score / 1000)),  # Estimare rating
                'popularity_score': place.popularity_score,
                'trending_score': place.trending_score,
                'recommendation_reason': reason,
                'image_url': f"https://source.unsplash.com/400x300/?{place.place_name.replace(' ', '%20')},{place.city}",
                'stats': {
                    'views': place.total_views,
                    'favorites': place.total_favorites,
                    'itinerary_adds': place.total_itinerary_adds
                }
            })
        
        return recommendations
    
    # ===== TRACKING METHODS (CU SUPORT ANONIM) =====
    
    async def track_search(
        self, 
        db: AsyncSession, 
        user_id: Optional[str], 
        session_id: str,
        city: str, 
        activities: List[str], 
        time: str
    ):
        """Tracking pentru căutări (funcționează și pentru utilizatori anonimi)"""
        
        user_uuid = None
        if user_id:
            try:
                user_uuid = uuid.UUID(user_id)
                # Verifică dacă utilizatorul există
                if not await self._check_user_exists(db, user_id):
                    print(f"⚠️  User {user_id} not found, tracking as anonymous")
                    user_uuid = None
            except ValueError:
                print(f"⚠️  Invalid user_id format: {user_id}, tracking as anonymous")
                user_uuid = None
        
        activity = UserActivity(
            user_id=user_uuid,
            session_id=session_id,
            activity_type='search',
            city=city,
            search_activities=activities,
            search_time=time,
            created_at=datetime.utcnow()
        )
        
        db.add(activity)
        await db.commit()
        
        user_type = "authenticated" if user_uuid else "anonymous"
        print(f"✅ Tracked search ({user_type}): {city} - {activities}")
    
    async def track_interaction(
        self,
        db: AsyncSession,
        user_id: Optional[str],
        session_id: str,
        interaction_type: str,  # 'view', 'favorite', 'add_to_itinerary'
        place_name: str,
        place_id: str = None,
        city: str = None
    ):
        """Tracking pentru interacțiuni cu locuri (funcționează și pentru utilizatori anonimi)"""
        
        user_uuid = None
        if user_id:
            try:
                user_uuid = uuid.UUID(user_id)
                # Verifică dacă utilizatorul există
                if not await self._check_user_exists(db, user_id):
                    print(f"⚠️  User {user_id} not found, tracking as anonymous")
                    user_uuid = None
            except ValueError:
                print(f"⚠️  Invalid user_id format: {user_id}, tracking as anonymous")
                user_uuid = None
        
        # Înregistrează activitatea
        activity = UserActivity(
            user_id=user_uuid,
            session_id=session_id,
            activity_type=interaction_type,
            place_name=place_name,
            place_id=place_id,
            city=city,
            created_at=datetime.utcnow()
        )
        
        db.add(activity)
        
        # Actualizează popularitatea locului
        await self._update_place_popularity(db, place_id, place_name, city, interaction_type)
        
        await db.commit()
        
        user_type = "authenticated" if user_uuid else "anonymous"
        print(f"✅ Tracked {interaction_type} ({user_type}): {place_name}")
    
    async def _update_place_popularity(
        self, 
        db: AsyncSession, 
        place_id: str, 
        place_name: str, 
        city: str, 
        interaction_type: str
    ):
        """Actualizează popularitatea unui loc"""
        
        if not place_id:
            place_id = f"{place_name}_{city}".lower().replace(' ', '_')
        
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
        
        # Actualizează contoarele
        if interaction_type == 'view':
            popularity.total_views += 1
        elif interaction_type == 'favorite':
            popularity.total_favorites += 1
        elif interaction_type == 'add_to_itinerary':
            popularity.total_itinerary_adds += 1
        elif interaction_type == 'share':
            popularity.total_shares += 1
        
        # Recalculează scorurile
        popularity.popularity_score = (
            popularity.total_views * 1.0 +
            popularity.total_favorites * 3.0 +
            popularity.total_itinerary_adds * 5.0 +
            popularity.total_shares * 2.0
        )
        
        # Calculează trending score (activitate din ultima săptămână)
        week_ago = datetime.utcnow() - timedelta(days=7)
        result = await db.execute(
            select(func.count(UserActivity.id))
            .where(UserActivity.place_id == place_id)
            .where(UserActivity.created_at >= week_ago)
        )
        
        recent_activity = result.scalar() or 0
        popularity.trending_score = recent_activity * 10.0
        
        popularity.updated_at = datetime.utcnow()