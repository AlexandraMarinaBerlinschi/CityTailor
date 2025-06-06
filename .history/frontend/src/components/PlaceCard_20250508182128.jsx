import React from "react";
import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";

const fallbackImage =
  "https://raw.githubusercontent.com/AlexandraMarinaBerlinschi/poze-is/main/image-editing.png";

const PlaceCard = ({ place }) => {
  const {
    name,
    lat,
    lon,
    rating,
    pictures,
    minimumDuration,
  } = place;

  const imageUrl = pictures && pictures.length > 0 ? pictures[0] : fallbackImage;

  return (
    <Card className="flex flex-row p-4 mb-4 items-start gap-4">
      <img
        src={imageUrl}
        alt={name}
        className="w-32 h-24 object-cover rounded-lg"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = fallbackImage;
        }}
      />
      <div>
        <h3 className="text-lg font-bold mb-1">{name}</h3>
        {rating && (
          <p className="flex items-center gap-1 text-yellow-600">
            <Star size={16} /> Rating: {rating}
          </p>
        )}
        {minimumDuration && (
          <p>Duration: {minimumDuration.replace("PT", "").toLowerCase()}</p>
        )}
        <p className="text-sm text-gray-500">Location: {lat}, {lon}</p>
      </div>
    </Card>
  );
};

export default PlaceCard;
