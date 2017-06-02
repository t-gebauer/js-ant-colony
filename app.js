const SNACK_COUNT = 25
const ANT_COUNT = 50

let canvas = document.createElement('canvas')
canvas.width = 800
canvas.height = 600
document.body.appendChild(canvas)

let context = canvas.getContext('2d')

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x
    this.y = y
  }
  add(other) {
    let v = new Vector()
    v.x = this.x + other.x
    v.y = this.y + other.y
    return v
  }
  sub(other) {
    let v = new Vector()
    v.x = this.x - other.x
    v.y = this.y - other.y
    return v
  }
  scale(val) {
    let v = new Vector()
    v.x = this.x * val
    v.y = this.y * val
    return v
  }
  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }
  norm() {
    let v = new Vector(this.x, this.y)
    return v.scale(1/v.magnitude())
  }
  distance(other) {
    return other.sub(this).magnitude()
  }
  angle(other) {
    let angle = Math.atan2(other.y, other.x) - Math.atan2(this.y, this.x)
    if (angle < 0) {
      angle += 2 * Math.PI
    }
    return angle
  }
  // returns a random vector with magnitude 1
  static random() {
    return (new Vector(Math.random() - 0.5, Math.random() - 0.5)).norm()
  }
}

class WorldObject {
  constructor(pos = new Vector()) {
    this.pos = pos
  }
  update() {}
}

class RectangularObject extends WorldObject {
  constructor(pos, size, color) {
    super(pos)
    this.size = size
    this.color = color
  }
  draw(context) {
    context.fillStyle = this.color
    fillRectCenter(context, this.pos.x, this.pos.y, this.size, this.size)
  }
}

class Nest extends RectangularObject {
  constructor(pos) {
    super(pos, 10, 'green')
  }
}

class Ant extends RectangularObject {
  constructor(pos) {
    super(pos, 3, 'red')
    this.speed = 25
    this.sensorRange = 20
    this.velocity = Vector.random()
    this.carriesSnack = false
  }
  update(delta) {
    let {type, obj} = this.scan()
    if (this.carriesSnack) {
      if (this.pos.distance(nest.pos) < this.size) {
        this.carriesSnack = false
        this.velocity = Vector.random()
      } else {
        if (!type) {
          trails.push(new Trail(this.pos))
        }
      }
    } else {
      if (type === 'snack') {
        let snack = obj
        if (this.pos.distance(snack.pos) < this.size) {
          this.carriesSnack = true
          this.velocity = nest.pos.sub(this.pos).norm()
          snack.value -= 1
        } else {
          this.velocity = snack.pos.sub(this.pos).norm()
        }
      } else if (type === 'trail') {
        let trail = obj
        let nestToTrail = trail.pos.sub(nest.pos).norm()
        if (this.pos.distance(trail.pos) < this.size) {
          // move along trail
          this.velocity = nestToTrail
        } else {
          // move to trail; or random if at end
          let thisToTrail = trail.pos.sub(this.pos).norm()
          let angle = thisToTrail.angle(nestToTrail)
          if (angle > Math.PI * 0.8 && angle < Math.PI * 1.2) {
            this.velocity = nestToTrail
          } else {
            this.velocity = thisToTrail
          }
        }
      } else {
        if (this.pos.distance(nest.pos) > 333) {
          // to far from home -> go somewhere random
          this.velocity = randomPos().sub(this.pos).norm()
        }
      }
    }
    this.move(delta)
  }
  move(delta) {
    this.pos = this.pos.add(this.velocity.scale(this.speed * delta))
  }
  scan() {
    for (let snack of snacks) {
      if (this.pos.distance(snack.pos) < this.sensorRange) {
        return {type: 'snack', obj: snack}
      }
    }
    let trail = trails.filter((t) => this.pos.distance(t.pos) < this.sensorRange).sort((a, b) => a.lifetime - b.lifetime).sort((a, b) => a.nestDist - b.nestDist).pop()
    if (trail) {
      return {type: 'trail', obj: trail}
    }
    return {}
  }
}

class Snack extends RectangularObject {
  constructor(pos) {
    super(pos, 6, 'yellow')
    this.value = randomInt(25)
  }
}

class Trail extends RectangularObject {
  constructor(pos) {
    super(pos, 1, 'yellow')
    this.lifetime = 10.0
    this.nestDist = this.pos.distance(nest.pos)
  }
  update(delta) {
    this.lifetime -= delta
  }
}

let fps = 60

function update(delta) {
  for (ant of ants) {
    ant.update(delta)
  }
  for (trail of trails) {
    trail.update(delta)
  }
  snacks = snacks.filter((e) => e.value > 0)
  if (snacks.length < SNACK_COUNT) {
    snacks.push(new Snack(randomPos()))
  }
  trails = trails.filter((e) => e.lifetime > 0)

  if (delta > 0) {
    fps = (fps + Math.floor(1 / delta)) / 2
  }
}

function fillRectCenter(context, x, y, w, h) {
  context.fillRect(x - w/2, y - h/2, w, h)
}

function draw() {
  // clear background
  context.fillStyle = 'rgb(22,22,22)'
  context.fillRect(0, 0, canvas.width, canvas.height)

  nest.draw(context)

  for (trail of trails) {
    trail.draw(context)
  }
  for (snack of snacks) {
    snack.draw(context)
  }
  for (ant of ants) {
    ant.draw(context)
  }

  context.fillText(`fps: ${Math.round(fps)}`, 5, 10)
}


// returns a random integer between 0 and max (inclusive)
function randomInt(max) {
  return Math.floor((Math.random() * (max + 1)));
}

function randomPos() {
  return new Vector(randomInt(canvas.width), randomInt(canvas.height))
}

let lastTime = 0

function animate(time = 0) {
  let delta = time - lastTime
  lastTime = time
  window.requestAnimationFrame(animate)
  update(delta / 1000)
  draw()
}

let center = new Vector(canvas.width / 2, canvas.height / 2)
let nest = new Nest(center)
let ants = []
for (let i = 0; i < ANT_COUNT; i++) {
  ants.push(new Ant(center))
}
let snacks = []
for (let i = 0; i < SNACK_COUNT; i++) {
  snacks.push(new Snack(randomPos()))
}
let trails = []
animate()
