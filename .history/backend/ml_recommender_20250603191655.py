# ml_recommender.py - Sistem ML îmbunătățit pentru recomandări reale

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, func, and_
from models import UserActivity, UserProfile, PlacePopularity, User
from typing import List, Dict, Optional
import json
from datetime import datetime, timedelta
import uuid
import random

class MLRecommender:
    """Sistem ML îmbunătățit care prioritizează datele reale vs. activitățile random"""
    
    def __init__(self):
        # Păstrăm activitățile random doar ca fallback
        self.fallback_activities_data = {
            "paris": [
                {
                    "name": "Eiffel Tower Experience",
                    "category": "Cultural",
                    "minimumDuration": "2-4h",
                    "description": "Visit the iconic iron tower with breathtaking city views.",
                    "lat": 48.8584,
                    "lon": 2.2945,
                    "rating": 4.6
                },
                {
                    "name": "Seine River Cruise",
                    "category": "Relaxation", 
                    "minimumDuration": "2h",
                    "description": "Peaceful boat ride through the heart of Paris.",
                    "lat": 48.8566,
                    "lon": 2.3522,
                    "rating": 4.4
                },
                {
                    "name": "Montmartre Walking Tour",
                    "category": "Cultural",
                    "minimumDuration": "3h", 
                    "description": "Explore the bohemian streets and visit Sacré-Cœur.",
                    "lat": 48.8867,
                    "lon": 2.3431,
                    "rating": 4.5
                }
            ],
            "rome": [
                {
                    "name": "Colosseum Tour",
                    "category": "Cultural",
                    "minimumDuration": "2-3h",
                    "description": "Step into ancient Rome's most famous amphitheater.",
                    "lat": 41.8902,
                    "lon": 12.4922,
                    "rating": 4.7
                },
                {
                    "name": "Trastevere Food Tour",
                    "category": "Gastronomy",
                    "minimumDuration": "3-4h",
                    "description": "Discover authentic Roman cuisine in charming Trastevere.",
                    "lat": 41.8896,
                    "lon": 12.4695,
                    "rating": 4.5
                }
            ],
            "barcelona": [
                {
                    "name": "Sagrada Familia",
                    "category": "Cultural",
                    "minimumDuration": "2h",
                    "description": "Gaudí's masterpiece basilica with stunning architecture.",
                    "lat": 41.4036,
                    "lon": 2.1744,
                    "rating": 4.7
                },
                {
                    "name": "Park Güell",
                    "category": "Outdoor", 
                    "minimumDuration": "2-3h",
                    "description": "Colorful mosaic park with city views.",
                    "lat": 41.4145,
                    "lon": 2.1527,
                    "rating": 4.4
                }
            ]
        }
    
    async def get_home_recommendations(
        self, 
        db: AsyncSession, 
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        limit: int = 8
    ) -> Dict:
        """Funcția principală - folosește DOAR datele tale reale din API și DB"""
        
        print(f"🔍 Generating REAL DATA recommendations for user: {user_id or 'anonymous'}")
        
        # PRIORITATE 1: Încearcă să obții date reale din PlacePopularity
        real_data_result = await self._get_real_data_only(db, limit)
        if real_data_result and len(real_data_result.get('main_recommendations', [])) > 0:
            print(f"✅ Using real data from database: {len(real_data_result['main_recommendations'])} places")
            return real_data_result
        
        # PRIORITATE 2: Dacă nu avem date în DB, returnează mesaj clar
        print("⚠️ No real data available - database needs to be populated")
        return {
            'main_recommendations': [],
            'similar_to_your_searches': [],
            'trending_now': [],
            'personalization_level': 'no_data',
            'recommendation_type': 'awaiting_real_data',
            'data_source': 'none',
            'message': 'No recommendations available. Please search for places first to populate the database.',
            'instructions': 'Use the search functionality to find places via Amadeus API, which will then populate the ML database.'
        }
    
    async def _get_real_data_only(self, db: AsyncSession, limit: int) -> Dict:
        """Obține recomandări DOAR din datele reale - fără fallback random"""
        
        print("📊 Fetching recommendations from real database...")
        
        try:
            # Încearcă să obții locuri din PlacePopularity
            result = await db.execute(
                select(PlacePopularity)
                .order_by(desc(PlacePopularity.popularity_score))
                .limit(limit * 2)  # Obține mai multe pentru varietate
            )
            
            popular_places = result.scalars().all()
            print(f"📍 Found {len(popular_places)} places in PlacePopularity table")
            
            if len(popular_places) > 0:
                recommendations = self._convert_places_to_recommendations(popular_places)
                
                # Organizează recomandările
                main_recs = recommendations[:4] if len(recommendations) >= 4 else recommendations
                trending_recs = recommendations[4:6] if len(recommendations) > 4 else []
                popular_recs = recommendations[:3]
                
                return {
                    'main_recommendations': main_recs,
                    'trending_now': trending_recs,
                    'popular_worldwide': popular_recs,
                    'personalization_level': 'real_data',
                    'recommendation_type': 'database_powered',
                    'data_source': f"database({len(recommendations)})",
                    'total_available': len(recommendations)
                }
            
            # Dacă nu avem date în PlacePopularity, încearcă să vezi dacă avem măcar activități
            activities_count = await self._count_total_activities(db)
            
            if activities_count > 0:
                print(f"📈 Found {activities_count} user activities but no places in PlacePopularity")
                return {
                    'main_recommendations': [],
                    'message': f'Found {activities_count} user interactions but no places to recommend yet.',
                    'suggestion': 'Continue searching for places to build better recommendations.',
                    'recommendation_type': 'building_data',
                    'data_source': f"activities({activities_count})"
                }
            
            print("📭 No data found in database")
            return None
            
        except Exception as e:
            print(f"❌ Error fetching real data: {e}")
            return None
    
    async def _get_session_based_recommendations(
        self, 
        db: AsyncSession, 
        session_id: str, 
        limit: int
    ) -> Dict:
        """Recomandări bazate pe sesiunea curentă"""
        
        print(f"📊 Analyzing session: {session_id[:8]}...")
        
        # Obține activitățile din sesiune
        result = await db.execute(
            select(UserActivity)
            .where(UserActivity.session_id == session_id)
            .where(UserActivity.user_id.is_(None))
            .order_by(desc(UserActivity.created_at))
        )
        
        session_activities = result.scalars().all()
        
        if not session_activities:
            print("📭 No session activities found")
            return await self._get_real_data_recommendations(db, limit)
        
        # Analizează preferințele din sesiune
        session_prefs = await self._analyze_session_preferences(session_activities)
        print(f"🎯 Session preferences: {session_prefs['preferences']}")
        
        # Obține recomandări bazate pe orașele căutate
        recommendations = await self._get_recommendations_for_cities(
            db, session_prefs['cities_of_interest'], limit
        )
        
        if len(recommendations) < 2:
            # Completează cu date generale
            general_recs = await self._get_real_data_recommendations(db, limit - len(recommendations))
            recommendations.extend(general_recs['main_recommendations'])
        
        return {
            'main_recommendations': recommendations[:4],
            'similar_to_your_searches': recommendations[:3],
            'trending_now': await self._get_trending_recommendations(db, 2),
            'personalization_level': 'session',
            'recommendation_type': 'session_based',
            'session_insights': session_prefs
        }
    
    async def _get_personalized_recommendations(
        self, 
        db: AsyncSession, 
        user_id: str, 
        behavior: Dict, 
        limit: int
    ) -> Dict:
        """Recomandări personalizate pentru utilizatori cu istoric"""
        
        await self._update_user_profile(db, user_id, behavior)
        
        # Prioritizează recomandările reale
        city_recs = await self._get_recommendations_for_cities(
            db, behavior['favorite_cities'], 3
        )
        
        category_recs = await self._get_recommendations_by_preferences(
            db, behavior['preferences'], 3
        )
        
        # Combină recomandările reale
        all_recs = city_recs + category_recs
        
        # Elimină duplicatele
        seen = set()
        unique_recs = []
        for rec in all_recs:
            key = rec.get('place_id') or rec.get('name', '')
            if key not in seen:
                seen.add(key)
                unique_recs.append(rec)
        
        # Completează cu trending dacă e nevoie
        if len(unique_recs) < 4:
            trending = await self._get_trending_recommendations(db, 4 - len(unique_recs))
            unique_recs.extend(trending)
        
        return {
            'main_recommendations': unique_recs[:4],
            'in_your_favorite_cities': city_recs[:2],
            'matching_your_interests': category_recs[:2],
            'personalization_level': behavior['engagement_level'],
            'recommendation_type': 'personalized',
            'user_preferences': behavior['preferences'],
            'favorite_cities': list(behavior['favorite_cities'].keys())
        }
    
    async def _get_recommendations_for_cities(
        self, 
        db: AsyncSession, 
        cities: Dict, 
        limit: int
    ) -> List[Dict]:
        """Obține recomandări pentru orașe specifice"""
        
        if not cities:
            return []
        
        city_names = list(cities.keys())[:3]
        print(f"🏙️ Looking for places in: {city_names}")
        
        result = await db.execute(
            select(PlacePopularity)
            .where(PlacePopularity.city.in_(city_names))
            .order_by(desc(PlacePopularity.popularity_score))
            .limit(limit)
        )
        
        places = result.scalars().all()
        print(f"📍 Found {len(places)} places in database")
        
        return self._convert_places_to_recommendations(places, "Popular in your searched cities")
    
    def _convert_places_to_recommendations(
        self, 
        places: List, 
        reason: str = "Popular choice"
    ) -> List[Dict]:
        """Convertește PlacePopularity în format de recomandări cu poze REALE"""
        
        recommendations = []
        
        # Mapping pentru orașe cu poze reale de calitate
        city_images = {
            'paris': [
                "https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=400&h=300&fit=crop&q=80",  # Eiffel Tower
                "https://images.unsplash.com/photo-1524396309943-e03f5249f002?w=400&h=300&fit=crop&q=80",  # Seine
                "https://images.unsplash.com/photo-1571167106548-85ed1e9ba3e5?w=400&h=300&fit=crop&q=80",  # Streets
            ],
            'rome': [
                "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=300&fit=crop&q=80",  # Colosseum
                "https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=400&h=300&fit=crop&q=80",  # Vatican
                "https://images.unsplash.com/photo-1583429602688-42d4f9c2e46b?w=400&h=300&fit=crop&q=80",  # Trevi
            ],
            'barcelona': [
                "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400&h=300&fit=crop&q=80",  # Sagrada
                "https://images.unsplash.com/photo-1511527661048-7fe73d85e9a4?w=400&h=300&fit=crop&q=80",  # Park Guell
                "https://images.unsplash.com/photo-1579282240050-352db0a14c21?w=400&h=300&fit=crop&q=80",  # Gothic
            ],
            'tokyo': [
                "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop&q=80",  # Tokyo city
                "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&q=80",  # Shibuya
                "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=400&h=300&fit=crop&q=80",  # Traditional
            ],
            'london': [
                "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop&q=80",  # London Bridge
                "https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=400&h=300&fit=crop&q=80",  # Big Ben
                "https://images.unsplash.com/photo-1543362906-acfc16c67564?w=400&h=300&fit=crop&q=80",  # Streets
            ],
            'new york': [
                "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=300&fit=crop&q=80",  # NYC skyline
                "https://images.unsplash.com/photo-1524749292158-7540c24946c8?w=400&h=300&fit=crop&q=80",  # Brooklyn Bridge
                "https://images.unsplash.com/photo-1516850228053-90cda1b6f82a?w=400&h=300&fit=crop&q=80",  # Central Park
            ]
        }
        
        # Poze generale fallback de calitate
        general_images = [
            "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop&q=80",  # Travel
            "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop&q=80",  # City
            "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&q=80",  # Mountain
            "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=400&h=300&fit=crop&q=80",  # Architecture
            "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&h=300&fit=crop&q=80",  # Destination
        ]
        
        for place in places:
            city_lower = place.city.lower()
            
            # Selectează poza potrivită pentru oraș
            if city_lower in city_images:
                city_pics = city_images[city_lower]
                main_picture = city_pics[abs(hash(place.place_name)) % len(city_pics)]
            else:
                # Folosește poza generală
                main_picture = general_images[abs(hash(place.place_name)) % len(general_images)]
            
            # Coordonate realiste bazate pe oraș
            city_coords = {
                'paris': (48.8566, 2.3522),
                'rome': (41.9028, 12.4964),
                'barcelona': (41.3851, 2.1734),
                'tokyo': (35.6762, 139.6503),
                'london': (51.5074, -0.1278),
                'new york': (40.7128, -74.0060)
            }
            
            base_lat, base_lon = city_coords.get(city_lower, (48.8566, 2.3522))
            # Adaugă variație mică pentru locuri diferite
            lat_offset = (abs(hash(place.place_name)) % 100 - 50) / 10000  # ±0.005 grade
            lon_offset = (abs(hash(place.place_name + "lon")) % 100 - 50) / 10000
            
            recommendations.append({
                'place_id': place.place_id,
                'name': place.place_name,
                'city': place.city,
                'rating': min(5.0, max(3.0, 3.5 + (place.popularity_score or 0) / 1000)),
                'popularity_score': place.popularity_score or 0,
                'trending_score': place.trending_score or 0,
                'recommendation_reason': reason,
                'pictures': [main_picture],
                'description': f"Discover this amazing place in {place.city}. A must-see destination with great reviews from travelers.",
                'category': 'Experience',
                'minimumDuration': '2-4h',
                'score': max(3.0, 3.5 + (place.popularity_score or 0) / 100),
                'lat': base_lat + lat_offset,
                'lon': base_lon + lon_offset,
                'stats': {
                    'views': place.total_views or 0,
                    'favorites': place.total_favorites or 0,
                    'itinerary_adds': place.total_itinerary_adds or 0
                },
                'data_source': 'database',
                'is_real_place': True
            })
        
        return recommendations
    
    async def _count_total_activities(self, db: AsyncSession) -> int:
        """Contorizează toate activitățile din sistem"""
        try:
            result = await db.execute(select(func.count(UserActivity.id)))
            return result.scalar() or 0
        except Exception:
            return 0
    
    async def _analyze_session_preferences(self, activities: List[UserActivity]) -> Dict:
        """Analizează preferințele din sesiune"""
        
        preferences = {'Cultural': 0, 'Outdoor': 0, 'Relaxation': 0, 'Gastronomy': 0}
        cities = {}
        
        for activity in activities:
            if activity.activity_type == 'search' and activity.search_activities:
                search_activities = activity.search_activities
                if isinstance(search_activities, str):
                    try:
                        search_activities = json.loads(search_activities)
                    except:
                        search_activities = []
                
                for cat in search_activities:
                    if cat in preferences:
                        preferences[cat] += 1
            
            if activity.city:
                cities[activity.city] = cities.get(activity.city, 0) + 1
        
        total_prefs = sum(preferences.values())
        if total_prefs > 0:
            preferences = {k: v/total_prefs for k, v in preferences.items()}
        
        return {
            'preferences': preferences,
            'cities_of_interest': cities,
            'total_activities': len(activities)
        }
    
    async def _analyze_user_behavior(self, db: AsyncSession, user_id: str) -> Dict:
        """Analizează comportamentul utilizatorului"""
        
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            return {'is_new_user': True, 'total_activities': 0}
        
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
        
        preferences = {'Cultural': 0, 'Outdoor': 0, 'Relaxation': 0, 'Gastronomy': 0}
        cities = {}
        
        for activity in activities:
            if activity.activity_type == 'search' and activity.search_activities:
                search_activities = activity.search_activities
                if isinstance(search_activities, str):
                    try:
                        search_activities = json.loads(search_activities)
                    except:
                        continue
                
                for cat in search_activities:
                    if cat in preferences:
                        preferences[cat] += 1
            
            if activity.city:
                cities[activity.city] = cities.get(activity.city, 0) + 1
        
        total_prefs = sum(preferences.values())
        if total_prefs > 0:
            preferences = {k: v/total_prefs for k, v in preferences.items()}
        
        favorite_cities = dict(sorted(cities.items(), key=lambda x: x[1], reverse=True)[:5])
        
        return {
            'is_new_user': False,
            'total_activities': len(activities),
            'preferences': preferences,
            'favorite_cities': favorite_cities,
            'engagement_level': 'high' if len(activities) > 15 else 'medium'
        }
    
    async def _get_new_user_real_recommendations(self, db: AsyncSession, limit: int) -> Dict:
        """Recomandări pentru utilizatori noi - DOAR date reale din DB"""
        
        # Încearcă să obții o combinație de popular + trending
        popular_result = await db.execute(
            select(PlacePopularity)
            .order_by(desc(PlacePopularity.popularity_score))
            .limit(limit // 2)
        )
        
        trending_result = await db.execute(
            select(PlacePopularity)
            .order_by(desc(PlacePopularity.trending_score))
            .limit(limit // 2)
        )
        
        popular_places = popular_result.scalars().all()
        trending_places = trending_result.scalars().all()
        
        # Combină și elimină duplicatele
        all_places = list({place.place_id: place for place in (popular_places + trending_places)}.values())
        
        if len(all_places) > 0:
            recommendations = self._convert_places_to_recommendations(all_places)
            return {
                'main_recommendations': recommendations[:4],
                'trending_for_beginners': recommendations[:3],
                'discover_new_places': recommendations[3:6] if len(recommendations) > 3 else recommendations[:2],
                'personalization_level': 'beginner',
                'recommendation_type': 'new_user_real_data',
                'data_source': f"database({len(recommendations)})"
            }
        else:
            # Dacă nu avem date, returnează mesaj clar
            return {
                'main_recommendations': [],
                'trending_for_beginners': [],
                'discover_new_places': [],
                'personalization_level': 'beginner',
                'recommendation_type': 'new_user_no_data',
                'data_source': 'no_data',
                'message': 'No places found in database for new users.'
            }
    
    async def _get_trending_recommendations(self, db: AsyncSession, limit: int) -> List[Dict]:
        """Obține recomandări trending"""
        result = await db.execute(
            select(PlacePopularity)
            .order_by(desc(PlacePopularity.trending_score))
            .limit(limit)
        )
        places = result.scalars().all()
        return self._convert_places_to_recommendations(places, "Trending now")
    
    async def _get_recommendations_by_preferences(
        self, 
        db: AsyncSession, 
        preferences: Dict, 
        limit: int
    ) -> List[Dict]:
        """Obține recomandări bazate pe preferințe"""
        
        result = await db.execute(
            select(PlacePopularity)
            .order_by(desc(PlacePopularity.popularity_score))
            .limit(limit)
        )
        
        places = result.scalars().all()
        top_category = max(preferences.items(), key=lambda x: x[1])[0] if preferences else 'Cultural'
        
        return self._convert_places_to_recommendations(
            places, 
            f"Matches your {top_category.lower()} interests"
        )
    
    async def _check_user_exists(self, db: AsyncSession, user_id: str) -> bool:
        """Verifică dacă utilizatorul există"""
        try:
            user_uuid = uuid.UUID(user_id)
            result = await db.execute(
                select(User).where(User.id == user_uuid)
            )
            return result.scalar_one_or_none() is not None
        except (ValueError, Exception):
            return False
    
    async def _update_user_profile(self, db: AsyncSession, user_id: str, behavior: Dict):
        """Actualizează profilul utilizatorului"""
        
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            return
        
        if not await self._check_user_exists(db, user_id):
            print(f"Cannot update profile - user {user_id} not found")
            return
        
        result = await db.execute(
            select(UserProfile).where(UserProfile.user_id == user_uuid)
        )
        
        profile = result.scalar_one_or_none()
        
        if not profile:
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
            
            profile.favorite_cities = behavior['favorite_cities']
            profile.total_searches = behavior['total_activities']
            profile.updated_at = datetime.utcnow()
        
        await db.commit()
    
    def _update_preference(self, current: float, new_signal: float, learning_rate: float) -> float:
        """Actualizează preferința cu învățare incrementală"""
        if new_signal > 0:
            return min(1.0, current + (new_signal * learning_rate))
        return current
    
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
        """Tracking pentru căutări"""
        
        user_uuid = None
        if user_id:
            try:
                user_uuid = uuid.UUID(user_id)
                if not await self._check_user_exists(db, user_id):
                    print(f"User {user_id} not found, tracking as anonymous")
                    user_uuid = None
            except ValueError:
                print(f"Invalid user_id format: {user_id}, tracking as anonymous")
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
        interaction_type: str,
        place_name: str,
        place_id: str = None,
        city: str = None
    ):
        """Tracking pentru interacțiuni"""
        
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
        
        # Actualizează popularitatea
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
            popularity.total_views = (popularity.total_views or 0) + 1
        elif interaction_type == 'favorite':
            popularity.total_favorites = (popularity.total_favorites or 0) + 1
        elif interaction_type == 'add_to_itinerary':
            popularity.total_itinerary_adds = (popularity.total_itinerary_adds or 0) + 1
        elif interaction_type == 'share':
            popularity.total_shares = (popularity.total_shares or 0) + 1
        
        # Recalculează scorurile
        popularity.popularity_score = (
            (popularity.total_views or 0) * 1.0 +
            (popularity.total_favorites or 0) * 3.0 +
            (popularity.total_itinerary_adds or 0) * 5.0 +
            (popularity.total_shares or 0) * 2.0
        )
        
        # Trending score
        week_ago = datetime.utcnow() - timedelta(days=7)
        result = await db.execute(
            select(func.count(UserActivity.id))
            .where(UserActivity.place_id == place_id)
            .where(UserActivity.created_at >= week_ago)
        )
        
        recent_activity = result.scalar() or 0
        popularity.trending_score = recent_activity * 10.0
        
        popularity.updated_at = datetime.utcnow()