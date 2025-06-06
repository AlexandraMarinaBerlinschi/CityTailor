
import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../supaBaseClient';

// Create context
const AuthContext = createContext(null);

// Create provider
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (data && data.session) {
        setIsAuthenticated(true);
        // Store token in localStorage for API calls
        localStorage.setItem('token', data.session.access_token);
        
        // Get user data
        const { data: userData } = await supabase.auth.getUser();
        if (userData && userData.user) {
          setUser(userData.user);
        }
      }
      
      setLoading(false);
    };
    
    checkSession();
    
    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setIsAuthenticated(true);
          setUser(session.user);
          localStorage.setItem('token', session.access_token);
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setUser(null);
          localStorage.removeItem('token');
        }
      }
    );
    
    // Cleanup
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Sign out function
  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('token');
  };

  // Check if token is valid
  const checkToken = async () => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
      const { data, error } = await supabase.auth.getUser();
      return !error && !!data.user;
    } catch (error) {
      console.error("Token validation error:", error);
      return false;
    }
  };

  // Context value
  const value = {
    isAuthenticated,
    setIsAuthenticated,
    user,
    loading,
    signOut,
    checkToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Create custom hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Protect routes that require authentication
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);
  
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  return isAuthenticated ? children : null;
};