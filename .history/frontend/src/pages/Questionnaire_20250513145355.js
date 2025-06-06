import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Questionnaire = () => {
  const [city, setCity] = useState("");
  const [activities, setActivities] = useState([]);
  const [time, setTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

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

    try {
      const response = await axios.post("http://localhost:8000/submit-preferences", formData);
      
      if (response.data.recommendations && response.data.recommendations.length > 0) {
        if (typeof response.data.recommendations[0] === 'string') {
          setError(response.data.recommendations[0]);
          setIsSubmitting(false);
          return;
        }
        
        navigate("/recommendations", {
          state: {
            recommendations: response.data.recommendations,
            city: response.data.city,
            lat: response.data.lat,
            lon: response.data.lon,
          },
        });
      } else {
        setError("No recommendations matching the selected criteria were found. Try selecting other activities or another city.");
      }
    } catch (error) {
      console.error("Error submitting preferences:", error);
      setError("There was an error when submitting preferences. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Preferences Questionnaire</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <p className="font-semibold mb-2">Where you want to travel?</p>
          <input
            type="text"
            placeholder="Ex: Paris, Roma, Timișoara"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>
        <div>
          <p className="font-semibold mb-2">1. What types of activities do you prefer?</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "Cultural", label: "Cultural" },
              { id: "Outdoor", label: "Outdoors" },
              { id: "Relaxation", label: "Relaxation" },
              { id: "Gastronomy", label: "Gastronomy" }
            ].map((activity) => (
              <label key={activity.id} className="flex items-center p-2 border rounded hover:bg-gray-50">
                <input
                  type="checkbox"
                  value={activity.id}
                  onChange={handleCheckboxChange}
                  checked={activities.includes(activity.id)}
                  className="mr-2"
                />
                {activity.label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="font-semibold mb-2">2. Cât timp ai disponibil pe zi?</p>
          <div className="space-y-2">
            {[
              { id: "<2h", label: "Less than 2 hours" },
              { id: "2-4h", label: "Between 2 and 4 hours"},
              { id: ">4h", label: "More than 4 hours" }
            ].map((option) => (
              <label key={option.id} className="flex items-center p-2 border rounded hover:bg-gray-50">
                <input
                  type="radio"
                  name="time"
                  value={option.id}
                  onChange={(e) => setTime(e.target.value)}
                  checked={time === option.id}
                  className="mr-2"
                  required
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition ${
            isSubmitting ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {isSubmitting ? "It processes..." : "Generate Recommendations"}
        </button>
      </form>
    </div>
  );
};

export default Questionnaire;