// src/services/EnhancedTrackingService.js - TrackingService with Real-time Learning

import axios from 'axios';
import realtimeLearningService from './RealtimeLearningService';

class EnhancedTrackingService {
  constructor() {
    this.baseURL = 'http://localhost:8000';
    this.sessionId = this.getOrCreateSessionId();
    this.userId = this.getUserId();
    this.startTime = Date.now();
    this.interactionBuffer = [];
    
    // Initialize real-time learning integration
    this.initializeRealtimeLearning();
  }

  // ====== INITIALIZATION ======

  initializeRealtimeLearning() {
    // Start session tracking
    this.trackSessionStart();
    
    // Set up periodic session updates
    setInterval(() => {
      this.updateSessionMetrics();
    }, 30000); // Every 30 seconds

    // Set up beforeunload handler for session end
    window.addEventListener('beforeunload', () => {
      this.trackSessionEnd();
    });

    console.log('🚀 Enhanced tracking with real-time learning initialized');
  }

  trackSessionStart() {
    const sessionData = {
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: Date.now(),
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      initialContext: realtimeLearningService.getCurrentContext()
    };

    realtimeLearningService.trackInteraction('session_started', sessionData);
  }

  updateSessionMetrics() {
    const currentTime = Date.now();
    const sessionDuration = (currentTime - this.startTime) / 1000; // seconds
    
    const sessionMetrics = {
      duration: sessionDuration,
      actionsCount: this.interactionBuffer.length,
      currentPage: window.location.pathname,
      context: realtimeLearningService.getCurrentContext()
    };

    realtimeLearningService.trackInteraction('session_update', sessionMetrics);
  }

  trackSessionEnd() {
    const sessionData = {
      sessionId: this.sessionId,
      userId: this.userId,
      duration: (Date.now() - this.startTime) / 1000,
      actionsCount: this.interactionBuffer.length,
      conversionRate: this.calculateConversionRate(),
      finalContext: realtimeLearningService.getCurrentContext()
    };

    realtimeLearningService.trackInteraction('session_ended', sessionData);
  }

  calculateConversionRate() {
    const conversions = this.interactionBuffer.filter(action => 
      ['favorite', 'add_to_itinerary', 'booking_started'].includes(action.type)
    ).length;
    
    return this.interactionBuffer.length > 0 ? conversions / this.interactionBuffer.length : 0;
  }

  // ====== SESSION & USER MANAGEMENT ======

  getOrCreateSessionId() {
    let sessionId = sessionStorage.getItem('tracking_session_id');
    if (!sessionId) {
      sessionId = this.generateUUID();
      sessionStorage.setItem('tracking_session_id', sessionId);
      console.log('🆔 New enhanced tracking session:', sessionId);
    }
    return sessionId;
  }

