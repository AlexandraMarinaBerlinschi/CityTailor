// src/services/TrackingService.js - Fixed for proper user isolation

import axios from 'axios';

class TrackingService {
  constructor() {
    this.baseURL = 'http://localhost:8000';
    this.sessionId = this.getOrCreateSessionId();
    this.userId = this.getUserId();
    this.startTime = Date.now();
    
    // Initialize user in ML system if authenticated
    if (this.userId && this.userId !== 'anonymous') {
      this.initializeMLTracking();
    }
  }

  // ====== SESSION & USER MANAGEMENT (FIXED) ======

  // Fixed: Proper user ID detection with currentUser integration
  getUserId() {
    // First check currentUser from localStorage (your auth system)
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      try {
        const user = JSON.parse(currentUser);
        if (user && (user.id || user.email)) {
          return user.id || user.email;
        }
      } catch (e) {
        console.warn('Failed to parse currentUser:', e);
      }
    }

    // Then check direct user_id storage
    const directUserId = localStorage.getItem('user_id') || sessionStorage.getItem('user_id');
    if (directUserId && directUserId !== 'null' && directUserId !== 'undefined') {
      return directUserId;
    }

    // Return null for anonymous users (not 'anonymous' string)
    return null;
  }

  // Fixed: User-specific session management
  getOrCreateSessionId() {
    const userId = this.getUserId();
    const sessionKey = userId ? `tracking_session_${userId}` : 'tracking_session_anonymous';
    
    let sessionId = sessionStorage.getItem(sessionKey);
    if (!sessionId) {
      sessionId = this.generateUUID();
      sessionStorage.setItem(sessionKey, sessionId);
      console.log('🆔 New tracking session:', {
        sessionId: sessionId.substring(0, 8) + '...',
        userType: userId ? 'authenticated' : 'anonymous',
        userId: userId ? userId.substring(0, 8) + '...' : 'none'
      });
    }
    return sessionId;
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
  }

  // Fixed: Proper ML initialization check
  async initializeMLTracking() {
    if (!this.userId) {
      console.log('🤖 ML tracking: Anonymous user - limited tracking');
      return;
    }
    
    console.log('🤖 Initializing ML tracking for user:', this.userId.substring(0, 8) + '...');
    
    try {
      // Clear any previous anonymous data for this session
      await this.clearAnonymousMLData();
      
      // Initialize user profile if needed
      await this.initializeUserProfile();
    } catch (error) {
      console.warn('Failed to initialize ML tracking:', error);
    }
  }

  // New: Clear anonymous ML data when user logs in
  async clearAnonymousMLData() {
    try {
      await axios.post(`${this.baseURL}/ml/clear-anonymous-data`, {
        session_id: this.sessionId
      });
      console.log('🧹 Cleared anonymous ML data');
    } catch (error) {
      console.warn('Failed to clear anonymous ML data:', error);
    }
  }

  // New: Initialize user profile in ML system
  async initializeUserProfile() {
    try {
      await axios.post(`${this.baseURL}/ml/initialize-user`, {
        user_id: this.userId,
        session_id: this.sessionId
      });
      console.log('👤 Initialized ML user profile');
    } catch (error) {
      console.warn('Failed to initialize ML user profile:', error);
    }
  }

  // ====== ML TRACKING METHODS (FIXED) ======

  // Fixed: Proper user isolation in search tracking
  async trackSearch(city, activities, time) {
    try {
      const trackingData = {
        city,
        activities,
        time,
        session_id: this.sessionId,
        user_id: this.userId, // Can be null for anonymous
        timestamp: Date.now(),
        user_type: this.userId ? 'authenticated' : 'anonymous'
      };

      const response = await axios.post(`${this.baseURL}/ml/track-search`, trackingData);

      console.log('🔍 Search tracked with ML system:', {
        city,
        activities,
        user_type: this.userId ? 'authenticated' : 'anonymous',
        user_id: this.userId ? this.userId.substring(0, 8) + '...' : 'anonymous'
      });
      
      return response.data;
    } catch (error) {
      console.warn('Failed to track search with ML:', error);
      return this.trackSearchFallback(city, activities, time);
    }
  }

  // Fixed: Proper user isolation in place interactions
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

      const interactionData = {
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
        user_id: this.userId, // Can be null for anonymous
        timestamp: Date.now(),
        user_type: this.userId ? 'authenticated' : 'anonymous'
      };

      const response = await axios.post(`${this.baseURL}/ml/track-interaction`, interactionData);

      console.log(`📍 ${activityType} tracked for ${placeName} (ML):`, {
        user_type: this.userId ? 'authenticated' : 'anonymous',
        user_id: this.userId ? this.userId.substring(0, 8) + '...' : 'anonymous',
        session_id: this.sessionId.substring(0, 8) + '...'
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

  // ====== ML RECOMMENDATIONS METHODS (FIXED) ======

  // Fixed: Proper user context in recommendations
  async getMLRecommendations(limit = 8) {
    try {
      const params = new URLSearchParams({ 
        limit: limit.toString(),
        timestamp: Date.now().toString()
      });
      
      if (this.userId) {
        params.append('user_id', this.userId);
      }
      if (this.sessionId) {
        params.append('session_id', this.sessionId);
      }

      const response = await axios.get(`${this.baseURL}/ml/home-recommendations?${params}`);
      
      console.log('🤖 ML Recommendations loaded:', {
        user_type: this.userId ? 'authenticated' : 'anonymous',
        user_id: this.userId ? this.userId.substring(0, 8) + '...' : 'anonymous',
        recommendation_type: response.data.recommendations?.recommendation_type,
        count: response.data.recommendations?.main_recommendations?.length || 0
      });
      
      return response.data;
    } catch (error) {
      console.warn('Failed to load ML recommendations:', error);
      return null;
    }
  }

  // ====== USER PROFILE METHODS (FIXED) ======

  // Fixed: Proper user profile isolation
  async getMLUserProfile(userId = null) {
    const targetUserId = userId || this.userId;
    if (!targetUserId) {
      console.warn('No user ID available for ML profile request');
      return null;
    }

    try {
      const response = await axios.get(`${this.baseURL}/ml/user-profile/${targetUserId}?t=${Date.now()}`);
      console.log('👤 ML User profile loaded:', {
        user_id: targetUserId.substring(0, 8) + '...',
        has_profile: !!response.data.profile
      });
      return response.data;
    } catch (error) {
      console.warn('Failed to load ML user profile:', error);
      return null;
    }
  }

  // ====== TRENDING & POPULAR METHODS (FIXED) ======

  // Fixed: User-specific trending with cache busting
  async getTrendingPlaces(city = null, limit = 10) {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        timestamp: Date.now().toString()
      });
      
      if (city) params.append('city', city);
      if (this.userId) params.append('user_id', this.userId);

      const response = await axios.get(`${this.baseURL}/ml/trending?${params}`);
      console.log('📈 ML Trending places loaded:', {
        city: city || 'all',
        count: response.data.trending_places?.length || 0,
        user_context: this.userId ? 'personalized' : 'general'
      });
      return response.data.trending_places || [];
    } catch (error) {
      console.warn('Failed to load ML trending places:', error);
      return [];
    }
  }

  // Fixed: User-specific popular places
  async getPopularPlaces(city = null, limit = 10) {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        timestamp: Date.now().toString()
      });
      
      if (city) params.append('city', city);
      if (this.userId) params.append('user_id', this.userId);

      const response = await axios.get(`${this.baseURL}/ml/popular?${params}`);
      console.log('⭐ ML Popular places loaded:', {
        city: city || 'all',
        count: response.data.popular_places?.length || 0,
        user_context: this.userId ? 'personalized' : 'general'
      });
      return response.data.popular_places || [];
    } catch (error) {
      console.warn('Failed to load ML popular places:', error);
      return [];
    }
  }

  // ====== ENHANCED SEARCH WITH ML (FIXED) ======

  // Fixed: Proper search isolation
  async searchWithMLTracking(city, activities, time) {
    try {
      // Track search first
      await this.trackSearch(city, activities, time);
      
      // Then get enhanced recommendations
      const searchData = {
        city,
        activities,
        time,
        session_id: this.sessionId,
        user_id: this.userId,
        timestamp: Date.now(),
        user_type: this.userId ? 'authenticated' : 'anonymous'
      };

      const response = await axios.post(`${this.baseURL}/submit-preferences-v2`, searchData);

      console.log('🔍 Enhanced search completed:', {
        city,
        user_type: this.userId ? 'authenticated' : 'anonymous',
        user_id: this.userId ? this.userId.substring(0, 8) + '...' : 'anonymous',
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

  // ====== ANALYTICS & INSIGHTS (FIXED) ======

  // Fixed: User-specific stats
  async getMLStats() {
    try {
      const params = new URLSearchParams({
        timestamp: Date.now().toString()
      });
      
      if (this.userId) {
        params.append('user_id', this.userId);
      }

      const response = await axios.get(`${this.baseURL}/ml/stats?${params}`);
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
      const response = await axios.get(`${this.baseURL}/ml/test?t=${Date.now()}`);
      console.log('🧪 ML System test:', response.data);
      return response.data;
    } catch (error) {
      console.warn('ML System test failed:', error);
      return { status: 'error', message: error.message };
    }
  }

  // ====== USER SESSION MANAGEMENT (NEW) ======

  // New: Proper user authentication handling
  setUserId(userId) {
    const oldUserId = this.userId;
    
    // Update internal state
    this.userId = userId;
    
    if (userId) {
      localStorage.setItem('user_id', userId);
      console.log('👤 User authenticated in tracking:', userId.substring(0, 8) + '...');
      
      // Create new session for authenticated user
      this.sessionId = this.getOrCreateSessionId();
      
      // Initialize ML tracking for new user
      if (!oldUserId) {
        setTimeout(() => {
          this.initializeMLTracking();
        }, 100);
      }
    } else {
      // User logged out
      console.log('👋 User logged out from tracking');
      this.clearUserMLData(oldUserId);
    }
  }

  // New: Clear user-specific ML data on logout
  async clearUserMLData(userId) {
    if (!userId) return;
    
    try {
      await axios.post(`${this.baseURL}/ml/clear-user-session`, {
        user_id: userId,
        session_id: this.sessionId
      });
      console.log('🧹 Cleared user ML session data');
    } catch (error) {
      console.warn('Failed to clear user ML data:', error);
    }
  }

  // Fixed: Proper data clearing on logout
  clearTrackingData() {
    console.log('🚪 Clearing tracking data');
    
    const oldUserId = this.userId;
    
    // Clear session storage
    const userId = this.getUserId();
    if (userId) {
      sessionStorage.removeItem(`tracking_session_${userId}`);
    }
    sessionStorage.removeItem('tracking_session_anonymous');
    
    // Clear localStorage
    localStorage.removeItem('user_id');
    
    // Clear ML data
    if (oldUserId) {
      this.clearUserMLData(oldUserId);
    }
    
    // Reset internal state
    this.userId = null;
    this.sessionId = this.getOrCreateSessionId();
  }

  // ====== UTILITY METHODS ======

  // Resetează timer-ul pentru timpul petrecut
  resetTimer() {
    this.startTime = Date.now();
  }

  // Tracking pentru evenimente de pagină
  trackPageView(pageName) {
    console.log(`📄 Page view tracked: ${pageName} (User: ${this.userId ? 'auth' : 'anon'})`);
    this.resetTimer();
  }

  // Tracking pentru timp petrecut pe pagină la plecare
  trackPageExit(pageName) {
    const timeSpent = this.getTimeSpent();
    console.log(`⏱️ Time spent on ${pageName}: ${timeSpent.toFixed(2)}s (User: ${this.userId ? 'auth' : 'anon'})`);
  }

  // ====== FALLBACK METHODS ======

  async trackSearchFallback(city, activities, time) {
    try {
      const response = await axios.post(`${this.baseURL}/submit-preferences`, {
        city, activities, time
      });
      console.log('🔍 Search tracked via fallback method');
      return response.data;
    } catch (error) {
      console.warn('All search tracking methods failed:', error);
    }
  }

  // ====== DEBUG & DEVELOPMENT (ENHANCED) ======

  // Enhanced debug info
  getDebugInfo() {
    return {
      sessionId: this.sessionId ? this.sessionId.substring(0, 8) + '...' : 'none',
      userId: this.userId ? this.userId.substring(0, 8) + '...' : null,
      userType: this.userId ? 'authenticated' : 'anonymous',
      timeSpent: this.getTimeSpent(),
      baseURL: this.baseURL,
      hasCurrentUser: !!localStorage.getItem('currentUser'),
      sessionKeys: Object.keys(sessionStorage).filter(key => key.includes('tracking'))
    };
  }

  // Log current tracking state with enhanced info
  logTrackingState() {
    console.log('🔍 Current Tracking State:', this.getDebugInfo());
  }

  // New: Force refresh user context
  refreshUserContext() {
    const newUserId = this.getUserId();
    if (newUserId !== this.userId) {
      console.log('🔄 User context changed:', {
        old: this.userId ? this.userId.substring(0, 8) + '...' : 'none',
        new: newUserId ? newUserId.substring(0, 8) + '...' : 'none'
      });
      this.setUserId(newUserId);
    }
  }
}

// Exportă o instanță singleton
const trackingService = new TrackingService();

// Debug în development
if (process.env.NODE_ENV === 'development') {
  window.trackingService = trackingService;
}

export default trackingService;