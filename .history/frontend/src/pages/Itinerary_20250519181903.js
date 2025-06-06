import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import jsPDF from "jspdf";
import "jspdf-autotable";
import L from 'leaflet';

// Fix pentru iconițele Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Componentă pentru actualizarea centrului hărții
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center.length === 2) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
};

const Itinerary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  
  // State pentru itinerariu și oraș
  const [itinerary, setItinerary] = useState([]);
  const [title, setTitle] = useState("Itinerariul meu");
  const [mapCenter, setMapCenter] = useState([45.75, 21.23]); // Timișoara default
  const [mapZoom, setMapZoom] = useState(13);
  const [userId, setUserId] = useState(null);

  // Verifică autentificarea și încarcă itinerariul la montarea componentei
  useEffect(() => {
    const checkAuthAndLoadItinerary = async () => {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      
      if (token) {
        setIsAuthenticated(true);
        try {
          // Obține ID-ul utilizatorului
          const userResponse = await fetch("http://localhost:8000/users/me", {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setUserId(userData.id);
            
            // Încarcă itinerariile utilizatorului
            const itineraryResponse = await fetch(`http://localhost:8000/itineraries/user/${userData.id}`, {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            
            if (itineraryResponse.ok) {
              const itineraryData = await itineraryResponse.json();
              if (itineraryData && itineraryData.length > 0) {
                // Încarcă ultimul itinerariu
                const latestItinerary = itineraryData[0];
                setTitle(latestItinerary.name);
                
                // Încarcă activitățile itinerariului
                const activitiesResponse = await fetch(`http://localhost:8000/itineraries/${latestItinerary.id}/activities`, {
                  headers: {
                    Authorization: `Bearer ${token}`
                  }
                });
                
                if (activitiesResponse.ok) {
                  const activitiesData = await activitiesResponse.json();
                  const formattedActivities = activitiesData.map(activity => ({
                    id: activity.activity_id,
                    name: activity.name,
                    lat: activity.lat,
                    lon: activity.lon,
                    rating: activity.rating,
                    duration: activity.duration,
                    picture_url: activity.picture_url,
                    city: latestItinerary.city
                  }));
                  
                  setItinerary(formattedActivities);
                  
                  // Actualizează centrul hărții dacă există activități
                  if (formattedActivities.length > 0) {
                    setMapCenter([formattedActivities[0].lat, formattedActivities[0].lon]);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("Error loading user data:", error);
        }
      } else {
        // Verifică dacă există date în location.state (redirecționare din altă pagină)
        if (location.state?.itineraryItems?.length > 0) {
          const initialItinerary = location.state.itineraryItems;
          const initialCity = location.state.city || "";
          setItinerary(initialItinerary);
          
          // Centrează harta pe primul obiectiv
          if (initialItinerary.length > 0) {
            setMapCenter([initialItinerary[0].lat, initialItinerary[0].lon]);
          }
        } else {
          // Verifică dacă există date salvate din sesiunea anterioară
          const pendingItinerary = sessionStorage.getItem('pendingItinerary');
          if (pendingItinerary) {
            const parsedData = JSON.parse(pendingItinerary);
            setItinerary(parsedData.items || []);
            setTitle(parsedData.title || "Itinerariul meu");
            
            // Centrează harta pe primul obiectiv
            if (parsedData.items && parsedData.items.length > 0) {
              setMapCenter([parsedData.items[0].lat, parsedData.items[0].lon]);
            }
          }
        }
      }
      
      setIsLoading(false);
    };

    checkAuthAndLoadItinerary();
  }, [location.state]);

  const handleOnDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(itinerary);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setItinerary(items);
  };

  const removeFromItinerary = (index) => {
    const updated = [...itinerary];
    updated.splice(index, 1);
    setItinerary(updated);
  };

  const exportItinerary = (format) => {
    if (format === "json") {
      const dataStr =
        "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(itinerary));
      const downloadAnchorNode = document.createElement("a");
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "itinerary.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } else if (format === "csv") {
      const csvRows = [
        ["Name", "Latitude", "Longitude", "Duration", "Rating"],
        ...itinerary.map((item) => [
          item.name,
          item.lat,
          item.lon,
          item.duration,
          item.rating,
        ]),
      ];
      const csvContent =
        "data:text/csv;charset=utf-8," +
        csvRows.map((e) => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "itinerary.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } else if (format === "pdf") {
      const doc = new jsPDF();
      doc.autoTable({
        head: [["Name", "Latitude", "Longitude", "Duration", "Rating"]],
        body: itinerary.map((item) => [
          item.name,
          item.lat,
          item.lon,
          item.duration,
          item.rating,
        ]),
      });
      doc.save("itinerary.pdf");
    }
  };

  const saveItinerary = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setShowLoginDialog(true);
      return;
    }

    try {
      // Salvează itinerariul curent în sessionStorage pentru siguranță
      sessionStorage.setItem('pendingItinerary', JSON.stringify({
        items: itinerary,
        title: title
      }));

      // 1. Creează itinerariul
      const res = await fetch("http://localhost:8000/itineraries/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          city: itinerary.length > 0 ? itinerary[0].city || "Unknown" : "Unknown",
          name: title,
          activities: [],
        }),
      });

      if (!res.ok) throw new Error("Eroare la salvarea itinerariului");

      const data = await res.json();
      const itineraryId = data.id;

      // 2. Adaugă activitățile
      for (let i = 0; i < itinerary.length; i++) {
        const activity = itinerary[i];

        await fetch(`http://localhost:8000/itineraries/${itineraryId}/activities`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            activity_id: activity.id,
            name: activity.name,
            lat: activity.lat,
            lon: activity.lon,
            rating: activity.rating,
            duration: activity.minimumDuration || activity.duration,
            picture_url: activity.pictures?.[0]?.url || activity.picture_url || null,
            position: i,
          }),
        });
      }

      alert("Itinerariul a fost salvat cu succes!");
      // Ștergem datele din sessionStorage după salvare reușită
      sessionStorage.removeItem('pendingItinerary');
    } catch (error) {
      console.error(error);
      alert("A apărut o eroare la salvarea itinerariului.");
    }
  };

  const redirectToLogin = () => {
    // Store the current itinerary in sessionStorage before redirecting
    sessionStorage.setItem('pendingItinerary', JSON.stringify({
      items: itinerary,
      title: title
    }));
    navigate('/login');
  };

  const closeLoginDialog = () => {
    setShowLoginDialog(false);
  };

  if (isLoading) {
    return <div className="p-4 text-center">Se încarcă itinerariul...</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">My Itinerary</h2>

      {/* Login Dialog */}
      {showLoginDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Authentication Required</h3>
            <p className="mb-4">You must be logged in to save the itinerary.</p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={closeLoginDialog}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button 
                onClick={redirectToLogin}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Login Now
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <label className="block font-semibold mb-1">Titlu itinerariu:</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => exportItinerary("json")}
          className="py-2 px-4 bg-blue-500 text-white rounded"
        >
          Export JSON
        </button>
        <button
          onClick={() => exportItinerary("csv")}
          className="py-2 px-4 bg-green-500 text-white rounded"
        >
          Export CSV
        </button>
        <button
          onClick={() => exportItinerary("pdf")}
          className="py-2 px-4 bg-red-500 text-white rounded"
        >
          Export PDF
        </button>
        <button
          onClick={saveItinerary}
          className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
        >
          Save
        </button>
      </div>

      <div className="mb-6">
        {itinerary.length > 0 && Array.isArray(mapCenter) && mapCenter.length === 2 && mapCenter.every(coord => typeof coord === 'number') ? (
          <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: "400px" }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapUpdater center={mapCenter} zoom={mapZoom} />
            {itinerary.map((item, index) => (
              <Marker key={index} position={[item.lat, item.lon]}>
                <Popup>{item.name}</Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div className="border border-gray-300 rounded p-8 text-center text-gray-500 bg-gray-50" style={{ height: "400px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p>{itinerary.length === 0 ? "Add places to your itinerary to see them on the map" : "Invalid map coordinates."}</p>
          </div>
        )}
      </div>

      {itinerary.length > 0 ? (
        <DragDropContext onDragEnd={handleOnDragEnd}>
          <Droppable droppableId="itinerary">
            {(provided) => (
              <ul
                className="space-y-2"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {itinerary.map((item, index) => (
                  <Draggable key={index} draggableId={index.toString()} index={index}>
                    {(provided) => (
                      <li
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="bg-white rounded shadow p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          <span className="font-semibold mr-2">{index + 1}.</span>
                          <span>{item.name}</span>
                        </div>
                        <button
                          onClick={() => removeFromItinerary(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded">
          <p>Itinerariul tău este gol. Adaugă locuri de interes din pagina de căutare.</p>
        </div>
      )}
    </div>
  );
};

export default Itinerary;