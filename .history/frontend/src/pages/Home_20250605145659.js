import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import trackingService from "../services/TrackingService";
import UserStorage from "./userStorage";

const Home = () => {
  const navigate = useNavigate();

  // Initialize tracking on mount
  useEffect(() => {
    trackingService.trackPageView('Home');

    // Set user in tracking service
    const userId = UserStorage.getCurrentUserId();
    if (userId && userId !== 'anonymous') {
      trackingService.setUserId(userId);
    }

    return () => {
      trackingService.trackPageExit('Home');
    };
  }, []);

  // Listen for user changes
  useEffect(() => {
    const handleUserChange = () => {
      const userId = UserStorage.getCurrentUserId();
      if (userId && userId !== 'anonymous') {
        trackingService.setUserId(userId);
      }
    };

    window.addEventListener('storage', handleUserChange);
    return () => {
      window.removeEventListener('storage', handleUserChange);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden min-h-screen">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://www.bsr.org/images/heroes/bsr-travel-hero..jpg')`
          }}
        ></div>
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/40"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32 min-h-screen flex items-center">
          <div className="text-center w-full">
            <h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight text-white">
              Discover Your Next
              <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                Adventure
              </span>
            </h1>
            <p className="text-xl lg:text-2xl mb-8 opacity-90 max-w-3xl mx-auto leading-relaxed text-white">
              Explore handpicked destinations, create personalized itineraries, and make every journey unforgettable
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <button 
                onClick={() => navigate('/questionnaire')}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-2xl hover:shadow-orange-500/25 transition-all duration-300 transform hover:scale-105"
              >
                🌍 Start Exploring
              </button>
              <button 
                onClick={() => navigate('/recommendations')}
                className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/30 transition-all duration-300"
              >
                Browse Destinations
              </button>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
                <h3 className="font-semibold mb-2 text-white">Curated Destinations</h3>
                <p className="text-sm opacity-80 text-white">Handpicked locations from around the world</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
                <h3 className="font-semibold mb-2 text-white">Smart Planning</h3>
                <p className="text-sm opacity-80 text-white">Create and manage your travel itinerary</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
                <h3 className="font-semibold mb-2 text-white">Personalized</h3>
                <p className="text-sm opacity-80 text-white">Recommendations that match your style</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Popular destinations section */}
      <div className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Popular Destinations
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover the world's most beloved travel destinations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Sample destinations */}
            {[
              {
                name: "Paris, France",
                image: "https://media-cdn.tripadvisor.com/media/photo-c/1280x250/17/15/6d/d6/paris.jpg",
                description: "The City of Light with iconic landmarks and romantic atmosphere",
                category: "Cultural"
              },
              {
                name: "Tokyo, Japan", 
                image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop&q=80",
                description: "Modern metropolis blending tradition with cutting-edge technology",
                category: "Urban"
              },
              {
                name: "Rome, Italy",
                image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=300&fit=crop&q=80",
                description: "Eternal City with ancient history and incredible architecture",
                category: "Historical"
              },
              {
                name: "Barcelona, Spain",
                image: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400&h=300&fit=crop&q=80",
                description: "Vibrant city with stunning architecture and Mediterranean charm",
                category: "Cultural"
              },
              {
                name: "New York",
                image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=300&fit=crop&q=80",
                description: "The city that never sleeps with endless possibilities",
                category: "Urban"
              },
              {
                name: "London, United Kingdom",
                image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop&q=80",
                description: "Historic capital with royal palaces and modern attractions",
                category: "Cultural"
              }
            ].map((destination, index) => (
              <div 
                key={index}
                className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:scale-[1.02] overflow-hidden"
                onClick={() => {
                  const cityName = destination.name.split(',')[0].trim();
                  navigate(`/questionnaire?city=${encodeURIComponent(cityName)}`);
                }}
              >
                <div className="relative">
                  <img
                    src={destination.image}
                    alt={destination.name}
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute top-4 right-4">
                    <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold text-gray-800">
                      {destination.category}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {destination.name}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {destination.description}
                  </p>
                  <button className="text-blue-600 font-semibold hover:text-blue-800 transition-colors">
                    Explore Now →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Ready to Plan Your Perfect Trip?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Start discovering destinations tailored to your interests and travel style
          </p>
          <button 
            onClick={() => navigate('/questionnaire')}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-10 py-4 rounded-xl font-bold text-lg shadow-2xl transition-all duration-300 transform hover:scale-105"
          >
            Get Started Free
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;