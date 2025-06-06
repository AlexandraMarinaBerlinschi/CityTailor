# ml_recommender.py - Sistem ML pentru recomandări (Supabase) cu activități random

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
    """Sistem ML simplu și eficient pentru recomandări personalizate + activități random"""
    
    def __init__(self):
        # Date pentru activități random frumoase
        self.random_activities_data = {
            "paris": [
                {
                    "name": "Eiffel Tower Sunset Experience",
                    "category": "Cultural",
                    "minimumDuration": "2-4h",
                    "description": "Watch the sunset from the iconic iron tower with breathtaking city views. The golden hour creates magical lighting perfect for photos.",
                    "pictures": ["https://source.unsplash.com/600x400/?eiffel-tower,sunset,paris"]
                },
                {
                    "name": "Seine River Evening Cruise",
                    "category": "Relaxation", 
                    "minimumDuration": "<2h",
                    "description": "Peaceful boat ride through the heart of Paris as the city lights up. See Notre-Dame, Louvre, and other landmarks from the water.",
                    "pictures": ["https://source.unsplash.com/600x400/?seine-river,cruise,evening"]
                },
                {
                    "name": "Montmartre Artist Quarter Walk",
                    "category": "Cultural",
                    "minimumDuration": "2-4h", 
                    "description": "Explore the bohemian streets where Picasso and Renoir lived. Visit Sacré-Cœur and watch street artists create masterpieces.",
                    "pictures": ["https://source.unsplash.com/600x400/?montmartre,paris,artists"]
                },
                {
                    "name": "Latin Quarter Food Adventure",
                    "category": "Gastronomy",
                    "minimumDuration": "2-4h",
                    "description": "Discover authentic French cuisine in historic cobblestone streets. Visit local markets, bistros, and hidden culinary gems.",
                    "pictures": ["https://source.unsplash.com/600x400/?latin-quarter,french-food,paris"]
                }
            ],
            "rome": [
                {
                    "name": "Colosseum Gladiator Experience",
                    "category": "Cultural",
                    "minimumDuration": "2-4h",
                    "description": "Step into ancient Rome's most famous amphitheater. Learn about gladiators and imperial history with expert guides.",
                    "pictures": ["https://source.unsplash.com/600x400/?colosseum,rome,gladiator"]
                },
                {
                    "name": "Trastevere Evening Stroll",
                    "category": "Gastronomy",
                    "minimumDuration": ">4h",
                    "description": "Wander through Rome's most charming neighborhood. Enjoy authentic Roman cuisine in trattorias loved by locals.",
                    "pictures": ["https://source.unsplash.com/600x400/?trastevere,rome,evening"]
                },
                {
                    "name": "Vatican Gardens Secret Tour",
                    "category": "Outdoor",
                    "minimumDuration": "2-4h",
                    "description": "Explore the Pope's private gardens with rare plants and Renaissance fountains. A peaceful escape in Vatican City.",
                    "pictures": ["https://source.unsplash.com/600x400/?vatican-gardens,rome"]
                },
                {
                    "name": "Villa Borghese Picnic & Art",
                    "category": "Relaxation",
                    "minimumDuration": "2-4h",
                    "description": "Beautiful park perfect for leisurely walks and picnics. Visit the stunning Borghese Gallery with Bernini sculptures.",
                    "pictures": ["https://source.unsplash.com/600x400/?villa-borghese,rome,park"]
                }
            ],
            "tokyo": [
                {
                    "name": "Shibuya Dawn Photography",
                    "category": "Cultural",
                    "minimumDuration": "<2h", 
                    "description": "Capture the famous crossing at sunrise when it's peaceful. Then explore traditional temples in modern Shibuya.",
                    "pictures": ["https://source.unsplash.com/600x400/?shibuya-crossing,tokyo,dawn"]
                },
                {
                    "name": "Tsukiji Market Food Journey",
                    "category": "Gastronomy",
                    "minimumDuration": "2-4h",
                    "description": "Start with fresh sushi breakfast, then explore the outer market for street food and traditional Japanese treats.",
                    "pictures": ["https://source.unsplash.com/600x400/?tsukiji-market,sushi,tokyo"]
                },
                {
                    "name": "Ueno Cherry Blossom Meditation",
                    "category": "Outdoor",
                    "minimumDuration": "2-4h",
                    "description": "Peaceful hanami experience in Tokyo's most beautiful park. Perfect for spring meditation under sakura trees.",
                    "pictures": ["https://source.unsplash.com/600x400/?ueno-park,cherry-blossoms,tokyo"]
                },
                {
                    "name": "Traditional Onsen Zen Experience",
                    "category": "Relaxation",
                    "minimumDuration": ">4h",
                    "description": "Relax in natural hot springs within Tokyo. Experience traditional Japanese bathing culture and meditation.",
                    "pictures": ["https://source.unsplash.com/600x400/?onsen,japanese-spa,zen"]
                }
            ],
            "barcelona": [
                {
                    "name": "Sagrada Familia Sunrise Tour",
                    "category": "Cultural",
                    "minimumDuration": "2-4h",
                    "description": "See Gaudí's masterpiece in the golden morning light. Climb the towers for spectacular city views.",
                    "pictures": ["https://source.unsplash.com/600x400/?sagrada-familia,sunrise,barcelona"]
                },
                {
                    "name": "Park Güell Magic Sunset",
                    "category": "Outdoor", 
                    "minimumDuration": "2-4h",
                    "description": "Wander through Gaudí's colorful mosaic wonderland. Watch the sunset over Barcelona from the terrace.",
                    "pictures": ["https://source.unsplash.com/600x400/?park-guell,sunset,gaudi"]
                },
                {
                    "name": "Gothic Quarter Tapas Crawl",
                    "category": "Gastronomy",
                    "minimumDuration": ">4h",
                    "description": "Discover hidden tapas bars in medieval alleys. Try authentic Catalan dishes and local wines.",
                    "pictures": ["https://source.unsplash.com/600x400/?gothic-quarter,tapas,barcelona"]
                },
                {
                    "name": "Barceloneta Beach Yoga",
                    "category": "Relaxation",
                    "minimumDuration": "2-4h",
                    "description": "Start with sunrise yoga on golden sand, then enjoy beach bars and Mediterranean views all day.",
                    "pictures": ["https://source.unsplash.com/600x400/?barceloneta-beach,yoga,sunrise"]
                }
            ],
            "london": [
                {
                    "name": "Thames River Literary Walk",
                    "category": "Cultural",
                    "minimumDuration": "2-4h",
                    "description": "Follow in the footsteps of Shakespeare and Dickens along the Thames. Visit historic pubs and literary landmarks.",
                    "pictures": ["https://source.unsplash.com/600x400/?thames-river,london,literary"]
                },
                {
                    "name": "Covent Garden Street Performance",
                    "category": "Cultural",
                    "minimumDuration": "<2h",
                    "description": "Enjoy world-class street performers in this historic market. Shop for unique crafts and vintage finds.",
                    "pictures": ["https://source.unsplash.com/600x400/?covent-garden,street-performance,london"]
                },
                {
                    "name": "Borough Market Foodie Tour",
                    "category": "Gastronomy", 
                    "minimumDuration": "2-4h",
                    "description": "London's oldest food market with global cuisine. Taste artisanal cheeses, fresh bread, and international delicacies.",
                    "pictures": ["https://source.unsplash.com/600x400/?borough-market,london,food"]
                },
                {
                    "name": "Hyde Park Royal Picnic",
                    "category": "Relaxation",
                    "minimumDuration": "2-4h", 
                    "description": "Picnic like royalty in London's most famous park. Visit Kensington Palace gardens and Speaker's Corner.",
                    "pictures": ["https://source.unsplash.com/600x400/?hyde-park,picnic,london"]
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
        """Funcția principală - obține recomandări pentru homepage"""
        
        print(f"Generating ML recommendations for user: {user_id or 'anonymous'}")
        
        if not user_id:
            # Utilizator anonim - încearcă recomandări pe sesiune
            if session_id:
                return await self._get_session_based_recommendations(db, session_id, limit)
            else:
                return await self._get_general_recommendations(db, limit)
        
        # Verifică dacă utilizatorul există în auth.users
        user_exists = await self._check_user_exists(db, user_id)
        if not user_exists:
            print("User not found in auth.users, treating as anonymous")
            if session_id:
                return await self._get_session_based_recommendations(db, session_id, limit)
            else:
                return await self._get_general_recommendations(db, limit)
        
        # Utilizator autentificat - analizează comportamentul
        user_behavior = await self._analyze_user_behavior(db, user_id)
        
        if user_behavior['is_new_user']:
            # Utilizator nou - recomandări generale + trending
            print("New user - recommendations with random activities")
            return await self._get_new_user_recommendations(db, limit)
        else:
            # Utilizator cu istoric - recomandări personalizate
            print("User with history - personalized recommendations")
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
        
        print(f"Analyzing anonymous session: {session_id}")
        
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
        
        # Generează recomandări bazate pe sesiune + activități random
        db_recommendations = await self._get_recommendations_for_session(
            db, session_preferences, limit//2
        )
        
        # Adaugă activități random bazate pe preferințe
        random_activities = self._generate_targeted_random_activities(
            session_preferences['preferences'], limit//2
        )
        
        all_recommendations = db_recommendations + random_activities
        
        return {
            'main_recommendations': all_recommendations[:4],
            'similar_to_your_searches': db_recommendations[:3],
            'discover_new_places': random_activities[:3],
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
        """Recomandări generale pentru utilizatori anonimi fără activitate - cu activități random"""
        
        # Obține locurile cele mai populare din DB
        result = await db.execute(
            select(PlacePopularity)
            .order_by(desc(PlacePopularity.popularity_score))
            .limit(limit//2)
        )
        
        popular_places = result.scalars().all()
        db_recommendations = self._convert_places_to_recommendations(popular_places)
        
        # Adaugă activități random dacă nu sunt suficiente recomandări din DB
        random_activities = []
        if len(db_recommendations) < limit:
            random_activities = self._generate_random_activities(limit - len(db_recommendations))
        
        # Combină recomandările
        all_recommendations = db_recommendations + random_activities
        
        return {
            'main_recommendations': all_recommendations[:4],
            'discover_new_places': random_activities[:3] if random_activities else [],
            'trending_worldwide': db_recommendations[4:6] if len(db_recommendations) > 4 else [],
            'personalization_level': 'discovery' if random_activities else 'none',
            'recommendation_type': 'general_with_discovery'
        }
    
    async def _get_new_user_recommendations(self, db: AsyncSession, limit: int) -> Dict:
        """Recomandări pentru utilizatori noi cu activități random"""
        
        # Obține trending din DB
        result = await db.execute(
            select(PlacePopularity)
            .order_by(desc(PlacePopularity.popularity_score + PlacePopularity.trending_score))
            .limit(limit//2)
        )
        
        mixed_places = result.scalars().all()
        db_recommendations = self._convert_places_to_recommendations(mixed_places)
        
        # Generează activități random pentru utilizatori noi
        random_activities = self._generate_random_activities(limit//2)
        
        # Combină și amestecă
        all_recommendations = db_recommendations + random_activities
        random.shuffle(all_recommendations)
        
        return {
            'main_recommendations': all_recommendations[:4],
            'discover_new_places': random_activities[:3],
            'trending_for_beginners': db_recommendations[:3],
            'personalization_level': 'discovery',
            'recommendation_type': 'new_user_with_discovery'
        }
    
    def _generate_random_activities(self, limit: int) -> List[Dict]:
        """Generează activități random frumoase"""
        
        activities = []
        cities = list(self.random_activities_data.keys())
        
        # Selectează orașe random
        selected_cities = random.sample(cities, min(3, len(cities)))
        
        for city in selected_cities:
            city_activities = self.random_activities_data[city]
            # Selectează 1-2 activități din fiecare oraș
            selected = random.sample(city_activities, min(2, len(city_activities)))
            
            for activity in selected:
                # Calculează un scor random realist (pentru compatibilitate cu Home.js)
                score = random.randint(6, 9) + random.random()
                
                activities.append({
                    **activity,
                    'city': city.title(),
                    'score': score,
                    'is_random_discovery': True,
                    'recommendation_reason': f"Perfect for {activity['category'].lower()} enthusiasts"
                })
        
        # Amestecă și limitează
        random.shuffle(activities)
        return activities[:limit]
    
    def _generate_targeted_random_activities(self, preferences: Dict, limit: int) -> List[Dict]:
        """Generează activități random bazate pe preferințele utilizatorului"""
        
        if not preferences:
            return self._generate_random_activities(limit)
        
        # Găsește categoria preferată
        top_category = max(preferences.items(), key=lambda x: x[1])[0] if preferences else 'Cultural'
        
        activities = []
        cities = list(self.random_activities_data.keys())
        
        # Caută activități din categoria preferată în toate orașele
        for city in cities:
            city_activities = self.random_activities_data[city]
            matching_activities = [
                activity for activity in city_activities 
                if activity["category"] == top_category
            ]
            
            if matching_activities:
                selected = random.choice(matching_activities)
                score = random.randint(7, 9) + random.random()  # Scor mai mare pentru preferințe
                
                activities.append({
                    **selected,
                    'city': city.title(),
                    'score': score,
                    'is_targeted_discovery': True,
                    'recommendation_reason': f"Matches your {top_category.lower()} interests"
                })
        
        # Completează cu activități random dacă e nevoie
        if len(activities) < limit:
            additional = self._generate_random_activities(limit - len(activities))
            activities.extend(additional)
        
        return activities[:limit]
    
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
        
        # Adaugă și niște surprize random
        surprise_activities = self._generate_targeted_random_activities(
            behavior['preferences'], 2
        )
        
        # Combină rezultatele
        all_recommendations = city_recommendations + category_recommendations + surprise_activities
        
        # Elimină duplicatele
        seen = set()
        unique_recommendations = []
        for rec in all_recommendations:
            rec_id = rec.get('place_id') or rec.get('name', '')
            if rec_id not in seen:
                seen.add(rec_id)
                unique_recommendations.append(rec)
        
        return {
            'main_recommendations': unique_recommendations[:4],
            'in_your_favorite_cities': city_recommendations[:4],
            'matching_your_interests': category_recommendations[:4],
            'surprise_discoveries': surprise_activities,
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
            print(f"Cannot update profile - user {user_id} not found in auth.users")
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
                'description': f"Discover this amazing place in {place.city}. A must-see destination with great reviews.",
                'category': 'Experience',  # Default category
                'minimumDuration': '2-4h',  # Default duration
                'score': 3.5 + (place.popularity_score / 100),  # Compatibility score pentru Home.js
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
        print(f"Tracked search ({user_type}): {city} - {activities}")
    
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
                    print(f"User {user_id} not found, tracking as anonymous")
                    user_uuid = None
            except ValueError:
                print(f"Invalid user_id format: {user_id}, tracking as anonymous")
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
        print(f"Tracked {interaction_type} ({user_type}): {place_name}")
    
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
        
        # Actualizează contoarele cu protecție pentru None
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