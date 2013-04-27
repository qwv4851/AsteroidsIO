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
var bulletId = 0;
var bulletLifetime = 500;
var colors = ["#f00", "#0f0", "#00f", "#f0f", "#ff0", "#0ff", "#fff"];
var colorIndex = 0;

io.sockets.on('connection', function(socket) {
	if (Object.keys(clients).length === 0) {
		io.sockets.emit('reset');
	}

	clients[socket.id] = {
		ship: new game.Ship()
	};
	clients[socket.id].ship.color = colors[colorIndex++ % colors.length];
	addShip(socket.id, clients[socket.id].ship);
	socket.emit('setMyShip', socket.id);

	socket.on('disconnect', function() {
		io.sockets.emit("removeShip", socket.id);
		delete clients[socket.id];
	});

	socket.on('shoot', function() {
		var ship = clients[socket.id].ship;
		var bullet = game.shoot(ship);
		var id = bulletId++;
		bullets[id] = bullet;
		io.sockets.emit("addBullet", id, bullet);
		setTimeout(function() {
			removeBullet(id);
		}, bulletLifetime);
	});

	socket.on('moveLeft', function() {
		var ship = clients[socket.id].ship;
		game.moveLeft(ship);
	});

	socket.on('moveRight', function() {
		var ship = clients[socket.id].ship;
		game.moveRight(ship);
	});

	socket.on('moveUp', function() {
		var ship = clients[socket.id].ship;
		game.moveUp(ship);
	});

	socket.on('moveDown', function() {
		var ship = clients[socket.id].ship;
		game.moveDown(ship);
	});

	socket.on('message', function(message) {
		socket.broadcast.send(message);
	});

	setInterval(updateLoop, 0);
});

updateLoop = (function() {
	var loops = 0,
		skipTicks = 1000 / game.fps,
		maxFrameSkip = 10,
		nextGameTick = new Date().getTime();
	return function() {
		loops = 0;
		while (new Date().getTime() > nextGameTick && loops < maxFrameSkip) {
			update();
			nextGameTick += skipTicks;
			loops++;
		}
	};
})();

function addShip(id, ship) {
	io.sockets.emit('addShip', id, ship);
}

function removeBullet(id) {
	delete bullets[id];
	io.sockets.emit("removeBullet", id);
}

function update() {
	updateShips();
	updateBullets();
}

function updateShips() {
	for (var i in clients) {
		var ship = clients[i].ship;
		game.updateShip(ship);
		addShip(i, ship);
	}
}

function updateBullets() {
	for (var i in bullets) {
		var bullet = bullets[i];
		game.updateBullet(bullets[i]);
		checkCollision(bullet, i);
	}
}

function checkCollision(bullet, id) {
	for (var j in clients) {
		var ship = clients[j].ship;
		if (bullet.owner === ship) continue;
		if (game.pointInRect(bullet.pos, game.getBounds(ship, 10))) {
			removeBullet(id);
			game.damageShip(ship, bullet.damage);
			if (ship.life <= 0) {
				game.respawnShip(ship);
			}
		}
	}
}