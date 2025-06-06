import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";

// Import pages
import Home from "./pages/Home";
import Questionnaire from "./pages/Questionnaire";
import Recommendations from "./pages/Recommendations";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import SignUp from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Itinerary from "./pages/Itinerary";

// Import components
import Navbar from "./components/Navbar";
import MLTestComponent from './components/MLTestComponent';
import UserInsightsDashboard from './components/UserInsightsDashboard';

// Import enhanced services
import EnhancedTrackingService from './services/EnhancedTrackingService';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication state with enhanced tracking
    const checkAuthenticationState = async () => {
      try {
        const stored = localStorage.getItem("isAuthenticated");
        const storedUser = localStorage.getItem("currentUser");
        const userId = localStorage.getItem("user_id");
        
        if (stored === "true") {
          setIsAuthenticated(true);
          
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            setUser(userData);
          }
          
          // Initialize enhanced tracking for authenticated user
          if (userId) {
            EnhancedTrackingService.setUserId(userId);
            console.log('✅ Enhanced tracking initialized for user:', userId);
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
          console.log('👋 Anonymous user - enhanced tracking active');
        }
      } catch (error) {
        console.error('Error checking authentication state:', error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthenticationState();

    // Monitor authentication changes
    const handleStorageChange = (e) => {
      if (e.key === 'isAuthenticated') {
        const newAuthState = e.newValue === 'true';
        setIsAuthenticated(newAuthState);
        
        if (!newAuthState) {
          setUser(null);
          EnhancedTrackingService.clearTrackingData();
          console.log('👋 User logged out - enhanced tracking cleared');
        }
      }
      
      if (e.key === 'currentUser' && e.newValue) {
        try {
          const userData = JSON.parse(e.newValue);
          setUser(userData);
          EnhancedTrackingService.setUserId(userData.id);
          console.log('👤 User data updated in enhanced tracking');
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse">
            <span className="text-2xl text-white">🧭</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading CityTailor...</p>
          <p className="text-sm text-gray-500 mt-2">🧠 Initializing AI system</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Navbar 
        isAuthenticated={isAuthenticated} 
        setIsAuthenticated={setIsAuthenticated}
        user={user}
        setUser={setUser}
      />
      
      <Routes>
        {/* Main Routes */}
        <Route path="/" element={<Navigate to="/home" />} />
        <Route path="/home" element={<Home />} />
        <Route path="/questionnaire" element={<Questionnaire />} />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route path="/itinerary" element={<Itinerary />} />
        
        {/* Auth Routes */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? 
              <Navigate to="/home" replace /> : 
              <Login setIsAuthenticated={setIsAuthenticated} setUser={setUser} />
          } 
        />
        <Route 
          path="/signup" 
          element={
            isAuthenticated ? 
              <Navigate to="/home" replace /> : 
              <SignUp setIsAuthenticated={setIsAuthenticated} setUser={setUser} />
          } 
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* User Routes */}
        <Route 
          path="/profile" 
          element={
            isAuthenticated ? 
              <Profile user={user} /> : 
              <Navigate to="/login" replace />
          } 
        />
        
        {/* ML & Analytics Routes */}
        <Route path="/ml-test" element={<MLTestComponent />} />
        
        {/* User Insights Dashboard - Available for all users but enhanced for authenticated */}
        <Route path="/insights" element={<UserInsightsDashboard />} />
        
        {/* Protected Analytics Route */}
        <Route 
          path="/analytics" 
          element={
            isAuthenticated ? 
              <UserInsightsDashboard /> : 
              <Navigate to="/login" state={{ from: '/analytics' }} replace />
          } 
        />
        
        {/* Admin/Debug Routes */}
        <Route path="/admin/ml-test" element={<MLTestComponent />} />
        <Route path="/admin/insights" element={<UserInsightsDashboard />} />
        
        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Enhanced Debug Panel for Development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-90 text-white text-xs p-4 rounded-lg max-w-sm border border-gray-600 z-50">
          <div className="font-mono space-y-1">
            <div className="text-green-400 font-bold mb-2">🧠 Enhanced Debug Panel</div>
            
            <div className="space-y-1">
              <div>Auth: {isAuthenticated ? '✅ Authenticated' : '❌ Anonymous'}</div>
              <div>User: {user?.email || user?.username || 'Anonymous'}</div>
              <div>Session: {EnhancedTrackingService.sessionId?.substring(0, 8)}...</div>
              <div>Engagement: {EnhancedTrackingService.getSessionMetrics?.()?.engagementLevel || 'N/A'}</div>
              <div>Context: {Object.keys(EnhancedTrackingService.getCurrentContext?.() || {}).length} factors</div>
              <div>Learning: {EnhancedTrackingService.getLearningStats?.()?.totalRules || 0} rules</div>
            </div>
            
            <div className="mt-3 pt-2 border-t border-gray-600 space-y-1">
              <a href="/ml-test" className="block text-blue-300 hover:text-blue-100 underline text-xs">
                🧪 ML Test Dashboard
              </a>
              <a href="/insights" className="block text-purple-300 hover:text-purple-100 underline text-xs">
                📊 User Insights
              </a>
              <button 
                onClick={() => {
                  if (EnhancedTrackingService.logTrackingState) {
                    EnhancedTrackingService.logTrackingState();
                  } else {
                    console.log('Enhanced Tracking Service not fully loaded');
                  }
                }}
                className="block text-yellow-300 hover:text-yellow-100 underline cursor-pointer text-xs"
              >
                🔍 Log Tracking State
              </button>
              <button 
                onClick={() => {
                  if (EnhancedTrackingService.exportInteractionData) {
                    console.log('📤 Session Data:', EnhancedTrackingService.exportInteractionData());
                  } else {
                    console.log('Export function not available');
                  }
                }}
                className="block text-green-300 hover:text-green-100 underline cursor-pointer text-xs"
              >
                📤 Export Session Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights Floating Button for Authenticated Users */}
      {isAuthenticated && (
        <div className="fixed bottom-6 left-6 z-40">
          <button
            onClick={() => window.location.href = '/insights'}
            className="w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center group"
            title="View your AI insights"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">🧠</span>
          </button>
        </div>
      )}

      {/* Real-time Learning Status Indicator */}
      <div className="fixed top-4 right-4 z-40">
        <div className="bg-white rounded-full shadow-lg px-3 py-2 border border-gray-200 hover:shadow-xl transition-shadow cursor-pointer">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-600 font-medium">
              🧠 AI Learning {isAuthenticated ? 'Personalized' : 'Active'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions Floating Menu */}
      {isAuthenticated && (
        <div className="fixed bottom-6 right-6 z-40">
          <div className="flex flex-col space-y-3">
            {/* ML Test Button */}
            <button
              onClick={() => window.location.href = '/ml-test'}
              className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center"
              title="ML Test Dashboard"
            >
              <span className="text-lg">🧪</span>
            </button>
            
            {/* Analytics Button */}
            <button
              onClick={() => window.location.href = '/analytics'}
              className="w-12 h-12 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center"
              title="Analytics Dashboard"
            >
              <span className="text-lg">📊</span>
            </button>
          </div>
        </div>
      )}

      {/* Context-aware Notification Banner */}
      {EnhancedTrackingService.getCurrentContext?.()?.weather === 'rainy' && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-blue-100 border border-blue-300 text-blue-800 px-4 py-2 rounded-lg shadow-lg">
            <div className="flex items-center space-x-2">
              <span>🌧️</span>
              <span className="text-sm font-medium">
                It's raining! Check out our indoor activities.
              </span>
              <button 
                onClick={() => window.location.href = '/questionnaire'}
                className="text-blue-600 hover:text-blue-800 underline text-sm ml-2"
              >
                Explore
              </button>
            </div>
          </div>
        </div>
      )}
    </Router>
  );
}

export default App;