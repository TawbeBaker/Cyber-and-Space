/**
 * 3D Asteroid Impact Simulation Engine
 * Based on Newtonian physics and gravitational calculations
 * Inspired by Zacharie's Python implementation
 */

const G = 6.6743e-11 / Math.pow(1000, 3); // Gravitational constant in km^3/kg/s^2

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export class Earth {
  position: Vector3D;
  radiusKm: number;
  massKg: number;
  omega: number; // Angular velocity in rad/s
  rotation: number; // Current rotation angle in radians

  constructor(position: Vector3D = { x: 0, y: 0, z: 0 }) {
    this.position = position;
    this.radiusKm = 6371; // Earth's radius in kilometers
    this.massKg = 5.972e24; // Earth's mass in kilograms
    this.omega = (2 * Math.PI) / 86164; // Earth's angular velocity (sidereal day)
    this.rotation = 0;
  }

  updateRotation(dt: number): void {
    this.rotation = (this.rotation + this.omega * dt) % (2 * Math.PI);
  }
}

export class Asteroid {
  position: Vector3D;
  velocity: Vector3D;
  acceleration: Vector3D;
  radiusKm: number;
  massKg: number;
  positions: Vector3D[]; // Trajectory history

  constructor(
    position: Vector3D,
    velocity: Vector3D,
    radiusKm: number = 1.0,
    massKg: number = 1e12
  ) {
    this.position = { ...position };
    this.velocity = { ...velocity };
    this.acceleration = { x: 0, y: 0, z: 0 };
    this.radiusKm = radiusKm;
    this.massKg = massKg;
    this.positions = [{ ...position }];
  }

  updateAcceleration(earth: Earth): void {
    // Calculate gravitational acceleration: a = G * M / r^3 * r_vec
    const rVec = {
      x: earth.position.x - this.position.x,
      y: earth.position.y - this.position.y,
      z: earth.position.z - this.position.z,
    };
    const rMag = this.magnitude(rVec);

    if (rMag > 0) {
      const factor = (G * earth.massKg) / Math.pow(rMag, 3);
      this.acceleration = {
        x: factor * rVec.x,
        y: factor * rVec.y,
        z: factor * rVec.z,
      };
    } else {
      this.acceleration = { x: 0, y: 0, z: 0 };
    }
  }

  applyForce(force: Vector3D): void {
    // F = ma -> a = F/m
    this.acceleration.x += force.x / this.massKg;
    this.acceleration.y += force.y / this.massKg;
    this.acceleration.z += force.z / this.massKg;
  }

  private magnitude(v: Vector3D): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }

  getDistance(point: Vector3D): number {
    const diff = {
      x: this.position.x - point.x,
      y: this.position.y - point.y,
      z: this.position.z - point.z,
    };
    return this.magnitude(diff);
  }
}

export interface CollisionInfo {
  latitude: number; // degrees
  longitude: number; // degrees
  impactAngle: number; // degrees from horizontal
  location: string;
  timeToImpact: number; // seconds
}

export class AsteroidSimulation3D {
  earth: Earth;
  asteroids: Asteroid[];
  totalTime: number;
  isRunning: boolean;
  collisionDetected: boolean;
  collisionInfo: CollisionInfo | null;

  constructor(earth: Earth, asteroids: Asteroid[]) {
    this.earth = earth;
    this.asteroids = asteroids;
    this.totalTime = 0;
    this.isRunning = false;
    this.collisionDetected = false;
    this.collisionInfo = null;
  }

  /**
   * Propagate simulation using Newtonian mechanics
   */
  propagateNewtonian(dt: number): void {
    for (const asteroid of this.asteroids) {
      // v = v0 + a*dt
      asteroid.velocity.x += asteroid.acceleration.x * dt;
      asteroid.velocity.y += asteroid.acceleration.y * dt;
      asteroid.velocity.z += asteroid.acceleration.z * dt;

      // x = x0 + v*dt + 0.5*a*dt^2 (Verlet integration)
      asteroid.position.x +=
        asteroid.velocity.x * dt + 0.5 * asteroid.acceleration.x * dt * dt;
      asteroid.position.y +=
        asteroid.velocity.y * dt + 0.5 * asteroid.acceleration.y * dt * dt;
      asteroid.position.z +=
        asteroid.velocity.z * dt + 0.5 * asteroid.acceleration.z * dt * dt;

      // Store trajectory
      asteroid.positions.push({ ...asteroid.position });
    }
  }

