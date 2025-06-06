// src/services/RealtimeLearningService.js - Complete Advanced ML Learning System

class RealtimeLearningService {
  constructor() {
    this.learningQueue = [];
    this.adaptationRules = new Map();
    this.contextFactors = {};
    this.isProcessing = false;
    this.lastUpdateTime = Date.now();
    this.userRules = new Map(); // Store rules per user
    
    // Initialize real-time learning
    this.initializeRealtimeLearning();
  }

  // ===== INITIALIZATION =====
  
  initializeRealtimeLearning() {
    // Set up periodic learning updates
    setInterval(() => {
      this.processLearningQueue();
    }, 5000); // Process every 5 seconds

    // Set up context monitoring
    this.startContextMonitoring();
    
    // Load saved adaptation rules
    this.loadAdaptationRules();
    
    console.log('🧠 Real-time learning system initialized');
  }

  startContextMonitoring() {
    // Monitor time of day
    setInterval(() => {
      this.updateTimeContext();
    }, 60000); // Update every minute

    // Monitor device/browser context
    this.updateDeviceContext();
    
    // Monitor weather context (simulated)
    this.updateWeatherContext();
  }

  // ===== CONTEXT AWARENESS =====
  
  updateTimeContext() {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const season = this.getSeason(now);
    
    this.contextFactors = {
      ...this.contextFactors,
      timeOfDay: this.getTimeOfDay(hour),
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
      season: season,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      hour: hour
    };
  }

  updateDeviceContext() {
    this.contextFactors = {
      ...this.contextFactors,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      screenSize: {
        width: window.screen.width,
        height: window.screen.height
      },
      connectionType: navigator.connection?.effectiveType || 'unknown'
    };
  }

  updateWeatherContext() {
    // Simulated weather context - in production, integrate with weather API
    const weatherConditions = ['sunny', 'cloudy', 'rainy', 'snowy'];
    const randomWeather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    
    this.contextFactors = {
      ...this.contextFactors,
      weather: randomWeather,
      temperature: Math.floor(Math.random() * 30) + 5 // 5-35°C
    };
  }

