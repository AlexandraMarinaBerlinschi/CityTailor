import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

// Icoane pentru categorii
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

// Funcție pentru a genera prețuri consistente bazate pe numele locului
const generateConsistentPrice = (placeName) => {
  // Folosim un hash simplu pentru a genera un număr consistent
  let hash = 0;
  for (let i = 0; i < placeName.length; i++) {
    const char = placeName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convertim la un preț între 45-150 RON
  const price = Math.abs(hash % 105) + 45;
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

  const defaultRecommendations = JSON.parse(sessionStorage.getItem("latestRecommendations")) || [];
  const defaultCity = sessionStorage.getItem("latestCity") || "";

  const raw = location.state?.recommendations || defaultRecommendations;
  const city = location.state?.city || defaultCity;
  const lat = safeToNumber(location.state?.lat) || 48.8566;
  const lon = safeToNumber(location.state?.lon) || 2.3522;

  const [mapCenter, setMapCenter] = useState([lat, lon]);
  const [itinerary, setItinerary] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [favorites, setFavorites] = useState(new Set());
  const [hoveredPlace, setHoveredPlace] = useState(null);
  const [showAllPlaces, setShowAllPlaces] = useState(false);
  const defaultCenter = [lat, lon];

  // Stats calculate cu preț mediu consistent
  const averagePrice = raw.length > 0 
    ? Math.round(raw.reduce((sum, item) => sum + generateConsistentPrice(item.name), 0) / raw.length)
    : 0;

  const stats = {
    totalPlaces: raw.length,
    averageRating: raw.length > 0 ? (raw.reduce((sum, item) => sum + (Number(item.rating) || 0), 0) / raw.length).toFixed(1) : 0,
    averagePrice: averagePrice
  };

  // Reset map container on mount
  useEffect(() => {
    resetLeafletMapContainer();
  }, []);

  // Load itinerary from sessionStorage
  useEffect(() => {
    const existingItinerary = sessionStorage.getItem('pendingItinerary');
    if (existingItinerary) {
      try {
        const parsedData = JSON.parse(existingItinerary);
        if (parsedData.items && Array.isArray(parsedData.items)) {
          setItinerary(parsedData.items);
        }
      } catch (error) {
        console.error("Error loading existing itinerary:", error);
      }
    }
  }, []);

  // Load favorites from sessionStorage
  useEffect(() => {
    const savedFavorites = sessionStorage.getItem('userFavorites');
    if (savedFavorites) {
      try {
        const parsedFavorites = JSON.parse(savedFavorites);
        setFavorites(new Set(parsedFavorites));
      } catch (error) {
        console.error("Error loading favorites:", error);
      }
    }
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
    }
  };

  const isInItinerary = (placeName) => {
    return itinerary.some(item => item.name === placeName);
  };

  const addToItinerary = (place) => {
    if (place && !itinerary.some((p) => p.name === place.name)) {
      const placeWithId = {
        ...place,
        id: place.id || `place-${Date.now()}-${Math.random()}`
      };

      const updated = [...itinerary, placeWithId];
      setItinerary(updated);

      sessionStorage.setItem('pendingItinerary', JSON.stringify({
        items: updated,
        title: "My Itinerary"
      }));
    }
  };

  const removeFromItinerary = (placeName) => {
    const updated = itinerary.filter(item => item.name !== placeName);
    setItinerary(updated);

    sessionStorage.setItem('pendingItinerary', JSON.stringify({
      items: updated,
      title: "My Itinerary"
    }));
  };

  const toggleFavorite = (placeName) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(placeName)) {
        newFavorites.delete(placeName);
      } else {
        newFavorites.add(placeName);
      }
      
      // Save to sessionStorage
      sessionStorage.setItem('userFavorites', JSON.stringify([...newFavorites]));
      return newFavorites;
    });
  };

  const goToItinerary = () => {
    sessionStorage.setItem('pendingItinerary', JSON.stringify({
      items: itinerary,
      title: "My Itinerary"
    }));

    navigate("/itinerary", {
      state: {
        itineraryItems: itinerary,
        city: city,
      }
    });
  };

  // Funcții pentru acțiuni rapide
  const handleExportList = () => {
    const exportData = {
      city: city,
      totalPlaces: raw.length,
      averageRating: stats.averageRating,
      averagePrice: stats.averagePrice,
      places: raw.map(place => ({
        name: place.name,
        rating: place.rating,
        duration: place.minimumDuration,
        price: generateConsistentPrice(place.name) + " RON"
      }))
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recomandari-${city.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const shareText = `Descoperă ${raw.length} experiențe fantastice în ${city}! Rating mediu: ${stats.averageRating}⭐`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Recomandări pentru ${city}`,
          text: shareText,
          url: window.location.href
        });
      } catch (err) {
        console.log('Partajarea a fost anulată');
      }
    } else {
      // Fallback pentru browsere care nu suportă Web Share API
      navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
      alert('Link-ul a fost copiat în clipboard!');
    }
  };

  const handleViewFavorites = () => {
    const favoritesList = [...favorites];
    if (favoritesList.length === 0) {
      alert('Nu ai încă locuri favorite salvate!');
      return;
    }
    
    const favoritePlaces = raw.filter(place => favorites.has(place.name));
    console.log('Locurile tale favorite:', favoritePlaces);
    // Aici poți naviga către o pagină dedicată favoritelor
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
                  ✅ În itinerariu
                </button>
              ) : (
                <button
                  onClick={() => addToItinerary(item)}
                  className="flex-1 py-2 px-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
                >
                  ➕ Adaugă
                </button>
              )}
              
              <button
                onClick={() => toggleFavorite(item.name)}
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
                  AdventureBooking
                </h1>
                <p className="text-sm text-gray-600">Descoperă experiențe unice</p>
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
          <span>Înapoi la căutare</span>
        </button>

        {/* Title Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Recomandări pentru <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{city}</span>
          </h1>
          <p className="text-xl text-gray-600">
            Am găsit <span className="font-semibold text-blue-600">{raw.length}</span> experiențe fantastice pentru tine
          </p>
        </div>

        {/* Acțiuni Rapide */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">⚡</span>
            Acțiuni rapide
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleExportList}
              className="flex items-center space-x-3 p-4 bg-green-50 border-2 border-green-200 rounded-xl hover:bg-green-100 transition-colors group"
            >
              <div className="p-2 bg-green-200 rounded-lg group-hover:bg-green-300 transition-colors">
                <span className="text-xl">📋</span>
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-green-800">Exportă lista</h4>
                <p className="text-sm text-green-600">PDF, CSV sau JSON</p>
              </div>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center space-x-3 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl hover:bg-purple-100 transition-colors group"
            >
              <div className="p-2 bg-purple-200 rounded-lg group-hover:bg-purple-300 transition-colors">
                <span className="text-xl">🔗</span>
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-purple-800">Partajează</h4>
                <p className="text-sm text-purple-600">Trimite prietening</p>
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
                <h4 className="font-semibold text-yellow-800">Favorite ({favorites.size})</h4>
                <p className="text-sm text-yellow-600">Locurile tale preferate</p>
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
                  Hartă interactivă
                </h3>
                <p className="text-sm text-gray-600">Click pe marker-e pentru detalii</p>
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

            {/* Stats Bar */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">📊 Statistici rapide</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalPlaces}</div>
                  <div className="text-sm text-gray-600">Locuri disponibile</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-xl">
                  <div className="text-2xl font-bold text-yellow-600">⭐ {stats.averageRating}</div>
                  <div className="text-sm text-gray-600">Rating mediu</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">{stats.averagePrice} RON</div>
                  <div className="text-sm text-gray-600">Preț mediu</div>
                </div>
              </div>
            </div>

            {/* Places List */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">Locuri recomandate</h3>
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
                            <h4 className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                              {item.name}
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(item.name);
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
                              {itemPrice} RON / persoană
                            </div>
                          </div>

                          <p className="text-gray-600 mb-4 line-clamp-2">
                            {item.description || "Descoperă această experiență unică și creează amintiri de neuitat în această destinație minunată."}
                          </p>

                          <div className="flex gap-3">
                            {isInItinerary(item.name) ? (
                              <button
                                onClick={() => removeFromItinerary(item.name)}
                                className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors font-medium"
                              >
                                <span>✅</span>
                                <span>În itinerariu</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => addToItinerary(item)}
                                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                              >
                                <span>➕</span>
                                <span>Adaugă în itinerariu</span>
                              </button>
                            )}
                            
                            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
                              <span>👁️</span>
                              <span>Detalii</span>
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
                    Vezi toate cele {raw.length} recomandări ↓
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Itinerary */}
          <div className="space-y-6">
            {/* Itinerary Widget */}
            {itinerary.length > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-6 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-blue-900 flex items-center">
                    <span className="mr-2">🎯</span>
                    Itinerariul tău
                  </h3>
                  <span className="bg-blue-600 text-white text-sm px-3 py-1 rounded-full font-medium">
                    {itinerary.length} {itinerary.length === 1 ? 'loc' : 'locuri'}
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
                      +{itinerary.length - 3} alte locuri
                    </p>
                  )}
                </div>

                <button
                  onClick={goToItinerary}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  Vezi Itinerariul Complet →
                </button>
              </div>
            )}

            {/* Tips */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6">
              <h4 className="text-lg font-semibold text-orange-900 mb-3 flex items-center">
                <span className="mr-2">💡</span>
                Sfaturi utile
              </h4>
              <div className="space-y-3 text-sm text-orange-800">
                <p>• Click pe harta pentru a vedea detalii</p>
                <p>• Salvează locurile favorite cu ❤️</p>
                <p>• Construiește-ți itinerariul perfect</p>
                <p>• Verifică orele de funcționare</p>
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
            title="Vezi itinerariul"
          >
            <span className="text-xl">🎯</span>
          </button>
        )}
        
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-14 h-14 bg-gray-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center"
          title="Înapoi sus"
        >
          <span className="text-xl">↑</span>
        </button>
      </div>

      {/* Empty State */}
      {raw.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Nu am găsit recomandări</h3>
          <p className="text-gray-600 mb-6">Încearcă să cauți în alt oraș sau schimbă filtrele.</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
          >
            Încearcă din nou
          </button>
        </div>
      )}
    </div>
  );
};

export default Recommendations;