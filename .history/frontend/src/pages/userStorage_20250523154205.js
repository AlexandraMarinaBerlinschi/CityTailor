import { useState, useEffect } from 'react';

// Utility pentru storage specific utilizatorului
const UserStorage = {
  getCurrentUserId: () => {
    // Prioritizează utilizatorul curent din localStorage
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (user && user.id) return user.id;
    if (user && user.email) return user.email;

    // Apoi verifică sessionStorage
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
    // NU șterge datele utilizatorului la logout - doar șterge sesiunea
    // Datele utilizatorului (favorites, itinerary) rămân salvate pentru următoarea logare
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('user');
    localStorage.removeItem('token');
    
    console.log('User logged out - session cleared but user data preserved');
  },

  // Funcție separată pentru ștergerea completă a datelor (de folosit doar la ștergerea contului)
  clearAllUserData: () => {
    UserStorage.clearUserData();
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('user');
    localStorage.removeItem('token');
  },

  // 🔁 Migrare din date anonime către contul real
  migrateAnonymousDataToUser: (newUserId) => {
    console.log('Migrating data from anonymous to user:', newUserId);
    
    const migrateKey = (keyName) => {
      const anonKey = `anonymous_${keyName}`;
      const userKey = `${newUserId}_${keyName}`;
      const anonData = localStorage.getItem(anonKey);
      const existingUserData = localStorage.getItem(userKey);
      
      console.log(`Migrating ${keyName}:`, {
        anonKey,
        userKey,
        hasAnonData: !!anonData,
        hasUserData: !!existingUserData
      });
      
      if (anonData) {
        if (!existingUserData) {
          // Nu există date pentru utilizator, copiază din anonim
          localStorage.setItem(userKey, anonData);
          console.log(`Migrated ${keyName} from anonymous to user`);
        } else {
          // Există deja date pentru utilizator, merge-uiește
          try {
            const anonParsed = JSON.parse(anonData);
            const userParsed = JSON.parse(existingUserData);
            
            if (keyName === 'favorites' && Array.isArray(anonParsed) && Array.isArray(userParsed)) {
              // Pentru favorite, combină listele
              const combined = [...new Set([...userParsed, ...anonParsed])];
              localStorage.setItem(userKey, JSON.stringify(combined));
              console.log(`Merged ${keyName}: combined ${anonParsed.length} anonymous with ${userParsed.length} user favorites`);
            } else if (keyName === 'pendingItinerary') {
              // Pentru itinerary, combină items-urile
              const anonItems = anonParsed.items || [];
              const userItems = userParsed.items || [];
              const existingNames = new Set(userItems.map(item => item.name));
              const newItems = anonItems.filter(item => !existingNames.has(item.name));
              
              if (newItems.length > 0) {
                const combined = {
                  ...userParsed,
                  items: [...userItems, ...newItems]
                };
                localStorage.setItem(userKey, JSON.stringify(combined));
                console.log(`Merged ${keyName}: added ${newItems.length} new items to existing itinerary`);
              }
            }
          } catch (e) {
            console.error(`Error merging ${keyName}:`, e);
            // În caz de eroare, păstrează datele utilizatorului
          }
        }
        // Șterge datele anonime după migrare
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

  // Reîncarcă favorites-urile când se schimbă utilizatorul
  const loadFavorites = () => {
    const userFavorites = UserStorage.getUserData('favorites', []);
    console.log('Loading favorites for user:', UserStorage.getCurrentUserId(), userFavorites);
    setFavorites(new Set(userFavorites));
  };

  useEffect(() => {
    loadFavorites();
    
    // Listener pentru schimbări în localStorage (pentru sincronizare între tab-uri)
    const handleStorageChange = (e) => {
      const currentUserId = UserStorage.getCurrentUserId();
      if (e.key === `${currentUserId}_favorites`) {
        loadFavorites();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Listener pentru schimbări în currentUser
    const handleUserChange = () => {
      loadFavorites();
    };
    
    // Verifică periodic pentru schimbări de utilizator
    const interval = setInterval(() => {
      const currentFavoritesKey = UserStorage.getUserKey('favorites');
      const currentFavorites = localStorage.getItem(currentFavoritesKey);
      if (currentFavorites) {
        const parsed = JSON.parse(currentFavorites);
        if (JSON.stringify([...favorites]) !== JSON.stringify(parsed)) {
          loadFavorites();
        }
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const toggleFavorite = (placeName) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(placeName)) {
        newFavorites.delete(placeName);
      } else {
        newFavorites.add(placeName);
      }
      const favoritesArray = [...newFavorites];
      UserStorage.setUserData('favorites', favoritesArray);
      console.log('Updated favorites for user:', UserStorage.getCurrentUserId(), favoritesArray);
      return newFavorites;
    });
  };

  return { favorites, toggleFavorite };
};

// Hook pentru itinerary specific utilizatorului
export const useUserItinerary = () => {
  const [itinerary, setItinerary] = useState([]);

  const loadItinerary = () => {
    const userItinerary = UserStorage.getUserData('pendingItinerary', { items: [] });
    console.log('Loading itinerary for user:', UserStorage.getCurrentUserId(), userItinerary);
    setItinerary(userItinerary.items || []);
  };

  useEffect(() => {
    loadItinerary();
    
    // Listener pentru schimbări în localStorage
    const handleStorageChange = (e) => {
      const currentUserId = UserStorage.getCurrentUserId();
      if (e.key === `${currentUserId}_pendingItinerary`) {
        loadItinerary();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Verifică periodic pentru schimbări
    const interval = setInterval(() => {
      const currentItineraryKey = UserStorage.getUserKey('pendingItinerary');
      const currentItinerary = localStorage.getItem(currentItineraryKey);
      if (currentItinerary) {
        const parsed = JSON.parse(currentItinerary);
        const currentItems = parsed.items || [];
        if (JSON.stringify(itinerary) !== JSON.stringify(currentItems)) {
          loadItinerary();
        }
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
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
      console.log('Added to itinerary for user:', UserStorage.getCurrentUserId(), place.name);
    }
  };

  const removeFromItinerary = (placeName) => {
    const updated = itinerary.filter(item => item.name !== placeName);
    setItinerary(updated);
    UserStorage.setUserData('pendingItinerary', {
      items: updated,
      title: "My Itinerary"
    });
    console.log('Removed from itinerary for user:', UserStorage.getCurrentUserId(), placeName);
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