import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { GitCompare, X, CheckCircle, XCircle } from 'lucide-react';
import { hostelsApi } from '../lib/api';
import { STATIC_HOSTELS } from '../hooks/useHostels';

const FAC_ICONS = { ac:'❄️', wifi:'📶', food:'🍽️', laundry:'👕', security:'🔒', gym:'💪', library:'📚', parking:'🚗', pool:'🏊', balcony:'🌿', 'study table':'📖' };
const ALL_FACILITIES = ['ac','wifi','food','laundry','security','gym','library','parking','pool','balcony','study table'];

export default function ComparePage() {
  const [allHostels, setAllHostels] = useState(STATIC_HOSTELS);
  const [selected, setSelected]     = useState(STATIC_HOSTELS.slice(0, 2).map(h => h.id));
  const [loadingList, setLoadingList] = useState(true);

  // Load real hostel list from Supabase
  useEffect(() => {
    async function load() {
      setLoadingList(true);
      try {
        const data = await hostelsApi.getAll({ limit: 50 });
        if (data.length > 0) {
          setAllHostels(data);
          setSelected(data.slice(0, 2).map(h => h.id));
        }
      } catch {}
      setLoadingList(false);
    }
    load();
  }, []);

  const hostels = useMemo(
    () => selected.map(id => allHostels.find(h => h.id === id || h.id === String(id))).filter(Boolean),
    [selected, allHostels]
  );

  const addHostel    = (id) => { if (selected.length >= 3 || selected.includes(id)) return; setSelected(s => [...s, id]); };
  const removeHostel = (id) => setSelected(s => s.filter(x => x !== id));

  const rows = [
    { label: 'Price/Month', render: h => `₹${h.price?.toLocaleString('en-IN')}` },
    { label: 'Type',        render: h => h.type?.toUpperCase() },
    { label: 'Gender',      render: h => h.category === 'both' ? 'Unisex' : h.category },
    { label: 'Rating',      render: h => `${h.rating || '–'} ⭐ (${h.review_count || 0})` },
    { label: 'Distance',    render: h => h.distance != null ? `${h.distance} km` : '—' },
    { label: 'Vacancy',     render: h => h.vacancy_count != null ? `${h.vacancy_count} rooms` : '—' },
    { label: 'Premium',     render: h => h.is_premium ? '✅ Yes' : '❌ No' },
    { label: 'Verified',    render: h => h.is_verified ? '✅ Yes' : '❌ No' },
  ];

  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh', background: 'var(--color-background)' }}>
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Compare Hostels</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Compare up to 3 hostels side by side</p>
        </div>

        {/* Selector */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            onChange={e => { if (e.target.value) addHostel(e.target.value); e.target.value = ''; }}
            style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.875rem', cursor: 'pointer' }}
            defaultValue=""
          >
            <option value="" disabled>+ Add hostel to compare</option>
            {allHostels.filter(h => !selected.includes(h.id) && !selected.includes(String(h.id))).map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            {loadingList ? 'Loading hostels…' : `${selected.length}/3 selected`}
          </span>
        </div>

        {hostels.length < 2 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
            <GitCompare size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
            <p>Select at least 2 hostels to compare</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--color-surface)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <thead>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left', background: 'var(--color-background)', fontSize: '0.85rem', color: 'var(--color-text-muted)', width: '150px' }}>Feature</th>
                  {hostels.map(h => (
                    <th key={h.id} style={{ padding: '1rem', textAlign: 'center', borderLeft: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <img
                          src={h.images?.[0] || h.image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=400'}
                          alt={h.name}
                          style={{ width: '100%', maxWidth: '180px', height: '100px', objectFit: 'cover', borderRadius: '10px' }}
                        />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{h.name}</span>
                        <button
                          onClick={() => removeHostel(h.id)}
                          style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.2rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}
                        >
                          <X size={12} /> Remove
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.label} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', background: 'var(--color-background)' }}>{row.label}</td>
                    {hostels.map(h => (
                      <td key={h.id} style={{ padding: '0.85rem 1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: 500, borderLeft: '1px solid var(--color-border)' }}>
                        {row.render(h)}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* Facilities */}
                {ALL_FACILITIES.map(fac => (
                  <tr key={fac} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', color: 'var(--color-text-muted)', background: 'var(--color-background)' }}>
                      {FAC_ICONS[fac]} {fac === 'ac' ? 'AC' : fac === 'wifi' ? 'WiFi' : fac.charAt(0).toUpperCase() + fac.slice(1)}
                    </td>
                    {hostels.map(h => (
                      <td key={h.id} style={{ padding: '0.65rem 1rem', textAlign: 'center', borderLeft: '1px solid var(--color-border)' }}>
                        {h.facilities?.includes(fac)
                          ? <CheckCircle size={18} color="#10B981" />
                          : <XCircle size={18} color="#e2e8f0" />}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* CTA row */}
                <tr style={{ borderTop: '2px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem', background: 'var(--color-background)' }} />
                  {hostels.map(h => (
                    <td key={h.id} style={{ padding: '1rem', textAlign: 'center', borderLeft: '1px solid var(--color-border)' }}>
                      <Link
                        to={`/hostel/${h.id}`}
                        style={{ display: 'inline-block', padding: '0.6rem 1.25rem', background: 'var(--color-primary)', color: '#fff', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}
                      >
                        View Details
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