  getTimeOfDay(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  getSeason(date) {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  // ===== REAL-TIME LEARNING =====
  
  trackInteraction(eventType, data) {
    const learningEvent = {
      id: this.generateEventId(),
      type: eventType,
      data: data,
      context: { ...this.contextFactors },
      timestamp: Date.now(),
      userId: data.userId || 'anonymous',
      sessionId: data.sessionId || 'unknown'
    };

    this.learningQueue.push(learningEvent);
    
    // Immediate processing for critical events
    if (this.isCriticalEvent(eventType)) {
      this.processImmediately(learningEvent);
    }

    console.log(`🧠 Learning event tracked: ${eventType}`, learningEvent);
  }

  isCriticalEvent(eventType) {
    const criticalEvents = ['favorite_added', 'strong_rejection', 'booking_completed'];
    return criticalEvents.includes(eventType);
  }

  async processLearningQueue() {
    if (this.isProcessing || this.learningQueue.length === 0) return;
    
    this.isProcessing = true;
    
    try {
      const events = [...this.learningQueue];
      this.learningQueue = [];
      
      for (const event of events) {
        await this.processLearningEvent(event);
      }
      
      // Update adaptation rules based on processed events
      this.updateAdaptationRules(events);
      
    } catch (error) {
      console.error('Error processing learning queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async processLearningEvent(event) {
    const { type, data, context, userId } = event;
    
    switch (type) {
      case 'search_performed':
        await this.learnFromSearch(data, context, userId);
        break;
      case 'place_viewed':
        await this.learnFromView(data, context, userId);
        break;
      case 'favorite_added':
        await this.learnFromFavorite(data, context, userId);
        break;
      case 'itinerary_added':
        await this.learnFromItinerary(data, context, userId);
        break;
      case 'recommendation_clicked':
        await this.learnFromRecommendationClick(data, context, userId);
        break;
      case 'recommendation_ignored':
        await this.learnFromRecommendationIgnore(data, context, userId);
        break;
      case 'session_ended':
        await this.learnFromSession(data, context, userId);
        break;
    }
  }

  async processImmediately(event) {
    try {
      await this.processLearningEvent(event);
    } catch (error) {
      console.error('Error processing immediate event:', error);
    }
  }

  // ===== SPECIFIC LEARNING METHODS =====
  
  async learnFromSearch(data, context, userId) {
    const { city, activities, time } = data;
    
    // Learn time preferences based on context
    const contextualPreference = {
      activities: activities,
      preferredTime: time,
      searchContext: {
        timeOfDay: context.timeOfDay,
        dayOfWeek: context.dayOfWeek,
        season: context.season,
        weather: context.weather
      }
    };

    // Create adaptation rule
    this.createAdaptationRule('contextual_search_preference', {
      userId,
      pattern: contextualPreference,
      confidence: 0.7,
      createdAt: Date.now()
    });

    console.log('🎯 Learned from search:', contextualPreference);
  }

  async learnFromFavorite(data, context, userId) {
    const { placeName, category } = data;
    
    // Strong positive signal - increase confidence
    const favoritePattern = {
      category: category,
      contextualFactors: {
        timeOfDay: context.timeOfDay,
        season: context.season,
        weather: context.weather
      }
    };

    this.createAdaptationRule('strong_preference', {
      userId,
      pattern: favoritePattern,
      confidence: 0.9, // High confidence for favorites
      weight: 3.0 // Higher weight for favorites
    });

    console.log('❤️ Learned strong preference:', favoritePattern);
  }

  async learnFromView(data, context, userId) {
    const { placeName, viewDuration = 0 } = data;
    
    // Learn from view patterns
    const viewPattern = {
      placeName: placeName,
      viewDuration: viewDuration,
      context: {
        timeOfDay: context.timeOfDay,
        device: context.isMobile ? 'mobile' : 'desktop'
      }
    };

    this.createAdaptationRule('view_pattern', {
      userId,
      pattern: viewPattern,
      confidence: 0.5,
      weight: 1.0
    });
  }

  async learnFromItinerary(data, context, userId) {
    const { placeName, category } = data;
    
    const itineraryPattern = {
      category: category,
      planningBehavior: 'active',
      context: {
        timeOfDay: context.timeOfDay,
        isWeekend: context.isWeekend
      }
    };

    this.createAdaptationRule('planning_preference', {
      userId,
      pattern: itineraryPattern,
      confidence: 0.8,
      weight: 2.0
    });
  }

  async learnFromRecommendationClick(data, context, userId) {
    const { recommendationId, source, position } = data;
    
    const clickPattern = {
      source: source,
      position: position,
      clicked: true,
      context: context
    };

    this.createAdaptationRule('recommendation_response', {
      userId,
      pattern: clickPattern,
      confidence: 0.7,
      weight: 1.5
    });
  }

  async learnFromRecommendationIgnore(data, context, userId) {
    const { recommendationId, reason } = data;
    
    const ignorePattern = {
      reason: reason,
      ignored: true,
      context: context
    };

    this.createAdaptationRule('negative_feedback', {
      userId,
      pattern: ignorePattern,
      confidence: 0.6,
      weight: -1.0 // Negative weight for ignored items
    });
  }

  async learnFromSession(data, context, userId) {
    const { duration, actionsCount, conversionRate } = data;
    
    const sessionPattern = {
      engagementLevel: this.calculateEngagementLevel(duration, actionsCount),
      conversionRate: conversionRate,
      sessionContext: context
    };

    this.createAdaptationRule('session_behavior', {
      userId,
      pattern: sessionPattern,
      confidence: 0.6,
      weight: 1.0
    });
  }

  // ===== ADAPTATION RULES =====
  
  createAdaptationRule(type, ruleData) {
    const ruleId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const rule = {
      id: ruleId,
      type: type,
      ...ruleData,
      appliedCount: 0,
      lastApplied: null
    };

    this.adaptationRules.set(ruleId, rule);
    
    // Store per user as well
    if (ruleData.userId && ruleData.userId !== 'anonymous') {
      if (!this.userRules.has(ruleData.userId)) {
        this.userRules.set(ruleData.userId, []);
      }
      this.userRules.get(ruleData.userId).push(rule);
    }
  }

  updateAdaptationRules(events) {
    // Process events to update existing rules
    events.forEach(event => {
      const userId = event.userId;
      if (userId && userId !== 'anonymous') {
        const userRules = this.userRules.get(userId) || [];
        // Update rule weights based on repeated patterns
        this.updateRuleWeights(userRules, event);
      }
    });
  }

  updateRuleWeights(userRules, event) {
    userRules.forEach(rule => {
      if (this.isRuleApplicable(rule, event)) {
        rule.appliedCount += 1;
        rule.lastApplied = Date.now();
        
        // Increase confidence for frequently applied rules
        if (rule.appliedCount > 3) {
          rule.confidence = Math.min(0.95, rule.confidence + 0.05);
        }
      }
    });
  }

  isRuleApplicable(rule, event) {
    // Simple pattern matching - can be enhanced
    return rule.type === event.type || 
           (rule.pattern?.category && event.data?.category === rule.pattern.category);
  }

  // ===== RECOMMENDATION ADAPTATION =====
  
  async getAdaptedRecommendations(originalRecommendations, userId) {
    if (!userId || userId === 'anonymous') {
      return originalRecommendations;
    }

    const userRules = this.userRules.get(userId) || [];
    if (userRules.length === 0) {
      return originalRecommendations;
    }

    const adaptedRecommendations = originalRecommendations.map(rec => {
      let adaptationScore = 0;
      
      userRules.forEach(rule => {
        const applicability = this.calculateRuleApplicability(rule, rec);
        adaptationScore += applicability * rule.weight * rule.confidence;
      });

      return {
        ...rec,
        originalScore: rec.score || 0,
        adaptationScore: adaptationScore,
        finalScore: (rec.score || 0) + adaptationScore,
        adapted: true
      };
    });

    // Sort by final score
    adaptedRecommendations.sort((a, b) => b.finalScore - a.finalScore);

    console.log(`🎯 Adapted ${adaptedRecommendations.length} recommendations for user ${userId}`);
    return adaptedRecommendations;
  }

  calculateRuleApplicability(rule, recommendation) {
    let applicability = 0;
    
    // Category matching
    if (rule.pattern?.category && recommendation.category) {
      if (rule.pattern.category === recommendation.category) {
        applicability += 0.5;
      }
    }

    // Context matching
    if (rule.pattern?.contextualFactors) {
      const currentContext = this.getCurrentContext();
      if (rule.pattern.contextualFactors.timeOfDay === currentContext.timeOfDay) {
        applicability += 0.3;
      }
      if (rule.pattern.contextualFactors.weather === currentContext.weather) {
        applicability += 0.2;
      }
    }

    return Math.min(1.0, applicability);
  }

  // ===== UTILITY METHODS =====
  
  generateEventId() {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  calculateEngagementLevel(duration, actionsCount) {
    if (duration > 300 && actionsCount > 10) return 'high';
    if (duration > 120 && actionsCount > 5) return 'medium';
    return 'low';
  }

  getCurrentContext() {
    return { ...this.contextFactors };
  }

  getLearningStats() {
    return {
      totalRules: this.adaptationRules.size,
      queueSize: this.learningQueue.length,
      userCount: this.userRules.size,
      isProcessing: this.isProcessing,
      lastUpdate: this.lastUpdateTime
    };
  }

  getUserRules(userId) {
    return this.userRules.get(userId) || [];
  }

  addCustomRule(type, userId, pattern, confidence = 0.8, weight = 1.0) {
    this.createAdaptationRule(type, {
      userId,
      pattern,
      confidence,
      weight,
      custom: true
    });
  }

  // ===== PERSISTENCE =====
  
  loadAdaptationRules() {
    try {
      const saved = localStorage.getItem('realtime_learning_rules');
      if (saved) {
        const rules = JSON.parse(saved);
        rules.forEach(rule => {
          this.adaptationRules.set(rule.id, rule);
          if (rule.userId && rule.userId !== 'anonymous') {
            if (!this.userRules.has(rule.userId)) {
              this.userRules.set(rule.userId, []);
            }
            this.userRules.get(rule.userId).push(rule);
          }
        });
        console.log(`📚 Loaded ${rules.length} adaptation rules`);
      }
    } catch (error) {
      console.warn('Failed to load adaptation rules:', error);
    }
  }

  saveAdaptationRules() {
    try {
      const rules = Array.from(this.adaptationRules.values());
      localStorage.setItem('realtime_learning_rules', JSON.stringify(rules));
      console.log(`💾 Saved ${rules.length} adaptation rules`);
    } catch (error) {
      console.warn('Failed to save adaptation rules:', error);
    }
  }

  // Save rules periodically
  startPeriodicSave() {
    setInterval(() => {
      this.saveAdaptationRules();
    }, 60000); // Save every minute
  }
}

// Export singleton instance
const realtimeLearningService = new RealtimeLearningService();

// Start periodic save
realtimeLearningService.startPeriodicSave();

// Debug in development
if (process.env.NODE_ENV === 'development') {
  window.realtimeLearningService = realtimeLearningService;
}

export default realtimeLearningService;