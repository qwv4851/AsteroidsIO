var app = require('express')(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server);

io.set('log level', 1);

var game = require('./client');

server.listen(80);

app.get('/', function(req, res) {
	res.sendfile(__dirname + "/index.html");
});

app.get(/^(.+)$/, function(req, res) {
	res.sendfile(__dirname + req.params[0]);
});

// Global setting variables
var clients = {};
var bullets = [];
var bombs = [];
var bulletId = 0;
var bombId = 0;
var bulletLifetime = 500;
var bombLifeTime = 1000;
var colors = ["#f00", "#0f0", "#00f", "#f0f", "#ff0", "#0ff", "#fff"];
var colorIndex = 0;

io.sockets.on('connection', function(socket) {
	if (Object.keys(clients).length === 0) {
		io.sockets.emit('reset');
	}

	clients[socket.id] = {
		ship: new game.Ship(),
		keys: []
	};
	clients[socket.id].ship.color = colors[colorIndex++ % colors.length];
	addShip(socket.id, clients[socket.id].ship);
	socket.emit('setMyShip', socket.id);

	socket.on('disconnect', function() {
		io.sockets.emit("removeShip", socket.id);
		delete clients[socket.id];
	});

	socket.on('keydown', function(keyCode) {
		clients[socket.id].keys[keyCode] = true;
	});

	socket.on('keyup', function(keyCode) {
		clients[socket.id].keys[keyCode] = false;
	});

	socket.on('addMessage', function(name, message) {
		var color = clients[socket.id].ship.color;
		io.sockets.emit('addMessage', name, color, message);
	});

	setInterval(updateLoop, 0);
});

updateLoop = (function() {
	skipTicks = 1000 / game.fps,
	nextGameTick = new Date().getTime();
	return function() {
		while (new Date().getTime() > nextGameTick) {
			for (var i in clients) {
				updateClient(clients[i]);
			}
			update();
			nextGameTick += skipTicks;
		}
	};
})();

function updateClient(client) {
	game.updateInput(client.keys, client.ship);
	var bullet = tryShoot(client.keys, client.ship);
	if (bullet) {
		var id = bulletId++;
		bullets[id] = bullet;
		io.sockets.emit("addBullet", id, bullet);
		setTimeout(function() {
			removeBullet(id);
		}, bulletLifetime);
	}
	var bomb = tryShootBomb(client.keys, client.ship);
	if (bomb) {
		var id = bombId++;
		bombs[id] = bomb;
		io.sockets.emit("addBomb", id, bomb);
		setTimeout(function() {
			removeBomb(id);
		}, bombLifeTime);
	}
}

function tryShoot(keys, ship) {
	if (keys[32] && ship.canFire) {
		var bullet = new game.Bullet(ship);
		setTimeout(function() {
			ship.canFire = true;
		}, bullet.timeout);
		ship.canFire = false;
		return bullet;
	}
}

function tryShootBomb(keys, ship) {
	if (keys[66] && ship.canFireBomb) {
		var bomb = new game.Bomb(ship);
		setTimeout(function() {
			ship.canFireBomb = true;
		}, bomb.timeout);
		ship.canFireBomb = false;
		return bomb;
	}
}

function addShip(id, ship) {
	io.sockets.emit('addShip', id, ship);
}

function removeBullet(id) {
	delete bullets[id];
	io.sockets.emit("removeBullet", id);
}

function removeBomb(id) {
	delete bombs[id];
	io.sockets.emit("removeBomb", id);
}

function update() {
	updateShips();
	updateBullets();
}

function updateShips() {
	for (var i in clients) {
		var ship = clients[i].ship;
		ship.update();
		addShip(i, ship);
	}
}

function updateBullets() {
	for (var i in bullets) {
		var bullet = bullets[i];
		bullet.update();
		checkCollision(bullet, i);
	}
}

function checkCollision(bullet, id) {
	for (var j in clients) {
		var ship = clients[j].ship;
		if (bullet.owner === ship) continue;
		if (game.pointInRect(bullet.pos, game.getBounds(ship, 10))) {
			removeBullet(id);
			ship.damage(bullet.damage);
			if (ship.life <= 0) {
				ship.respawn();
			}
		}
	}
}