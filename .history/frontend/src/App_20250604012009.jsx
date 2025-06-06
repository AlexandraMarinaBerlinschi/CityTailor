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
import trackingService from './services/TrackingService';

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
        const token = localStorage.getItem("token");
        
        console.log('🔍 Checking auth state:', { stored, hasUser: !!storedUser, hasToken: !!token });
        
        if (stored === "true" && token && storedUser && storedUser !== 'null') {
          setIsAuthenticated(true);
          
          try {
            const userData = JSON.parse(storedUser);
            setUser(userData);
            
            // FIXED: Use setUserId instead of setCurrentUser
            if (userData?.id) {
              trackingService.setUserId(userData.id);
              console.log('✅ Enhanced tracking initialized for user:', userData.id.substring(0, 8) + '...');
            }
          } catch (parseError) {
            console.error('Error parsing stored user data:', parseError);
            // Clear invalid data
            localStorage.removeItem("currentUser");
            localStorage.removeItem("isAuthenticated");
            localStorage.removeItem("token");
            setIsAuthenticated(false);
            setUser(null);
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
          // Ensure tracking service starts fresh for anonymous user
          trackingService.refreshUserState();
          console.log('👋 Anonymous user - enhanced tracking active');
        }
      } catch (error) {
        console.error('Error checking authentication state:', error);
        setIsAuthenticated(false);
        setUser(null);
        trackingService.clearTrackingData();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthenticationState();

    // Monitor authentication changes
    const handleStorageChange = (e) => {
      console.log('📦 Storage change detected:', e.key, e.newValue);
      
      if (e.key === 'isAuthenticated') {
        const newAuthState = e.newValue === 'true';
        setIsAuthenticated(newAuthState);
        
        if (!newAuthState) {
          setUser(null);
          trackingService.clearTrackingData();
          console.log('👋 User logged out - enhanced tracking cleared');
        }
      }
      
      if (e.key === 'currentUser') {
        if (e.newValue && e.newValue !== 'null') {
          try {
            const userData = JSON.parse(e.newValue);
            setUser(userData);
            // FIXED: Use setUserId instead of setCurrentUser
            trackingService.setUserId(userData.id);
            console.log('👤 User data updated in enhanced tracking');
          } catch (error) {
            console.error('Error parsing user data:', error);
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          setUser(null);
          if (isAuthenticated) {
            setIsAuthenticated(false);
            trackingService.clearTrackingData();
          }
        }
      }
      
      if (e.key === 'token' && !e.newValue) {
        // Token was removed
        setIsAuthenticated(false);
        setUser(null);
        trackingService.clearTrackingData();
        console.log('🔑 Token removed - user logged out');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for tracking service events
    const handleTrackingUpdate = (e) => {
      console.log('🔄 Tracking service updated:', e.detail);
    };
    
    window.addEventListener('tracking-user-updated', handleTrackingUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tracking-user-updated', handleTrackingUpdate);
    };
  }, [isAuthenticated]);

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

      {/* Real-time Learning Status Indicator - Moved to bottom */}
      <div className="fixed bottom-4 right-4 z-30">
        <div className="bg-white/90 backdrop-blur-sm rounded-full shadow-lg px-3 py-2 border border-gray-200 hover:shadow-xl transition-all duration-300 cursor-pointer">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${isAuthenticated ? 'bg-green-500' : 'bg-blue-500'}`}></div>
            <span className="text-xs text-gray-600 font-medium">
               AI Learning {isAuthenticated ? 'Personalized' : 'Active'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions Floating Menu - Adjusted position */}
      {isAuthenticated && (
        <div className="fixed bottom-6 right-6 z-40">
          <div className="flex flex-col space-y-3">
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

      {/* Debug Info in Development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 left-4 z-50 bg-black/80 text-white p-2 rounded text-xs max-w-xs">
          <div className="space-y-1">
            <div>Auth: {isAuthenticated ? '✅' : '❌'}</div>
            <div>User: {user?.id?.substring(0, 8) || 'None'}...</div>
            <div>Token: {localStorage.getItem('token') ? '✅' : '❌'}</div>
            <div>Tracking: {trackingService.userId ? trackingService.userId.substring(0, 8) + '...' : 'Anonymous'}</div>
          </div>
        </div>
      )}
    </Router>
  );
}

export default App;