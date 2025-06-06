import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import trackingService from "../services/TrackingService";
import UserStorage from "./userStorage";

const Home = () => {
  const navigate = useNavigate();
  const [mlRecommendations, setMlRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTryItOut, setShowTryItOut] = useState(true);
  const [debugInfo, setDebugInfo] = useState(null);

  // Fetch ML recommendations from backend
  const fetchMLRecommendations = async () => {
    try {
      const data = await trackingService.getHomeRecommendations(12);
      
      console.log('ML Response received:', {
        status: data.status,
        recommendation_type: data.recommendations?.recommendation_type,
        has_activity: data.metadata?.has_activity,
        count: data.recommendations?.main_recommendations?.length || 0
      });
      
      if (data.status === 'success') {
        setMlRecommendations(data.recommendations);
        
        // Decide dacă să afișeze "Try it out" sau recomandările
        const hasActivity = data.metadata?.has_activity;
        const hasRecommendations = data.recommendations?.main_recommendations?.length > 0;
        
        setShowTryItOut(!hasActivity || !hasRecommendations);
        
        setDebugInfo({
          has_activity: hasActivity,
          activity_count: data.metadata?.activity_count || 0,
          recommendation_type: data.recommendations?.recommendation_type,
          data_source: data.recommendations?.data_source
        });
      } else {
        setShowTryItOut(true);
      }
    } catch (err) {
      console.error('Failed to fetch ML recommendations:', err);
      setShowTryItOut(true);
    }
  };

  // Enhanced tracking pentru place interactions
  const handlePlaceView = async (place, index) => {
    try {
      await trackingService.trackPlaceView(
        place.name,
        place.id || place.place_id,
        place.city,
        place.lat,
        place.lon,
        index
      );
    } catch (error) {
      console.warn('Failed to track place view:', error);
    }
  };

  const handleFavorite = async (place) => {
    try {
      // Update local storage
      const userId = UserStorage.getCurrentUserId();
      const favorites = JSON.parse(localStorage.getItem(`${userId}_favorites`)) || [];
      
      if (!favorites.includes(place.name)) {
        favorites.push(place.name);
        localStorage.setItem(`${userId}_favorites`, JSON.stringify(favorites));
        
        // Backward compatibility
        const globalFavorites = JSON.parse(localStorage.getItem("userFavorites")) || [];
        if (!globalFavorites.includes(place.name)) {
          globalFavorites.push(place.name);
          localStorage.setItem("userFavorites", JSON.stringify(globalFavorites));
        }
      }

      // Track cu ML system (important pentru următoarele recomandări)
      await trackingService.trackFavorite(
        place.name,
        place.id || place.place_id,
        place.city,
        place.lat,
        place.lon
      );

      console.log(`Added ${place.name} to favorites`);
      
      // Refresh recommendations după o perioadă scurtă
      setTimeout(() => {
        fetchMLRecommendations();
      }, 1000);
      
    } catch (error) {
      console.warn('Failed to track favorite:', error);
    }
  };

  const handleAddToItinerary = async (place) => {
    try {
      // Update local storage
      const userId = UserStorage.getCurrentUserId();
      const itinerary = JSON.parse(localStorage.getItem(`${userId}_itinerary`)) || [];
      
      const newItem = {
        name: place.name,
        city: place.city,
        lat: place.lat,
        lon: place.lon,
        id: place.id || place.place_id
      };
      
      if (!itinerary.find(item => item.name === place.name)) {
        itinerary.push(newItem);
        localStorage.setItem(`${userId}_itinerary`, JSON.stringify(itinerary));
        
        // Backward compatibility
        const globalItinerary = JSON.parse(localStorage.getItem("userItinerary")) || [];
        if (!globalItinerary.find(item => item.name === place.name)) {
          globalItinerary.push(newItem);
          localStorage.setItem("userItinerary", JSON.stringify(globalItinerary));
        }
      }

      // Track cu ML system (important pentru următoarele recomandări)
      await trackingService.trackAddToItinerary(
        place.name,
        place.id || place.place_id,
        place.city,
        place.lat,
        place.lon
      );

      console.log(`Added ${place.name} to itinerary`);
      
      // Refresh recommendations după o perioadă scurtă
      setTimeout(() => {
        fetchMLRecommendations();
      }, 1000);
      
    } catch (error) {
      console.warn('Failed to track add to itinerary:', error);
    }
  };

  // Initialize on mount
  useEffect(() => {
    trackingService.trackPageView('Home');

    // Set user in tracking service
    const userId = UserStorage.getCurrentUserId();
    if (userId && userId !== 'anonymous') {
      trackingService.setCurrentUser(userId);
    }

    // Fetch ML recommendations
    fetchMLRecommendations().finally(() => {
      setLoading(false);
    });

    return () => {
      trackingService.trackPageExit('Home');
    };
  }, []);

  // Refresh when user changes
  useEffect(() => {
    const handleUserChange = () => {
      const userId = UserStorage.getCurrentUserId();
      if (userId && userId !== 'anonymous') {
        trackingService.setCurrentUser(userId);
      }
      
      // Refresh recommendations
      fetchMLRecommendations();
    };

    window.addEventListener('storage', handleUserChange);
    return () => {
      window.removeEventListener('storage', handleUserChange);
    };
  }, []);

  // Component pentru cardul de recomandare
  const RecommendationCard = ({ place, index, section = "main" }) => (
    <div 
      key={`${section}-${index}`}
      className="group bg-white/95 backdrop-blur-sm text-gray-800 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:scale-105 hover:-translate-y-2 border border-white/20"
      onClick={() => handlePlaceView(place, index)}
    >
      <div className="flex justify-between items-start mb-3">
        <h2 className="text-xl font-bold group-hover:text-purple-600 transition-colors duration-300">
          {place.name}
        </h2>
        {place.data_source === 'database' && (
          <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-3 py-1 rounded-full shadow-lg">
            AI Match
          </span>
        )}
        {place.recommendation_reason && (
          <span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs px-3 py-1 rounded-full shadow-lg">
            Personalized
          </span>
        )}
      </div>

      <div className="relative overflow-hidden rounded-xl mb-4 group">
        {(place.pictures?.length > 0 || place.image_url) && (
          <>
            <img
              src={place.pictures?.[0]?.url || place.pictures?.[0] || place.image_url}
              alt={place.name}
              className="w-full h-48 object-cover transition-transform duration-700 group-hover:scale-110"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop&q=80";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </>
        )}
      </div>

      <div className="relative">
        <p className="text-sm mb-3 text-gray-600 leading-relaxed">
          {place.description || place.recommendation_reason || "Discover this amazing destination and create unforgettable memories."}
        </p>
      </div>

      <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
        <div className="flex items-center space-x-1">
          <span>⏱️</span>
          <span className="font-medium">{place.minimumDuration || "2-4h"}</span>
        </div>
        {place.city && (
          <div className="flex items-center space-x-1">
            <span>📍</span>
            <span className="font-medium">{place.city}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mb-4">
        <span className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 text-xs px-3 py-2 rounded-full border border-blue-200 font-semibold">
          {place.category || "Experience"}
        </span>
        <div className="text-sm">
          {place.rating && (
            <span className="text-yellow-600 font-bold">
              ⭐ {Number(place.rating).toFixed(1)}
            </span>
          )}
          {place.popularity_score && (
            <span className="text-blue-600 font-bold ml-2">
              Score: {Math.round(place.popularity_score)}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleFavorite(place);
          }}
          className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white text-sm py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
        >
          ❤️ Save Favorite
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleAddToItinerary(place);
          }}
          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
        >
          ✈️ Add to Trip
        </button>
      </div>

      {place.recommendation_reason && (
        <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
          <div className="text-xs text-gray-600 italic flex items-center space-x-2">
            <span>💡</span>
            <span>{place.recommendation_reason}</span>
          </div>
        </div>
      )}
    </div>
  );

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto p-8 relative z-10">
          <div className="text-center text-xl">
            <div className="relative inline-block">
              <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-6 shadow-lg"></div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl inline-block shadow-xl">
              <p className="font-medium">Crafting your perfect travel experience...</p>
              <p className="text-sm opacity-75 mt-2">Loading personalized recommendations</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render "Try it out" state
  if (showTryItOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white relative overflow-hidden">
        {/* Floating background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-float"></div>
          <div className="absolute top-1/3 right-20 w-48 h-48 bg-yellow-400/20 rounded-full blur-2xl animate-float-delayed"></div>
          <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-pink-400/20 rounded-full blur-xl animate-float-slow"></div>
        </div>

        <div className="max-w-7xl mx-auto p-8 relative z-10">
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-lg p-12 rounded-3xl shadow-2xl border border-white/20 max-w-2xl mx-auto">
              <div className="mb-8">
                <div className="text-8xl mb-4 animate-bounce">🗺️</div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-200 to-white bg-clip-text text-transparent">
                  Ready to Explore the World?
                </h2>
                <div className="w-16 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto mb-6"></div>
              </div>
              
              <p className="text-xl mb-8 opacity-90 leading-relaxed">
                Your adventure begins with a single step! <br/>
                Tell us about your travel dreams and we'll create a personalized journey just for you.
              </p>
              
              <div className="space-y-4">
                <button 
                  onClick={() => navigate('/questionnaire')}
                  className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 hover:from-yellow-500 hover:via-orange-600 hover:to-red-600 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-yellow-500/25 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 border-2 border-white/20"
                >
                  Start Your Journey
                </button>
                
                <div className="text-sm opacity-75">
                  <p>Personalized recommendations • AI-powered suggestions • Endless possibilities</p>
                </div>
              </div>
              
              {/* Debug info în development */}
              {process.env.NODE_ENV === 'development' && debugInfo && (
                <div className="mt-8 text-xs bg-white/10 p-3 rounded-lg">
                  <p>Debug: Activity: {debugInfo.has_activity ? 'Yes' : 'No'}</p>
                  <p>Count: {debugInfo.activity_count}</p>
                  <p>Type: {debugInfo.recommendation_type}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
          
          @keyframes float-delayed {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-30px) rotate(-5deg); }
          }
          
          @keyframes float-slow {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(3deg); }
          }
          
          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
          
          .animate-float-delayed {
            animation: float-delayed 8s ease-in-out infinite;
          }
          
          .animate-float-slow {
            animation: float-slow 10s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  // Render recomandările ML
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white relative overflow-hidden">
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-float"></div>
        <div className="absolute top-1/3 right-20 w-48 h-48 bg-yellow-400/20 rounded-full blur-2xl animate-float-delayed"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-pink-400/20 rounded-full blur-xl animate-float-slow"></div>
      </div>

      <div className="max-w-7xl mx-auto p-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-6 shadow-2xl">
            <span className="text-4xl animate-bounce">🌍</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">
            Your Personalized Recommendations
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-white to-transparent mx-auto mb-6"></div>
          
          {mlRecommendations && (
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl inline-block">
              <p className="text-lg opacity-90">
                {mlRecommendations.recommendation_type === 'personalized' && "Curated based on your preferences and activity"}
                {mlRecommendations.recommendation_type === 'session_based' && "Based on your recent searches"}
                {mlRecommendations.recommendation_type === 'general_popular' && "Popular destinations to explore"}
                {mlRecommendations.recommendation_type === 'database_powered' && "Great destinations from our database"}
              </p>
              {debugInfo && (
                <p className="text-sm opacity-75 mt-2">
                  Activity count: {debugInfo.activity_count} • Source: {debugInfo.data_source}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Main Recommendations */}
        {mlRecommendations?.main_recommendations?.length > 0 && (
          <div className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Perfect For You</h2>
              <p className="text-lg opacity-80">Destinations selected based on your interests</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {mlRecommendations.main_recommendations.map((place, index) => (
                <RecommendationCard key={`main-${index}`} place={place} index={index} section="main" />
              ))}
            </div>
          </div>
        )}

        {/* Additional Sections */}
        {mlRecommendations?.in_your_favorite_cities?.length > 0 && (
          <div className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">In Your Favorite Cities</h2>
              <p className="text-lg opacity-80">More places in cities you love</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {mlRecommendations.in_your_favorite_cities.map((place, index) => (
                <RecommendationCard key={`cities-${index}`} place={place} index={index} section="cities" />
              ))}
            </div>
          </div>
        )}

        {mlRecommendations?.popular_destinations?.length > 0 && (
          <div className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Popular Destinations</h2>
              <p className="text-lg opacity-80">Trending places other travelers love</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {mlRecommendations.popular_destinations.map((place, index) => (
                <RecommendationCard key={`popular-${index}`} place={place} index={index} section="popular" />
              ))}
            </div>
          </div>
        )}

        {/* Stats Footer */}
        <div className="text-center mt-16">
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl inline-block shadow-xl border border-white/20">
            <div className="flex items-center justify-center space-x-8 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🎯</span>
                <span>
                  <strong>
                    {mlRecommendations?.main_recommendations?.length || 0}
                  </strong> 
                  Recommendations
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🤖</span>
                <span>
                  <strong>{mlRecommendations?.personalization_level || 'AI'}</strong> 
                  Personalization
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">📊</span>
                <span>
                  <strong>{debugInfo?.activity_count || 0}</strong> 
                  Activities
                </span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="mt-6 flex gap-4 justify-center">
              <button
                onClick={() => navigate('/questionnaire')}
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all duration-300"
              >
                Find More Places
              </button>
              <button
                onClick={() => fetchMLRecommendations()}
                className="bg-white/20 text-white px-6 py-3 rounded-xl font-medium hover:bg-white/30 transition-all duration-300"
              >
                Refresh Recommendations
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(-5deg); }
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(3deg); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }
        
        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Home;