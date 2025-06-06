import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import { useUserFavorites, useUserItinerary } from "./userStorage"; 
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
  // Use a simple hash to generate a consistent number
  let hash = 0;
  for (let i = 0; i < placeName.length; i++) {
    const char = placeName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to a price between 0-50 EUR
  const price = Math.abs(hash % 51);
  return price;
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

  // Folosește hook-urile pentru storage specific utilizatorului
  const { favorites, toggleFavorite } = useUserFavorites();
  const { itinerary, addToItinerary, removeFromItinerary, isInItinerary } = useUserItinerary();

  const defaultRecommendations = JSON.parse(sessionStorage.getItem("latestRecommendations")) || [];
  const defaultCity = sessionStorage.getItem("latestCity") || "";

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
  const defaultCenter = [lat, lon];

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
      toggleFavorite(placeName); // Still update UI even if tracking fails
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
      addToItinerary(place); // Still update UI even if tracking fails
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
    sources
  };

  // Reset map container on mount
  useEffect(() => {
    resetLeafletMapContainer();
  }, []);

  // Save recommendations fallback
  useEffect(() => {
    if (raw.length > 0) {
      sessionStorage.setItem("latestRecommendations", JSON.stringify(raw));
      sessionStorage.setItem("latestCity", city);
    }
  }, [raw, city]);

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
    const shareText = `Discover ${raw.length} amazing experiences in ${city}! ${mlEnhanced ? '🤖 AI-Enhanced' : ''}`;
    
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
      // Fallback for browsers that don't support Web Share API
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
    // Here you can navigate to a dedicated favorites page
    // navigate('/favorites', { state: { favorites: favoritePlaces } });
  };

  const displayedPlaces = showAllPlaces ? raw : raw.slice(0, 4);

  const renderMarker = (item, index) => {
    const lat = safeToNumber(item.lat);
    const lon = safeToNumber(item.lon);
    const position = isValidLatLon(lat, lon) ? [lat, lon] : null;

    if (!position) return null;

    const formattedRating = item.rating ? Number(item.rating).toFixed(1) : null;
    const isHovered = hoveredPlace === item.name;

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
        <Popup maxWidth={280}>
          <div className="p-2">
            <div className="font-bold text-lg mb-2">{item.name}</div>
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
                  {mlEnhanced ? '🤖 AI-Enhanced Recommendations' : 'Discover unique experiences'}
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

        {/* Title Section */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <h1 className="text-4xl font-bold text-gray-900 mr-4">
              Recommendations for <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{city}</span>
            </h1>
            {mlEnhanced && (
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                🤖 AI Enhanced
              </div>
            )}
          </div>
          <p className="text-xl text-gray-600">
            We found <span className="font-semibold text-blue-600">{raw.length}</span> amazing experiences for you
            {mlEnhanced && (
              <span className="text-purple-600 font-medium"> using AI personalization</span>
            )}
          </p>
        </div>

        {/* ML Enhancement Info */}
        {mlEnhanced && (
          <div className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-purple-900 mb-2 flex items-center">
                  <span className="mr-2">🎯</span>
                  Enhanced Results
                </h3>
                <p className="text-purple-700">
                  These recommendations are personalized using AI based on your preferences and behavior
                </p>
              </div>
              <div className="text-right">
                <div className="flex gap-4">
                  {sources.amadeus > 0 && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{sources.amadeus}</div>
                      <div className="text-xs text-blue-600">Amadeus API</div>
                    </div>
                  )}
                  {sources.ml_personalized > 0 && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{sources.ml_personalized}</div>
                      <div className="text-xs text-purple-600">AI Personalized</div>
                    </div>
                  )}
                </div>
              </div>
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
                  {mlEnhanced && (
                    <span className="ml-2 bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
                      AI Enhanced
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-600">Click on markers for details</p>
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
                  {raw
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
                {mlEnhanced && (
                  <span className="ml-2 text-sm font-normal text-purple-600">AI Enhanced</span>
                )}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalPlaces}</div>
                  <div className="text-sm text-gray-600">Available places</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">{stats.averagePrice} EUR</div>
                  <div className="text-sm text-gray-600">Average price</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <div className="text-2xl font-bold text-purple-600">
                    {mlEnhanced ? '🤖 AI' : '📍 Standard'}
                  </div>
                  <div className="text-sm text-gray-600">Recommendation type</div>
                </div>
              </div>
            </div>

            {/* Places List */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">
                  {mlEnhanced ? '🎯 AI-Curated Places' : 'Recommended places'}
                </h3>
                {mlEnhanced && (
                  <p className="text-sm text-purple-600 mt-1">
                    Personalized based on your preferences and behavior patterns
                  </p>
                )}
              </div>
              
              <div className="divide-y divide-gray-200">
                {displayedPlaces.map((item, index) => {
                  const formattedRating = item.rating ? Number(item.rating).toFixed(1) : null;
                  const isHovered = hoveredPlace === item.name;
                  const itemPrice = generateConsistentPrice(item.name);
                  
                  return (
                    <div
                      key={index}
                      className={`p-6 hover:bg-gray-50 transition-all duration-300 cursor-pointer ${
                        isHovered ? 'bg-blue-50 transform scale-[1.02]' : ''
                      }`}
                      onMouseEnter={() => {
                        setHoveredPlace(item.name);
                        handleSelectPlace(item);
                      }}
                      onMouseLeave={() => setHoveredPlace(null)}
                    >
                      <div className="flex flex-col md:flex-row gap-4">
                        {/* Image */}
                        <div className="w-full md:w-32 h-32 flex-shrink-0">
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
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                                {item.name}
                              </h4>
                              {item.isMLRecommendation && (
                                <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full">
                                  🤖 AI
                                </span>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFavoriteWithTracking(item.name);
                              }}
                              className={`p-2 rounded-full transition-all ${
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

                          <p className="text-gray-600 mb-4 line-clamp-2">
                            {item.description || item.recommendation_reason || "Discover this unique experience and create unforgettable memories in this wonderful destination."}
                          </p>

                          {/* ML Recommendation Reason */}
                          {item.recommendation_reason && (
                            <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                              <p className="text-sm text-purple-700 italic">
                                💡 {item.recommendation_reason}
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
                            
                            <button 
                              onClick={() => handlePlaceView(item, index)}
                              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                            >
                              <span></span>
                              <span>Details</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Show More Button */}
              {raw.length > 4 && !showAllPlaces && (
                <div className="p-6 bg-gray-50 border-t border-gray-200">
                  <button
                    onClick={() => setShowAllPlaces(true)}
                    className="w-full py-3 px-4 bg-white border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                  >
                    View all {raw.length} recommendations ↓
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Favorites & Itinerary */}
          <div className="space-y-6">
            {/* ML Enhancement Status */}
            {mlEnhanced && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6 sticky top-24">
                <div className="text-center">
                  <div className="text-4xl mb-3">🤖</div>
                  <h3 className="text-lg font-bold text-purple-900 mb-2">AI Enhanced</h3>
                  <p className="text-sm text-purple-700 mb-4">
                    Your results are personalized using machine learning
                  </p>
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-purple-600 mb-1">Sources:</div>
                    <div className="flex justify-between text-sm">
                      <span>Amadeus API: {sources.amadeus || 0}</span>
                      <span>AI Personal: {sources.ml_personalized || 0}</span>
                    </div>
                  </div>
                </div>
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
                    return (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-pink-600 text-white rounded-full flex items-center justify-center text-sm">
                          ❤️
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-pink-900">{placeName}</p>
                          {place?.rating && (
                            <div className="flex items-center text-sm text-pink-700">
                              <span className="text-yellow-500">⭐</span>
                              <span className="ml-1">{Number(place.rating).toFixed(1)}</span>
                            </div>
                          )}
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
                  {itinerary.slice(0, 3).map((place, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-blue-900">{place.name}</p>
                        {place.minimumDuration && (
                          <p className="text-sm text-blue-700">⏱️ {place.minimumDuration}</p>
                        )}
                      </div>
                    </div>
                  ))}
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

            {/* Tips */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6">
              <h4 className="text-lg font-semibold text-orange-900 mb-3 flex items-center">
                <span className="mr-2">💡</span>
                {mlEnhanced ? 'AI Tips' : 'Useful tips'}
              </h4>
              <div className="space-y-3 text-sm text-orange-800">
                {mlEnhanced ? (
                  <>
                    <p>• 🤖 Your preferences are being learned</p>
                    <p>• 🎯 Results improve with more interaction</p>
                    <p>• ❤️ Favorites help personalize future searches</p>
                    <p>• 🔄 Try different cities to expand your profile</p>
                  </>
                ) : (
                  <>
                    <p>• Click on the map to see details</p>
                    <p>• Save favorite places with ❤️</p>
                    <p>• Build your perfect itinerary</p>
                    <p>• Check opening hours</p>
                  </>
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
            {mlEnhanced ? 'AI couldn\'t find matches for your preferences. Try different criteria.' : 'Try searching in another city or change your filters.'}
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