  /**
   * Check for collisions with Earth
   */
  checkCollisions(): CollisionInfo | null {
    for (const asteroid of this.asteroids) {
      const distance = asteroid.getDistance(this.earth.position);

      if (distance <= this.earth.radiusKm + asteroid.radiusKm) {
        // Calculate impact angle
        const posMag = this.magnitude(asteroid.position);
        const velMag = this.magnitude(asteroid.velocity);
        const dotProduct =
          asteroid.position.x * asteroid.velocity.x +
          asteroid.position.y * asteroid.velocity.y +
          asteroid.position.z * asteroid.velocity.z;

        const angleRad = Math.acos(dotProduct / (posMag * velMag));
        const impactAngle = (angleRad * 180) / Math.PI - 90; // Convert to degrees from horizontal

        // Convert Cartesian to spherical coordinates (lat/lon)
        const latitude =
          90 -
          (Math.acos(asteroid.position.z / posMag) * 180) / Math.PI;
        const longitude =
          ((Math.atan2(asteroid.position.y, asteroid.position.x) * 180) /
            Math.PI -
            (this.earth.rotation * 180) / Math.PI) %
          360;

        this.collisionDetected = true;
        this.collisionInfo = {
          latitude,
          longitude,
          impactAngle,
          location: 'To be determined', // Will be filled by geocoding API
          timeToImpact: this.totalTime,
        };

        return this.collisionInfo;
      }
    }

    return null;
  }

  /**
   * Run simulation step by step
   */
  step(dt: number = 10, applyThrust: boolean = false, thrustForce?: Vector3D): void {
    for (const asteroid of this.asteroids) {
      asteroid.updateAcceleration(this.earth);

      // Apply thrust if requested (for mitigation scenarios)
      if (applyThrust && thrustForce) {
        asteroid.applyForce(thrustForce);
      }
    }

    this.earth.updateRotation(dt);
    this.propagateNewtonian(dt);
    this.totalTime += dt;

    this.checkCollisions();
  }

  /**
   * Run full simulation until collision or max steps
   */
  async run(
    maxSteps: number = 100000,
    dt: number = 10,
    onProgress?: (progress: number, asteroid: Asteroid) => void
  ): Promise<CollisionInfo | null> {
    this.isRunning = true;
    let stepCount = 0;

    while (stepCount < maxSteps && !this.collisionDetected) {
      this.step(dt);
      stepCount++;

      // Report progress every 500 steps
      if (onProgress && stepCount % 500 === 0) {
        const progress = (stepCount / maxSteps) * 100;
        onProgress(progress, this.asteroids[0]);
      }

      // Yield control to avoid blocking UI
      if (stepCount % 5000 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      // Safety check: if asteroid is moving away, stop
      if (stepCount > 1000) {
        const currentDist = this.asteroids[0].getDistance(this.earth.position);
        if (currentDist > 2000000) {
          // Moving away from Earth
          break;
        }
      }
    }

    this.isRunning = false;
    return this.collisionInfo;
  }

  private magnitude(v: Vector3D): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }

  reset(): void {
    this.totalTime = 0;
    this.isRunning = false;
    this.collisionDetected = false;
    this.collisionInfo = null;
  }
}

/**
 * Factory function to create simulation from parameters
 */
export function createSimulation(params: {
  asteroidRadiusKm: number;
  asteroidDensityKg: number; // kg/km^3
  initialPositionKm: Vector3D;
  initialVelocityKmS: Vector3D;
}): AsteroidSimulation3D {
  const earth = new Earth();

  // Calculate asteroid mass from radius and density
  const volume = (4 / 3) * Math.PI * Math.pow(params.asteroidRadiusKm, 3);
  const mass = volume * params.asteroidDensityKg;

  const asteroid = new Asteroid(
    params.initialPositionKm,
    params.initialVelocityKmS,
    params.asteroidRadiusKm,
    mass
  );

  return new AsteroidSimulation3D(earth, [asteroid]);
}
