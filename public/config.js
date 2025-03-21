export const CONFIG = {
    ICE_SERVERS: {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" }
        ]
    },
    SOCKET_URL: "https://screen-sharing-app.onrender.com",
    SOCKET_OPTIONS: {
        transports: ["websocket", "polling"]
    }
};
