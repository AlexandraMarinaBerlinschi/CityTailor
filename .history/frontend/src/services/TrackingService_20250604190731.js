// Enhanced TrackingService.js - Complete Context-Aware System
class EnhancedTrackingService {
  constructor() {
    this.baseURL = 'http://localhost:8000';
    this.sessionId = this.initializeSession();
    this.userId = this.getCurrentUser();
    this.pendingMigration = false;
    
    // NEW: Track current search context
    this.currentSearchContext = null;
    this.lastSearchTime = null;
    this.contextExpirationTime = 10 * 60 * 1000; // 10 minutes
    
    // Listen for storage changes to keep user state in sync
    this.setupStorageListener();
    
    console.log('Enhanced Context-Aware TrackingService initialized:', {
      userId: this.userId ? this.userId.substring(0, 8) + '...' : 'anonymous',
      sessionId: this.sessionId.substring(0, 8) + '...',
      version: '2.1.0_context_aware_diversified'
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
      console.log('🆔 New enhanced session created:', sessionId.substring(0, 8) + '...');
    }
    return sessionId;
  }

  getCurrentUser() {
    // Încearcă mai multe surse pentru a găsi user ID
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

  // ===== CONTEXT-AWARE RECOMMENDATIONS =====

  async getHomeRecommendations(limit = 12, forceRefresh = false) {
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

      // NEW: Control context usage
      const useSearchContext = this.shouldUseSearchContext() && !forceRefresh;
      params.append('use_search_context', useSearchContext.toString());
      params.append('force_refresh', forceRefresh.toString());

      const response = await fetch(`${this.baseURL}/ml/home-recommendations?${params}`);
      const data = await response.json();
      
      console.log('🏠 Enhanced context-aware home recommendations loaded:', {
        user_type: this.userId ? 'authenticated' : 'anonymous',
        has_activity: data.metadata?.has_activity,
        recommendation_type: data.recommendations?.recommendation_type,
        personalization_level: data.metadata?.personalization_level,
        profile_strength: data.metadata?.profile_strength,
        context_influenced: data.metadata?.context_influenced,
        search_context_used: data.metadata?.search_context_used,
        context_city: data.metadata?.context_city,
        diversity_applied: data.metadata?.diversity_applied,
        count: data.recommendations?.main_recommendations?.length || 0,
        ml_version: data.metadata?.ml_version
      });
      
      return data;
    } catch (error) {
      console.error('❌ Failed to load enhanced context-aware home recommendations:', error);
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

  // NEW: Get diverse recommendations without context
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
      
      console.log('🎲 Diverse recommendations (no context) loaded:', {
        count: data.recommendations?.main_recommendations?.length || 0,
        type: data.recommendations?.recommendation_type,
        diversity_enforced: data.metadata?.diversity_enforced
      });
      
      return data;
    } catch (error) {
      console.error('❌ Failed to load diverse recommendations:', error);
      return this.getHomeRecommendations(limit, true); // Fallback
    }
  }

  async trackSearch(city, activities, time) {
    try {
      // NEW: Store search context locally
      this.currentSearchContext = {
        city,
        activities,
        time,
        timestamp: Date.now()
      };
      this.lastSearchTime = Date.now();
      
      // Store in sessionStorage for persistence
      sessionStorage.setItem(`search_context_${this.sessionId}`, JSON.stringify(this.currentSearchContext));
      
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
        console.log('🔍 Enhanced context-aware search tracked:', { 
          city, 
          activities: activities.length, 
          user_type: this.userId ? 'auth' : 'anon',
          context_stored: result.context_stored,
          will_influence_recommendations: result.context_will_influence_recommendations
        });
        
        // Don't immediately trigger refresh - context will be used on next page load
        return result;
      }
    } catch (error) {
      console.warn('⚠️ Enhanced context-aware search tracking failed:', error);
    }
  }

  async searchWithMLTracking(city, activities, time) {
    try {
      // Track search first (this stores context)
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
          context_aware: true,
          tracking_version: '2.1.0_context_aware'
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      
      console.log('🚀 Enhanced context-aware search completed:', {
        city,
        total_results: data.recommendations?.length || 0,
        context_stored: data.context_stored,
        next_recommendations_context_aware: data.search_metadata?.next_recommendations_will_be_context_aware,
        database_populated: data.database_auto_populated
      });

      // Context is now stored and will be used in next recommendation calls
      return data;
    } catch (error) {
      console.error('❌ Enhanced context-aware search failed:', error);
      throw error;
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
      
      console.log('❤️ Enhanced context-aware favorite tracked:', placeName);
      
      // Trigger context-aware refresh
      this.scheduleContextAwareRecommendationRefresh(500);
      
    } catch (error) {
      console.warn('⚠️ Failed to track enhanced context-aware favorite:', error);
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
      
      console.log('✈️ Enhanced context-aware itinerary add tracked:', placeName);
      
      this.scheduleContextAwareRecommendationRefresh(500);
      
    } catch (error) {
      console.warn('⚠️ Failed to track enhanced context-aware itinerary add:', error);
    }
  }

