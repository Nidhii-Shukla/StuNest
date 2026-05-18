import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Crosshair, MapPin, Star, Navigation, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import HostelCard from '../components/HostelCard';
import styles from './MapSearchPage.module.css';
import supabase from '../lib/supabase';
import { hostelsApi } from '../lib/api';
import { STATIC_HOSTELS } from '../hooks/useHostels';

// Fix Leaflet default icons for Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom hostel pin icon
function hostelIcon(isPremium) {
  const color = isPremium ? '#F59E0B' : '#EF4444';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
      <filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/></filter>
      <path d="M15 0C6.72 0 0 6.72 0 15c0 11.25 15 25 15 25S30 26.25 30 15C30 6.72 23.28 0 15 0z"
        fill="${color}" filter="url(#s)"/>
      <circle cx="15" cy="15" r="6.5" fill="white" opacity="0.9"/>
      <text x="15" y="19" text-anchor="middle" font-size="8" font-weight="bold" fill="${color}">H</text>
    </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [30, 40], iconAnchor: [15, 40], popupAnchor: [0, -40] });
}

// User location icon
const USER_ICON = L.divIcon({
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3);"></div>`,
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Auto-fly to user location and handle sizing issues
function MapFlyTo({ center, zoom = 13 }) {
  const map = useMap();
  
  useEffect(() => {
    // Invalidate size to ensure container is fully sized and tiles render
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (center && !isNaN(center[0]) && !isNaN(center[1])) {
      map.flyTo(center, zoom, { duration: 1.5 });
    }
  }, [center, zoom, map]);

  return null;
}

const DEFAULT_CENTER = [17.385, 78.4867]; // Hyderabad

export default function MapSearchPage() {
  const [userLoc, setUserLoc]     = useState(null);
  const [hostels, setHostels]     = useState([]);
  const [selected, setSelected]   = useState(null); // hovered hostel id
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [searched, setSearched]   = useState(false);
  const [isFallbackLocation, setIsFallbackLocation] = useState(false);

  const isValidLatLng = (lat, lng) => {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    return !isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat !== 0 && parsedLng !== 0;
  };

  const findNearby = (isInitialMount = false) => {
    setLoading(true);
    setError('');
    setIsFallbackLocation(false);

    const useFallback = async (reason) => {
      // Default central coordinate (JNTUH Campus)
      const fallbackLat = 17.4933;
      const fallbackLon = 78.3914;
      setUserLoc([fallbackLat, fallbackLon]);
      setIsFallbackLocation(true);
      setSearched(true);
      if (!isInitialMount) {
        setError(reason);
      }

      try {
        let source = [];
        try {
          const dbHostels = await hostelsApi.getAll({ limit: 100 });
          source = dbHostels.length > 0 ? dbHostels : STATIC_HOSTELS;
        } catch {
          source = STATIC_HOSTELS;
        }

        const mapped = source
          .map(h => {
            const parsedLat = parseFloat(h.latitude || h.lat || (fallbackLat + (Math.random() - 0.5) * 0.02));
            const parsedLng = parseFloat(h.longitude || h.lng || (fallbackLon + (Math.random() - 0.5) * 0.02));
            const distanceM = Math.round(haversineMeters(fallbackLat, fallbackLon, parsedLat, parsedLng));
            return {
              ...h,
              latitude:  parsedLat,
              longitude: parsedLng,
              distance_meters: distanceM,
              image:     h.images?.[0] || h.image,
              isPremium: h.is_premium,
            };
          })
          .filter(h => isValidLatLng(h.latitude, h.longitude))
          .sort((a, b) => (a.distance_meters ?? 99999) - (b.distance_meters ?? 99999));
        
        setHostels(mapped);
      } catch (err) {
        console.error("Fallback search failed", err);
      }
      setLoading(false);
    };

    if (!navigator.geolocation) {
      useFallback('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setUserLoc([lat, lon]);
        setSearched(true);
        setIsFallbackLocation(false);

        try {
          let source = [];
          try {
            const dbHostels = await hostelsApi.getAll({ limit: 100 });
            source = dbHostels.length > 0 ? dbHostels : STATIC_HOSTELS;
          } catch {
            source = STATIC_HOSTELS;
          }

          const mapped = source
            .map(h => {
              const parsedLat = parseFloat(h.latitude || h.lat || (lat + (Math.random() - 0.5) * 0.02));
              const parsedLng = parseFloat(h.longitude || h.lng || (lon + (Math.random() - 0.5) * 0.02));
              const distanceM = Math.round(haversineMeters(lat, lon, parsedLat, parsedLng));
              return {
                ...h,
                latitude:  parsedLat,
                longitude: parsedLng,
                distance_meters: distanceM,
                image:     h.images?.[0] || h.image,
                isPremium: h.is_premium,
              };
            })
            .filter(h => isValidLatLng(h.latitude, h.longitude))
            .sort((a, b) => (a.distance_meters ?? 99999) - (b.distance_meters ?? 99999));
          
          setHostels(mapped);
        } catch {
          // Last resort fallback
          const source = STATIC_HOSTELS;
          const mapped = source
            .map(h => {
              const parsedLat = parseFloat(h.latitude || h.lat);
              const parsedLng = parseFloat(h.longitude || h.lng);
              return {
                ...h,
                latitude: parsedLat,
                longitude: parsedLng,
                distance_meters: isValidLatLng(parsedLat, parsedLng)
                  ? Math.round(haversineMeters(lat, lon, parsedLat, parsedLng))
                  : null,
              };
            })
            .filter(h => isValidLatLng(h.latitude, h.longitude))
            .sort((a, b) => (a.distance_meters ?? 99999) - (b.distance_meters ?? 99999));
          setHostels(mapped);
        }
        setLoading(false);
      },
      (geoError) => {
        // User denied or error geolocating -> use fallback
        useFallback('Please allow location access to search stays near your exact GPS position.');
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  };

  // Run automatically on page load to enforce 2km GPS search immediately
  useEffect(() => {
    findNearby(true);
  }, []);

  return (
    <div className={styles.pageWrapper}>

      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Map Search</h2>
          <p>Find premium stays near your location.</p>
        </div>

        <button className={styles.locateBtn} onClick={findNearby} disabled={loading}>
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
              Locating…
            </span>
          ) : (
            <><Crosshair size={18} /> Use My Location</>
          )}
        </button>

        {isFallbackLocation && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '12px',
            padding: '0.85rem',
            marginTop: '1rem',
            display: 'flex',
            gap: '0.6rem',
            alignItems: 'flex-start',
            color: '#F59E0B',
            fontSize: '0.82rem',
            lineHeight: '1.3'
          }}>
            <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', fontWeight: 700, marginBottom: '2px' }}>Showing Fallback Area</strong>
              <span style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
                GPS coordinates unavailable. Displaying premium stays within 2km of JNTUH Campus as search center.
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className={styles.errorMsg}>{error}</div>
        )}

        {/* Count */}
        {hostels.length > 0 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)', marginBottom: '0.75rem' }}>
            {searched ? `${hostels.length} nearby hostels` : `${hostels.length} hostels on map`}
            {searched && userLoc && ' · sorted by distance'}
          </p>
        )}

        {/* HostelCard Results */}
        <div className={styles.resultsList}>
          {hostels.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)' }}>
              <MapPin size={32} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.85rem' }}>Use your location to find nearby hostels.</p>
            </div>
          )}
          {hostels.map(hostel => (
            <div
              key={hostel.id}
              style={{
                transition: 'transform 0.15s',
                transform: selected === hostel.id ? 'scale(1.01)' : 'scale(1)',
                outline: selected === hostel.id ? '2px solid var(--color-primary)' : 'none',
                borderRadius: '14px',
                marginBottom: '0.85rem',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setSelected(hostel.id)}
              onMouseLeave={() => setSelected(null)}
            >
              {/* Distance badge if searched */}
              {hostel.distance_meters != null && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)',
                  marginBottom: '0.3rem', paddingLeft: '0.25rem',
                }}>
                  <Navigation size={12} />
                  {hostel.distance_meters < 1000
                    ? `${hostel.distance_meters}m away`
                    : `${(hostel.distance_meters / 1000).toFixed(1)} km away`}
                </div>
              )}
              <HostelCard hostel={hostel} />
            </div>
          ))}
        </div>
      </aside>

      {/* ── Map ── */}
      <main className={styles.mapArea}>
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={12}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          <MapFlyTo center={userLoc} />

          {/* User location */}
          {userLoc && (
            <Marker position={userLoc} icon={USER_ICON}>
              <Popup><strong>📍 You are here</strong></Popup>
            </Marker>
          )}

          {/* Hostel markers */}
          {hostels.map(hostel => (
            hostel.latitude && hostel.longitude ? (
              <Marker
                key={hostel.id}
                position={[hostel.latitude, hostel.longitude]}
                icon={hostelIcon(hostel.is_premium || hostel.isPremium)}
                eventHandlers={{ mouseover: () => setSelected(hostel.id), mouseout: () => setSelected(null) }}
              >
                <Popup>
                  <div style={{ minWidth: '180px', fontFamily: 'inherit' }}>
                    {(hostel.images?.[0] || hostel.image) && (
                      <img
                        src={hostel.images?.[0] || hostel.image}
                        alt={hostel.name}
                        style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '6px', marginBottom: '6px' }}
                      />
                    )}
                    <strong style={{ fontSize: '0.85rem', color: '#111', display: 'block', marginBottom: '2px' }}>
                      {hostel.name}
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: '#666', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <span>📍</span> {hostel.address}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                      <strong style={{ color: '#EF4444', fontSize: '0.875rem' }}>
                        ₹{hostel.price?.toLocaleString('en-IN')}/mo
                      </strong>
                      {hostel.rating && (
                        <span style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          ⭐ {hostel.rating}
                        </span>
                      )}
                    </div>
                    {hostel.distance_meters != null && (
                      <div style={{ fontSize: '0.72rem', color: '#3B82F6', fontWeight: 700, marginTop: '4px' }}>
                        📏 {hostel.distance_meters < 1000 ? `${hostel.distance_meters}m` : `${(hostel.distance_meters/1000).toFixed(1)} km`} from you
                      </div>
                    )}
                    <Link
                      to={`/hostel/${hostel.id}`}
                      style={{ display: 'block', marginTop: '8px', padding: '5px 10px', background: '#EF4444', color: '#fff', borderRadius: '6px', fontWeight: 700, fontSize: '0.78rem', textAlign: 'center', textDecoration: 'none' }}
                    >
                      View Details →
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ) : null
          ))}
        </MapContainer>
      </main>
    </div>
  );
}

// Haversine distance in meters
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