  getUserId() {
    const userId = localStorage.getItem('user_id') || sessionStorage.getItem('user_id');
    return userId;
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  getTimeSpent() {
    return (Date.now() - this.startTime) / 1000;
  }

  setUserId(userId) {
    const oldUserId = this.userId;
    this.userId = userId;
    
    if (userId) {
      localStorage.setItem('user_id', userId);
      console.log('👤 User authenticated in enhanced tracking:', userId);
      
      // Notify real-time learning of user change
      if (!oldUserId) {
        realtimeLearningService.trackInteraction('user_authenticated', {
          userId: userId,
          sessionId: this.sessionId,
          previouslyAnonymous: true
        });
      }
    }
  }

  // ====== ENHANCED TRACKING METHODS ======

  async trackSearch(city, activities, time) {
    const searchData = {
      city,
      activities,
      time,
      timestamp: Date.now(),
      context: realtimeLearningService.getCurrentContext()
    };

    // Add to interaction buffer
    this.interactionBuffer.push({
      type: 'search',
      data: searchData,
      timestamp: Date.now()
    });

    // Real-time learning
    realtimeLearningService.trackInteraction('search_performed', searchData);

    try {
      // Send to backend ML system
      const response = await axios.post(`${this.baseURL}/ml/track-search`, {
        city,
        activities,
        time,
        session_id: this.sessionId,
        user_id: this.userId,
        context: searchData.context
      });

      console.log('🔍 Enhanced search tracking completed:', {
        city,
        activities,
        user_type: this.userId ? 'authenticated' : 'anonymous',
        context_factors: Object.keys(searchData.context).length
      });
      
      return response.data;
    } catch (error) {
      console.warn('Enhanced search tracking failed:', error);
      return this.trackSearchFallback(city, activities, time);
    }
  }

  async trackPlaceView(placeName, placeId, city, lat, lon, clickPosition) {
    const viewStartTime = Date.now();
    
    const viewData = {
      placeName,
      placeId,
      city,
      lat,
      lon,
      clickPosition,
      viewStartTime,
      context: realtimeLearningService.getCurrentContext()
    };

    // Real-time learning (immediate)
    realtimeLearningService.trackInteraction('place_viewed', viewData);

    try {
      const response = await axios.post(`${this.baseURL}/ml/track-interaction`, {
        interaction_type: 'view',
        place_name: placeName,
        place_id: placeId,
        city,
        lat,
        lon,
        click_position: clickPosition,
        session_id: this.sessionId,
        user_id: this.userId,
        context: viewData.context
      });

      console.log(`👁️ Enhanced view tracking: ${placeName}`, {
        position: clickPosition,
        context: viewData.context.timeOfDay
      });
      
      return response.data;
    } catch (error) {
      console.warn('Enhanced view tracking failed:', error);
    }
  }

  async trackFavorite(placeName, placeId, city, lat, lon) {
    const favoriteData = {
      placeName,
      placeId,
      city,
      lat,
      lon,
      timestamp: Date.now(),
      context: realtimeLearningService.getCurrentContext()
    };

    // Add to interaction buffer with high priority
    this.interactionBuffer.push({
      type: 'favorite',
      data: favoriteData,
      timestamp: Date.now(),
      priority: 'high'
    });

    // Real-time learning (critical event - immediate processing)
    realtimeLearningService.trackInteraction('favorite_added', {
      ...favoriteData,
      category: this.inferCategory(placeName), // Try to infer category
      userEngagement: 'high'
    });

    try {
      const response = await axios.post(`${this.baseURL}/ml/track-interaction`, {
        interaction_type: 'favorite',
        place_name: placeName,
        place_id: placeId,
        city,
        lat,
        lon,
        session_id: this.sessionId,
        user_id: this.userId,
        context: favoriteData.context,
        priority: 'high'
      });

      console.log(`❤️ Enhanced favorite tracking: ${placeName}`, {
        user_type: this.userId ? 'authenticated' : 'anonymous',
        context: favoriteData.context.timeOfDay
      });
      
      return response.data;
    } catch (error) {
      console.warn('Enhanced favorite tracking failed:', error);
    }
  }

  async trackAddToItinerary(placeName, placeId, city, lat, lon) {
    const itineraryData = {
      placeName,
      placeId,
      city,
      lat,
      lon,
      timestamp: Date.now(),
      context: realtimeLearningService.getCurrentContext()
    };

    // Add to interaction buffer
    this.interactionBuffer.push({
      type: 'add_to_itinerary',
      data: itineraryData,
      timestamp: Date.now(),
      priority: 'high'
    });

    // Real-time learning
    realtimeLearningService.trackInteraction('itinerary_added', {
      ...itineraryData,
      category: this.inferCategory(placeName),
      conversionType: 'planning'
    });

    try {
      const response = await axios.post(`${this.baseURL}/ml/track-interaction`, {
        interaction_type: 'add_to_itinerary',
        place_name: placeName,
        place_id: placeId,
        city,
        lat,
        lon,
        session_id: this.sessionId,
        user_id: this.userId,
        context: itineraryData.context
      });

      console.log(`📋 Enhanced itinerary tracking: ${placeName}`);
      return response.data;
    } catch (error) {
      console.warn('Enhanced itinerary tracking failed:', error);
    }
  }

  // ====== ENHANCED ML RECOMMENDATIONS ======

  async getMLRecommendations(limit = 8, includeRealtime = true) {
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (this.userId) params.append('user_id', this.userId);
      if (this.sessionId) params.append('session_id', this.sessionId);
      
      // Add context information for better recommendations
      const context = realtimeLearningService.getCurrentContext();
      params.append('context', JSON.stringify(context));

      const response = await axios.get(`${this.baseURL}/ml/home-recommendations?${params}`);
      
      let recommendations = response.data;
      
      // Apply real-time learning adaptations if enabled
      if (includeRealtime && recommendations?.recommendations?.main_recommendations) {
        const adaptedRecommendations = await realtimeLearningService.getAdaptedRecommendations(
          recommendations.recommendations.main_recommendations,
          this.userId
        );
        
        recommendations.recommendations.main_recommendations = adaptedRecommendations;
        recommendations.realtime_adapted = true;
        recommendations.adaptation_rules_applied = realtimeLearningService.getUserRules(this.userId).length;
      }
      
      console.log('🤖 Enhanced ML Recommendations loaded:', {
        user_type: this.userId ? 'authenticated' : 'anonymous',
        realtime_adapted: includeRealtime,
        context_aware: true,
        total_recommendations: recommendations?.recommendations?.main_recommendations?.length || 0
      });
      
      return recommendations;
    } catch (error) {
      console.warn('Enhanced ML recommendations failed:', error);
      return null;
    }
  }

