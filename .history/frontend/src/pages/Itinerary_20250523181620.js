import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import jsPDF from "jspdf";
import "jspdf-autotable";
import UserStorage from './userStorage';

// Improved validation functions
const isValidCoordinate = (val) => typeof val === 'number' && isFinite(val) && !isNaN(val);
const toNumber = (val) => {
  if (val === null || val === undefined) return null;
  const parsed = Number(val);
  return isFinite(parsed) && !isNaN(parsed) ? parsed : null;
};

// Function to generate consistent prices based on place name (0-50 EUR)
const generateConsistentPrice = (placeName) => {
  let hash = 0;
  for (let i = 0; i < placeName.length; i++) {
    const char = placeName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const price = Math.abs(hash % 51);
  return price;
};

const Itinerary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [currentItineraryId, setCurrentItineraryId] = useState(null);
  const [showReorderMode, setShowReorderMode] = useState(false);

  // State for itinerary and city
  const [itinerary, setItinerary] = useState([]);
  const [title, setTitle] = useState("My Itinerary");

  // Helper function to reset itinerary state
  const resetItineraryState = () => {
    setItinerary([]);
    setTitle("My Itinerary");
    setCurrentItineraryId(null);
  };

  // Check authentication function
  const checkAuthentication = async () => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      console.log("❌ No token found, user not authenticated");
      
      if (isAuthenticated || userId) {
        console.log("🔄 Switching from authenticated to guest mode");
        setIsAuthenticated(false);
        setUserId(null);
        resetItineraryState();
      }
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
        
        if (userId && userId !== userData.id) {
          console.log("🔄 Different user detected, clearing previous data");
          resetItineraryState();
        }
        
        // Update user in localStorage for UserStorage
        localStorage.setItem('currentUser', JSON.stringify({
          id: userData.id,
          email: userData.email || userData.username
        }));
        
        setUserId(userData.id);
        setIsAuthenticated(true);
        console.log("✅ User authenticated:", userData.id);
        return userData.id;
      } else {
        console.log("❌ Token invalid, user not authenticated");
        
        if (isAuthenticated || userId) {
          console.log("🔄 Invalid token, switching to guest mode");
          resetItineraryState();
        }
        
        setIsAuthenticated(false);
        setUserId(null);
        localStorage.removeItem("token");
        localStorage.removeItem('currentUser');
        return false;
      }
    } catch (error) {
      console.error("Error checking authentication:", error);
      
      if (isAuthenticated || userId) {
        console.log("🔄 Authentication error, switching to guest mode");
        resetItineraryState();
      }
      
      setIsAuthenticated(false);
      setUserId(null);
      localStorage.removeItem("token");
      localStorage.removeItem('currentUser');
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
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const uniqueName = `${title || "My Itinerary"} - ${timestamp}`;

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
// Load itinerary data function
const loadItineraryData = async (authenticatedUserId = null) => {
  console.log("🔍 Loading itinerary data...");
  console.log("Authenticated User ID:", authenticatedUserId);
  console.log("Location state:", location.state);
  
  // 1. Verifică dacă avem date noi din navigare
  if (location.state?.itineraryItems && location.state.itineraryItems.length > 0) {
    console.log("📍 Found itinerary items from navigation:", location.state.itineraryItems);
    
    // Încarcă itinerariul existent din UserStorage
    let existingItinerary = UserStorage.getUserData('pendingItinerary', { items: [], title: "My Itinerary" });
    let existingItems = existingItinerary.items || [];
    
    console.log("📱 Existing itinerary from UserStorage:", existingItems);
    
    const newItems = location.state.itineraryItems;
    const mergedItems = [...existingItems];
    
    // Adaugă doar items-urile noi (evită duplicatele)
    newItems.forEach(newItem => {
      const itemLat = toNumber(newItem.lat);
      const itemLon = toNumber(newItem.lon);
      
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
    
    const validMergedItems = mergedItems.filter(item => 
      isValidCoordinate(item.lat) && 
      isValidCoordinate(item.lon)
    );
    
    console.log("✅ Merged itinerary (existing + new):", validMergedItems);
    setItinerary(validMergedItems);
    setTitle(existingItinerary.title || "My Itinerary");
    
    // Salvează în UserStorage
    UserStorage.setUserData('pendingItinerary', {
      items: validMergedItems,
      title: existingItinerary.title || "My Itinerary"
    });
    
    return;
  }

  // 2. Dacă utilizatorul este autentificat, încearcă să încarce din server
  if (authenticatedUserId) {
    try {
      const token = localStorage.getItem("token");
      
      const itineraryResponse = await fetch(`http://localhost:8000/itineraries/`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (itineraryResponse.ok) {
        const itineraryData = await itineraryResponse.json();
        console.log("📡 Server response:", itineraryData);
        
        if (itineraryData && itineraryData.length > 0) {
          const latestItinerary = itineraryData[0];
          console.log("📡 Latest itinerary from server:", latestItinerary);
          
          const activitiesResponse = await fetch(`http://localhost:8000/itineraries/${latestItinerary.id}/activities`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (activitiesResponse.ok) {
            const activitiesData = await activitiesResponse.json();
            console.log("📡 Activities from server:", activitiesData);
            
            if (activitiesData && activitiesData.length > 0) {
              setTitle(latestItinerary.name || "My Itinerary");
              setCurrentItineraryId(latestItinerary.id);
              
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
              
              console.log("✅ Loaded saved activities from server:", formattedActivities);
              setItinerary(formattedActivities);
              
              // Salvează și în UserStorage pentru sincronizare
              UserStorage.setUserData('pendingItinerary', {
                items: formattedActivities,
                title: latestItinerary.name || "My Itinerary"
              });
              
              return;
            } else {
              console.log("📡 No activities found on server, checking UserStorage...");
            }
          } else {
            console.log("📡 Failed to fetch activities, checking UserStorage...");
          }
        } else {
          console.log("📡 No itineraries found on server, checking UserStorage...");
        }
      } else {
        console.log("📡 Failed to fetch itineraries, checking UserStorage...");
      }
    } catch (error) {
      console.error("Error loading saved itinerary:", error);
      console.log("📡 Server error, falling back to UserStorage...");
    }
  }

  // 3. Încarcă din UserStorage ca fallback (pentru utilizatori autentificați fără date pe server sau utilizatori anonimi)
  const storedItinerary = UserStorage.getUserData('pendingItinerary', { items: [], title: "My Itinerary" });
  
  if (storedItinerary && storedItinerary.items && storedItinerary.items.length > 0) {
    console.log("📱 Found itinerary in UserStorage:", storedItinerary);
    
    const validItems = storedItinerary.items.map(item => {
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
    
    console.log("✅ Processed UserStorage itinerary:", validItems);
    setItinerary(validItems);
    setTitle(storedItinerary.title || "My Itinerary");
  } else {
    console.log("🔄 No itinerary data found anywhere, starting fresh");
    resetItineraryState();
  }
};

  // Main initialization effect
  useEffect(() => {
    const initializeComponent = async () => {
      setIsLoading(true);
      
      // Dacă vine din guest mode la login, migrează datele
      const previousUserId = UserStorage.getCurrentUserId();
      const authenticatedUserId = await checkAuthentication();
      
      if (authenticatedUserId && previousUserId === 'anonymous') {
        console.log("🔄 Migrating data from anonymous to authenticated user");
        UserStorage.migrateAnonymousDataToUser(authenticatedUserId);
      }
      
      await loadItineraryData(authenticatedUserId);
      
      setIsLoading(false);
    };

    initializeComponent();
  }, [location.state]);

  // Auto-save when itinerary changes (for authenticated users)
  useEffect(() => {
    if (isAuthenticated && userId && itinerary.length > 0) {
      const timer = setTimeout(() => {
        autoSaveItinerary();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [itinerary, title, isAuthenticated, userId]);

  // Save to UserStorage whenever itinerary or title changes
  useEffect(() => {
    if (itinerary.length > 0 || title !== "My Itinerary") {
      UserStorage.setUserData('pendingItinerary', {
        items: itinerary,
        title: title
      });
      console.log("💾 Saved to UserStorage:", { items: itinerary.length, title });
    }
  }, [itinerary, title]);

  // Debug effect to monitor itinerary changes
  useEffect(() => {
    console.log("🔄 Itinerary state updated:", itinerary);
    console.log("🔄 Current user ID:", userId);
    console.log("🔄 Is authenticated:", isAuthenticated);
    console.log("🔄 UserStorage current user:", UserStorage.getCurrentUserId());
  }, [itinerary, userId, isAuthenticated]);

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

  // Update title handler
  const handleTitleChange = (newTitle) => {
    setTitle(newTitle);
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

  // Calculate stats
  const totalCost = itinerary.reduce((sum, item) => sum + generateConsistentPrice(item.name), 0);
  const averageRating = itinerary.length > 0 
    ? (itinerary.reduce((sum, item) => sum + (item.rating || 0), 0) / itinerary.length).toFixed(1)
    : 0;
  const totalDuration = itinerary.reduce((sum, item) => {
    if (item.duration) {
      const hours = parseFloat(item.duration.replace(/[^\d.]/g, ''));
      return sum + (isNaN(hours) ? 0 : hours);
    }
    return sum;
  }, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your itinerary...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 rounded-xl">
                <span className="text-xl">🧭</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AdventureBooking
                </h1>
                <p className="text-sm text-gray-600">Plan your perfect trip</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate("/recommendations")}
          className="mb-6 flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-700"
        >
          <span>←</span>
          <span>Back to recommendations</span>
        </button>

        {/* Title Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Your <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Travel Itinerary</span>
              </h1>
              <p className="text-xl text-gray-600">
                {itinerary.length} places selected for your adventure
              </p>
            </div>
            
            {/* Status Badge */}
            <div className="bg-white rounded-2xl shadow-lg p-4 border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-600 font-medium">Status:</span>
                {isAuthenticated ? (
                  <span className="flex items-center text-green-600 font-medium">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Auto-saving enabled
                  </span>
                ) : (
                  <span className="flex items-center text-gray-600">
                    <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                    Guest mode
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {isAuthenticated 
                  ? "Changes saved automatically" 
                  : "Login to sync across devices"
                }
              </p>
            </div>
          </div>

          {/* Title Input */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <label className="block text-lg font-semibold text-gray-900 mb-3">
              ✏️ Itinerary Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full p-4 text-xl border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors"
              placeholder="Enter your itinerary title..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            {itinerary.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold">{itinerary.length}</div>
                  <div className="text-blue-100">Places to visit</div>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold">{totalCost} EUR</div>
                  <div className="text-green-100">Estimated cost</div>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold">⭐ {averageRating}</div>
                  <div className="text-purple-100">Average rating</div>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => setShowReorderMode(!showReorderMode)}
                    className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                      showReorderMode 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    }`}
                    disabled={itinerary.length === 0}
                  >
                    🔄 {showReorderMode ? 'Exit Reorder' : 'Reorder Places'}
                  </button>
                  
                  <button
                    onClick={() => exportItinerary("pdf")}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors font-medium"
                    disabled={itinerary.length === 0}
                  >
                    📄 Export PDF
                  </button>
                  
                  <button
                    onClick={() => exportItinerary("csv")}
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors font-medium"
                    disabled={itinerary.length === 0}
                  >
                    📊 Export CSV
                  </button>
                </div>

                {!isAuthenticated && (
                  <button
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 font-medium"
                  >
                    🔐 Login for Auto-Save
                  </button>
                )}
              </div>
            </div>

            {/* Itinerary Content */}
            {itinerary.length > 0 ? (
              <div className="space-y-6">
                {/* Places Grid */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      <span className="mr-2">🎯</span>
                      Your Selected Places
                    </h3>
                    <p className="text-gray-600 mt-1">Click and drag to reorder when in reorder mode</p>
                  </div>
                  
                  <div className="p-6">
                    {showReorderMode ? (
                      // Drag and Drop Mode
                      <DragDropContext onDragEnd={handleOnDragEnd}>
                        <Droppable droppableId="itinerary">
                          {(provided) => (
                            <div
                              className="space-y-4"
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                            >
                              {itinerary.map((item, index) => (
                                <Draggable key={`${item.id}-${index}`} draggableId={`${item.id}-${index}`} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`bg-gray-50 rounded-xl p-4 border-2 border-dashed border-gray-300 transition-all ${
                                        snapshot.isDragging ? 'shadow-lg scale-105 border-blue-400' : 'hover:border-gray-400'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                            {index + 1}
                                          </div>
                                          <div>
                                            <h4 className="font-semibold text-gray-900">{item.name}</h4>
                                            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                                              {item.rating && (
                                                <span className="flex items-center">
                                                  <span className="text-yellow-500 mr-1">⭐</span>
                                                  {Number(item.rating).toFixed(1)}
                                                </span>
                                              )}
                                              {item.duration && (
                                                <span className="flex items-center">
                                                  <span className="mr-1">⏱️</span>
                                                  {item.duration}
                                                </span>
                                              )}
                                              <span className="text-green-600 font-medium">
                                                {generateConsistentPrice(item.name)} EUR
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <span className="text-gray-400">⋮⋮</span>
                                          <button
                                            onClick={() => removeFromItinerary(index)}
                                            className="text-red-600 hover:text-red-800 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                                          >
                                            🗑️
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
) : (
                      // Card View Mode
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
                        {itinerary.map((item, index) => (
                          <div key={`${item.id}-${index}`} className="bg-gray-50 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                            <div className="flex">
                              {/* Image */}
                              <div className="w-32 h-32 flex-shrink-0">
                                {item.picture_url ? (
                                  <img
                                    src={item.picture_url}
                                    alt={item.name || "Place image"}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = "https://raw.githubusercontent.com/AlexandraMarinaBerlinschi/poze-is/main/image-editing.png";
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                                    <span className="text-gray-500 text-4xl">🏛️</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                      {index + 1}
                                    </div>
                                    <div>
                                      <h4 className="text-lg font-semibold text-gray-900 line-clamp-1">
                                        {item.name || "Unnamed Place"}
                                      </h4>
                                      {item.city && (
                                        <p className="text-sm text-gray-600 flex items-center">
                                          <span className="mr-1">📍</span>
                                          {item.city}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <button
                                    onClick={() => removeFromItinerary(index)}
                                    className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                    title="Remove from itinerary"
                                  >
                                    <span className="text-lg">🗑️</span>
                                  </button>
                                </div>
                                
                                {/* Stats Row */}
                                <div className="flex items-center space-x-4 text-sm">
                                  {item.rating && (
                                    <div className="flex items-center bg-yellow-50 px-2 py-1 rounded-lg">
                                      <span className="text-yellow-500 mr-1">⭐</span>
                                      <span className="font-medium text-yellow-700">
                                        {Number(item.rating).toFixed(1)}/5
                                      </span>
                                    </div>
                                  )}
                                  
                                  {item.duration && (
                                    <div className="flex items-center bg-blue-50 px-2 py-1 rounded-lg">
                                      <span className="text-blue-500 mr-1">⏱️</span>
                                      <span className="font-medium text-blue-700">{item.duration}</span>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center bg-green-50 px-2 py-1 rounded-lg">
                                    <span className="text-green-500 mr-1">💰</span>
                                    <span className="font-medium text-green-700">
                                      {generateConsistentPrice(item.name)} EUR
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Empty State
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">🗺️</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Your itinerary is empty</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Start building your perfect trip by adding places from our recommendations page. 
                  Discover amazing destinations and create unforgettable memories!
                </p>
                <button
                  onClick={() => navigate("/recommendations")}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-300 font-medium"
                >
                  🔍 Browse Recommendations
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            {itinerary.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">📊</span>
                  Trip Summary
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Total Places</span>
                    <span className="font-semibold text-blue-600">{itinerary.length}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Estimated Cost</span>
                    <span className="font-semibold text-green-600">{totalCost} EUR</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Average Rating</span>
                    <span className="font-semibold text-yellow-600">⭐ {averageRating}</span>
                  </div>
                  
                  {totalDuration > 0 && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">Total Duration</span>
                      <span className="font-semibold text-purple-600">{totalDuration.toFixed(1)}h</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tips Card */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="mr-2">💡</span>
                Pro Tips
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span className="text-gray-700">Use reorder mode to arrange places by your preferred route</span>
                </div>
                
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span className="text-gray-700">Export your itinerary as PDF to access it offline</span>
                </div>
                
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span className="text-gray-700">Login to automatically save your itinerary across devices</span>
                </div>
                
                {!isAuthenticated && (
                  <div className="mt-4 pt-3 border-t border-blue-200">
                    <button
                      onClick={() => navigate('/login')}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      🔐 Login Now
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Share Card */}
            {itinerary.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">📤</span>
                  Share & Export
                </h3>
                
                <div className="space-y-3">
                  <button
                    onClick={() => exportItinerary("pdf")}
                    className="w-full px-4 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium flex items-center justify-center space-x-2"
                  >
                    <span>📄</span>
                    <span>Download PDF</span>
                  </button>
                  
                  <button
                    onClick={() => exportItinerary("csv")}
                    className="w-full px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors font-medium flex items-center justify-center space-x-2"
                  >
                    <span>📊</span>
                    <span>Export CSV</span>
                  </button>
                  
                  <button
                    onClick={() => exportItinerary("json")}
                    className="w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium flex items-center justify-center space-x-2"
                  >
                    <span>📋</span>
                    <span>Export JSON</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Itinerary;

