import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, MapPin, Star } from 'lucide-react';
import { hostelsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { STATIC_HOSTELS } from '../hooks/useHostels';

export default function ShortlistPage() {
  const { user } = useAuth();
  const [shortlisted, setShortlisted] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      if (user) {
        try {
          const data = await hostelsApi.getShortlist(user.id);
          setShortlisted(data);
        } catch {
          // Fallback: show some static hostels for demo
          setShortlisted(STATIC_HOSTELS.filter(h => h.is_premium).slice(0, 3));
        }
      } else {
        // Guest: show a preview from static data
        setShortlisted(STATIC_HOSTELS.filter(h => h.is_premium).slice(0, 3));
      }
      setLoading(false);
    }
    load();
  }, [user]);

  const remove = async (id) => {
    setShortlisted(s => s.filter(h => h.id !== id));
    if (user) {
      try {
        await hostelsApi.toggleShortlist(id, user.id);
      } catch {}
    }
  };

  if (loading) {
    return (
      <div style={{ paddingTop: '80px', minHeight: '100vh', background: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh', background: 'var(--color-background)' }}>
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>My Shortlist</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{shortlisted.length} saved hostel{shortlisted.length !== 1 ? 's' : ''}</p>
        </div>

        {!user && (
          <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#92400E' }}>
            ℹ️ <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Sign in</Link> to save your shortlist permanently across devices.
          </div>
        )}

        {shortlisted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)', background: 'var(--color-surface)', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <Heart size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
            <h2 style={{ marginBottom: '0.5rem' }}>No saved hostels yet</h2>
            <p style={{ marginBottom: '1.5rem' }}>Browse hostels and save your favourites here.</p>
            <Link to="/search" style={{ padding: '0.75rem 1.75rem', background: 'var(--color-primary)', color: '#fff', borderRadius: '10px', fontWeight: 700, textDecoration: 'none' }}>
              Find Hostels
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {shortlisted.map(h => (
              <div key={h.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ position: 'relative', aspectRatio: '16/9' }}>
                  <img src={h.images?.[0] || h.image} alt={h.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => remove(h.id)} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#EF4444' }}>
                    <Trash2 size={16} />
                  </button>
                  {h.is_premium && (
                    <span style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '100px' }}>
                      Premium
                    </span>
                  )}
                </div>
                <div style={{ padding: '1rem' }}>
                  <h3 style={{ fontWeight: 700, marginBottom: '0.35rem', fontSize: '0.95rem' }}>{h.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                    <MapPin size={13} /> {h.address}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                      <Star size={13} fill="#F59E0B" color="#F59E0B" />
                      <span style={{ fontWeight: 700 }}>{h.rating}</span>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>({h.review_count})</span>
                    </div>
                    <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>&#8377;{h.price?.toLocaleString('en-IN')}/mo</span>
                  </div>
                  <Link to={`/hostel/${h.id}`} style={{ display: 'block', marginTop: '0.875rem', padding: '0.6rem', background: 'var(--color-primary)', color: '#fff', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', textAlign: 'center', textDecoration: 'none' }}>
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
