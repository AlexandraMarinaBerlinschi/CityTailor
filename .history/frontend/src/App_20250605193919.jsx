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
        const userId = localStorage.getItem("user_id");
        
        if (stored === "true") {
          setIsAuthenticated(true);
          
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            setUser(userData);
          }
          
          // Initialize enhanced tracking for authenticated user
          if (userId) {
            trackingService.setCurrentUser(userId);
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
          trackingService.clearTrackingData();
          console.log('👋 User logged out - enhanced tracking cleared');
        }
      }
      
      if (e.key === 'currentUser' && e.newValue) {
        try {
          const userData = JSON.parse(e.newValue);
          setUser(userData);
          trackingService.setCurrentUser(userData.id);
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
        
        {/* ML & Debug Routes */}
        <Route path="/ml-test" element={<MLTestComponent />} />
        <Route path="/admin/ml-test" element={<MLTestComponent />} />
        
        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Real-time Learning Status Indicator */}
      <div className="fixed bottom-4 right-4 z-30">
        <div className="bg-white/90 backdrop-blur-sm rounded-full shadow-lg px-3 py-2 border border-gray-200 hover:shadow-xl transition-all duration-300 cursor-pointer">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-600 font-medium">
               AI Learning {isAuthenticated ? 'Personalized' : 'Active'}
            </span>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;