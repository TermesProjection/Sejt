const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// statikus fájlok (public mappa)
app.use(express.static("public"));

// játék állapot
let players = {};
let foods = [];
let powerUps = [];
const foodCount = 20;

// random pozíció generálás
function randomPos(max) {
    return Math.floor(Math.random() * max);
}

// induláskor ételek
function initFoods() {
    foods = [];
    for (let i = 0; i < foodCount; i++) {
        foods.push({
            id: `food-${i}-${Date.now()}`,
            x: randomPos(800),
            y: randomPos(600),
            radius: 5
        });
    }
}
initFoods();

// power-up típusok
const powerUpTypes = ["speed", "shield", "slow"];

// power-up spawn
function spawnPowerUp() {
    const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    powerUps.push({
        id: `pu-${Date.now()}`,
        x: randomPos(800),
        y: randomPos(600),
        radius: 8,
        type
    });
}

// power-up időzített spawn
setInterval(() => {
    if (powerUps.length < 3) {
        spawnPowerUp();
    }
}, 5000);

// socket.io események
io.on("connection", (socket) => {
    console.log(`Új játékos: ${socket.id}`);
    players[socket.id] = {
        id: socket.id,
        x: randomPos(800),
        y: randomPos(600),
        radius: 20,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
        speed: 5,
        boost: 1,
        shield: false,
        slowUntil: 0,
        score: 0
    };

    socket.emit("init", { id: socket.id, foods, powerUps, players });

    socket.on("move", (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].radius = data.radius;
            players[socket.id].score = data.score;
            players[socket.id].boost = data.boost;
            players[socket.id].shield = data.shield;
        }
    });

    socket.on("eatFood", (foodId) => {
        foods = foods.filter(f => f.id !== foodId);
        foods.push({
            id: `food-${Date.now()}`,
            x: randomPos(800),
            y: randomPos(600),
            radius: 5
        });
        io.emit("updateFoods", foods);
    });

    socket.on("pickupPowerUp", (puId) => {
        powerUps = powerUps.filter(p => p.id !== puId);
        io.emit("updatePowerUps", powerUps);
    });

    socket.on("disconnect", () => {
        console.log(`Játékos kilépett: ${socket.id}`);
        delete players[socket.id];
        io.emit("removePlayer", socket.id);
    });
});

// játékos állapot szinkronizálás 30 FPS-sel
setInterval(() => {
    io.emit("updatePlayers", players);
}, 33);

server.listen(PORT, () => {
    console.log(`Szerver fut a ${PORT} porton`);
});
