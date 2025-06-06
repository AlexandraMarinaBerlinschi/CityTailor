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

const MapUpdater = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    if (
      Array.isArray(center) &&
      center.length === 2 &&
      typeof center[0] === "number" &&
      typeof center[1] === "number" &&
      isFinite(center[0]) &&
      isFinite(center[1])
    ) {
      map.flyTo(center, 15);
    } else {
      console.warn("❌ MapUpdater: coordonate invalide", center);
    }
  }, [center, map]);

  return null;
};

const Recommendations = () => {
  const location = useLocation();
  const recommendationsRaw = location.state?.recommendations || [];
  const city = location.state?.city || "";
  const lat = safeToNumber(location.state?.lat) || 48.8566;
  const lon = safeToNumber(location.state?.lon) || 2.3522;

  const [selectedPlace, setSelectedPlace] = useState(null);
  const [itinerary, setItinerary] = useState([]);
  const [mapCenter, setMapCenter] = useState([
    safeToNumber(lat),
    safeToNumber(lon),
  ]);

  const defaultCenter = [lat, lon];
  const fallbackImage = "https://raw.githubusercontent.com/AlexandraMarinaBerlinschi/poze-is/main/image-editing.png";

  const recommendations = recommendationsRaw.filter((item) => {
    const itemLat = safeToNumber(item.lat);
    const itemLon = safeToNumber(item.lon);
    const valid = typeof itemLat === "number" && typeof itemLon === "number";
    if (!valid) console.warn("❌ Coordonate invalide:", item);
    return valid;
  });

  const handleSelectPlace = (place) => {
    const lat = safeToNumber(place.lat);
    const lon = safeToNumber(place.lon);

    if (lat !== null && lon !== null) {
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

  const closeSidebar = () => {
    setSelectedPlace(null);
  };

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
                  📍 {Number(selectedPlace.lat).toFixed(4)}, {Number(selectedPlace.lon).toFixed(4)}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <button
                onClick={addToItinerary}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition duration-200 flex items-center justify-center"
              >
                ➕ Adaugă în itinerariu
              </button>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${selectedPlace.lat},${selectedPlace.lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-block"
              >
                <button className="w-full py-2 px-4 border border-blue-600 text-blue-600 font-medium rounded hover:bg-blue-50 transition duration-200 flex items-center justify-center">
                  🌍 Vezi pe Google Maps
                </button>
              </a>
            </div>
          </div>
        )}

        <div className={`w-full ${selectedPlace ? 'md:w-2/3' : 'md:w-full'} h-[450px] rounded overflow-hidden shadow order-1 md:order-2`}>
          <MapContainer center={defaultCenter} zoom={13} className="h-full w-full">
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {Array.isArray(mapCenter) && mapCenter.length === 2 &&
              typeof mapCenter[0] === "number" && typeof mapCenter[1] === "number" &&
              isFinite(mapCenter[0]) && isFinite(mapCenter[1]) && (
                <MapUpdater center={mapCenter} />
            )}
            {recommendations.map((item, index) => {
              const lat = safeToNumber(item.lat);
              const lon = safeToNumber(item.lon);
              if (lat === null || lon === null) return null;

              return (
                <Marker
                  key={index}
                  position={[lat, lon]}
                  eventHandlers={{ click: () => handleSelectPlace(item) }}
                >
                  <Popup>
                    <strong>{item.name}</strong>
                    <br />
                    {item.minimumDuration && `Duration: ${item.minimumDuration}`}
                    {item.rating && <><br />⭐ {Number(item.rating).toFixed(1)}</>}
                    <br />
                    <button
                      className="text-blue-600 hover:text-blue-800 underline mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPlace(item);
                      }}
                    >
                      Vezi detalii
                    </button>
                  </Popup>
                </Marker>
              );
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
