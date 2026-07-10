import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MAP } from '../lib/palette.js';

const MKE_CENTER = [43.0389, -87.9065];

const COLOR_EX = MAP.either; // green — exception (either side)
const COLOR_NNP = MAP.no; // red — no overnight parking Dec1–Mar1
const COLOR_SEL = MAP.selected; // amber — highlighted selected segment

export default function MapView({ data, target, selectedLabel, onCenterChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const highlightRef = useRef(null);
  const moveTimer = useRef(null);

  // Initialize the map once.
  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: MKE_CENTER,
      zoom: 15,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    mapRef.current = map;

    const emit = () => {
      const c = map.getCenter();
      onCenterChange?.({ lat: c.lat, lng: c.lng });
    };
    const onMove = () => {
      clearTimeout(moveTimer.current);
      moveTimer.current = setTimeout(emit, 120);
    };
    map.on('moveend', onMove);
    emit(); // initial verdict

    return () => {
      map.off('moveend', onMove);
      clearTimeout(moveTimer.current);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw the special-street overlays once data is available.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data) return;
    const renderer = L.canvas({ padding: 0.5 });
    const exLines = [];
    const nnpLines = [];
    for (const [, flags, flat] of data.segments) {
      if (!(flags & 3)) continue;
      const latlngs = [];
      for (let i = 0; i < flat.length; i += 2) latlngs.push([flat[i + 1], flat[i]]);
      if (flags & 2) nnpLines.push(latlngs);
      else if (flags & 1) exLines.push(latlngs);
    }
    // nnp drawn on top of ex so restricted arterials read red.
    const layer = L.layerGroup([
      L.polyline(exLines, { renderer, color: COLOR_EX, weight: 3, opacity: 0.7 }),
      L.polyline(nnpLines, { renderer, color: COLOR_NNP, weight: 3, opacity: 0.75 }),
    ]).addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [data]);

  // Recenter when an external target (GPS / address search) is set.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !target) return;
    map.setView([target.lat, target.lng], Math.max(map.getZoom(), 16), { animate: true });
  }, [target]);

  // Highlight the currently selected nearest segment.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data) return;
    if (highlightRef.current) {
      map.removeLayer(highlightRef.current);
      highlightRef.current = null;
    }
    if (!selectedLabel) return;
    const matching = [];
    for (const [label, , flat] of data.segments) {
      if (label !== selectedLabel) continue;
      const latlngs = [];
      for (let i = 0; i < flat.length; i += 2) latlngs.push([flat[i + 1], flat[i]]);
      matching.push(latlngs);
    }
    if (matching.length) {
      highlightRef.current = L.polyline(matching, {
        color: COLOR_SEL,
        weight: 5,
        opacity: 0.9,
      }).addTo(map);
    }
  }, [selectedLabel, data]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
      {/* Center crosshair — the verdict is for this exact point */}
      <svg className="crosshair" viewBox="0 0 24 24" fill="none">
        <path d="M12 2 L12 22 M2 12 L22 12" stroke="white" strokeWidth="4" strokeLinecap="round" />
        <path d="M12 2 L12 22 M2 12 L22 12" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="12" r="3" fill="#111827" stroke="white" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
