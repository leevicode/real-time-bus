import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup} from "react-leaflet";
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
    const sock = new WebSocket("ws://localhost:5000/api/bus");

    sock.onopen = () => console.log('Connected');
    sock.onmessage = (event) => {
      setBuses(JSON.parse(event.data));
    };
    sock.onclose = () => console.log('Disconnected');

    // Cleanup on unmount
    return () => sock.close();

  });

  const getRoute = (routeId) => routes.find((r) => r.route_id == routeId);

  const map_position = [62.24147, 25.72088];
  if (loading) return <div>Loading routes...</div>;
  if (error) return <div>Error: {error}</div>;
  return (
    <div style={{ /*padding: "20px"*/ }}>
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
              <p>
                {getRoute(bus.trip.routeId).route_short_name}

              </p>
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
