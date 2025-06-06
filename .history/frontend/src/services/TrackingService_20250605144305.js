// Enhanced TrackingService.js - Static Home Version
class EnhancedTrackingService {
  constructor() {
    this.baseURL = 'http://localhost:8000';
    this.sessionId = this.initializeSession();
    this.userId = this.getCurrentUser();
    this.pendingMigration = false;
    
    // Track current search context (for search results only)
    this.currentSearchContext = null;
    this.lastSearchTime = null;
    this.contextExpirationTime = 10 * 60 * 1000; // 10 minutes
    
    // Listen for storage changes to keep user state in sync
    this.setupStorageListener();
    
    console.log('Enhanced TrackingService initialized - STATIC HOME VERSION:', {
      userId: this.userId ? this.userId.substring(0, 8) + '...' : 'anonymous',
      sessionId: this.sessionId.substring(0, 8) + '...',
      version: '2.1.0_static_home',
      homePageBehavior: 'always_static'
    });
  }

  setupStorageListener() {
    // Listen for changes in localStorage/sessionStorage
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

    // Also listen for manual user changes within the same tab
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
    // Try multiple sources to find user ID
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
      },
      () => {
        const sessionUserId = sessionStorage.getItem('user_id');
        if (sessionUserId && sessionUserId !== 'null' && sessionUserId !== 'undefined' && sessionUserId !== 'anonymous') {
          return sessionUserId;
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

  refreshUserState() {
    const oldUserId = this.userId;
    this.userId = this.getCurrentUser();
    
    if (oldUserId !== this.userId) {
      console.log('🔄 User state refreshed:', {
        old: oldUserId ? oldUserId.substring(0, 8) + '...' : 'anonymous',
        new: this.userId ? this.userId.substring(0, 8) + '...' : 'anonymous'
      });
      
      window.dispatchEvent(new CustomEvent('tracking-user-updated', {
        detail: { userId: this.userId, oldUserId }
      }));
    }
    
    return this.userId;
  }

  setUserId(userId) {
    console.log('👤 Setting user ID in tracking service:', userId ? userId.substring(0, 8) + '...' : 'anonymous');
    
    const oldUserId = this.userId;
    this.userId = userId;
    
    if (userId && userId !== 'anonymous') {
      localStorage.setItem('user_id', userId);
      
      if (!oldUserId && !this.pendingMigration) {
        this.pendingMigration = true;
        setTimeout(async () => {
          await this.migrateAnonymousData(userId);
          this.pendingMigration = false;
        }, 1000);
      }
    } else {
      localStorage.removeItem('user_id');
    }
    
    console.log('✅ User ID set successfully');
  }

  async setCurrentUser(userId) {
    this.setUserId(userId);
  }

  // ===== STATIC HOME RECOMMENDATIONS =====

  async getHomeRecommendations(limit = 12, forceRefresh = false) {
    try {
      console.log('🏠 Getting STATIC home recommendations (no ML, no context, no API calls)');
      
      // ALWAYS return static response for Home - no API call needed
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
          ml_version: '2.1_static_home',
          algorithm: 'static_home_no_ml',
          data_source: 'static'
        }
      };
      
      console.log('🏠 Static home recommendations returned (no ML, no changes, always same)');
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

  // Keep diverse recommendations for other potential use cases
  async getDiverseRecommendations(limit = 12) {
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

      const response = await fetch(`${this.baseURL}/ml/diverse-recommendations?${params}`);
      const data = await response.json();
      
      console.log('🎲 Diverse recommendations loaded:', {
        count: data.recommendations?.main_recommendations?.length || 0,
        type: data.recommendations?.recommendation_type,
        diversity_enforced: data.metadata?.diversity_enforced
      });
      
      return data;
    } catch (error) {
      console.error('❌ Failed to load diverse recommendations:', error);
      return this.getHomeRecommendations(limit, true); // Fallback to static
    }
  }

  // ===== SEARCH WITH AI RECOMMENDATIONS =====

  async searchWithMLTracking(city, activities, time) {
    try {
      console.log('🚀 Starting ENHANCED ML search with AI recommendations:', { city, activities, time });
      console.log('🔧 User state:', { 
        userId: this.userId ? this.userId.substring(0, 8) + '...' : 'none',
        sessionId: this.sessionId.substring(0, 8) + '...'
      });
      
      // STEP 1: Track search FIRST to store context in backend
      console.log('📝 Step 1: Storing search context...');
      await this.trackSearch(city, activities, time);
      
      // STEP 2: Wait a moment for backend to process
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // STEP 3: Call search API which will use the fresh context
      console.log('🔍 Step 2: Calling search API with stored context...');
      const response = await fetch(`${this.baseURL}/submit-preferences-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          activities,
          time,
          session_id: this.sessionId,
          user_id: this.userId,
          enhanced_ml: true,
          include_ai_recommendations: true,
          context_aware: true,
          force_ai_learning: true,
          tracking_version: '2.1.0_static_home'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      const aiCount = data.sources?.ai_personalized || 0;
      const amadeusCount = data.sources?.amadeus || 0;
      
      console.log('🎯 ENHANCED ML search completed:', {
        city,
        total_results: data.recommendations?.length || 0,
        ai_recommendations: aiCount,
        amadeus_results: amadeusCount,
        ml_enhanced: data.ml_enhanced,
        ai_included: data.ai_recommendations_included,
        context_stored: data.context_stored,
        success: true
      });

      // DEBUGGING: Log for AI recommendations
      if (aiCount === 0) {
        console.warn('⚠️ No AI recommendations returned!');
        console.log('🔍 Debug search response:', {
          recommendations_length: data.recommendations?.length,
          sources: data.sources,
          search_metadata: data.search_metadata,
          enhanced_features: data.enhanced_features
        });
        
        // Check if any recommendations are marked as AI
        if (data.recommendations?.length > 0) {
          const aiMarked = data.recommendations.filter(r => 
            r.isMLRecommendation || r.enhanced_ml || r.context_aware || 
            r.recommendation_source === 'ai' || r.data_source === 'enhanced_database'
          );
          console.log('🤖 AI-marked recommendations found:', aiMarked.length);
        }
      } else {
        console.log('✅ AI recommendations successfully included!');
        
        // Log first AI recommendation for debugging
        const firstAI = data.recommendations?.find(r => 
          r.isMLRecommendation || r.enhanced_ml || r.recommendation_source === 'ai'
        );
        if (firstAI) {
          console.log('🤖 Example AI recommendation:', {
            name: firstAI.name,
            reason: firstAI.recommendation_reason,
            source: firstAI.recommendation_source,
            isML: firstAI.isMLRecommendation
          });
        }
      }

      return data;
    } catch (error) {
      console.error('❌ ENHANCED ML search failed:', error);
      throw error;
    }
  }

  // Enhanced trackSearch method with better error handling
  async trackSearch(city, activities, time) {
    try {
      console.log('📝 Tracking search with context storage...');
      
      // Store search context locally FIRST
      this.currentSearchContext = {
        city,
        activities,
        time,
        timestamp: Date.now()
      };
      this.lastSearchTime = Date.now();
      
      // Store in sessionStorage for persistence
      sessionStorage.setItem(`search_context_${this.sessionId}`, JSON.stringify(this.currentSearchContext));
      console.log('💾 Search context stored locally');
      
      const searchData = {
        city,
        activities,
        time,
        user_id: this.userId,
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
        force_ai_learning: true,
        create_initial_activity: true
      };

      console.log('📤 Sending search tracking data:', {
        city,
        activities_count: activities.length,
        user_type: this.userId ? 'authenticated' : 'anonymous',
        session_id: this.sessionId.substring(0, 8) + '...'
      });

      const response = await fetch(`${this.baseURL}/ml/track-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Search tracking successful:', { 
          city, 
          activities: activities.length, 
          user_type: this.userId ? 'auth' : 'anon',
          context_stored: result.context_stored,
          will_influence: result.context_will_influence_recommendations
        });
        
        return result;
      } else {
        const errorText = await response.text();
        console.warn('⚠️ Search tracking failed:', response.status, errorText);
        throw new Error(`Search tracking failed: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Search tracking error:', error);
      // Don't throw - allow search to continue even if tracking fails
    }
  }

  // ===== CONTEXT MANAGEMENT =====

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
    
    // Also clear on backend
    this.clearBackendSearchContext();
    
    console.log('🗑️ Search context cleared (frontend and backend)');
  }

  async clearBackendSearchContext() {
    try {
      await fetch(`${this.baseURL}/ml/clear-search-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionId
        })
      });
    } catch (error) {
      console.warn('Failed to clear backend search context:', error);
    }
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

  // ===== ENHANCED TRACKING WITH CONTEXT =====

  async trackFavorite(placeName, placeId, city, lat, lon) {
    try {
      await this.trackInteraction('favorite', placeName, placeId, city, lat, lon, {
        interaction_strength: 'high',
        user_preference_signal: 'strong_positive',
        search_context: this.getSearchContextSummary()
      });
      
      await this.updateUserActivity('favorite', placeName, city);
      
      console.log('❤️ Enhanced favorite tracked:', placeName);
      
      // NOTE: No home refresh needed since home is static
      console.log('🏠 Home is static - no refresh needed');
      
    } catch (error) {
      console.warn('⚠️ Failed to track favorite:', error);
    }
  }

  async trackAddToItinerary(placeName, placeId, city, lat, lon) {
    try {
      await this.trackInteraction('add_to_itinerary', placeName, placeId, city, lat, lon, {
        interaction_strength: 'high',
        user_intent_signal: 'planning',
        search_context: this.getSearchContextSummary()
      });
      
      await this.updateUserActivity('itinerary', placeName, city);
      
      console.log('✈️ Enhanced itinerary add tracked:', placeName);
      
      // NOTE: No home refresh needed since home is static
      console.log('🏠 Home is static - no refresh needed');
      
    } catch (error) {
      console.warn('⚠️ Failed to track itinerary add:', error);
    }
  }

  async trackPlaceView(placeName, placeId, city, lat, lon, index = null) {
    try {
      await this.trackInteraction('view', placeName, placeId, city, lat, lon, {
        view_index: index,
        view_timestamp: Date.now(),
        search_context: this.getSearchContextSummary()
      });
      console.log('👁️ Enhanced place view tracked:', placeName);
    } catch (error) {
      console.warn('⚠️ Failed to track place view:', error);
    }
  }

  async trackInteraction(interactionType, placeName, placeId, city, lat, lon, metadata = {}) {
    try {
      const interactionData = {
        interaction_type: interactionType,
        place_name: placeName,
        place_id: placeId,
        city,
        lat,
        lon,
        user_id: this.userId,
        session_id: this.sessionId,
        metadata: metadata,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`${this.baseURL}/ml/track-interaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(interactionData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`🎯 ${interactionType} tracked:`, placeName);
        return result;
      }
    } catch (error) {
      console.warn(`⚠️ Failed to track ${interactionType}:`, error);
    }
  }

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
          session_id: this.sessionId,
          real_time_update: true
        })
      });

      if (response.ok) {
        console.log('🔄 User activity updated (but home stays static):', activityType);
      }
    } catch (error) {
      console.warn('⚠️ Failed to update user activity:', error);
    }
  }

  // ===== NO MORE HOME REFRESH METHODS =====

  // Remove all home refresh functionality since home is static
  // scheduleContextAwareRecommendationRefresh() - REMOVED
  // triggerContextAwareHomeRecommendationRefresh() - REMOVED

  // ===== UTILITY METHODS =====

  async migrateAnonymousData(userId) {
    try {
      console.log('🔄 Starting anonymous data migration...');
      
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
        console.log('✅ Anonymous data migrated:', {
          migrated_activities: data.migrated_activities || 0
        });
        
        // Note: No home refresh needed since home is static
        console.log('🏠 Home is static - no refresh after migration');
        return data;
      }
    } catch (error) {
      console.warn('⚠️ Failed to migrate anonymous data:', error);
    }
  }

  // ===== DEBUG & TESTING METHODS =====

  async forceAIRecommendations(city, activities, time) {
    try {
      console.log('🧪 Testing AI recommendations force mode');
      
      // Create some fake activity first if user has none
      if (this.userId || this.sessionId) {
        console.log('📝 Creating test interactions...');
        await this.trackInteraction('search', 'Test Museum', 'test_museum', city);
        await this.trackInteraction('view', 'Test Restaurant', 'test_restaurant', city);
        await this.trackInteraction('favorite', 'Test Landmark', 'test_landmark', city);
        
        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Then search
      return await this.searchWithMLTracking(city, activities, time);
    } catch (error) {
      console.error('❌ Force AI recommendations failed:', error);
      throw error;
    }
  }

  async testMLSystem() {
    console.log('🧪 Testing ML System (STATIC HOME VERSION)...');
    
    try {
      // 1. Test home recommendations (should be static)
      console.log('🏠 Testing static home recommendations...');
      const homeRecs = await this.getHomeRecommendations(6);
      console.log('Home recommendations (should be empty/static):', homeRecs);
      
      // 2. Test search tracking
      console.log('📝 Testing search tracking...');
      await this.trackSearch('Paris', ['Cultural', 'Gastronomy'], '2-4h');
      
      // 3. Test context
      console.log('🎯 Testing search context...');
      const context = this.getSearchContextSummary();
      console.log('Context:', context);
      
      // 4. Test search with AI
      console.log('🔍 Testing search with AI...');
      const searchResults = await this.searchWithMLTracking('Rome', ['Cultural'], '2-4h');
      
      const aiCount = searchResults.sources?.ai_personalized || 0;
      console.log(`✅ Test complete - AI recommendations: ${aiCount}`);
      
      return {
        success: true,
        aiRecommendations: aiCount,
        totalResults: searchResults.recommendations?.length || 0,
        homeIsStatic: homeRecs.recommendations?.recommendation_type === 'static_home'
      };
      
    } catch (error) {
      console.error('❌ ML System test failed:', error);
      return { success: false, error: error.message };
    }
  }

  // ===== ADDITIONAL UTILITY METHODS =====

  async getUserStats(userId = null) {
    const targetUserId = userId || this.userId;
    if (!targetUserId) return null;

    try {
      const response = await fetch(`${this.baseURL}/ml/user-stats/${targetUserId}`);
      if (response.ok) {
        const data = await response.json();
        return data.stats;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load user stats:', error);
    }
    return null;
  }

  async getTrendingPlaces(city = null, limit = 10) {
    try {
      const params = new URLSearchParams();
      if (city) params.append('city', city);
      params.append('limit', limit.toString());

      const response = await fetch(`${this.baseURL}/ml/trending?${params}`);
      if (response.ok) {
        const data = await response.json();
        return data.trending_places || [];
      }
    } catch (error) {
      console.warn('⚠️ Failed to load trending places:', error);
    }
    return [];
  }

  trackPageView(pageName) {
    this.pageViews = (this.pageViews || 0) + 1;
    this.sessionStartTime = this.sessionStartTime || Date.now();
    
    console.log(`📄 Page view tracked: ${pageName}`);
    
    if (this.currentPage && this.pageStartTime) {
      const timeSpent = Date.now() - this.pageStartTime;
      this.trackPageEngagement(this.currentPage, timeSpent);
    }
    
    this.currentPage = pageName;
    this.pageStartTime = Date.now();
  }

  trackPageExit(pageName) {
    if (this.pageStartTime) {
      const timeSpent = Date.now() - this.pageStartTime;
      this.trackPageEngagement(pageName, timeSpent);
    }
  }

  async trackPageEngagement(pageName, timeSpent) {
    try {
      const engagementData = {
        page_name: pageName,
        time_spent: timeSpent,
        user_id: this.userId,
        session_id: this.sessionId,
        timestamp: new Date().toISOString()
      };

      if (timeSpent > 5000) { // 5+ seconds
        await fetch(`${this.baseURL}/ml/track-page-engagement`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(engagementData)
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to track page engagement:', error);
    }
  }

  getDebugInfo() {
    const contextSummary = this.getSearchContextSummary();
    
    return {
      version: '2.1.0_static_home',
      sessionId: this.sessionId ? this.sessionId.substring(0, 8) + '...' : null,
      userId: this.userId ? this.userId.substring(0, 8) + '...' : null,
      userType: this.userId ? 'authenticated' : 'anonymous',
      searchContext: contextSummary,
      homePageBehavior: 'always_static',
      features: [
        'static_home_page',
        'ai_in_search_results_only',
        'real_time_learning_for_search',
        'enhanced_personalization_search_only',
        'context_awareness_search_only',
        'no_home_recommendations_refresh'
      ]
    };
  }

  clearTrackingData() {
    console.log('🚪 Clearing tracking data');
    sessionStorage.removeItem('session_id');
    sessionStorage.removeItem(`search_context_${this.sessionId}`);
    localStorage.removeItem('user_id');
    
    this.userId = null;
    this.sessionId = this.initializeSession();
    this.currentSearchContext = null;
    this.lastSearchTime = null;
  }
}

// Export singleton instance
const enhancedTrackingService = new EnhancedTrackingService();

// Debug în development
if (process.env.NODE_ENV === 'development') {
  window.enhancedTrackingService = enhancedTrackingService;
  console.log('🚀 STATIC HOME tracking service available as window.enhancedTrackingService');
  
  // Add test methods to window for easy debugging
  window.testMLSystem = () => enhancedTrackingService.testMLSystem();
  window.forceAI = (city, activities, time) => enhancedTrackingService.forceAIRecommendations(city, activities, time);
}

export default enhancedTrackingService;