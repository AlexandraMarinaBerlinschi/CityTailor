import { Link, useNavigate } from "react-router-dom";
import { User, LogOut, ChevronDown } from "lucide-react";
import { useState } from "react";
import UserStorage from "../pages/userStorage";

const Navbar = ({ isAuthenticated, setIsAuthenticated, user, setUser }) => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    UserStorage.onUserLogout();

    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
    
    setIsAuthenticated(false);
    setUser(null);
    setShowUserMenu(false);

    navigate("/login");
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  return (
    <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center relative">
      <h1 className="text-xl font-bold text-blue-700">CityTailor</h1>
      
      <div className="flex items-center gap-4">
        <ul className="flex gap-4">
          <li>
            <Link to="/home" className="text-gray-700 hover:text-blue-600">Home</Link>
          </li>
          <li>
            <Link to="/questionnaire" className="text-gray-700 hover:text-blue-600">Questionnaire</Link>
          </li>
          <li>
            <Link to="/recommendations" className="text-blue-600 hover:underline">Recommendations</Link>
          </li>
          <li>
            <Link to="/itinerary" className="text-gray-700 hover:text-blue-600">My itinerary</Link>
          </li>
        </ul>

        {/* User Section */}
        {isAuthenticated && user ? (
          <div className="relative">
            <button
              onClick={toggleUserMenu}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
              <span className="text-gray-700 font-medium">
                {user.username || user.email?.split('@')[0] || 'User'}
              </span>
              <ChevronDown 
                size={16} 
                className={`text-gray-500 transition-transform duration-200 ${
                  showUserMenu ? 'rotate-180' : ''
                }`} 
              />
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {user.username || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                
                <Link 
                  to="/profile" 
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  onClick={() => setShowUserMenu(false)}
                >
                  <User size={16} />
                  Profile
                </Link>
                
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link 
            to="/login" 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Login
          </Link>
        )}
      </div>

      {/* Backdrop to close menu when clicking outside */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </nav>
  );
};

export default Navbar;