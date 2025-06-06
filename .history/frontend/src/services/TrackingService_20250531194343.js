// src/services/TrackingService.js - Serviciu pentru tracking în frontend (Updated for ML)

import axios from 'axios';

class TrackingService {
  constructor() {
    this.baseURL = 'http://localhost:8000';
    this.sessionId = this.getOrCreateSessionId();
    this.userId = this.getUserId();
    this.startTime = Date.now();
    
    // Initialize user in ML system if authenticated
    if (this.userId) {
      this.initializeMLTracking();
    }
  }

  // ====== SESSION & USER MANAGEMENT ======

  // Gestionarea session ID
  getOrCreateSessionId() {
    let sessionId = sessionStorage.getItem('tracking_session_id');
    if (!sessionId) {
      sessionId = this.generateUUID();
      sessionStorage.setItem('tracking_session_id', sessionId);
      console.log('🆔 New tracking session:', sessionId);
    }
    return sessionId;
  }

  // Gestionarea user ID (pentru utilizatori autentificați)
  getUserId() {
    const userId = localStorage.getItem('user_id') || sessionStorage.getItem('user_id');
    return userId;
  }

  // Generator UUID simplu
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Calculează timpul petrecut pe pagină
  getTimeSpent() {
    return (Date.now() - this.startTime) / 1000; // în secunde
  }96

  // Initialize ML tracking when user logs in
  async initializeMLTracking() {
    console.log('🤖 Initializing ML tracking for user:', this.userId);
    // This could include sending any cached anonymous activity to the user's profile
  }

  // ====== ML TRACKING METHODS (Updated for your endpoints) ======

  // Tracking pentru căutări (folosește endpoint-ul tău ML)
  async trackSearch(city, activities, time) {
    try {
      const response = await axios.post(`${this.baseURL}/ml/track-search`, {
        city,
        activities,
        time,
        session_id: this.sessionId,
        user_id: this.userId // null pentru utilizatori anonimi
      });

      console.log('🔍 Search tracked with ML system:', {
        city,
        activities,
        user_type: this.userId ? 'authenticated' : 'anonymous'
      });
      
      return response.data;
    } catch (error) {
      console.warn('Failed to track search with ML:', error);
      // Fallback pentru tracking-ul de bază
      return this.trackSearchFallback(city, activities, time);
    }
  }

  // Fallback pentru tracking-ul de căutare
  async trackSearchFallback(city, activities, time) {
    try {
      // Încearcă endpoint-ul clasic dacă ML-ul eșuează
      const response = await axios.post(`${this.baseURL}/submit-preferences-v2`, {
        city,
        activities,
        time,
        session_id: this.sessionId,
        user_id: this.userId
      });

      console.log('🔍 Search tracked via fallback method');
      return response.data;
    } catch (error) {
      console.warn('All search tracking methods failed:', error);
    }
  }

  // Tracking pentru interacțiuni cu locuri (folosește endpoint-ul tău ML)
  async trackPlaceInteraction(
    activityType, 
    placeName, 
    placeId = null, 
    city = null, 
    lat = null, 
    lon = null, 
    clickPosition = null, 
    ratingGiven = null
  ) {
    try {
      const timeSpent = this.getTimeSpent();

      const response = await axios.post(`${this.baseURL}/ml/track-interaction`, {
        interaction_type: activityType,
        place_name: placeName,
        place_id: placeId,
        city,
        lat,
        lon,
        time_spent: timeSpent,
        click_position: clickPosition,
        rating_given: ratingGiven,
        session_id: this.sessionId,
        user_id: this.userId
      });

      console.log(`📍 ${activityType} tracked for ${placeName} (ML):`, {
        user_type: this.userId ? 'authenticated' : 'anonymous',
        session_id: this.sessionId
      });
      
      return response.data;
    } catch (error) {
      console.warn('Failed to track place interaction with ML:', error);
    }
  }

  // ====== HELPER METHODS FOR SPECIFIC ACTIONS ======

  async trackPlaceView(placeName, placeId, city, lat, lon, clickPosition) {
    return this.trackPlaceInteraction(
      'view', placeName, placeId, city, lat, lon, clickPosition
    );
  }

  async trackFavorite(placeName, placeId, city, lat, lon) {
    return this.trackPlaceInteraction(
      'favorite', placeName, placeId, city, lat, lon
    );
  }

  async trackAddToItinerary(placeName, placeId, city, lat, lon) {
    return this.trackPlaceInteraction(
      'add_to_itinerary', placeName, placeId, city, lat, lon
    );
  }

  async trackShare(placeName, placeId, city, lat, lon) {
    return this.trackPlaceInteraction(
      'share', placeName, placeId, city, lat, lon
    );
  }

  async trackRating(placeName, placeId, rating) {
    return this.trackPlaceInteraction(
      'rating', placeName, placeId, null, null, null, null, rating
    );
  }

  // ====== ML RECOMMENDATIONS METHODS ======

