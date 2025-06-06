import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supaBaseClient';
import { Eye, EyeOff } from 'lucide-react';
import UserStorage from "./userStorage";

const Login = ({ setIsAuthenticated }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasPendingItinerary, setHasPendingItinerary] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const pendingItinerary = sessionStorage.getItem('pendingItinerary');
    setHasPendingItinerary(!!pendingItinerary);
  }, []);

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMessage(error.message);
    } else if (data.user && data.user.confirmed_at) {
      // Salvează tokenul și userul
      localStorage.setItem('token', data.session.access_token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));

      // 🔁 Migrează datele de la utilizatorul anonim
      UserStorage.migrateAnonymousDataToUser(data.user.id || data.user.email);

      // Setează stare de autentificare
      setIsAuthenticated(true);

      const pendingItinerary = sessionStorage.getItem('pendingItinerary');
      if (pendingItinerary) {
        sessionStorage.removeItem('pendingItinerary');
        const parsedItinerary = JSON.parse(pendingItinerary);
        navigate('/itinerary', {
          state: {
            itineraryItems: parsedItinerary.items,
            city: parsedItinerary.city
          }
        });
      } else {
        navigate('/home');
      }
    } else {
      setErrorMessage('Email not confirmed');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    handleLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>

        {hasPendingItinerary && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              You have an unsaved itinerary. Please login to continue.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            className="w-full mb-4 p-2 border border-gray-300 rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="relative mb-4">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              className="w-full p-2 border border-gray-300 rounded pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2 text-gray-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errorMessage && (
            <p className="text-red-500 text-sm mb-4 text-center">{errorMessage}</p>
          )}
          <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">
            Login
          </button>
        </form>
        <p className="mt-4 text-center">
          Don't have an account?{' '}
          <a href="/signup" className="text-blue-500 hover:underline">Sign up</a>
        </p>
        <p className="text-sm text-center mt-2">
          <a href="/forgot-password" className="text-blue-500 hover:underline">
            Forgot your password?
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
