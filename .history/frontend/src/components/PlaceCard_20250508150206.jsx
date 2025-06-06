const PlaceCard = ({ name, lat, lon, category, tags, relevance }) => {
  return (
    <div className="bg-white rounded shadow p-4 mb-4">
      <h2 className="text-lg font-semibold mb-1">{name}</h2>

      <p className="text-sm text-gray-600 mb-1">
        {category} {tags?.length > 0 && `— ${tags.join(", ")}`}
      </p>

      {relevance && (
        <p className="text-xs text-gray-500 italic mb-1">
          Relevance Score: {relevance.toFixed(2)}
        </p>
      )}

      <p className="text-xs text-gray-400">
        Location: {lat?.toFixed(4)}, {lon?.toFixed(4)}
      </p>
    </div>
  );
};

export default PlaceCard;
