/**
 * Minimal spring integrator shared by every sheet's drag/settle/exit motion — one
 * physics engine, so "does this feel like iOS" only has to be tuned in one place.
 * Semi-implicit Euler, not React-aware (subscribe/unsubscribe is a plain callback set).
 */

const STIFFNESS = 300;
const DAMPING = 32;
const MASS = 1;
const MAX_STEP_SECONDS = 1 / 30; // clamp long frames (tab switch, devtools pause) so the spring doesn't jump
const SETTLE_DISTANCE_PX = 0.5;
const SETTLE_VELOCITY_PX_S = 4;

export function createSpring(initialValue = 0) {
  let value = initialValue;
  let velocity = 0;
  let target = initialValue;
  let frame = null;
  let lastTime = 0;
  const listeners = new Set();

  const notify = () => {
    for (const fn of listeners) fn(value, velocity);
  };

  const tick = (now) => {
    const dt = Math.min((now - lastTime) / 1000, MAX_STEP_SECONDS);
    lastTime = now;

    const springForce = -STIFFNESS * (value - target);
    const dampingForce = -DAMPING * velocity;
    velocity += ((springForce + dampingForce) / MASS) * dt;
    value += velocity * dt;

    const atRest =
      Math.abs(target - value) < SETTLE_DISTANCE_PX && Math.abs(velocity) < SETTLE_VELOCITY_PX_S;

    if (atRest) {
      value = target;
      velocity = 0;
      frame = null;
      notify();
      return;
    }
    notify();
    frame = requestAnimationFrame(tick);
  };

  const start = () => {
    if (frame != null) return;
    lastTime = performance.now();
    frame = requestAnimationFrame(tick);
  };

  return {
    get value() {
      return value;
    },
    get velocity() {
      return velocity;
    },
    get settled() {
      return frame == null;
    },
    /** Animate toward `next`, optionally carrying an initial velocity (e.g. release flick, px/s). */
    setTarget(next, { velocity: v } = {}) {
      target = next;
      if (v != null) velocity = v;
      start();
    },
    /** Drag: move the value directly, no easing, while keeping velocity live for the eventual release. */
    setValue(next) {
      value = next;
      notify();
    },
    /** Snap instantly to a value with no motion (mount, or reduced-motion mode). */
    jumpTo(next) {
      value = next;
      target = next;
      velocity = 0;
      if (frame != null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      notify();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    stop() {
      if (frame != null) cancelAnimationFrame(frame);
      frame = null;
    },
  };
}
