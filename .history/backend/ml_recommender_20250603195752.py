from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, func
from models import UserActivity, UserProfile, PlacePopularity, User
from typing import List, Dict, Optional
import json
from datetime import datetime, timedelta
import uuid

class MLRecommender:
    """Sistem ML simplificat cu focus pe detectarea activității pentru Home"""
    
    def __init__(self):
        print("ML Recommender initialized with activity detection")
    
    async def get_home_recommendations(
        self, 
        db: AsyncSession, 
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        limit: int = 8
    ) -> Dict:
        """Funcția principală pentru recomandări Home cu detectare activitate"""
        
        print(f"Generating recommendations for user: {user_id or 'anonymous'}")
        
        # Verifică dacă avem date în baza de date
        result = await db.execute(select(func.count(PlacePopularity.id)))
        total_places = result.scalar() or 0
        
        if total_places == 0:
            print("No places in database")
            return {
                'main_recommendations': [],
                'recommendation_type': 'no_data',
                'message': 'No places found. Please search for destinations first.',
                'data_source': 'none'
            }
        
        # Verifică activitatea utilizatorului
        activity_count = await self._count_user_activities(db, user_id, session_id)
        
        if activity_count == 0:
            print("User has no activity - returning general recommendations")
            return await self._get_general_recommendations(db, limit)
        
        print(f"User has {activity_count} activities - generating personalized recommendations")
        
        if user_id:
            return await self._get_personalized_recommendations(db, user_id, limit)
        else:
            return await self._get_session_recommendations(db, session_id, limit)
    
    async def _count_user_activities(
        self, 
        db: AsyncSession, 
        user_id: Optional[str], 
        session_id: Optional[str]
    ) -> int:
        """Contorizează activitățile utilizatorului"""
        try:
            if user_id:
                user_uuid = uuid.UUID(user_id)
                result = await db.execute(
                    select(func.count(UserActivity.id))
                    .where(UserActivity.user_id == user_uuid)
                )
            elif session_id:
                result = await db.execute(
                    select(func.count(UserActivity.id))
                    .where(UserActivity.session_id == session_id)
                    .where(UserActivity.user_id.is_(None))
                )
            else:
                return 0
            
            return result.scalar() or 0
        except Exception as e:
            print(f"Error counting activities: {e}")
            return 0
    
    async def _get_general_recommendations(self, db: AsyncSession, limit: int) -> Dict:
        """Recomandări generale pentru utilizatori fără activitate"""
        
        try:
            # Obține locurile cele mai populare
            result = await db.execute(
                select(PlacePopularity)
                .order_by(desc(PlacePopularity.popularity_score))
                .limit(limit)
            )
            
            places = result.scalars().all()
            recommendations = self._convert_places_to_recommendations(places)
            
            return {
                'main_recommendations': recommendations,
                'recommendation_type': 'general_popular',
                'personalization_level': 'none',
                'data_source': f"database({len(recommendations)})",
                'message': 'Popular destinations to get you started'
            }
            
        except Exception as e:
            print(f"Error getting general recommendations: {e}")
            return {
                'main_recommendations': [],
                'recommendation_type': 'error',
                'message': 'Could not load recommendations'
            }
    
    async def _get_personalized_recommendations(
        self, 
        db: AsyncSession, 
        user_id: str, 
        limit: int
    ) -> Dict:
        """Recomandări personalizate pentru utilizatori cu activitate"""
        
        try:
            # Analizează comportamentul utilizatorului
            behavior = await self._analyze_user_behavior(db, user_id)
            
            # Obține recomandări bazate pe orașe favorite
            city_recommendations = []
            if behavior['favorite_cities']:
                city_recommendations = await self._get_city_recommendations(
                    db, behavior['favorite_cities'], limit // 2
                )
            
            # Obține recomandări generale dacă nu avem suficiente
            general_recommendations = []
            if len(city_recommendations) < limit:
                remaining = limit - len(city_recommendations)
                result = await db.execute(
                    select(PlacePopularity)
                    .order_by(desc(PlacePopularity.popularity_score))
                    .limit(remaining)
                )
                general_places = result.scalars().all()
                general_recommendations = self._convert_places_to_recommendations(general_places)
            
            # Combină recomandările
            all_recommendations = city_recommendations + general_recommendations
            
            return {
                'main_recommendations': all_recommendations[:limit],
                'in_your_favorite_cities': city_recommendations[:3],
                'popular_destinations': general_recommendations[:3],
                'recommendation_type': 'personalized',
                'personalization_level': behavior['engagement_level'],
                'data_source': f"mixed({len(all_recommendations)})",
                'user_insights': {
                    'total_activities': behavior['total_activities'],
                    'favorite_cities': list(behavior['favorite_cities'].keys())[:3]
                }
            }
            
        except Exception as e:
            print(f"Error getting personalized recommendations: {e}")
            return await self._get_general_recommendations(db, limit)
    
    async def _get_session_recommendations(
        self, 
        db: AsyncSession, 
        session_id: str, 
        limit: int
    ) -> Dict:
        """Recomandări bazate pe sesiunea curentă"""
        
        try:
            # Obține activitățile din sesiune
            result = await db.execute(
                select(UserActivity)
                .where(UserActivity.session_id == session_id)
                .where(UserActivity.user_id.is_(None))
                .order_by(desc(UserActivity.created_at))
            )
            
            activities = result.scalars().all()
            
            if not activities:
                return await self._get_general_recommendations(db, limit)
            
            # Extrage orașele căutate în sesiune
            session_cities = {}
            for activity in activities:
                if activity.city:
                    session_cities[activity.city] = session_cities.get(activity.city, 0) + 1
            
            # Obține recomandări pentru orașele din sesiune
            recommendations = []
            if session_cities:
                recommendations = await self._get_city_recommendations(
                    db, session_cities, limit
                )
            
            # Completează cu recomandări generale dacă e nevoie
            if len(recommendations) < limit:
                remaining = limit - len(recommendations)
                result = await db.execute(
                    select(PlacePopularity)
                    .order_by(desc(PlacePopularity.trending_score))
                    .limit(remaining)
                )
                trending_places = result.scalars().all()
                trending_recs = self._convert_places_to_recommendations(trending_places)
                recommendations.extend(trending_recs)
            
            return {
                'main_recommendations': recommendations[:limit],
                'based_on_your_searches': recommendations[:3],
                'recommendation_type': 'session_based',
                'personalization_level': 'session',
                'data_source': f"session({len(recommendations)})",
                'session_insights': {
                    'cities_explored': list(session_cities.keys()),
                    'total_session_activities': len(activities)
                }
            }
            
        except Exception as e:
            print(f"Error getting session recommendations: {e}")
            return await self._get_general_recommendations(db, limit)
    
    async def _get_city_recommendations(
        self, 
        db: AsyncSession, 
        cities: Dict, 
        limit: int
    ) -> List[Dict]:
        """Obține recomandări pentru orașe specifice"""
        
        if not cities:
            return []
        
        city_names = list(cities.keys())[:3]
        
        try:
            result = await db.execute(
                select(PlacePopularity)
                .where(PlacePopularity.city.in_(city_names))
                .order_by(desc(PlacePopularity.popularity_score))
                .limit(limit)
            )
            
            places = result.scalars().all()
            return self._convert_places_to_recommendations(
                places, 
                f"Popular in {', '.join(city_names[:2])}"
            )
            
        except Exception as e:
            print(f"Error getting city recommendations: {e}")
            return []
    
    def _convert_places_to_recommendations(
        self, 
        places: List, 
        reason: str = "Popular destination"
    ) -> List[Dict]:
        """Convertește PlacePopularity în format de recomandări"""
        
        recommendations = []
        
        # Poze de calitate pentru orașe
        city_images = {
            'paris': "https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=400&h=300&fit=crop&q=80",
            'rome': "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=300&fit=crop&q=80",
            'barcelona': "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400&h=300&fit=crop&q=80",
            'london': "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop&q=80",
            'tokyo': "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop&q=80",
            'new york': "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=300&fit=crop&q=80"
        }
        
        default_image = "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop&q=80"
        
        # Coordonate pentru orașe
        city_coords = {
            'paris': (48.8566, 2.3522),
            'rome': (41.9028, 12.4964),
            'barcelona': (41.3851, 2.1734),
            'london': (51.5074, -0.1278),
            'tokyo': (35.6762, 139.6503),
            'new york': (40.7128, -74.0060)
        }
        
        for place in places:
            city_lower = place.city.lower()
            
            # Selectează poza
            main_picture = city_images.get(city_lower, default_image)
            
            # Coordonate cu variație mică
            base_lat, base_lon = city_coords.get(city_lower, (48.8566, 2.3522))
            lat_offset = (abs(hash(place.place_name)) % 100 - 50) / 10000
            lon_offset = (abs(hash(place.place_name + "lon")) % 100 - 50) / 10000
            
            recommendations.append({
                'place_id': place.place_id,
                'name': place.place_name,
                'city': place.city,
                'rating': min(5.0, max(3.0, 3.5 + (place.popularity_score or 0) / 1000)),
                'popularity_score': place.popularity_score or 0,
                'recommendation_reason': reason,
                'pictures': [main_picture],
                'description': f"Discover this amazing place in {place.city}. A must-see destination.",
                'category': 'Experience',
                'minimumDuration': '2-4h',
                'score': max(3.0, 3.5 + (place.popularity_score or 0) / 100),
                'lat': base_lat + lat_offset,
                'lon': base_lon + lon_offset,
                'data_source': 'database',
                'is_real_place': True
            })
        
        return recommendations
    
    async def _analyze_user_behavior(self, db: AsyncSession, user_id: str) -> Dict:
        """Analizează comportamentul utilizatorului"""
        
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            return {
                'is_new_user': True, 
                'total_activities': 0,
                'favorite_cities': {},
                'engagement_level': 'new'
            }
        
        try:
            # Obține activitățile din ultima lună
            month_ago = datetime.utcnow() - timedelta(days=30)
            
            result = await db.execute(
                select(UserActivity)
                .where(UserActivity.user_id == user_uuid)
                .where(UserActivity.created_at >= month_ago)
                .order_by(desc(UserActivity.created_at))
            )
            
            activities = result.scalars().all()
            
            if len(activities) < 2:
                return {
                    'is_new_user': True, 
                    'total_activities': len(activities),
                    'favorite_cities': {},
                    'engagement_level': 'new'
                }
            
            # Analizează orașele
            cities = {}
            for activity in activities:
                if activity.city:
                    cities[activity.city] = cities.get(activity.city, 0) + 1
            
            # Sortează orașele după frecvență
            favorite_cities = dict(
                sorted(cities.items(), key=lambda x: x[1], reverse=True)[:5]
            )
            
            # Determină nivelul de angajament
            engagement = 'new'
            if len(activities) > 15:
                engagement = 'high'
            elif len(activities) > 5:
                engagement = 'medium'
            else:
                engagement = 'low'
            
            return {
                'is_new_user': False,
                'total_activities': len(activities),
                'favorite_cities': favorite_cities,
                'engagement_level': engagement
            }
            
        except Exception as e:
            print(f"Error analyzing user behavior: {e}")
            return {
                'is_new_user': True, 
                'total_activities': 0,
                'favorite_cities': {},
                'engagement_level': 'new'
            }
    
    # ===== TRACKING METHODS =====
    
    async def track_search(
        self, 
        db: AsyncSession, 
        user_id: Optional[str], 
        session_id: str,
        city: str, 
        activities: List[str], 
        time: str
    ):
        """Track căutări"""
        
        user_uuid = None
        if user_id:
            try:
                user_uuid = uuid.UUID(user_id)
                # Verifică dacă utilizatorul există
                if not await self._check_user_exists(db, user_id):
                    print(f"User {user_id} not found, tracking as anonymous")
                    user_uuid = None
            except ValueError:
                print(f"Invalid user_id format: {user_id}")
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
        print(f"Search tracked ({user_type}): {city} - {activities}")
    
    async def track_interaction(
        self,
        db: AsyncSession,
        user_id: Optional[str],
        session_id: str,
        interaction_type: str,
        place_name: str,
        place_id: str = None,
        city: str = None
    ):
        """Track interacțiuni cu locuri"""
        
        user_uuid = None
        if user_id:
            try:
                user_uuid = uuid.UUID(user_id)
                if not await self._check_user_exists(db, user_id):
                    user_uuid = None
            except ValueError:
                user_uuid = None
        
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
        print(f"Interaction tracked ({user_type}): {interaction_type} - {place_name}")
    
    async def _update_place_popularity(
        self, 
        db: AsyncSession, 
        place_id: str, 
        place_name: str, 
        city: str, 
        interaction_type: str
    ):
        """Actualizează popularitatea unui loc"""
        
        if not place_id and place_name and city:
            place_id = f"{place_name}_{city}".lower().replace(' ', '_')
        
        if not place_id:
            return
        
        try:
            result = await db.execute(
                select(PlacePopularity).where(PlacePopularity.place_id == place_id)
            )
            
            popularity = result.scalar_one_or_none()
            
            if not popularity:
                popularity = PlacePopularity(
                    place_id=place_id,
                    place_name=place_name,
                    city=city,
                    popularity_score=0,
                    trending_score=0,
                    total_views=0,
                    total_favorites=0,
                    total_itinerary_adds=0,
                    total_shares=0,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(popularity)
            
            # Actualizează contoarele
            if interaction_type == 'view':
                popularity.total_views = (popularity.total_views or 0) + 1
            elif interaction_type == 'favorite':
                popularity.total_favorites = (popularity.total_favorites or 0) + 1
            elif interaction_type == 'add_to_itinerary':
                popularity.total_itinerary_adds = (popularity.total_itinerary_adds or 0) + 1
            elif interaction_type == 'share':
                popularity.total_shares = (popularity.total_shares or 0) + 1
            
            # Recalculează scorul de popularitate
            popularity.popularity_score = (
                (popularity.total_views or 0) * 1.0 +
                (popularity.total_favorites or 0) * 3.0 +
                (popularity.total_itinerary_adds or 0) * 5.0 +
                (popularity.total_shares or 0) * 2.0
            )
            
            # Update trending score
            week_ago = datetime.utcnow() - timedelta(days=7)
            recent_result = await db.execute(
                select(func.count(UserActivity.id))
                .where(UserActivity.place_name == place_name)
                .where(UserActivity.created_at >= week_ago)
            )
            
            recent_activity = recent_result.scalar() or 0
            popularity.trending_score = recent_activity * 10.0
            
            popularity.updated_at = datetime.utcnow()
            
        except Exception as e:
            print(f"Error updating place popularity: {e}")
    
    async def _check_user_exists(self, db: AsyncSession, user_id: str) -> bool:
        """Verifică dacă utilizatorul există"""
        try:
            user_uuid = uuid.UUID(user_id)
            result = await db.execute(
                select(User).where(User.id == user_uuid)
            )
            return result.scalar_one_or_none() is not None
        except Exception:
            return False