import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import jsPDF from "jspdf";
import "jspdf-autotable";

// Improved validation functions
const isValidCoordinate = (val) => typeof val === 'number' && isFinite(val) && !isNaN(val);
const toNumber = (val) => {
  if (val === null || val === undefined) return null;
  const parsed = Number(val);
  return isFinite(parsed) && !isNaN(parsed) ? parsed : null;
};

const Itinerary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  
  // State for itinerary and city
  const [itinerary, setItinerary] = useState([]);
  const [title, setTitle] = useState("My Itinerary");
  const [userId, setUserId] = useState(null);
  const storageKey = userId ? `pendingItinerary-${userId}` : "pendingItinerary-guest";

  // Separated auth check function
  const checkAuthentication = async () => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      console.log("❌ No token found, user not authenticated");
      setIsAuthenticated(false);
      setUserId(null);
      setAuthCheckComplete(true);
      return false;
    }

    try {
      const userResponse = await fetch("http://localhost:8000/users/me", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserId(userData.id);
        setIsAuthenticated(true);
        setAuthCheckComplete(true);
        console.log("✅ User authenticated:", userData.id);
        return true;
      } else {
        console.log("❌ Token invalid, user not authenticated");
        setIsAuthenticated(false);
        setUserId(null);
        localStorage.removeItem("token");
        setAuthCheckComplete(true);
        return false;
      }
    } catch (error) {
      console.error("Error checking authentication:", error);
      setIsAuthenticated(false);
      setUserId(null);
      localStorage.removeItem("token");
      setAuthCheckComplete(true);
      return false;
    }
  };

  // Auto-save function (runs in background for authenticated users)
  const autoSaveItinerary = async () => {
    if (!isAuthenticated || !userId || itinerary.length === 0) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      console.log("💾 Auto-saving itinerary...");
      
      // Generate unique name with timestamp to avoid duplicates
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const uniqueName = `${title || "My Itinerary"} - ${timestamp}`;

      // 1. Create itinerary
      const res = await fetch("http://localhost:8000/itineraries/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          city: itinerary.length > 0 ? itinerary[0].city || "Unknown" : "Unknown",
          name: uniqueName,
          activities: [],
        }),
      });

      if (!res.ok) {
        console.error("❌ Auto-save failed:", res.status);
        return;
      }

      const data = await res.json();
      const itineraryId = data.id;
      setCurrentItineraryId(itineraryId);
      console.log("✅ Itinerary auto-created with ID:", itineraryId);

      // 2. Add activities
      for (let i = 0; i < itinerary.length; i++) {
        const activity = itinerary[i];
        
        if (!activity) continue;

        const activityResponse = await fetch(`http://localhost:8000/itineraries/${itineraryId}/activities`, {
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
            duration: activity.duration || null,
            picture_url: activity.picture_url || null,
            position: i,
          }),
        });
        
        if (!activityResponse.ok) {
          console.error(`❌ Failed to auto-save activity ${activity.name}`);
        }
      }

      console.log("✅ Itinerary auto-saved successfully!");
      
    } catch (error) {
      console.error("❌ Error auto-saving itinerary:", error);
    }
  };

  // Check authentication and load itinerary on component mount
  useEffect(() => {
    const checkAuthAndLoadItinerary = async () => {
      setIsLoading(true);
      
      console.log("🔍 Loading itinerary data...");
      console.log("Location state:", location.state);
      
      // First, check authentication
      const isAuth = await checkAuthentication();
      
      // Load saved itinerary if authenticated
      if (isAuth && userId) {
        try {
          const token = localStorage.getItem("token");
          
          // Load user itineraries
          const itineraryResponse = await fetch(`http://localhost:8000/itineraries/`, {
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
              setCurrentItineraryId(latestItinerary.id);
              
              // Load itinerary activities
              const activitiesResponse = await fetch(`http://localhost:8000/itineraries/${latestItinerary.id}/activities`, {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              });
              
              if (activitiesResponse.ok) {
                const activitiesData = await activitiesResponse.json();
                const formattedActivities = activitiesData.map(activity => {
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
                  isValidCoordinate(activity.lat) && 
                  isValidCoordinate(activity.lon)
                );
                
                console.log("✅ Loaded saved activities:", formattedActivities);
                setItinerary(formattedActivities);
              }
            }
          }
        } catch (error) {
          console.error("Error loading saved itinerary:", error);
        }
      }

      useEffect(() => {
      if (authCheckComplete && userId) {
        sessionStorage.removeItem("pendingItinerary-guest");
      }
      }, [authCheckComplete, userId]);
      
      // Check for data from navigation state (from Recommendations page)
      if (location.state?.itineraryItems && location.state.itineraryItems.length > 0) {
        console.log("📍 Found itinerary items from navigation:", location.state.itineraryItems);
        
        // Get existing items from sessionStorage
        let existingItems = [];
        const existingItinerary = sessionStorage.getItem('storageKey');
        if (existingItinerary) {
          try {
            const parsedData = JSON.parse(existingItinerary);
            if (parsedData.items && Array.isArray(parsedData.items)) {
              existingItems = parsedData.items;
            }
          } catch (error) {
            console.error("Error parsing existing itinerary:", error);
          }
        }
        
        // Merge existing items with new ones, avoiding duplicates
        const newItems = location.state.itineraryItems;
        const mergedItems = [...existingItems];
        
        newItems.forEach(newItem => {
          const itemLat = toNumber(newItem.lat);
          const itemLon = toNumber(newItem.lon);
          
          // Check if item already exists (by name)
          if (!mergedItems.some(existing => existing.name === newItem.name)) {
            mergedItems.push({
              id: newItem.id || `temp-${Date.now()}-${Math.random()}`,
              name: newItem.name || "Unnamed Place",
              lat: itemLat,
              lon: itemLon,
              rating: newItem.rating,
              duration: newItem.minimumDuration || newItem.duration,
              picture_url: newItem.pictures?.[0]?.url || newItem.picture_url,
              city: location.state.city || newItem.city || ""
            });
          }
        });
        
        // Filter valid coordinates
        const validMergedItems = mergedItems.filter(item => 
          isValidCoordinate(item.lat) && 
          isValidCoordinate(item.lon)
        );
        
        console.log("✅ Merged itinerary (existing + new):", validMergedItems);
        setItinerary(validMergedItems);
        
        // Update sessionStorage with merged data
        sessionStorage.setItem('storageKey', JSON.stringify({
          items: validMergedItems,
          title: title
        }));
      } else {
        // Check sessionStorage as fallback
        const pendingItinerary = sessionStorage.getItem('storageKey');
        if (pendingItinerary) {
          try {
            const parsedData = JSON.parse(pendingItinerary);
            console.log("📱 Found pending itinerary in sessionStorage:", parsedData);
            
            if (parsedData.items && Array.isArray(parsedData.items)) {
              const validItems = parsedData.items.map(item => {
                const itemLat = toNumber(item.lat);
                const itemLon = toNumber(item.lon);

                return {
                  id: item.id || `temp-${Date.now()}-${Math.random()}`,
                  name: item.name || "Unnamed Place",
                  lat: itemLat,
                  lon: itemLon,
                  rating: item.rating,
                  duration: item.minimumDuration || item.duration,
                  picture_url: item.pictures?.[0]?.url || item.picture_url,
                  city: item.city || ""
                };
              }).filter(item =>
                isValidCoordinate(item.lat) &&
                isValidCoordinate(item.lon)
              );
              
              console.log("✅ Processed sessionStorage itinerary:", validItems);
              setItinerary(validItems);
              setTitle(parsedData.title || "My Itinerary");
            }
          } catch (error) {
            console.error("Error parsing pending itinerary:", error);
          }
        }
      }
      
      setIsLoading(false);
    };

    checkAuthAndLoadItinerary();
  }, [location.state]);

  // Auto-save when itinerary changes (for authenticated users)
  useEffect(() => {
    if (authCheckComplete && isAuthenticated && itinerary.length > 0) {
      // Debounce auto-save to avoid too many requests
      const timer = setTimeout(() => {
        autoSaveItinerary();
      }, 2000); // Wait 2 seconds after last change

      return () => clearTimeout(timer);
    }
  }, [itinerary, title, isAuthenticated, authCheckComplete]);

  // Re-run auth check when userId changes
  useEffect(() => {
    if (authCheckComplete && userId) {
      checkAuthentication();
    }
  }, [userId, authCheckComplete]);

  // Debug effect to monitor itinerary changes
  useEffect(() => {
    console.log("🔄 Itinerary state updated:", itinerary);
  }, [itinerary]);

  const handleOnDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(itinerary);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setItinerary(items);
    
    // Update sessionStorage with reordered items
    sessionStorage.setItem('storageKey', JSON.stringify({
      items: items,
      title: title
    }));
  };

  const removeFromItinerary = (index) => {
    const updated = [...itinerary];
    updated.splice(index, 1);
    setItinerary(updated);
    
    // Update sessionStorage
    sessionStorage.setItem('pendingItinerary', JSON.stringify({
      items: updated,
      title: title
    }));
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

  if (isLoading) {
    return <div className="p-4 text-center">Loading itinerary...</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">My Itinerary</h2>
      
      {/* Status info */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-blue-600 font-medium">Status:</span>
          {isAuthenticated ? (
            <span className="text-green-600 font-medium">✅ Auto-saving enabled</span>
          ) : (
            <span className="text-gray-600">📝 Changes saved locally only</span>
          )}
        </div>
        <p className="text-sm text-blue-700">
          {isAuthenticated 
            ? "Your changes are automatically saved to your account." 
            : "Login to enable automatic saving across devices."
          }
        </p>
      </div>

      <button
        onClick={() => navigate("/recommendations")}
        className="mb-4 py-2 px-4 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded"
      >
        ← Înapoi la recomandări
      </button>

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
        {!isAuthenticated && (
          <button
            onClick={() => navigate('/login')}
            className="py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded"
          >
            🔐 Login for Auto-Save
          </button>
        )}
      </div>

      {/* Itinerary Cards Section */}
      {itinerary.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4">Your Selected Places</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {itinerary.map((item, index) => (
              <div key={`${item.id}-${index}`} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Image */}
                {item.picture_url && (
                  <div className="h-48 w-full">
                    <img
                      src={item.picture_url}
                      alt={item.name || "Place image"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://raw.githubusercontent.com/AlexandraMarinaBerlinschi/poze-is/main/image-editing.png";
                      }}
                    />
                  </div>
                )}
                
                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {item.name || "Unnamed Place"}
                    </h4>
                    <span className="text-sm font-medium text-gray-500 ml-2">
                      #{index + 1}
                    </span>
                  </div>
                  
                  {/* Rating */}
                  {item.rating && (
                    <div className="flex items-center mb-2">
                      <div className="flex items-center">
                        <span className="text-yellow-400">⭐</span>
                        <span className="ml-1 text-sm font-medium text-gray-700">
                          {Number(item.rating).toFixed(1)}/5
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Duration */}
                  {item.duration && (
                    <div className="flex items-center mb-2">
                      <span className="text-gray-400">⏱️</span>
                      <span className="ml-1 text-sm text-gray-600">
                        {item.duration}
                      </span>
                    </div>
                  )}
                  
                  {/* Description if available */}
                  {item.description && (
                    <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                      {item.description}
                    </p>
                  )}
                  
                  {/* City */}
                  {item.city && (
                    <div className="flex items-center mb-3">
                      <span className="text-gray-400">📍</span>
                      <span className="ml-1 text-sm text-gray-600">
                        {item.city}
                      </span>
                    </div>
                  )}
                  
                  {/* Remove button */}
                  <button
                    onClick={() => removeFromItinerary(index)}
                    className="w-full mt-2 px-3 py-2 text-sm bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
                  >
                    Remove from Itinerary
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  <Draggable key={`${item.id}-${index}`} draggableId={`${item.id}-${index}`} index={index}>
                    {(provided) => (
                      <li
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="bg-white rounded shadow p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          <span className="font-semibold mr-2">{index + 1}.</span>
                          <div>
                            <span className="font-medium">{item.name || "Unnamed Place"}</span>
                            {item.duration && <div className="text-sm text-gray-600">⏱️ {item.duration}</div>}
                            {item.rating && <div className="text-sm text-gray-600">⭐ {item.rating}/5</div>}
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromItinerary(index)}
                          className="text-red-600 hover:text-red-800 px-2 py-1 rounded"
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