import React, { useState, useEffect } from 'react';
import { User, TrendingUp, MapPin, Heart, Clock, BarChart3, Brain, Target, Calendar, Award } from 'lucide-react';
import trackingService from '../services/TrackingService';

const UserInsightsDashboard = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [behaviorAnalysis, setBehaviorAnalysis] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');

  useEffect(() => {
    loadUserInsights();
  }, [selectedTimeRange]);

  const loadUserInsights = async () => {
    setLoading(true);
    try {
      // Load user profile
      const profile = await trackingService.getMLUserProfile();
      setUserProfile(profile);

      // Simulate additional analytics data
      const mockStats = generateMockUserStats();
      setUserStats(mockStats);

      const mockBehavior = generateMockBehaviorAnalysis();
      setBehaviorAnalysis(mockBehavior);

      const mockPredictions = generateMockPredictions();
      setPredictions(mockPredictions);

    } catch (error) {
      console.error('Failed to load user insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockUserStats = () => ({
    totalSearches: 47,
    citiesExplored: 12,
    favoritesAdded: 23,
    itinerariesCreated: 8,
    avgSessionTime: '12m 34s',
    preferredTime: '2-4h',
    mostActiveDay: 'Saturday',
    engagementScore: 87,
    learningProgress: 73,
    weeklyActivity: [12, 8, 15, 22, 18, 28, 19],
    categoryDistribution: {
      Cultural: 35,
      Outdoor: 28,
      Gastronomy: 22,
      Relaxation: 15
    }
  });

  const generateMockBehaviorAnalysis = () => ({
    patterns: [
      { pattern: 'Weekend Explorer', confidence: 92, description: 'Most active on weekends' },
      { pattern: 'Cultural Enthusiast', confidence: 87, description: 'Strong preference for museums and historical sites' },
      { pattern: 'Quality Seeker', confidence: 78, description: 'Prefers highly-rated experiences' },
      { pattern: 'Social Traveler', confidence: 65, description: 'Often books group activities' }
    ],
    timePreferences: {
      morning: 15,
      afternoon: 45,
      evening: 40
    },
    seasonalTrends: {
      spring: 25,
      summer: 35,
      autumn: 30,
      winter: 10
    },
    priceRange: {
      budget: 20,
      medium: 60,
      premium: 20
    }
  });

  const generateMockPredictions = () => ({
    nextSearch: {
      city: 'Vienna',
      confidence: 78,
      reason: 'Based on your cultural preferences and recent European city searches'
    },
    recommendedActivities: [
      { name: 'Museum Visits', probability: 92 },
      { name: 'Food Tours', probability: 76 },
      { name: 'Walking Tours', probability: 71 },
      { name: 'Art Galleries', probability: 68 }
    ],
    bestTravelTime: {
      period: 'May-September',
      reason: 'Matches your outdoor activity preferences'
    },
    similarUsers: {
      count: 127,
      commonInterests: ['Cultural sites', 'European cities', 'Food experiences']
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your insights...</p>
        </div>
      </div>
    );
  }

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
              <p className="text-gray-600">AI-powered insights into your travel preferences and behavior</p>
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
              
              <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                {trackingService.userId ? '🎯 Personalized' : '👋 Anonymous'}
              </div>
            </div>
          </div>
        </div>

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
            <div className="mt-2 text-xs text-green-600">+12% from last month</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Cities Explored</p>
                <p className="text-2xl font-bold text-gray-900">{userStats?.citiesExplored || 0}</p>
              </div>
              <TrendingUp className="text-green-500" size={24} />
            </div>
            <div className="mt-2 text-xs text-green-600">+3 new cities</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Favorites Added</p>
                <p className="text-2xl font-bold text-gray-900">{userStats?.favoritesAdded || 0}</p>
              </div>
              <Heart className="text-red-500" size={24} />
            </div>
            <div className="mt-2 text-xs text-blue-600">+5 this week</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Engagement Score</p>
                <p className="text-2xl font-bold text-gray-900">{userStats?.engagementScore || 0}%</p>
              </div>
              <Award className="text-purple-500" size={24} />
            </div>
            <div className="mt-2 text-xs text-purple-600">Excellent level</div>
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
                  Avg: {userStats?.avgSessionTime}
                </div>
              </div>
              
              <div className="space-y-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                  const value = userStats?.weeklyActivity[index] || 0;
                  const maxValue = Math.max(...(userStats?.weeklyActivity || [1]));
                  const percentage = (value / maxValue) * 100;
                  
                  return (
                    <div key={day} className="flex items-center space-x-4">
                      <div className="w-12 text-sm text-gray-600">{day}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500 relative"
                          style={{ width: `${percentage}%` }}
                        >
                          <div className="absolute right-2 top-0 h-4 flex items-center">
                            <span className="text-white text-xs font-medium">{value}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
                            stroke="url(#gradient)"
                            strokeWidth="3"
                            strokeDasharray={`${percentage}, 100`}
                            className="transition-all duration-1000 ease-out"
                          />
                          <defs>
                            <linearGradient id="gradient" className={`bg-gradient-to-r ${colors[category]}`}>
                              <stop offset="0%" stopColor="#8b5cf6" />
                              <stop offset="100%" stopColor="#ec4899" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xl font-bold text-gray-900">{percentage}%</span>
                        </div>
                      </div>
                      <h4 className="font-medium text-gray-900">{category}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {percentage > 30 ? 'Primary interest' : percentage > 20 ? 'Secondary interest' : 'Occasional interest'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Behavior Patterns */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Brain className="mr-2 text-purple-600" size={20} />
                AI-Detected Patterns
              </h3>
              
              <div className="space-y-4">
                {behaviorAnalysis?.patterns.map((pattern, index) => (
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
                ))}
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
                    <span className="text-sm font-medium">{userStats?.learningProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${userStats?.learningProgress}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">Next Predictions</h4>
                  
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h5 className="font-medium text-blue-900">Next Likely Search</h5>
                      <p className="text-sm text-blue-700 mt-1">
                        <strong>{predictions?.nextSearch.city}</strong> ({predictions?.nextSearch.confidence}% confidence)
                      </p>
                      <p className="text-xs text-blue-600 mt-1">{predictions?.nextSearch.reason}</p>
                    </div>
                    
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <h5 className="font-medium text-purple-900">Best Travel Time</h5>
                      <p className="text-sm text-purple-700 mt-1">
                        <strong>{predictions?.bestTravelTime.period}</strong>
                      </p>
                      <p className="text-xs text-purple-600 mt-1">{predictions?.bestTravelTime.reason}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommended Activities */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended for You</h3>
              
              <div className="space-y-3">
                {predictions?.recommendedActivities.map((activity, index) => (
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
                ))}
              </div>
            </div>

            {/* Similar Users */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="mr-2 text-blue-600" size={18} />
                Community Insights
              </h3>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {predictions?.similarUsers.count}
                </div>
                <p className="text-sm text-gray-600 mb-4">travelers with similar interests</p>
                
                <div className="space-y-2">
                  {predictions?.similarUsers.commonInterests.map((interest, index) => (
                    <div key={index} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                      {interest}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Time Preferences */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="mr-2 text-orange-600" size={18} />
                Time Preferences
              </h3>
              
              <div className="space-y-3">
                {Object.entries(behaviorAnalysis?.timePreferences || {}).map(([time, percentage]) => (
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
          
          <button className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-300">
            Export Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserInsightsDashboard;