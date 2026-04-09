const BUS_URL = "ws://localhost:5000/api/bus";
const MAX_TIMEOUT = 20000;

const makeSocket = (callBacks: { resolve: (_: WebSocket) => void; reject: (_:any) => void; }, timeout: number) => {
    if (timeout > MAX_TIMEOUT) {
        callBacks.reject("Timed out");
        return;
    }
    setTimeout(() => {
        try {
            callBacks.resolve(new WebSocket(BUS_URL))
        } catch (error) {
            makeSocket(callBacks, 2 * timeout);
        }
    }
    , timeout);
};

const getSocket: () => Promise<WebSocket> = () => new Promise((resolve, reject) => makeSocket({resolve, reject}, 100));

export { getSocket };