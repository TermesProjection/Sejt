const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Statikus fájlok kiszolgálása
app.use(express.static(path.join(__dirname, 'public')));

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const wss = new WebSocket.Server({ server });

// Játékállapot
const gameState = {
  players: {},
  foods: [],
  npcs: [],
  powerups: []
};

// Kezdeti ételek generálása
function generateFood(count) {
  for (let i = 0; i < count; i++) {
    gameState.foods.push({
      x: Math.random() * 5000,
      y: Math.random() * 5000,
      radius: 5,
      color: getRandomColor(),
      id: Math.random().toString(36).substr(2, 9)
    });
  }
}

function getRandomColor() {
  return '#' + Math.floor(Math.random()*16777215).toString(16);
}

wss.on('connection', (ws) => {
  const playerId = Math.random().toString(36).substr(2, 9);
  
  gameState.players[playerId] = {
    x: Math.random() * 5000,
    y: Math.random() * 5000,
    radius: 20,
    color: getRandomColor(),
    score: 0,
    name: `Player_${Math.floor(Math.random() * 1000)}`
  };

  // Kezdeti állapot küldése
  ws.send(JSON.stringify({
    type: 'init',
    playerId,
    ...gameState
  }));

  // Üzenetek kezelése
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    const player = gameState.players[playerId];

    switch(data.type) {
      case 'move':
        player.x = data.x;
        player.y = data.y;
        break;
      case 'split':
        if (player.radius > 30) {
          player.radius /= 2;
        }
        break;
      case 'eject':
        if (player.radius > 20) {
          player.radius -= 2;
        }
        break;
    }

    broadcastGameState();
  });

  // Kapcsolat bontása
  ws.on('close', () => {
    delete gameState.players[playerId];
    broadcastGameState();
  });
});

function broadcastGameState() {
  const state = {
    type: 'update',
    ...gameState
  };

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(state));
    }
  });
}

// Kezdeti elemek generálása
generateFood(200);
