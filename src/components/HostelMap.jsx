import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, MapPin } from 'lucide-react';

// --- Fix Leaflet's broken default icon path in Vite ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// --- Custom SVG Icons ---
function svgIcon(color, label) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <filter id="shadow" x="-30%" y="-10%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.35)"/>
      </filter>
      <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26S32 28 32 16C32 7.16 24.84 0 16 0z"
        fill="${color}" filter="url(#shadow)"/>
      <circle cx="16" cy="16" r="7" fill="white" opacity="0.9"/>
      <text x="16" y="20" text-anchor="middle" font-size="9" font-weight="bold" fill="${color}">${label}</text>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize:   [32, 42],
    iconAnchor: [16, 42],
    popupAnchor:[0, -42],
  });
}

const HOSTEL_ICON  = svgIcon('#EF4444', 'H');
const COLLEGE_ICON = svgIcon('#3B82F6', 'C');

// Haversine distance in km
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return +(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
}

// Auto-fit bounds when both points exist
function BoundsFitter({ hostelPos, collegePos }) {
  const map = useMap();
  useEffect(() => {
    // Invalidate size to ensure container is fully sized and tiles render
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (hostelPos && collegePos) {
        const bounds = L.latLngBounds([hostelPos, collegePos]).pad(0.2);
        map.fitBounds(bounds);
      } else if (hostelPos) {
        map.setView(hostelPos, 15);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [hostelPos, collegePos, map]);
  return null;
}

/**
 * HostelMap
 * Props:
 *  - hostel: { name, lat, lng, address, hostel_colleges: [{distance_km, walk_minutes, colleges: {name, lat, lng}}] }
 *  - height: CSS string (default "380px")
 */
export default function HostelMap({ hostel, height = '380px' }) {
  const isValidLatLng = (lat, lng) => {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    return !isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat !== 0 && parsedLng !== 0;
  };

  const hasHostelCoords = hostel?.lat !== undefined && hostel?.lat !== null && isValidLatLng(hostel.lat, hostel.lng);

  // Pick the nearest college from hostel_colleges join (safely copy the array to prevent mutating read-only state/props)
  const nearestRelation = hostel?.hostel_colleges
    ? [...hostel.hostel_colleges].sort((a, b) => (a.distance_km || 99) - (b.distance_km || 99))[0]
    : null;
  const college = nearestRelation?.colleges;
  const hasCollegeCoords = college?.lat !== undefined && college?.lat !== null && isValidLatLng(college.lat, college.lng);

  // Fallback center — Hyderabad
  const defaultCenter = [17.385, 78.4867];
  const hostelPos  = hasHostelCoords  ? [parseFloat(hostel.lat),  parseFloat(hostel.lng)]  : null;
  const collegePos = hasCollegeCoords ? [parseFloat(college.lat), parseFloat(college.lng)] : null;

  const mapCenter = hostelPos || defaultCenter;

  // Dynamic map key based on hostel ID to force re-render when hostel changes
  const mapKey = hostel?.id || `${hostelPos?.[0]}-${hostelPos?.[1]}`;

  // Distance — prefer DB value, compute as fallback
  const distKm = nearestRelation?.distance_km
    ?? (hostelPos && collegePos ? haversine(...hostelPos, ...collegePos) : null);
  const walkMin = nearestRelation?.walk_minutes
    ?? (distKm ? Math.round(distKm * 12) : null); // ~12 min/km walking

  // External directions URL
  const directionsUrl = hostelPos
    ? `https://www.google.com/maps/dir/?api=1&destination=${hostelPos[0]},${hostelPos[1]}`
    : null;

  if (!hasHostelCoords) {
    return (
      <div style={{
        height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-background)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        color: 'var(--color-text-muted)',
        gap: '0.5rem',
        fontSize: '0.875rem',
      }}>
        <MapPin size={32} style={{ opacity: 0.2 }} />
        <p>Map coordinates not available for this property.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

      {/* Distance Banner */}
      {college && distKm != null && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          padding: '0.85rem 1.25rem',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(239,68,68,0.06))',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          flexWrap: 'wrap',
        }}>
          {/* College Pin */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3B82F6', flexShrink: 0 }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text)' }}>{college.name}</span>
          </div>

          {/* Dashes */}
          <div style={{ flex: 1, borderTop: '2px dashed var(--color-border)', minWidth: '24px' }} />

          {/* Distance */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              {distKm} km
            </div>
            {walkMin && (
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                ~{walkMin} min walk
              </div>
            )}
          </div>

          {/* Dashes */}
          <div style={{ flex: 1, borderTop: '2px dashed var(--color-border)', minWidth: '24px' }} />

          {/* Hostel Pin */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text)' }}>
              {hostel.name?.split(' ').slice(0, 3).join(' ')}
            </span>
          </div>
        </div>
      )}

      {/* Map */}
      <div style={{ height, borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--color-border)', position: 'relative' }}>
        <MapContainer
          key={mapKey}
          center={mapCenter}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          <BoundsFitter hostelPos={hostelPos} collegePos={collegePos} />

          {/* Hostel Marker */}
          <Marker position={hostelPos} icon={HOSTEL_ICON}>
            <Popup>
              <div style={{ minWidth: '160px' }}>
                <strong style={{ color: '#EF4444' }}>🏠 {hostel.name}</strong><br />
                <span style={{ fontSize: '0.78rem', color: '#666' }}>{hostel.address}</span>
                {hostel.price && (
                  <div style={{ marginTop: '4px', fontWeight: 700 }}>₹{hostel.price?.toLocaleString('en-IN')}/mo</div>
                )}
              </div>
            </Popup>
          </Marker>

          {/* College Marker */}
          {collegePos && (
            <Marker position={collegePos} icon={COLLEGE_ICON}>
              <Popup>
                <div style={{ minWidth: '140px' }}>
                  <strong style={{ color: '#3B82F6' }}>🎓 {college.name}</strong><br />
                  {distKm && (
                    <span style={{ fontSize: '0.78rem', color: '#666' }}>
                      {distKm} km · ~{walkMin} min walk from hostel
                    </span>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Route Line */}
          {hostelPos && collegePos && (
            <Polyline
              positions={[hostelPos, collegePos]}
              pathOptions={{
                color: '#6366F1',
                weight: 3,
                opacity: 0.7,
                dashArray: '8, 6',
              }}
            >
              <Tooltip permanent direction="center" className="distance-tooltip">
                📏 {distKm} km
              </Tooltip>
            </Polyline>
          )}
        </MapContainer>

        {/* Map Legend overlay */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          zIndex: 1000,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(8px)',
          borderRadius: '8px',
          padding: '0.5rem 0.75rem',
          fontSize: '0.72rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.3rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          pointerEvents: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
            <span>Hostel</span>
          </div>
          {college && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3B82F6' }} />
              <span>{college.short_name || 'College'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {directionsUrl && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 1.1rem',
              background: 'var(--color-primary)',
              color: '#fff',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none',
              transition: 'opacity 0.2s',
            }}
          >
            <Navigation size={15} /> Get Directions
          </a>
        )}
        {hostelPos && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${hostelPos[0]},${hostelPos[1]}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 1.1rem',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              textDecoration: 'none',
            }}
          >
            <MapPin size={15} /> View on Google Maps
          </a>
        )}
      </div>
    </div>
  );
}
