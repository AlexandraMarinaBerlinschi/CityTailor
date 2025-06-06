// Enhanced TrackingService.js - Improved ML integration and real-time learning
class EnhancedTrackingService {
  constructor() {
    this.baseURL = 'http://localhost:8000';
    this.sessionId = this.initializeSession();
    this.userId = this.getCurrentUser();
    this.pendingMigration = false;
    
    console.log('Enhanced TrackingService initialized:', {
      userId: this.userId ? this.userId.substring(0, 8) + '...' : 'anonymous',
      sessionId: this.sessionId.substring(0, 8) + '...',
      version: '2.1.0'
    });
  }

  initializeSession() {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      sessionStorage.setItem('session_id', sessionId);
      console.log('🆔 New enhanced session created:', sessionId.substring(0, 8) + '...');
    }
    return sessionId;
  }

  getCurrentUser() {
    // Încearcă mai multe surse pentru a găsi user ID
    const sources = [
      () => {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
          try {
            const user = JSON.parse(currentUser);
            return user?.id;
          } catch (e) {
            console.warn('Failed to parse currentUser:', e);
          }
        }
        return null;
      },
      () => localStorage.getItem('user_id'),
      () => sessionStorage.getItem('user_id')
    ];

    for (const source of sources) {
      const userId = source();
      if (userId && userId !== 'null' && userId !== 'undefined' && userId !== 'anonymous') {
        return userId;
      }
    }
    
    return null;
  }

  async setCurrentUser(userId) {
    const oldUserId = this.userId;
    this.userId = userId;
    
    if (userId && userId !== 'anonymous') {
      console.log('👤 User authenticated in enhanced tracking:', userId.substring(0, 8) + '...');
      
      // Migrează datele anonime dacă utilizatorul s-a autentificat recent
      if (!oldUserId && !this.pendingMigration) {
        this.pendingMigration = true;
        setTimeout(async () => {
          await this.migrateAnonymousData(userId);
          this.pendingMigration = false;
        }, 1000);
      }
    } else {
      console.log('👤 User logged out - continuing as anonymous');
    }
  }

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
      
      console.log('🏠 Enhanced home recommendations loaded:', {
        user_type: this.userId ? 'authenticated' : 'anonymous',
        has_activity: data.metadata?.has_activity,
        recommendation_type: data.recommendations?.recommendation_type,
        personalization_level: data.metadata?.personalization_level,
        profile_strength: data.metadata?.profile_strength,
        count: data.recommendations?.main_recommendations?.length || 0,
        ml_version: data.metadata?.ml_version
      });
      
      return data;
    } catch (error) {
      console.error('❌ Failed to load enhanced home recommendations:', error);
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

  async trackSearch(city, activities, time) {
    try {
      const searchData = {
        city,
        activities,
        time,
        user_id: this.userId,
        session_id: this.sessionId,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`${this.baseURL}/ml/track-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🔍 Enhanced search tracked:', { 
          city, 
          activities: activities.length, 
          user_type: this.userId ? 'auth' : 'anon'
        });
        
        // Trigger real-time learning update
        this.scheduleRecommendationRefresh();
        
        return result;
      }
    } catch (error) {
      console.warn('⚠️ Enhanced search tracking failed:', error);
    }
  }

  async trackPlaceView(placeName, placeId, city, lat, lon, index = null) {
    try {
      await this.trackInteraction('view', placeName, placeId, city, lat, lon, {
        view_index: index,
        view_timestamp: Date.now()
      });
      console.log('👁️ Enhanced place view tracked:', placeName);
    } catch (error) {
      console.warn('⚠️ Failed to track enhanced place view:', error);
    }
  }

  async trackFavorite(placeName, placeId, city, lat, lon) {
    try {
      await this.trackInteraction('favorite', placeName, placeId, city, lat, lon, {
        interaction_strength: 'high',
        user_preference_signal: 'strong_positive'
      });
      
      // Immediate activity update for home refresh
      await this.updateUserActivity('favorite', placeName, city);
      
      console.log('❤️ Enhanced favorite tracked with home update:', placeName);
      
      // Trigger immediate recommendation refresh
      this.scheduleRecommendationRefresh(500); // faster refresh for high-value interactions
      
    } catch (error) {
      console.warn('⚠️ Failed to track enhanced favorite:', error);
    }
  }

  async trackAddToItinerary(placeName, placeId, city, lat, lon) {
    try {
      await this.trackInteraction('add_to_itinerary', placeName, placeId, city, lat, lon, {
        interaction_strength: 'high',
        user_intent_signal: 'planning'
      });
      
      // Immediate activity update for home refresh
      await this.updateUserActivity('itinerary', placeName, city);
      
      console.log('✈️ Enhanced itinerary add tracked with home update:', placeName);
      
      // Trigger immediate recommendation refresh
      this.scheduleRecommendationRefresh(500);
      
    } catch (error) {
      console.warn('⚠️ Failed to track enhanced itinerary add:', error);
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
        console.log(`🎯 Enhanced ${interactionType} tracked:`, placeName);
        return result;
      }
    } catch (error) {
      console.warn(`⚠️ Failed to track enhanced ${interactionType}:`, error);
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
        console.log('🔄 Enhanced user activity updated for home refresh:', activityType);
      }
    } catch (error) {
      console.warn('⚠️ Failed to update enhanced user activity:', error);
    }
  }

  async searchWithMLTracking(city, activities, time) {
    try {
      // Track search first with enhanced system
      await this.trackSearch(city, activities, time);
      
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
          tracking_version: '2.1.0'
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      
      console.log('🚀 Enhanced search with ML tracking completed:', {
        city,
        total_results: data.recommendations?.length || 0,
        ml_enhanced: data.ml_enhanced,
        database_populated: data.database_auto_populated,
        enhanced_tracking: true
      });

      // Trigger recommendation refresh after successful search
      this.scheduleRecommendationRefresh(2000);

      return data;
    } catch (error) {
      console.error('❌ Enhanced search failed:', error);
      throw error;
    }
  }

  async migrateAnonymousData(userId) {
    try {
      console.log('🔄 Starting anonymous data migration for user:', userId.substring(0, 8) + '...');
      
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
        console.log('✅ Anonymous data migrated successfully:', {
          migrated_activities: data.migrated_activities || 0,
          user: userId.substring(0, 8) + '...'
        });
        
        // Trigger recommendation refresh after migration
        this.scheduleRecommendationRefresh(1500);
        
        return data;
      }
    } catch (error) {
      console.warn('⚠️ Failed to migrate anonymous data:', error);
    }
  }

  async getUserStats(userId = null) {
    const targetUserId = userId || this.userId;
    if (!targetUserId) {
      console.warn('⚠️ No user ID available for stats request');
      return null;
    }

    try {
      const response = await fetch(`${this.baseURL}/ml/user-stats/${targetUserId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Enhanced user stats loaded:', {
          user: targetUserId.substring(0, 8) + '...',
          engagement_level: data.stats?.profile?.engagement_level,
          total_activities: data.stats?.profile?.total_activities,
          profile_strength: data.stats?.profile?.profile_strength
        });
        return data.stats;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load enhanced user stats:', error);
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
        console.log('📈 Enhanced trending places loaded:', {
          count: data.trending_places?.length || 0,
          city_filter: city
        });
        return data.trending_places || [];
      }
    } catch (error) {
      console.warn('⚠️ Failed to load enhanced trending places:', error);
    }
    return [];
  }

  // ===== REAL-TIME LEARNING FEATURES =====

  scheduleRecommendationRefresh(delay = 1000) {
    // Previne multiple refresh-uri simultane
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    this.refreshTimeout = setTimeout(() => {
      this.triggerHomeRecommendationRefresh();
    }, delay);
  }

  triggerHomeRecommendationRefresh() {
    // Trigger event pentru componentele React să își refresheze recomandările
    const event = new CustomEvent('ml-recommendations-updated', {
      detail: {
        userId: this.userId,
        sessionId: this.sessionId,
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
    console.log('🔄 Triggered home recommendations refresh');
  }

  async trackRecommendationInteraction(recommendation, interactionType, metadata = {}) {
    try {
      const interactionData = {
        recommendation_id: recommendation.place_id || recommendation.id,
        recommendation_name: recommendation.name,
        interaction_type: interactionType, // 'click', 'ignore', 'favorite', 'itinerary'
        recommendation_source: recommendation.data_source,
        ml_score: recommendation.score,
        user_id: this.userId,
        session_id: this.sessionId,
        metadata: {
          ...metadata,
          recommendation_reason: recommendation.recommendation_reason,
          position_in_list: metadata.position
        }
      };

      const response = await fetch(`${this.baseURL}/ml/track-recommendation-interaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(interactionData)
      });

      if (response.ok) {
        console.log(`🎯 Recommendation ${interactionType} tracked:`, recommendation.name);
        
        // Pentru interacțiuni pozitive, refresh rapid
        if (['click', 'favorite', 'itinerary'].includes(interactionType)) {
          this.scheduleRecommendationRefresh(500);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to track recommendation ${interactionType}:`, error);
    }
  }

  async trackSearchRefinement(originalSearch, refinedSearch, reason) {
    try {
      const refinementData = {
        original_search: originalSearch,
        refined_search: refinedSearch,
        refinement_reason: reason,
        user_id: this.userId,
        session_id: this.sessionId,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`${this.baseURL}/ml/track-search-refinement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(refinementData)
      });

      if (response.ok) {
        console.log('🔍 Search refinement tracked:', reason);
      }
    } catch (error) {
      console.warn('⚠️ Failed to track search refinement:', error);
    }
  }

  // ===== ENGAGEMENT ANALYTICS =====

  async trackEngagementMetrics() {
    const metrics = {
      session_duration: Date.now() - this.sessionStartTime,
      page_views: this.pageViews || 0,
      search_count: this.searchCount || 0,
      interaction_count: this.interactionCount || 0,
      user_id: this.userId,
      session_id: this.sessionId
    };

    try {
      const response = await fetch(`${this.baseURL}/ml/track-engagement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metrics)
      });

      if (response.ok) {
        console.log('📊 Engagement metrics tracked:', metrics);
      }
    } catch (error) {
      console.warn('⚠️ Failed to track engagement metrics:', error);
    }
  }

  // ===== ADVANCED FEATURES =====

  async getPersonalizedInsights() {
    if (!this.userId) {
      return { error: 'User must be authenticated for personalized insights' };
    }

    try {
      const [userStats, trendingPlaces] = await Promise.all([
        this.getUserStats(),
        this.getTrendingPlaces()
      ]);

      const insights = {
        user_profile: userStats?.profile,
        engagement_analysis: {
          level: userStats?.profile?.engagement_level,
          score: userStats?.profile?.engagement_score,
          strength: userStats?.profile?.profile_strength
        },
        recommendations_ready: userStats?.recommendations_ready,
        next_milestone: userStats?.next_milestone,
        trending_opportunities: trendingPlaces.slice(0, 3),
        personalization_tips: this.getPersonalizationTips(userStats?.profile)
      };

      console.log('🧠 Personalized insights generated:', insights);
      return insights;
    } catch (error) {
      console.error('❌ Failed to get personalized insights:', error);
      return { error: error.message };
    }
  }

  getPersonalizationTips(profile) {
    if (!profile) return [];

    const tips = [];
    
    if (profile.total_activities < 5) {
      tips.push("Search for more destinations to improve recommendations");
    }
    
    if (Object.keys(profile.city_preferences || {}).length < 2) {
      tips.push("Explore different cities to diversify your profile");
    }
    
    if (profile.engagement_level === 'low') {
      tips.push("Add places to favorites to get better personalized suggestions");
    }

    if (Object.keys(profile.category_preferences || {}).length < 3) {
      tips.push("Try different activity types to enhance recommendations");
    }

    return tips;
  }

  // ===== UTILITY METHODS =====

  trackPageView(pageName) {
    this.pageViews = (this.pageViews || 0) + 1;
    this.sessionStartTime = this.sessionStartTime || Date.now();
    
    console.log(`📄 Enhanced page view tracked: ${pageName} (${this.userId ? 'auth' : 'anon'})`);
    
    // Track page engagement pentru ML
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
      console.log(`⏱️ Enhanced page exit tracked: ${pageName} (${timeSpent}ms)`);
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

      // Only track if user spent meaningful time on page
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

  clearTrackingData() {
    console.log('🚪 Clearing enhanced tracking data');
    sessionStorage.removeItem('session_id');
    localStorage.removeItem('user_id');
    this.userId = null;
    this.sessionId = this.initializeSession();
    this.pageViews = 0;
    this.searchCount = 0;
    this.interactionCount = 0;
    
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
  }

  getDebugInfo() {
    return {
      version: '2.1.0',
      sessionId: this.sessionId ? this.sessionId.substring(0, 8) + '...' : null,
      userId: this.userId ? this.userId.substring(0, 8) + '...' : null,
      userType: this.userId ? 'authenticated' : 'anonymous',
      sessionMetrics: {
        pageViews: this.pageViews || 0,
        searchCount: this.searchCount || 0,
        interactionCount: this.interactionCount || 0,
        sessionDuration: this.sessionStartTime ? Date.now() - this.sessionStartTime : 0
      },
      features: [
        'real_time_learning',
        'enhanced_personalization',
        'engagement_tracking',
        'anonymous_migration',
        'recommendation_feedback',
        'collaborative_filtering'
      ]
    };
  }

  logTrackingState() {
    console.log('🔍 Enhanced Tracking State:', this.getDebugInfo());
  }

  // Export session data pentru debugging
  exportSessionData() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      metrics: {
        pageViews: this.pageViews || 0,
        searchCount: this.searchCount || 0,
        interactionCount: this.interactionCount || 0,
        sessionDuration: this.sessionStartTime ? Date.now() - this.sessionStartTime : 0
      },
      timestamp: Date.now(),
      version: '2.1.0'
    };
  }
}

// Export singleton instance
const enhancedTrackingService = new EnhancedTrackingService();

// Debug în development
if (process.env.NODE_ENV === 'development') {
  window.enhancedTrackingService = enhancedTrackingService;
  console.log('🚀 Enhanced tracking service available as window.enhancedTrackingService');
}

export default enhancedTrackingService;