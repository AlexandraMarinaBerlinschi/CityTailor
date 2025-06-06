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

  const fallbackImage = "https://raw.githubusercontent.com/AlexandraMarinaBerlinschi/poze-is/main/image-editing.png";

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

      <div className="flex flex-col md:flex-row gap-6">
        {/* Panoul lateral pentru detalii */}
        {selectedPlace && (
          <div className="w-full md:w-1/3 bg-white rounded-lg shadow-lg p-4 h-auto md:h-[450px] overflow-y-auto order-2 md:order-1">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-blue-700">{selectedPlace.name}</h3>
              <button 
                onClick={closeSidebar}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            
            {/* Imagine */}
            <div className="mb-4">
              <img 
                src={selectedPlace.pictures && selectedPlace.pictures.length > 0 
                  ? (selectedPlace.pictures[0].url || selectedPlace.pictures[0]) 
                  : fallbackImage} 
                alt={selectedPlace.name} 
                className="w-full h-40 object-cover rounded"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = fallbackImage;
                }}
              />
            </div>
            
            {/* Detalii */}
            <div className="mb-4 space-y-3">
              {/* Rating */}
              {selectedPlace.rating && (
                <div className="flex items-center">
                  <span className="bg-yellow-100 text-yellow-800 text-sm font-medium px-2.5 py-0.5 rounded flex items-center">
                    <svg className="w-4 h-4 text-yellow-400 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 22 20">
                      <path d="M20.924 7.625a1.523 1.523 0 0 0-1.238-1.044l-5.051-.734-2.259-4.577a1.534 1.534 0 0 0-2.752 0L7.365 5.847l-5.051.734A1.535 1.535 0 0 0 1.463 9.2l3.656 3.563-.863 5.031a1.532 1.532 0 0 0 2.226 1.616L11 17.033l4.518 2.375a1.534 1.534 0 0 0 2.226-1.617l-.863-5.03L20.537 9.2a1.523 1.523 0 0 0 .387-1.575Z"/>
                    </svg>
                    {Number(selectedPlace.rating).toFixed(1)}
                  </span>
                </div>
              )}
              
              {/* Durata */}
              {selectedPlace.minimumDuration && (
                <div className="flex items-center">
                  <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                    <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    {selectedPlace.minimumDuration}
                  </span>
                </div>
              )}
              
              {/* Locația */}
              <div className="flex items-center">
                <span className="bg-gray-100 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded">
                  <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  {selectedPlace.lat.toFixed(4)}, {selectedPlace.lon.toFixed(4)}
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Buton adaugă în itinerariu */}
              <button
                onClick={addToItinerary}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition duration-200 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Adaugă în itinerariu
              </button>
              
              {/* Link Google Maps */}
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${selectedPlace.lat},${selectedPlace.lon}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full inline-block"
              >
                <button className="w-full py-2 px-4 border border-blue-600 text-blue-600 font-medium rounded hover:bg-blue-50 transition duration-200 flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  Vezi pe Google Maps
                </button>
              </a>
            </div>
          </div>
        )}
        
        {/* Harta */}
        <div className={`w-full ${selectedPlace ? 'md:w-2/3' : 'md:w-full'} h-[450px] rounded overflow-hidden shadow order-1 md:order-2`}>
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
              ))}
          </MapContainer>
        </div>
      </div>

      {/* Lista de locații */}
      <div className="space-y-6 mt-6">
        <h2 className="text-xl font-semibold">All Places</h2>
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