// TrackingService.js - Simplificat pentru Home ML
class TrackingService {
  constructor() {
    this.baseURL = 'http://localhost:8000';
    this.sessionId = this.initializeSession();
    this.userId = this.getCurrentUser();
    
    console.log('TrackingService initialized:', {
      userId: this.userId ? this.userId.substring(0, 8) + '...' : 'anonymous',
      sessionId: this.sessionId.substring(0, 8) + '...'
    });
  }

  // ===== SESSION & USER MANAGEMENT =====

  initializeSession() {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  getCurrentUser() {
    // Verifică currentUser din localStorage (sistemul tău de auth)
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      try {
        const user = JSON.parse(currentUser);
        if (user && user.id) {
          return user.id;
        }
      } catch (e) {
        console.warn('Failed to parse currentUser:', e);
      }
    }
    
    // Verifică user_id direct
    const directUserId = localStorage.getItem('user_id');
    if (directUserId && directUserId !== 'null' && directUserId !== 'undefined') {
      return directUserId;
    }
    
    return null; // Anonymous
  }

  setCurrentUser(userId) {
    const oldUserId = this.userId;
    this.userId = userId;
    
    if (userId) {
      console.log('User authenticated:', userId.substring(0, 8) + '...');
      // Migrează datele anonime dacă e nevoie
      if (!oldUserId) {
        setTimeout(() => {
          this.migrateAnonymousData(userId);
        }, 500);
      }
    } else {
      console.log('User logged out');
    }
  }

  // ===== HOME RECOMMENDATIONS (PRINCIPAL) =====

  async getHomeRecommendations(limit = 12) {
    try {
      const params = new URLSearchParams({ 
        limit: limit.toString()
      });
      
      if (this.userId) {
        params.append('user_id', this.userId);
      }
      if (this.sessionId) {
        params.append('session_id', this.sessionId);
      }

      const response = await fetch(`${this.baseURL}/ml/home-recommendations?${params}`);
      const data = await response.json();
      
      console.log('Home recommendations loaded:', {
        user_type: this.userId ? 'authenticated' : 'anonymous',
        has_activity: data.metadata?.has_activity,
        recommendation_type: data.recommendations?.recommendation_type,
        count: data.recommendations?.main_recommendations?.length || 0
      });
      
      return data;
    } catch (error) {
      console.error('Failed to load home recommendations:', error);
      return {
        status: 'error',
        recommendations: {
          main_recommendations: [],
          recommendation_type: 'error',
          show_try_it_out: true
        },
        metadata: { has_activity: false }
      };
    }
  }

  // ===== TRACKING METHODS =====

  async trackSearch(city, activities, time) {
    try {
      const response = await fetch(`${this.baseURL}/ml/track-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          activities,
          time,
          user_id: this.userId,
          session_id: this.sessionId
        })
      });

      if (response.ok) {
        console.log('Search tracked:', { city, activities });
        return await response.json();
      }
    } catch (error) {
      console.warn('Failed to track search:', error);
    }
  }

  async trackPlaceView(placeName, placeId, city, lat, lon, index = null) {
    try {
      await this.trackInteraction('view', placeName, placeId, city, lat, lon);
      console.log('Place view tracked:', placeName);
    } catch (error) {
      console.warn('Failed to track place view:', error);
    }
  }

  async trackFavorite(placeName, placeId, city, lat, lon) {
    try {
      await this.trackInteraction('favorite', placeName, placeId, city, lat, lon);
      
      // Update pentru refresh Home - IMPORTANT pentru recomandări
      await this.updateUserActivity('favorite', placeName, city);
      
      console.log('Favorite tracked with Home update:', placeName);
    } catch (error) {
      console.warn('Failed to track favorite:', error);
    }
  }

  async trackAddToItinerary(placeName, placeId, city, lat, lon) {
    try {
      await this.trackInteraction('add_to_itinerary', placeName, placeId, city, lat, lon);
      
      // Update pentru refresh Home - IMPORTANT pentru recomandări
      await this.updateUserActivity('itinerary', placeName, city);
      
      console.log('Add to itinerary tracked with Home update:', placeName);
    } catch (error) {
      console.warn('Failed to track add to itinerary:', error);
    }
  }

  // ===== CORE TRACKING FUNCTIONS =====

  async trackInteraction(interactionType, placeName, placeId, city, lat, lon) {
    try {
      const response = await fetch(`${this.baseURL}/ml/track-interaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interaction_type: interactionType,
          place_name: placeName,
          place_id: placeId,
          city,
          lat,
          lon,
          user_id: this.userId,
          session_id: this.sessionId
        })
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn(`Failed to track ${interactionType}:`, error);
    }
  }

  // CRUCIAL: Update activitate pentru refresh Home
  async updateUserActivity(activityType, placeName, city) {
    try {
      const response = await fetch(`${this.baseURL}/ml/update-user-activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_type: activityType,
          place_name: placeName,
          city,
          user_id: this.userId,
          session_id: this.sessionId
        })
      });

      if (response.ok) {
        console.log('User activity updated for Home refresh:', activityType);
      }
    } catch (error) {
      console.warn('Failed to update user activity:', error);
    }
  }

  // ===== ENHANCED SEARCH =====

  async searchWithMLTracking(city, activities, time) {
    try {
      // Track search
      await this.trackSearch(city, activities, time);
      
      // Enhanced search cu auto-populate
      const response = await fetch(`${this.baseURL}/submit-preferences-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          activities,
          time,
          session_id: this.sessionId,
          user_id: this.userId
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      
      console.log('Enhanced search completed:', {
        city,
        total_results: data.recommendations?.length || 0,
        ml_enhanced: data.ml_enhanced,
        database_populated: data.database_auto_populated
      });

      return data;
    } catch (error) {
      console.error('Enhanced search failed:', error);
      throw error;
    }
  }

  // ===== USER MANAGEMENT =====

  async migrateAnonymousData(userId) {
    try {
      const response = await fetch(`${this.baseURL}/ml/migrate-anonymous-to-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          session_id: this.sessionId
        })
      });

// TrackingService.js - Simplificat pentru Home ML
class TrackingService {
  constructor() {
    this.baseURL = 'http://localhost:8000';
    this.sessionId = this.initializeSession();
    this.userId = this.getCurrentUser();
    
    console.log('TrackingService initialized:', {
      userId: this.userId ? this.userId.substring(0, 8) + '...' : 'anonymous',
      sessionId: this.sessionId.substring(0, 8) + '...'
    });
  }

  // ===== SESSION & USER MANAGEMENT =====

  initializeSession() {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  getCurrentUser() {
    // Verifică currentUser din localStorage (sistemul tău de auth)
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      try {
        const user = JSON.parse(currentUser);
        if (user && user.id) {
          return user.id;
        }
      } catch (e) {
        console.warn('Failed to parse currentUser:', e);
      }
    }
    
    // Verifică user_id direct
    const directUserId = localStorage.getItem('user_id');
    if (directUserId && directUserId !== 'null' && directUserId !== 'undefined') {
      return directUserId;
    }
    
    return null; // Anonymous
  }

  setCurrentUser(userId) {
    const oldUserId = this.userId;
    this.userId = userId;
    
    if (userId) {
      console.log('User authenticated:', userId.substring(0, 8) + '...');
      // Migrează datele anonime dacă e nevoie
      if (!oldUserId) {
        setTimeout(() => {
          this.migrateAnonymousData(userId);
        }, 500);
      }
    } else {
      console.log('User logged out');
    }
  }

  // ===== HOME RECOMMENDATIONS (PRINCIPAL) =====

  async getHomeRecommendations(limit = 12) {
    try {
      const params = new URLSearchParams({ 
        limit: limit.toString()
      });
      
      if (this.userId) {
        params.append('user_id', this.userId);
      }
      if (this.sessionId) {
        params.append('session_id', this.sessionId);
      }

      const response = await fetch(`${this.baseURL}/ml/home-recommendations?${params}`);
      const data = await response.json();
      
      console.log('Home recommendations loaded:', {
        user_type: this.userId ? 'authenticated' : 'anonymous',
        has_activity: data.metadata?.has_activity,
        recommendation_type: data.recommendations?.recommendation_type,
        count: data.recommendations?.main_recommendations?.length || 0
      });
      
      return data;
    } catch (error) {
      console.error('Failed to load home recommendations:', error);
      return {
        status: 'error',
        recommendations: {
          main_recommendations: [],
          recommendation_type: 'error',
          show_try_it_out: true
        },
        metadata: { has_activity: false }
      };
    }
  }

  // ===== TRACKING METHODS =====

  async trackSearch(city, activities, time) {
    try {
      const response = await fetch(`${this.baseURL}/ml/track-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          activities,
          time,
          user_id: this.userId,
          session_id: this.sessionId
        })
      });

      if (response.ok) {
        console.log('Search tracked:', { city, activities });
        return await response.json();
      }
    } catch (error) {
      console.warn('Failed to track search:', error);
    }
  }

  async trackPlaceView(placeName, placeId, city, lat, lon, index = null) {
    try {
      await this.trackInteraction('view', placeName, placeId, city, lat, lon);
      console.log('Place view tracked:', placeName);
    } catch (error) {
      console.warn('Failed to track place view:', error);
    }
  }

  async trackFavorite(placeName, placeId, city, lat, lon) {
    try {
      await this.trackInteraction('favorite', placeName, placeId, city, lat, lon);
      
      // Update pentru refresh Home - IMPORTANT pentru recomandări
      await this.updateUserActivity('favorite', placeName, city);
      
      console.log('Favorite tracked with Home update:', placeName);
    } catch (error) {
      console.warn('Failed to track favorite:', error);
    }
  }

  async trackAddToItinerary(placeName, placeId, city, lat, lon) {
    try {
      await this.trackInteraction('add_to_itinerary', placeName, placeId, city, lat, lon);
      
      // Update pentru refresh Home - IMPORTANT pentru recomandări
      await this.updateUserActivity('itinerary', placeName, city);
      
      console.log('Add to itinerary tracked with Home update:', placeName);
    } catch (error) {
      console.warn('Failed to track add to itinerary:', error);
    }
  }

  // ===== CORE TRACKING FUNCTIONS =====

  async trackInteraction(interactionType, placeName, placeId, city, lat, lon) {
    try {
      const response = await fetch(`${this.baseURL}/ml/track-interaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interaction_type: interactionType,
          place_name: placeName,
          place_id: placeId,
          city,
          lat,
          lon,
          user_id: this.userId,
          session_id: this.sessionId
        })
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn(`Failed to track ${interactionType}:`, error);
    }
  }

  // CRUCIAL: Update activitate pentru refresh Home
  async updateUserActivity(activityType, placeName, city) {
    try {
      const response = await fetch(`${this.baseURL}/ml/update-user-activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_type: activityType,
          place_name: placeName,
          city,
          user_id: this.userId,
          session_id: this.sessionId
        })
      });

      if (response.ok) {
        console.log('User activity updated for Home refresh:', activityType);
      }
    } catch (error) {
      console.warn('Failed to update user activity:', error);
    }
  }

  // ===== ENHANCED SEARCH =====

  async searchWithMLTracking(city, activities, time) {
    try {
      // Track search
      await this.trackSearch(city, activities, time);
      
      // Enhanced search cu auto-populate
      const response = await fetch(`${this.baseURL}/submit-preferences-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          activities,
          time,
          session_id: this.sessionId,
          user_id: this.userId
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      
      console.log('Enhanced search completed:', {
        city,
        total_results: data.recommendations?.length || 0,
        ml_enhanced: data.ml_enhanced,
        database_populated: data.database_auto_populated
      });

      return data;
    } catch (error) {
      console.error('Enhanced search failed:', error);
      throw error;
    }
  }

  // ===== USER MANAGEMENT =====

  async migrateAnonymousData(userId) {
    try {
      const response = await fetch(`${this.baseURL}/ml/migrate-anonymous-to-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          session_id: this.sessionId
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Anonymous data migrated:', data.migrated_activities || 0, 'activities');
      }
    } catch (error) {
      console.warn('Failed to migrate anonymous data:', error);
    }
  }

  clearTrackingData() {
    console.log('Clearing tracking data');
    
    // Clear session storage
    sessionStorage.removeItem('session_id');
    
    // Reset state
    this.userId = null;
    this.sessionId = this.initializeSession();
  }

  // ===== PAGE TRACKING =====

  trackPageView(pageName) {
    console.log(`Page view: ${pageName} (${this.userId ? 'auth' : 'anon'})`);
  }

  trackPageExit(pageName) {
    console.log(`Page exit: ${pageName}`);
  }

  // ===== UTILITY & DEBUG =====

  getDebugInfo() {
    return {
      userId: this.userId ? this.userId.substring(0, 8) + '...' : null,
      sessionId: this.sessionId.substring(0, 8) + '...',
      userType: this.userId ? 'authenticated' : 'anonymous'
    };
  }

  logTrackingState() {
    console.log('Tracking State:', this.getDebugInfo());
  }
}

// Export singleton instance
const trackingService = new TrackingService();

// Debug in development
if (process.env.NODE_ENV === 'development') {
  window.trackingService = trackingService;
}

export default trackingService;