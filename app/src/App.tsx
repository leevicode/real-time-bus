import { useState, useEffect } from "react";

function App() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (loading) return <div>Loading routes...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>Waltti Routes in Jyväskylä</h1>
      <ul>
        {routes.map((route) => (
          <li key={route.route_id}>
            <strong>{route.route_short_name || "?"}</strong> –{" "}
            {route.route_long_name || route.route_id}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
