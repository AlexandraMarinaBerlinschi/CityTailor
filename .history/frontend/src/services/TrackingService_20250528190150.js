// src/services/trackingService.js - Serviciu pentru tracking în frontend

import axios from 'axios';

class TrackingService {
  constructor() {
    this.baseURL = 'http://localhost:8000';
    this.sessionId = this.getOrCreateSessionId();
    this.userId = this.getUserId();
    this.startTime = Date.now();
  }

  // Gestionarea session ID
  getOrCreateSessionId() {
    let sessionId = sessionStorage.getItem('tracking_session_id');
    if (!sessionId) {
      sessionId = this.generateUUID();
      sessionStorage.setItem('tracking_session_id', sessionId);
    }
    return sessionId;
  }

  // Gestionarea user ID (pentru utilizatori autentificați)
  getUserId() {
    // Aici poți integra cu sistemul tău de autentificare
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
  }

  // ====== TRACKING METHODS ======

  // Tracking pentru căutări
  async trackSearch(city, activities, time) {
    try {
      const response = await axios.post(`${this.baseURL}/tracking/search`, {
        city,
        activities,
        time,
        session_id: this.sessionId,
        user_id: this.userId
      });

      console.log('🔍 Search tracked:', response.data);
      return response.data;
    } catch (error) {
      console.warn('Failed to track search:', error);
      // Nu blocăm aplicația dacă tracking-ul eșuează
    }
  }

  // Tracking pentru interacțiuni cu locuri
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

      const response = await axios.post(`${this.baseURL}/tracking/interaction`, {
        activity_type: activityType,
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

      console.log(`📍 ${activityType} tracked for ${placeName}:`, response.data);
      return response.data;
    } catch (error) {
      console.warn('Failed to track place interaction:', error);
    }
  }

  // Metode helper pentru tracking specific
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

  // ====== USER PROFILE METHODS ======

  // Obține profilul utilizatorului
  async getUserProfile(userId = null) {
    const targetUserId = userId || this.userId;
    if (!targetUserId) {
      console.warn('No user ID available for profile request');
      return null;
    }

    try {
      const response = await axios.get(`${this.baseURL}/profile/${targetUserId}`);
      console.log('👤 User profile loaded:', response.data);
      return response.data;
    } catch (error) {
      console.warn('Failed to load user profile:', error);
      return null;
    }
  }

  // ====== TRENDING & POPULAR METHODS ======

  // Obține locurile trending
  async getTrendingPlaces(city = null, limit = 10) {
    try {
      const params = new URLSearchParams();
      if (city) params.append('city', city);
      params.append('limit', limit.toString());

      const response = await axios.get(`${this.baseURL}/trending?${params}`);
      console.log('📈 Trending places loaded:', response.data);
      return response.data.trending_places || [];
    } catch (error) {
      console.warn('Failed to load trending places:', error);
      return [];
    }
  }

  // Obține locurile populare
  async getPopularPlaces(city = null, limit = 10) {
    try {
      const params = new URLSearchParams();
      if (city) params.append('city', city);
      params.append('limit', limit.toString());

      const response = await axios.get(`${this.baseURL}/popular?${params}`);
      console.log('⭐ Popular places loaded:', response.data);
      return response.data.popular_places || [];
    } catch (error) {
      console.warn('Failed to load popular places:', error);
      return [];
    }
  }

  // ====== UTILITY METHODS ======

  // Resetează timer-ul pentru timpul petrecut
  resetTimer() {
    this.startTime = Date.now();
  }

  // Actualizează user ID când utilizatorul se autentifică
  setUserId(userId) {
    this.userId = userId;
    if (userId) {
      localStorage.setItem('user_id', userId);
    }
  }

  // Curăță datele de tracking (logout)
  clearTrackingData() {
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
    // Aici poți trimite datele către backend dacă vrei
  }
}

// Exportă o instanță singleton
const trackingService = new TrackingService();
export default trackingService;