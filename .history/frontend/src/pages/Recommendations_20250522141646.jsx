import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import PlaceCard from "../components/PlaceCard";

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
      map.flyTo(center, 15, { animate: false });
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
  const defaultCenter = [lat, lon];

  // 1️⃣ Reset map container on mount
  useEffect(() => {
    resetLeafletMapContainer();
  }, []);

  // 2️⃣ Load itinerary from sessionStorage if exists
  useEffect(() => {
    const existingItinerary = sessionStorage.getItem('pendingItinerary');
    if (existingItinerary) {
      try {
        const parsedData = JSON.parse(existingItinerary);
        if (parsedData.items && Array.isArray(parsedData.items)) {
          setItinerary(parsedData.items);
          console.log("🔄 Loaded existing itinerary:", parsedData.items);
        }
      } catch (error) {
        console.error("Error loading existing itinerary:", error);
      }
    }
  }, []);

  // 3️⃣ Save recommendations fallback
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
    } else {
      console.warn("❌ handleSelectPlace: Invalid place", place);
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
      alert(`"${place.name}" a fost adăugat în itinerariul tău!`);

      sessionStorage.setItem('pendingItinerary', JSON.stringify({
        items: updated,
        title: "My Itinerary"
      }));

      console.log("✅ Added to itinerary:", placeWithId);
      console.log("📱 Updated sessionStorage with:", updated);
    } else if (itinerary.some((p) => p.name === place.name)) {
      alert(`"${place.name}" este deja în itinerariul tău!`);
    }
  };

  const removeFromItinerary = (placeName) => {
    const updated = itinerary.filter(item => item.name !== placeName);
    setItinerary(updated);

    sessionStorage.setItem('pendingItinerary', JSON.stringify({
      items: updated,
      title: "My Itinerary"
    }));

    console.log("🗑️ Removed from itinerary:", placeName);
  };

  const goToItinerary = () => {
    console.log("🚀 Navigating to itinerary with data:", {
      itineraryItems: itinerary,
      city: city
    });

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

  const renderMarker = (item, index) => {
    const lat = safeToNumber(item.lat);
    const lon = safeToNumber(item.lon);
    const position = isValidLatLon(lat, lon) ? [lat, lon] : null;

    if (!position) {
      console.warn("❌ Marker position invalid @ index", index, item);
      return null;
    }

    const formattedRating = item.rating ? Number(item.rating).toFixed(1) : null;

    return (
      <Marker
        key={index}
        position={position}
        icon={defaultIcon}
        eventHandlers={{ click: () => handleSelectPlace(item) }}
      >
        <Popup maxWidth={250}>
          <div className="text-sm">
            <strong>{item.name}</strong>
            {item.pictures?.length > 0 && (
              <div className="my-2">
                <img
                  src={item.pictures[0].url || item.pictures[0]}
                  alt={item.name}
                  className="w-full h-24 object-cover rounded"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://raw.githubusercontent.com/AlexandraMarinaBerlinschi/poze-is/main/image-editing.png";
                  }}
                />
              </div>
            )}
            {formattedRating && <div className="mb-1">⭐ <strong>{formattedRating}</strong>/5</div>}
            {item.minimumDuration && <div className="mb-2">⏱️ {item.minimumDuration}</div>}

            {isInItinerary(item.name) ? (
              <button
                onClick={() => removeFromItinerary(item.name)}
                className="mt-1 py-1 px-2 rounded bg-red-600 text-white hover:bg-red-700 w-full"
              >
                ➖ Șterge din itinerariu
              </button>
            ) : (
              <button
                onClick={() => addToItinerary(item)}
                className="mt-1 py-1 px-2 rounded bg-blue-600 text-white hover:bg-blue-700 w-full"
              >
                ➕ Adaugă în itinerariu
              </button>
            )}
          </div>
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
          <button
            onClick={goToItinerary}
            className="mt-4 py-2 px-4 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Vezi Itinerariul Meu →
          </button>
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
