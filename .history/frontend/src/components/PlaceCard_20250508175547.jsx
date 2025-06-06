const PlaceCard = ({ name, lat, lon, rating, pictures, minimumDuration }) => {
  const imageUrl =
    pictures && pictures.length > 0
      ? pictures[0].url || pictures[0]
      : "https://via.placeholder.com/400x200?text=No+Image";

  return (
    <div className="bg-white rounded shadow p-4 mb-6 flex flex-col md:flex-row gap-4">
      <img
        src={imageUrl}
        alt={name}
        className="w-full md:w-48 h-32 object-cover rounded"
      />

      <div className="flex-1">
        <h2 className="text-lg font-semibold mb-1">{name}</h2>

        {rating && (
          <p className="text-sm text-yellow-600 mb-1">⭐ Rating: {rating}</p>
        )}

        {minimumDuration && (
          <p className="text-sm text-gray-600 mb-1">
            Duration: {minimumDuration}
          </p>
        )}

        <p className="text-xs text-gray-400">
          Location: {lat?.toFixed(4)}, {lon?.toFixed(4)}
        </p>
      </div>
    </div>
  );
};

export default PlaceCard;
