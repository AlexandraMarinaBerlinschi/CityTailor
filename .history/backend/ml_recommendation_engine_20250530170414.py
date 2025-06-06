# ml_recommendation_engine.py - Motorul de recomandări ML

import numpy as np
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, and_
from models import UserActivity, UserProfile, PlacePopularity, UserSimilarity, User
from typing import List, Dict, Optional, Tuple
import json
from datetime import datetime, timedelta
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler
import asyncio
import logging

logger = logging.getLogger(__name__)

class MLRecommendationEngine:
    """Motor de recomandări ML care combină multiple algoritmi"""
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.tfidf_vectorizer = TfidfVectorizer(max_features=100, stop_words='english')
        
    # ====== CONTENT-BASED FILTERING ======
    
    async def get_user_preference_vector(self, db: AsyncSession, user_id: str) -> np.ndarray:
        """Obține vectorul de preferințe al utilizatorului"""
        
        # Încearcă să obțină profilul existent
        from tracking_service import UserTrackingService
        profile = await UserTrackingService.get_user_profile(db, user_id)
        
        if profile:
            return np.array([
                profile.cultural_preference,
                profile.outdoor_preference,
                profile.relaxation_preference,
                profile.gastronomy_preference,
                profile.short_duration_preference,
                profile.medium_duration_preference,
                profile.long_duration_preference,
                profile.min_rating_preference / 5.0,  # Normalizează rating-ul la 0-1
                1.0 - (profile.max_price_preference / 100.0)  # Preferința pentru prețuri mici
            ])
        else:
            # Vector default pentru utilizatori noi
            return np.array([0.5, 0.5, 0.5, 0.5, 0.33, 0.33, 0.33, 0.6, 0.5])
    
    async def get_place_feature_vector(self, place: Dict) -> np.ndarray:
        """Convertește un loc în vector de caracteristici"""
        
        # Caracteristici categorice (detectate din nume și descriere)
        name = place.get('name', '').lower()
        description = place.get('description', '').lower()
        combined_text = f"{name} {description}"
        
        # Detectează categoria principală
        cultural_score = self._calculate_category_score(combined_text, [
            'museum', 'gallery', 'art', 'history', 'monument', 'cathedral', 'church', 'palace', 'castle'
        ])
        
        outdoor_score = self._calculate_category_score(combined_text, [
            'park', 'garden', 'outdoor', 'nature', 'mountain', 'lake', 'beach', 'hiking', 'bike', 'walk'
        ])
        
        relaxation_score = self._calculate_category_score(combined_text, [
            'spa', 'wellness', 'relax', 'massage', 'thermal', 'peaceful', 'quiet', 'meditation'
        ])
        
        gastronomy_score = self._calculate_category_score(combined_text, [
            'restaurant', 'food', 'dining', 'cafe', 'wine', 'tasting', 'culinary', 'cooking', 'market'
        ])
        
        # Caracteristici de durată (din minimumDuration)
        duration = place.get('minimumDuration', '').lower()
        short_duration = 1.0 if any(word in duration for word in ['30 min', '1 hour', 'quick']) else 0.0
        medium_duration = 1.0 if any(word in duration for word in ['2 hour', '3 hour', 'half day']) else 0.0
        long_duration = 1.0 if any(word in duration for word in ['full day', 'day', '6 hour', '8 hour']) else 0.0
        
        # Dacă nu se detectează durata, presupune medium
        if short_duration == 0 and medium_duration == 0 and long_duration == 0:
            medium_duration = 1.0
        
        # Rating normalizat (0-1)
        rating = place.get('rating', 3.0)
        rating_score = float(rating) / 5.0 if rating else 0.6
        
        # Scor pentru prețuri mici (estimat pe baza tipului de loc)
        price_score = self._estimate_price_score(combined_text)
        
        return np.array([
            cultural_score,
            outdoor_score,
            relaxation_score,
            gastronomy_score,
            short_duration,
            medium_duration,
            long_duration,
            rating_score,
            price_score
        ])
    
    def _calculate_category_score(self, text: str, keywords: List[str]) -> float:
        """Calculează scorul pentru o categorie pe baza keyword-urilor"""
        matches = sum(1 for keyword in keywords if keyword in text)
        return min(1.0, matches / 3.0)  # Normalizează la maxim 1.0
    
    def _estimate_price_score(self, text: str) -> float:
        """Estimează scorul pentru prețuri mici pe baza tipului de loc"""
        expensive_keywords = ['luxury', 'premium', 'fine dining', 'exclusive', 'spa', 'resort']
        cheap_keywords = ['free', 'park', 'walk', 'view', 'street', 'market', 'public']
        
        expensive_score = sum(1 for keyword in expensive_keywords if keyword in text)
        cheap_score = sum(1 for keyword in cheap_keywords if keyword in text)
        
        if expensive_score > cheap_score:
            return 0.3  # Scor mic pentru locuri scumpe
        elif cheap_score > expensive_score:
            return 0.9  # Scor mare pentru locuri ieftine
        else:
            return 0.6  # Scor mediu
    
    async def content_based_recommendations(
        self, 
        db: AsyncSession, 
        user_id: str, 
        available_places: List[Dict],
        limit: int = 10
    ) -> List[Dict]:
        """Generează recomandări bazate pe conținut"""
        
        user_vector = await self.get_user_preference_vector(db, user_id)
        
        # Calculează similaritatea pentru fiecare loc
        scored_places = []
        
        for place in available_places:
            place_vector = await self.get_place_feature_vector(place)
            
            # Calculează similaritatea cosinus
            similarity = np.dot(user_vector, place_vector) / (
                np.linalg.norm(user_vector) * np.linalg.norm(place_vector)
            )
            
            scored_places.append({
                **place,
                'content_score': float(similarity),
                'recommendation_reason': self._generate_content_reason(user_vector, place_vector)
            })
        
        # Sortează după scor și returnează top rezultate
        scored_places.sort(key=lambda x: x['content_score'], reverse=True)
        return scored_places[:limit]
    
    def _generate_content_reason(self, user_vector: np.ndarray, place_vector: np.ndarray) -> str:
        """Generează explicația pentru recomandare"""
        categories = ['cultural', 'outdoor', 'relaxation', 'gastronomy']
        
        # Găsește categoria cu cel mai mare scor pentru loc
        place_categories = place_vector[:4]
        max_category_idx = np.argmax(place_categories)
        
        # Verifică dacă utilizatorul are preferință pentru această categorie
        user_preference = user_vector[max_category_idx]
        
        if user_preference > 0.6:
            return f"Matches your {categories[max_category_idx]} interests"
        elif place_vector[7] > 0.8:  # Rating înalt
            return "Highly rated by other visitors"
        else:
            return "Popular choice in this area"
    
    # ====== COLLABORATIVE FILTERING ======
    
    async def collaborative_filtering_recommendations(
        self,
        db: AsyncSession,
        user_id: str,
        available_places: List[Dict],
        limit: int = 10
    ) -> List[Dict]:
        """Generează recomandări bazate pe utilizatori similari"""
        
        # Găsește utilizatori similari
        similar_users = await self._find_similar_users(db, user_id, limit=20)
        
        if not similar_users:
            # Fallback la popularitate dacă nu există utilizatori similari
            return await self.popularity_based_recommendations(db, available_places, limit)
        
        # Obține preferințele utilizatorilor similari
        place_scores = {}
        
        for similar_user_id, similarity_score in similar_users:
            # Obține activitățile utilizatorului similar
            activities = await self._get_user_positive_activities(db, similar_user_id)
            
            for activity in activities:
                place_name = activity.place_name
                if place_name not in place_scores:
                    place_scores[place_name] = 0
                
                # Scor bazat pe tipul activității și similaritatea utilizatorului
                activity_weight = {
                    'favorite': 3.0,
                    'add_to_itinerary': 2.5,
                    'share': 2.0,
                    'view': 1.0
                }.get(activity.activity_type, 1.0)
                
                place_scores[place_name] += similarity_score * activity_weight
        
        # Mapează scorurile la locurile disponibile
        scored_places = []
        for place in available_places:
            place_name = place.get('name', '')
            collaborative_score = place_scores.get(place_name, 0)
            
            scored_places.append({
                **place,
                'collaborative_score': collaborative_score,
                'recommendation_reason': 'Recommended by users with similar tastes'
            })
        
        # Sortează și returnează
        scored_places.sort(key=lambda x: x['collaborative_score'], reverse=True)
        return scored_places[:limit]
    
    async def _find_similar_users(self, db: AsyncSession, user_id: str, limit: int = 20) -> List[Tuple[str, float]]:
        """Găsește utilizatori cu preferințe similare"""
        
        # Obține activitățile utilizatorului curent
        current_user_activities = await self._get_user_activity_features(db, user_id)
        
        if not current_user_activities:
            return []
        
        # Obține toți utilizatorii activi din ultima lună
        month_ago = datetime.utcnow() - timedelta(days=30)
        
        result = await db.execute(
            select(UserActivity.user_id)
            .where(UserActivity.user_id.isnot(None))
            .where(UserActivity.user_id != user_id)
            .where(UserActivity.created_at >= month_ago)
            .distinct()
        )
        
        other_users = [str(row[0]) for row in result]
        
        # Calculează similaritatea cu fiecare utilizator
        similarities = []
        
        for other_user_id in other_users:
            other_user_activities = await self._get_user_activity_features(db, other_user_id)
            
            if other_user_activities:
                similarity = self._calculate_user_similarity(current_user_activities, other_user_activities)
                if similarity > 0.1:  # Threshold pentru similaritate
                    similarities.append((other_user_id, similarity))
        
        # Sortează după similaritate
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:limit]
    
    async def _get_user_activity_features(self, db: AsyncSession, user_id: str) -> Dict:
        """Obține caracteristicile activității unui utilizator"""
        
        result = await db.execute(
            select(UserActivity)
            .where(UserActivity.user_id == user_id)
            .where(UserActivity.created_at >= datetime.utcnow() - timedelta(days=60))
        )
        
        activities = result.scalars().all()
        
        if not activities:
            return {}
        
        features = {
            'categories': {'Cultural': 0, 'Outdoor': 0, 'Relaxation': 0, 'Gastronomy': 0},
            'durations': {'<2h': 0, '2-4h': 0, '>4h': 0},
            'cities': {},
            'activity_types': {'search': 0, 'view': 0, 'favorite': 0, 'add_to_itinerary': 0}
        }
        
        for activity in activities:
            # Procesează categoriile din căutări
            if activity.search_activities:
                if isinstance(activity.search_activities, str):
                    search_activities = json.loads(activity.search_activities)
                else:
                    search_activities = activity.search_activities
                
                for cat in search_activities:
                    if cat in features['categories']:
                        features['categories'][cat] += 1
            
            # Procesează duratele
            if activity.search_time and activity.search_time in features['durations']:
                features['durations'][activity.search_time] += 1
            
            # Procesează orașele
            if activity.city:
                features['cities'][activity.city] = features['cities'].get(activity.city, 0) + 1
            
            # Procesează tipurile de activități
            if activity.activity_type in features['activity_types']:
                features['activity_types'][activity.activity_type] += 1
        
        return features
    
    def _calculate_user_similarity(self, features1: Dict, features2: Dict) -> float:
        """Calculează similaritatea între doi utilizatori"""
        
        # Similaritatea pentru categorii
        cat1 = np.array(list(features1['categories'].values()))
        cat2 = np.array(list(features2['categories'].values()))
        
        if np.sum(cat1) == 0 or np.sum(cat2) == 0:
            cat_similarity = 0
        else:
            cat1_norm = cat1 / np.sum(cat1)
            cat2_norm = cat2 / np.sum(cat2)
            cat_similarity = np.dot(cat1_norm, cat2_norm)
        
        # Similaritatea pentru orașe comune
        cities1 = set(features1['cities'].keys())
        cities2 = set(features2['cities'].keys())
        
        if len(cities1) == 0 or len(cities2) == 0:
            city_similarity = 0
        else:
            common_cities = cities1.intersection(cities2)
            city_similarity = len(common_cities) / len(cities1.union(cities2))
        
        # Combinația finală
        return 0.7 * cat_similarity + 0.3 * city_similarity
    
    async def _get_user_positive_activities(self, db: AsyncSession, user_id: str) -> List[UserActivity]:
        """Obține activitățile pozitive ale unui utilizator"""
        
        result = await db.execute(
            select(UserActivity)
            .where(UserActivity.user_id == user_id)
            .where(UserActivity.activity_type.in_(['favorite', 'add_to_itinerary', 'share']))
            .where(UserActivity.created_at >= datetime.utcnow() - timedelta(days=60))
        )
        
        return result.scalars().all()
    
    # ====== POPULARITY-BASED RECOMMENDATIONS ======
    
    async def popularity_based_recommendations(
        self,
        db: AsyncSession,
        available_places: List[Dict],
        limit: int = 10,
        boost_trending: bool = True
    ) -> List[Dict]:
        """Generează recomandări bazate pe popularitate"""
        
        # Obține datele de popularitate din baza de date
        result = await db.execute(
            select(PlacePopularity).order_by(desc(PlacePopularity.popularity_score))
        )
        
        popularity_data = {p.place_name: p for p in result.scalars().all()}
        
        scored_places = []
        
        for place in available_places:
            place_name = place.get('name', '')
            popularity_info = popularity_data.get(place_name)
            
            if popularity_info:
                popularity_score = popularity_info.popularity_score
                trending_boost = popularity_info.trending_score * 0.1 if boost_trending else 0
                final_score = popularity_score + trending_boost
            else:
                # Scor default pentru locuri noi
                final_score = 1.0
            
            scored_places.append({
                **place,
                'popularity_score': final_score,
                'recommendation_reason': 'Popular among travelers'
            })
        
        scored_places.sort(key=lambda x: x['popularity_score'], reverse=True)
        return scored_places[:limit]
    
    # ====== HYBRID RECOMMENDATIONS ======
    
    async def generate_hybrid_recommendations(
        self,
        db: AsyncSession,
        user_id: str,
        available_places: List[Dict],
        limit: int = 10
    ) -> List[Dict]:
        """Generează recomandări hibride combinând multiple algoritmi"""
        
        # Obține recomandări de la fiecare algoritm
        content_recs = await self.content_based_recommendations(db, user_id, available_places, limit * 2)
        collaborative_recs = await self.collaborative_filtering_recommendations(db, user_id, available_places, limit * 2)
        popularity_recs = await self.popularity_based_recommendations(db, available_places, limit * 2)
        
        # Combinarea scorurilor cu ponderi
        place_scores = {}
        
        for place in content_recs:
            name = place['name']
            place_scores[name] = {
                'place': place,
                'content_score': place.get('content_score', 0),
                'collaborative_score': 0,
                'popularity_score': 0,
                'reasons': [place.get('recommendation_reason', '')]
            }
        
        # Adaugă scorurile collaborative
        for place in collaborative_recs:
            name = place['name']
            if name in place_scores:
                place_scores[name]['collaborative_score'] = place.get('collaborative_score', 0)
                place_scores[name]['reasons'].append(place.get('recommendation_reason', ''))
            else:
                place_scores[name] = {
                    'place': place,
                    'content_score': 0,
                    'collaborative_score': place.get('collaborative_score', 0),
                    'popularity_score': 0,
                    'reasons': [place.get('recommendation_reason', '')]
                }
        
        # Adaugă scorurile de popularitate
        for place in popularity_recs:
            name = place['name']
            if name in place_scores:
                place_scores[name]['popularity_score'] = place.get('popularity_score', 0)
            else:
                place_scores[name] = {
                    'place': place,
                    'content_score': 0,
                    'collaborative_score': 0,
                    'popularity_score': place.get('popularity_score', 0),
                    'reasons': [place.get('recommendation_reason', '')]
                }
        
        # Calculează scorul final cu ponderi
        final_recommendations = []
        
        for name, scores in place_scores.items():
            # Ponderi pentru fiecare tip de recomandare
            content_weight = 0.5
            collaborative_weight = 0.3
            popularity_weight = 0.2
            
            final_score = (
                scores['content_score'] * content_weight +
                scores['collaborative_score'] * collaborative_weight +
                scores['popularity_score'] * popularity_weight * 0.01  # Normalizare pentru popularitate
            )
            
            place_data = scores['place'].copy()
            place_data.update({
                'recommendation_score': final_score,
                'recommendation_reasons': list(set(scores['reasons'])),  # Remove duplicates
                'algorithm_scores': {
                    'content': scores['content_score'],
                    'collaborative': scores['collaborative_score'],
                    'popularity': scores['popularity_score']
                }
            })
            
            final_recommendations.append(place_data)
        
        # Sortează după scorul final
        final_recommendations.sort(key=lambda x: x['recommendation_score'], reverse=True)
        
        return final_recommendations[:limit]