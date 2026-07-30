import { useEffect, useMemo, useRef, useState } from 'react';
import campus from '../data/campusMap.json';
import { clusterPins } from '../lib/diningCatalog.js';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const DRAG_THRESHOLD = 6; // px of movement before a press counts as a pan rather than a tap
const PAN_SLACK = 28; // px of pan always available, even at min zoom, so it never feels frozen

/**
 * A stylised campus map drawn from real OpenStreetMap geometry, baked at build
 * time (see scripts note in the README). No tiles, no API key, no network —
 * it renders identically with no signal.
 *
 * Pins sit at true coordinates; venues sharing a spot merge into one pin.
 * Fills its parent edge-to-edge (parent gives it its size) — the dining map
 * is the only caller, and it's the full-bleed background there.
 */
export function CampusMap({ venues, statusOf, onSelectPin, selectedPinId }) {
  const pins = useMemo(() => clusterPins(venues), [venues]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const pointers = useRef(new Map()); // pointerId -> {x, y} in client coordinates
  const panGesture = useRef(null); // { x, y, startPan } for the one active pointer
  const pinchGesture = useRef(null); // { dist, midX, midY, startZoom, startPan }
  const [gesturing, setGesturing] = useState(false);

  const { width, height, bounds } = campus;

  const project = (lat, lon) => ({
    x: ((lon - bounds.lonMin) / (bounds.lonMax - bounds.lonMin)) * width,
    y: ((bounds.latMax - lat) / (bounds.latMax - bounds.latMin)) * height,
  });

  /**
   * Keep the map from ever being dragged fully off its container. A fixed
   * slack is always available (even at min zoom, where the content exactly
   * covers the container and there'd otherwise be zero room to move at all)
   * so a drag always does *something*, rather than feeling frozen.
   */
  const clampPan = (candidate, atZoom) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return candidate;
    const maxX = Math.max(PAN_SLACK, (rect.width * (atZoom - 1)) / 2);
    const maxY = Math.max(PAN_SLACK, (rect.height * (atZoom - 1)) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, candidate.x)),
      y: Math.max(-maxY, Math.min(maxY, candidate.y)),
    };
  };

  // Re-clamp whenever zoom changes (buttons, or a pinch that just ended),
  // so a big jump never leaves pan out of bounds for the new zoom level.
  useEffect(() => {
    setPan((p) => clampPan(p, zoom));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  const startPanGesture = (id) => {
    const p = pointers.current.get(id);
    if (!p) return;
    // `dragging` only flips true once the press has moved past DRAG_THRESHOLD —
    // until then nothing is panned, so a plain click/tap reaches the pin
    // underneath untouched instead of nudging the map by a stray pixel or two.
    panGesture.current = { x: p.x, y: p.y, startPan: { ...pan }, dragging: false };
  };

  const startPinchGesture = () => {
    const [a, b] = [...pointers.current.values()];
    if (!a || !b) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    pinchGesture.current = {
      dist: Math.hypot(b.x - a.x, b.y - a.y),
      midX: (a.x + b.x) / 2 - (rect.left + rect.width / 2),
      midY: (a.y + b.y) / 2 - (rect.top + rect.height / 2),
      startZoom: zoom,
      startPan: { ...pan },
    };
  };

  // Deliberately no setPointerCapture here: capturing the pointer on this
  // container retargets the browser's synthesized `click` (and therefore the
  // pins' onClick) to the container instead of the pin underneath, which is
  // why taps stopped opening anything. Losing the pointer if it leaves the
  // container mid-drag is handled below via window-level fallback listeners
  // instead, which don't have that side effect.
  const onPointerDown = (e) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setGesturing(true);

    if (pointers.current.size === 1) {
      panGesture.current = null;
      pinchGesture.current = null;
      startPanGesture(e.pointerId);
    } else if (pointers.current.size === 2) {
      panGesture.current = null;
      startPinchGesture();
    }
    // 3+ fingers: keep tracking for cleanup, but don't start a new gesture.
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1 && panGesture.current) {
      const g = panGesture.current;
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      if (!g.dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      g.dragging = true;
      setPan(clampPan({ x: g.startPan.x + dx, y: g.startPan.y + dy }, zoom));
    } else if (pointers.current.size === 2 && pinchGesture.current) {
      const [a, b] = [...pointers.current.values()];
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || !a || !b) return;
      const g = pinchGesture.current;
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const midX = (a.x + b.x) / 2 - (rect.left + rect.width / 2);
      const midY = (a.y + b.y) / 2 - (rect.top + rect.height / 2);

      const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, g.startZoom * (dist / g.dist)));
      // Keep the point under the fingers' midpoint stationary on screen as zoom changes.
      const nextPan = {
        x: midX - (nextZoom * (g.midX - g.startPan.x)) / g.startZoom,
        y: midY - (nextZoom * (g.midY - g.startPan.y)) / g.startZoom,
      };

      setZoom(nextZoom);
      setPan(clampPan(nextPan, nextZoom));
    }
  };

  const endPointer = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    pinchGesture.current = null;

    if (pointers.current.size === 1) {
      const [id] = pointers.current.keys();
      startPanGesture(id);
    } else {
      panGesture.current = null;
    }
    if (pointers.current.size === 0) setGesturing(false);
  };

  // Once a gesture starts, track move/up on the window rather than just this
  // element — a mouse drag can leave the container (or even the browser
  // viewport, easy to do while testing on desktop) without that meaning the
  // drag is over.
  useEffect(() => {
    if (!gesturing) return undefined;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endPointer);
    window.addEventListener('pointercancel', endPointer);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endPointer);
      window.removeEventListener('pointercancel', endPointer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gesturing]);

  const reset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const zoomBy = (factor) => setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * factor)));

  return (
    <div className="relative h-full w-full overflow-hidden bg-card">
      <div
        ref={containerRef}
        className={`relative h-full w-full touch-none ${gesturing ? 'cursor-grabbing' : 'cursor-grab'}`}
        onPointerDown={onPointerDown}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid slice"
          className="h-full w-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center',
            transition: gesturing ? 'none' : 'transform 260ms var(--ease-ios)',
          }}
        >
          {/* Ground */}
          <rect x="0" y="0" width={width} height={height} fill="var(--map-ground)" />

          {/* Roads: a wider casing under a narrower fill reads as a real road. */}
          <g stroke="var(--map-road-casing)" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {campus.roads.map((road, i) => (
              <polyline key={`c${i}`} points={toPoints(road.p)} strokeWidth={road.w * 2.6 + 2} />
            ))}
          </g>
          <g stroke="var(--map-road)" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {campus.roads.map((road, i) => (
              <polyline key={`r${i}`} points={toPoints(road.p)} strokeWidth={road.w * 2.6} />
            ))}
          </g>

          {/* Buildings */}
          <g fill="var(--map-building)" stroke="var(--map-building-edge)" strokeWidth="1">
            {campus.buildings.map((b, i) => (
              <polygon key={i} points={toPoints(b)} />
            ))}
          </g>

          {/* Campus Pond */}
          <g fill="var(--map-water)" stroke="var(--map-water-edge)" strokeWidth="1.5">
            {campus.water.map((w, i) => (
              <polygon key={i} points={toPoints(w)} />
            ))}
          </g>

          {/* Pins — scale with the map (no counter-scaling), so they read clearly when zoomed in. */}
          {pins.map((pin) => {
            const { x, y } = project(pin.lat, pin.lon);
            const states = pin.venues.map((v) => statusOf?.(v.name) || 'unknown');
            const anyOpen = states.includes('open');
            const selected = pin.id === selectedPinId;
            const scale = selected ? 1.28 : 1;

            return (
              <g
                key={pin.id}
                transform={`translate(${x} ${y}) scale(${scale})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPin?.(pin);
                }}
                className="cursor-pointer"
              >
                <ellipse cx="0" cy="2" rx="7" ry="2.5" fill="rgba(0,0,0,0.18)" />
                <path
                  d="M0 0c-6.4-8-9.6-12.4-9.6-16.6A9.6 9.6 0 0 1 9.6-16.6C9.6-12.4 6.4-8 0 0Z"
                  fill={anyOpen ? 'var(--color-ios-green)' : 'var(--color-ios-red)'}
                  stroke="#fff"
                  strokeWidth="2"
                />
                {pin.venues.length > 1 ? (
                  <text
                    x="0"
                    y="-13"
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill="#fff"
                    style={{ pointerEvents: 'none' }}
                  >
                    {pin.venues.length}
                  </text>
                ) : (
                  <circle cx="0" cy="-16.6" r="3.4" fill="#fff" />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
        <MapButton label="Zoom in" onClick={() => zoomBy(1.5)}>
          +
        </MapButton>
        <MapButton label="Zoom out" onClick={() => zoomBy(1 / 1.5)}>
          −
        </MapButton>
        <MapButton label="Reset map" onClick={reset}>
          ⤢
        </MapButton>
      </div>

      <div className="pointer-events-none absolute bottom-2 left-3 text-[10px] text-label-3">
        Geometry © OpenStreetMap contributors
      </div>
    </div>
  );
}

function MapButton({ children, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="ios-press-scale flex h-8 w-8 items-center justify-center rounded-full bg-bg-elevated text-[17px] font-medium text-label shadow-sm"
    >
      {children}
    </button>
  );
}

/** [x,y,x,y,…] -> "x,y x,y …" */
function toPoints(flat) {
  let out = '';
  for (let i = 0; i < flat.length; i += 2) out += `${flat[i]},${flat[i + 1]} `;
  return out.trim();
}
