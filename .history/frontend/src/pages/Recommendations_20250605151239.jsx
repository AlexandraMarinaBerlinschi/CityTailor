import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import { useUserFavorites, useUserItinerary } from "./userStorage"; 
import UserStorage from "./userStorage";
import trackingService from "../services/TrackingService";

// Icons for categories
const categoryIcons = {
  culture: "🏛️",
  adventure: "🏔️",
  food: "🍽️",
  nature: "🌿",
  entertainment: "🎭",
  shopping: "🛍️",
  default: "📍"
};

// Reset map container
const resetLeafletMapContainer = () => {
  const container = L.DomUtil.get("map");
  if (container != null) {
    container._leaflet_id = null;
  }
};

const safeToNumber = (val) => {
  const num = Number(val);
  return isFinite(num) ? num : null;
};

const isValidLatLon = (lat, lon) =>
  typeof lat === "number" && typeof lon === "number" && isFinite(lat) && isFinite(lon);

// Function to generate consistent prices based on place name (0-50 EUR)
const generateConsistentPrice = (placeName) => {
  let hash = 0;
  for (let i = 0; i < placeName.length; i++) {
    const char = placeName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const price = Math.abs(hash % 51);
  return price;
};

// NEW: Helper function to detect AI recommendations
const getRecommendationSource = (item) => {
  // Check multiple possible indicators for AI/ML recommendations
  if (item.isMLRecommendation || 
      item.enhanced_ml || 
      item.context_aware || 
      item.ml_enhanced ||
      item.recommendation_source === 'ai' ||
      item.recommendation_source === 'search_context' ||
      item.recommendation_source === 'user_history' ||
      item.recommendation_source === 'collaborative' ||
      item.recommendation_source === 'discovery' ||
      item.recommendation_source === 'trending' ||
      item.data_source === 'enhanced_database') {
    return {
      isAI: true,
      source: item.recommendation_source || 'ai',
      reason: item.recommendation_reason || 'AI-powered recommendation'
    };
  }
  
  return {
    isAI: false,
    source: 'search',
    reason: 'Search result'
  };
};

// NEW: Helper function to get AI badge styling
const getAIBadgeStyle = (source) => {
  const styles = {
    search_context: {
      bg: 'bg-gradient-to-r from-purple-500 to-pink-500',
      text: 'text-white',
      icon: '🎯',
      label: 'Context Match'
    },
    user_history: {
      bg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      text: 'text-white',
      icon: '👤',
      label: 'For You'
    },
    collaborative: {
      bg: 'bg-gradient-to-r from-green-500 to-emerald-500',
      text: 'text-white',
      icon: '👥',
      label: 'Popular Choice'
    },
    discovery: {
      bg: 'bg-gradient-to-r from-orange-500 to-red-500',
      text: 'text-white',
      icon: '🔍',
      label: 'Discover'
    },
    trending: {
      bg: 'bg-gradient-to-r from-yellow-500 to-orange-500',
      text: 'text-white',
      icon: '📈',
      label: 'Trending'
    },
    ai: {
      bg: 'bg-gradient-to-r from-indigo-500 to-purple-500',
      text: 'text-white',
      label: 'AI Pick'
    }
  };
  
  return styles[source] || styles.ai;
};

// Helper function to check if user is authenticated using existing UserStorage
const isUserAuthenticated = () => {
  const userId = UserStorage.getCurrentUserId();
  return userId !== 'anonymous';
};

// Helper function to get user-specific storage key for sessionStorage
const getUserSessionStorageKey = (baseKey) => {
  const userId = UserStorage.getCurrentUserId();
  return `${userId}_${baseKey}`;
};

const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (Array.isArray(center) && isValidLatLon(center[0], center[1])) {
      map.flyTo(center, 15, { animate: true, duration: 1 });
    }
  }, [center, map]);
  return null;
};

