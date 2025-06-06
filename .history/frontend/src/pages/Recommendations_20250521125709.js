import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import PlaceCard from "../components/PlaceCard";

const isValidCoordinate = (val) => typeof val === 'number' && isFinite(val) && !isNaN(val);
const toNumber = (val) => {
  if (val === null || val === undefined) return null;
  const parsed = Number(val);
  return isFinite(parsed) && !isNaN(parsed) ? parsed : null;
};

// Replace the existing MapUpdater component with this one
const MapUpdater = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    if (
      center &&
      Array.isArray(center) &&
      center.length === 2 &&
      isValidCoordinate(center[0]) &&
      isValidCoordinate(center[1])
    ) {
      map.flyTo(center, 15);
    }
  }, [center, map]);

  return null;
};

// Add this component to handle the marker icons issue
const LeafletFixSetup = () => {
  useEffect(() => {
    // Fix for Leaflet default icon issue
    import("leaflet").then(L => {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
      });
    });
  }, []);
  
  return null;
};

// Update your MapContainer section to include the LeafletFixSetup component
// and ensure the MapContainer is only rendered when valid coordinates exist
{defaultCenter[0] && defaultCenter[1] && (
  <MapContainer 
    center={defaultCenter} 
    zoom={13} 
    className="h-full w-full"
    key={`map-${defaultCenter[0]}-${defaultCenter[1]}`}
  >
    <LeafletFixSetup />
    <TileLayer
      attribution='&copy; OpenStreetMap contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
    <MapUpdater center={mapCenter} />
    {filteredRecommendations.map((item, index) => {
      const itemLat = toNumber(item.lat);
      const itemLon = toNumber(item.lon);

      if (!isValidCoordinate(itemLat) || !isValidCoordinate(itemLon)) {
        return null;
      }

      return (
        <Marker
          key={`marker-${index}-${itemLat}-${itemLon}`}
          position={[itemLat, itemLon]}
          eventHandlers={{ click: () => handleSelectPlace(item) }}
        >
          <Popup>
            <strong>{item.name}</strong>
            {item.minimumDuration && <><br />Duration: {item.minimumDuration}</>}
            {item.rating && <><br />⭐ {Number(item.rating).toFixed(1)}</>}
          </Popup>
        </Marker>
      );
    })}
  </MapContainer>
)}

