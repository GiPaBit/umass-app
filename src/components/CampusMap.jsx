import { useMemo, useRef, useState } from 'react';
import campus from '../data/campusMap.json';
import { clusterPins } from '../lib/diningCatalog.js';

/**
 * A stylised campus map drawn from real OpenStreetMap geometry, baked at build
 * time (see scripts note in the README). No tiles, no API key, no network —
 * it renders identically with no signal.
 *
 * Pins sit at true coordinates; venues sharing a spot merge into one pin.
 */
export function CampusMap({ venues, statusOf, onSelectPin, selectedPinId }) {
  const pins = useMemo(() => clusterPins(venues), [venues]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef(null);

  const { width, height, bounds } = campus;

  const project = (lat, lon) => ({
    x: ((lon - bounds.lonMin) / (bounds.lonMax - bounds.lonMin)) * width,
    y: ((bounds.latMax - lat) / (bounds.latMax - bounds.latMin)) * height,
  });

  // --- pan & pinch ---------------------------------------------------------
  const onPointerDown = (e) => {
    drag.current = { x: e.clientX, y: e.clientY, startPan: { ...pan } };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    setPan({ x: drag.current.startPan.x + dx, y: drag.current.startPan.y + dy });
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const reset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative mx-4 overflow-hidden rounded-[20px] bg-card">
      <div
        className="relative touch-none"
        style={{ aspectRatio: `${width} / ${height}` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-full w-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center',
            transition: drag.current ? 'none' : 'transform 260ms var(--ease-ios)',
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

          {/* Pins */}
          {pins.map((pin) => {
            const { x, y } = project(pin.lat, pin.lon);
            const states = pin.venues.map((v) => statusOf?.(v.name) || 'unknown');
            const anyOpen = states.includes('open');
            const selected = pin.id === selectedPinId;
            const scale = (selected ? 1.28 : 1) / zoom; // keep pins legible when zoomed

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
        <MapButton label="Zoom in" onClick={() => setZoom((z) => Math.min(4, z * 1.5))}>
          +
        </MapButton>
        <MapButton label="Zoom out" onClick={() => setZoom((z) => Math.max(1, z / 1.5))}>
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
