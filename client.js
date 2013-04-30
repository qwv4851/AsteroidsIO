var debug = false;

// Gameplay variables and constants
var localShip;
var ships;
var bullets;
var bombs;
var canFire = true;
var canFireBomb = true;

// Implementation variables and constants
var canvas;
var ctx;
var fps = 30;
var dt = 1 / fps;
var socket;
var bounds = {
	width: 400,
	height: 400
};
var myId;
var keys = [];

function Ship(id) {
	this.id = id;
	this.angle = 0;
	this.velocity = {
		x: 0,
		y: 0
	};
	this.speed = 0.2,
	this.rotSpeed = 0.2;
	this.maxSpeed = 10;
	this.maxLife = 10;
	this.life = this.maxLife;
	this.canFire = true;
	this.canFireBomb = true;
	this.color = '#fff';

	this.update = function() {
		addVec(this.pos, this.velocity);
		fixBounds(this.pos);
	};

	this.draw = function(color) {
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
			rotated[i].x = this.pos.x + (p[i].x * Math.cos(this.angle) - p[i].y * Math.sin(this.angle)) * scale;
			rotated[i].y = this.pos.y + (p[i].y * Math.cos(this.angle) + p[i].x * Math.sin(this.angle)) * scale;
		}
		drawLine(rotated[0], rotated[1]);
		drawLine(rotated[0], rotated[2]);
		drawLine(rotated[1], rotated[2]);
	};

	this.damage = function(damage) {
		if (this.invulnerable) return;
		this.life -= damage;
		this.life = clamp(this.life, 0, this.maxLife);
	};

	this.respawn = function() {
		this.life = this.maxLife;
		this.pos = {
			x: 200,
			y: 200
		};
		this.invulnerable = true;

		function setDisplay(color) {
			return function() {
				this.displayColor = color;
			};
		}
		var flashDelay = 150;
		var loops = 8;
		if (isClient()) {
			this.displayColor = this.color;
			for (var i = 0; i < loops; i++) {
				$(this).delay(flashDelay).show(0, setDisplay('#fff')).delay(flashDelay).show(0, setDisplay(this.color));
			}
		}
		var that = this;
		setTimeout(function() {
			that.invulnerable = false;
		}, flashDelay * 2 * loops);
	};
}

function Bullet(ship) {
	if (ship) {
		this.pos = addVec(clone(ship.pos), rotateScalar(5, ship.angle));
		this.owner = ship;
		this.angle = ship.angle;
	}
	this.speed = 12;
	this.scale = 3;
	this.damage = 1;
	this.timeout = 250;

	this.draw = function() {
		ctx.save();
		ctx.fillStyle = this.owner.color;
		ctx.beginPath();
		ctx.arc(this.pos.x, this.pos.y, this.scale, 0, 2 * Math.PI, false);
		ctx.strokeStyle = 'white';
		ctx.lineWidth = Math.max(this.scale / 2, 2);
		ctx.stroke();
		ctx.fill();
		ctx.restore();
	};

	this.update = function() {
		var r = rotateScalar(this.speed, this.angle);
		addVec(this.pos, r);
		fixBounds(this.pos);
	};
}

function Bomb(ship) {
	if (ship) {
		this.pos = addVec(clone(ship.pos), rotateScalar(5, ship.angle));
		this.owner = ship;
		this.angle = ship.angle;
	}
	this.speed = 6;
	this.scale = 5;
	this.timeout = 2500;

	this.draw = function() {
		ctx.save();
		ctx.fillStyle = this.owner.color;
		ctx.beginPath();
		ctx.arc(this.pos.x, this.pos.y, this.scale, 0, 2 * Math.PI, false);
		ctx.strokeStyle = 'white';
		ctx.lineWidth = Math.max(this.scale / 2, 2);
		ctx.stroke();
		ctx.fill();
		ctx.restore();
	};

	this.update = function() {
		var r = rotateScalar(this.speed, this.angle);
		addVec(this.pos, r);
		fixBounds(this.pos);
	};
}

if (typeof(document) != "undefined") $(document).ready(function() {
	canvas = document.getElementById("myCanvas");
	ctx = canvas.getContext("2d");
	ctx.fillStyle = "white";
	resetGame();

	if (typeof(io) != "undefined") initSocket();

	window.addEventListener('keydown', function(event) {
		keys[event.keyCode] = true;
		socket.emit('keydown', event.keyCode);
	}, false);
	window.addEventListener('keyup', function(event) {
		keys[event.keyCode] = false;
		socket.emit('keyup', event.keyCode);
	}, false);

	setInterval(updateLoop, 0);
});

