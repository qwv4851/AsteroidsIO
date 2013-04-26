var canvas;
var ctx;
var fps = 30;
var ships;
var bullets;
var socket;
var bounds = {
	width: 400,
	height: 400
};
var localShip;
var keys = [];

function Ship() {
	this.angle = 0;
	this.pos = {
		x: 40,
		y: 40
	};
	this.velocity = {
		x: 0,
		y: 0
	};
	this.speed = 0.2,
	this.rotSpeed = 0.2;
	this.maxSpeed = 10;
}

if (typeof(window) != "undefined") window.onload = function() {
	canvas = document.getElementById("myCanvas");
	ctx = canvas.getContext("2d");
	ctx.fillStyle = "white";
	resetGame();
	initSocket();

	window.addEventListener('keydown', function(event) {
		keys[event.keyCode] = true;
	}, false);
	window.addEventListener('keyup', function(event) {
		keys[event.keyCode] = false;
	}, false);

	setInterval(updateLoop, 0);
};

function resetGame() {
	ships = {};
	bullets = [];
	localShip = new Ship();
	ships["localShip"] = localShip;
}

function initSocket() {
	socket = io.connect();
	socket.on('removeShip', function(id) {
		delete ships[id];
	});
	socket.on('addShip', function(id, ship) {
		ships[id] = ship;
	});
	socket.on('addBullet', function(id, bullet) {
		bullets[id] = bullet;
	});
	socket.on('removeBullet', function(id) {
		delete bullets[id];
	});
	socket.on('reset', resetGame);
}

updateLoop = (function() {
	var loops = 0,
		skipTicks = 1000 / fps,
		maxFrameSkip = 10,
		nextGameTick = new Date().getTime();
	return function() {
		loops = 0;
		while (new Date().getTime() > nextGameTick && loops < maxFrameSkip) {
			update();
			nextGameTick += skipTicks;
			loops++;
		}
		if (loops) draw();
	};
})();

function draw() {
	ctx.beginPath();
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	drawShips();
	drawBullets();
}

function drawShips() {
	for (var i in ships) {
		var ship = ships[i];
		var color = i == "localShip" ? "red" : "white";
		drawShip(ship.pos, ship.angle, color);
	}
}

function drawBullets() {
	for (var i in bullets) {
		drawBullet(bullets[i]);
	}
}

function update() {
	updateInput();
	updateShips();
	updateBullets();
}

function updateInput() {
	if (keys[32]) {
		if (socket) socket.emit("shoot");
		if (localShip) shoot(localShip);
	}
	if (keys[37]) {
		if (socket) socket.emit("moveLeft");
		if (localShip) moveLeft(localShip);
	}
	if (keys[38]) {
		if (socket) socket.emit("moveUp");
		if (localShip) moveUp(localShip);
	}

	if (keys[39]) {
		if (socket) socket.emit("moveRight");
		if (localShip) moveRight(localShip);
	}

	if (keys[40]) {
		if (socket) socket.emit("moveDown");
		if (localShip) moveDown(localShip);
	}
}

function updateShips() {
	for (var i in ships) {
		var ship = ships[i];
		updateShip(ship);
	}
}

function updateShip(ship) {
	addVec(ship.pos, ship.velocity);
	fixBounds(ship.pos);
}

function updateBullets() {
	for (var i in bullets) {
		var bullet = bullets[i];
		updateBullet(bullet);
	}
}

function updateBullet(bullet) {
	var r = rotateScalar(bullet.speed, bullet.angle);
	addVec(bullet.pos, r);
	fixBounds(bullet.pos);
}

function drawBullet(bullet) {
	ctx.fillRect(bullet.pos.x - 2, bullet.pos.y - 2, bullet.scale, bullet.scale);
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
	return bullet;
}

function fixBounds(pos) {
	if (pos.x < 0) pos.x = bounds.width;
	else if (pos.x > bounds.width) pos.x = 0;
	if (pos.y < 0) pos.y = bounds.height;
	else if (pos.y > bounds.height) pos.y = 0;
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

function drawShip(pos, angle, color) {
	ctx.strokeStyle = color;
	ctx.beginPath();
	var scale = 2;
	var p = [{
		x: -3,
		y: 4
	}, {
		x: 7,
		y: 0
	}, {
		x: -3,
		y: -4
	}];
	var rotated = [];
	for (var i = 0; i < 3; i++) {
		var r = rotateVec(p[i]);
		rotated[i] = {};
		rotated[i].x = pos.x + (p[i].x * Math.cos(angle) - p[i].y * Math.sin(angle)) * scale;
		rotated[i].y = pos.y + (p[i].y * Math.cos(angle) + p[i].x * Math.sin(angle)) * scale;
	}
	drawLine(rotated[0], rotated[1]);
	drawLine(rotated[0], rotated[2]);
	drawLine(rotated[1], rotated[2]);
}

function drawLine(p0, p1) {
	ctx.moveTo(p0.x, p0.y);
	ctx.lineTo(p1.x, p1.y);
	ctx.stroke();
}

function clone(o) {
	return {
		x: o.x,
		y: o.y
	};
}

if (typeof(module) != "undefined") module.exports = {
	moveLeft: moveLeft,
	moveRight: moveRight,
	moveUp: moveUp,
	moveDown: moveDown,
	addVec: addVec,
	clampVec: clampVec,
	clamp: clamp,
	rotateVec: rotateVec,
	rotateScalar: rotateScalar,
	fixBounds: fixBounds,
	clone: clone,
	fps: fps,
	bounds: bounds,
	shoot: shoot,
	updateShip: updateShip,
	updateBullet: updateBullet,
	Ship: Ship
};