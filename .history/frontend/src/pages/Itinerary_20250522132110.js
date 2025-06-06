import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import jsPDF from "jspdf";
import "jspdf-autotable";
import L from 'leaflet';


// Improved validation functions
const isValidCoordinate = (val) => typeof val === 'number' && isFinite(val) && !isNaN(val);
const toNumber = (val) => {
  if (val === null || val === undefined) return null;
  const parsed = Number(val);
  return isFinite(parsed) && !isNaN(parsed) ? parsed : null;
};

// Fix for Leaflet icons
try {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
} catch (e) {
  console.error("Error initializing Leaflet icons:", e);
}

// Component for updating map center
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && 
        Array.isArray(center) && 
        center.length === 2 && 
        isValidCoordinate(center[0]) && 
        isValidCoordinate(center[1])) {
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
  
  // Default center coordinates (Timișoara)
  const defaultLat = 45.75;
  const defaultLon = 21.23;
  
  // State for itinerary and city
  const [itinerary, setItinerary] = useState([]);
  const [title, setTitle] = useState("My Itinerary");
  const [mapCenter, setMapCenter] = useState([defaultLat, defaultLon]);
  const [mapZoom, setMapZoom] = useState(13);
  const [userId, setUserId] = useState(null);
  const [hasValidMapData, setHasValidMapData] = useState(false);

  // Check authentication and load itinerary on component mount
  useEffect(() => {
    const checkAuthAndLoadItinerary = async () => {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      
      if (token) {
        setIsAuthenticated(true);
        try {
          // Get user ID
          const userResponse = await fetch("http://localhost:8000/users/me", {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setUserId(userData.id);
            
            // Load user itineraries
            const itineraryResponse = await fetch(`http://localhost:8000/itineraries/user/${userData.id}`, {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            
            if (itineraryResponse.ok) {
              const itineraryData = await itineraryResponse.json();
              if (itineraryData && itineraryData.length > 0) {
                // Load the latest itinerary
                const latestItinerary = itineraryData[0];
                setTitle(latestItinerary.name || "My Itinerary");
                
                // Load itinerary activities
                const activitiesResponse = await fetch(`http://localhost:8000/itineraries/${latestItinerary.id}/activities`, {
                  headers: {
                    Authorization: `Bearer ${token}`
                  }
                });
                
                if (activitiesResponse.ok) {
                  const activitiesData = await activitiesResponse.json();
                  const formattedActivities = activitiesData.map(activity => {
                    // Safely convert coordinates
                    const activityLat = toNumber(activity.lat);
                    const activityLon = toNumber(activity.lon);
                    
                    return {
                      id: activity.activity_id,
                      name: activity.name || "Unnamed Place",
                      lat: activityLat,
                      lon: activityLon,
                      rating: activity.rating,
                      duration: activity.duration,
                      picture_url: activity.picture_url,
                      city: latestItinerary.city
                    };
                  }).filter(activity => 
                    // Filter out activities with invalid coordinates
                    isValidCoordinate(activity.lat) && 
                    isValidCoordinate(activity.lon)
                  );
                  
                  setItinerary(formattedActivities);
                  
                  // Update map center if there are activities with valid coordinates
                  if (formattedActivities.length > 0) {
                    const firstValidActivity = formattedActivities.find(activity => 
                      isValidCoordinate(activity.lat) && 
                      isValidCoordinate(activity.lon)
                    );
                    
                    if (firstValidActivity) {
                      setMapCenter([firstValidActivity.lat, firstValidActivity.lon]);
                      setHasValidMapData(true);
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("Error loading user data:", error);
        }
      } else {
        // Check if there's data in location.state (redirect from another page)
        if (location.state?.itineraryItems?.length > 0) {
          const initialItinerary = location.state.itineraryItems.map(item => {
            // Safely convert coordinates
            const itemLat = toNumber(item.lat);
            const itemLon = toNumber(item.lon);
            
            return {
              ...item,
              lat: itemLat,
              lon: itemLon
            };
          }).filter(item => 
            // Filter out items with invalid coordinates
            isValidCoordinate(item.lat) && 
            isValidCoordinate(item.lon)
          );
          
          const initialCity = location.state.city || "";
          setItinerary(initialItinerary);
          
          // Center map on first objective if available
          if (initialItinerary.length > 0) {
            setMapCenter([initialItinerary[0].lat, initialItinerary[0].lon]);
            setHasValidMapData(true);
          }
        } else {
          // Check if there's data saved from previous session
          const pendingItinerary = sessionStorage.getItem('pendingItinerary');
          if (pendingItinerary) {
            try {
              const parsedData = JSON.parse(pendingItinerary);
              
              if (parsedData.items && Array.isArray(parsedData.items)) {
              const validItems = parsedData.items.map(item => {
                const itemLat = toNumber(item.lat);
                const itemLon = toNumber(item.lon);

                return {
                  ...item,
                  lat: itemLat,
                  lon: itemLon,
                  duration: item.minimumDuration || item.duration || null,
                  rating: item.rating || null,
                  picture_url: item.pictures?.[0]?.url || item.picture_url || null,
                  city: item.city || ""
                };
              }).filter(item =>
                isValidCoordinate(item.lat) &&
                isValidCoordinate(item.lon)
              );
              
                setItinerary(validItems);
                setTitle(parsedData.title || "My Itinerary");
                
                // Center map on first objective if available
                if (validItems.length > 0) {
                  setMapCenter([validItems[0].lat, validItems[0].lon]);
                  setHasValidMapData(true);
                }
              }
            } catch (error) {
              console.error("Error parsing pending itinerary:", error);
            }
          }
        }
      }
      
      setIsLoading(false);
    };

    checkAuthAndLoadItinerary();
  }, [location.state]);

  // Verify map center coordinates validity
  useEffect(() => {
    if (Array.isArray(mapCenter) && 
        mapCenter.length === 2 && 
        isValidCoordinate(mapCenter[0]) && 
        isValidCoordinate(mapCenter[1])) {
      setHasValidMapData(true);
    } else {
      setHasValidMapData(false);
    }
  }, [mapCenter]);

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
          item.name || "Unnamed Place",
          item.lat,
          item.lon,
          item.duration || "",
          item.rating || "",
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
          item.name || "Unnamed Place",
          item.lat,
          item.lon,
          item.duration || "",
          item.rating || "",
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
      // Save current itinerary to sessionStorage for safety
      sessionStorage.setItem('pendingItinerary', JSON.stringify({
        items: itinerary,
        title: title
      }));

      // 1. Create itinerary
      const res = await fetch("http://localhost:8000/itineraries/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          city: itinerary.length > 0 ? itinerary[0].city || "Unknown" : "Unknown",
          name: title || "My Itinerary",
          activities: [],
        }),
      });

      if (!res.ok) throw new Error("Error saving itinerary");

      const data = await res.json();
      const itineraryId = data.id;

      // 2. Add activities
      for (let i = 0; i < itinerary.length; i++) {
        const activity = itinerary[i];
        
        if (!activity) continue;

        await fetch(`http://localhost:8000/itineraries/${itineraryId}/activities`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            activity_id: activity.id || `generated-${i}`,
            name: activity.name || "Unnamed Place",
            lat: activity.lat,
            lon: activity.lon,
            rating: activity.rating || null,
            duration: activity.minimumDuration || activity.duration || null,
            picture_url: activity.pictures?.[0]?.url || activity.picture_url || null,
            position: i,
          }),
        });
      }

      alert("Your itinerary has been saved successfully!");
      // Clear sessionStorage data after successful save
      sessionStorage.removeItem('pendingItinerary');
    } catch (error) {
      console.error(error);
      alert("An error occurred while saving your itinerary.");
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
    return <div className="p-4 text-center">Loading itinerary...</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">My Itinerary</h2>

      <button
        onClick={() => navigate("/recommendations")}
        className="mb-4 py-2 px-4 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded"
      >
        ← Înapoi la recomandări
      </button>

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
        <label className="block font-semibold mb-1">Itinerary title:</label>
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
          disabled={itinerary.length === 0}
        >
          Export JSON
        </button>
        <button
          onClick={() => exportItinerary("csv")}
          className="py-2 px-4 bg-green-500 text-white rounded"
          disabled={itinerary.length === 0}
        >
          Export CSV
        </button>
        <button
          onClick={() => exportItinerary("pdf")}
          className="py-2 px-4 bg-red-500 text-white rounded"
          disabled={itinerary.length === 0}
        >
          Export PDF
        </button>
        <button
          onClick={saveItinerary}
          className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
          disabled={itinerary.length === 0}
        >
          Save
        </button>
      </div>

      <div className="mb-6">
        {hasValidMapData && itinerary.length > 0 ? (
          <MapContainer 
            center={mapCenter} 
            zoom={mapZoom} 
            style={{ height: "400px" }}
            key={`map-${mapCenter[0]}-${mapCenter[1]}`}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapUpdater center={mapCenter} zoom={mapZoom} />
            {itinerary.map((item, index) => {
              if (!item || !isValidCoordinate(item.lat) || !isValidCoordinate(item.lon)) {
                return null;
              }
              
              return (
                <Marker key={index} position={[item.lat, item.lon]}>
                  <Popup>{item.name || "Unnamed Place"}</Popup>
                    </Marker>
                    );
                    })}
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
                                <span>{item.name || "Unnamed Place"}</span>
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
                    <p>Your itinerary is empty. Add points of interest from the recommendations page.</p>
                    </div>
                    )}
                    </div>
                    );
                    };

                    export default Itinerary;
