import { useEffect, useState } from "react";

// 🔎 Funcție de recomandare ML simplă
function getMLRecommendations(allPlaces, userPrefs, favorites, itinerary) {
  return allPlaces
    .map((place) => {
      let score = 0;

      if (userPrefs.activities?.includes(place.category)) score += 3;

      if (userPrefs.time === ">4h" && place.minimumDuration === ">4h") score += 2;
      if (userPrefs.time === "<2h" && place.minimumDuration === "<2h") score += 2;

      if (favorites.has(place.name)) score += 5;

      if (itinerary.find((i) => i.name === place.name)) score += 4;

      return { ...place, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); 
}

const Home = () => {
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    const raw = JSON.parse(sessionStorage.getItem("latestRecommendations")) || [];
    const prefs = JSON.parse(localStorage.getItem("userPreferences")) || { activities: [], time: "" };
    const favoritesArray = JSON.parse(localStorage.getItem("userFavorites")) || [];
    const itinerary = JSON.parse(localStorage.getItem("userItinerary")) || [];

    const favorites = new Set(favoritesArray);

    const recs = getMLRecommendations(raw, prefs, favorites, itinerary);
    setRecommendations(recs);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-500 text-white p-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Recommended for You</h1>

      {recommendations.length === 0 ? (
        <div className="text-center text-lg">No recommendations yet. Try filling in the questionnaire!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((place, index) => (
            <div key={index} className="bg-white text-gray-800 p-4 rounded-xl shadow-lg">
              <h2 className="text-xl font-bold mb-2">{place.name}</h2>
              {place.pictures?.length > 0 && (
                <img
                  src={place.pictures[0].url || place.pictures[0]}
                  alt={place.name}
                  className="w-full h-40 object-cover rounded-lg mb-2"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://raw.githubusercontent.com/AlexandraMarinaBerlinschi/poze-is/main/image-editing.png";
                  }}
                />
              )}
              <p className="text-sm mb-2">{place.description || "No description available."}</p>
              <div className="text-sm text-gray-500">⏱️ {place.minimumDuration || "unknown duration"}</div>
              <div className="text-sm text-purple-600 font-bold mt-2">ML Score: {place.score}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
