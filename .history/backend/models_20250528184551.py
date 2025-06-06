from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True)
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


# ====== MODELE NOI PENTRU SISTEMUL DE RECOMANDARE ML ======

class UserActivity(Base):
    """Tracking-ul activității utilizatorului pentru învățarea ML"""
    __tablename__ = "user_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    session_id = Column(String, index=True)  # Pentru utilizatori anonimi
    activity_type = Column(String, index=True)  # 'search', 'view', 'favorite', 'add_to_itinerary', 'share'
    
    # Detalii despre locație
    place_name = Column(String)
    place_id = Column(String)
    city = Column(String)
    lat = Column(Float)
    lon = Column(Float)
    
    # Preferințe din căutare
    search_activities = Column(JSON)  # Lista cu activitățile selectate
    search_time = Column(String)      # Timpul disponibil selectat
    
    # Metrici de engagement
    time_spent = Column(Float)        # Timpul petrecut pe pagină (secunde)
    rating_given = Column(Float)      # Dacă utilizatorul a dat rating
    click_position = Column(Integer)  # Poziția în listă când a dat click
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_agent = Column(String)
    ip_address = Column(String)


class UserProfile(Base):
    """Profilul utilizatorului generat din ML (preferințele învățate)"""
    __tablename__ = "user_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    
    # Preferințe învățate pentru activități (scoruri 0-1)
    cultural_preference = Column(Float, default=0.5)
    outdoor_preference = Column(Float, default=0.5)
    relaxation_preference = Column(Float, default=0.5)
    gastronomy_preference = Column(Float, default=0.5)
    
    # Preferințe de timp (scoruri 0-1)
    short_duration_preference = Column(Float, default=0.33)  # <2h
    medium_duration_preference = Column(Float, default=0.33) # 2-4h
    long_duration_preference = Column(Float, default=0.33)   # >4h
    
    # Preferințe de calitate
    min_rating_preference = Column(Float, default=3.0)
    max_price_preference = Column(Float, default=50.0)
    
    # Orașe preferate (JSON cu orașele și scorurile)
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
    
    # Relationship
    user = relationship("User", backref="profile")


class RecommendationCache(Base):
    """Cache pentru recomandările generate"""
    __tablename__ = "recommendation_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    
    # Tipul recomandării
    recommendation_type = Column(String, index=True)  # 'home_page', 'similar_places', 'trending'
    
    # Recomandările (JSON cu lista de recomandări)
    recommendations = Column(JSON)
    
    # Context pentru recomandare
    context_data = Column(JSON)  # Datele folosite pentru generarea recomandării
    
    # Scorul de relevanță
    relevance_score = Column(Float)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)


class RecommendationFeedback(Base):
    """Feedback pe recomandările generate pentru îmbunătățirea modelului"""
    __tablename__ = "recommendation_feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    recommendation_id = Column(Integer, ForeignKey("recommendation_cache.id", ondelete="CASCADE"))
    
    place_name = Column(String)
    place_id = Column(String)
    
    # Tipul de feedback
    feedback_type = Column(String, index=True)  # 'click', 'favorite', 'ignore', 'dislike', 'share'
    
    # Metrici pentru învățare
    position_in_list = Column(Integer)  # Poziția recomandării în listă
    time_to_action = Column(Float)      # Timpul până la acțiune (secunde)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    recommendation = relationship("RecommendationCache", backref="feedback")


class PlacePopularity(Base):
    """Popularitatea globală a locurilor pentru recomandări trending"""
    __tablename__ = "place_popularity"
    
    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(String, unique=True, index=True)
    place_name = Column(String)
    city = Column(String)
    
    # Metrici de popularitate
    total_views = Column(Integer, default=0)
    total_favorites = Column(Integer, default=0)
    total_itinerary_adds = Column(Integer, default=0)
    total_shares = Column(Integer, default=0)
    
    # Scor de popularitate calculat
    popularity_score = Column(Float, default=0.0)
    
    # Trending score (bazat pe popularitatea recentă)
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
    algorithm_type = Column(String)  # 'cosine', 'pearson', 'jaccard'
    
    # Metadata
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Constraints
    __table_args__ = (
        # Asigură unicitatea perechii de utilizatori
        {'extend_existing': True}
    )