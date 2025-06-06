import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import jsPDF from "jspdf";
import "jspdf-autotable";

const Itinerary = () => {
  const [itinerary, setItinerary] = useState([]);
  const [title, setTitle] = useState("Itinerariul meu");

  const handleOnDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(itinerary);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setItinerary(items);
  };

  const removeFromItinerary = (index) => {
    const updated = [...itinerary];
    updated.splice(index, 1);
    setItinerary(updated);
  };

  const exportItinerary = (format) => {
    if (format === "json") {
      const dataStr =
        "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(itinerary));
      const downloadAnchorNode = document.createElement("a");
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "itinerary.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } else if (format === "csv") {
      const csvRows = [
        ["Name", "Latitude", "Longitude", "Duration", "Rating"],
        ...itinerary.map((item) => [
          item.name,
          item.lat,
          item.lon,
          item.duration,
          item.rating,
        ]),
      ];
      const csvContent =
        "data:text/csv;charset=utf-8," +
        csvRows.map((e) => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "itinerary.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } else if (format === "pdf") {
      const doc = new jsPDF();
      doc.autoTable({
        head: [["Name", "Latitude", "Longitude", "Duration", "Rating"]],
        body: itinerary.map((item) => [
          item.name,
          item.lat,
          item.lon,
          item.duration,
          item.rating,
        ]),
      });
      doc.save("itinerary.pdf");
    }
  };

  const saveItinerary = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Trebuie să fii autentificat pentru a salva itinerariul.");
      return;
    }

    try {
      // 1. Creează itinerariul
      const res = await fetch("http://localhost:8000/itineraries/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          city: itinerary.length > 0 ? itinerary[0].city || "Unknown" : "Unknown",
          name: title,
          activities: [],
        }),
      });

      if (!res.ok) throw new Error("Eroare la salvarea itinerariului");

      const data = await res.json();
      const itineraryId = data.id;

      // 2. Adaugă activitățile
      for (let i = 0; i < itinerary.length; i++) {
        const activity = itinerary[i];

        await fetch(`http://localhost:8000/itineraries/${itineraryId}/activities`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            activity_id: activity.id,
            name: activity.name,
            lat: activity.lat,
            lon: activity.lon,
            rating: activity.rating,
            duration: activity.minimumDuration || activity.duration,
            picture_url: activity.pictures?.[0]?.url || activity.picture_url || null,
            position: i,
          }),
        });
      }

      alert("Itinerariul a fost salvat cu succes!");
    } catch (error) {
      console.error(error);
      alert("A apărut o eroare la salvarea itinerariului.");
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">My Itinerary</h2>

      <div className="mb-4">
        <label className="block font-semibold mb-1">Titlu itinerariu:</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => exportItinerary("json")}
          className="py-2 px-4 bg-blue-500 text-white rounded"
        >
          Export JSON
        </button>
        <button
          onClick={() => exportItinerary("csv")}
          className="py-2 px-4 bg-green-500 text-white rounded"
        >
          Export CSV
        </button>
        <button
          onClick={() => exportItinerary("pdf")}
          className="py-2 px-4 bg-red-500 text-white rounded"
        >
          Export PDF
        </button>
        <button
          onClick={saveItinerary}
          className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
        >
          Salvează itinerariul
        </button>
      </div>

      <div className="mb-6">
        <MapContainer center={[45.75, 21.23]} zoom={13} style={{ height: "300px" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          />
          {itinerary.map((item, index) => (
            <Marker key={index} position={[item.lat, item.lon]}>
              <Popup>{item.name}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <DragDropContext onDragEnd={handleOnDragEnd}>
        <Droppable droppableId="itinerary">
          {(provided) => (
            <ul
              className="space-y-2"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {itinerary.map((item, index) => (
                <Draggable key={index} draggableId={index.toString()} index={index}>
                  {(provided) => (
                    <li
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="bg-white rounded shadow p-4 flex items-center justify-between"
                    >
                      <span>{item.name}</span>
                      <button
                        onClick={() => removeFromItinerary(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default Itinerary;
