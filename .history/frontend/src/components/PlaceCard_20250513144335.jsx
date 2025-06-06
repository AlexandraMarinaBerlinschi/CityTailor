const PlaceCard = ({ name, lat, lon, rating, pictures, minimumDuration }) => {
  const fallbackImage =
    "https://raw.githubusercontent.com/AlexandraMarinaBerlinschi/poze-is/main/image-editing.png";

  const imageUrl =
    pictures && pictures.length > 0
      ? pictures[0].url || pictures[0]
      : fallbackImage;

  // Formatare rating pentru a afișa o singură zecimală dacă este necesar
  const formattedRating = rating ? Number(rating).toFixed(1) : null;

  return (
    <div className="bg-white rounded shadow p-4 mb-6 flex flex-col md:flex-row gap-4">
      <img
        src={imageUrl}
        alt={name}
        className="w-full md:w-48 h-32 object-cover rounded"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = fallbackImage;
        }}
      />

      <div className="flex-1">
        <h2 className="text-lg font-semibold mb-3">{name}</h2>

        <div className="flex flex-wrap gap-2 mb-3">
          {/* Badge pentru rating */}
          {formattedRating && (
            <span className="bg-yellow-100 text-yellow-800 text-sm font-medium px-2.5 py-0.5 rounded flex items-center">
              <svg className="w-4 h-4 text-yellow-400 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 22 20">
                <path d="M20.924 7.625a1.523 1.523 0 0 0-1.238-1.044l-5.051-.734-2.259-4.577a1.534 1.534 0 0 0-2.752 0L7.365 5.847l-5.051.734A1.535 1.535 0 0 0 1.463 9.2l3.656 3.563-.863 5.031a1.532 1.532 0 0 0 2.226 1.616L11 17.033l4.518 2.375a1.534 1.534 0 0 0 2.226-1.617l-.863-5.03L20.537 9.2a1.523 1.523 0 0 0 .387-1.575Z"/>
              </svg>
              {formattedRating}
            </span>
          )}
          
          {/* Badge pentru durată */}
          {minimumDuration && (
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
              <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              {minimumDuration}
            </span>
          )}
          
          {/* Badge pentru locație */}
          {lat && lon && (
            <span className="bg-gray-100 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded">
              <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              {lat.toFixed(4)}, {lon.toFixed(4)}
            </span>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          {lat && lon && (
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 transition"
            >
              <button className="flex items-center gap-1 px-3 py-1 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                Vezi pe hartă
              </button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaceCard;