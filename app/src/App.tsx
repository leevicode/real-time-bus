import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
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
    fetch("http://localhost:5000/api/bus/http")
      .then((res) => res.json())
      .then(setBuses)
  }, []);
  const position = [62.24147, 25.72088];
  if (loading) return <div>Loading routes...</div>;
  if (error) return <div>Error: {error}</div>;
  console.log(buses);
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
      <ul>
        {buses.map((bus) => <p key={bus.vehicle.id}>{JSON.stringify(bus)}</p>)}
      </ul>
      <MapContainer center={position} zoom={13} scrollWheelZoom={false}>
        <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
        {buses.map(bus =>
          <Marker key={bus.vehicle.id} position={pos(bus.position)}>
            <Popup>
              A pretty CSS3 popup. <br /> Easily customizable.
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