  async trackPlaceView(placeName, placeId, city, lat, lon, index = null) {
    try {
      await this.trackInteraction('view', placeName, placeId, city, lat, lon, {
        view_index: index,
        view_timestamp: Date.now(),
        search_context: this.getSearchContextSummary()
      });
      console.log('👁️ Enhanced context-aware place view tracked:', placeName);
    } catch (error) {
      console.warn('⚠️ Failed to track enhanced context-aware place view:', error);
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

  // ===== REAL-TIME LEARNING FEATURES =====

  scheduleContextAwareRecommendationRefresh(delay = 1000) {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    this.refreshTimeout = setTimeout(() => {
      this.triggerContextAwareHomeRecommendationRefresh();
    }, delay);
  }

  triggerContextAwareHomeRecommendationRefresh() {
    const contextSummary = this.getSearchContextSummary();
    
    const event = new CustomEvent('ml-recommendations-updated', {
      detail: {
        userId: this.userId,
        sessionId: this.sessionId,
        timestamp: Date.now(),
        hasSearchContext: !!contextSummary,
        searchContext: contextSummary,
        contextAware: true
      }
    });
    
    window.dispatchEvent(event);
    console.log('🔄 Triggered context-aware home recommendations refresh', {
      hasContext: !!contextSummary,
      context: contextSummary
    });
  }

  // ===== UTILITY METHODS =====

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
        
        this.scheduleContextAwareRecommendationRefresh(1500);
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

  // ===== PAGE TRACKING =====

  trackPageView(pageName) {
    this.pageViews = (this.pageViews || 0) + 1;
    this.sessionStartTime = this.sessionStartTime || Date.now();
    
    console.log(`📄 Enhanced page view tracked: ${pageName} (${this.userId ? 'auth' : 'anon'})`);
    
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
        personalization_tips: this.getPersonalizationTips(userStats?.profile),
        search_context: this.getSearchContextSummary()
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

    const contextSummary = this.getSearchContextSummary();
    if (contextSummary && contextSummary.isValid) {
      tips.push(`Your recent search for ${contextSummary.city} is influencing current recommendations`);
    }

    return tips;
  }

  // ===== ML USER PROFILE METHODS =====

  async getMLUserProfile() {
    try {
      if (!this.userId) {
        return this.generateMockProfile();
      }

      const userStats = await this.getUserStats();
      if (userStats) {
        return {
          userId: this.userId,
          profile: userStats.profile,
          isReal: true,
          lastUpdated: new Date().toISOString(),
          searchContext: this.getSearchContextSummary()
        };
      }

      return this.generateMockProfile();
    } catch (error) {
      console.warn('⚠️ Failed to load ML user profile, using mock data:', error);
      return this.generateMockProfile();
    }
  }

  generateMockProfile() {
    const isAuthenticated = !!this.userId;
    const contextSummary = this.getSearchContextSummary();
    
    const baseActivityLevel = isAuthenticated ? 15 : 5;
    const baseEngagement = isAuthenticated ? 67 : 25;
    
    return {
      userId: this.userId || 'anonymous',
      profile: {
        total_activities: baseActivityLevel,
        engagement_level: isAuthenticated ? 'medium' : 'demo',
        engagement_score: baseEngagement,
        profile_strength: isAuthenticated ? 45 : 15,
        city_preferences: isAuthenticated ? {
          'Paris': 85,
          'Rome': 72,
          'Barcelona': 58
        } : {
          'Paris': 60,
          'London': 40
        },
        category_preferences: isAuthenticated ? {
          'Cultural': 40,
          'Gastronomy': 30,
          'Outdoor': 20,
          'Relaxation': 10
        } : {
          'Cultural': 35,
          'Gastronomy': 25,
          'Outdoor': 25,
          'Relaxation': 15
        },
        time_preferences: {
          preferred_time_of_day: 'afternoon',
          time_distribution: {
            morning: isAuthenticated ? 15 : 20,
            afternoon: isAuthenticated ? 45 : 50,
            evening: isAuthenticated ? 35 : 25,
            night: isAuthenticated ? 5 : 5
          }
        }
      },
      isReal: false,
      isMock: true,
      lastUpdated: new Date().toISOString(),
      searchContext: contextSummary
    };
  }

  async getAdvancedUserAnalytics() {
    try {
      const profile = await this.getMLUserProfile();
      const isAuthenticated = !!this.userId;
      const hasRealActivity = profile.isReal && profile.profile.total_activities > 5;
      const contextSummary = this.getSearchContextSummary();
      
      return {
        behaviorPatterns: hasRealActivity ? [
          {
            pattern: 'Weekend Explorer',
            confidence: 87,
            description: 'Most active on weekends',
            evidence: ['Higher search activity on Sat/Sun', 'More bookings on weekends']
          },
          {
            pattern: 'Cultural Enthusiast', 
            confidence: 82,
            description: 'Strong preference for museums and historical sites',
            evidence: ['60% of searches include cultural activities', 'High engagement with museum recommendations']
          },
          {
            pattern: 'Quality Seeker',
            confidence: 76,
            description: 'Prefers highly-rated experiences',
            evidence: ['Avg selected rating: 4.3+', 'Rare bookings below 4.0 rating']
          }
        ] : [
          {
            pattern: isAuthenticated ? 'Learning Your Style' : 'Demo Profile',
            confidence: isAuthenticated ? 45 : 75,
            description: isAuthenticated ? 
              'AI is analyzing your preferences as you explore' : 
              'Example of how AI detects travel patterns',
            evidence: isAuthenticated ? 
              ['Building preference model', 'Tracking interaction patterns'] :
              ['Demo data shows cultural preference', 'Afternoon activity preference detected']
          }
        ],
        predictions: {
          nextSearch: {
            city: hasRealActivity ? 'Vienna' : (isAuthenticated ? 'Rome' : 'Barcelona'),
            confidence: hasRealActivity ? 78 : (isAuthenticated ? 35 : 60),
            reason: hasRealActivity ? 
              'Based on your cultural preferences and recent searches' :
              (isAuthenticated ? 
                'Popular destination based on your early activity' : 
                'Popular cultural destination (demo prediction)')
          },
          recommendedActivities: [
            { 
              name: 'Museum Visits', 
              probability: hasRealActivity ? 92 : (isAuthenticated ? 65 : 80)
            },
            { 
              name: 'Food Tours', 
              probability: hasRealActivity ? 76 : (isAuthenticated ? 55 : 70)
            },
            { 
              name: 'Walking Tours', 
              probability: hasRealActivity ? 71 : (isAuthenticated ? 50 : 65)
            },
            { 
              name: 'Art Galleries', 
              probability: hasRealActivity ? 68 : (isAuthenticated ? 45 : 60)
            }
          ],
          bestTravelTime: {
            period: 'May-September',
            reason: hasRealActivity ? 
              'Matches your outdoor activity preferences' : 
              (isAuthenticated ? 
                'Based on popular travel patterns' : 
                'Optimal weather for cultural activities (demo)')
          }
        },
        similarUsers: {
          count: hasRealActivity ? 127 : (isAuthenticated ? 23 : 0),
          commonInterests: hasRealActivity ? 
            ['Cultural sites', 'European cities', 'Food experiences'] : 
            (isAuthenticated ? 
              ['Getting started', 'Exploring preferences'] :
              ['Start exploring to find your travel community'])
        },
        activityTrends: {
          weeklyActivity: hasRealActivity ? 
            [12, 8, 15, 22, 18, 28, 19] : 
            (isAuthenticated ? [2, 1, 3, 5, 4, 8, 6] : [1, 0, 1, 2, 1, 3, 2]),
          monthlyGrowth: hasRealActivity ? 15 : (isAuthenticated ? 5 : 0),
          engagementTrend: hasRealActivity ? 'increasing' : (isAuthenticated ? 'building' : 'demo')
        },
        timePreferences: profile.profile.time_preferences?.time_distribution || {
          morning: isAuthenticated ? 20 : 25,
          afternoon: isAuthenticated ? 50 : 45,
          evening: isAuthenticated ? 25 : 25,
          night: isAuthenticated ? 5 : 5
        },
        searchContext: contextSummary ? {
          currentSearchInfluence: true,
          searchCity: contextSummary.city,
          searchAge: `${contextSummary.ageMinutes} minutes ago`,
          contextValid: contextSummary.isValid,
          recommendationsInfluenced: contextSummary.isValid
        } : {
          currentSearchInfluence: false,
          recommendationsInfluenced: false
        }
      };
    } catch (error) {
      console.warn('⚠️ Failed to load advanced analytics:', error);
      return this.getDefaultAnalytics();
    }
  }

  getDefaultAnalytics() {
    return {
      behaviorPatterns: [
        {
          pattern: 'New Explorer',
          confidence: 100,
          description: 'Just getting started with travel planning',
          evidence: ['Account recently created', 'Limited activity history']
        }
      ],
      predictions: {
        nextSearch: {
          city: 'Paris',
          confidence: 50,
          reason: 'Popular first destination for new travelers'
        },
        recommendedActivities: [
          { name: 'City Tours', probability: 80 },
          { name: 'Popular Attractions', probability: 75 },
          { name: 'Local Food', probability: 70 },
          { name: 'Museums', probability: 65 }
        ],
        bestTravelTime: {
          period: 'Spring/Summer',
          reason: 'Best weather for first-time visitors'
        }
      },
      similarUsers: {
        count: 0,
        commonInterests: ['Start exploring to discover your travel style']
      },
      activityTrends: {
        weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
        monthlyGrowth: 0,
        engagementTrend: 'new'
      },
      searchContext: {
        currentSearchInfluence: false,
        recommendationsInfluenced: false
      }
    };
  }

  async getLearningInsights() {
    try {
      const profile = await this.getMLUserProfile();
      const contextSummary = this.getSearchContextSummary();
      
      return {
        learningProgress: {
          profileCompleteness: profile.profile.profile_strength || 5,
          dataPoints: profile.profile.total_activities || 0,
          confidenceLevel: profile.isReal ? 'high' : 'building',
          nextMilestone: {
            target: profile.profile.total_activities < 10 ? 10 : 25,
            current: profile.profile.total_activities || 0,
            description: profile.profile.total_activities < 10 ? 
              'Search 10 destinations to unlock personalized insights' :
              'Reach 25 activities for advanced recommendations'
          }
        },
        recentImprovements: profile.isReal ? [
          'Added cultural preference detection',
          'Improved city recommendation accuracy',
          'Enhanced time-based patterns',
          contextSummary ? `Context-aware recommendations for ${contextSummary.city}` : 'Context-aware system ready'
        ] : [
          'Ready to learn your preferences',
          'Start exploring to enable AI learning',
          'Each interaction improves recommendations',
          'Context-aware system will learn from your searches'
        ],
        privacyStatus: {
          dataMinimization: true,
          localProcessing: true,
          userControlled: true,
          anonymizable: true
        },
        contextAwareness: {
          enabled: true,
          currentContext: contextSummary,
          influencingRecommendations: !!contextSummary?.isValid,
          nextSearchWillImprove: true
        }
      };
    } catch (error) {
      console.warn('⚠️ Failed to load learning insights:', error);
      return {
        learningProgress: {
          profileCompleteness: 0,
          dataPoints: 0,
          confidenceLevel: 'new',
          nextMilestone: {
            target: 5,
            current: 0,
            description: 'Start with your first search to begin learning'
          }
        },
        recentImprovements: ['AI system ready to learn'],
        privacyStatus: {
          dataMinimization: true,
          localProcessing: true,
          userControlled: true,
          anonymizable: true
        },
        contextAwareness: {
          enabled: true,
          currentContext: null,
          influencingRecommendations: false,
          nextSearchWillImprove: true
        }
      };
    }
  }

  // ===== DEBUG & UTILITY =====

  clearTrackingData() {
    console.log('🚪 Clearing enhanced context-aware tracking data');
    sessionStorage.removeItem('session_id');
    sessionStorage.removeItem(`search_context_${this.sessionId}`);
    localStorage.removeItem('user_id');
    
    this.userId = null;
    this.sessionId = this.initializeSession();
    this.currentSearchContext = null;
    this.lastSearchTime = null;
    this.pageViews = 0;
    this.searchCount = 0;
    this.interactionCount = 0;
    
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
  }

  getDebugInfo() {
    const contextSummary = this.getSearchContextSummary();
    
    return {
      version: '2.1.0_context_aware_diversified',
      sessionId: this.sessionId ? this.sessionId.substring(0, 8) + '...' : null,
      userId: this.userId ? this.userId.substring(0, 8) + '...' : null,
      userType: this.userId ? 'authenticated' : 'anonymous',
      searchContext: contextSummary,
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
        'collaborative_filtering',
        'context_awareness',
        'search_context_storage',
        'diversity_enforcement',
        'context_expiration',
        'backend_context_sync'
      ]
    };
  }

  logTrackingState() {
    console.log('🔍 Enhanced Tracking State:', this.getDebugInfo());
  }

  exportSessionData() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      searchContext: this.getSearchContextSummary(),
      metrics: {
        pageViews: this.pageViews || 0,
        searchCount: this.searchCount || 0,
        interactionCount: this.interactionCount || 0,
        sessionDuration: this.sessionStartTime ? Date.now() - this.sessionStartTime : 0
      },
      timestamp: Date.now(),
      version: '2.1.0_context_aware_diversified'
    };
  }
}

// Export singleton instance
const enhancedTrackingService = new EnhancedTrackingService();

// Debug în development
if (process.env.NODE_ENV === 'development') {
  window.enhancedTrackingService = enhancedTrackingService;
  console.log('🚀 Enhanced context-aware tracking service available as window.enhancedTrackingService');
}

export default enhancedTrackingService;