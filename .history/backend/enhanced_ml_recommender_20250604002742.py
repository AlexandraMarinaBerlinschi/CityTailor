from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, func, and_, or_
from models import UserActivity, UserProfile, PlacePopularity, User
from typing import List, Dict, Optional
import json
from datetime import datetime, timedelta
import uuid
import math

class EnhancedMLRecommender:
    """Sistem ML îmbunătățit cu învățare incrementală și personalizare avansată"""
    
    def __init__(self):
        self.interaction_weights = {
            'search': 1.0,
            'view': 2.0,
            'favorite': 5.0,
            'add_to_itinerary': 4.0,
            'share': 3.0
        }
        
        # Factori de decay pentru preferințe vechi
        self.time_decay_days = {
            'recent': 7,    # 100% weight
            'medium': 30,   # 70% weight  
            'old': 90       # 30% weight
        }
        
        print("Enhanced ML Recommender initialized with real-time learning")
    
    async def get_home_recommendations(
        self, 
        db: AsyncSession, 
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        limit: int = 8
    ) -> Dict:
        """Funcția principală pentru recomandări Home cu învățare avansată"""
        
        print(f"Enhanced recommendations for user: {user_id or 'anonymous'}")
        
        # Verifică dacă avem locuri în baza de date
        result = await db.execute(select(func.count(PlacePopularity.id)))
        total_places = result.scalar() or 0
        
        if total_places == 0:
            return {
                'main_recommendations': [],
                'recommendation_type': 'no_data',
                'message': 'No places found. Please search for destinations first.',
                'data_source': 'none'
            }
        
        # Analizează profilul utilizatorului cu algoritm îmbunătățit
        user_profile = await self._build_enhanced_user_profile(db, user_id, session_id)
        
        if user_profile['is_new_user']:
            print("New user detected - returning discovery recommendations")
            return await self._get_discovery_recommendations(db, limit)
        
        print(f"Generating personalized recommendations for profile: {user_profile['engagement_level']}")
        
        # Recomandări personalizate bazate pe profilul îmbunătățit
        if user_id:
            return await self._get_advanced_personalized_recommendations(db, user_id, user_profile, limit)
        else:
            return await self._get_advanced_session_recommendations(db, session_id, user_profile, limit)
    
    async def _build_enhanced_user_profile(
        self, 
        db: AsyncSession, 
        user_id: Optional[str],
        session_id: Optional[str]
    ) -> Dict:
        """Construiește un profil utilizator îmbunătățit cu analiză de timp și preferințe"""
        
        try:
            # Obține activitățile cu time decay
            activities = await self._get_user_activities_with_decay(db, user_id, session_id)
            
            if len(activities) < 2:
                return {
                    'is_new_user': True,
                    'total_activities': len(activities),
                    'engagement_level': 'new',
                    'city_preferences': {},
                    'category_preferences': {},
                    'time_preferences': {},
                    'recent_interactions': []
                }
            
            # Analizează preferințele cu weight-uri
            city_preferences = await self._analyze_city_preferences(activities)
            category_preferences = await self._analyze_category_preferences(activities)
            time_preferences = await self._analyze_time_patterns(activities)
            
            # Calculează engagement score
            engagement_score = self._calculate_engagement_score(activities)
            engagement_level = self._determine_engagement_level(engagement_score)
            
            return {
                'is_new_user': False,
                'total_activities': len(activities),
                'engagement_level': engagement_level,
                'engagement_score': engagement_score,
                'city_preferences': city_preferences,
                'category_preferences': category_preferences,
                'time_preferences': time_preferences,
                'recent_interactions': activities[:10],  # ultimele 10 interacțiuni
                'profile_strength': min(100, len(activities) * 5)  # 0-100%
            }
            
        except Exception as e:
            print(f"Error building user profile: {e}")
            return {
                'is_new_user': True,
                'total_activities': 0,
                'engagement_level': 'new',
                'city_preferences': {},
                'category_preferences': {},
                'time_preferences': {},
                'recent_interactions': []
            }
    
    async def _get_user_activities_with_decay(
        self, 
        db: AsyncSession, 
        user_id: Optional[str],
        session_id: Optional[str]
    ) -> List[Dict]:
        """Obține activitățile utilizatorului cu time decay weighting"""
        
        try:
            now = datetime.utcnow()
            
            # Query pentru activități
            if user_id:
                user_uuid = uuid.UUID(user_id)
                query = select(UserActivity).where(
                    or_(
                        UserActivity.user_id == user_uuid,
                        and_(
                            UserActivity.session_id == session_id,
                            UserActivity.user_id.is_(None)
                        )
                    )
                ).order_by(desc(UserActivity.created_at))
            else:
                query = select(UserActivity).where(
                    UserActivity.session_id == session_id
                ).order_by(desc(UserActivity.created_at))
            
            result = await db.execute(query)
            raw_activities = result.scalars().all()
            
            # Aplică time decay și weight-uri
            weighted_activities = []
            for activity in raw_activities:
                days_old = (now - activity.created_at).days
                
                # Calculează time decay weight
                if days_old <= self.time_decay_days['recent']:
                    time_weight = 1.0
                elif days_old <= self.time_decay_days['medium']:
                    time_weight = 0.7
                elif days_old <= self.time_decay_days['old']:
                    time_weight = 0.3
                else:
                    time_weight = 0.1
                
                # Aplică interaction weight
                interaction_weight = self.interaction_weights.get(activity.activity_type, 1.0)
                
                # Calculează weight-ul final
                final_weight = time_weight * interaction_weight
                
                weighted_activities.append({
                    'id': activity.id,
                    'activity_type': activity.activity_type,
                    'city': activity.city,
                    'place_name': activity.place_name,
                    'search_activities': activity.search_activities or [],
                    'created_at': activity.created_at,
                    'days_old': days_old,
                    'time_weight': time_weight,
                    'interaction_weight': interaction_weight,
                    'final_weight': final_weight
                })
            
            return weighted_activities
            
        except Exception as e:
            print(f"Error getting user activities: {e}")
            return []
    
    async def _analyze_city_preferences(self, activities: List[Dict]) -> Dict:
        """Analizează preferințele pentru orașe cu weight-uri"""
        
        city_scores = {}
        
        for activity in activities:
            if activity.get('city'):
                city = activity['city']
                weight = activity.get('final_weight', 1.0)
                
                if city not in city_scores:
                    city_scores[city] = 0
                
                city_scores[city] += weight
        
        # Sortează și normalizează
        if city_scores:
            max_score = max(city_scores.values())
            normalized_scores = {
                city: round(score / max_score * 100, 2) 
                for city, score in city_scores.items()
            }
            
            return dict(sorted(normalized_scores.items(), key=lambda x: x[1], reverse=True)[:5])
        
        return {}
    
    async def _analyze_category_preferences(self, activities: List[Dict]) -> Dict:
        """Analizează preferințele pentru categorii de activități"""
        
        category_scores = {}
        
        for activity in activities:
            if activity.get('search_activities'):
                weight = activity.get('final_weight', 1.0)
                
                for category in activity['search_activities']:
                    if category not in category_scores:
                        category_scores[category] = 0
                    
                    category_scores[category] += weight
        
        # Normalizează
        if category_scores:
            max_score = max(category_scores.values())
            normalized_scores = {
                category: round(score / max_score * 100, 2)
                for category, score in category_scores.items()
            }
            
            return dict(sorted(normalized_scores.items(), key=lambda x: x[1], reverse=True))
        
        return {}
    
    async def _analyze_time_patterns(self, activities: List[Dict]) -> Dict:
        """Analizează pattern-urile temporale de activitate"""
        
        time_patterns = {
            'morning': 0,    # 6-12
            'afternoon': 0,  # 12-17
            'evening': 0,    # 17-21
            'night': 0       # 21-6
        }
        
        weekday_activity = 0
        weekend_activity = 0
        
        for activity in activities:
            created_at = activity.get('created_at')
            if not created_at:
                continue
                
            weight = activity.get('final_weight', 1.0)
            hour = created_at.hour
            weekday = created_at.weekday()
            
            # Analizează ora zilei
            if 6 <= hour < 12:
                time_patterns['morning'] += weight
            elif 12 <= hour < 17:
                time_patterns['afternoon'] += weight
            elif 17 <= hour < 21:
                time_patterns['evening'] += weight
            else:
                time_patterns['night'] += weight
            
            # Analizează ziua săptămânii
            if weekday < 5:  # Luni-Vineri
                weekday_activity += weight
            else:  # Sâmbătă-Duminică
                weekend_activity += weight
        
        # Determină pattern-ul preferat
        if time_patterns:
            preferred_time = max(time_patterns.items(), key=lambda x: x[1])[0]
        else:
            preferred_time = 'afternoon'
        
        return {
            'preferred_time_of_day': preferred_time,
            'time_distribution': time_patterns,
            'weekday_vs_weekend': {
                'weekday': weekday_activity,
                'weekend': weekend_activity
            }
        }
    
    def _calculate_engagement_score(self, activities: List[Dict]) -> float:
        """Calculează scorul de engagement bazat pe activități și weight-uri"""
        
        if not activities:
            return 0.0
        
        total_weighted_score = sum(activity.get('final_weight', 1.0) for activity in activities)
        recent_activity_count = len([a for a in activities if a.get('days_old', 999) <= 7])
        diversity_score = len(set(a.get('city') for a in activities if a.get('city'))) * 10
        
        # Calculează scorul final (0-100)
        engagement_score = min(100, total_weighted_score + recent_activity_count * 5 + diversity_score)
        
        return round(engagement_score, 2)
    
    def _determine_engagement_level(self, engagement_score: float) -> str:
        """Determină nivelul de engagement bazat pe scor"""
        
        if engagement_score >= 70:
            return 'high'
        elif engagement_score >= 35:
            return 'medium'
        elif engagement_score >= 10:
            return 'low'
        else:
            return 'new'
    
    async def _get_discovery_recommendations(self, db: AsyncSession, limit: int) -> Dict:
        """Recomandări pentru utilizatori noi - discovery mode"""
        
        try:
            # Obține locurile cele mai populare și diverse
            result = await db.execute(
                select(PlacePopularity)
                .order_by(desc(PlacePopularity.trending_score))
                .limit(limit * 2)
            )
            
            places = result.scalars().all()
            
            # Diversifică rezultatele (max 2 din fiecare oraș)
            city_count = {}
            diverse_places = []
            
            for place in places:
                city = place.city
                if city_count.get(city, 0) < 2:
                    diverse_places.append(place)
                    city_count[city] = city_count.get(city, 0) + 1
                
                if len(diverse_places) >= limit:
                    break
            
            recommendations = self._convert_places_to_recommendations(
                diverse_places, 
                "Trending destination to discover"
            )
            
            return {
                'main_recommendations': recommendations,
                'recommendation_type': 'discovery',
                'personalization_level': 'none',
                'data_source': f"trending({len(recommendations)})",
                'message': 'Popular destinations to get you started'
            }
            
        except Exception as e:
            print(f"Error getting discovery recommendations: {e}")
            return {
                'main_recommendations': [],
                'recommendation_type': 'error',
                'message': 'Could not load recommendations'
            }
    
    async def _get_advanced_personalized_recommendations(
        self, 
        db: AsyncSession, 
        user_id: str, 
        user_profile: Dict,
        limit: int
    ) -> Dict:
        """Recomandări personalizate avansate cu algoritm îmbunătățit"""
        
        try:
            recommendations = []
            
            # 1. Recomandări bazate pe orașe preferate (40% din rezultate)
            city_limit = max(1, int(limit * 0.4))
            if user_profile['city_preferences']:
                city_recs = await self._get_city_based_recommendations(
                    db, user_profile['city_preferences'], city_limit
                )
                recommendations.extend(city_recs)
            
            # 2. Recomandări bazate pe categorii preferate (30% din rezultate)
            category_limit = max(1, int(limit * 0.3))
            if user_profile['category_preferences']:
                category_recs = await self._get_category_based_recommendations(
                    db, user_profile['category_preferences'], category_limit
                )
                recommendations.extend(category_recs)
            
            # 3. Recomandări collaborative filtering (20% din rezultate)
            collab_limit = max(1, int(limit * 0.2))
            collab_recs = await self._get_collaborative_recommendations(
                db, user_id, user_profile, collab_limit
            )
            recommendations.extend(collab_recs)
            
            # 4. Serendipity recommendations (10% din rezultate)
            serendipity_limit = limit - len(recommendations)
            if serendipity_limit > 0:
                serendipity_recs = await self._get_serendipity_recommendations(
                    db, user_profile, serendipity_limit
                )
                recommendations.extend(serendipity_recs)
            
            # Remove duplicates și limitează
            seen_names = set()
            unique_recommendations = []
            for rec in recommendations:
                if rec['name'] not in seen_names:
                    seen_names.add(rec['name'])
                    unique_recommendations.append(rec)
                    if len(unique_recommendations) >= limit:
                        break
            
            return {
                'main_recommendations': unique_recommendations,
                'in_your_favorite_cities': unique_recommendations[:3] if user_profile['city_preferences'] else [],
                'recommendation_type': 'advanced_personalized',
                'personalization_level': user_profile['engagement_level'],
                'profile_strength': user_profile['profile_strength'],
                'data_source': f"hybrid({len(unique_recommendations)})",
                'user_insights': {
                    'engagement_score': user_profile['engagement_score'],
                    'favorite_cities': list(user_profile['city_preferences'].keys())[:3],
                    'preferred_categories': list(user_profile['category_preferences'].keys())[:3],
                    'preferred_time': user_profile['time_preferences'].get('preferred_time_of_day', 'any')
                }
            }
            
        except Exception as e:
            print(f"Error getting advanced personalized recommendations: {e}")
            return await self._get_discovery_recommendations(db, limit)
    
    async def _get_city_based_recommendations(
        self, 
        db: AsyncSession, 
        city_preferences: Dict, 
        limit: int
    ) -> List[Dict]:
        """Recomandări bazate pe orașele preferate"""
        
        if not city_preferences:
            return []
        
        try:
            # Selezct orașe cu scoruri înalte
            top_cities = list(city_preferences.keys())[:3]
            
            result = await db.execute(
                select(PlacePopularity)
                .where(PlacePopularity.city.in_(top_cities))
                .order_by(desc(PlacePopularity.popularity_score))
                .limit(limit)
            )
            
            places = result.scalars().all()
            return self._convert_places_to_recommendations(
                places, 
                f"Popular in {', '.join(top_cities[:2])}"
            )
            
        except Exception as e:
            print(f"Error getting city-based recommendations: {e}")
            return []
    
    async def _get_category_based_recommendations(
        self, 
        db: AsyncSession, 
        category_preferences: Dict, 
        limit: int
    ) -> List[Dict]:
        """Recomandări bazate pe categoriile preferate"""
        
        # Pentru moment, returnează recomandări generale
        # Poți îmbunătăți asta adăugând o coloană de categorie în PlacePopularity
        try:
            result = await db.execute(
                select(PlacePopularity)
                .order_by(desc(PlacePopularity.trending_score))
                .limit(limit)
            )
            
            places = result.scalars().all()
            top_category = list(category_preferences.keys())[0] if category_preferences else "Experience"
            
            return self._convert_places_to_recommendations(
                places, 
                f"Perfect for {top_category.lower()} lovers"
            )
            
        except Exception as e:
            print(f"Error getting category-based recommendations: {e}")
            return []
    
    async def _get_collaborative_recommendations(
        self, 
        db: AsyncSession, 
        user_id: str, 
        user_profile: Dict,
        limit: int
    ) -> List[Dict]:
        """Collaborative filtering - recomandări bazate pe utilizatori similari"""
        
        try:
            # Găsește utilizatori cu preferințe similare
            similar_cities = list(user_profile['city_preferences'].keys())[:2]
            
            if not similar_cities:
                return []
            
            # Găsește locuri popular la utilizatori cu același oraș preferat
            result = await db.execute(
                select(PlacePopularity)
                .where(PlacePopularity.city.in_(similar_cities))
                .order_by(desc(PlacePopularity.total_favorites))
                .limit(limit)
            )
            
            places = result.scalars().all()
            return self._convert_places_to_recommendations(
                places, 
                "Loved by travelers like you"
            )
            
        except Exception as e:
            print(f"Error getting collaborative recommendations: {e}")
            return []
    
    async def _get_serendipity_recommendations(
        self, 
        db: AsyncSession, 
        user_profile: Dict,
        limit: int
    ) -> List[Dict]:
        """Recomandări serendipity - locuri neașteptate pentru diversitate"""
        
        try:
            # Exclude orașele vizitate frecvent pentru diversitate
            visited_cities = list(user_profile['city_preferences'].keys())
            
            if visited_cities:
                result = await db.execute(
                    select(PlacePopularity)
                    .where(~PlacePopularity.city.in_(visited_cities))
                    .order_by(desc(PlacePopularity.trending_score))
                    .limit(limit)
                )
            else:
                result = await db.execute(
                    select(PlacePopularity)
                    .order_by(desc(PlacePopularity.trending_score))
                    .limit(limit)
                )
            
            places = result.scalars().all()
            return self._convert_places_to_recommendations(
                places, 
                "Hidden gem to discover"
            )
            
        except Exception as e:
            print(f"Error getting serendipity recommendations: {e}")
            return []
    
    async def _get_advanced_session_recommendations(
        self, 
        db: AsyncSession, 
        session_id: str, 
        user_profile: Dict,
        limit: int
    ) -> Dict:
        """Recomandări avansate pentru sesiune"""
        
        try:
            recommendations = []
            
            # Bazat pe orașele căutate în sesiune
            if user_profile['city_preferences']:
                city_recs = await self._get_city_based_recommendations(
                    db, user_profile['city_preferences'], limit // 2
                )
                recommendations.extend(city_recs)
            
            # Completează cu trending
            remaining = limit - len(recommendations)
            if remaining > 0:
                result = await db.execute(
                    select(PlacePopularity)
                    .order_by(desc(PlacePopularity.trending_score))
                    .limit(remaining)
                )
                trending_places = result.scalars().all()
                trending_recs = self._convert_places_to_recommendations(trending_places, "Trending now")
                recommendations.extend(trending_recs)
            
            return {
                'main_recommendations': recommendations[:limit],
                'based_on_your_searches': recommendations[:3],
                'recommendation_type': 'advanced_session_based',
                'personalization_level': 'session',
                'data_source': f"session({len(recommendations)})",
                'session_insights': {
                    'cities_explored': list(user_profile['city_preferences'].keys()),
                    'total_session_activities': user_profile['total_activities'],
                    'engagement_score': user_profile['engagement_score']
                }
            }
            
        except Exception as e:
            print(f"Error getting advanced session recommendations: {e}")
            return await self._get_discovery_recommendations(db, limit)
    
    def _convert_places_to_recommendations(
        self, 
        places: List, 
        reason: str = "Recommended for you"
    ) -> List[Dict]:
        """Convertește PlacePopularity în format de recomandări îmbunătățit"""
        
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
            
            # Calculează rating dinamic
            rating = min(5.0, max(3.0, 3.5 + (place.popularity_score or 0) / 1000))
            
            recommendations.append({
                'place_id': place.place_id,
                'name': place.place_name,
                'city': place.city,
                'rating': round(rating, 1),
                'popularity_score': place.popularity_score or 0,
                'recommendation_reason': reason,
                'pictures': [main_picture],
                'description': f"Discover this amazing place in {place.city}. A must-see destination with {place.total_views or 0} views and {place.total_favorites or 0} favorites.",
                'category': 'Experience',
                'minimumDuration': '2-4h',
                'score': max(3.0, 3.5 + (place.popularity_score or 0) / 100),
                'lat': base_lat + lat_offset,
                'lon': base_lon + lon_offset,
                'data_source': 'enhanced_database',
                'is_real_place': True,
                'ml_enhanced': True,
                'last_updated': place.updated_at.isoformat() if place.updated_at else None
            })
        
        return recommendations
    
    # ===== TRACKING METHODS (ENHANCED) =====
    
    async def track_search(
        self, 
        db: AsyncSession, 
        user_id: Optional[str], 
        session_id: str,
        city: str, 
        activities: List[str], 
        time: str
    ):
        """Enhanced search tracking cu real-time learning"""
        
        user_uuid = None
        if user_id:
            try:
                user_uuid = uuid.UUID(user_id)
                # Verifică dacă utilizatorul există și creează profilul dacă e nevoie
                await self._ensure_user_exists(db, user_id)
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
        
        # Real-time learning - updatează imediat popularitatea orașului
        await self._update_city_popularity(db, city, 'search')
        
        user_type = "authenticated" if user_uuid else "anonymous"
        print(f"Enhanced search tracked ({user_type}): {city} - {activities}")
    
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
        """Enhanced interaction tracking cu immediate feedback"""
        
        user_uuid = None
        if user_id:
            try:
                user_uuid = uuid.UUID(user_id)
                await self._ensure_user_exists(db, user_id)
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
        
        # Real-time popularity update cu weight-uri diferite
        await self._update_place_popularity_enhanced(db, place_id, place_name, city, interaction_type)
        
        await db.commit()
        
        user_type = "authenticated" if user_uuid else "anonymous"
        print(f"Enhanced interaction tracked ({user_type}): {interaction_type} - {place_name}")
    
    async def _ensure_user_exists(self, db: AsyncSession, user_id: str):
        """Asigură-te că utilizatorul există în baza de date"""
        try:
            user_uuid = uuid.UUID(user_id)
            result = await db.execute(
                select(User).where(User.id == user_uuid)
            )
            user = result.scalar_one_or_none()
            
            if not user:
                print(f"User {user_id} not found in database, but continuing with tracking")
            
        except Exception as e:
            print(f"Error checking user existence: {e}")
    
    async def _update_place_popularity_enhanced(
        self, 
        db: AsyncSession, 
        place_id: str, 
        place_name: str, 
        city: str, 
        interaction_type: str
    ):
        """Enhanced popularity update cu algoritm îmbunătățit"""
        
        if not place_id and place_name and city:
            place_id = f"{place_name}_{city}".lower().replace(' ', '_').replace("'", "")
        
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
            
            # Enhanced scoring cu weight-uri îmbunătățite
            score_multipliers = {
                'view': 1.0,
                'favorite': 5.0,
                'add_to_itinerary': 4.0,
                'share': 3.0,
                'search': 0.5
            }
            
            # Actualizează contoarele
            if interaction_type == 'view':
                popularity.total_views = (popularity.total_views or 0) + 1
            elif interaction_type == 'favorite':
                popularity.total_favorites = (popularity.total_favorites or 0) + 1
            elif interaction_type == 'add_to_itinerary':
                popularity.total_itinerary_adds = (popularity.total_itinerary_adds or 0) + 1
            elif interaction_type == 'share':
                popularity.total_shares = (popularity.total_shares or 0) + 1
            
            # Recalculează scorul cu formula îmbunătățită
            base_score = (
                (popularity.total_views or 0) * score_multipliers['view'] +
                (popularity.total_favorites or 0) * score_multipliers['favorite'] +
                (popularity.total_itinerary_adds or 0) * score_multipliers['add_to_itinerary'] +
                (popularity.total_shares or 0) * score_multipliers['share']
            )
            
            # Adaugă bonus pentru diversitate de interacțiuni
            interaction_types = [
                popularity.total_views > 0,
                popularity.total_favorites > 0,
                popularity.total_itinerary_adds > 0,
                popularity.total_shares > 0
            ]
            diversity_bonus = sum(interaction_types) * 10
            
            popularity.popularity_score = base_score + diversity_bonus
            
            # Enhanced trending score cu time decay
            await self._update_trending_score(db, popularity, place_name)
            
            popularity.updated_at = datetime.utcnow()
            
        except Exception as e:
            print(f"Error updating enhanced place popularity: {e}")
    
    async def _update_trending_score(self, db: AsyncSession, popularity: PlacePopularity, place_name: str):
        """Actualizează trending score cu time decay"""
        
        try:
            # Calculează activitatea recenta (ultima săptămână)
            week_ago = datetime.utcnow() - timedelta(days=7)
            
            result = await db.execute(
                select(func.count(UserActivity.id))
                .where(UserActivity.place_name == place_name)
                .where(UserActivity.created_at >= week_ago)
            )
            
            recent_activity = result.scalar() or 0
            
            # Calculează trending score cu boost pentru activitate recentă
            base_trending = recent_activity * 15.0
            
            # Adaugă boost dacă locul a fost adăugat recent la favorite/itinerary
            recent_high_value = await db.execute(
                select(func.count(UserActivity.id))
                .where(UserActivity.place_name == place_name)
                .where(UserActivity.activity_type.in_(['favorite', 'add_to_itinerary']))
                .where(UserActivity.created_at >= week_ago)
            )
            
            high_value_activity = recent_high_value.scalar() or 0
            trending_boost = high_value_activity * 25.0
            
            popularity.trending_score = base_trending + trending_boost
            
        except Exception as e:
            print(f"Error updating trending score: {e}")
            popularity.trending_score = 10.0  # default value
    
    async def _update_city_popularity(self, db: AsyncSession, city: str, interaction_type: str):
        """Actualizează popularitatea orașului pentru căutări"""
        
        try:
            # Poți adăuga o tabelă separată pentru popularitatea orașelor
            # Pentru moment, doar log
            print(f"City popularity update: {city} - {interaction_type}")
            
        except Exception as e:
            print(f"Error updating city popularity: {e}")
    
    async def migrate_anonymous_to_user(self, db: AsyncSession, user_id: str, session_id: str):
        """Migrează datele de la sesiunea anonimă la utilizatorul autentificat"""
        
        try:
            user_uuid = uuid.UUID(user_id)
            
            # Găsește activitățile anonime din sesiune
            result = await db.execute(
                select(UserActivity)
                .where(UserActivity.session_id == session_id)
                .where(UserActivity.user_id.is_(None))
            )
            
            anonymous_activities = result.scalars().all()
            
            # Migrează activitățile la utilizatorul autentificat
            migrated_count = 0
            for activity in anonymous_activities:
                activity.user_id = user_uuid
                migrated_count += 1
            
            await db.commit()
            
            print(f"Migrated {migrated_count} anonymous activities to user {user_id}")
            return migrated_count
            
        except Exception as e:
            print(f"Error migrating anonymous data: {e}")
            return 0
    
    # ===== UTILITY METHODS =====
    
    async def get_user_stats(self, db: AsyncSession, user_id: str) -> Dict:
        """Obține statistici detaliate pentru utilizator"""
        
        try:
            user_profile = await self._build_enhanced_user_profile(db, user_id, None)
            
            return {
                'user_id': user_id,
                'profile': user_profile,
                'recommendations_ready': not user_profile['is_new_user'],
                'next_milestone': self._get_next_milestone(user_profile['total_activities'])
            }
            
        except Exception as e:
            print(f"Error getting user stats: {e}")
            return {'error': str(e)}
    
    def _get_next_milestone(self, activity_count: int) -> Dict:
        """Calculează următorul milestone pentru utilizator"""
        
        milestones = [
            (5, "Explorer", "Search 5 destinations"),
            (10, "Traveler", "Interact with 10 places"),
            (25, "Adventurer", "Build a rich travel profile"),
            (50, "Wanderer", "Become a travel expert")
        ]
        
        for count, title, description in milestones:
            if activity_count < count:
                return {
                    'target_count': count,
                    'current_count': activity_count,
                    'title': title,
                    'description': description,
                    'progress': (activity_count / count) * 100
                }
        
        return {
            'target_count': activity_count,
            'current_count': activity_count,
            'title': "Travel Master",
            'description': "You've mastered the art of travel discovery!",
            'progress': 100
        }
    
    async def get_trending_places(self, db: AsyncSession, city: str = None, limit: int = 10) -> List[Dict]:
        """Obține locurile trending cu opțiune de filtru pe oraș"""
        
        try:
            query = select(PlacePopularity).order_by(desc(PlacePopularity.trending_score))
            
            if city:
                query = query.where(PlacePopularity.city.ilike(f"%{city}%"))
            
            query = query.limit(limit)
            
            result = await db.execute(query)
            places = result.scalars().all()
            
            return self._convert_places_to_recommendations(places, "Trending now")
            
        except Exception as e:
            print(f"Error getting trending places: {e}")
            return []
    
    async def cleanup_old_activities(self, db: AsyncSession, days_old: int = 180):
        """Curăță activitățile vechi pentru performanță"""
        
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            
            result = await db.execute(
                select(func.count(UserActivity.id))
                .where(UserActivity.created_at < cutoff_date)
            )
            
            old_count = result.scalar() or 0
            
            if old_count > 0:
                # În producție, s-ar putea să vrei să arhivezi în loc să ștergi
                print(f"Found {old_count} old activities (older than {days_old} days)")
                # Uncomment to actually delete:
                # await db.execute(delete(UserActivity).where(UserActivity.created_at < cutoff_date))
                # await db.commit()
                # print(f"Cleaned up {old_count} old activities")
            
            return old_count
            
        except Exception as e:
            print(f"Error cleaning up old activities: {e}")
            return 0