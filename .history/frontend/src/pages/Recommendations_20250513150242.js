import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import PlaceCard from "../components/PlaceCard";

// Componenta pentru a urmări și actualiza center-ul hărții
const MapUpdater = ({ center }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.flyTo(center, 15);
    }
  }, [center, map]);
  
  return null;
};

const Recommendations = () => {
  const location = useLocation();
  const recommendations = location.state?.recommendations || [];
  const city = location.state?.city || "";
  const lat = location.state?.lat || 48.8566;
  const lon = location.state?.lon || 2.3522;
  
  // State pentru locația selectată și itinerariu
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [itinerary, setItinerary] = useState([]);
  const [mapCenter, setMapCenter] = useState([lat, lon]);

  const defaultCenter = [lat, lon];

  // Funcție pentru a selecta un loc de pe hartă
  const handleSelectPlace = (place) => {
    setSelectedPlace(place);
    setMapCenter([place.lat, place.lon]);
  };

  // Funcție pentru a adăuga locul selectat în itinerariu
  const addToItinerary = () => {
    if (selectedPlace && !itinerary.some(place => place.name === selectedPlace.name)) {
      setItinerary([...itinerary, selectedPlace]);
      // Opțional: afișarea unui mesaj de confirmare
      alert(`"${selectedPlace.name}" a fost adăugat în itinerariul tău!`);
    }
  };

  // Închide panoul lateral
  const closeSidebar = () => {
    setSelectedPlace(null);
  };

  if (!Array.isArray(recommendations)) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Something went wrong</h1>
        <pre className="bg-red-100 p-4 rounded text-sm text-red-800">
          {JSON.stringify(recommendations, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-8 relative">
      <h1 className="text-2xl font-bold mb-4">Personalized Recommendations</h1>

      <h2 className="text-lg font-medium mb-4 text-gray-700">
        Showing recommendations in <span className="font-semibold">{city}</span>
      </h2>

      {/* Afișăm itinerariul dacă există */}
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

      <div className="flex gap-6">
        {/* Panoul lateral pentru detalii */}
        {selectedPlace && (
          <div className="w-1/3 bg-white rounded-lg shadow-lg p-4 h-[400px] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-blue-700">{selectedPlace.name}</h3>
              <button 
                onClick={closeSidebar}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            {selectedPlace.pictures && selectedPlace.pictures.length > 0 && (
              <div className="mb-4">
                <img 
                  src={selectedPlace.pictures[0]} 
                  alt={selectedPlace.name} 
                  className="w-full h-32 object-cover rounded"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/300x150?text=No+Image';
                  }}
                />
              </div>
            )}
            
            <div className="mb-4">
              {selectedPlace.rating && (
                <p className="mb-2 text-yellow-500">
                  {"⭐".repeat(Math.round(selectedPlace.rating))}
                  <span className="text-gray-600 ml-1">({selectedPlace.rating})</span>
                </p>
              )}
              
              {selectedPlace.minimumDuration && (
                <p className="text-gray-600">
                  <span className="font-medium">Durata recomandată:</span> {selectedPlace.minimumDuration}
                </p>
              )}
              
              <p className="text-gray-600 mt-2">
                <span className="font-medium">Coordonate:</span> {selectedPlace.lat.toFixed(5)}, {selectedPlace.lon.toFixed(5)}
              </p>
            </div>
            
            <button
              onClick={addToItinerary}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition duration-200 flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Adaugă în itinerariu
            </button>
          </div>
        )}
        
        {/* Harta */}
        <div className={`${selectedPlace ? 'w-2/3' : 'w-full'} h-[400px] rounded overflow-hidden shadow`}>
          <MapContainer center={defaultCenter} zoom={13} className="h-full w-full">
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater center={mapCenter} />
            {recommendations
              .filter((item) => item.lat && item.lon)
              .map((item, index) => (
                <Marker 
                  key={index} 
                  position={[item.lat, item.lon]}
                  eventHandlers={{
                    click: () => handleSelectPlace(item),
                  }}
                >
                  <Popup>
                    <strong>{item.name}</strong>
                    <br />
                    {item.minimumDuration && `Duration: ${item.minimumDuration}`}
                    {item.rating && <><br />⭐ {item.rating}</>}
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
              ))}
          </MapContainer>
        </div>
      </div>

      <div className="space-y-6 mt-6">
        {recommendations
          .filter((item) => item.lat && item.lon)
          .map((item, index) => (
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