// src/services/RealtimeLearningService.js - Advanced ML Learning System

import trackingService from './TrackingService';

class RealtimeLearningService {
  constructor() {
    this.learningQueue = [];
    this.adaptationRules = new Map();
    this.contextFactors = {};
    this.isProcessing = false;
    this.lastUpdateTime = Date.now();
    
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
  
  addLearningEvent(eventType, data) {
    const learningEvent = {
      id: this.generateEventId(),
      type: eventType,
      data: data,
      context: { ...this.contextFactors },
      timestamp: Date.now(),
      userId: trackingService.userId,
      sessionId: trackingService.sessionId
    };

    this.learningQueue.push(learningEvent);
    
    // Immediate processing for critical events
    if (this.isCriticalEvent(eventType)) {
      this.processImmediately(learningEvent);
    }

    console.log(`🧠 Learning event added: ${eventType}`, learningEvent);
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
    const { placeName, category, rating } = data;
    
    // Strong positive signal - increase confidence
    const favoritePattern = {
      category: category,
      ratingThreshold: rating,
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