  // ====== ADVANCED SEARCH WITH CONTEXT ======

  async searchWithMLTracking(city, activities, time) {
    try {
      // Track search first
      await this.trackSearch(city, activities, time);
      
      // Get enhanced recommendations with context
      const context = realtimeLearningService.getCurrentContext();
      
      const searchData = {
        city,
        activities,
        time,
        session_id: this.sessionId,
        user_id: this.userId,
        context: context,
        realtime_learning: true
      };

      const response = await axios.post(`${this.baseURL}/submit-preferences-v2`, searchData);

      // Apply real-time adaptations to search results
      if (response.data?.recommendations) {
        const adaptedResults = await realtimeLearningService.getAdaptedRecommendations(
          response.data.recommendations,
          this.userId
        );
        
        response.data.recommendations = adaptedResults;
        response.data.realtime_enhanced = true;
        response.data.context_factors = Object.keys(context).length;
      }

      console.log('🔍 Enhanced search with ML tracking completed:', {
        city,
        total_results: response.data.recommendations?.length || 0,
        ml_enhanced: response.data.ml_enhanced,
        realtime_enhanced: response.data.realtime_enhanced,
        context_aware: true
      });

      return response.data;
    } catch (error) {
      console.warn('Enhanced search failed:', error);
      throw error;
    }
  }

  // ====== RECOMMENDATION INTERACTION TRACKING ======

  async trackRecommendationClick(recommendation, position, source = 'unknown') {
    const clickData = {
      recommendationId: recommendation.id || recommendation.place_id,
      placeName: recommendation.name,
      position: position,
      source: source, // 'ml_personalized', 'amadeus', 'random', etc.
      mlScore: recommendation.score,
      timestamp: Date.now(),
      context: realtimeLearningService.getCurrentContext()
    };

    // Real-time learning (immediate for ML recommendations)
    realtimeLearningService.trackInteraction('recommendation_clicked', clickData);

    console.log(`🎯 Recommendation click tracked: ${recommendation.name}`, {
      source: source,
      position: position,
      ml_score: recommendation.score
    });
  }

  async trackRecommendationIgnore(recommendation, reason = 'not_interested') {
    const ignoreData = {
      recommendationId: recommendation.id || recommendation.place_id,
      placeName: recommendation.name,
      reason: reason,
      mlScore: recommendation.score,
      timestamp: Date.now(),
      context: realtimeLearningService.getCurrentContext()
    };

    // Real-time learning
    realtimeLearningService.trackInteraction('recommendation_ignored', ignoreData);

    console.log(`❌ Recommendation ignored: ${recommendation.name}`, {
      reason: reason,
      ml_score: recommendation.score
    });
  }

  // ====== CONTEXTUAL TRACKING ======

