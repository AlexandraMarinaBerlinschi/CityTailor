
import { Link, useNavigate } from "react-router-dom";
import UserStorage from "../../userStorage";

const Navbar = ({ isAuthenticated, setIsAuthenticated }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    UserStorage.onUserLogout();

    localStorage.removeItem("isAuthenticated");
    setIsAuthenticated(false);

    navigate("/login");
  };

  return (
    <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
      <h1 className="text-xl font-bold text-blue-700">CityTailor</h1>
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
        {isAuthenticated && (
          <li>
            <Link to="/profile" className="text-gray-700 hover:text-blue-600">Profile</Link>
          </li>
        )}
        {!isAuthenticated ? (
          <li>
            <Link to="/login" className="text-blue-600 hover:underline">Login</Link>
          </li>
        ) : (
          <li>
            <button onClick={handleLogout} className="text-red-600 hover:underline">Logout</button>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
