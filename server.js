var app = require('express')(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server);

var fps = 30;
var canvas = {
	width: 400,
	height: 400
};
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
		shoot(ship);
		addShip(socket.id, ship);
	});

	socket.on('moveLeft', function() {
		var ship = clients[socket.id].ship;
		moveLeft(ship);
		addShip(socket.id, ship);
	});

	socket.on('moveRight', function() {
		var ship = clients[socket.id].ship;
		moveRight(ship);
		addShip(socket.id, ship);
	});

	socket.on('moveUp', function() {
		var ship = clients[socket.id].ship;
		moveUp(ship);
		addShip(socket.id, ship);
	});

	socket.on('moveDown', function() {
		var ship = clients[socket.id].ship;
		moveDown(ship);
		addShip(socket.id, ship);
	});

	setInterval(update, 1000 / fps);
});

function addShip(id, ship) {
	io.sockets.emit('addShip', id, ship);
}

function moveLeft(ship) {
	ship.angle -= ship.rotSpeed;
}

function moveRight(ship) {
	ship.angle += ship.rotSpeed;
}

function moveUp(ship) {
	addVec(ship.velocity, rotateScalar(ship.speed, ship.angle));
	clampVec(ship.velocity, -ship.maxSpeed, ship.maxSpeed);
}

function moveDown(ship) {
	addVec(ship.velocity, rotateScalar(-ship.speed, ship.angle));
	clampVec(ship.velocity, -ship.maxSpeed, ship.maxSpeed);
}

function shoot(ship) {
	var bullet = {
		pos: addVec(clone(ship.pos), rotateScalar(5, ship.angle)),
		angle: ship.angle,
		speed: 12,
		scale: 3
	};
	bullets[bulletId++] = bullet;
	io.sockets.emit("addBullet", bulletId, bullet);
}

function addVec(v0, v1) {
	if (v1.x === undefined) {
		v0.x += v1;
		v0.y += v1;
	} else {
		v0.x += v1.x;
		v0.y += v1.y;
	}
	return v0;
}

function clampVec(v, min, max) {
	v.x = clamp(v.x, min, max);
	v.y = clamp(v.y, min, max);
	return v;
}

function clamp(x, min, max) {
	if (x < min) x = min;
	else if (x > max) x = max;
	return x;
}

function update() {
	updateShips();
	updateBullets();
}

function updateShips() {
	for (var i in clients) {
		var ship = clients[i].ship;
		addVec(ship.pos, ship.velocity);
		fixBounds(ship.pos);
		addShip(i, ship);
	}
}

function updateBullets() {
	for (var i in bullets) {
		var bullet = bullets[i];
		var r = rotateScalar(bullet.speed, bullet.angle);
		addVec(bullet.pos, r);
		fixBounds(bullet.pos);
	}
}

function rotateVec(v, angle) {
	return {
		x: v.x * Math.cos(angle) - v.y * Math.sin(angle),
		y: v.y * Math.cos(angle) + v.x * Math.sin(angle)
	};
}

function rotateScalar(x, angle) {
	return rotateVec({
		x: x,
		y: 0
	}, angle);
}

function fixBounds(pos) {
	if (pos.x < 0) pos.x = canvas.width;
	else if (pos.x > canvas.width) pos.x = 0;
	if (pos.y < 0) pos.y = canvas.height;
	else if (pos.y > canvas.height) pos.y = 0;
}

function clone(o) {
	return {
		x: o.x,
		y: o.y
	};
}