const Recommendations = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Track page view
  useEffect(() => {
    trackingService.trackPageView('Recommendations');
    return () => trackingService.trackPageExit('Recommendations');
  }, []);

  // Helper functions to get/set recommendations with user context
  const getStoredRecommendations = () => {
    const userSpecificKey = getUserSessionStorageKey("latestRecommendations");
    return JSON.parse(sessionStorage.getItem(userSpecificKey)) || [];
  };

  const getStoredCity = () => {
    const userSpecificKey = getUserSessionStorageKey("latestCity");
    return sessionStorage.getItem(userSpecificKey) || "";
  };

  const setStoredRecommendations = (recommendations) => {
    const userSpecificKey = getUserSessionStorageKey("latestRecommendations");
    sessionStorage.setItem(userSpecificKey, JSON.stringify(recommendations));
  };

  const setStoredCity = (city) => {
    const userSpecificKey = getUserSessionStorageKey("latestCity");
    sessionStorage.setItem(userSpecificKey, city);
  };

  // Folosește hook-urile pentru storage specific utilizatorului
  const { favorites, toggleFavorite } = useUserFavorites();
  const { itinerary, addToItinerary, removeFromItinerary, isInItinerary } = useUserItinerary();

  const defaultRecommendations = getStoredRecommendations();
  const defaultCity = getStoredCity();

  // Fix: Handle both array and object responses from API
  let rawRecommendations = location.state?.recommendations || defaultRecommendations;
  
  // If the API returned an object with recommendations property, extract the array
  if (rawRecommendations && typeof rawRecommendations === 'object' && rawRecommendations.recommendations) {
    rawRecommendations = rawRecommendations.recommendations;
  }
  
  // Ensure it's always an array
  const raw = Array.isArray(rawRecommendations) ? rawRecommendations : [];
  
  const city = location.state?.city || defaultCity;
  const lat = safeToNumber(location.state?.lat) || 48.8566;
  const lon = safeToNumber(location.state?.lon) || 2.3522;
  const mlEnhanced = location.state?.mlEnhanced || false;
  const sources = location.state?.sources || {};

  const [mapCenter, setMapCenter] = useState([lat, lon]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [hoveredPlace, setHoveredPlace] = useState(null);
  const [showAllPlaces, setShowAllPlaces] = useState(false);
  const [filterByAI, setFilterByAI] = useState('all'); // NEW: Filter state
  const defaultCenter = [lat, lon];

  // NEW: Count AI vs regular recommendations
  const aiCount = raw.filter(item => getRecommendationSource(item).isAI).length;
  const regularCount = raw.length - aiCount;

  // NEW: Filter recommendations based on type
  const getFilteredRecommendations = () => {
    if (filterByAI === 'ai') {
      return raw.filter(item => getRecommendationSource(item).isAI);
    } else if (filterByAI === 'regular') {
      return raw.filter(item => !getRecommendationSource(item).isAI);
    }
    return raw; // 'all'
  };

  const filteredRecommendations = getFilteredRecommendations();
  const displayedPlaces = showAllPlaces ? filteredRecommendations : filteredRecommendations.slice(0, 4);

  // Enhanced tracking for place interactions
  const handlePlaceView = async (place, index) => {
    try {
      await trackingService.trackPlaceView(
        place.name,
        place.id,
        city,
        place.lat,
        place.lon,
        index
      );
    } catch (error) {
      console.warn('Failed to track place view:', error);
    }
  };

  const handleFavoriteWithTracking = async (placeName) => {
    try {
      const place = raw.find(p => p.name === placeName);
      if (place) {
        await trackingService.trackFavorite(
          place.name,
          place.id,
          city,
          place.lat,
          place.lon
        );
      }
      toggleFavorite(placeName);
    } catch (error) {
      console.warn('Failed to track favorite:', error);
      toggleFavorite(placeName);
    }
  };

  const handleAddToItineraryWithTracking = async (place) => {
    try {
      await trackingService.trackAddToItinerary(
        place.name,
        place.id,
        city,
        place.lat,
        place.lon
      );
      addToItinerary(place);
    } catch (error) {
      console.warn('Failed to track add to itinerary:', error);
      addToItinerary(place);
    }
  };

  // Stats calculate with consistent average price
  const averagePrice = raw.length > 0 
    ? Math.round(raw.reduce((sum, item) => sum + generateConsistentPrice(item.name), 0) / raw.length)
    : 0;

  const stats = {
    totalPlaces: raw.length,
    averagePrice: averagePrice,
    mlEnhanced,
    sources,
    aiCount,
    regularCount
  };

  // Reset map container on mount
  useEffect(() => {
    resetLeafletMapContainer();
  }, []);

  // Save recommendations with user-specific keys
  useEffect(() => {
    if (raw.length > 0) {
      setStoredRecommendations(raw);
      setStoredCity(city);
    }
  }, [raw, city]);

  // Clear user-specific sessionStorage data when user changes or logs out
  useEffect(() => {
    const clearAnonymousSessionData = () => {
      const currentUserId = UserStorage.getCurrentUserId();
      
      // Clear only anonymous session data when switching users
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('anonymous_') && currentUserId !== 'anonymous') {
          sessionStorage.removeItem(key);
        }
      });
    };

    clearAnonymousSessionData();

    // Listen for user changes
    const handleUserChange = () => {
      clearAnonymousSessionData();
    };

    window.addEventListener('storage', handleUserChange);
    return () => {
      window.removeEventListener('storage', handleUserChange);
    };
  }, []);

  const handleSelectPlace = (place) => {
    const lat = safeToNumber(place.lat);
    const lon = safeToNumber(place.lon);
    if (isValidLatLon(lat, lon)) {
      setMapCenter([lat, lon]);
      handlePlaceView(place, raw.findIndex(p => p.name === place.name));
    }
  };

  const goToItinerary = () => {
    navigate("/itinerary", {
      state: {
        itineraryItems: itinerary,
        city: city,
      }
    });
  };

  // Quick action functions
  const handleShare = async () => {
    const shareText = `Discover ${raw.length} amazing experiences in ${city}! ${mlEnhanced ? ' AI-Enhanced' : ''}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${mlEnhanced ? 'AI-Enhanced ' : ''}Recommendations for ${city}`,
          text: shareText,
          url: window.location.href
        });
      } catch (err) {
        console.log('Sharing was cancelled');
      }
    } else {
      navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
      alert('Link has been copied to clipboard!');
    }
  };

  const handleViewFavorites = () => {
    const favoritesList = [...favorites];
    if (favoritesList.length === 0) {
      alert('You haven\'t saved any favorite places yet!');
      return;
    }
    
    const favoritePlaces = raw.filter(place => favorites.has(place.name));
    console.log('Your favorite places:', favoritePlaces);
  };

  const renderMarker = (item, index) => {
    const lat = safeToNumber(item.lat);
    const lon = safeToNumber(item.lon);
    const position = isValidLatLon(lat, lon) ? [lat, lon] : null;

    if (!position) return null;

    const formattedRating = item.rating ? Number(item.rating).toFixed(1) : null;
    const isHovered = hoveredPlace === item.name;
    const recSource = getRecommendationSource(item);
    const badgeStyle = getAIBadgeStyle(recSource.source);

    return (
      <Marker
        key={index}
        position={position}
        icon={defaultIcon}
        eventHandlers={{ 
          click: () => handleSelectPlace(item),
          mouseover: () => setHoveredPlace(item.name),
          mouseout: () => setHoveredPlace(null)
        }}
      >
        <Popup maxWidth={300}>
          <div className="p-2">
            <div className="font-bold text-lg mb-2">{item.name}</div>
            
            {/* AI Badge in popup */}
            {recSource.isAI && (
              <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium mb-2 ${badgeStyle.bg} ${badgeStyle.text}`}>
                <span>{badgeStyle.icon}</span>
                <span>{badgeStyle.label}</span>
              </div>
            )}

            {item.pictures?.length > 0 && (
              <div className="mb-3">
                <img
                  src={item.pictures[0].url || item.pictures[0]}
                  alt={item.name}
                  className="w-full h-32 object-cover rounded-lg"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://raw.githubusercontent.com/AlexandraMarinaBerlinschi/poze-is/main/image-editing.png";
                  }}
                />
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              {formattedRating && (
                <div className="flex items-center">
                  <span className="text-yellow-500">⭐</span>
                  <span className="ml-1 font-semibold">{formattedRating}</span>
                  <span className="text-gray-500 text-sm ml-1">/5</span>
                </div>
              )}
              {item.minimumDuration && (
                <div className="flex items-center text-gray-600">
                  <span>⏱️</span>
                  <span className="ml-1 text-sm">{item.minimumDuration}</span>
                </div>
              )}
            </div>

            {/* Recommendation reason in popup */}
            {recSource.reason && recSource.reason !== 'Search result' && (
              <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-xs text-purple-700 italic">
                  💡 {recSource.reason}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              {isInItinerary(item.name) ? (
                <button
                  onClick={() => removeFromItinerary(item.name)}
                  className="flex-1 py-2 px-3 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors font-medium"
                >
                  ✅ In itinerary
                </button>
              ) : (
                <button
                  onClick={() => handleAddToItineraryWithTracking(item)}
                  className="flex-1 py-2 px-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
                >
                  ➕ Add
                </button>
              )}
              
              <button
                onClick={() => handleFavoriteWithTracking(item.name)}
                className={`py-2 px-3 rounded-lg transition-colors ${
                  favorites.has(item.name)
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {favorites.has(item.name) ? '❤️' : '🤍'}
              </button>
            </div>
          </div>
        </Popup>
      </Marker>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 rounded-xl">
                <span className="text-xl">🧭</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  CityTailor
                </h1>
                <p className="text-sm text-gray-600">
                  {mlEnhanced ? 'AI-Enhanced Recommendations' : 'Discover unique experiences'}
                  {!isUserAuthenticated() && (
                    <span className="ml-2 text-orange-600 font-medium">
                      (Guest Mode - Login to save data)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-700"
        >
          <span>←</span>
          <span>Back to search</span>
        </button>

        {/* Guest Mode Warning */}
        {!isUserAuthenticated() && (
          <div className="mb-8 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-orange-900 mb-2 flex items-center">
                  <span className="mr-2">⚠️</span>
                  Guest Mode
                </h3>
                <p className="text-orange-700">
                  You're browsing as a guest. Your favorites and itinerary will be lost when you close the browser.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors font-medium"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="px-4 py-2 bg-white border-2 border-orange-600 text-orange-600 rounded-xl hover:bg-orange-50 transition-colors font-medium"
                >
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Title Section with AI/Regular counts */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <h1 className="text-4xl font-bold text-gray-900 mr-4">
              Recommendations for <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{city}</span>
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <p className="text-xl text-gray-600">
              We found <span className="font-semibold text-blue-600">{raw.length}</span> amazing experiences for you
            </p>
            {/* NEW: AI vs Regular breakdown */}
            {aiCount > 0 && (
              <div className="flex items-center space-x-2 text-sm">
                <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium">
                  <span>{aiCount} AI</span>
                </span>
                {regularCount > 0 && (
                  <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-gray-500 text-white font-medium">
                    <span>🔍</span>
                    <span>{regularCount} Search</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* NEW: Filter buttons */}
        {aiCount > 0 && regularCount > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">🔎</span>
              Filter recommendations
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setFilterByAI('all')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filterByAI === 'all'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                All ({raw.length})
              </button>
              <button
                onClick={() => setFilterByAI('ai')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filterByAI === 'ai'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'bg-white border border-purple-300 text-purple-700 hover:bg-purple-50'
                }`}
              >
                 AI Recommendations ({aiCount})
              </button>
              <button
                onClick={() => setFilterByAI('regular')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filterByAI === 'regular'
                    ? 'bg-gray-600 text-white shadow-lg'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                🔍 Search Results ({regularCount})
              </button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">⚡</span>
            Quick actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleShare}
              className="flex items-center space-x-3 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl hover:bg-purple-100 transition-colors group"
            >
              <div className="p-2 bg-purple-200 rounded-lg group-hover:bg-purple-300 transition-colors">
                <span className="text-xl">🔗</span>
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-purple-800">Share</h4>
                <p className="text-sm text-purple-600">
                  {mlEnhanced ? 'Send AI recommendations' : 'Send to friends'}
                </p>
              </div>
            </button>

            <button
              onClick={handleViewFavorites}
              className="flex items-center space-x-3 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl hover:bg-yellow-100 transition-colors group"
            >
              <div className="p-2 bg-yellow-200 rounded-lg group-hover:bg-yellow-300 transition-colors">
                <span className="text-xl">❤️</span>
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-yellow-800">Favorites ({favorites.size})</h4>
                <p className="text-sm text-yellow-600">Your preferred places</p>
              </div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Map & Places */}
          <div className="lg:col-span-2 space-y-6">
            {/* Map Section */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <span className="mr-2">🗺️</span>
                  Interactive map
                </h3>
                <p className="text-sm text-gray-600">Click on markers for details • AI recommendations have colored badges</p>
              </div>
              
              <div className="h-96" id="map">
                <MapContainer
                  key={`map-${defaultCenter[0]}-${defaultCenter[1]}`}
                  center={defaultCenter}
                  zoom={13}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapUpdater center={mapCenter} />
                  {filteredRecommendations
                    .filter((item) =>
                      isValidLatLon(safeToNumber(item.lat), safeToNumber(item.lon))
                    )
                    .map(renderMarker)}
                </MapContainer>
              </div>
            </div>

            {/* Enhanced Stats Bar */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                📊 Quick stats
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalPlaces}</div>
                  <div className="text-sm text-gray-600">Total places</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <div className="text-2xl font-bold text-purple-600">{stats.aiCount}</div>
                  <div className="text-sm text-gray-600"> AI picks</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-gray-600">{stats.regularCount}</div>
                  <div className="text-sm text-gray-600">🔍 Search results</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">{stats.averagePrice} EUR</div>
                  <div className="text-sm text-gray-600">Average price</div>
                </div>
              </div>
            </div>

            {/* Places List */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {filterByAI === 'ai' ? 'Our Recommendations' : 
                     filterByAI === 'regular' ? '🔍 Search Results' : 
                     'Recommended places'}
                  </h3>
                  <span className="text-sm text-gray-500">
                    Showing {displayedPlaces.length} of {filteredRecommendations.length}
                  </span>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {displayedPlaces.map((item, index) => {
                  const formattedRating = item.rating ? Number(item.rating).toFixed(1) : null;
                  const isHovered = hoveredPlace === item.name;
                  const itemPrice = generateConsistentPrice(item.name);
                  const recSource = getRecommendationSource(item);
                  const badgeStyle = getAIBadgeStyle(recSource.source);
                  
                  return (
                    <div
                      key={index}
                      className={`p-6 hover:bg-gray-50 transition-all duration-300 cursor-pointer relative ${
                        isHovered ? 'bg-blue-50 transform scale-[1.02]' : ''
                      } ${recSource.isAI ? 'border-l-4 border-l-purple-400' : ''}`}
                      onMouseEnter={() => {
                        setHoveredPlace(item.name);
                        handleSelectPlace(item);
                      }}
                      onMouseLeave={() => setHoveredPlace(null)}
                    >
                      {/* NEW: AI Badge positioned absolutely */}
                      {recSource.isAI && (
                        <div className="absolute top-4 right-4">
                          <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${badgeStyle.bg} ${badgeStyle.text} shadow-lg`}>
                            <span>{badgeStyle.icon}</span>
                            <span>{badgeStyle.label}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col md:flex-row gap-4">
                        {/* Image */}
                        <div className="w-full md:w-32 h-32 flex-shrink-0 relative">
                          {item.pictures?.length > 0 ? (
                            <img
                              src={item.pictures[0].url || item.pictures[0]}
                              alt={item.name}
                              className="w-full h-full object-cover rounded-xl"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://raw.githubusercontent.com/AlexandraMarinaBerlinschi/poze-is/main/image-editing.png";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-200 to-purple-200 rounded-xl flex items-center justify-center">
                              <span className="text-3xl">📸</span>
                            </div>
                          )}
                          
                          {/* Small AI indicator on image for mobile */}
                          {recSource.isAI && (
                            <div className="absolute top-2 left-2 md:hidden">
                              <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${badgeStyle.bg} ${badgeStyle.text}`}>
                                <span>{badgeStyle.icon}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pr-20 md:pr-0">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                                {item.name}
                              </h4>
                              {/* NEW: Inline AI indicator for mobile */}
                              {recSource.isAI && (
                                <span className="md:hidden text-lg" title={badgeStyle.label}>
                                  {badgeStyle.icon}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFavoriteWithTracking(item.name);
                              }}
                              className={`p-2 rounded-full transition-all md:static absolute top-6 right-16 ${
                                favorites.has(item.name)
                                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {favorites.has(item.name) ? '❤️' : '🤍'}
                            </button>
                          </div>

                          <div className="flex items-center space-x-4 mb-3">
                            {formattedRating && (
                              <div className="flex items-center">
                                <span className="text-yellow-500">⭐</span>
                                <span className="ml-1 font-semibold">{formattedRating}</span>
                                <span className="text-gray-500 text-sm ml-1">/5</span>
                              </div>
                            )}
                            {item.minimumDuration && (
                              <div className="flex items-center text-gray-600">
                                <span>⏱️</span>
                                <span className="ml-1">{item.minimumDuration}</span>
                              </div>
                            )}
                            <div className="text-green-600 font-bold">
                              {itemPrice} EUR / person
                            </div>
                          </div>

                          {/* Enhanced ML Recommendation Reason */}
                          {recSource.isAI && recSource.reason && recSource.reason !== 'AI-powered recommendation' && (
                            <div className="mb-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                              <div className="flex items-start space-x-2">
                                <span className="text-purple-600 mt-0.5">{badgeStyle.icon}</span>
                                <div>
                                  <p className="text-sm font-medium text-purple-900">{badgeStyle.label}</p>
                                  <p className="text-sm text-purple-700 italic">
                                    {recSource.reason}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Regular recommendation (non-AI) indicator */}
                          {!recSource.isAI && (
                            <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                              <p className="text-sm text-gray-600 flex items-center">
                                <span className="mr-2">🔍</span>
                                Search result from Amadeus
                              </p>
                            </div>
                          )}

                          <div className="flex gap-3">
                            {isInItinerary(item.name) ? (
                              <button
                                onClick={() => removeFromItinerary(item.name)}
                                className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors font-medium"
                              >
                                <span>✅</span>
                                <span>In itinerary</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAddToItineraryWithTracking(item)}
                                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                              >
                                <span>➕</span>
                                <span>Add to itinerary</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Show More Button */}
              {filteredRecommendations.length > 4 && !showAllPlaces && (
                <div className="p-6 bg-gray-50 border-t border-gray-200">
                  <button
                    onClick={() => setShowAllPlaces(true)}
                    className="w-full py-3 px-4 bg-white border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                  >
                    View all {filteredRecommendations.length} {filterByAI === 'ai' ? 'AI recommendations' : filterByAI === 'regular' ? 'search results' : 'recommendations'} ↓
                  </button>
                </div>
              )}

              {/* No results message */}
              {filteredRecommendations.length === 0 && (
                <div className="p-12 text-center">
                  <div className="text-4xl mb-4">
                    {filterByAI === 'ai' ? '🤖' : '🔍'}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    No {filterByAI === 'ai' ? 'Our recommendations' : filterByAI === 'regular' ? 'search results' : 'recommendations'} found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {filterByAI === 'ai' ? 
                      'AI hasn\'t generated recommendations yet. Try interacting more or switch to "All" view.' :
                      'No search results available. Switch to "All" to see AI recommendations.'
                    }
                  </p>
                  <button
                    onClick={() => setFilterByAI('all')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    View All Recommendations
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Favorites & Itinerary */}
          <div className="space-y-6">
            {/* NEW: AI Recommendation Summary */}
            {aiCount > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-purple-900 flex items-center">
                    <span className="mr-2"></span>
                    Our Insights
                  </h3>
                  <span className="bg-purple-600 text-white text-sm px-3 py-1 rounded-full font-medium">
                    {aiCount} recommendations
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <p className="text-sm text-purple-700">
                    AI analyzed your preferences and found {aiCount} personalized recommendations just for you.
                  </p>
                  
                  {/* Show breakdown of AI recommendation types */}
                  {raw.filter(item => getRecommendationSource(item).isAI).slice(0, 3).map((item, index) => {
                    const recSource = getRecommendationSource(item);
                    const badgeStyle = getAIBadgeStyle(recSource.source);
                    return (
                      <div key={index} className="flex items-center space-x-3">
                        <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${badgeStyle.bg} ${badgeStyle.text}`}>
                          <span>{badgeStyle.icon}</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-purple-900 text-sm">{item.name}</p>
                          <p className="text-xs text-purple-600">{badgeStyle.label}</p>
                        </div>
                      </div>
                    );
                  })}
                  
                  {aiCount > 3 && (
                    <p className="text-sm text-purple-700 text-center">
                      +{aiCount - 3} more AI recommendations
                    </p>
                  )}
                </div>

                <button
                  onClick={() => setFilterByAI('ai')}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 px-3 rounded-xl font-medium hover:shadow-lg transition-all duration-300"
                >
                  View All AI Picks
                </button>
              </div>
            )}

            {/* Favorites Widget */}
            {favorites.size > 0 && (
              <div className="bg-gradient-to-br from-pink-50 to-red-50 border-2 border-pink-200 rounded-2xl p-6 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-pink-900 flex items-center">
                    <span className="mr-2">❤️</span>
                    Your favorites
                  </h3>
                  <span className="bg-pink-600 text-white text-sm px-3 py-1 rounded-full font-medium">
                    {favorites.size} {favorites.size === 1 ? 'place' : 'places'}
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  {[...favorites].slice(0, 3).map((placeName, index) => {
                    const place = raw.find(p => p.name === placeName);
                    const recSource = place ? getRecommendationSource(place) : null;
                    return (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-pink-600 text-white rounded-full flex items-center justify-center text-sm">
                          ❤️
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-pink-900">{placeName}</p>
                          <div className="flex items-center space-x-2">
                            {place?.rating && (
                              <div className="flex items-center text-sm text-pink-700">
                                <span className="text-yellow-500">⭐</span>
                                <span className="ml-1">{Number(place.rating).toFixed(1)}</span>
                              </div>
                            )}
                            {recSource?.isAI && (
                              <span className="text-xs text-purple-600" title="AI Recommendation">
                                
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleFavoriteWithTracking(placeName)}
                          className="text-pink-600 hover:text-pink-800 transition-colors"
                          title="Remove from favorites"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                  {favorites.size > 3 && (
                    <p className="text-sm text-pink-700 text-center">
                      +{favorites.size - 3} other places
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleViewFavorites}
                    className="flex-1 bg-gradient-to-r from-pink-600 to-red-600 text-white py-2 px-3 rounded-xl font-medium hover:shadow-lg transition-all duration-300 text-sm"
                  >
                    View All
                  </button>
                  <button
                    onClick={() => {
                      const favoritePlaces = raw.filter(place => favorites.has(place.name));
                      favoritePlaces.forEach(place => handleAddToItineraryWithTracking(place));
                    }}
                    className="flex-1 bg-white border-2 border-pink-200 text-pink-700 py-2 px-3 rounded-xl font-medium hover:bg-pink-50 transition-all duration-300 text-sm"
                  >
                    Add All to Trip
                  </button>
                </div>
              </div>
            )}

            {/* Itinerary Widget */}
            {itinerary.length > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-6 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-blue-900 flex items-center">
                    <span className="mr-2">🎯</span>
                    Your itinerary
                  </h3>
                  <span className="bg-blue-600 text-white text-sm px-3 py-1 rounded-full font-medium">
                    {itinerary.length} {itinerary.length === 1 ? 'place' : 'places'}
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  {itinerary.slice(0, 3).map((place, index) => {
                    const recSource = getRecommendationSource(place);
                    return (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-blue-900">{place.name}</p>
                            {recSource.isAI && (
                              <span className="text-xs text-purple-600" title="AI Recommendation">
                                
                              </span>
                            )}
                          </div>
                          {place.minimumDuration && (
                            <p className="text-sm text-blue-700">⏱️ {place.minimumDuration}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {itinerary.length > 3 && (
                    <p className="text-sm text-blue-700 text-center">
                      +{itinerary.length - 3} other places
                    </p>
                  )}
                </div>

                <button
                  onClick={goToItinerary}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  View Complete Itinerary →
                </button>
              </div>
            )}

            {/* Enhanced Tips */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6">
              <h4 className="text-lg font-semibold text-orange-900 mb-3 flex items-center">
                <span className="mr-2">💡</span>
                {aiCount > 0 ? 'Tips' : 'Useful tips'}
              </h4>
              <div className="space-y-3 text-sm text-orange-800">
                {aiCount > 0 ? (
                  <>
                    <p>• 🔍 All results are from your search</p>
                    <p>• ❤️ Save favorites to get AI recommendations</p>
                    <p>• 🎯 Add places to itinerary to plan your trip</p>
                    <p>• 🗺️ Click markers on map for details</p>
                  </>
                ) : (
                  <>
                    <p>• 🔍 All results are from your search</p>
                    <p>• ❤️ Save favorites to get AI recommendations</p>
                    <p>• 🎯 Add places to itinerary to plan your trip</p>
                    <p>• 🗺️ Click markers on map for details</p>
                  </>
                )}
                {!isUserAuthenticated() && (
                  <p className="text-orange-600 font-medium">• 🔐 Login to unlock personalized AI recommendations</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3">
        {itinerary.length > 0 && (
          <button
            onClick={goToItinerary}
            className="w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center"
            title="View itinerary"
          >
            <span className="text-xl">🎯</span>
          </button>
        )}
        
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-14 h-14 bg-gray-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center"
          title="Back to top"
        >
          <span className="text-xl">↑</span>
        </button>
      </div>

      {/* Empty State */}
      {raw.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No recommendations found</h3>
          <p className="text-gray-600 mb-6">
            Try searching in another city or different criteria to get AI-powered recommendations.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
};

export default Recommendations;