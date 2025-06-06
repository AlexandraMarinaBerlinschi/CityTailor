import { useEffect, useState } from "react";

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
  const [mlRecommendations, setMlRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);

  // Funcție pentru a obține recomandări ML de pe backend
  const fetchMLRecommendations = async () => {
    try {
      const userId = localStorage.getItem('user_id') || null;
      const sessionId = localStorage.getItem('session_id') || generateSessionId();
      
      const params = new URLSearchParams({ limit: '8' });
      if (userId) params.append('user_id', userId);
      if (sessionId) params.append('session_id', sessionId);

      const response = await fetch(`http://localhost:8000/ml/home-recommendations?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setMlRecommendations(data.recommendations);
      }
    } catch (err) {
      console.error('Failed to fetch ML recommendations:', err);
    }
  };

  function generateSessionId() {
    const id = Math.random().toString(36).substr(2, 9);
    localStorage.setItem('session_id', id);
    return id;
  }

  useEffect(() => {
    // Logica existentă pentru recomandări locale
    const raw = JSON.parse(sessionStorage.getItem("latestRecommendations")) || [];
    const prefs = JSON.parse(localStorage.getItem("userPreferences")) || { activities: [], time: "" };
    const favoritesArray = JSON.parse(localStorage.getItem("userFavorites")) || [];
    const itinerary = JSON.parse(localStorage.getItem("userItinerary")) || [];

    const favorites = new Set(favoritesArray);
    const localRecs = getMLRecommendations(raw, prefs, favorites, itinerary);
    setRecommendations(localRecs);

    // Obține și recomandări ML de pe backend
    fetchMLRecommendations();
    setLoading(false);
  }, []);

  // Combină recomandările locale cu cele ML
  const getCombinedRecommendations = () => {
    const combined = [...recommendations];
    
    if (mlRecommendations?.main_recommendations) {
      // Adaugă recomandările ML care nu sunt deja în lista locală
      mlRecommendations.main_recommendations.forEach(mlRec => {
        const exists = recommendations.find(rec => rec.name === mlRec.name);
        if (!exists) {
          combined.push({
            ...mlRec,
            score: mlRec.score || 7, // Scor default pentru recomandările ML
            isMLRecommendation: true
          });
        }
      });
    }

    // Sortează după scor
    return combined.sort((a, b) => b.score - a.score);
  };

  const allRecommendations = getCombinedRecommendations();

  const RecommendationCard = ({ place, index }) => (
    <div key={index} className="bg-white text-gray-800 p-4 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="flex justify-between items-start mb-2">
        <h2 className="text-xl font-bold">{place.name}</h2>
        {place.isMLRecommendation && (
          <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full">
            {place.is_random_discovery ? '✨ Discover' : '🎯 For You'}
          </span>
        )}
      </div>

      {/* Imagine */}
      {(place.pictures?.length > 0 || place.image_url) && (
        <img
          src={place.pictures?.[0]?.url || place.pictures?.[0] || place.image_url}
          alt={place.name}
          className="w-full h-40 object-cover rounded-lg mb-2 hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "https://source.unsplash.com/400x300/?travel,city";
          }}
        />
      )}

      {/* Descriere */}
      <p className="text-sm mb-2 text-gray-600">
        {place.description || "Discover this amazing place and create unforgettable memories."}
      </p>

      {/* Detalii */}
      <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
        <span>⏱️ {place.minimumDuration || "2-4h"}</span>
        {place.city && <span>📍 {place.city}</span>}
      </div>

      {/* Categorie și Scor */}
      <div className="flex justify-between items-center">
        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
          {place.category || "Experience"}
        </span>
        <div className="text-sm font-bold">
          {place.isMLRecommendation ? (
            <span className="text-purple-600">ML Score: {place.score?.toFixed(1)}</span>
          ) : (
            <span className="text-blue-600">Score: {place.score}</span>
          )}
        </div>
      </div>

      {/* Motiv recomandare (pentru ML) */}
      {place.recommendation_reason && (
        <div className="mt-2 text-xs text-gray-500 italic">
          💡 {place.recommendation_reason}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-500 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Recommended for You</h1>
          {mlRecommendations && (
            <p className="text-lg opacity-90">
              {mlRecommendations.recommendation_type === 'general_with_discovery' && "✨ Discover amazing new places"}
              {mlRecommendations.recommendation_type === 'new_user_with_discovery' && "🌟 Perfect activities to get you started"}
              {mlRecommendations.recommendation_type === 'personalized' && "🎯 Personalized just for you"}
              {mlRecommendations.recommendation_type === 'anonymous_session' && "🔍 Based on your recent interests"}
            </p>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center text-lg">
            <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
            Loading your personalized recommendations...
          </div>
        )}

        {/* No Recommendations */}
        {!loading && allRecommendations.length === 0 && (
          <div className="text-center text-lg">
            <div className="bg-white/10 p-8 rounded-xl backdrop-blur-sm">
              <h2 className="text-2xl mb-4">🗺️ Ready to explore?</h2>
              <p className="mb-4">No recommendations yet. Try filling in the questionnaire to get personalized suggestions!</p>
              <button 
                onClick={fetchMLRecommendations}
                className="bg-white text-purple-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Get Recommendations
              </button>
            </div>
          </div>
        )}

        {/* Main Recommendations Grid */}
        {!loading && allRecommendations.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {allRecommendations.slice(0, 8).map((place, index) => (
                <RecommendationCard key={`${place.name}-${index}`} place={place} index={index} />
              ))}
            </div>

            {/* Additional Sections for ML Recommendations */}
            {mlRecommendations?.discover_new_places?.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  ✨ Discover New Places
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mlRecommendations.discover_new_places.map((place, index) => (
                    <RecommendationCard 
                      key={`discover-${index}`} 
                      place={{...place, isMLRecommendation: true}} 
                      index={index} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Trending Section */}
            {mlRecommendations?.trending_for_beginners?.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  📈 Trending Now
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mlRecommendations.trending_for_beginners.map((place, index) => (
                    <RecommendationCard 
                      key={`trending-${index}`} 
                      place={{...place, isMLRecommendation: true}} 
                      index={index} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Stats Footer */}
            <div className="text-center mt-8 text-sm opacity-75">
              Showing {allRecommendations.length} recommendations • 
              {recommendations.length} from your activity • 
              {mlRecommendations?.main_recommendations?.length || 0} ML suggestions
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Home;