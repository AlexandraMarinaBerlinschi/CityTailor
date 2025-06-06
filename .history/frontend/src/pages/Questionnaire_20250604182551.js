import { useState, useEffect } from "react";
import { MapPin, Clock, Activity, Utensils, Mountain, Palette, Heart, Plane, Compass } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import trackingService from "../services/TrackingService";

const Questionnaire = () => {
  const [city, setCity] = useState("");
  const [activities, setActivities] = useState([]);
  const [time, setTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Track page view when component mounts
    trackingService.trackPageView('Questionnaire');

    // Check if city parameter is in URL and pre-fill it
    const cityFromUrl = searchParams.get('city');
    if (cityFromUrl) {
      setCity(cityFromUrl);
      console.log(`🏙️ City pre-filled from URL: ${cityFromUrl}`);
    }

    return () => {
      // Track page exit when component unmounts
      trackingService.trackPageExit('Questionnaire');
    };
  }, [searchParams]);

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
      
      // Use ML-enhanced search with tracking
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
          timeout: 10000 
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
        console.error("❌ Both ML and fallback API failed:", fallbackErr);
        
        // Ultimate fallback - navigate with stored data
        console.log("📱 Using ultimate fallback - stored data");
        
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
        
        sessionStorage.setItem("questionnaireData", JSON.stringify(formData));
        
        navigate("/recommendations", {
          state: {
            recommendations: [],
            city: formData.city,
            lat: 48.8566,
            lon: 2.3522,
            mlEnhanced: false,
            formData: formData,
            error: "Service temporarily unavailable - showing cached results"
          }
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const activityOptions = [
    { 
      id: "Cultural", 
      label: "Cultural", 
      icon: Palette, 
      color: "from-purple-500 to-pink-500",
      description: "Museums, history, art",
      emoji: "🏛️"
    },
    { 
      id: "Outdoor", 
      label: "Outdoors", 
      icon: Mountain, 
      color: "from-green-500 to-emerald-500",
      description: "Nature, hiking, parks",
      emoji: "🏔️"
    },
    { 
      id: "Relaxation", 
      label: "Relaxation", 
      icon: Heart, 
      color: "from-blue-500 to-cyan-500",
      description: "Spas, beaches, calm",
      emoji: "🧘‍♀️"
    },
    { 
      id: "Gastronomy", 
      label: "Gastronomy", 
      icon: Utensils, 
      color: "from-orange-500 to-red-500",
      description: "Food tours, restaurants",
      emoji: "🍽️"
    }
  ];

  const timeOptions = [
    { id: "<2h", label: "Less than 2 hours", description: "Quick exploration", emoji: "⚡" },
    { id: "2-4h", label: "Between 2 and 4 hours", description: "Half-day adventure", emoji: "🌅" },
    { id: ">4h", label: "More than 4 hours", description: "Full-day experience", emoji: "🌞" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      {/* Travel-themed Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 text-white py-16">
        <div className="absolute inset-0 bg-black/20"></div>
        
        {/* Floating travel icons */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-10 text-white/10 text-6xl animate-float">✈️</div>
          <div className="absolute top-20 right-20 text-white/10 text-4xl animate-float-delayed">🗺️</div>
          <div className="absolute bottom-20 left-20 text-white/10 text-5xl animate-float">🧳</div>
          <div className="absolute bottom-10 right-10 text-white/10 text-3xl animate-float-delayed">🌍</div>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-6 shadow-lg">
            <Compass className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold mb-4 leading-tight">
            Plan Your Perfect
            <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
              Adventure
            </span>
          </h1>
          <p className="text-xl lg:text-2xl opacity-90 max-w-2xl mx-auto leading-relaxed">
            Tell us your travel dreams and we'll create a personalized itinerary just for you
          </p>
          
          {/* Back to Home Link */}
          <button 
            onClick={() => navigate('/')}
            className="mt-6 inline-flex items-center text-white/80 hover:text-white transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-12 -mt-8 relative z-10">
        {/* AI Enhancement Badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center px-6 py-3 bg-white rounded-full shadow-lg border">
            <span className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mr-3 animate-pulse"></span>
            <span className="text-gray-700 font-medium">AI-Enhanced Recommendations</span>
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
        <div className="bg-white rounded-2xl p-6 mb-8 shadow-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-lg">
                {trackingService.userId ? '👤' : '🌟'}
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {trackingService.userId ? 'Personalized Experience' : 'Welcome, Explorer!'}
                </p>
                <p className="text-sm text-gray-600">
                  {trackingService.userId 
                    ? 'Your preferences will be learned and saved' 
                    : 'Login after search to save your preferences'
                  }
                </p>
              </div>
            </div>
            <div className="text-2xl">✈️</div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Destination Input */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border hover:shadow-xl transition-all duration-300">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mr-4">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Where do you want to travel?</h2>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g., Paris, Rome, Tokyo, New York..."
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-4 text-xl border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 placeholder-gray-400"
                required
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <div className="text-2xl">🌍</div>
              </div>
            </div>
            {searchParams.get('city') && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 flex items-center">
                  <span className="mr-2">✨</span>
                  Destination pre-selected from your choice! Ready to explore {city}?
                </p>
              </div>
            )}
          </div>

          {/* Activities Selection */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border hover:shadow-xl transition-all duration-300">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-4">
                <Activity className="w-6 h-6 text-white" />
              </div>
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
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${
                            isSelected 
                              ? 'bg-white bg-opacity-20' 
                              : `bg-gradient-to-r ${activity.color} bg-opacity-10`
                          }`}>
                            <IconComponent className={`w-5 h-5 ${
                              isSelected ? 'text-white' : 'text-gray-600'
                            }`} />
                          </div>
                          <span className={`font-medium text-lg ${
                            isSelected ? 'text-white' : 'text-gray-800'
                          }`}>
                            {activity.label}
                          </span>
                        </div>
                        <span className="text-2xl">{activity.emoji}</span>
                      </div>
                      <p className={`text-sm ${
                        isSelected ? 'text-white/80' : 'text-gray-500'
                      }`}>
                        {activity.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Time Selection */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border hover:shadow-xl transition-all duration-300">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-4">
                <Clock className="w-6 h-6 text-white" />
              </div>
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
                    <div className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                      isSelected 
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className="text-3xl">{option.emoji}</span>
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
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${
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
              className={`relative inline-flex items-center px-12 py-4 text-lg font-semibold text-white bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-lg hover:shadow-xl transform transition-all duration-300 ${
                isSubmitting || !city || activities.length === 0 || !time
                  ? "opacity-70 cursor-not-allowed scale-95" 
                  : "hover:scale-105 hover:from-orange-600 hover:to-red-600"
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {trackingService.userId ? 'Creating your journey...' : 'Planning your adventure...'}
                </>
              ) : (
                <>
                  <Plane className="w-5 h-5 mr-2" />
                  🌍 Start My Adventure
                </>
              )}
            </button>
            
            {/* Enhancement Note */}
            {!isSubmitting && (
              <p className="mt-4 text-sm text-gray-600">
                {trackingService.userId 
                  ? '✨ Your results will be personalized based on your history'
                  : '🔗 Login after search to unlock personalized recommendations'
                }
              </p>
            )}
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes float-delayed {
          0%, 100% { transform: translateY(-10px); }
          50% { transform: translateY(-30px); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        .animate-slide-in {
          animation: slide-in 0.4s ease-out;
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 6s ease-in-out infinite 2s;
        }
      `}</style>
    </div>
  );
};

export default Questionnaire;