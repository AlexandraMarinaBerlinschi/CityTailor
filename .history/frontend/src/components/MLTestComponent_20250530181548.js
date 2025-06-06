import React, { useState, useEffect } from 'react';
import trackingService from '../services/TrackingService';

const MLTestComponent = () => {
  const [mlStats, setMlStats] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Test ML System Health
  const testMLSystem = async () => {
    setIsLoading(true);
    const result = await trackingService.testMLSystem();
    setSystemHealth(result);
    setIsLoading(false);
  };

  // Load ML Stats
  const loadMLStats = async () => {
    const stats = await trackingService.getMLStats();
    setMlStats(stats);
  };

  // Load User Profile
  const loadUserProfile = async () => {
    const profile = await trackingService.getMLUserProfile();
    setUserProfile(profile);
  };

  // Simulate user interactions for testing
  const simulateUserBehavior = async () => {
    setIsLoading(true);
    const results = [];

    try {
      // Test 1: Track searches
      results.push("🔍 Testing search tracking...");
      await trackingService.trackSearch("Paris", ["Cultural", "Gastronomy"], "2-4h");
      await trackingService.trackSearch("Rome", ["Outdoor", "Cultural"], ">4h");
      results.push("✅ Search tracking completed");

      // Test 2: Track place interactions
      results.push("📍 Testing place interactions...");
      await trackingService.trackPlaceView("Eiffel Tower", "eiffel_001", "Paris", 48.8584, 2.2945, 1);
      await trackingService.trackFavorite("Louvre Museum", "louvre_001", "Paris", 48.8606, 2.3376);
      await trackingService.trackAddToItinerary("Colosseum", "colosseum_001", "Rome", 41.8902, 12.4922);
      results.push("✅ Place interactions completed");

      // Test 3: Get ML recommendations
      results.push("🤖 Testing ML recommendations...");
      const recommendations = await trackingService.getMLRecommendations(5);
      if (recommendations?.recommendations?.main_recommendations?.length > 0) {
        results.push(`✅ Received ${recommendations.recommendations.main_recommendations.length} ML recommendations`);
        results.push(`📊 Recommendation type: ${recommendations.recommendations.recommendation_type}`);
      } else {
        results.push("⚠️ No ML recommendations received");
      }

      // Test 4: Enhanced search
      results.push("🔍 Testing enhanced search...");
      const searchResults = await trackingService.searchWithMLTracking("Barcelona", ["Outdoor", "Cultural"], "2-4h");
      if (searchResults?.recommendations?.length > 0) {
        results.push(`✅ Enhanced search returned ${searchResults.recommendations.length} results`);
        results.push(`🔗 ML Enhanced: ${searchResults.ml_enhanced ? 'Yes' : 'No'}`);
      } else {
        results.push("⚠️ Enhanced search returned no results");
      }

      results.push("🎉 All tests completed successfully!");

    } catch (error) {
      results.push(`❌ Test failed: ${error.message}`);
    }

    setTestResults(results);
    setIsLoading(false);

    // Reload stats and profile after testing
    loadMLStats();
    loadUserProfile();
  };

  useEffect(() => {
    // Load initial data
    testMLSystem();
    loadMLStats();
    loadUserProfile();
  }, []);

  const debugInfo = trackingService.getDebugInfo();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">ML System Testing Dashboard</h1>
        
        {/* Debug Info */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🔍 Current Tracking State</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{debugInfo.userType}</div>
              <div className="text-sm text-gray-600">User Type</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{debugInfo.sessionId?.substring(0, 8)}...</div>
              <div className="text-sm text-gray-600">Session ID</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{debugInfo.timeSpent?.toFixed(0)}s</div>
              <div className="text-sm text-gray-600">Time on Page</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{debugInfo.userId ? 'Auth' : 'Anon'}</div>
              <div className="text-sm text-gray-600">Auth Status</div>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">🧪 ML System Health</h2>
            <button
              onClick={testMLSystem}
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {isLoading ? 'Testing...' : 'Test System'}
            </button>
          </div>
          
          {systemHealth ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${systemHealth.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {systemHealth.status === 'success' ? '✅' : '❌'}
                </div>
                <div className="text-sm text-gray-600">System Status</div>
              </div>
              
              {systemHealth.ml_system_health && (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {systemHealth.ml_system_health.places_in_db || 0}
                    </div>
                    <div className="text-sm text-gray-600">Places in DB</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {systemHealth.ml_system_health.activities_tracked || 0}
                    </div>
                    <div className="text-sm text-gray-600">Activities Tracked</div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500">Click "Test System" to check ML health</div>
          )}
        </div>

        {/* ML Stats */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">📊 ML Statistics</h2>
            <button
              onClick={loadMLStats}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
            >
              Refresh Stats
            </button>
          </div>
          
          {mlStats?.ml_system_stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {mlStats.ml_system_stats.total_activities_tracked}
                </div>
                <div className="text-sm text-gray-600">Total Activities</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {mlStats.ml_system_stats.users_with_profiles}
                </div>
                <div className="text-sm text-gray-600">User Profiles</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {mlStats.ml_system_stats.places_in_database}
                </div>
                <div className="text-sm text-gray-600">Places Tracked</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${mlStats.ml_system_stats.system_health === 'healthy' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {mlStats.ml_system_stats.system_health === 'healthy' ? '💚' : '⚠️'}
                </div>
                <div className="text-sm text-gray-600">System Health</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">Loading ML statistics...</div>
          )}
        </div>

        {/* User Profile */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">👤 User ML Profile</h2>
            <button
              onClick={loadUserProfile}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg"
            >
              Load Profile
            </button>
          </div>
          
          {userProfile?.profile ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Preferences:</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {(userProfile.profile.preferences.cultural * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600">Cultural</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {(userProfile.profile.preferences.outdoor * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600">Outdoor</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">
                      {(userProfile.profile.preferences.relaxation * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600">Relaxation</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">
                      {(userProfile.profile.preferences.gastronomy * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600">Gastronomy</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Activity Stats:</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {userProfile.profile.stats.total_activities}
                    </div>
                    <div className="text-sm text-gray-600">Total Activities</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {userProfile.profile.stats.engagement_level}
                    </div>
                    <div className="text-sm text-gray-600">Engagement</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold ${userProfile.profile.stats.is_new_user ? 'text-yellow-600' : 'text-blue-600'}`}>
                      {userProfile.profile.stats.is_new_user ? 'New' : 'Experienced'}
                    </div>
                    <div className="text-sm text-gray-600">User Type</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              {debugInfo.userId ? 'Click "Load Profile" to see ML profile' : 'Login required for user profile'}
            </div>
          )}
        </div>

        {/* Test Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">🧪 Behavioral Testing</h2>
            <button
              onClick={simulateUserBehavior}
              disabled={isLoading}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {isLoading ? 'Running Tests...' : 'Simulate User Behavior'}
            </button>
          </div>
          
          {testResults.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm mb-1 font-mono">
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">⚡ Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => trackingService.trackSearch("Tokyo", ["Cultural"], "2-4h")}
              className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg text-sm"
            >
              🔍 Track Tokyo Search
            </button>
            <button
              onClick={() => trackingService.trackFavorite("Test Place", "test_001", "Test City")}
              className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-lg text-sm"
            >
              ❤️ Track Favorite
            </button>
            <button
              onClick={() => trackingService.getMLRecommendations(3)}
              className="bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-lg text-sm"
            >
              🤖 Get ML Recs
            </button>
            <button
              onClick={() => trackingService.logTrackingState()}
              className="bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-lg text-sm"
            >
              🔍 Log Debug Info
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MLTestComponent;