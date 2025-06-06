// TrackingService.js - No API Calls Version (Frontend Only)
class LocalTrackingService {
  constructor() {
    this.sessionId = this.initializeSession();
    this.userId = this.getCurrentUser();
    this.pendingMigration = false;
    
    // Track current search context locally
    this.currentSearchContext = null;
    this.lastSearchTime = null;
    this.contextExpirationTime = 10 * 60 * 1000; // 10 minutes
    
    // Listen for storage changes to keep user state in sync
    this.setupStorageListener();
    
    console.log('Local TrackingService initialized (no API calls):', {
      userId: this.userId ? this.userId.substring(0, 8) + '...' : 'anonymous',
      sessionId: this.sessionId.substring(0, 8) + '...',
      version: '3.0.0_local_only',
      mode: 'frontend_only'
    });
  }

  setupStorageListener() {
    window.addEventListener('storage', (e) => {
      if (e.key === 'currentUser' || e.key === 'user_id') {
        console.log('🔄 Storage change detected, updating user state');
        const newUserId = this.getCurrentUser();
        if (newUserId !== this.userId) {
          this.userId = newUserId;
          console.log('👤 User state updated:', this.userId ? this.userId.substring(0, 8) + '...' : 'anonymous');
        }
      }
    });

    window.addEventListener('user-changed', (e) => {
      console.log('👤 User change event detected');
      this.userId = this.getCurrentUser();
    });
  }

  initializeSession() {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      sessionStorage.setItem('session_id', sessionId);
      console.log('🆔 New session created:', sessionId.substring(0, 8) + '...');
    }
    return sessionId;
  }

  getCurrentUser() {
    const sources = [
      () => {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser && currentUser !== 'null' && currentUser !== 'undefined') {
          try {
            const user = JSON.parse(currentUser);
            return user?.id || user?.user_id || user?.email;
          } catch (e) {
            console.warn('Failed to parse currentUser:', e);
          }
        }
        return null;
      },
      () => {
        const token = localStorage.getItem('token');
        if (token && token !== 'null') {
          const userId = localStorage.getItem('user_id');
          if (userId && userId !== 'null' && userId !== 'undefined') {
            return userId;
          }
        }
        return null;
      },
      () => {
        const userId = localStorage.getItem('user_id');
        if (userId && userId !== 'null' && userId !== 'undefined' && userId !== 'anonymous') {
          return userId;
        }
        return null;
      }
    ];

    for (const source of sources) {
      const userId = source();
      if (userId && userId !== 'null' && userId !== 'undefined' && userId !== 'anonymous') {
        return userId;
      }
    }
    
    return null;
  }

  setUserId(userId) {
    console.log('👤 Setting user ID locally:', userId ? userId.substring(0, 8) + '...' : 'anonymous');
    
    const oldUserId = this.userId;
    this.userId = userId;
    
    if (userId && userId !== 'anonymous') {
      localStorage.setItem('user_id', userId);
    } else {
      localStorage.removeItem('user_id');
    }
    
    console.log('✅ User ID set successfully (local only)');
  }

  async setCurrentUser(userId) {
    this.setUserId(userId);
  }

  // ===== STATIC HOME RECOMMENDATIONS (No API) =====
  async getHomeRecommendations(limit = 12, forceRefresh = false) {
    try {
      console.log('🏠 Getting STATIC home recommendations (no API calls)');
      
      // Always return static response for Home
      const staticResponse = {
        status: 'success',
        recommendations: {
          main_recommendations: [],
          recommendation_type: 'static_home',
          message: 'Start exploring to discover amazing places!',
          show_try_it_out: true
        },
        metadata: {
          user_id: this.userId,
          session_id: this.sessionId,
          has_activity: false,
          recommendation_type: 'static_home',
          personalization_level: 'none',
          profile_strength: 0,
          context_influenced: false,
          search_context_used: false,
          ml_version: '3.0_local_only',
          algorithm: 'static_home_local',
          data_source: 'static'
        }
      };
      
      console.log('🏠 Static home recommendations returned (local only)');
      return staticResponse;
      
    } catch (error) {
      console.error('❌ Failed to load static home recommendations:', error);
      return {
        status: 'success',
        recommendations: {
          main_recommendations: [],
          recommendation_type: 'static_home',
          message: 'Start exploring to discover amazing places!',
          show_try_it_out: true
        },
        metadata: { has_activity: false }
      };
    }
  }

  // ===== LOCAL TRACKING (No API calls) =====
  
  async trackSearch(city, activities, time) {
    try {
      console.log('📝 Tracking search locally (no API call):', { city, activities, time });
      
      // Store search context locally only
      this.currentSearchContext = {
        city,
        activities,
        time,
        timestamp: Date.now()
      };
      this.lastSearchTime = Date.now();
      
      // Store in sessionStorage for persistence
      sessionStorage.setItem(`search_context_${this.sessionId}`, JSON.stringify(this.currentSearchContext));
      console.log('💾 Search context stored locally only');
      
      // Store in a local tracking log
      this.addToLocalTrackingLog('search', {
        city,
        activities,
        time,
        timestamp: new Date().toISOString()
      });
      
      return { success: true, context_stored: true };
      
    } catch (error) {
      console.error('❌ Local search tracking error:', error);
    }
  }

  async trackFavorite(placeName, placeId, city, lat, lon) {
    try {
      console.log('❤️ Tracking favorite locally (no API call):', placeName);
      
      this.addToLocalTrackingLog('favorite', {
        placeName,
        placeId,
        city,
        lat,
        lon,
        timestamp: new Date().toISOString()
      });
      
      // Store in localStorage for persistence
      const favorites = JSON.parse(localStorage.getItem('tracked_favorites') || '[]');
      favorites.push({
        placeName,
        placeId,
        city,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('tracked_favorites', JSON.stringify(favorites));
      
      console.log('❤️ Favorite tracked locally');
      
    } catch (error) {
      console.warn('⚠️ Failed to track favorite locally:', error);
    }
  }

  async trackAddToItinerary(placeName, placeId, city, lat, lon) {
    try {
      console.log('✈️ Tracking itinerary add locally (no API call):', placeName);
      
      this.addToLocalTrackingLog('add_to_itinerary', {
        placeName,
        placeId,
        city,
        lat,
        lon,
        timestamp: new Date().toISOString()
      });
      
      // Store in localStorage for persistence
      const itineraryAdds = JSON.parse(localStorage.getItem('tracked_itinerary_adds') || '[]');
      itineraryAdds.push({
        placeName,
        placeId,
        city,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('tracked_itinerary_adds', JSON.stringify(itineraryAdds));
      
      console.log('✈️ Itinerary add tracked locally');
      
    } catch (error) {
      console.warn('⚠️ Failed to track itinerary add locally:', error);
    }
  }

  async trackPlaceView(placeName, placeId, city, lat, lon, index = null) {
    try {
      console.log('👁️ Tracking place view locally (no API call):', placeName);
      
      this.addToLocalTrackingLog('view', {
        placeName,
        placeId,
        city,
        lat,
        lon,
        index,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.warn('⚠️ Failed to track place view locally:', error);
    }
  }

  trackPageView(pageName) {
    console.log(`📄 Page view tracked locally: ${pageName}`);
    
    this.addToLocalTrackingLog('page_view', {
      pageName,
      timestamp: new Date().toISOString()
    });
    
    this.currentPage = pageName;
    this.pageStartTime = Date.now();
  }

  trackPageExit(pageName) {
    if (this.pageStartTime) {
      const timeSpent = Date.now() - this.pageStartTime;
      console.log(`📄 Page exit tracked locally: ${pageName} (${timeSpent}ms)`);
      
      this.addToLocalTrackingLog('page_exit', {
        pageName,
        timeSpent,
        timestamp: new Date().toISOString()
      });
    }
  }

  // ===== LOCAL TRACKING UTILITIES =====
  
  addToLocalTrackingLog(eventType, data) {
    try {
      const trackingLog = JSON.parse(localStorage.getItem('local_tracking_log') || '[]');
      
      trackingLog.push({
        eventType,
        data,
        userId: this.userId,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString()
      });
      
      // Keep only last 1000 events to prevent localStorage from growing too large
      if (trackingLog.length > 1000) {
        trackingLog.splice(0, trackingLog.length - 1000);
      }
      
      localStorage.setItem('local_tracking_log', JSON.stringify(trackingLog));
      
    } catch (error) {
      console.warn('⚠️ Failed to add to local tracking log:', error);
    }
  }

  getLocalTrackingStats() {
    try {
      const trackingLog = JSON.parse(localStorage.getItem('local_tracking_log') || '[]');
      const favorites = JSON.parse(localStorage.getItem('tracked_favorites') || '[]');
      const itineraryAdds = JSON.parse(localStorage.getItem('tracked_itinerary_adds') || '[]');
      
      const stats = {
        totalEvents: trackingLog.length,
        totalFavorites: favorites.length,
        totalItineraryAdds: itineraryAdds.length,
        eventTypes: {},
        lastActivity: trackingLog.length > 0 ? trackingLog[trackingLog.length - 1].timestamp : null
      };
      
      // Count events by type
      trackingLog.forEach(event => {
        stats.eventTypes[event.eventType] = (stats.eventTypes[event.eventType] || 0) + 1;
      });
      
      return stats;
      
    } catch (error) {
      console.warn('⚠️ Failed to get local tracking stats:', error);
      return null;
    }
  }

  clearLocalTrackingData() {
    console.log('🗑️ Clearing local tracking data');
    
    localStorage.removeItem('local_tracking_log');
    localStorage.removeItem('tracked_favorites');
    localStorage.removeItem('tracked_itinerary_adds');
    sessionStorage.removeItem(`search_context_${this.sessionId}`);
    
    this.currentSearchContext = null;
    this.lastSearchTime = null;
    
    console.log('✅ Local tracking data cleared');
  }

  // ===== CONTEXT MANAGEMENT (Local only) =====

  shouldUseSearchContext() {
    if (!this.currentSearchContext && !this.getStoredSearchContext()) {
      return false;
    }
    
    const context = this.currentSearchContext || this.getStoredSearchContext();
    if (!context) return false;
    
    const age = Date.now() - context.timestamp;
    const isValid = age < this.contextExpirationTime;
    
    if (!isValid) {
      this.clearSearchContext();
      return false;
    }
    
    return true;
  }

  getStoredSearchContext() {
    try {
      const stored = sessionStorage.getItem(`search_context_${this.sessionId}`);
      if (stored) {
        const context = JSON.parse(stored);
        this.currentSearchContext = context;
        return context;
      }
    } catch (error) {
      console.warn('Failed to parse stored search context:', error);
    }
    return null;
  }

  clearSearchContext() {
    this.currentSearchContext = null;
    this.lastSearchTime = null;
    sessionStorage.removeItem(`search_context_${this.sessionId}`);
    
    console.log('🗑️ Search context cleared (local only)');
  }

  getSearchContextSummary() {
    const context = this.currentSearchContext || this.getStoredSearchContext();
    if (!context) return null;
    
    const age = Date.now() - context.timestamp;
    const ageMinutes = Math.floor(age / 60000);
    
    return {
      city: context.city,
      activities: context.activities,
      time: context.time,
      ageMinutes: ageMinutes,
      isValid: age < this.contextExpirationTime
    };
  }

  // ===== MOCK API METHODS (for compatibility) =====
  
  async searchWithMLTracking(city, activities, time) {
    console.log('🔍 Mock search (no API call):', { city, activities, time });
    
    // Track search locally
    await this.trackSearch(city, activities, time);
    
    // Return mock response
    return {
      recommendations: [],
      sources: { amadeus: 0, ai_personalized: 0 },
      ml_enhanced: false,
      ai_recommendations_included: false,
      context_stored: true,
      search_metadata: {
        query: { city, activities, time },
        total_results: 0
      }
    };
  }

  async getDiverseRecommendations(limit = 12) {
    console.log('🎲 Mock diverse recommendations (no API call)');
    return this.getHomeRecommendations(limit);
  }

  async getUserStats(userId = null) {
    console.log('📊 Getting local user stats (no API call)');
    return this.getLocalTrackingStats();
  }

  async getTrendingPlaces(city = null, limit = 10) {
    console.log('📈 Mock trending places (no API call)');
    return [];
  }

  // ===== DEBUG METHODS =====
  
  getDebugInfo() {
    const contextSummary = this.getSearchContextSummary();
    const stats = this.getLocalTrackingStats();
    
    return {
      version: '3.0.0_local_only',
      sessionId: this.sessionId ? this.sessionId.substring(0, 8) + '...' : null,
      userId: this.userId ? this.userId.substring(0, 8) + '...' : null,
      userType: this.userId ? 'authenticated' : 'anonymous',
      searchContext: contextSummary,
      localStats: stats,
      mode: 'frontend_only',
      features: [
        'local_tracking_only',
        'no_api_calls',
        'static_home_page',
        'localStorage_persistence',
        'sessionStorage_context'
      ]
    };
  }

  async testMLSystem() {
    console.log('🧪 Testing local tracking system...');
    
    try {
      // Test home recommendations
      const homeRecs = await this.getHomeRecommendations(6);
      console.log('✅ Home recommendations (static):', homeRecs.recommendations.recommendation_type);
      
      // Test search tracking
      await this.trackSearch('Paris', ['Cultural'], '2-4h');
      console.log('✅ Search tracking completed');
      
      // Test context
      const context = this.getSearchContextSummary();
      console.log('✅ Context available:', !!context);
      
      // Test stats
      const stats = this.getLocalTrackingStats();
      console.log('✅ Local stats:', stats);
      
      return {
        success: true,
        mode: 'local_only',
        homeIsStatic: true,
        trackingWorking: true,
        statsAvailable: !!stats
      };
      
    } catch (error) {
      console.error('❌ Local tracking test failed:', error);
      return { success: false, error: error.message };
    }
  }

  clearTrackingData() {
    console.log('🚪 Clearing all tracking data');
    
    this.clearLocalTrackingData();
    
    sessionStorage.removeItem('session_id');
    localStorage.removeItem('user_id');
    
    this.userId = null;
    this.sessionId = this.initializeSession();
  }
}

// Export singleton instance
const trackingService = new LocalTrackingService();

// Debug în development
if (process.env.NODE_ENV === 'development') {
  window.trackingService = trackingService;
  console.log('🚀 Local tracking service available as window.trackingService');
  
  // Add test methods to window for easy debugging
  window.testLocalTracking = () => trackingService.testMLSystem();
  window.getTrackingStats = () => trackingService.getLocalTrackingStats();
  window.clearTracking = () => trackingService.clearTrackingData();
}

export default trackingService;