import { useEffect, useState } from "react";
import axios from "axios";

const PlaceCard = ({ xid, name, dist }) => {
  const [details, setDetails] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await axios.get(`http://localhost:8000/place-details/${xid}`);
        setDetails(res.data);
      } catch (err) {
        console.error("Failed to fetch details", err);
      }
    };

    fetchDetails();
  }, [xid]);

  return (
    <div className="bg-white rounded shadow p-4 mb-4 flex flex-col md:flex-row gap-4">
      {details?.preview?.source && (
        <img
          src={details.preview.source}
          alt={details.name || name}
          className="w-full md:w-48 h-32 object-cover rounded"
        />
      )}

      <div className="flex-1">
        <h2 className="text-lg font-semibold">{details?.name || name}</h2>
        <p className="text-sm text-gray-600 mb-2">{dist}m away</p>
        {details?.wikipedia_extracts?.text && (
          <p className="text-sm text-gray-800">{details.wikipedia_extracts.text}</p>
        )}
      </div>
    </div>
  );
};

export default PlaceCard;
