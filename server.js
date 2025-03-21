const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Permite conexões de qualquer origem (ajuste se necessário)
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 10000;

// Servir arquivos estáticos da pasta "public"
app.use(express.static(path.join(__dirname, "public")));

// Rota principal (opcional)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Mapeia as salas e as conexões
const broadcasters = new Map();

io.on("connection", (socket) => {
    console.log(`Novo cliente conectado: ${socket.id}`);

    socket.on("join-room", (roomId, role) => {
        socket.join(roomId);
        console.log(`Usuário ${socket.id} entrou na sala ${roomId} como ${role}`);

        if (role === "broadcaster") {
            broadcasters.set(roomId, socket.id);
            socket.broadcast.to(roomId).emit("broadcaster-ready");
        } else if (role === "viewer") {
            const broadcasterId = broadcasters.get(roomId);
            if (broadcasterId) {
                io.to(broadcasterId).emit("viewer-joined", socket.id);
            }
        }
    });

    socket.on("broadcaster-offer", ({ offer, viewerId }) => {
        io.to(viewerId).emit("broadcaster-offer", { offer });
    });

    socket.on("viewer-answer", ({ answer, roomId }) => {
        const broadcasterId = broadcasters.get(roomId);
        if (broadcasterId) {
            io.to(broadcasterId).emit("viewer-answer", { answer, viewerId: socket.id });
        }
    });

    socket.on("broadcaster-ice", ({ candidate, viewerId }) => {
        io.to(viewerId).emit("broadcaster-ice", { candidate });
    });

    socket.on("viewer-ice", ({ candidate, roomId }) => {
        const broadcasterId = broadcasters.get(roomId);
        if (broadcasterId) {
            io.to(broadcasterId).emit("viewer-ice", { candidate, viewerId: socket.id });
        }
    });

    socket.on("disconnect", () => {
        console.log(`Cliente desconectado: ${socket.id}`);

        broadcasters.forEach((broadcasterId, roomId) => {
            if (broadcasterId === socket.id) {
                broadcasters.delete(roomId);
                io.to(roomId).emit("broadcaster-disconnected");
            }
        });
    });
});

// Inicia o servidor
server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
