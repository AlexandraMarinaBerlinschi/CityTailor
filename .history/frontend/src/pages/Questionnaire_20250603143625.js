import { useState, useEffect } from "react";
import { MapPin, Clock, Activity, Utensils, Mountain, Palette, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import trackingService from "../services/TrackingService";

// Mock data for offline functionality
const getMockRecommendations = (city, activities, time) => {
  const mockPlaces = {
    paris: [
      {
        id: "1",
        name: "Eiffel Tower",
        description: "Iconic iron lattice tower and symbol of Paris",
        category: "Cultural",
        minimumDuration: "2-4h",
        rating: 4.6,
        lat: 48.8584,
        lon: 2.2945,
        pictures: ["https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=500"],
        price: 25,
        recommendation_reason: "Perfect for cultural exploration in Paris"
      },
      {
        id: "2", 
        name: "Louvre Museum",
        description: "World's largest art museum and historic monument",
        category: "Cultural",
        minimumDuration: ">4h",
        rating: 4.5,
        lat: 48.8606,
        lon: 2.3376,
        pictures: ["https://images.unsplash.com/photo-1566139884685-95dff3c5b63f?w=500"],
        price: 17,
        recommendation_reason: "Must-see for art and culture lovers"
      },
      {
        id: "3",
        name: "Seine River Cruise",
        description: "Scenic boat ride along the historic Seine River",
        category: "Relaxation",
        minimumDuration: "<2h",
        rating: 4.3,
        lat: 48.8566,
        lon: 2.3522,
        pictures: ["https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=500"],
        price: 15,
        recommendation_reason: "Relaxing way to see Paris from the water"
      },
      {
        id: "4",
        name: "Montmartre District",
        description: "Historic hilltop district with artistic heritage",
        category: "Cultural",
        minimumDuration: "2-4h", 
        rating: 4.4,
        lat: 48.8867,
        lon: 2.3431,
        pictures: ["https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=500"],
        price: 0,
        recommendation_reason: "Free cultural exploration with stunning views"
      },
      {
        id: "5",
        name: "Café de Flore",
        description: "Historic café famous for its literary clientele",
        category: "Gastronomy",
        minimumDuration: "<2h",
        rating: 4.1,
        lat: 48.8542,
        lon: 2.3320,
        pictures: ["https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500"],
        price: 35,
        recommendation_reason: "Authentic Parisian café experience"
      },
      {
        id: "6",
        name: "Luxembourg Gardens",
        description: "Beautiful public gardens perfect for relaxation",
        category: "Outdoor",
        minimumDuration: "2-4h",
        rating: 4.5,
        lat: 48.8462,
        lon: 2.3372,
        pictures: ["https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=500"],
        price: 0,
        recommendation_reason: "Perfect outdoor space for relaxation"
      }
    ],
    rome: [
      {
        id: "7",
        name: "Colosseum",
        description: "Ancient amphitheater and iconic symbol of Rome",
        category: "Cultural",
        minimumDuration: "2-4h",
        rating: 4.6,
        lat: 41.8902,
        lon: 12.4922,
        pictures: ["https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=500"],
        price: 16,
        recommendation_reason: "Essential Roman historical experience"
      },
      {
        id: "8",
        name: "Vatican Museums",
        description: "World-renowned art collection including Sistine Chapel",
        category: "Cultural", 
        minimumDuration: ">4h",
        rating: 4.5,
        lat: 41.9065,
        lon: 12.4536,
        pictures: ["https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500"],
        price: 20,
        recommendation_reason: "Unparalleled art and religious heritage"
      },
      {
        id: "9",
        name: "Trastevere District",
        description: "Charming neighborhood with authentic Roman atmosphere",
        category: "Gastronomy",
        minimumDuration: "2-4h",
        rating: 4.4,
        lat: 41.8893,
        lon: 12.4700,
        pictures: ["https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=500"],
        price: 30,
        recommendation_reason: "Best area for authentic Roman cuisine"
      }
    ],
    tokyo: [
      {
        id: "10",
        name: "Senso-ji Temple",
        description: "Ancient Buddhist temple in historic Asakusa",
        category: "Cultural",
        minimumDuration: "2-4h",
        rating: 4.3,
        lat: 35.7148,
        lon: 139.7967,
        pictures: ["https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=500"],
        price: 0,
        recommendation_reason: "Traditional Japanese cultural experience"
      },
      {
        id: "11",
        name: "Shibuya Crossing",
        description: "World's busiest pedestrian crossing",
        category: "Cultural",
        minimumDuration: "<2h",
        rating: 4.2,
        lat: 35.6598,
        lon: 139.7006,
        pictures: ["https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=500"],
        price: 0,
        recommendation_reason: "Iconic Tokyo experience"
      },
      {
        id: "12",
        name: "Tsukiji Outer Market",
        description: "Famous fish market with incredible street food",
        category: "Gastronomy",
        minimumDuration: "2-4h",
        rating: 4.4,
        lat: 35.6654,
        lon: 139.7707,
        pictures: ["https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500"],
        price: 25,
        recommendation_reason: "Best sushi and street food in Tokyo"
      }
    ]
  };

  // Find city data (case insensitive)
  const cityKey = Object.keys(mockPlaces).find(key => 
    key.toLowerCase() === city.toLowerCase()
  );
  
  let allPlaces = cityKey ? mockPlaces[cityKey] : mockPlaces.paris; // Default to Paris
  
  // Filter by selected activities
  if (activities && activities.length > 0) {
    allPlaces = allPlaces.filter(place => 
      activities.some(activity => 
        place.category.toLowerCase().includes(activity.toLowerCase())
      )
    );
  }

  // Filter by time if specified
  if (time) {
    allPlaces = allPlaces.filter(place => {
      if (time === "<2h") return place.minimumDuration === "<2h";
      if (time === "2-4h") return place.minimumDuration === "2-4h" || place.minimumDuration === "<2h";
      if (time === ">4h") return true; // All durations work for >4h
      return true;
    });
  }

  // Add ML-style scoring
  const scoredPlaces = allPlaces.map(place => ({
    ...place,
    score: Math.random() * 5 + 5, // Random score between 5-10
    isMLRecommendation: true,
    recommendation_reason: place.recommendation_reason || `Great ${place.category.toLowerCase()} experience in ${city}`
  }));

  return scoredPlaces.sort((a, b) => b.score - a.score);
};

const Questionnaire = () => {
  const [city, setCity] = useState("");
  const [activities, setActivities] = useState([]);
  const [time, setTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    // Track page view when component mounts
    trackingService.trackPageView('Questionnaire');

    return () => {
      // Track page exit when component unmounts
      trackingService.trackPageExit('Questionnaire');
    };
  }, []);

  const handleCheckboxChange = (e) => {
    const value = e.target.value;
    setActivities((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    // Validare formular
    if (!city || activities.length === 0 || !time) {
      setError("Please fill in all fields before submitting.");
      setIsSubmitting(false);
      return;
    }

    const formData = {
      city: city.trim(),
      activities,
      time,
      timestamp: new Date().toISOString()
    };

    try {
      console.log("🔍 Starting ML-enhanced search:", formData);
      
      // Try ML-enhanced search with tracking first
      const response = await trackingService.searchWithMLTracking(
        formData.city,
        formData.activities,
        formData.time
      );
      
      console.log("✅ ML-enhanced search completed:", {
        city: formData.city,
        totalResults: response?.recommendations?.length || 0,
        mlEnhanced: response?.ml_enhanced || false,
        sources: response?.sources
      });
      
      // Navigate with enhanced results
      navigate("/recommendations", {
        state: {
          recommendations: response?.recommendations || [],
          city: formData.city,
          lat: response?.lat || 48.8566, 
          lon: response?.lon || 2.3522,
          mlEnhanced: response?.ml_enhanced || false,
          sources: response?.sources || {},
          formData: formData
        }
      });

    } catch (err) {
      console.error("❌ ML search failed, trying fallback:", err);
      
      try {
        // Fallback to original API
        const fallbackResponse = await fetch("http://localhost:8000/submit-preferences", {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
          timeout: 5000 // Shorter timeout for fallback
        });
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          console.log("✅ Fallback API succeeded:", fallbackData);
          
          // Still track the search even if it's fallback
          try {
            await trackingService.trackSearch(
              formData.city,
              formData.activities,
              formData.time
            );
          } catch (trackingError) {
            console.warn("⚠️ Tracking failed in fallback:", trackingError);
          }
          
          navigate("/recommendations", {
            state: {
              recommendations: fallbackData,
              city: formData.city,
              lat: fallbackData.lat || 48.8566, 
              lon: fallbackData.lon || 2.3522,
              mlEnhanced: false,
              sources: { amadeus: fallbackData.recommendations?.length || 0, ml_personalized: 0 }
            }
          });
          
        } else {
          throw new Error("Fallback API failed");
        }
        
      } catch (fallbackErr) {
        console.error("❌ Both ML and fallback API failed, using mock data:", fallbackErr);
        
        // Ultimate fallback - use mock data
        console.log("📱 Using mock data for offline experience");
        
        const mockRecommendations = getMockRecommendations(
          formData.city,
          formData.activities,
          formData.time
        );
        
        // Try to track search even if APIs failed
        try {
          await trackingService.trackSearch(
            formData.city,
            formData.activities,
            formData.time
          );
        } catch (trackingError) {
          console.warn("⚠️ Even offline tracking failed:", trackingError);
        }
        
        // Store for later sync when backend is available
        sessionStorage.setItem("questionnaireData", JSON.stringify(formData));
        sessionStorage.setItem("latestRecommendations", JSON.stringify(mockRecommendations));
        sessionStorage.setItem("latestCity", formData.city);
        
        navigate("/recommendations", {
          state: {
            recommendations: mockRecommendations,
            city: formData.city,
            lat: 48.8566, // Default Paris coordinates
            lon: 2.3522,
            mlEnhanced: false, // Mock data is not ML enhanced
            formData: formData,
            isOffline: true,
            sources: { mock_data: mockRecommendations.length, total: mockRecommendations.length },
            message: `Found ${mockRecommendations.length} amazing places in ${formData.city}! (Offline mode - connect to server for more results)`
          }
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const activityOptions = [
    { id: "Cultural", label: "Cultural", icon: Palette, color: "from-purple-500 to-pink-500" },
    { id: "Outdoor", label: "Outdoors", icon: Mountain, color: "from-green-500 to-emerald-500" },
    { id: "Relaxation", label: "Relaxation", icon: Heart, color: "from-blue-500 to-cyan-500" },
    { id: "Gastronomy", label: "Gastronomy", icon: Utensils, color: "from-orange-500 to-red-500" }
  ];

  const timeOptions = [
    { id: "<2h", label: "Less than 2 hours", description: "Quick exploration" },
    { id: "2-4h", label: "Between 2 and 4 hours", description: "Half-day adventure" },
    { id: ">4h", label: "More than 4 hours", description: "Full-day experience" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-6 shadow-lg">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Travel Preferences
          </h1>
          <p className="text-gray-600 text-lg">
            Tell us about your dream destination and we'll create the perfect itinerary for you
          </p>
          
          {/* ML Enhancement Badge */}
          <div className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200 rounded-full">
            <span className="text-purple-600 text-sm font-medium flex items-center">
              <span className="mr-2">🤖</span>
              AI-Enhanced Recommendations
            </span>
          </div>
        </div>

        {/* Backend Status Warning */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-4 mb-8 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-600 text-lg">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Offline Mode Active</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Backend server not detected. Using demo data for cities: Paris, Rome, Tokyo. 
                <br/>
                <span className="font-medium">Start your backend server for full AI recommendations!</span>
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-lg animate-slide-in">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* User Status Info */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">
                {trackingService.userId ? '👤' : '👋'}
              </div>
              <div>
                <p className="font-medium text-blue-900">
                  {trackingService.userId ? 'Personalized Experience' : 'Welcome, Explorer!'}
                </p>
                <p className="text-sm text-blue-700">
                  {trackingService.userId 
                    ? 'Your preferences will be learned and saved' 
                    : 'Currently in demo mode - try Paris, Rome, or Tokyo'
                  }
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-600">Session ID:</p>
              <p className="text-xs text-blue-500 font-mono">
                {trackingService.sessionId.substring(0, 8)}...
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Destination Input */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center mb-6">
              <MapPin className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800">Where do you want to travel?</h2>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Try: Paris, Rome, Tokyo (demo cities) or any city name..."
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-4 text-xl border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-lg placeholder-gray-400"
                required
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              💡 <strong>Demo cities with rich data:</strong> Paris, Rome, Tokyo
            </p>
          </div>

          {/* Activities Selection */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center mb-6">
              <Activity className="w-6 h-6 text-purple-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800">What types of activities do you prefer?</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activityOptions.map((activity) => {
                const IconComponent = activity.icon;
                const isSelected = activities.includes(activity.id);
                return (
                  <label
                    key={activity.id}
                    className={`relative cursor-pointer group transition-all duration-300 ${
                      isSelected ? 'scale-105' : 'hover:scale-102'
                    }`}
                  >
                    <input
                      type="checkbox"
                      value={activity.id}
                      onChange={handleCheckboxChange}
                      checked={isSelected}
                      className="sr-only"
                    />
                    <div className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                      isSelected 
                        ? `border-transparent bg-gradient-to-r ${activity.color} text-white shadow-lg`
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    }`}>
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-lg ${
                          isSelected 
                            ? 'bg-white bg-opacity-20' 
                            : `bg-gradient-to-r ${activity.color} bg-opacity-10`
                        }`}>
                          <IconComponent className={`w-6 h-6 ${
                            isSelected ? 'text-white' : 'text-gray-600'
                          }`} />
                        </div>
                        <span className={`font-medium text-lg ${
                          isSelected ? 'text-white' : 'text-gray-800'
                        }`}>
                          {activity.label}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Time Selection */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center mb-6">
              <Clock className="w-6 h-6 text-green-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800">How much time do you have available per day?</h2>
            </div>
            <div className="space-y-4">
              {timeOptions.map((option) => {
                const isSelected = time === option.id;
                return (
                  <label
                    key={option.id}
                    className={`relative cursor-pointer group block transition-all duration-300 ${
                      isSelected ? 'scale-102' : 'hover:scale-101'
                    }`}
                  >
                    <input
                      type="radio"
                      name="time"
                      value={option.id}
                      onChange={(e) => setTime(e.target.value)}
                      checked={isSelected}
                      className="sr-only"
                      required
                    />
                    <div className={`p-5 rounded-xl border-2 transition-all duration-300 ${
                      isSelected 
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={`font-medium text-lg ${
                            isSelected ? 'text-green-800' : 'text-gray-800'
                          }`}>
                            {option.label}
                          </h3>
                          <p className={`text-sm ${
                            isSelected ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {option.description}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
                          isSelected 
                            ? 'border-green-500 bg-green-500' 
                            : 'border-gray-300 group-hover:border-gray-400'
                        }`}>
                          {isSelected && (
                            <div className="w-full h-full rounded-full bg-white scale-50 transition-transform duration-200"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center">
            <button
              type="submit"
              disabled={isSubmitting || !city || activities.length === 0 || !time}
              className={`relative inline-flex items-center px-12 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-lg hover:shadow-xl transform transition-all duration-300 ${
                isSubmitting || !city || activities.length === 0 || !time
                  ? "opacity-70 cursor-not-allowed scale-95" 
                  : "hover:scale-105 hover:from-blue-700 hover:to-purple-700"
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {trackingService.userId ? 'Learning your preferences...' : 'Finding perfect matches...'}
                </>
              ) : (
                <>
                  <Activity className="w-5 h-5 mr-2" />
                  🌟 Discover Amazing Places
                </>
              )}
            </button>
            
            {/* Enhancement Note */}
            {!isSubmitting && (
              <p className="mt-4 text-sm text-gray-600">
                {trackingService.userId 
                  ? '✨ Your results will be personalized based on your history'
                  : '🎯 Demo mode active - start backend server for full AI features'
                }
              </p>
            )}
          </div>
        </form>

        {/* Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg text-xs text-gray-600">
            <strong>Debug Info:</strong>
            <div>User Type: {trackingService.userId ? 'Authenticated' : 'Anonymous'}</div>
            <div>Session ID: {trackingService.sessionId}</div>
            <div>ML System: Offline (Demo Mode)</div>
            <div>Available Cities: Paris, Rome, Tokyo</div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }