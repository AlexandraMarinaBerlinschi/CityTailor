import { useState } from "react";
import { MapPin, Clock, Activity, Utensils, Mountain, Palette, Heart } from "lucide-react";

const Questionnaire = () => {
  const [city, setCity] = useState("");
  const [activities, setActivities] = useState([]);
  const [time, setTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

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
    
    const formData = {
      city,
      activities,
      time,
    };

    // Simulate API call
    setTimeout(() => {
      console.log("Form submitted:", formData);
      setIsSubmitting(false);
      // Here you would typically navigate to recommendations page
      alert("Preferences submitted successfully! (This is a demo)");
    }, 2000);
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

        {/* Form */}
        <div onSubmit={handleSubmit} className="space-y-8">
          {/* Destination Input */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center mb-6">
              <MapPin className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800">Where do you want to travel?</h2>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g., Paris, Rome, Tokyo, New York..."
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-lg placeholder-gray-400"
                required
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
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
              disabled={isSubmitting}
              className={`relative inline-flex items-center px-12 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-lg hover:shadow-xl transform transition-all duration-300 ${
                isSubmitting 
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
                  Processing...
                </>
              ) : (
                <>
                  <Activity className="w-5 h-5 mr-2" />
                  Generate My Perfect Itinerary
                </>
              )}
            </button>
          </div>
        </div>
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
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        .animate-slide-in {
          animation: slide-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Questionnaire;