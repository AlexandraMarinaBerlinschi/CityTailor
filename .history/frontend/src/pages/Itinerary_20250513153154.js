import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// Componenta pentru actualizarea centrului hărții
const MapUpdater = ({ center }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.flyTo(center, 15);
    }
  }, [center, map]);
  
  return null;
};

const Itinerary = () => {
  const location = useLocation();
  // Preluăm itinerariul din state sau folosim un array gol
  const [itinerary, setItinerary] = useState(location.state?.itinerary || []);
  const [mapCenter, setMapCenter] = useState(
    itinerary.length > 0 ? [itinerary[0].lat, itinerary[0].lon] : [48.8566, 2.3522]
  );
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [totalDuration, setTotalDuration] = useState("0h");
  
  // State pentru exportul itinerariului
  const [exportFormat, setExportFormat] = useState("pdf");
  const [showExportOptions, setShowExportOptions] = useState(false);

  // Calculează durata totală a itinerariului
  useEffect(() => {
    if (itinerary.length === 0) {
      setTotalDuration("0h");
      return;
    }
    
    let totalMinutes = 0;
    
    itinerary.forEach(place => {
      if (place.minimumDuration) {
        // Convertim durata în minute (ex: "1h 30min" -> 90)
        const durationText = place.minimumDuration;
        
        // Extrage orele
        const hoursMatch = durationText.match(/(\d+)h/);
        const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
        
        // Extrage minutele
        const minutesMatch = durationText.match(/(\d+)min/);
        const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
        
        totalMinutes += hours * 60 + minutes;
      }
    });
    
    // Convertim înapoi în format ore și minute
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    
    let durationText = "";
    if (totalHours > 0) {
      durationText += `${totalHours}h `;
    }
    if (remainingMinutes > 0 || totalHours === 0) {
      durationText += `${remainingMinutes}min`;
    }
    
    setTotalDuration(durationText);
  }, [itinerary]);

  // Funcție pentru a selecta un loc pe hartă
  const handleSelectPlace = (place) => {
    setSelectedPlace(place);
    setMapCenter([place.lat, place.lon]);
  };

  // Funcție pentru a elimina un loc din itinerariu
  const removeFromItinerary = (index) => {
    const newItinerary = [...itinerary];
    newItinerary.splice(index, 1);
    setItinerary(newItinerary);
  };

  // Funcție pentru a reordona elementele din itinerariu prin drag & drop
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(itinerary);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setItinerary(items);
  };

  // Funcție pentru exportul itinerariului în diferite formate
  const exportItinerary = () => {
    // Pregătim datele pentru export
    const exportData = {
      title: "Itinerariul meu",
      places: itinerary.map((place, index) => ({
        id: index + 1,
        name: place.name,
        coordinates: `${place.lat}, ${place.lon}`,
        duration: place.minimumDuration || "Durată nespecificată"
      })),
      totalDuration: totalDuration
    };
    
    // În funcție de formatul selectat
    switch (exportFormat) {
      case "pdf":
        // Simulăm descărcarea unui PDF (în realitate ar trebui implementat cu o librărie)
        alert("Export PDF inițiat: " + JSON.stringify(exportData));
        break;
      case "csv":
        // Exportăm în format CSV
        let csv = "Nr,Nume,Coordonate,Durată\n";
        exportData.places.forEach(place => {
          csv += `${place.id},"${place.name}","${place.coordinates}","${place.duration}"\n`;
        });
        
        const csvBlob = new Blob([csv], { type: 'text/csv' });
        const csvUrl = URL.createObjectURL(csvBlob);
        const link = document.createElement('a');
        link.href = csvUrl;
        link.download = 'itinerariu.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        break;
      case "json":
        // Exportăm în format JSON
        const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const jsonUrl = URL.createObjectURL(jsonBlob);
        const jsonLink = document.createElement('a');
        jsonLink.href = jsonUrl;
        jsonLink.download = 'itinerariu.json';
        document.body.appendChild(jsonLink);
        jsonLink.click();
        document.body.removeChild(jsonLink);
        break;
      default:
        alert("Format de export nesuportat");
    }
    
    setShowExportOptions(false);
  };

  const fallbackImage = "https://raw.githubusercontent.com/AlexandraMarinaBerlinschi/poze-is/main/image-editing.png";

  // Calculăm traseul pentru polyline (linia care conectează punctele pe hartă)
  const routePoints = itinerary.map(place => [place.lat, place.lon]);

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Itinerariul meu</h1>
        <div className="flex gap-2">
          <Link to="/recommendations" className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded transition">
            Înapoi la recomandări
          </Link>
          <button 
            onClick={() => setShowExportOptions(!showExportOptions)}
            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded transition relative"
          >
            Export itinerariu
          </button>
          
          {/* Opțiuni de export */}
          {showExportOptions && (
            <div className="absolute right-8 mt-12 bg-white rounded shadow-lg p-4 z-10 border border-gray-200">
              <h3 className="text-sm font-medium mb-2">Format export:</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input 
                    type="radio" 
                    id="pdf" 
                    name="format" 
                    value="pdf" 
                    checked={exportFormat === "pdf"}
                    onChange={() => setExportFormat("pdf")}
                    className="mr-2"
                  />
                  <label htmlFor="pdf">PDF</label>
                </div>
                <div className="flex items-center">
                  <input 
                    type="radio" 
                    id="csv" 
                    name="format" 
                    value="csv" 
                    checked={exportFormat === "csv"}
                    onChange={() => setExportFormat("csv")}
                    className="mr-2"
                  />
                  <label htmlFor="csv">CSV</label>
                </div>
                <div className="flex items-center">
                  <input 
                    type="radio" 
                    id="json" 
                    name="format" 
                    value="json" 
                    checked={exportFormat === "json"}
                    onChange={() => setExportFormat("json")}
                    className="mr-2"
                  />
                  <label htmlFor="json">JSON</label>
                </div>
                <button 
                  onClick={exportItinerary}
                  className="w-full py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded mt-2 text-sm"
                >
                  Descarcă
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sumar itinerariu */}
      <div className="mb-6 bg-blue-50 rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-blue-800">Sumar itinerariu</h2>
            <p className="text-sm text-blue-700">
              {itinerary.length} {itinerary.length === 1 ? "locație" : "locații"} • Durată totală estimată: {totalDuration}
            </p>
          </div>
          {itinerary.length > 0 && (
            <button 
              onClick={() => {
                if (window.confirm("Ești sigur că vrei să ștergi întregul itinerariu?")) {
                  setItinerary([]);
                }
              }}
              className="py-1 px-3 bg-red-500 hover:bg-red-600 text-white text-sm rounded"
            >
              Șterge tot
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Harta itinerariului */}
        <div className="w-full md:w-2/3 h-[450px] rounded overflow-hidden shadow-lg">
          <MapContainer center={mapCenter} zoom={13} className="h-full w-full">
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater center={mapCenter} />
            
            {/* Afișăm linia care conectează punctele de pe traseu */}
            {routePoints.length > 1 && (
              <Polyline 
                positions={routePoints} 
                color="blue" 
                weight={3} 
                opacity={0.7} 
                dashArray="8, 8"
              />
            )}
            
            {/* Afișăm markerii pentru fiecare locație din itinerariu */}
            {itinerary.map((place, index) => (
              <Marker 
                key={index} 
                position={[place.lat, place.lon]}
                eventHandlers={{
                  click: () => handleSelectPlace(place),
                }}
              >
                <Popup>
                  <div className="font-bold">{index + 1}. {place.name}</div>
                  {place.minimumDuration && <div>Durată: {place.minimumDuration}</div>}
                  {place.rating && <div>Rating: ⭐ {Number(place.rating).toFixed(1)}</div>}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Lista de locații din itinerariu */}
        <div className="w-full md:w-1/3">
          <h2 className="text-lg font-medium mb-4">Locații în itinerariu</h2>
          
          {itinerary.length === 0 ? (
            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <p className="text-gray-500">Itinerariul tău este gol. Adaugă locații din pagina de recomandări.</p>
              <Link to="/recommendations" className="mt-4 inline-block py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded transition">
                Vezi recomandări
              </Link>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="places">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3 max-h-[400px] overflow-y-auto pr-2"
                  >
                    {itinerary.map((place, index) => (
                      <Draggable key={place.name} draggableId={place.name} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="bg-white rounded-lg shadow p-3 relative border-l-4 border-blue-500"
                          >
                            {/* Indicator de ordine */}
                            <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {index + 1}
                            </div>
                            
                            <div className="flex justify-between items-start ml-4">
                              <div>
                                <h3 className="font-medium">{place.name}</h3>
                                {place.minimumDuration && (
                                  <span className="text-sm text-gray-600 block">
                                    Durată: {place.minimumDuration}
                                  </span>
                                )}
                                {place.rating && (
                                  <span className="text-sm text-gray-600 block">
                                    ⭐ {Number(place.rating).toFixed(1)}
                                  </span>
                                )}
                              </div>
                              <div className="flex">
                                {/* Mâner pentru drag */}
                                <div {...provided.dragHandleProps} className="cursor-move px-2 text-gray-400 hover:text-gray-600">
                                  ⋮
                                </div>
                                
                                {/* Buton de eliminare */}
                                <button
                                  onClick={() => removeFromItinerary(index)}
                                  className="text-red-500 hover:text-red-700 ml-1"
                                >
                                  ×
                                </button>
                                
                                {/* Buton de focus pe hartă */}
                                <button
                                  onClick={() => handleSelectPlace(place)}
                                  className="text-blue-500 hover:text-blue-700 ml-2"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
          
          {/* Sfaturi pentru utilizare */}
          {itinerary.length > 0 && (
            <div className="mt-4 bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800">
              <p className="font-medium">Sfaturi:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>Trage elementele pentru a reordona itinerariul</li>
                <li>Click pe butonul de ochi pentru a vedea locația pe hartă</li>
                <li>Exportă itinerariul pentru a-l salva sau imprima</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Panoul pentru detalii */}
      {selectedPlace && (
        <div className="mt-6 bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-start">
            <h2 className="text-xl font-bold text-blue-700">{selectedPlace.name}</h2>
            <button 
              onClick={() => setSelectedPlace(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              Închide
            </button>
          </div>
          
          <div className="flex mt-4 flex-col md:flex-row">
            {/* Imagine */}
            <div className="w-full md:w-1/3 mb-4 md:mb-0 md:mr-4">
              <img 
                src={selectedPlace.pictures && selectedPlace.pictures.length > 0 
                  ? (selectedPlace.pictures[0].url || selectedPlace.pictures[0]) 
                  : fallbackImage} 
                alt={selectedPlace.name} 
                className="w-full h-48 object-cover rounded"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = fallbackImage;
                }}
              />
            </div>
            
            {/* Detalii */}
            <div className="w-full md:w-2/3">
              <div className="mb-3 space-y-2">
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
              
              <p className="text-gray-600">
                {/* Aici am putea afișa o descriere a locului, dacă există */}
                Locație inclusă în itinerariul tău.
              </p>
              
              <div className="mt-4">
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedPlace.lat},${selectedPlace.lon}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded transition inline-flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                  </svg>
                  Deschide în Google Maps
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Itinerary;