  async trackWeatherInfluence(weatherCondition, searchBehavior) {
    const weatherData = {
      weather: weatherCondition,
      searchBehavior: searchBehavior,
      timestamp: Date.now(),
      context: realtimeLearningService.getCurrentContext()
    };

    realtimeLearningService.trackInteraction('weather_influence', weatherData);
  }

  async trackTimeBasedPreference(timeOfDay, preferredActivities) {
    const timeData = {
      timeOfDay: timeOfDay,
      preferredActivities: preferredActivities,
      timestamp: Date.now(),
      context: realtimeLearningService.getCurrentContext()
    };

    realtimeLearningService.trackInteraction('time_preference', timeData);
  }

  // ====== ADVANCED ANALYTICS ======

  async getPersonalizedInsights() {
    if (!this.userId) {
      return {
        error: 'User must be authenticated for personalized insights'
      };
    }

    try {
      // Get ML user profile
      const profile = await this.getMLUserProfile(this.userId);
      
      // Get real-time learning stats
      const learningStats = realtimeLearningService.getLearningStats();
      
      // Get user adaptation rules
      const adaptationRules = realtimeLearningService.getUserRules(this.userId);
      
      // Get current context
      const currentContext = realtimeLearningService.getCurrentContext();
      
      // Calculate session metrics
      const sessionMetrics = this.getSessionMetrics();

      return {
        profile: profile,
        learningStats: learningStats,
        adaptationRules: adaptationRules.length,
        currentContext: currentContext,
        sessionMetrics: sessionMetrics,
        personalizedFeatures: {
          realtime_adaptation: true,
          context_awareness: true,
          behavioral_learning: true,
          predictive_recommendations: true
        }
      };
    } catch (error) {
      console.error('Failed to get personalized insights:', error);
      return { error: error.message };
    }
  }

  getSessionMetrics() {
    const duration = this.getTimeSpent();
    const actions = this.interactionBuffer.length;
    const conversions = this.calculateConversionRate();
    
    return {
      duration: Math.round(duration),
      actions: actions,
      conversionRate: Math.round(conversions * 100),
      avgTimePerAction: actions > 0 ? Math.round(duration / actions) : 0,
      engagementLevel: this.calculateEngagementLevel()
    };
  }

