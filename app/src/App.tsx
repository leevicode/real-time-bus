import { useState, useEffect, } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import { getSocket } from "./service/busSocket";
import { getApiBaseUrl } from "./service/routeService";
import type { Shape } from "./types/shape";
import type { Route } from "./interfaces/route";
import type { Bus } from "./interfaces/bus";
import { BusPopup } from "./component/busPopup";

function App() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedRouteShapes, setSelectedRouteShapes] = useState<Shape[]>([]);

  useEffect(() => {
    fetch(getApiBaseUrl() + "/api/routes/jyväskylä")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch routes");
        return res.json();
      })
      .then((data) => {
        setRoutes(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    getSocket()
      .then((socket) => {
        console.log("resolved");
        socket.onopen = () => console.log('Connected');
        socket.onmessage = (event) => {
          setBuses(JSON.parse(event.data));
        };
        socket.onclose = () => console.log('Disconnected');
      })
      .catch((error) => {
        setError(error.message);
      });
  }, []);

  const getRoute = (routeId: string) => routes.find((r) => r.route_id == routeId);

  const map_position: [number, number] = [62.24147, 25.72088];

  // Fetch shape points when a bus is clicked
  const fetchRouteShape = async (routeId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/shapes/jyväskylä/${routeId}`);
      if (!res.ok) throw new Error("Failed to load shape");
      const data = await res.json();
      setSelectedRouteShapes(data.shapes || []);
    } catch (err) {
      console.error("Shape fetch error:", err);
      setSelectedRouteShapes([]);
    }
  };

  const handleBusClick = (bus: Bus) => {
    const route = bus.trip?.routeId ? getRoute(bus.trip.routeId) : undefined;
    if (route) {
      fetchRouteShape(route.route_id);
    } else {
      console.warn("No route metadata found for bus", bus);
    }
  };

  if (loading) return <div>Loading routes...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Waltti Routes in Jyväskylä</h1>
      <MapContainer center={map_position} zoom={13} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {selectedRouteShapes.map((points, idx) => (
  <Polyline key={idx} positions={points} color="blue" weight={4} opacity={0.7} />
        ))}
        {
          <div style={{ position: "absolute", bottom: 10, left: 10, background: "white", padding: "4px 8px", borderRadius: 4, zIndex: 1000 }}>
            Loading route...
          </div>
        }
        {buses.map((bus) => {
          const route = bus.trip?.routeId ? getRoute(bus.trip.routeId) : undefined;
          return (
            <Marker
              key={bus.vehicle.id}
              position={[bus.position.latitude, bus.position.longitude]}
              eventHandlers={{ click: () => handleBusClick(bus) }}
            >
              <BusPopup route={route} />
            </Marker>
          );
        })}
      </MapContainer>
      <p> end</p>
    </div>
  );
}

export default App;
