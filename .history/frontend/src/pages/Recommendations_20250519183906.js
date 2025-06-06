import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import PlaceCard from "../components/PlaceCard";

const isValidCoordinate = (val) => typeof val === 'number' && isFinite(val);
const toNumber = (val) => {
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : null;
};

const MapUpdater = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    if (
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

const Recommendations = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const recommendations = location.state?.recommendations || [];
  const city = location.state?.city || "";
  const lat = toNumber(location.state?.lat) || 48.8566;
  const lon = toNumber(location.state?.lon) || 2.3522;

  const [selectedPlace, setSelectedPlace] = useState(null);
  const [itinerary, setItinerary] = useState([]);
  const [mapCenter, setMapCenter] = useState([lat, lon]);

  const defaultCenter = [lat, lon];
  const fallbackImage = "https://raw.githubusercontent.com/AlexandraMarinaBerlinschi/poze-is/main/image-editing.png";

  const handleSelectPlace = (place) => {
    const lat = toNumber(place.lat);
    const lon = toNumber(place.lon);

    if (isValidCoordinate(lat) && isValidCoordinate(lon)) {
      setSelectedPlace(place);
      setMapCenter([lat, lon]);
    } else {
      console.warn("Invalid coordinates for selected place:", place);
    }
  };

  const addToItinerary = () => {
    if (selectedPlace && !itinerary.some(place => place.name === selectedPlace.name)) {
      const newItinerary = [...itinerary, selectedPlace];
      if (!selectedPlace.city) {
        selectedPlace.city = city;
      }
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

  const filteredRecommendations = recommendations.filter(
    item => isValidCoordinate(toNumber(item.lat)) && isValidCoordinate(toNumber(item.lon))
  );

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
                src={selectedPlace.pictures?.[0]?.url || selectedPlace.pictures?.[0] || fallbackImage}
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
                  📍 {toNumber(selectedPlace.lat)?.toFixed(4)}, {toNumber(selectedPlace.lon)?.toFixed(4)}
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
          <MapContainer center={defaultCenter} zoom={13} className="h-full w-full">
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater center={mapCenter} />
            {filteredRecommendations.map((item, index) => (
              <Marker
                key={index}
                position={[toNumber(item.lat), toNumber(item.lon)]}
                eventHandlers={{ click: () => handleSelectPlace(item) }}
              >
                <Popup>
                  <strong>{item.name}</strong>
                  {item.minimumDuration && <><br />Duration: {item.minimumDuration}</>}
                  {item.rating && <><br />⭐ {Number(item.rating).toFixed(1)}</>}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      <div className="space-y-6 mt-6">
        <h2 className="text-xl font-semibold">All Places</h2>
        {filteredRecommendations.map((item, index) => (
          <PlaceCard
            key={index}
            name={item.name}
            lat={toNumber(item.lat)}
            lon={toNumber(item.lon)}
            rating={item.rating}
            pictures={item.pictures}
            minimumDuration={item.minimumDuration}
            onClick={() => handleSelectPlace(item)}
          />
        ))}
      </div>
    </div>
  );
};

export default Recommendations;
