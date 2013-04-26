var app = require('express')(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server);

var game = require('./client');


server.listen(80);

app.get('/', function(req, res) {
	res.sendfile(__dirname + "/index.html");
});

app.get(/^(.+)$/, function(req, res) {
	res.sendfile(__dirname + req.params[0]);
});

var clients = {};
var bullets = [];
var bulletId = 0;
var bulletLifetime = 3000;

io.sockets.on('connection', function(socket) {
	clients[socket.id] = {
		ship: {
			angle: 0,
			pos: {
				x: 40,
				y: 40
			},
			velocity: {
				x: 0,
				y: 0
			},
			speed: 0.1,
			rotSpeed: 0.2,
			maxSpeed: 10
		}
	};
	addShip(socket.id, clients[socket.id].ship);

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
		addShip(socket.id, ship);
	});

	socket.on('moveRight', function() {
		var ship = clients[socket.id].ship;
		game.moveRight(ship);
		addShip(socket.id, ship);
	});

	socket.on('moveUp', function() {
		var ship = clients[socket.id].ship;
		game.moveUp(ship);
		addShip(socket.id, ship);
	});

	socket.on('moveDown', function() {
		var ship = clients[socket.id].ship;
		game.moveDown(ship);
		addShip(socket.id, ship);
	});

	setInterval(update, 1000 / game.fps);
});

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
		game.updateBullet(bullets[i]);
	}
}