const Recommendations = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const recommendations = location.state?.recommendations || [];
  const city = location.state?.city || "";

  const initialLat = toNumber(location.state?.lat);
  const initialLon = toNumber(location.state?.lon);
  const lat = isValidCoordinate(initialLat) ? initialLat : 48.8566;
  const lon = isValidCoordinate(initialLon) ? initialLon : 2.3522;

  const [selectedPlace, setSelectedPlace] = useState(null);
  const [itinerary, setItinerary] = useState([]);
  const [mapCenter, setMapCenter] = useState([lat, lon]);

  const defaultCenter = [lat, lon];
  const fallbackImage = "https://raw.githubusercontent.com/AlexandraMarinaBerlinschi/poze-is/main/image-editing.png";

  const handleSelectPlace = (place) => {
    if (!place) return;
    console.log("📍 Selected place clicked:", place);

    const placeLatitude = toNumber(place.lat);
    const placeLongitude = toNumber(place.lon);

    if (isValidCoordinate(placeLatitude) && isValidCoordinate(placeLongitude)) {
      setSelectedPlace(place);
      setMapCenter([placeLatitude, placeLongitude]);
    } else {
      console.warn("🚨 INVALID SELECTED PLACE COORDINATES", place);
    }
  };

  const addToItinerary = () => {
    if (selectedPlace && !itinerary.some(place => place.name === selectedPlace.name)) {
      const updatedSelectedPlace = { ...selectedPlace };
      if (!updatedSelectedPlace.city) {
        updatedSelectedPlace.city = city;
      }
      const newItinerary = [...itinerary, updatedSelectedPlace];
      setItinerary(newItinerary);
      alert(`"${selectedPlace.name}" has been added to your itinerary!`);
    }
  };

  const closeSidebar = () => {
    setSelectedPlace(null);
  };

  const goToItineraryPage = () => {
    navigate("/itinerary", {
      state: {
        itineraryItems: itinerary,
        city: city,
      }
    });
  };

  const filteredRecommendations = recommendations.filter(item => {
    const itemLat = toNumber(item.lat);
    const itemLon = toNumber(item.lon);
    const isValid = isValidCoordinate(itemLat) && isValidCoordinate(itemLon);
    if (!isValid) console.warn("⚠️ Filtered out invalid recommendation:", item);
    return isValid;
  });

  const getImageUrl = (place) => {
    if (!place) return fallbackImage;

    if (place.pictures && Array.isArray(place.pictures)) {
      if (place.pictures[0] && typeof place.pictures[0] === 'object' && place.pictures[0].url) {
        return place.pictures[0].url;
      } else if (place.pictures[0] && typeof place.pictures[0] === 'string') {
        return place.pictures[0];
      }
    }
    return fallbackImage;
  };

  return (
    <div className="max-w-5xl mx-auto p-8 relative">
      <h1 className="text-2xl font-bold mb-4">Personalized Recommendations</h1>

      <h2 className="text-lg font-medium mb-4 text-gray-700">
        Showing recommendations in <span className="font-semibold">{city}</span>
      </h2>

      {itinerary.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg shadow">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium text-blue-800">
              Your itinerary ({itinerary.length} locations)
            </h3>
            <button
              onClick={goToItineraryPage}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-md text-sm transition duration-200 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
              View full itinerary
            </button>
          </div>
          <ul className="list-disc pl-5">
            {itinerary.slice(0, 3).map((place, index) => (
              <li key={index} className="mb-1">
                {place.name}
                {place.minimumDuration && ` (Duration: ${place.minimumDuration})`}
              </li>
            ))}
            {itinerary.length > 3 && <li className="text-blue-700">...and {itinerary.length - 3} more locations</li>}
          </ul>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {selectedPlace && (
          <div className="w-full md:w-1/3 bg-white rounded-lg shadow-lg p-4 h-auto md:h-[450px] overflow-y-auto order-2 md:order-1">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-blue-700">{selectedPlace.name}</h3>
              <button onClick={closeSidebar} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
            </div>
            <div className="mb-4">
              <img
                src={getImageUrl(selectedPlace)}
                alt={selectedPlace.name}
                className="w-full h-40 object-cover rounded"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = fallbackImage;
                }}
              />
            </div>
            <div className="mb-4 space-y-3">
              {selectedPlace.rating && (
                <div className="flex items-center">
                  <span className="bg-yellow-100 text-yellow-800 text-sm font-medium px-2.5 py-0.5 rounded flex items-center">
                    ⭐ {Number(selectedPlace.rating).toFixed(1)}
                  </span>
                </div>
              )}
              {selectedPlace.minimumDuration && (
                <div className="flex items-center">
                  <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                    ⏱️ {selectedPlace.minimumDuration}
                  </span>
                </div>
              )}
              <div className="flex items-center">
                <span className="bg-gray-100 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded">
                  📍 {toNumber(selectedPlace.lat)?.toFixed(4) || 'N/A'}, {toNumber(selectedPlace.lon)?.toFixed(4) || 'N/A'}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <button
                onClick={addToItinerary}
                disabled={itinerary.some(place => place.name === selectedPlace.name)}
                className={`w-full py-2 px-4 font-medium rounded transition duration-200 flex items-center justify-center
                  ${itinerary.some(place => place.name === selectedPlace.name)
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                ➕ {itinerary.some(place => place.name === selectedPlace.name)
                  ? 'Added to itinerary'
                  : 'Add to itinerary'}
              </button>
            </div>
          </div>
        )}

        <div className={`w-full ${selectedPlace ? 'md:w-2/3' : 'md:w-full'} h-[450px] rounded overflow-hidden shadow order-1 md:order-2`}>
          {defaultCenter[0] && defaultCenter[1] && (
            <MapContainer center={defaultCenter} zoom={13} className="h-full w-full">
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapUpdater center={mapCenter} />
              {filteredRecommendations.map((item, index) => {
                const itemLat = toNumber(item.lat);
                const itemLon = toNumber(item.lon);

                if (!isValidCoordinate(itemLat) || !isValidCoordinate(itemLon)) {
                  console.warn("🚨 INVALID MARKER", item);
                  return null;
                }

                return (
                  <Marker
                    key={index}
                    position={[itemLat, itemLon]}
                    eventHandlers={{ click: () => handleSelectPlace(item) }}
                  >
                    <Popup>
                      <strong>{item.name}</strong>
                      {item.minimumDuration && <><br />Duration: {item.minimumDuration}</>}
                      {item.rating && <><br />⭐ {Number(item.rating).toFixed(1)}</>}
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          )}
        </div>
      </div>

      <div className="space-y-6 mt-6">
        <h2 className="text-xl font-semibold">All Places</h2>
        {filteredRecommendations.length > 0 ? (
          filteredRecommendations.map((item, index) => {
            const itemLat = toNumber(item.lat);
            const itemLon = toNumber(item.lon);

            if (!isValidCoordinate(itemLat) || !isValidCoordinate(itemLon)) {
              console.warn("🚨 INVALID LIST ITEM", item);
              return null;
            }

            return (
              <PlaceCard
                key={index}
                name={item.name || "Unnamed Place"}
                lat={itemLat}
                lon={itemLon}
                rating={item.rating}
                pictures={item.pictures}
                minimumDuration={item.minimumDuration}
                onClick={() => handleSelectPlace(item)}
              />
            );
          })
        ) : (
          <div className="bg-gray-100 p-4 rounded-md text-gray-600">
            No places found with valid coordinates.
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendations;
