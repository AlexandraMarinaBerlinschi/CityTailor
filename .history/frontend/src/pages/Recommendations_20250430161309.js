import { useLocation } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

const Recommendations = () => {
  const location = useLocation();
  const recommendations = location.state?.recommendations || [];
  const city = location.state?.city || "";
  const lat = location.state?.lat || 48.8566;
  const lon = location.state?.lon || 2.3522;

  const defaultCenter = [lat, lon];

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Personalized Recommendations</h1>

      <h2 className="text-lg font-medium mb-4 text-gray-700">
        Showing recommendations in <span className="font-semibold">{city}</span>
      </h2>

      <div className="h-[400px] mb-8 rounded overflow-hidden shadow">
        <MapContainer center={defaultCenter} zoom={13} className="h-full w-full">
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {recommendations.map((item, index) => (
            <Marker key={index} position={[item.lat, item.lon]}>
              <Popup>
                <strong>{item.name}</strong><br />
                {item.dist}m away
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <ul className="list-disc list-inside space-y-2">
        {recommendations.map((item, index) => (
          <li key={index} className="bg-gray-100 rounded p-3 shadow">
            {item.name} — {item.dist}m
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Recommendations;
