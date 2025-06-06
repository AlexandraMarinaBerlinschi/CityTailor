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
        // Check if recommendations is an array of strings (error messages)
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
        // No results found for the criteria
        setError("Nu am găsit recomandări care să corespundă criteriilor selectate. Încearcă să selectezi alte activități sau un alt oraș.");
      }
    } catch (error) {
      console.error("Error submitting preferences:", error);
      setError("A apărut o eroare la trimiterea preferințelor. Te rugăm să încerci din nou.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Chestionar de Preferințe</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <p className="font-semibold mb-2">Unde dorești să călătorești?</p>
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
          <p className="font-semibold mb-2">1. Ce tipuri de activități preferi?</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "Cultural", label: "Cultural (muzee, monumente)" },
              { id: "Outdoor", label: "În aer liber (plimbări, ture)" },
              { id: "Relaxation", label: "Relaxare (spa, wellness)" },
              { id: "Gastronomy", label: "Gastronomie (mâncare, vin)" }
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
              { id: "<2h", label: "Mai puțin de 2 ore" },
              { id: "2-4h", label: "Între 2 și 4 ore" },
              { id: ">4h", label: "Mai mult de 4 ore" }
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
          {isSubmitting ? "Se procesează..." : "Generează Recomandări"}
        </button>
      </form>
    </div>
  );
};

export default Questionnaire;