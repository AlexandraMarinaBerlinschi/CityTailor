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
const isValidLatLonArray = (arr) =>
  Array.isArray(arr) &&
  arr.length === 2 &&
  isValidCoordinate(arr[0]) &&
  isValidCoordinate(arr[1]);

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

const LeafletFixSetup = () => {
  useEffect(() => {
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
      const updatedSelectedPlace = { ...selectedPlace, city: selectedPlace.city || city };
      const newItinerary = [...itinerary, updatedSelectedPlace];
      setItinerary(newItinerary);
      alert(`"${selectedPlace.name}" has been added to your itinerary!`);
    }
  };

  const closeSidebar = () => setSelectedPlace(null);

  const goToItineraryPage = () => {
    navigate("/itinerary", {
      state: { itineraryItems: itinerary, city: city }
    });
  };

  const filteredRecommendations = recommendations.filter(item => {
    const itemLat = toNumber(item.lat);
    const itemLon = toNumber(item.lon);
    const valid = isValidCoordinate(itemLat) && isValidCoordinate(itemLon);
    if (!valid) {
      console.warn("❌ Skipping invalid recommendation:", item);
    }
    return valid;
  });

  const getImageUrl = (place) => {
    if (!place) return fallbackImage;
    if (place.pictures?.[0]?.url) return place.pictures[0].url;
    if (typeof place.pictures?.[0] === "string") return place.pictures[0];
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
            <button onClick={goToItineraryPage} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-md text-sm transition duration-200 flex items-center">
              View full itinerary
            </button>
          </div>
          <ul className="list-disc pl-5">
            {itinerary.slice(0, 3).map((place, index) => (
              <li key={index}>{place.name} {place.minimumDuration && `(Duration: ${place.minimumDuration})`}</li>
            ))}
            {itinerary.length > 3 && <li className="text-blue-700">...and {itinerary.length - 3} more</li>}
          </ul>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {selectedPlace && (
          <div className="w-full md:w-1/3 bg-white rounded-lg shadow-lg p-4 h-auto md:h-[450px] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-blue-700">{selectedPlace.name}</h3>
              <button onClick={closeSidebar} className="text-xl text-gray-500">×</button>
            </div>
            <img
              src={getImageUrl(selectedPlace)}
              alt={selectedPlace.name}
              className="w-full h-40 object-cover rounded mb-4"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = fallbackImage;
              }}
            />
            <div className="space-y-2">
              {selectedPlace.rating && <div>⭐ {Number(selectedPlace.rating).toFixed(1)}</div>}
              {selectedPlace.minimumDuration && <div>⏱️ {selectedPlace.minimumDuration}</div>}
              <div>
                📍 {
                  isValidCoordinate(toNumber(selectedPlace.lat))
                    ? toNumber(selectedPlace.lat).toFixed(4)
                    : 'N/A'
                }, {
                  isValidCoordinate(toNumber(selectedPlace.lon))
                    ? toNumber(selectedPlace.lon).toFixed(4)
                    : 'N/A'
                }
              </div>
            </div>
            <button
              onClick={addToItinerary}
              disabled={itinerary.some(p => p.name === selectedPlace.name)}
              className={`mt-4 w-full py-2 px-4 rounded ${itinerary.some(p => p.name === selectedPlace.name)
                ? "bg-gray-300 text-gray-600"
                : "bg-blue-600 text-white hover:bg-blue-700"}`}
            >
              ➕ {itinerary.some(p => p.name === selectedPlace.name) ? "Added to itinerary" : "Add to itinerary"}
            </button>
          </div>
        )}

        <div className={`w-full ${selectedPlace ? "md:w-2/3" : "md:w-full"} h-[450px] rounded shadow`}>
          {isValidLatLonArray(defaultCenter) && (
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
              {isValidLatLonArray(mapCenter) && <MapUpdater center={mapCenter} />}
              {filteredRecommendations.map((item, index) => {
                const itemLat = toNumber(item.lat);
                const itemLon = toNumber(item.lon);
                if (!isValidCoordinate(itemLat) || !isValidCoordinate(itemLon)) {
                  console.warn("❌ Skipping marker with invalid coordinates", item);
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
        </div>
      </div>

      <div className="space-y-6 mt-6">
        <h2 className="text-xl font-semibold">All Places</h2>
        {filteredRecommendations.length > 0 ? (
          filteredRecommendations.map((item, index) => {
            const itemLat = toNumber(item.lat);
            const itemLon = toNumber(item.lon);
            if (!isValidCoordinate(itemLat) || !isValidCoordinate(itemLon)) return null;
            return (
              <PlaceCard
                key={index}
                name={item.name}
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
