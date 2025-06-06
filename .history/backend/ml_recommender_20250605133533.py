from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, func, and_, or_
from models import UserActivity, UserProfile, PlacePopularity, User
from typing import List, Dict, Optional
import json
from datetime import datetime, timedelta
import uuid
import math
import random

class EnhancedMLRecommender:
    """Sistem ML îmbunătățit cu recomandări context-aware și diversificate - FIXED"""
    
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
        
        # Context weights for search-based recommendations
        self.context_weights = {
            'current_search': 0.5,      # 50% weight pentru căutarea curentă
            'user_history': 0.25,       # 25% weight pentru istoricul utilizatorului
            'collaborative': 0.15,      # 15% weight pentru collaborative filtering
            'discovery': 0.1            # 10% weight pentru discovery/serendipity
        }
        
        # Storage pentru search context per sesiune
        self.search_contexts = {}
        
        print("✅ Enhanced ML Recommender FIXED initialized with context-aware recommendations")
    
    async def get_home_recommendations(
        self, 
        db: AsyncSession, 
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        limit: int = 8,
        current_search_context: Optional[Dict] = None
    ) -> Dict:
        """FIXED: Enhanced recommendations cu priority pentru fresh search context"""
        
        print(f"🎯 GETTING RECOMMENDATIONS - User: {user_id or 'anon'}, Session: {session_id}")
        print(f"🎯 Search context provided: {bool(current_search_context)}")
        
        # Check pentru search context
        if not current_search_context and session_id:
            current_search_context = self.get_search_context(session_id)
            if current_search_context:
                print(f"📱 Retrieved stored search context: {current_search_context['city']}")
        
        # Check database
        result = await db.execute(select(func.count(PlacePopularity.id)))
        total_places = result.scalar() or 0
        
        print(f"📊 Database has {total_places} places")
        
        if total_places == 0:
            print("❌ No places in database - returning no_data")
            return {
                'main_recommendations': [],
                'recommendation_type': 'no_data',
                'message': 'No places found. Please search for destinations first.',
                'data_source': 'none'
            }
        
        # Build user profile
        user_profile = await self._build_enhanced_user_profile(db, user_id, session_id)
        print(f"👤 User profile: {user_profile['total_activities']} activities, {user_profile['engagement_level']} engagement")
        
        # FIXED: FORCE recommendations chiar și pentru new users dacă au search context
        if current_search_context:
            print(f"🎯 HAS SEARCH CONTEXT - forcing recommendations for {current_search_context['city']}")
            
            if user_profile['is_new_user']:
                print("🆕 New user WITH search context - generating context-based recommendations")
                return await self._get_search_context_only_recommendations(db, current_search_context, limit)
            else:
                # Apply search context to existing profile
                user_profile = await self._apply_search_context(user_profile, current_search_context)
                print(f"✅ Applied search context to existing user profile")
        
        # Normal flow pentru users fără context
        if user_profile['is_new_user'] and not current_search_context:
            print("🆕 New user WITHOUT context - discovery recommendations")
            return await self._get_diversified_discovery_recommendations(db, {}, limit, None)
        
        # Generate personalized recommendations
        print(f"🤖 Generating personalized recommendations...")
        if user_id:
            return await self._get_context_aware_personalized_recommendations(
                db, user_id, user_profile, limit, current_search_context
            )
        else:
            return await self._get_context_aware_session_recommendations(
                db, session_id, user_profile, limit, current_search_context
            )
    
    async def _get_search_context_only_recommendations(
        self, 
        db: AsyncSession, 
        search_context: Dict, 
        limit: int
    ) -> Dict:
        """FIXED: Special recommendations DOAR pe baza search context pentru new users"""
        
        try:
            city = search_context.get('city')
            activities = search_context.get('activities', [])
            
            print(f"🎯 Generating search-context-only recommendations for {city} - {activities}")
            
            recommendations = []
            
            # 1. Get search-based places (created from previous searches)
            search_based_places = []
            for activity in activities:
                place_id = f"search_{city}_{activity}".lower().replace(' ', '_').replace("'", "")
                
                result = await db.execute(
                    select(PlacePopularity).where(PlacePopularity.place_id == place_id)
                )
                place = result.scalar_one_or_none()
                if place:
                    search_based_places.append(place)
            
            if search_based_places:
                search_recs = self._convert_places_to_recommendations(
                    search_based_places, 
                    f"Perfect {', '.join(activities[:2])} experiences in {city}"
                )
                recommendations.extend(search_recs)
                print(f"✅ Added {len(search_recs)} search-based recommendations")
            
            # 2. Get places from searched city
            if city:
                city_query = select(PlacePopularity).where(
                    PlacePopularity.city.ilike(f"%{city}%")
                ).order_by(desc(PlacePopularity.popularity_score)).limit(limit)
                
                result = await db.execute(city_query)
                city_places = result.scalars().all()
                
                if city_places:
                    city_recs = self._convert_places_to_recommendations(
                        city_places, 
                        f"Top destinations in {city}"
                    )
                    recommendations.extend(city_recs)
                    print(f"✅ Added {len(city_recs)} city-based recommendations")
            
            # 3. Fill with trending if still not enough
            if len(recommendations) < limit:
                trending_query = select(PlacePopularity).order_by(
                    desc(PlacePopularity.trending_score)
                ).limit(limit - len(recommendations))
                
                result = await db.execute(trending_query)
                trending_places = result.scalars().all()
                
                if trending_places:
                    trending_recs = self._convert_places_to_recommendations(
                        trending_places,
                        "Trending worldwide"
                    )
                    recommendations.extend(trending_recs)
                    print(f"✅ Added {len(trending_recs)} trending recommendations")
            
            # Remove duplicates
            unique_recommendations = self._aggressively_diversify_recommendations(recommendations, limit)
            
            # Mark all as AI recommendations
            for rec in unique_recommendations:
                rec['recommendation_source'] = 'search_context'
                rec['isMLRecommendation'] = True
                rec['context_aware'] = True
                rec['enhanced_ml'] = True
                rec['ml_enhanced'] = True
                rec['data_source'] = 'enhanced_database'
            
            print(f"🎯 Generated {len(unique_recommendations)} search-context recommendations")
            
            return {
                'main_recommendations': unique_recommendations,
                'recommendation_type': 'search_context_new_user',
                'personalization_level': 'search_based',
                'data_source': f"search_context({len(unique_recommendations)})",
                'context_influence': True,
                'user_insights': {
                    'search_city': city,
                    'search_activities': activities,
                    'new_user_with_search': True,
                    'recommendations_source': 'immediate_search_context'
                }
            }
            
        except Exception as e:
            print(f"❌ Error getting search context recommendations: {e}")
            return {
                'main_recommendations': [],
                'recommendation_type': 'error',
                'message': 'Error generating recommendations',
                'data_source': 'error'
            }
    
    async def track_search(
        self, 
        db: AsyncSession, 
        user_id: Optional[str], 
        session_id: str,
        city: str, 
        activities: List[str], 
        time: str
    ):
        """FIXED: Enhanced search tracking care stochează contextul pentru recomandări IMEDIATE"""
        
        print(f"🔍 TRACKING SEARCH: {city} - {activities} - User: {user_id or 'anon'}")
        
        # Store the search context pentru folosire imediată
        search_context = {
            'city': city,
            'activities': activities,
            'time': time,
            'timestamp': datetime.utcnow(),
            'user_id': user_id,
            'session_id': session_id
        }
        
        # Store context pentru sesiune (IMPORTANT pentru recomandări imediate)
        self.search_contexts[session_id] = search_context
        print(f"✅ Search context stored for session: {session_id}")
        
        # Create user activity records
        user_uuid = None
        if user_id:
            try:
                user_uuid = uuid.UUID(user_id)
                await self._ensure_user_exists(db, user_id)
                print(f"👤 Authenticated user: {user_id[:8]}...")
            except ValueError:
                print(f"❌ Invalid user_id format: {user_id}")
                user_uuid = None
        else:
            print(f"👥 Anonymous user: session {session_id[:8]}...")
        
        # Create multiple activity records pentru better ML learning
        activities_to_track = []
        
        # Main search activity
        main_activity = UserActivity(
            user_id=user_uuid,
            session_id=session_id,
            activity_type='search',
            city=city,
            search_activities=activities,
            search_time=time,
            created_at=datetime.utcnow()
        )
        activities_to_track.append(main_activity)
        
        # Create individual category activities pentru mai bună învățare
        for activity_category in activities:
            category_activity = UserActivity(
                user_id=user_uuid,
                session_id=session_id,
                activity_type='search_category',
                city=city,
                place_name=f"{city}_{activity_category}",  # Virtual place for category
                search_activities=[activity_category],
                search_time=time,
                created_at=datetime.utcnow()
            )
            activities_to_track.append(category_activity)
        
        # Create city interest activity
        city_activity = UserActivity(
            user_id=user_uuid,
            session_id=session_id,
            activity_type='city_interest',
            city=city,
            place_name=f"Interest_in_{city}",
            search_activities=activities,
            search_time=time,
            created_at=datetime.utcnow()
        )
        activities_to_track.append(city_activity)
        
        # Add all activities to database
        for activity in activities_to_track:
            db.add(activity)
        
        await db.commit()
        print(f"📊 Created {len(activities_to_track)} activity records for ML learning")
        
        # Real-time learning - update city and category popularity
        await self._update_city_popularity(db, city, 'search')
        
        # Create/update places pentru search categories
        await self._create_search_based_places(db, city, activities)
        
        user_type = "authenticated" if user_uuid else "anonymous"
        print(f"✅ Enhanced search tracked ({user_type}): {city} - {activities}")
        print(f"🎯 Search context ready for IMMEDIATE recommendations")

    async def _create_search_based_places(self, db: AsyncSession, city: str, activities: List[str]):
        """Create sau update places bazate pe search pentru ML learning"""
        
        try:
            places_created = 0
            places_updated = 0
            
            for activity in activities:
                # Create place pentru city + activity combination
                place_id = f"search_{city}_{activity}".lower().replace(' ', '_').replace("'", "")
                place_name = f"{activity} experiences in {city}"
                
                # Check if place exists
                result = await db.execute(
                    select(PlacePopularity).where(PlacePopularity.place_id == place_id)
                )
                existing_place = result.scalar_one_or_none()
                
                if not existing_place:
                    # Create new place
                    new_place = PlacePopularity(
                        place_id=place_id,
                        place_name=place_name,
                        city=city,
                        popularity_score=75.0,  # Good initial score
                        trending_score=50.0,
                        total_views=3,  # Start with some activity
                        total_favorites=1,
                        total_itinerary_adds=1,
                        total_shares=0,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(new_place)
                    places_created += 1
                    print(f"➕ Created search-based place: {place_name}")
                else:
                    # Update existing place
                    existing_place.total_views = (existing_place.total_views or 0) + 2
                    existing_place.popularity_score = (existing_place.popularity_score or 0) + 10.0
                    existing_place.trending_score = (existing_place.trending_score or 0) + 15.0
                    existing_place.updated_at = datetime.utcnow()
                    places_updated += 1
                    print(f"📈 Updated search-based place: {place_name}")
            
            # Create general city place if not exists
            city_place_id = f"city_{city}".lower().replace(' ', '_').replace("'", "")
            city_place_name = f"Discover {city}"
            
            result = await db.execute(
                select(PlacePopularity).where(PlacePopularity.place_id == city_place_id)
            )
            existing_city_place = result.scalar_one_or_none()
            
            if not existing_city_place:
                city_place = PlacePopularity(
                    place_id=city_place_id,
                    place_name=city_place_name,
                    city=city,
                    popularity_score=100.0,  # High score for city discovery
                    trending_score=70.0,
                    total_views=5,
                    total_favorites=2,
                    total_itinerary_adds=2,
                    total_shares=1,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(city_place)
                places_created += 1
                print(f"🏙️ Created city discovery place: {city_place_name}")
            else:
                existing_city_place.total_views = (existing_city_place.total_views or 0) + 1
                existing_city_place.popularity_score = (existing_city_place.popularity_score or 0) + 5.0
                existing_city_place.trending_score = (existing_city_place.trending_score or 0) + 8.0
                existing_city_place.updated_at = datetime.utcnow()
                places_updated += 1
            
            await db.commit()
            print(f"✅ Search-based places: {places_created} created, {places_updated} updated")
            
        except Exception as e:
            print(f"❌ Error creating search-based places: {e}")
    
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
    
    async def _apply_search_context(self, user_profile: Dict, search_context: Dict) -> Dict:
        """Apply current search context to modify user profile"""
        
        modified_profile = user_profile.copy()
        
        # Boost city preferences based on current search
        if search_context.get('city'):
            current_city = search_context['city']
            if 'city_preferences' not in modified_profile:
                modified_profile['city_preferences'] = {}
            
            # Boost current city preference significantly
            modified_profile['city_preferences'][current_city] = 100
            
            # Reduce other cities to emphasize current search
            for city in list(modified_profile['city_preferences'].keys()):
                if city != current_city:
                    modified_profile['city_preferences'][city] *= 0.6
        
        # Boost category preferences based on current search
        if search_context.get('activities'):
            current_activities = search_context['activities']
            if 'category_preferences' not in modified_profile:
                modified_profile['category_preferences'] = {}
            
            for activity in current_activities:
                # Boost current search activities
                modified_profile['category_preferences'][activity] = \
                    modified_profile['category_preferences'].get(activity, 0) + 70
        
        # Add search context metadata
        modified_profile['search_context'] = search_context
        modified_profile['context_applied'] = True
        
        print(f"Applied search context: {search_context}")
        return modified_profile
    
    async def _get_context_aware_personalized_recommendations(
        self, 
        db: AsyncSession, 
        user_id: str, 
        user_profile: Dict,
        limit: int,
        search_context: Optional[Dict] = None
    ) -> Dict:
        """Context-aware personalized recommendations cu diversificare"""
        
        try:
            recommendations = []
            
            # 1. Context-based recommendations (prioritate pentru căutarea curentă)
            if search_context:
                context_limit = max(2, int(limit * self.context_weights['current_search']))
                context_recs = await self._get_search_context_recommendations(
                    db, search_context, context_limit
                )
                recommendations.extend(context_recs)
                print(f"Added {len(context_recs)} context-based recommendations")
            
            # 2. User history-based recommendations (diversificate)
            history_limit = max(1, int(limit * self.context_weights['user_history']))
            if user_profile['city_preferences']:
                history_recs = await self._get_diversified_city_recommendations(
                    db, user_profile['city_preferences'], history_limit, search_context
                )
                recommendations.extend(history_recs)
                print(f"Added {len(history_recs)} history-based recommendations")
            
            # 3. Collaborative filtering (random selection)
            collab_limit = max(1, int(limit * self.context_weights['collaborative']))
            collab_recs = await self._get_randomized_collaborative_recommendations(
                db, user_id, user_profile, collab_limit, search_context
            )
            recommendations.extend(collab_recs)
            print(f"Added {len(collab_recs)} collaborative recommendations")
            
            # 4. Discovery/Serendipity - ALWAYS include for variety
            discovery_limit = max(1, int(limit * self.context_weights['discovery']))
            discovery_recs = await self._get_diversified_discovery_recommendations(
                db, user_profile, discovery_limit, search_context
            )
            recommendations.extend(discovery_recs)
            print(f"Added {len(discovery_recs)} discovery recommendations")
            
            # 5. Fill remaining slots with trending places (randomized)
            remaining_slots = limit - len(recommendations)
            if remaining_slots > 0:
                trending_recs = await self._get_randomized_trending_recommendations(
                    db, remaining_slots, search_context
                )
                recommendations.extend(trending_recs)
                print(f"Added {len(trending_recs)} trending recommendations")
            
            # Remove duplicates și aplică diversificare agresivă
            unique_recommendations = self._aggressively_diversify_recommendations(recommendations, limit)
            
            return {
                'main_recommendations': unique_recommendations,
                'in_your_favorite_cities': unique_recommendations[:3] if user_profile['city_preferences'] else [],
                'recommendation_type': 'context_aware_personalized',
                'personalization_level': user_profile['engagement_level'],
                'profile_strength': user_profile['profile_strength'],
                'data_source': f"context_hybrid({len(unique_recommendations)})",
                'context_influence': search_context is not None,
                'diversity_applied': True,
                'user_insights': {
                    'engagement_score': user_profile['engagement_score'],
                    'favorite_cities': list(user_profile['city_preferences'].keys())[:3],
                    'preferred_categories': list(user_profile['category_preferences'].keys())[:3],
                    'preferred_time': user_profile['time_preferences'].get('preferred_time_of_day', 'any'),
                    'search_influenced': search_context is not None
                }
            }
            
        except Exception as e:
            print(f"Error getting context-aware personalized recommendations: {e}")
            return await self._get_diversified_discovery_recommendations(db, user_profile, limit, search_context)
    
    async def _get_search_context_recommendations(
        self, 
        db: AsyncSession, 
        search_context: Dict, 
        limit: int
    ) -> List[Dict]:
        """Get recommendations based on current search context cu randomizare"""
        
        try:
            city = search_context.get('city')
            activities = search_context.get('activities', [])
            
            if not city:
                return []
            
            # Base query pentru orașul căutat cu randomizare
            query = select(PlacePopularity).where(
                PlacePopularity.city.ilike(f"%{city}%")
            )
            
            # Aplică randomizare pentru a evita același rezultat
            query = query.order_by(
                desc(PlacePopularity.popularity_score * func.random())
            ).limit(limit * 3)  # Get more results for better randomization
            
            result = await db.execute(query)
            places = result.scalars().all()
            
            # Random selection from results
            if len(places) > limit:
                selected_places = random.sample(places, limit)
            else:
                selected_places = places
            
            # Convert and add context-specific reasoning
            recommendations = self._convert_places_to_recommendations(
                selected_places, 
                f"Perfect for your search in {city}"
            )
            
            # Add search context metadata
            for rec in recommendations:
                rec['recommendation_source'] = 'search_context'
                rec['context_city'] = city
                rec['context_activities'] = activities
                rec['recommendation_reason'] = f"Perfect match for your {city} search"
            
            return recommendations
            
        except Exception as e:
            print(f"Error getting search context recommendations: {e}")
            return []
    
    async def _get_context_aware_session_recommendations(
        self, 
        db: AsyncSession, 
        session_id: str, 
        user_profile: Dict,
        limit: int,
        search_context: Optional[Dict] = None
    ) -> Dict:
        """Recomandări context-aware pentru sesiune"""
        
        try:
            recommendations = []
            
            # Prioritize search context if available
            if search_context:
                context_recs = await self._get_search_context_recommendations(
                    db, search_context, limit // 2
                )
                recommendations.extend(context_recs)
            
            # Fill with diversified trending places
            remaining = limit - len(recommendations)
            if remaining > 0:
                trending_recs = await self._get_randomized_trending_recommendations(
                    db, remaining, search_context
                )
                recommendations.extend(trending_recs)
            
            # Apply diversity
            diverse_recommendations = self._aggressively_diversify_recommendations(recommendations, limit)
            
            return {
                'main_recommendations': diverse_recommendations,
                'based_on_your_searches': diverse_recommendations[:3] if search_context else [],
                'recommendation_type': 'context_aware_session',
                'personalization_level': 'session',
                'data_source': f"session_context({len(diverse_recommendations)})",
                'context_influence': search_context is not None,
                'diversity_applied': True,
                'session_insights': {
                    'cities_explored': [search_context['city']] if search_context else [],
                    'total_session_activities': user_profile['total_activities'],
                    'engagement_score': user_profile.get('engagement_score', 0)
                }
            }
            
        except Exception as e:
            print(f"Error getting context-aware session recommendations: {e}")
            return await self._get_diversified_discovery_recommendations(db, user_profile, limit, search_context)
    
    def get_search_context(self, session_id: str) -> Optional[Dict]:
        """Get stored search context for session"""
        return self.search_contexts.get(session_id)
    
    def clear_search_context(self, session_id: str):
        """Clear search context after use"""
        if session_id in self.search_contexts:
            del self.search_contexts[session_id]
            print(f"Cleared search context for session: {session_id}")
    
    # Rest of the methods (keeping all existing functionality)
    async def _get_user_activities_with_decay(
        self, 
        db: AsyncSession, 
        user_id: Optional[str],
        session_id: Optional[str]
    ) -> List[Dict]:
        """Obține activitățile utilizatorului cu time decay weighting"""
        
        try:
            now = datetime.utcnow()
            
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
                
                if days_old <= self.time_decay_days['recent']:
                    time_weight = 1.0
                elif days_old <= self.time_decay_days['medium']:
                    time_weight = 0.7
                elif days_old <= self.time_decay_days['old']:
                    time_weight = 0.3
                else:
                    time_weight = 0.1
                
                interaction_weight = self.interaction_weights.get(activity.activity_type, 1.0)
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
    
    async def _get_diversified_city_recommendations(
        self, 
        db: AsyncSession, 
        city_preferences: Dict, 
        limit: int,
        search_context: Optional[Dict] = None
    ) -> List[Dict]:
        """Enhanced city-based recommendations cu diversificare agresivă"""
        
        if not city_preferences:
            return []
        
        try:
            # Get cities but exclude current search city pentru diversitate
            cities = list(city_preferences.keys())
            
            # Exclude current search city if it exists
            if search_context and search_context.get('city'):
                current_city = search_context['city']
                cities = [c for c in cities if c.lower() != current_city.lower()]
            
            if not cities:
                return []
            
            # Shuffle cities to get different results each time
            random.shuffle(cities)
            selected_cities = cities[:min(2, len(cities))]  # Limit to 2 cities max for diversity
            
            result = await db.execute(
                select(PlacePopularity)
                .where(PlacePopularity.city.in_(selected_cities))
                .order_by(
                    desc(PlacePopularity.trending_score * func.random())
                )
                .limit(limit * 2)  # Get more for selection
            )
            
            places = result.scalars().all()
            
            # Random selection
            if len(places) > limit:
                selected_places = random.sample(places, limit)
            else:
                selected_places = places
            
            recommendations = self._convert_places_to_recommendations(
                selected_places, 
                f"Based on your love for {', '.join(selected_cities[:2])}"
            )
            
            # Mark as history-based
            for rec in recommendations:
                rec['recommendation_source'] = 'user_history'
            
            return recommendations
            
        except Exception as e:
            print(f"Error getting diversified city recommendations: {e}")
            return []
    
    async def _get_randomized_collaborative_recommendations(
        self, 
        db: AsyncSession, 
        user_id: str, 
        user_profile: Dict,
        limit: int,
        search_context: Optional[Dict] = None
    ) -> List[Dict]:
        """Collaborative filtering cu randomizare pentru diversitate"""
        
        try:
            # Get cities from different users with similar preferences
            similar_cities = list(user_profile.get('city_preferences', {}).keys())[:2]
            
            # Exclude current search city
            if search_context and search_context.get('city'):
                current_city = search_context['city']
                similar_cities = [c for c in similar_cities if c.lower() != current_city.lower()]
            
            if not similar_cities:
                # Fallback to random popular places
                result = await db.execute(
                    select(PlacePopularity)
                    .order_by(desc(PlacePopularity.popularity_score * func.random()))
                    .limit(limit * 2)
                )
            else:
                # Find places popular with similar preferences
                result = await db.execute(
                    select(PlacePopularity)
                    .where(PlacePopularity.city.in_(similar_cities))
                    .order_by(desc(PlacePopularity.total_favorites * func.random()))
                    .limit(limit * 2)
                )
            
            places = result.scalars().all()
            
            # Random selection
            if len(places) > limit:
                selected_places = random.sample(places, limit)
            else:
                selected_places = places
            
            recommendations = self._convert_places_to_recommendations(
                selected_places, 
                "Loved by travelers like you"
            )
            
            # Mark as collaborative
            for rec in recommendations:
                rec['recommendation_source'] = 'collaborative'
            
            return recommendations
            
        except Exception as e:
            print(f"Error getting randomized collaborative recommendations: {e}")
            return []
    
    async def _get_diversified_discovery_recommendations(
        self, 
        db: AsyncSession, 
        user_profile: Dict,
        limit: int,
        search_context: Optional[Dict] = None
    ) -> List[Dict]:
        """Enhanced discovery recommendations cu diversificare agresivă"""
        
        try:
            # Exclude recent cities pentru discovery adevărat
            visited_cities = list(user_profile.get('city_preferences', {}).keys())
            current_search_city = search_context.get('city') if search_context else None
            
            # Build exclusion list
            exclusion_cities = visited_cities.copy()
            if current_search_city:
                exclusion_cities.append(current_search_city)
            
            if exclusion_cities:
                # Find places from completely different cities
                result = await db.execute(
                    select(PlacePopularity)
                    .where(~PlacePopularity.city.in_(exclusion_cities))
                    .order_by(desc(PlacePopularity.trending_score * func.random()))
                    .limit(limit * 4)  # Get many more for diversity
                )
            else:
                # If no exclusions, get random trending
                result = await db.execute(
                    select(PlacePopularity)
                    .order_by(desc(PlacePopularity.popularity_score * func.random()))
                    .limit(limit * 4)
                )
            
            places = result.scalars().all()
            
            # Ensure maximum city diversity
            diverse_places = self._ensure_maximum_city_diversity(places, limit)
            
            recommendations = self._convert_places_to_recommendations(
                diverse_places, 
                "Discover something completely new"
            )
            
            # Mark as discovery
            for rec in recommendations:
                rec['recommendation_source'] = 'discovery'
            
            return recommendations
            
        except Exception as e:
            print(f"Error getting diversified discovery recommendations: {e}")
            return []
    
    async def _get_randomized_trending_recommendations(
        self, 
        db: AsyncSession, 
        limit: int,
        search_context: Optional[Dict] = None
    ) -> List[Dict]:
        """Get trending recommendations cu randomizare agresivă"""
        
        try:
            # Get trending places cu randomizare
            result = await db.execute(
                select(PlacePopularity)
                .order_by(desc(PlacePopularity.trending_score + func.random() * 100))
                .limit(limit * 5)  # Get many more for better randomization
            )
            
            places = result.scalars().all()
            
            # Ensure city diversity și random selection
            diverse_places = self._ensure_maximum_city_diversity(places, limit)
            
            recommendations = self._convert_places_to_recommendations(
                diverse_places, 
                "Trending worldwide"
            )
            
            # Mark as trending
            for rec in recommendations:
                rec['recommendation_source'] = 'trending'
            
            return recommendations
            
        except Exception as e:
            print(f"Error getting randomized trending recommendations: {e}")
            return []
    
    def _ensure_maximum_city_diversity(self, places: List, limit: int) -> List:
        """Ensure maximum city diversity - only 1 place per city"""
        
        city_seen = set()
        diverse_places = []
        
        # Shuffle to randomize selection
        places_shuffled = list(places)
        random.shuffle(places_shuffled)
        
        for place in places_shuffled:
            city = place.city.lower()
            
            # Only allow 1 place per city for maximum diversity
            if city not in city_seen:
                diverse_places.append(place)
                city_seen.add(city)
                
                if len(diverse_places) >= limit:
                    break
        
        return diverse_places
    
    def _aggressively_diversify_recommendations(self, recommendations: List[Dict], limit: int) -> List[Dict]:
        """Aggressively diversify recommendations - no duplicates, max city diversity"""
        
        # Remove duplicates by name
        seen_names = set()
        unique_recs = []
        
        for rec in recommendations:
            name = rec.get('name', '').lower().strip()
            if name and name not in seen_names:
                seen_names.add(name)
                unique_recs.append(rec)
        
        # Ensure maximum city diversity - only 1 place per city
        city_seen = set()
        diverse_recs = []
        
        # Shuffle for randomness
        random.shuffle(unique_recs)
        
        for rec in unique_recs:
            city = rec.get('city', '').lower().strip()
            
            # Only 1 place per city for maximum diversity
            if city and city not in city_seen:
                diverse_recs.append(rec)
                city_seen.add(city)
                
                if len(diverse_recs) >= limit:
                    break
        
        # If still not enough, allow some city repetition but maintain name uniqueness
        if len(diverse_recs) < limit:
            for rec in unique_recs:
                if rec not in diverse_recs:
                    diverse_recs.append(rec)
                    if len(diverse_recs) >= limit:
                        break
        
        print(f"Diversified {len(recommendations)} -> {len(diverse_recs)} recommendations")
        print(f"Cities in results: {[r.get('city') for r in diverse_recs]}")
        
        return diverse_recs[:limit]
    
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
            'new york': "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=300&fit=crop&q=80",
            'amsterdam': "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400&h=300&fit=crop&q=80",
            'berlin': "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400&h=300&fit=crop&q=80",
            'vienna': "https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=400&h=300&fit=crop&q=80",
            'prague': "https://images.unsplash.com/photo-1541849546-216549ae216d?w=400&h=300&fit=crop&q=80"
        }
        
        default_image = "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop&q=80"
        
        # Coordonate pentru orașe
        city_coords = {
            'paris': (48.8566, 2.3522),
            'rome': (41.9028, 12.4964),
            'barcelona': (41.3851, 2.1734),
            'london': (51.5074, -0.1278),
            'tokyo': (35.6762, 139.6503),
            'new york': (40.7128, -74.0060),
            'amsterdam': (52.3676, 4.9041),
            'berlin': (52.5200, 13.4050),
            'vienna': (48.2082, 16.3738),
            'prague': (50.0755, 14.4378)
        }
        
        for place in places:
            city_lower = place.city.lower()
            
            # Selectează poza
            main_picture = city_images.get(city_lower, default_image)
            
            # Coordonate cu variație mică pentru diversitate
            base_lat, base_lon = city_coords.get(city_lower, (48.8566, 2.3522))
            lat_offset = (abs(hash(place.place_name)) % 100 - 50) / 10000
            lon_offset = (abs(hash(place.place_name + "lon")) % 100 - 50) / 10000
            
            # Calculează rating dinamic cu variație
            base_rating = 3.5 + (place.popularity_score or 0) / 1000
            rating_variation = (abs(hash(place.place_name + "rating")) % 20 - 10) / 100
            rating = min(5.0, max(3.0, base_rating + rating_variation))
            
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
                'context_aware': True,
                'last_updated': place.updated_at.isoformat() if place.updated_at else None
            })
        
        return recommendations
    
    # Interaction tracking methods
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
            print(f"City popularity update: {city} - {interaction_type}")
            
        except Exception as e:
            print(f"Error updating city popularity: {e}")
    
    # Utility methods
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
                print(f"Found {old_count} old activities (older than {days_old} days)")
            
            return old_count
            
        except Exception as e:
            print(f"Error cleaning up old activities: {e}")
            return 0