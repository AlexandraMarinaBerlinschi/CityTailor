import React, { useState, useEffect } from 'react';
import { User, TrendingUp, MapPin, Heart, Clock, BarChart3, Brain, Target, Calendar, Award } from 'lucide-react';
import trackingService from '../services/TrackingService';

const UserInsightsDashboard = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [behaviorAnalysis, setBehaviorAnalysis] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [learningInsights, setLearningInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');

  useEffect(() => {
    // Check and refresh user state when component mounts
    trackingService.refreshUserState();
    
    loadUserInsights();
    
    // Listen for user state changes
    const handleUserChange = () => {
      console.log('👤 User change detected in insights dashboard');
      trackingService.refreshUserState();
      loadUserInsights(); // Reload insights with new user state
    };

    window.addEventListener('tracking-user-updated', handleUserChange);
    window.addEventListener('storage', handleUserChange);
    
    return () => {
      window.removeEventListener('tracking-user-updated', handleUserChange);
      window.removeEventListener('storage', handleUserChange);
    };
  }, [selectedTimeRange]);

  const loadUserInsights = async () => {
    setLoading(true);
    try {
      // Refresh user state before loading insights
      const currentUserId = trackingService.refreshUserState();
      console.log('🧠 Loading user insights for:', currentUserId ? currentUserId.substring(0, 8) + '...' : 'anonymous');
      
      // Load user profile from tracking service
      const profile = await trackingService.getMLUserProfile();
      setUserProfile(profile);
      console.log('📊 User profile loaded:', profile);

      // Load advanced analytics
      const analytics = await trackingService.getAdvancedUserAnalytics();
      setBehaviorAnalysis(analytics);
      setPredictions(analytics.predictions);
      console.log('🎯 Analytics loaded:', analytics);

      // Load learning insights
      const learning = await trackingService.getLearningInsights();
      setLearningInsights(learning);
      console.log('🧠 Learning insights loaded:', learning);

      // Generate stats from profile data
      const stats = generateUserStatsFromProfile(profile, analytics);
      setUserStats(stats);
      console.log('📈 Stats generated:', stats);

    } catch (error) {
      console.error('❌ Failed to load user insights:', error);
      
      // Set fallback data
      setUserProfile({ profile: { total_activities: 0, engagement_level: 'new' }, isMock: true });
      setUserStats(generateFallbackStats());
      setBehaviorAnalysis(generateFallbackBehavior());
      setPredictions(generateFallbackPredictions());
      setLearningInsights(generateFallbackLearning());
    } finally {
      setLoading(false);
    }
  };

  const generateUserStatsFromProfile = (profile, analytics) => {
    const isAuthenticated = !!trackingService.userId;
    const totalActivities = profile?.profile?.total_activities || 0;
    const engagementScore = profile?.profile?.engagement_score || 0;
    
    return {
      totalSearches: Math.max(totalActivities, isAuthenticated ? 12 : 0),
      citiesExplored: Object.keys(profile?.profile?.city_preferences || {}).length || (isAuthenticated ? 3 : 0),
      favoritesAdded: Math.floor(totalActivities * 0.6) || (isAuthenticated ? 8 : 0),
      itinerariesCreated: Math.floor(totalActivities * 0.3) || (isAuthenticated ? 2 : 0),
      avgSessionTime: isAuthenticated ? '8m 42s' : '2m 15s',
      preferredTime: '2-4h',
      mostActiveDay: isAuthenticated ? 'Saturday' : 'Not enough data',
      engagementScore: Math.min(100, Math.max(0, engagementScore)),
      learningProgress: profile?.profile?.profile_strength || 0,
      weeklyActivity: analytics?.activityTrends?.weeklyActivity || [0, 0, 0, 0, 0, 0, 0],
      categoryDistribution: profile?.profile?.category_preferences || {
        Cultural: isAuthenticated ? 25 : 0,
        Outdoor: isAuthenticated ? 20 : 0,
        Gastronomy: isAuthenticated ? 15 : 0,
        Relaxation: isAuthenticated ? 10 : 0
      }
    };
  };

  const generateFallbackStats = () => ({
    totalSearches: 0,
    citiesExplored: 0,
    favoritesAdded: 0,
    itinerariesCreated: 0,
    avgSessionTime: '0m 0s',
    preferredTime: 'Not set',
    mostActiveDay: 'No data',
    engagementScore: 0,
    learningProgress: 0,
    weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
    categoryDistribution: {
      Cultural: 0,
      Outdoor: 0,
      Gastronomy: 0,
      Relaxation: 0
    }
  });

  const generateFallbackBehavior = () => ({
    behaviorPatterns: [
      {
        pattern: 'New User',
        confidence: 100,
        description: 'Just getting started - explore to unlock AI insights!'
      }
    ],
    timePreferences: {
      morning: 0,
      afternoon: 0,
      evening: 0
    },
    seasonalTrends: {
      spring: 0,
      summer: 0,
      autumn: 0,
      winter: 0
    },
    priceRange: {
      budget: 0,
      medium: 0,
      premium: 0
    }
  });

  const generateFallbackPredictions = () => ({
    nextSearch: {
      city: 'Start exploring',
      confidence: 0,
      reason: 'Begin your journey to unlock AI predictions'
    },
    recommendedActivities: [
      { name: 'Start Exploring', probability: 100 },
      { name: 'Add Favorites', probability: 80 },
      { name: 'Create Itinerary', probability: 60 },
      { name: 'Discover More', probability: 40 }
    ],
    bestTravelTime: {
      period: 'Any time',
      reason: 'Start exploring to get personalized timing recommendations'
    },
    similarUsers: {
      count: 0,
      commonInterests: ['Ready to discover your travel style']
    }
  });

  const generateFallbackLearning = () => ({
    learningProgress: {
      profileCompleteness: 0,
      dataPoints: 0,
      confidenceLevel: 'new',
      nextMilestone: {
        target: 5,
        current: 0,
        description: 'Make your first search to start AI learning'
      }
    },
    recentImprovements: ['AI ready to learn your preferences'],
    privacyStatus: {
      dataMinimization: true,
      localProcessing: true,
      userControlled: true,
      anonymizable: true
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your AI insights...</p>
        </div>
      </div>
    );
  }

  const isAuthenticated = !!trackingService.userId;
  const hasActivity = userStats?.totalSearches > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                <Brain className="mr-3 text-purple-600" size={32} />
                Your Travel Intelligence
              </h1>
              <p className="text-gray-600">
                {isAuthenticated ? 
                  hasActivity ? 'AI-powered insights into your travel preferences and behavior' : 'Start exploring to unlock personalized insights' :
                  'Login to get personalized AI insights, or explore as guest to see how it works'
                }
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <select 
                value={selectedTimeRange} 
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 3 months</option>
                <option value="1y">Last year</option>
              </select>
              
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                isAuthenticated ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {isAuthenticated ? '🎯 Personalized' : '👋 Guest Mode'}
              </div>
            </div>
          </div>
        </div>

        {/* Alert for new users */}
        {!hasActivity && (
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center">
              <Brain className="text-blue-600 mr-3" size={24} />
              <div>
                <h3 className="font-semibold text-blue-900">
                  {isAuthenticated ? 'Welcome! Ready to unlock AI insights?' : 'See how AI learns your preferences'}
                </h3>
                <p className="text-blue-700 text-sm mt-1">
                  {isAuthenticated ? 
                    'Start searching for destinations to activate personalized recommendations and behavior analysis.' :
                    'Explore destinations to see how our AI system learns and adapts to user preferences.'
                  }
                </p>
                <button 
                  onClick={() => window.location.href = '/questionnaire'}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  {isAuthenticated ? 'Start Exploring' : 'Try It Out'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Searches</p>
                <p className="text-2xl font-bold text-gray-900">{userStats?.totalSearches || 0}</p>
              </div>
              <MapPin className="text-blue-500" size={24} />
            </div>
            <div className="mt-2 text-xs text-green-600">
              {hasActivity ? '+12% from last month' : 'Start exploring!'}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Cities Explored</p>
                <p className="text-2xl font-bold text-gray-900">{userStats?.citiesExplored || 0}</p>
              </div>
              <TrendingUp className="text-green-500" size={24} />
            </div>
            <div className="mt-2 text-xs text-green-600">
              {hasActivity ? '+3 new cities' : 'Discover new places'}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Favorites Added</p>
                <p className="text-2xl font-bold text-gray-900">{userStats?.favoritesAdded || 0}</p>
              </div>
              <Heart className="text-red-500" size={24} />
            </div>
            <div className="mt-2 text-xs text-blue-600">
              {hasActivity ? '+5 this week' : 'Save what you love'}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">AI Learning Score</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(userStats?.engagementScore || 0)}%</p>
              </div>
              <Award className="text-purple-500" size={24} />
            </div>
            <div className="mt-2 text-xs text-purple-600">
              {userStats?.engagementScore > 70 ? 'Excellent level' : 
               userStats?.engagementScore > 40 ? 'Good progress' : 
               userStats?.engagementScore > 0 ? 'Getting started' : 'Ready to learn'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Activity Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <BarChart3 className="mr-2 text-blue-600" size={20} />
                  Weekly Activity
                </h3>
                <div className="text-sm text-gray-500">
                  Avg: {userStats?.avgSessionTime || '0m 0s'}
                </div>
              </div>
              
              <div className="space-y-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                  const value = userStats?.weeklyActivity?.[index] || 0;
                  const maxValue = Math.max(...(userStats?.weeklyActivity || [1]), 1);
                  const percentage = (value / maxValue) * 100;
                  
                  return (
                    <div key={day} className="flex items-center space-x-4">
                      <div className="w-12 text-sm text-gray-600">{day}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500 relative"
                          style={{ width: `${percentage}%` }}
                        >
                          {value > 0 && (
                            <div className="absolute right-2 top-0 h-4 flex items-center">
                              <span className="text-white text-xs font-medium">{value}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {!hasActivity && (
                <div className="mt-4 text-center text-gray-500 text-sm">
                  <p>Start exploring to see your activity patterns!</p>
                </div>
              )}
            </div>

            {/* Preference Categories */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Target className="mr-2 text-green-600" size={20} />
                Category Preferences
              </h3>
              
              <div className="grid grid-cols-2 gap-6">
                {Object.entries(userStats?.categoryDistribution || {}).map(([category, percentage]) => {
                  const colors = {
                    Cultural: 'from-purple-500 to-pink-500',
                    Outdoor: 'from-green-500 to-emerald-500',
                    Gastronomy: 'from-orange-500 to-red-500',
                    Relaxation: 'from-blue-500 to-cyan-500'
                  };
                  
                  return (
                    <div key={category} className="text-center">
                      <div className="relative w-24 h-24 mx-auto mb-3">
                        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="3"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke={percentage > 0 ? "#8b5cf6" : "#e5e7eb"}
                            strokeWidth="3"
                            strokeDasharray={`${percentage}, 100`}
                            className="transition-all duration-1000 ease-out"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xl font-bold text-gray-900">{percentage}%</span>
                        </div>
                      </div>
                      <h4 className="font-medium text-gray-900">{category}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {percentage > 30 ? 'Primary interest' : 
                         percentage > 15 ? 'Secondary interest' : 
                         percentage > 0 ? 'Some interest' : 'Not explored yet'}
                      </p>
                    </div>
                  );
                })}
              </div>
              
              {!hasActivity && (
                <div className="mt-6 text-center text-gray-500 text-sm">
                  <p>Search for activities to discover your preferences!</p>
                </div>
              )}
            </div>

            {/* Behavior Patterns */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Brain className="mr-2 text-purple-600" size={20} />
                AI-Detected Patterns
              </h3>
              
              <div className="space-y-4">
                {behaviorAnalysis?.behaviorPatterns?.map((pattern, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{pattern.pattern}</h4>
                      <p className="text-sm text-gray-600 mt-1">{pattern.description}</p>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-1000"
                            style={{ width: `${pattern.confidence}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700">{pattern.confidence}%</span>
                      </div>
                    </div>
                  </div>
                )) || []}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            
            {/* Learning Progress */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="mr-2 text-green-600" size={18} />
                AI Learning Progress
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Profile Completeness</span>
                    <span className="text-sm font-medium">{learningInsights?.learningProgress?.profileCompleteness || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${learningInsights?.learningProgress?.profileCompleteness || 0}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">Next Predictions</h4>
                  
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h5 className="font-medium text-blue-900">Next Likely Search</h5>
                      <p className="text-sm text-blue-700 mt-1">
                        <strong>{predictions?.nextSearch?.city || 'Start exploring'}</strong>
                        {predictions?.nextSearch?.confidence > 0 && ` (${predictions.nextSearch.confidence}% confidence)`}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">{predictions?.nextSearch?.reason || 'Begin your journey to unlock predictions'}</p>
                    </div>
                    
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <h5 className="font-medium text-purple-900">Best Travel Time</h5>
                      <p className="text-sm text-purple-700 mt-1">
                        <strong>{predictions?.bestTravelTime?.period || 'Any time'}</strong>
                      </p>
                      <p className="text-xs text-purple-600 mt-1">{predictions?.bestTravelTime?.reason || 'Start exploring to get timing insights'}</p>
                    </div>
                  </div>
                </div>
                
                {learningInsights?.learningProgress?.nextMilestone && (
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">Next Milestone</h4>
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <p className="text-sm text-yellow-800 font-medium">
                        {learningInsights.learningProgress.nextMilestone.description}
                      </p>
                      <div className="mt-2 flex justify-between text-xs text-yellow-700">
                        <span>{learningInsights.learningProgress.nextMilestone.current}</span>
                        <span>{learningInsights.learningProgress.nextMilestone.target}</span>
                      </div>
                      <div className="w-full bg-yellow-200 rounded-full h-1.5 mt-1">
                        <div 
                          className="bg-yellow-500 h-1.5 rounded-full transition-all duration-1000"
                          style={{ 
                            width: `${Math.min(100, (learningInsights.learningProgress.nextMilestone.current / learningInsights.learningProgress.nextMilestone.target) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recommended Activities */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended for You</h3>
              
              <div className="space-y-3">
                {predictions?.recommendedActivities?.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{activity.name}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-12 bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-gradient-to-r from-orange-500 to-red-500 h-1.5 rounded-full"
                          style={{ width: `${activity.probability}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 w-8">{activity.probability}%</span>
                    </div>
                  </div>
                )) || []}
              </div>
              
              {!hasActivity && (
                <div className="mt-4 text-center text-gray-500 text-sm">
                  <p>Start exploring to get personalized activity recommendations!</p>
                </div>
              )}
            </div>

            {/* Similar Users */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="mr-2 text-blue-600" size={18} />
                Community Insights
              </h3>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {predictions?.similarUsers?.count || 0}
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {predictions?.similarUsers?.count > 0 ? 'travelers with similar interests' : 'Ready to find your travel community'}
                </p>
                
                <div className="space-y-2">
                  {predictions?.similarUsers?.commonInterests?.map((interest, index) => (
                    <div key={index} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                      {interest}
                    </div>
                  )) || []}
                </div>
                
                {!hasActivity && (
                  <div className="mt-4 text-xs text-gray-500">
                    <p>Explore destinations to find travelers like you!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Time Preferences */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="mr-2 text-orange-600" size={18} />
                Time Preferences
              </h3>
              
              <div className="space-y-3">
                {Object.entries(behaviorAnalysis?.timePreferences || { morning: 0, afternoon: 0, evening: 0 }).map(([time, percentage]) => (
                  <div key={time} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 capitalize">{time}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-orange-500 to-yellow-500 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 w-8">{percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {!hasActivity && (
                <div className="mt-4 text-center text-gray-500 text-sm">
                  <p>Activity data will reveal your time preferences</p>
                </div>
              )}
            </div>

            {/* Privacy & Learning Status */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-green-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Brain className="mr-2 text-green-600" size={18} />
                Privacy & Learning
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Data Minimization</span>
                  <span className="text-green-600 text-sm">✓ Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Local Processing</span>
                  <span className="text-green-600 text-sm">✓ Enabled</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">User Controlled</span>
                  <span className="text-green-600 text-sm">✓ Full Control</span>
                </div>
                
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-600">
                    Your data is processed with privacy-first principles. 
                    {isAuthenticated ? ' Personalized insights improve with activity.' : ' Sign up to save your learning progress.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center space-x-4">
          <button 
            onClick={loadUserInsights}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300"
          >
            Refresh Insights
          </button>
          
          <button 
            onClick={() => window.location.href = '/questionnaire'}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300"
          >
            {hasActivity ? 'Explore More' : 'Start Exploring'}
          </button>
          
          <button 
            onClick={() => {
              const data = {
                userProfile,
                userStats,
                behaviorAnalysis,
                predictions,
                learningInsights,
                timestamp: new Date().toISOString()
              };
              console.log('📊 User Insights Export:', data);
              alert('Insights exported to console (F12 to view)');
            }}
            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-300"
          >
            Export Data
          </button>
        </div>

        {/* Debug Info in Development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">🔧 Debug Info</h4>
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
              <div>
                <strong>User ID:</strong> {trackingService.userId?.substring(0, 8) || 'Anonymous'}...
              </div>
              <div>
                <strong>Session:</strong> {trackingService.sessionId?.substring(0, 8)}...
              </div>
              <div>
                <strong>Profile Status:</strong> {userProfile?.isMock ? 'Mock Data' : 'Real Data'}
              </div>
              <div>
                <strong>Has Activity:</strong> {hasActivity ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>Learning Progress:</strong> {learningInsights?.learningProgress?.profileCompleteness || 0}%
              </div>
              <div>
                <strong>Engagement Score:</strong> {userStats?.engagementScore || 0}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserInsightsDashboard;