import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import PlaceCard from "../components/PlaceCard";

// 🛠️ Fix pentru eroarea legată de map container deja inițializat
const resetLeafletMapContainer = () => {
  const container = L.DomUtil.get("map");
  if (container != null) {
    container._leaflet_id = null;
  }
};

// 🔐 Utility: validare coordonate
const safeToNumber = (val) => {
  const num = Number(val);
  return isFinite(num) ? num : null;
};

const isValidLatLon = (lat, lon) =>
  typeof lat === "number" && typeof lon === "number" && isFinite(lat) && isFinite(lon);

// 🔄 Re-centrare hartă pe punct selectat
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (Array.isArray(center) && isValidLatLon(center[0], center[1])) {
      map.flyTo(center, 15, { animate: false });
    }
  }, [center, map]);
  return null;
};

const Recommendations = () => {
  const location = useLocation();

  useEffect(() => {
    resetLeafletMapContainer();
  }, []);

  const raw = location.state?.recommendations || [];
  const city = location.state?.city || "";
  const lat = safeToNumber(location.state?.lat) || 48.8566;
  const lon = safeToNumber(location.state?.lon) || 2.3522;

  const [mapCenter, setMapCenter] = useState([lat, lon]);
  const [itinerary, setItinerary] = useState([]);

  const defaultCenter = [lat, lon];

  const handleSelectPlace = (place) => {
    const lat = safeToNumber(place.lat);
    const lon = safeToNumber(place.lon);
    if (isValidLatLon(lat, lon)) {
      setMapCenter([lat, lon]);
    } else {
      console.warn("❌ handleSelectPlace: Invalid place", place);
    }
  };

  const addToItinerary = (place) => {
    if (place && !itinerary.some((p) => p.name === place.name)) {
      setItinerary([...itinerary, place]);
      alert(`"${place.name}" a fost adăugat în itinerariul tău!`);
    }
  };

  const renderMarker = (item, index) => {
    const lat = safeToNumber(item.lat);
    const lon = safeToNumber(item.lon);
    const position = isValidLatLon(lat, lon) ? [lat, lon] : null;

    if (!position) {
      console.warn("❌ Marker position invalid @ index", index, item);
      return null;
    }

    return (
      <Marker
        key={index}
        position={position}
        eventHandlers={{ click: () => handleSelectPlace(item) }}
      >
        <Popup>
          <strong>{item.name}</strong>
          {item.minimumDuration && <><br />⏱️ {item.minimumDuration}</>}
          {item.rating && <><br />⭐ {Number(item.rating).toFixed(1)}</>}
          <br />
          <button
            onClick={() => addToItinerary(item)}
            className="mt-2 py-1 px-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            ➕ Adaugă în itinerariu
          </button>
        </Popup>
      </Marker>
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-8 relative">
      <h1 className="text-2xl font-bold mb-4">Recomandări Personalizate</h1>
      <h2 className="text-lg font-medium mb-4 text-gray-700">
        Afișăm recomandări pentru <span className="font-semibold">{city}</span>
      </h2>

      {itinerary.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2 text-blue-800">Itinerariu</h3>
          <ul className="list-disc pl-5">
            {itinerary.map((place, index) => (
              <li key={index}>
                {place.name}
                {place.minimumDuration && ` (Durată: ${place.minimumDuration})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full h-[450px] rounded shadow" id="map">
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

      <div className="mt-6 space-y-4">
        <h2 className="text-xl font-semibold">Toate Locurile</h2>
        {raw.map((item, index) => (
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
