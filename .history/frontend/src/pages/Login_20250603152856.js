import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supaBaseClient';
import { Eye, EyeOff, MapPin, AlertCircle, Info } from 'lucide-react';
import UserStorage from "./userStorage";
import trackingService from "../services/TrackingService";

const Login = ({ setIsAuthenticated, setUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasPendingItinerary, setHasPendingItinerary] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const pendingItinerary = sessionStorage.getItem('pendingItinerary');
    setHasPendingItinerary(!!pendingItinerary);
  }, []);

  const handleLogin = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
    } else if (data.user && data.user.confirmed_at) {
      console.log('User logged in:', data.user);
      
      // Salvează tokenul și userul
      localStorage.setItem('token', data.session.access_token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));

      // Set user in App state
      const userInfo = {
        id: data.user.id,
        email: data.user.email,
        username: data.user.user_metadata?.username || data.user.email?.split('@')[0],
        created_at: data.user.created_at
      };
      setUser(userInfo);

      // 🤖 Set user in tracking service IMMEDIATELY after setting currentUser
      const userId = data.user.id || data.user.email;
      console.log('🤖 Setting user in tracking service:', userId.substring(0, 8) + '...');
      trackingService.setUserId(userId);

      // 🔁 Migrează datele de la utilizatorul anonim DUPĂ ce am setat currentUser
      console.log('Starting migration for user:', userId.substring(0, 8) + '...');
      
      // Așteaptă un pic să se sincronizeze localStorage și tracking service
      setTimeout(() => {
        UserStorage.migrateAnonymousDataToUser(userId);
        
        // Trigger o reîncărcare a datelor în hook-uri prin forțarea unui re-render
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'currentUser',
          newValue: JSON.stringify(data.user)
        }));
        
        console.log('Migration completed');
      }, 200); // Increased timeout to allow tracking service to initialize

      // Setează stare de autentificare
      setIsAuthenticated(true);

      const pendingItinerary = sessionStorage.getItem('pendingItinerary');
      if (pendingItinerary) {
        sessionStorage.removeItem('pendingItinerary');
        const parsedItinerary = JSON.parse(pendingItinerary);
        
        // Așteaptă puțin pentru ca migrarea să se finalizeze
        setTimeout(() => {
          navigate('/itinerary', {
            state: {
              itineraryItems: parsedItinerary.items,
              city: parsedItinerary.city
            }
          });
        }, 300);
      } else {
        setTimeout(() => {
          navigate('/home');
        }, 300);
      }
      setIsLoading(false);
    } else {
      setErrorMessage('Email not confirmed');
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    handleLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.08),transparent_50%)]"></div>
      </div>

      {/* Floating Shapes */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-bounce"></div>
      <div className="absolute top-32 right-16 w-16 h-16 bg-white/10 rounded-full animate-pulse"></div>
      <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-white/10 rounded-full animate-bounce delay-300"></div>
      <div className="absolute bottom-32 right-1/3 w-8 h-8 bg-white/10 rounded-full animate-pulse delay-500"></div>

      {/* Main Container */}
      <div className="relative z-10 bg-white/95 backdrop-blur-xl border border-white/20 rounded-3xl p-8 md:p-12 w-full max-w-md mx-4 shadow-[0_32px_64px_rgba(0,0,0,0.15)] transform transition-all duration-300 hover:scale-105 hover:shadow-[0_40px_80px_rgba(0,0,0,0.2)]">
        
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg transform animate-pulse">
            <MapPin size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600 font-medium">Sign in to continue your journey</p>
        </div>

        {/* Pending Itinerary Alert */}
        {hasPendingItinerary && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl flex items-center gap-3 transform animate-slideInDown">
            <div className="flex-shrink-0">
              <Info size={20} className="text-blue-600" />
            </div>
            <p className="text-sm text-blue-800 font-medium">
              You have an unsaved itinerary. Please login to continue.
            </p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div className="group">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-300 group-hover:border-gray-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password Input */}
          <div className="group relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              className="w-full px-4 py-4 pr-12 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-300 group-hover:border-gray-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl flex items-center gap-3 animate-shake">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
            </div>
          )}

          {/* Login Button */}
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-center gap-2">
              {isLoading && (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              )}
              <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
            </div>
          </button>
        </form>

        {/* Links Section */}
        <div className="mt-8 text-center space-y-4">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <a 
              href="/signup" 
              className="font-semibold text-blue-600 hover:text-purple-600 transition-colors duration-200 relative group"
            >
              <span className="relative z-10">Create one</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 group-hover:w-full transition-all duration-300"></span>
            </a>
          </p>
          <a 
            href="/forgot-password" 
            className="inline-block text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors duration-200 relative group"
          >
            <span className="relative z-10">Forgot your password?</span>
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
          </a>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInDown {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        .animate-slideInDown {
          animation: slideInDown 0.5s ease-out;
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Login;