import { useState, useEffect } from 'react';

// Utility pentru storage specific utilizatorului
const UserStorage = {
  // Obține ID-ul utilizatorului curent (adaptează după sistemul tău de auth)
  getCurrentUserId: () => {
    // Încearcă să obții utilizatorul din localStorage
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (user && user.id) return user.id;
    if (user && user.email) return user.email;
    
    // Încearcă să obții din sessionStorage
    const sessionUser = JSON.parse(sessionStorage.getItem('user') || 'null');
    if (sessionUser && sessionUser.id) return sessionUser.id;
    if (sessionUser && sessionUser.email) return sessionUser.email;
    
    // Fallback pentru utilizatori neautentificați
    return 'anonymous';
  },

  // Generează cheia specifică utilizatorului
  getUserKey: (key) => {
    const userId = UserStorage.getCurrentUserId();
    return `${userId}_${key}`;
  },

  // Setează date specifice utilizatorului
  setUserData: (key, data) => {
    const userKey = UserStorage.getUserKey(key);
    sessionStorage.setItem(userKey, JSON.stringify(data));
  },

  // Obține date specifice utilizatorului
  getUserData: (key, defaultValue = null) => {
    const userKey = UserStorage.getUserKey(key);
    const data = sessionStorage.getItem(userKey);
    return data ? JSON.parse(data) : defaultValue;
  },

  // Șterge date specifice utilizatorului
  removeUserData: (key) => {
    const userKey = UserStorage.getUserKey(key);
    sessionStorage.removeItem(userKey);
  },

  // Curăță toate datele utilizatorului curent
  clearUserData: () => {
    const userId = UserStorage.getCurrentUserId();
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith(`${userId}_`)) {
        sessionStorage.removeItem(key);
      }
    });
  },

  // Curăță datele când utilizatorul se deloghează
  onUserLogout: () => {
    UserStorage.clearUserData();
  }
};

// Hook pentru favorites specifice utilizatorului
export const useUserFavorites = () => {
  const [favorites, setFavorites] = useState(new Set());

  useEffect(() => {
    // Încarcă favoritele utilizatorului curent
    const userFavorites = UserStorage.getUserData('favorites', []);
    setFavorites(new Set(userFavorites));
  }, []);

  const toggleFavorite = (placeName) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(placeName)) {
        newFavorites.delete(placeName);
      } else {
        newFavorites.add(placeName);
      }
      
      // Salvează în storage-ul specific utilizatorului
      UserStorage.setUserData('favorites', [...newFavorites]);
      return newFavorites;
    });
  };

  return { favorites, toggleFavorite };
};

// Hook pentru itinerary specific utilizatorului
export const useUserItinerary = () => {
  const [itinerary, setItinerary] = useState([]);

  useEffect(() => {
    // Încarcă itinerariul utilizatorului curent
    const userItinerary = UserStorage.getUserData('pendingItinerary', { items: [] });
    setItinerary(userItinerary.items || []);
  }, []);

  const addToItinerary = (place) => {
    if (place && !itinerary.some((p) => p.name === place.name)) {
      const placeWithId = {
        ...place,
        id: place.id || `place-${Date.now()}-${Math.random()}`
      };

      const updated = [...itinerary, placeWithId];
      setItinerary(updated);

      // Salvează în storage-ul specific utilizatorului
      UserStorage.setUserData('pendingItinerary', {
        items: updated,
        title: "My Itinerary"
      });
    }
  };

  const removeFromItinerary = (placeName) => {
    const updated = itinerary.filter(item => item.name !== placeName);
    setItinerary(updated);

    // Salvează în storage-ul specific utilizatorului
    UserStorage.setUserData('pendingItinerary', {
      items: updated,
      title: "My Itinerary"
    });
  };

  const isInItinerary = (placeName) => {
    return itinerary.some(item => item.name === placeName);
  };

  return { 
    itinerary, 
    addToItinerary, 
    removeFromItinerary, 
    isInItinerary 
  };
};

export default UserStorage;