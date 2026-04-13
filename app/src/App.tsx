import { useState, useEffect, } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { getSocket } from "./service/busSocket";
import { RouteInfo } from "./component/RouteInfo";
import { getApiBaseUrl } from "./apiUrl";
function App() {
  interface Route {
    route_id: string;
    route_short_name?: string;
    route_long_name?: string;
  }

  interface Bus {
    vehicle: {
      id: string;
    };
    position: {
      latitude: number;
      longitude: number;
    };
    trip?: {
      routeId: string;
    };
  }

  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buses, setBuses] = useState<Bus[]>([]);

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
  if (loading) return <div>Loading routes...</div>;
  if (error) return <div>Error: {error}</div>;
  return (
    <div>
      <h1>Waltti Routes in Jyväskylä</h1>
      <ul>
        {routes.map((route) => (
          <li key={route.route_id}>
            <strong>{route.route_short_name || "?"}</strong> –{" "}
            {route.route_long_name || route.route_id}
          </li>
        ))}
      </ul>
      <MapContainer center={map_position} zoom={13} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {buses.map(bus =>
          bus.trip && (
          <Marker key={bus.vehicle.id} position={pos(bus.position)}>
            <Popup>
              <RouteInfo route={getRoute(bus.trip.routeId)} />
            </Popup>
          </Marker>
          )
        )}
      </MapContainer>
      <p> end</p>
    </div>
  );
}

const pos = ({ latitude, longitude }: { latitude: number; longitude: number }): [number, number] => [latitude, longitude];

export default App;