function resetGame() {
	myId = undefined;
	ships = {};
	bullets = [];
	bombs = [];
	if (debug) {
		localShip = new Ship("localShip");
		ships["localShip"] = localShip;
	}
}

function initSocket() {
	socket = io.connect();

	// Ship
	socket.on('removeShip', function(id) {
		delete ships[id];
	});
	socket.on('addShip', function (id, ship) {
		ship.displayColor = ship.color;
		updateShip(id, ship);
	});

	socket.on('updateShip', updateShip);

	socket.on('respawn', function(id) {
		ships[id].respawn();
	});

	function updateShip(id, ship) {
		if (ships[id] === undefined) {
			ships[id] = mergeObjects(new Ship(id), ship);
		} else {
			ships[id] = mergeObjects(ships[id], ship);
		}
	}

	// Bullet
	socket.on('addBullet', function(id, bullet) {
		bullets[id] = mergeObjects(new Bullet(), bullet);
	});
	socket.on('removeBullet', function(id) {
		delete bullets[id];
	});

	// Bomb
	socket.on('addBomb', function(id, bomb) {
		bombs[id] = mergeObjects(new Bomb(), bomb);
	});
	socket.on('removeBomb', function(id) {
		delete bombs[id];
		// TODO
		// Create multiple bullets here
	});

	// Other
	socket.on('reset', resetGame);
	socket.on('setMyShip', function(id) {
		myId = id;
	});
}

updateLoop = (function() {
	var loops = 0,
		skipTicks = 1000 / fps,
		maxFrameSkip = 1000,
		nextGameTick = new Date().getTime();
	return function() {
		loops = 0;
		while (new Date().getTime() > nextGameTick) {
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
	drawBombs();
	if (myId) drawLifebar(ships[myId]);
}

function drawShips() {
	for (var i in ships) {
		var ship = ships[i];
		var color = i == "localShip" ? "red" : (debug ? "white" : ship.displayColor);
		ship.draw(color);
	}
}

function drawLifebar(ship) {
	var bounds = {
		x: 10,
		y: 10,
		width: 150,
		height: 20
	};
	var grd = ctx.createLinearGradient(0, 0, bounds.width, 0);
	ctx.strokeStyle = "#fff";
	var percent = ship.life / ship.maxLife;
	if (percent < 0.5) {
		grd.addColorStop(0, "#400");
		grd.addColorStop(1, "#f00");
	} else {
		grd.addColorStop(0, "#040");
		grd.addColorStop(1, "#0f0");
	}

	ctx.fillStyle = grd;
	ctx.fillRect(bounds.x, bounds.y, bounds.width * percent, bounds.height);
	ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
}

function drawBullets() {
	for (var i in bullets) {
		bullets[i].draw();
	}
}

function drawBombs() {
	for (var i in bombs) {
		bombs[i].draw();
	}
}

function update() {
	if (localShip) updateInput(keys, localShip);
	updateShips();
	updateBullets();
	updateBombs();
}

function updateInput(keys, ship) {

	if (keys[37]) {
		moveLeft(ship, dt);
	}
	if (keys[39]) {
		moveRight(ship, dt);
	}
	if (keys[38]) {
		moveUp(ship, dt);
	} else if (keys[40]) {
		moveDown(ship, dt);
	} else {
		ship.accel = {
			x: 0,
			y: 0
		};
	}
}

function updateShips() {
	for (var i in ships) {
		ships[i].update();
	}
}

function updateBullets() {
	for (var i in bullets) {
		bullets[i].update();
	}
}

function updateBombs() {
	for (var i in bombs) {
		bombs[i].update();
	}
}

function getBounds(ship, offset) {
	return {
		left: ship.pos.x - offset,
		top: ship.pos.y - offset,
		right: ship.pos.x + offset,
		bottom: ship.pos.y + offset
	};
}

function pointInRect(p, r) {
	return p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom;
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

function mergeObjects(obj1, obj2) {
	for (var attrname in obj2) {
		obj1[attrname] = obj2[attrname];
	}
	return obj1;
}

function isClient() {
	return typeof($) != "undefined";
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
	Ship: Ship,
	getBounds: getBounds,
	pointInRect: pointInRect,
	updateInput: updateInput,
	Bomb: Bomb,
	Bullet: Bullet
};