  calculateEngagementLevel() {
    const duration = this.getTimeSpent();
    const actions = this.interactionBuffer.length;
    const conversions = this.calculateConversionRate();
    
    let score = 0;
    
    // Duration scoring (0-40 points)
    if (duration > 300) score += 40; // 5+ minutes
    else if (duration > 120) score += 25; // 2-5 minutes
    else if (duration > 60) score += 15; // 1-2 minutes
    
    // Actions scoring (0-30 points)
    if (actions > 10) score += 30;
    else if (actions > 5) score += 20;
    else if (actions > 2) score += 10;
    
    // Conversion scoring (0-30 points)
    score += conversions * 30;
    
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  // ====== UTILITY METHODS ======

  inferCategory(placeName) {
    const culturalKeywords = ['museum', 'gallery', 'monument', 'cathedral', 'palace', 'castle'];
    const outdoorKeywords = ['park', 'mountain', 'beach', 'garden', 'trail', 'outdoor'];
    const foodKeywords = ['restaurant', 'cafe', 'market', 'food', 'dining', 'culinary'];
    const relaxationKeywords = ['spa', 'wellness', 'relaxation', 'thermal', 'massage'];
    
    const name = placeName.toLowerCase();
    
    if (culturalKeywords.some(keyword => name.includes(keyword))) return 'Cultural';
    if (outdoorKeywords.some(keyword => name.includes(keyword))) return 'Outdoor';
    if (foodKeywords.some(keyword => name.includes(keyword))) return 'Gastronomy';
    if (relaxationKeywords.some(keyword => name.includes(keyword))) return 'Relaxation';
    
    return 'Unknown';
  }

  // ====== LEGACY COMPATIBILITY METHODS ======

  async trackSearchFallback(city, activities, time) {
    try {
      const response = await axios.post(`${this.baseURL}/submit-preferences`, {
        city, activities, time
      });
      console.log('🔍 Fallback search tracking completed');
      return response.data;
    } catch (error) {
      console.warn('All search tracking methods failed:', error);
    }
  }

  async getMLUserProfile(userId = null) {
    const targetUserId = userId || this.userId;
    if (!targetUserId) {
      console.warn('No user ID available for ML profile request');
      return null;
    }

    try {
      const response = await axios.get(`${this.baseURL}/ml/user-profile/${targetUserId}`);
      console.log('👤 Enhanced ML User profile loaded:', response.data);
      return response.data;
    } catch (error) {
      console.warn('Failed to load enhanced ML user profile:', error);
      return null;
    }
  }

  async getTrendingPlaces(city = null, limit = 10) {
    try {
      const params = new URLSearchParams();
      if (city) params.append('city', city);
      params.append('limit', limit.toString());
      
      // Add context for better trending recommendations
      const context = realtimeLearningService.getCurrentContext();
      params.append('context', JSON.stringify(context));

      const response = await axios.get(`${this.baseURL}/ml/trending?${params}`);
      console.log('📈 Enhanced trending places loaded:', response.data);
      return response.data.trending_places || [];
    } catch (error) {
      console.warn('Failed to load enhanced trending places:', error);
      return [];
    }
  }

  // ====== REAL-TIME LEARNING API ======

  addCustomLearningRule(type, pattern, confidence = 0.8, weight = 1.0) {
    realtimeLearningService.addCustomRule(type, this.userId, pattern, confidence, weight);
    console.log(`🧠 Custom learning rule added: ${type}`);
  }

  getCurrentContext() {
    return realtimeLearningService.getCurrentContext();
  }

  getLearningStats() {
    return realtimeLearningService.getLearningStats();
  }

  // ====== PAGE TRACKING ======

  trackPageView(pageName) {
    console.log(`📄 Enhanced page view tracked: ${pageName}`);
    this.resetTimer();
    
    const pageData = {
      page: pageName,
      timestamp: Date.now(),
      context: realtimeLearningService.getCurrentContext(),
      userAgent: navigator.userAgent,
      referrer: document.referrer
    };

    realtimeLearningService.trackInteraction('page_viewed', pageData);
  }

  trackPageExit(pageName) {
    const timeSpent = this.getTimeSpent();
    console.log(`⏱️ Enhanced time spent on ${pageName}: ${timeSpent.toFixed(2)}s`);
    
    const exitData = {
      page: pageName,
      timeSpent: timeSpent,
      actions: this.interactionBuffer.length,
      timestamp: Date.now(),
      context: realtimeLearningService.getCurrentContext()
    };

    realtimeLearningService.trackInteraction('page_exit', exitData);
  }

  resetTimer() {
    this.startTime = Date.now();
  }

  clearTrackingData() {
    console.log('🚪 Clearing enhanced tracking data');
    sessionStorage.removeItem('tracking_session_id');
    localStorage.removeItem('user_id');
    this.sessionId = this.getOrCreateSessionId();
    this.userId = null;
    this.interactionBuffer = [];
  }

  // ====== DEBUG & DEVELOPMENT ======

  getDebugInfo() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      userType: this.userId ? 'authenticated' : 'anonymous',
      timeSpent: this.getTimeSpent(),
      baseURL: this.baseURL,
      interactionBuffer: this.interactionBuffer.length,
      learningStats: realtimeLearningService.getLearningStats(),
      currentContext: realtimeLearningService.getCurrentContext(),
      engagementLevel: this.calculateEngagementLevel()
    };
  }

  logTrackingState() {
    console.log('🔍 Enhanced Tracking State:', this.getDebugInfo());
  }

  // Export interaction buffer for analysis
  exportInteractionData() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      interactions: [...this.interactionBuffer],
      sessionMetrics: this.getSessionMetrics(),
      context: realtimeLearningService.getCurrentContext(),
      timestamp: Date.now()
    };
  }
}

// Export singleton instance
const enhancedTrackingService = new EnhancedTrackingService();

// Debug în development
if (process.env.NODE_ENV === 'development') {
  window.enhancedTrackingService = enhancedTrackingService;
  window.realtimeLearningService = realtimeLearningService;
}

export default enhancedTrackingService;