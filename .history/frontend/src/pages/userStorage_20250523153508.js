import { useState, useEffect } from 'react';

// Utility pentru storage specific utilizatorului
const UserStorage = {
  getCurrentUserId: () => {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (user && user.id) return user.id;
    if (user && user.email) return user.email;

    const sessionUser = JSON.parse(sessionStorage.getItem('user') || 'null');
    if (sessionUser && sessionUser.id) return sessionUser.id;
    if (sessionUser && sessionUser.email) return sessionUser.email;

    return 'anonymous';
  },

  getUserKey: (key) => {
    const userId = UserStorage.getCurrentUserId();
    return `${userId}_${key}`;
  },

  setUserData: (key, data) => {
    const userKey = UserStorage.getUserKey(key);
    localStorage.setItem(userKey, JSON.stringify(data));
  },

  getUserData: (key, defaultValue = null) => {
    const userKey = UserStorage.getUserKey(key);
    const data = localStorage.getItem(userKey);
    return data ? JSON.parse(data) : defaultValue;
  },

  removeUserData: (key) => {
    const userKey = UserStorage.getUserKey(key);
    localStorage.removeItem(userKey);
  },

  clearUserData: () => {
    const userId = UserStorage.getCurrentUserId();
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(`${userId}_`)) {
        localStorage.removeItem(key);
      }
    });
  },

  onUserLogout: () => {
    UserStorage.clearUserData();
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('user');
  },

  // 🔁 Migrare din date anonime către contul real
  migrateAnonymousDataToUser: (newUserId) => {
    const migrateKey = (keyName) => {
      const anonKey = `anonymous_${keyName}`;
      const userKey = `${newUserId}_${keyName}`;
      const data = localStorage.getItem(anonKey);
      if (data && !localStorage.getItem(userKey)) {
        localStorage.setItem(userKey, data);
        localStorage.removeItem(anonKey);
      }
    };

    migrateKey("favorites");
    migrateKey("pendingItinerary");
  }
};

// Hook pentru favorites specifice utilizatorului
export const useUserFavorites = () => {
  const [favorites, setFavorites] = useState(new Set());

  useEffect(() => {
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
      UserStorage.setUserData('pendingItinerary', {
        items: updated,
        title: "My Itinerary"
      });
    }
  };

  const removeFromItinerary = (placeName) => {
    const updated = itinerary.filter(item => item.name !== placeName);
    setItinerary(updated);
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