  // Obține recomandări ML pentru homepage
  async getMLRecommendations(limit = 8) {
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (this.userId) params.append('user_id', this.userId);
      if (this.sessionId) params.append('session_id', this.sessionId);

      const response = await axios.get(`${this.baseURL}/ml/home-recommendations?${params}`);
      
      console.log('🤖 ML Recommendations loaded:', {
        user_type: this.userId ? 'authenticated' : 'anonymous',
        recommendation_type: response.data.recommendations?.recommendation_type,
        count: response.data.recommendations?.main_recommendations?.length || 0
      });
      
      return response.data;
    } catch (error) {
      console.warn('Failed to load ML recommendations:', error);
      return null;
    }
  }

  // ====== USER PROFILE METHODS ======

  // Obține profilul utilizatorului ML
  async getMLUserProfile(userId = null) {
    const targetUserId = userId || this.userId;
    if (!targetUserId) {
      console.warn('No user ID available for ML profile request');
      return null;
    }

    try {
      const response = await axios.get(`${this.baseURL}/ml/user-profile/${targetUserId}`);
      console.log('👤 ML User profile loaded:', response.data);
      return response.data;
    } catch (error) {
      console.warn('Failed to load ML user profile:', error);
      return null;
    }
  }

  // ====== TRENDING & POPULAR METHODS (Updated for ML endpoints) ======

  // Obține locurile trending prin ML
  async getTrendingPlaces(city = null, limit = 10) {
    try {
      const params = new URLSearchParams();
      if (city) params.append('city', city);
      params.append('limit', limit.toString());

      const response = await axios.get(`${this.baseURL}/ml/trending?${params}`);
      console.log('📈 ML Trending places loaded:', response.data);
      return response.data.trending_places || [];
    } catch (error) {
      console.warn('Failed to load ML trending places:', error);
      return [];
    }
  }

  // Obține locurile populare prin ML
  async getPopularPlaces(city = null, limit = 10) {
    try {
      const params = new URLSearchParams();
      if (city) params.append('city', city);
      params.append('limit', limit.toString());

      const response = await axios.get(`${this.baseURL}/ml/popular?${params}`);
      console.log('⭐ ML Popular places loaded:', response.data);
      return response.data.popular_places || [];
    } catch (error) {
      console.warn('Failed to load ML popular places:', error);
      return [];
    }
  }

  // ====== ENHANCED SEARCH WITH ML ======

  // Căutare enhanced cu tracking ML integrat
  async searchWithMLTracking(city, activities, time) {
    try {
      // Track search first
      await this.trackSearch(city, activities, time);
      
      // Then get enhanced recommendations
      const response = await axios.post(`${this.baseURL}/submit-preferences-v2`, {
        city,
        activities,
        time,
        session_id: this.sessionId,
        user_id: this.userId
      });

      console.log('🔍 Enhanced search completed:', {
        city,
        total_results: response.data.recommendations?.length || 0,
        ml_enhanced: response.data.ml_enhanced,
        sources: response.data.sources
      });

      return response.data;
    } catch (error) {
      console.warn('Enhanced search failed:', error);
      throw error;
    }
  }

  // ====== ANALYTICS & INSIGHTS ======

  // Obține statistici ML
  async getMLStats() {
    try {
      const response = await axios.get(`${this.baseURL}/ml/stats`);
      console.log('📊 ML Stats loaded:', response.data);
      return response.data;
    } catch (error) {
      console.warn('Failed to load ML stats:', error);
      return null;
    }
  }

  // Test ML system health
  async testMLSystem() {
    try {
      const response = await axios.get(`${this.baseURL}/ml/test`);
      console.log('🧪 ML System test:', response.data);
      return response.data;
    } catch (error) {
      console.warn('ML System test failed:', error);
      return null;
    }
  }

  // ====== UTILITY METHODS ======

  // Resetează timer-ul pentru timpul petrecut
  resetTimer() {
    this.startTime = Date.now();
  }

  // Actualizează user ID când utilizatorul se autentifică
  setUserId(userId) {
    const oldUserId = this.userId;
    this.userId = userId;
    
    if (userId) {
      localStorage.setItem('user_id', userId);
      console.log('👤 User authenticated:', userId);
      
      // Initialize ML tracking for new user
      if (!oldUserId) {
        this.initializeMLTracking();
      }
    }
  }

  // Curăță datele de tracking (logout)
  clearTrackingData() {
    console.log('🚪 Clearing tracking data');
    sessionStorage.removeItem('tracking_session_id');
    localStorage.removeItem('user_id');
    this.sessionId = this.getOrCreateSessionId();
    this.userId = null;
  }

  // Tracking pentru evenimente de pagină
  trackPageView(pageName) {
    console.log(`📄 Page view tracked: ${pageName}`);
    this.resetTimer();
  }

  // Tracking pentru timp petrecut pe pagină la plecare
  trackPageExit(pageName) {
    const timeSpent = this.getTimeSpent();
    console.log(`⏱️ Time spent on ${pageName}: ${timeSpent.toFixed(2)}s`);
    // Poți trimite aceste date către backend pentru analiza ML
  }

  // ====== DEBUG & DEVELOPMENT ======

  // Debug info pentru dezvoltare
  getDebugInfo() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      userType: this.userId ? 'authenticated' : 'anonymous',
      timeSpent: this.getTimeSpent(),
      baseURL: this.baseURL
    };
  }

  // Log current tracking state
  logTrackingState() {
    console.log('🔍 Current Tracking State:', this.getDebugInfo());
  }
}

// Exportă o instanță singleton
const trackingService = new TrackingService();

// Debug în development
if (process.env.NODE_ENV === 'development') {
  window.trackingService = trackingService; // Pentru debug în console
}

export default trackingService;