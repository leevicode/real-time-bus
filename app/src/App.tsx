import { useState, useEffect, } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { makeSocket } from "./service/busSocket";
import { RouteInfo } from "./component/RouteInfo";
function App() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buses, setBuses] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/routes/jyväskylä")
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
    const busSocket = makeSocket();
    busSocket.onopen = () => console.log('Connected');
    busSocket.onmessage = (event) => {
      setBuses(JSON.parse(event.data));
    };
    busSocket.onclose = () => console.log('Disconnected');
    // Cleanup on unmount
    return () => busSocket.close();
  }, []);

  const getRoute = (routeId) => routes.find((r) => r.route_id == routeId);

  const map_position = [62.24147, 25.72088];
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

          <Marker key={bus.vehicle.id} position={pos(bus.position)}>
            <Popup>
              <RouteInfo route={getRoute(bus.trip.routeId)}/>
            </Popup>
          </Marker>
        )}
      </MapContainer>
      <p> end</p>
    </div>
  );
}

const pos = ({ latitude, longitude }) => [latitude, longitude];

export default App;
