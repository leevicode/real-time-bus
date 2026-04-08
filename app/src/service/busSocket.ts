const makeSocket = () => new WebSocket("ws://localhost:5000/api/bus");

export { makeSocket };