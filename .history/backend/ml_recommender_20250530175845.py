# ml_recommender.py - Sistem ML cu activități random pentru utilizatori noi

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
    """Sistem ML cu activități random pentru utilizatori fără istoric"""
    
    def __init__(self):
        # Date pentru activități random
        self.random_activities_data = {
            "paris": {
                "activities": [
                    {
                        "name": "Eiffel Tower Visit",
                        "category": "Cultural",
                        "time": "2-4h",
                        "description": "Iconic iron tower with breathtaking city views",
                        "rating": 4.8,
                        "price_level": "€€",
                        "image": "https://source.unsplash.com/600x400/?eiffel-tower,paris"
                    },
                    {
                        "name": "Seine River Cruise",
                        "category": "Relaxation",
                        "time": "<2h",
                        "description": "Peaceful boat ride through the heart of Paris",
                        "rating": 4.6,
                        "price_level": "€€€",
                        "image": "https://source.unsplash.com/600x400/?seine-river,cruise"
                    },
                    {
                        "name": "Louvre Museum",
                        "category": "Cultural",
                        "time": ">4h",
                        "description": "World's largest art museum with famous masterpieces",
                        "rating": 4.7,
                        "price_level": "€€",
                        "image": "https://source.unsplash.com/600x400/?louvre,museum"
                    },
                    {
                        "name": "Latin Quarter Food Tour",
                        "category": "Gastronomy",
                        "time": "2-4h",
                        "description": "Discover authentic French cuisine in historic streets",
                        "rating": 4.9,
                        "price_level": "€€€",
                        "image": "https://source.unsplash.com/600x400/?french-food,paris"
                    }
                ]
            },
            "rome": {
                "activities": [
                    {
                        "name": "Colosseum Tour",
                        "category": "Cultural",
                        "time": "2-4h",
                        "description": "Ancient amphitheater and symbol of Imperial Rome",
                        "rating": 4.8,
                        "price_level": "€€",
                        "image": "https://source.unsplash.com/600x400/?colosseum,rome"
                    },
                    {
                        "name": "Vatican Gardens Walk",
                        "category": "Outdoor",
                        "time": "2-4h",
                        "description": "Peaceful gardens in the heart of Vatican City",
                        "rating": 4.5,
                        "price_level": "€€€",
                        "image": "https://source.unsplash.com/600x400/?vatican-gardens"
                    },
                    {
                        "name": "Trastevere Dining",
                        "category": "Gastronomy",
                        "time": ">4h",
                        "description": "Authentic Roman cuisine in charming neighborhood",
                        "rating": 4.7,
                        "price_level": "€€",
                        "image": "https://source.unsplash.com/600x400/?trastevere,rome-food"
                    },
                    {
                        "name": "Villa Borghese Park",
                        "category": "Relaxation",
                        "time": "2-4h",
                        "description": "Beautiful park perfect for leisurely strolls",
                        "rating": 4.4,
                        "price_level": "€",
                        "image": "https://source.unsplash.com/600x400/?villa-borghese,park"
                    }
                ]
            },
            "tokyo": {
                "activities": [
                    {
                        "name": "Senso-ji Temple",
                        "category": "Cultural",
                        "time": "2-4h",
                        "description": "Tokyo's oldest temple in traditional Asakusa",
                        "rating": 4.6,
                        "price_level": "€",
                        "image": "https://source.unsplash.com/600x400/?sensoji-temple,tokyo"
                    },
                    {
                        "name": "Shibuya Food Experience",
                        "category": "Gastronomy",
                        "time": "2-4h",
                        "description": "Discover Japanese street food and local delicacies",
                        "rating": 4.8,
                        "price_level": "€€",
                        "image": "https://source.unsplash.com/600x400/?shibuya,japanese-food"
                    },
                    {
                        "name": "Ueno Park Cherry Blossoms",
                        "category": "Outdoor",
                        "time": "2-4h",
                        "description": "Beautiful park famous for cherry blossom viewing",
                        "rating": 4.7,
                        "price_level": "€",
                        "image": "https://source.unsplash.com/600x400/?ueno-park,cherry-blossoms"
                    },
                    {
                        "name": "Traditional Onsen Experience",
                        "category": "Relaxation",
                        "time": "2-4h",
                        "description": "Relaxing hot spring bath in traditional setting",
                        "rating": 4.9,
                        "price_level": "€€€",
                        "image": "https://source.unsplash.com/600x400/?onsen,japanese-spa"
                    }
                ]
            },
            "barcelona": {
                "activities": [
                    {
                        "name": "Sagrada Familia",
                        "category": "Cultural",
                        "time": "2-4h",
                        "description": "Gaudí's unfinished masterpiece basilica",
                        "rating": 4.8,
                        "price_level": "€€",
                        "image": "https://source.unsplash.com/600x400/?sagrada-familia,barcelona"
                    },
                    {
                        "name": "Park Güell Adventure",
                        "category": "Outdoor",
                        "time": "2-4h",
                        "description": "Colorful park with unique Gaudí architecture",
                        "rating": 4.6,
                        "price_level": "€€",
                        "image": "https://source.unsplash.com/600x400/?park-guell,gaudi"
                    },
                    {
                        "name": "Tapas Tour in Gothic Quarter",
                        "category": "Gastronomy",
                        "time": ">4h",
                        "description": "Authentic Spanish tapas in medieval streets",
                        "rating": 4.9,
                        "price_level": "€€€",
                        "image": "https://source.unsplash.com/600x400/?tapas,barcelona"
                    },
                    {
                        "name": "Barceloneta Beach",
                        "category": "Relaxation",
                        "time": ">4h",
                        "description": "Golden sand beach in the heart of the city",
                        "rating": 4.3,
                        "price_level": "€",
                        "image": "https://source.unsplash.com/600x400/?barceloneta-beach"
                    }
                ]
            },
            "london": {
                "activities": [
                    {
                        "name": "British Museum",
                        "category": "Cultural",
                        "time": ">4h",
                        "description": "World-famous museum with incredible collections",
                        "rating": 4.7,
                        "price_level": "€",
                        "image": "https://source.unsplash.com/600x400/?british-museum,london"
                    },
                    {
                        "name": "Hyde Park Stroll",
                        "category": "Outdoor",
                        "time": "2-4h",
                        "description": "Beautiful royal park in central London",
                        "rating": 4.5,
                        "price_level": "€",
                        "image": "https://source.unsplash.com/600x400/?hyde-park,london"
                    },
                    {
                        "name": "Borough Market Food Tour",
                        "category": "Gastronomy",
                        "time": "2-4h",
                        "description": "Historic food market with global cuisine",
                        "rating": 4.6,
                        "price_level": "€€",
                        "image": "https://source.unsplash.com/600x400/?borough-market,london"
                    },
                    {
                        "name": "Thames River Walk",
                        "category": "Relaxation",
                        "time": "2-4h",
                        "description": "Scenic walk along London's famous river",
                        "rating": 4.4,
                        "price_level": "€",
                        "image": "https://source.unsplash.com/600x400/?thames-river,london"
                    }
                ]
            }
        }
    
    async def get_home_recommendations(
        self, 
        db: AsyncSession, 
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        limit: int = 8
    ) -> Dict:
        """Funcția principală - obține recomandări pentru homepage cu activități random"""
        
        print(f"🤖 Generez recomandări ML pentru user: {user_id or 'anonymous'}")
        
        if not user_id:
            # Utilizator anonim - încearcă recomandări pe sesiune sau random
            if session_id:
                session_recs = await self._get_session_based_recommendations(db, session_id, limit)
                if session_recs['main_recommendations']:
                    return session_recs
            
            # Fallback - activități random + generale
            return await self._get_random_activities_recommendations(db, limit)
        
        # Verifică dacă utilizatorul există în auth.users
        user_exists = await self._check_user_exists(db, user_id)
        if not user_exists:
            print("⚠️  User not found in auth.users, generating random activities")
            return await self._get_random_activities_recommendations(db, limit)
        
        # Utilizator autentificat - analizează comportamentul
        user_behavior = await self._analyze_user_behavior(db, user_id)
        
        if user_behavior['is_new_user']:
            # Utilizator nou - activități random + trending
            print("👤 Utilizator nou - activități random + trending")
            return await self._get_new_user_with_random_recommendations(db, user_behavior, limit)
        else:
            # Utilizator cu istoric - recomandări personalizate + surprize
            print("🎯 Utilizator cu istoric - recomandări personalizate + surprize")
            return await self._get_personalized_with_surprises_recommendations(db, user_id, user_behavior, limit)
    
    async def _get_random_activities_recommendations(self, db: AsyncSession, limit: int) -> Dict:
        """Generează recomandări cu activități random pentru utilizatori noi"""
        
        print("🎲 Generating random activities for new user")
        
        # Selectează orașe random
        cities = list(self.random_activities_data.keys())
        selected_cities = random.sample(cities, min(3, len(cities)))
        
        # Generează activități random
        random_activities = []
        for city in selected_cities:
            city_activities = self.random_activities_data[city]["activities"]
            # Selectează 2-3 activități random din fiecare oraș
            selected = random.sample(city_activities, min(2, len(city_activities)))
            for activity in selected:
                random_activities.append({
                    **activity,
                    "city": city.title(),
                    "place_id": f"{activity['name'].lower().replace(' ', '_')}_{city}",
                    "recommendation_reason": f"Perfect for {activity['category'].lower()} lovers",
                    "is_random": True
                })
        
        # Amestecă activitățile
        random.shuffle(random_activities)
        
        # Obține și recomandări din baza de date
        db_recommendations = await self._get_general_recommendations(db, limit//2)
        
        # Combină activitățile random cu cele din DB
        main_recommendations = random_activities[:4]
        discover_activities = random_activities[4:6] if len(random_activities) > 4 else []
        
        return {
            'main_recommendations': main_recommendations,
            'discover_new_activities': discover_activities,
            'trending_worldwide': db_recommendations.get('trending_worldwide', []),
            'most_popular': db_recommendations.get('most_popular', []),
            'personalization_level': 'random_discovery',
            'recommendation_type': 'random_activities',
            'inspiration_message': "✨ Discover amazing activities worldwide!"
        }
    
    async def _get_new_user_with_random_recommendations(self, db: AsyncSession, user_behavior: Dict, limit: int) -> Dict:
        """Recomandări pentru utilizatori noi cu activități random"""
        
        # Generează activități random
        random_recs = await self._get_random_activities_recommendations(db, limit//2)
        
        # Obține trending din DB
        trending_recs = await self._get_new_user_recommendations(db, limit//2)
        
        return {
            'main_recommendations': random_recs['main_recommendations'][:2] + trending_recs['main_recommendations'][:2],
            'discover_new_activities': random_recs['discover_new_activities'],
            'trending_for_beginners': trending_recs.get('trending_for_beginners', []),
            'most_loved': trending_recs.get('most_loved', []),
            'personalization_level': 'beginner_with_discovery',
            'recommendation_type': 'new_user_mixed',
            'inspiration_message': "🌟 Welcome! Here are some amazing activities to get you started"
        }
    
    async def _get_personalized_with_surprises_recommendations(
        self, 
        db: AsyncSession, 
        user_id: str, 
        behavior: Dict, 
        limit: int
    ) -> Dict:
        """Recomandări personalizate cu surprize pentru utilizatori cu istoric"""
        
        # Obține recomandări personalizate normale
        personalized = await self._get_personalized_recommendations(db, user_id, behavior, limit//2)
        
        # Adaugă activități surpriză bazate pe preferințe
        surprise_activities = await self._get_surprise_activities_for_preferences(behavior['preferences'], limit//4)
        
        return {
            'main_recommendations': personalized['main_recommendations'],
            'in_your_favorite_cities': personalized.get('in_your_favorite_cities', []),
            'matching_your_interests': personalized.get('matching_your_interests', []),
            'surprise_discoveries': surprise_activities,
            'personalization_level': behavior['engagement_level'],
            'recommendation_type': 'personalized_with_surprises',
            'user_preferences': behavior['preferences'],
            'favorite_cities': list(behavior['favorite_cities'].keys()),
            'inspiration_message': f"🎯 Personalized for you + some exciting surprises!"
        }
    
    async def _get_surprise_activities_for_preferences(self, preferences: Dict, limit: int) -> List[Dict]:
        """Generează activități surpriză bazate pe preferințele utilizatorului"""
        
        if not preferences:
            return []
        
        # Găsește categoria preferată
        top_category = max(preferences.items(), key=lambda x: x[1])[0] if preferences else 'Cultural'
        
        surprise_activities = []
        
        # Caută activități din categoria preferată în toate orașele
        for city, data in self.random_activities_data.items():
            matching_activities = [
                activity for activity in data["activities"] 
                if activity["category"] == top_category
            ]
            
            if matching_activities:
                selected = random.choice(matching_activities)
                surprise_activities.append({
                    **selected,
                    "city": city.title(),
                    "place_id": f"{selected['name'].lower().replace(' ', '_')}_{city}",
                    "recommendation_reason": f"Perfect match for your {top_category.lower()} interests",
                    "is_surprise": True
                })
        
        return random.sample(surprise_activities, min(limit, len(surprise_activities)))
    
    # [Restul metodelor rămân la fel - _check_user_exists, _analyze_user_behavior, etc.]
    # Copiez doar metodele care se schimbă pentru brevitate
    
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
        """Recomandări bazate pe activitatea din sesiunea curentă"""
        
        print(f"👤 Analizez sesiunea anonimă: {session_id}")
        
        # Obține activitățile din această sesiune
        result = await db.execute(
            select(UserActivity)
            .where(UserActivity.session_id == session_id)
            .where(UserActivity.user_id.is_(None))
            .order_by(desc(UserActivity.created_at))
        )
        
        session_activities = result.scalars().all()
        
        if not session_activities:
            return {'main_recommendations': []}
        
        # Analizează preferințele din sesiune
        session_preferences = await self._analyze_session_preferences(session_activities)
        
        # Generează activități random bazate pe preferințe
        preference_activities = await self._get_surprise_activities_for_preferences(
            session_preferences['preferences'], limit//2
        )
        
        # Obține și recomandări din DB pentru orașele de interes
        db_recommendations = await self._get_recommendations_for_session(
            db, session_preferences, limit//2
        )
        
        return {
            'main_recommendations': preference_activities + db_recommendations,
            'similar_to_your_searches': preference_activities,
            'trending_now': await self._get_trending_recommendations(db, 2),
            'personalization_level': 'session',
            'recommendation_type': 'anonymous_session',
            'session_insights': session_preferences,
            'inspiration_message': "🔍 Based on your recent searches"
        }
    
    async def _analyze_session_preferences(self, activities: List[UserActivity]) -> Dict:
        """Analizează preferințele din activitățile unei sesiuni"""
        
        preferences = {'Cultural': 0, 'Outdoor': 0, 'Relaxation': 0, 'Gastronomy': 0}
        cities = {}
        time_preferences = {'<2h': 0, '2-4h': 0, '>4h': 0}
        
        for activity in activities:
            if activity.activity_type == 'search' and activity.search_activities:
                search_activities = activity.search_activities
                if isinstance(search_activities, str):
                    search_activities = json.loads(search_activities)
                
                for cat in search_activities:
                    if cat in preferences:
                        preferences[cat] += 1
                
                if activity.search_time and activity.search_time in time_preferences:
                    time_preferences[activity.search_time] += 1
            
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
    
    # [Continuă cu restul metodelor din versiunea anterioară...]
    # Pentru brevitate, nu le copiez pe toate, dar toate metodele de tracking, 
    # _analyze_user_behavior, _get_general_recommendations, etc. rămân la fel
    
    async def _analyze_user_behavior(self, db: AsyncSession, user_id: str) -> Dict:
        """Analizează comportamentul utilizatorului autentificat"""
        
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
        time_preferences = {'<2h': 0, '2-4h': 0, '>4h': 0}
        
        for activity in activities:
            if activity.activity_type == 'search' and activity.search_activities:
                search_activities = activity.search_activities
                if isinstance(search_activities, str):
                    search_activities = json.loads(search_activities)
                
                for cat in search_activities:
                    if cat in preferences:
                        preferences[cat] += 1
                
                if activity.search_time and activity.search_time in time_preferences:
                    time_preferences[activity.search_time] += 1
            
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
            'time_preferences': time_preferences,
            'engagement_level': 'high' if len(activities) > 15 else 'medium'
        }
    
    # Placeholder pentru restul metodelor - în implementarea reală trebuie să copiezi toate
    async def _get_general_recommendations(self, db: AsyncSession, limit: int) -> Dict:
        """Recomandări generale"""
        return {'trending_worldwide': [], 'most_popular': []}
    
    async def _get_new_user_recommendations(self, db: AsyncSession, limit: int) -> Dict:
        """Recomandări pentru utilizatori noi"""
        return {'main_recommendations': [], 'trending_for_beginners': [], 'most_loved': []}
    
    async def _get_personalized_recommendations(self, db: AsyncSession, user_id: str, behavior: Dict, limit: int) -> Dict:
        """Recomandări personalizate"""
        return {'main_recommendations': [], 'in_your_favorite_cities': [], 'matching_your_interests': []}
    
    async def _get_recommendations_for_session(self, db: AsyncSession, session_prefs: Dict, limit: int) -> List[Dict]:
        """Recomandări pentru sesiune"""
        return []
    
    async def _get_trending_recommendations(self, db: AsyncSession, limit: int) -> List[Dict]:
        """Recomandări trending"""
        return []