import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import PlaceCard from "../components/PlaceCard";

const safeToNumber = (val) => {
  const num = Number(val);
  return isFinite(num) ? num : null;
};

const isValidLatLon = (lat, lon) => {
  return typeof lat === "number" && typeof lon === "number" && isFinite(lat) && isFinite(lon);
};

const MapUpdater = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    console.log("🗺️ MapUpdater center:", center);
    if (Array.isArray(center) && center.length === 2 && isValidLatLon(center[0], center[1])) {
      map.flyTo(center, 15);
    } else {
      console.warn("❌ MapUpdater: coordonate invalide", center);
    }
  }, [center, map]);

  return null;
};

const Recommendations = () => {
  const location = useLocation();
  const raw = location.state?.recommendations || [];
  const city = location.state?.city || "";
  const lat = safeToNumber(location.state?.lat) || 48.8566;
  const lon = safeToNumber(location.state?.lon) || 2.3522;

  const [selectedPlace, setSelectedPlace] = useState(null);
  const [itinerary, setItinerary] = useState([]);
  const [mapCenter, setMapCenter] = useState([lat, lon]);

  const defaultCenter = [lat, lon];
  const fallbackImage = "https://raw.githubusercontent.com/AlexandraMarinaBerlinschi/poze-is/main/image-editing.png";

  const recommendations = raw.filter((item) => {
    const itemLat = safeToNumber(item.lat);
    const itemLon = safeToNumber(item.lon);
    const valid = isValidLatLon(itemLat, itemLon);
    if (!valid) console.warn("⚠️ Skipping invalid location:", item);
    return valid;
  });

  const handleSelectPlace = (place) => {
    const lat = safeToNumber(place.lat);
    const lon = safeToNumber(place.lon);
    console.log("📍 handleSelectPlace", { lat, lon, name: place.name });

    if (isValidLatLon(lat, lon)) {
      setSelectedPlace(place);
      setMapCenter([lat, lon]);
    } else {
      console.warn("❌ handleSelectPlace: coordonate invalide", place);
    }
  };

  const addToItinerary = () => {
    if (selectedPlace && !itinerary.some((place) => place.name === selectedPlace.name)) {
      setItinerary([...itinerary, selectedPlace]);
      alert(`"${selectedPlace.name}" a fost adăugat în itinerariul tău!`);
    }
  };

  const closeSidebar = () => setSelectedPlace(null);

  return (
    <div className="max-w-5xl mx-auto p-8 relative">
      <h1 className="text-2xl font-bold mb-4">Personalized Recommendations</h1>
      <h2 className="text-lg font-medium mb-4 text-gray-700">
        Showing recommendations in <span className="font-semibold">{city}</span>
      </h2>

      {itinerary.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2 text-blue-800">Itinerariul tău</h3>
          <ul className="list-disc pl-5">
            {itinerary.map((place, index) => (
              <li key={index} className="mb-1">
                {place.name}
                {place.minimumDuration && ` (Durata: ${place.minimumDuration})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {selectedPlace && isValidLatLon(safeToNumber(selectedPlace.lat), safeToNumber(selectedPlace.lon)) && (
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
            <div className="space-y-2">
              {selectedPlace.rating && (
                <div>⭐ {Number(selectedPlace.rating).toFixed(1)}</div>
              )}
              {selectedPlace.minimumDuration && (
                <div>⏱️ {selectedPlace.minimumDuration}</div>
              )}
              <div>
                📍 {Number(selectedPlace.lat).toFixed(4)}, {Number(selectedPlace.lon).toFixed(4)}
              </div>
            </div>
            <button
              onClick={addToItinerary}
              className="mt-4 w-full py-2 px-4 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              ➕ Adaugă în itinerariu
            </button>
          </div>
        )}

        <div className={`w-full ${selectedPlace ? 'md:w-2/3' : 'md:w-full'} h-[450px] rounded shadow`}>
          <MapContainer center={defaultCenter} zoom={13} className="h-full w-full">
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {isValidLatLon(mapCenter[0], mapCenter[1]) && <MapUpdater center={mapCenter} />}
            {recommendations.map((item, index) => {
              const lat = safeToNumber(item.lat);
              const lon = safeToNumber(item.lon);
              if (!isValidLatLon(lat, lon)) {
                console.warn("🚫 SKIP Marker – coordonate invalide", item);
                return null;
              }

                console.log("📍 Marker valid:", lat, lon, item.name); // <-- ADĂUGĂ ASTA

              try {
                return (
                  <Marker
                    key={index}
                    position={[lat, lon]}
                    eventHandlers={{ click: () => handleSelectPlace(item) }}
                  >
                    <Popup>
                      <strong>{item.name}</strong>
                      {item.minimumDuration && <><br />⏱️ {item.minimumDuration}</>}
                      {item.rating && <><br />⭐ {Number(item.rating).toFixed(1)}</>}
                    </Popup>
                  </Marker>
                );
              } catch (e) {
                console.error("💥 Marker crash:", item, e);
                return null;
              }
            })}
          </MapContainer>
        </div>
      </div>

      <div className="space-y-6 mt-6">
        <h2 className="text-xl font-semibold">All Places</h2>
        {recommendations.map((item, index) => (
          <PlaceCard
            key={index}
            name={item.name}
            lat={item.lat}
            lon={item.lon}
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
