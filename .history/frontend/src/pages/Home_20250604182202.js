import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import trackingService from "../services/TrackingService";
import UserStorage from "./userStorage";

const Home = () => {
  const navigate = useNavigate();
  const [mlRecommendations, setMlRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTryItOut, setShowTryItOut] = useState(true);
  const [debugInfo, setDebugInfo] = useState(null);
  const [userInsights, setUserInsights] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch ML recommendations with enhanced system
  const fetchMLRecommendations = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      
      const data = await trackingService.getHomeRecommendations(12);
      
      console.log('🏠 Enhanced ML Response received:', {
        status: data.status,
        recommendation_type: data.recommendations?.recommendation_type,
        has_activity: data.metadata?.has_activity,
        personalization_level: data.metadata?.personalization_level,
        profile_strength: data.metadata?.profile_strength,
        count: data.recommendations?.main_recommendations?.length || 0,
        ml_version: data.metadata?.ml_version
      });
      
      if (data.status === 'success') {
        setMlRecommendations(data.recommendations);
        
        // Enhanced decision logic pentru "Try it out"
        const hasActivity = data.metadata?.has_activity;
        const hasRecommendations = data.recommendations?.main_recommendations?.length > 0;
        const isDiscoveryMode = data.recommendations?.recommendation_type === 'discovery';
        
        setShowTryItOut(!hasActivity || !hasRecommendations || isDiscoveryMode);
        
        setDebugInfo({
          has_activity: hasActivity,
          activity_count: data.metadata?.activity_count || 0,
          recommendation_type: data.recommendations?.recommendation_type,
          data_source: data.recommendations?.data_source,
          personalization_level: data.metadata?.personalization_level,
          profile_strength: data.metadata?.profile_strength,
          ml_version: data.metadata?.ml_version,
          algorithm: data.metadata?.algorithm
        });

        // Load user insights for authenticated users
        if (data.metadata?.personalization_level !== 'none') {
          loadUserInsights();
        }
      } else {
        setShowTryItOut(true);
      }
    } catch (err) {
      console.error('❌ Failed to fetch enhanced ML recommendations:', err);
      setShowTryItOut(true);
    } finally {
      if (showRefreshing) setRefreshing(false);
    }
  }, []);

  // Load user insights și stats
  const loadUserInsights = useCallback(async () => {
    try {
      const userId = trackingService.userId;
      if (userId) {
        const insights = {
          user_profile: {
            total_activities: 5,
            engagement_level: 'medium'
          },
          engagement_analysis: {
            level: 'medium'
          },
          next_milestone: {
            title: 'Explorer',
            current_count: 3,
            target_count: 10,
            progress: 30,
            description: 'Keep exploring to unlock more features!'
          }
        };
        setUserInsights(insights);
        console.log('🧠 User insights loaded:', insights);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load user insights:', error);
    }
  }, []);

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

      console.log(`👁️ Place view tracked: ${place.name}`);
    } catch (error) {
      console.warn('⚠️ Failed to track place view:', error);
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

      // Enhanced tracking pentru favorite
      await trackingService.trackFavorite(
        place.name,
        place.id || place.place_id,
        place.city,
        place.lat,
        place.lon
      );

      console.log(`❤️ Favorite added: ${place.name}`);
      
      // Trigger refresh după o scurtă pauză
      setTimeout(() => {
        fetchMLRecommendations(true);
      }, 1000);
      
    } catch (error) {
      console.warn('⚠️ Failed to track favorite:', error);
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

      // Enhanced tracking pentru itinerary
      await trackingService.trackAddToItinerary(
        place.name,
        place.id || place.place_id,
        place.city,
        place.lat,
        place.lon
      );

      console.log(`✈️ Itinerary add: ${place.name}`);
      
      // Trigger refresh după o scurtă pauză
      setTimeout(() => {
        fetchMLRecommendations(true);
      }, 1000);
      
    } catch (error) {
      console.warn('⚠️ Failed to track itinerary add:', error);
    }
  };

  const handleManualRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    await fetchMLRecommendations(true);
  };

  // Initialize on mount
  useEffect(() => {
    trackingService.trackPageView('Home');

    // Set user in tracking service
    const userId = UserStorage.getCurrentUserId();
    if (userId && userId !== 'anonymous') {
      trackingService.setUserId(userId);
    }

    // Fetch initial recommendations
    fetchMLRecommendations().finally(() => {
      setLoading(false);
    });

    return () => {
      trackingService.trackPageExit('Home');
    };
  }, [fetchMLRecommendations]);

  // Listen for user changes
  useEffect(() => {
    const handleUserChange = () => {
      const userId = UserStorage.getCurrentUserId();
      if (userId && userId !== 'anonymous') {
        trackingService.setUserId(userId);
      }
      
      // Refresh recommendations for new user
      fetchMLRecommendations();
    };

    window.addEventListener('storage', handleUserChange);
    return () => {
      window.removeEventListener('storage', handleUserChange);
    };
  }, [fetchMLRecommendations]);

  // Travel recommendation card component
  const RecommendationCard = ({ place, index, section = "main" }) => (
    <div 
      key={`${section}-${index}`}
      className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:scale-[1.02] overflow-hidden"
      onClick={() => handlePlaceView(place, index)}
    >
      <div className="relative">
        <img
          src={place.pictures?.[0]?.url || place.pictures?.[0] || place.image_url || "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop&q=80"}
          alt={place.name}
          className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-700"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop&q=80";
          }}
        />
        <div className="absolute top-4 right-4 flex gap-2">
          {place.rating && (
            <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold text-gray-800 flex items-center">
              ⭐ {Number(place.rating).toFixed(1)}
            </span>
          )}
          {place.ml_enhanced && (
            <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
              Smart Pick
            </span>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>

      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
            {place.name}
          </h3>
          <span className="text-sm text-gray-500 flex items-center">
            📍 {place.city}
          </span>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {place.description || place.recommendation_reason || "Discover this amazing destination and create unforgettable memories."}
        </p>

        <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
          <span className="flex items-center">
            ⏱️ {place.minimumDuration || "2-4h"}
          </span>
          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
            {place.category || "Experience"}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleFavorite(place);
            }}
            className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white text-sm py-2.5 px-4 rounded-lg transition-all duration-300 font-medium flex items-center justify-center gap-1"
          >
            ❤️ Save
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAddToItinerary(place);
            }}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm py-2.5 px-4 rounded-lg transition-all duration-300 font-medium flex items-center justify-center gap-1"
          >
            ✈️ Plan
          </button>
        </div>

        {place.recommendation_reason && (
          <div className="mt-3 p-2 bg-yellow-50 border-l-3 border-yellow-400 rounded text-xs text-gray-600 italic">
            💡 {place.recommendation_reason}
          </div>
        )}
      </div>
    </div>
  );

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center mb-6 mx-auto animate-pulse">
            <span className="text-2xl text-white">✈️</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Finding your perfect destinations...</p>
        </div>
      </div>
    );
  }

  // Render "Try it out" state
  if (showTryItOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
        {/* Hero Section with New Background Image */}
        <div className="relative overflow-hidden min-h-screen">
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('https://www.bsr.org/images/heroes/bsr-travel-hero..jpg')`
            }}
          ></div>
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-black/40"></div>
          
          <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32 min-h-screen flex items-center">
            <div className="text-center w-full">
              <h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight text-white">
                Discover Your Next
                <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                  Adventure
                </span>
              </h1>
              <p className="text-xl lg:text-2xl mb-8 opacity-90 max-w-3xl mx-auto leading-relaxed text-white">
                Explore handpicked destinations, create personalized itineraries, and make every journey unforgettable
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <button 
                  onClick={() => navigate('/questionnaire')}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-2xl hover:shadow-orange-500/25 transition-all duration-300 transform hover:scale-105"
                >
                  🌍 Start Exploring
                </button>
                <button 
                  onClick={() => navigate('/recommendations')}
                  className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/30 transition-all duration-300"
                >
                  Browse Destinations
                </button>
              </div>

              {/* Feature highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
                  <div className="text-3xl mb-3">🗺️</div>
                  <h3 className="font-semibold mb-2 text-white">Curated Destinations</h3>
                  <p className="text-sm opacity-80 text-white">Handpicked locations from around the world</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
                  <h3 className="font-semibold mb-2 text-white">Smart Planning</h3>
                  <p className="text-sm opacity-80 text-white">Create and manage your travel itinerary</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
                  <div className="text-3xl mb-3">⭐</div>
                  <h3 className="font-semibold mb-2 text-white">Personalized</h3>
                  <p className="text-sm opacity-80 text-white">Recommendations that match your style</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Popular destinations section */}
        <div className="py-16 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Popular Destinations
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Discover the world's most beloved travel destinations
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Sample destinations */}
              {[
                {
                  name: "Paris, France",
                  image: "https://media-cdn.tripadvisor.com/media/photo-c/1280x250/17/15/6d/d6/paris.jpg",
                  description: "The City of Light with iconic landmarks and romantic atmosphere",
                  category: "Cultural"
                },
                {
                  name: "Tokyo, Japan", 
                  image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop&q=80",
                  description: "Modern metropolis blending tradition with cutting-edge technology",
                  category: "Urban"
                },
                {
                  name: "Santorini, Greece",
                  image: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=400&h=300&fit=crop&q=80",
                  description: "Stunning sunsets and white-washed buildings overlooking the Aegean",
                  category: "Relaxation"
                },
                {
                  name: "Bali, Indonesia",
                  image: "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=400&h=300&fit=crop&q=80",
                  description: "Tropical paradise with beautiful beaches and rich culture",
                  category: "Nature"
                },
                {
                  name: "New York City",
                  image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=300&fit=crop&q=80",
                  description: "The city that never sleeps with endless possibilities",
                  category: "Urban"
                },
                {
                  name: "Machu Picchu, Peru",
                  image: "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=400&h=300&fit=crop&q=80",
                  description: "Ancient Incan citadel high in the Andes mountains",
                  category: "Adventure"
                }
              ].map((destination, index) => (
                <div 
                  key={index}
                  className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:scale-[1.02] overflow-hidden"
                  onClick={() => {
                    const cityName = destination.name.split(',')[0].trim(); // Extract just the city name
                    navigate(`/questionnaire?city=${encodeURIComponent(cityName)}`);
                  }}
                >
                  <div className="relative">
                    <img
                      src={destination.image}
                      alt={destination.name}
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute top-4 right-4">
                      <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold text-gray-800">
                        {destination.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {destination.name}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {destination.description}
                    </p>
                    <button className="text-blue-600 font-semibold hover:text-blue-800 transition-colors">
                      Explore Now →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              Ready to Plan Your Perfect Trip?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Start discovering destinations tailored to your interests and travel style
            </p>
            <button 
              onClick={() => navigate('/questionnaire')}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-10 py-4 rounded-xl font-bold text-lg shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render ML recommendations
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Your Personalized Travel Recommendations
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {mlRecommendations?.recommendation_type === 'advanced_personalized' && "Curated destinations based on your unique travel preferences"}
              {mlRecommendations?.recommendation_type === 'advanced_session_based' && "Smart recommendations from your browsing activity"}
              {mlRecommendations?.recommendation_type === 'discovery' && "Trending destinations to inspire your next adventure"}
              {!mlRecommendations?.recommendation_type && "Discover amazing destinations perfect for you"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* User Insights Panel - More subtle */}
        {userInsights && userInsights.user_profile && (
          <div className="mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <span className="mr-2">📊</span>
                  Your Travel Profile
                </h3>
                <button 
                  onClick={() => navigate('/insights')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View Details →
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {userInsights.engagement_analysis?.level?.toUpperCase() || 'EXPLORER'}
                  </div>
                  <div className="text-sm text-gray-600">Travel Style</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {userInsights.user_profile?.total_activities || 0}
                  </div>
                  <div className="text-sm text-gray-600">Places Explored</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {Object.keys(userInsights.user_profile?.city_preferences || {}).length || 1}
                  </div>
                  <div className="text-sm text-gray-600">Cities Visited</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Recommendations */}
        {mlRecommendations?.main_recommendations?.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Recommended For You</h2>
              <div className="flex items-center gap-4">
                {refreshing && (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                )}
                <button
                  onClick={handleManualRefresh}
                  disabled={refreshing}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  Refresh
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {mlRecommendations.main_recommendations.map((place, index) => (
                <RecommendationCard key={`main-${index}`} place={place} index={index} section="main" />
              ))}
            </div>
          </div>
        )}

        {/* Additional Sections */}
        {mlRecommendations?.in_your_favorite_cities?.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">More in Your Favorite Cities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mlRecommendations.in_your_favorite_cities.map((place, index) => (
                <RecommendationCard key={`cities-${index}`} place={place} index={index} section="cities" />
              ))}
            </div>
          </div>
        )}

        {mlRecommendations?.popular_destinations?.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Trending Destinations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mlRecommendations.popular_destinations.map((place, index) => (
                <RecommendationCard key={`popular-${index}`} place={place} index={index} section="popular" />
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="text-center mt-16 py-12 bg-white rounded-xl shadow-sm">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Want More Destinations?</h3>
          <p className="text-gray-600 mb-6">Discover more places that match your travel style</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button
              onClick={() => navigate('/questionnaire')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              🌍 Explore More Places
            </button>
            <button
              onClick={() => navigate('/itinerary')}
              className="bg-white border-2 border-gray-300 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:border-gray-400 transition-all duration-300"
            >
              📝 View My Itinerary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;