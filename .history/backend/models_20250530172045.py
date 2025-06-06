# models.py - Actualizat pentru tabelele ML din Supabase

from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid

# ===== MODELE EXISTENTE =====

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    username = Column(String, nullable=False)
    role = Column(String, default="user")


class Preference(Base):
    __tablename__ = "preferences"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    activities = Column(String)
    time = Column(String)
    destination = Column(String)


class Itinerary(Base):
    __tablename__ = "itineraries"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    city = Column(String)
    name = Column(String, default="Untitled itinerary")
    activities = Column(JSON)


class ItineraryActivity(Base):
    __tablename__ = "itinerary_activities"

    id = Column(Integer, primary_key=True, index=True)
    itinerary_id = Column(Integer, ForeignKey("itineraries.id", ondelete="CASCADE"))
    activity_id = Column(String)
    name = Column(String)
    lat = Column(Float)
    lon = Column(Float)
    rating = Column(Float, nullable=True)
    duration = Column(String, nullable=True)
    picture_url = Column(String, nullable=True)
    position = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ===== MODELE NOI PENTRU ML =====

class UserActivity(Base):
    """Tracking-ul activității utilizatorului pentru învățarea ML"""
    __tablename__ = "user_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    session_id = Column(String(255))
    activity_type = Column(String(50), nullable=False)  # 'search', 'view', 'favorite', 'add_to_itinerary', 'share'
    
    # Detalii despre locație
    place_name = Column(String(255))
    place_id = Column(String(255))
    city = Column(String(255))
    lat = Column(Float)
    lon = Column(Float)
    
    # Preferințe din căutare (JSON)
    search_activities = Column(JSON)
    search_time = Column(String(50))
    
    # Metrici de engagement
    time_spent = Column(Float)        # secunde
    rating_given = Column(Float)
    click_position = Column(Integer)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_agent = Column(Text)
    ip_address = Column(String(45))  # Pentru IPv6
    
    # Relationships
    user = relationship("User", backref="activities")


class UserProfile(Base):
    """Profilul utilizatorului generat din ML (preferințele învățate)"""
    __tablename__ = "user_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    
    # Preferințe învățate pentru activități (0-1)
    cultural_preference = Column(Float, default=0.5)
    outdoor_preference = Column(Float, default=0.5)
    relaxation_preference = Column(Float, default=0.5)
    gastronomy_preference = Column(Float, default=0.5)
    
    # Preferințe de timp (0-1)
    short_duration_preference = Column(Float, default=0.33)   # <2h
    medium_duration_preference = Column(Float, default=0.33)  # 2-4h
    long_duration_preference = Column(Float, default=0.33)    # >4h
    
    # Preferințe de calitate
    min_rating_preference = Column(Float, default=3.0)
    max_price_preference = Column(Float, default=50.0)
    
    # Orașe preferate (JSON)
    favorite_cities = Column(JSON, default={})
    
    # Statistici comportamentale
    total_searches = Column(Integer, default=0)
    total_favorites = Column(Integer, default=0)
    total_itineraries = Column(Integer, default=0)
    avg_time_per_session = Column(Float, default=0.0)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_activity = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", backref="ml_profile")


class RecommendationCache(Base):
    """Cache pentru recomandările generate"""
    __tablename__ = "recommendation_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    
    # Tipul recomandării
    recommendation_type = Column(String(50))  # 'home_page', 'similar_places', 'trending'
    
    # Recomandările (JSON)
    recommendations = Column(JSON)
    
    # Context pentru recomandare
    context_data = Column(JSON)
    
    # Scorul de relevanță
    relevance_score = Column(Float)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    
    # Relationships
    user = relationship("User", backref="recommendation_cache")


class RecommendationFeedback(Base):
    """Feedback pe recomandările generate pentru îmbunătățirea modelului"""
    __tablename__ = "recommendation_feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    recommendation_id = Column(Integer, ForeignKey("recommendation_cache.id", ondelete="CASCADE"))
    
    place_name = Column(String(255))
    place_id = Column(String(255))
    
    # Tipul de feedback
    feedback_type = Column(String(50))  # 'click', 'favorite', 'ignore', 'dislike', 'share'
    
    # Metrici pentru învățare
    position_in_list = Column(Integer)
    time_to_action = Column(Float)  # secunde
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", backref="recommendation_feedback")
    recommendation = relationship("RecommendationCache", backref="feedback")


class PlacePopularity(Base):
    """Popularitatea globală a locurilor pentru recomandări trending"""
    __tablename__ = "place_popularity"
    
    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(String(255), unique=True, index=True)
    place_name = Column(String(255))
    city = Column(String(255))
    
    # Metrici de popularitate
    total_views = Column(Integer, default=0)
    total_favorites = Column(Integer, default=0)
    total_itinerary_adds = Column(Integer, default=0)
    total_shares = Column(Integer, default=0)
    
    # Scoruri calculate
    popularity_score = Column(Float, default=0.0)
    trending_score = Column(Float, default=0.0)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class UserSimilarity(Base):
    """Similaritatea între utilizatori pentru collaborative filtering"""
    __tablename__ = "user_similarities"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id_1 = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    user_id_2 = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    
    # Scorul de similaritate (0-1)
    similarity_score = Column(Float)
    
    # Tipul algoritmului folosit
    algorithm_type = Column(String(50), default='cosine')
    
    # Metadata
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user1 = relationship("User", foreign_keys=[user_id_1], backref="similarities_as_user1")
    user2 = relationship("User", foreign_keys=[user_id_2], backref="similarities_as_user2")