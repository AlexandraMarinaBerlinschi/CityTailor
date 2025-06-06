import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import trackingService from "../services/TrackingService";

function getMLRecommendations(allPlaces, userPrefs, favorites, itinerary) {
  return allPlaces
    .map((place) => {
      let score = 0;

      if (userPrefs.activities?.includes(place.category)) score += 3;

      if (userPrefs.time === ">4h" && place.minimumDuration === ">4h") score += 2;
      if (userPrefs.time === "<2h" && place.minimumDuration === "<2h") score += 2;

      if (favorites.has(place.name)) score += 5;

      if (itinerary.find((i) => i.name === place.name)) score += 4;

      return { ...place, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); 
}

const Home = () => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [mlRecommendations, setMlRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const fetchMLRecommendations = async () => {
    try {
      const userId = localStorage.getItem('user_id') || null;
      const sessionId = trackingService.sessionId; 
      
      const params = new URLSearchParams({ limit: '8' });
      if (userId) params.append('user_id', userId);
      if (sessionId) params.append('session_id', sessionId);

      const response = await fetch(`http://localhost:8000/ml/home-recommendations?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setMlRecommendations(data.recommendations);
        
        console.log('🤖 ML Recommendations loaded:', data.recommendations);
      }
    } catch (err) {
      console.error('Failed to fetch ML recommendations:', err);
    }
  };

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
      const favorites = JSON.parse(localStorage.getItem("userFavorites")) || [];
      if (!favorites.includes(place.name)) {
        favorites.push(place.name);
        localStorage.setItem("userFavorites", JSON.stringify(favorites));
      }

      await trackingService.trackFavorite(
        place.name,
        place.id || place.place_id,
        place.city,
        place.lat,
        place.lon
      );

      console.log(`❤️ Added ${place.name} to favorites`);
    } catch (error) {
      console.warn('Failed to track favorite:', error);
    }
  };

  const handleAddToItinerary = async (place) => {
    try {
      const itinerary = JSON.parse(localStorage.getItem("userItinerary")) || [];
      if (!itinerary.find(item => item.name === place.name)) {
        itinerary.push({
          name: place.name,
          city: place.city,
          lat: place.lat,
          lon: place.lon,
          id: place.id || place.place_id
        });
        localStorage.setItem("userItinerary", JSON.stringify(itinerary));
      }

      await trackingService.trackAddToItinerary(
        place.name,
        place.id || place.place_id,
        place.city,
        place.lat,
        place.lon
      );

      console.log(`Added ${place.name} to itinerary`);
    } catch (error) {
      console.warn('Failed to track add to itinerary:', error);
    }
  };

  function generateSessionId() {
    const id = Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('session_id', id);
    return id;
  }

  useEffect(() => {
    trackingService.trackPageView('Home');

    const raw = JSON.parse(sessionStorage.getItem("latestRecommendations")) || [];
    const prefs = JSON.parse(localStorage.getItem("userPreferences")) || { activities: [], time: "" };
    const favoritesArray = JSON.parse(localStorage.getItem("userFavorites")) || [];
    const itinerary = JSON.parse(localStorage.getItem("userItinerary")) || [];

    const favorites = new Set(favoritesArray);
    const localRecs = getMLRecommendations(raw, prefs, favorites, itinerary);
    setRecommendations(localRecs);

    fetchMLRecommendations();
    setLoading(false);

    return () => {
      trackingService.trackPageExit('Home');
    };
  }, []);

  const getCombinedRecommendations = () => {
    const combined = [...recommendations];
    
    if (mlRecommendations?.main_recommendations) {
      mlRecommendations.main_recommendations.forEach(mlRec => {
        const exists = recommendations.find(rec => rec.name === mlRec.name);
        if (!exists) {
          combined.push({
            ...mlRec,
            score: mlRec.score || 7, 
            isMLRecommendation: true
          });
        }
      });
    }

    return combined.sort((a, b) => b.score - a.score);
  };

  const allRecommendations = getCombinedRecommendations();

  const RecommendationCard = ({ place, index }) => (
    <div 
      key={index} 
      className="group bg-white/95 backdrop-blur-sm text-gray-800 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:scale-105 hover:-translate-y-2 border border-white/20"
      onClick={() => handlePlaceView(place, index)}
    >
      <div className="flex justify-between items-start mb-3">
        <h2 className="text-xl font-bold group-hover:text-purple-600 transition-colors duration-300">{place.name}</h2>
        {place.isMLRecommendation && (
          <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-3 py-1 rounded-full shadow-lg animate-pulse">
            {place.is_random_discovery ? 'Hidden Gem' : ' Perfect Match'}
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
                e.target.src = "https://source.unsplash.com/600x400/?travel,destination,adventure";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
              <span className="text-lg"></span>
            </div>
          </>
        )}
      </div>

      <div className="relative">
        <p className="text-sm mb-3 text-gray-600 leading-relaxed">
          {place.description || "Embark on an unforgettable journey and discover the magic this destination holds. Every moment will become a cherished memory. "}
        </p>
      </div>

      <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
        <div className="flex items-center space-x-1">
          <span className="text-blue-500"></span>
          <span className="font-medium">{place.minimumDuration || "2-4h adventure"}</span>
        </div>
        {place.city && (
          <div className="flex items-center space-x-1">
            <span className="text-red-500">📍</span>
            <span className="font-medium">{place.city}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mb-4">
        <span className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 text-xs px-3 py-2 rounded-full border border-blue-200 font-semibold">
          🏛️ {place.category || "Adventure"}
        </span>
        <div className="text-sm font-bold">
          {place.isMLRecommendation ? (
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
              AI Score: {place.score?.toFixed(1)}⭐
            </span>
          ) : (
            <span className="text-blue-600 font-bold">Score: {place.score}</span>
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
          ❤️ Save as Favorite
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleAddToItinerary(place);
          }}
          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
        >
          ✈️ Add to Journey
        </button>
      </div>

      {/* Motiv recomandare cu stil îmbunătățit */}
      {place.recommendation_reason && (
        <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
          <div className="text-xs text-gray-600 italic flex items-center space-x-2">
            <span className="text-yellow-500">💡</span>
            <span>{place.recommendation_reason}</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white relative overflow-hidden">
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-float"></div>
        <div className="absolute top-1/3 right-20 w-48 h-48 bg-yellow-400/20 rounded-full blur-2xl animate-float-delayed"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-pink-400/20 rounded-full blur-xl animate-float-slow"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto p-8 relative z-10">
        {/* Enhanced Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-6 shadow-2xl">
            <span className="text-4xl animate-bounce">🌍</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">
            Your Next Adventure Awaits
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-white to-transparent mx-auto mb-6"></div>
          {mlRecommendations && (
            <p className="text-xl md:text-2xl opacity-90 font-light max-w-3xl mx-auto leading-relaxed">
              {mlRecommendations.recommendation_type === 'general_with_discovery' && "✨ Uncover hidden gems and create magical memories"}
              {mlRecommendations.recommendation_type === 'new_user_with_discovery' && "🌟 The perfect beginning to your travel story"}
              {mlRecommendations.recommendation_type === 'personalized' && "🎯 Handpicked destinations just for your wanderlust soul"}
              {mlRecommendations.recommendation_type === 'anonymous_session' && "🔍 Inspired by your curious explorer spirit"}
            </p>
          )}
        </div>

        {/* Enhanced Loading State */}
        {loading && (
          <div className="text-center text-xl">
            <div className="relative inline-block">
              <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-6 shadow-lg"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-yellow-400 rounded-full animate-spin mx-auto opacity-75"></div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl inline-block shadow-xl">
              <p className="font-medium">🧭 Crafting your perfect travel experience...</p>
              <p className="text-sm opacity-75 mt-2">Our AI is selecting the most amazing destinations for you</p>
            </div>
          </div>
        )}

        {/* Enhanced No Recommendations State */}
        {!loading && allRecommendations.length === 0 && (
          <div className="text-center text-lg">
            <div className="bg-white/10 backdrop-blur-lg p-12 rounded-3xl shadow-2xl border border-white/20 max-w-2xl mx-auto">
              <div className="mb-8">
                <div className="text-8xl mb-4 animate-bounce">🗺️</div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-200 to-white bg-clip-text text-transparent">
                  Ready to Explore the World?
                </h2>
                <div className="w-16 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto mb-6"></div>
              </div>
              
              <p className="text-xl mb-8 opacity-90 leading-relaxed">
                Your adventure begins with a single step! 🌟<br/>
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
                  <p> Personalized recommendations •  AI-powered suggestions •  Endless possibilities</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Main Recommendations Grid */}
        {!loading && allRecommendations.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-12">
              {allRecommendations.slice(0, 8).map((place, index) => (
                <RecommendationCard key={`${place.name}-${index}`} place={place} index={index} />
              ))}
            </div>

            {/* Enhanced Additional Sections */}
            {mlRecommendations?.discover_new_places?.length > 0 && (
              <div className="mb-12">
                <div className="text-center mb-8">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-200 to-white bg-clip-text text-transparent">
                    ✨ Hidden Treasures Await
                  </h2>
                  <p className="text-lg opacity-80">Discover extraordinary places off the beaten path</p>
                  <div className="w-16 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto mt-4"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {mlRecommendations.discover_new_places.map((place, index) => (
                    <RecommendationCard 
                      key={`discover-${index}`} 
                      place={{...place, isMLRecommendation: true}} 
                      index={index} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Enhanced Trending Section */}
            {mlRecommendations?.trending_for_beginners?.length > 0 && (
              <div className="mb-12">
                <div className="text-center mb-8">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-pink-200 to-white bg-clip-text text-transparent">
                    🔥 Trending Adventures
                  </h2>
                  <p className="text-lg opacity-80">Join thousands of travelers discovering these hotspots</p>
                  <div className="w-16 h-1 bg-gradient-to-r from-transparent via-pink-400 to-transparent mx-auto mt-4"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {mlRecommendations.trending_for_beginners.map((place, index) => (
                    <RecommendationCard 
                      key={`trending-${index}`} 
                      place={{...place, isMLRecommendation: true}} 
                      index={index} 
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="text-center mt-16">
              <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl inline-block shadow-xl border border-white/20">
                <div className="flex items-center justify-center space-x-8 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">🎯</span>
                    <span><strong>{allRecommendations.length}</strong> Amazing Places</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">❤️</span>
                    <span><strong>{recommendations.length}</strong> Based on You</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl"></span>
                    <span><strong>{mlRecommendations?.main_recommendations?.length || 0}</strong> AI Suggestions</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
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