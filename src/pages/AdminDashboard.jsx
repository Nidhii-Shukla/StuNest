import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CheckCircle, XCircle, LogOut, Sun, Moon, Home, MapPin, Menu, X } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabase';
import StuNestLogo from '../components/StuNestLogo';
import styles from './OwnerDashboard.module.css';
import { generatedColleges, generatedHostels } from '../lib/seedGenerator';

export default function AdminDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [pendingHostels, setPendingHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [seedingStatus, setSeedingStatus] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedDatabase = async () => {
    if (!window.confirm("Are you sure you want to seed the database with 160 colleges and 1,600 hostels? This will insert batches directly into your live Supabase cloud database!")) return;
    setIsSeeding(true);
    setSeedingStatus('Initializing database connection...');
    try {
      // 1. Colleges seeding
      setSeedingStatus('Seeding 160 colleges in chunks...');
      const collegesToInsert = generatedColleges.map(c => ({
        id: c.id,
        name: c.name,
        short_name: c.short_name,
        city: c.city,
        lat: c.lat,
        lng: c.lng
      }));
      for (let i = 0; i < collegesToInsert.length; i += 50) {
        const chunk = collegesToInsert.slice(i, i + 50);
        const { error } = await supabase.from('colleges').upsert(chunk);
        if (error) throw error;
      }

      // 2. Hostels seeding
      setSeedingStatus('Seeding 1,600 hostels (this may take 5-10 seconds)...');
      const hostelsToInsert = generatedHostels.map(h => ({
        id: h.id,
        name: h.name,
        slug: `${h.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${h.id.substring(0, 6)}`,
        address: h.address,
        city: h.city,
        lat: h.lat,
        lng: h.lng,
        price: h.price,
        category: h.category,
        type: h.type,
        description: h.description,
        phone: h.phone,
        is_premium: h.is_premium,
        is_verified: h.is_verified,
        status: 'active',
        facilities: h.facilities,
        images: h.images,
        rating: h.rating,
        review_count: h.review_count,
        vacancy_count: h.vacancy_count
      }));
      for (let i = 0; i < hostelsToInsert.length; i += 50) {
        const chunk = hostelsToInsert.slice(i, i + 50);
        const { error } = await supabase.from('hostels').upsert(chunk);
        if (error) throw error;
      }

      // 3. Proximity mapping seeding
      setSeedingStatus('Mapping 1,600 proximity distance records...');
      const mappingsToInsert = generatedHostels.map(h => ({
        hostel_id: h.id,
        college_id: h.college_id,
        distance_km: h.distance,
        walk_minutes: Math.round(h.distance * 12)
      }));
      for (let i = 0; i < mappingsToInsert.length; i += 100) {
        const chunk = mappingsToInsert.slice(i, i + 100);
        const { error } = await supabase.from('hostel_colleges').upsert(chunk);
        if (error) throw error;
      }

      setSeedingStatus('Success! 1,760 database entries loaded successfully!');
      alert("Successfully seeded 160 colleges and 1,600 hostels across 8 cities in your cloud Supabase database! You can now search any major college in the app!");
    } catch (err) {
      console.error(err);
      setSeedingStatus(`Seeding failed: ${err.message || err}`);
      alert(`Database seeding failed: ${err.message || err}`);
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (profile?.role !== 'admin') {
      // Not an admin
      navigate('/');
      return;
    }
    loadPending();
  }, [user, profile]);

  // Real-Time Data Sync Setup
  useEffect(() => {
    if (!user || profile?.role !== 'admin') return;

    const hostelsChannel = supabase
      .channel('admin-hostels-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'hostels' 
      }, () => {
        loadPending();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(hostelsChannel);
    };
  }, [user, profile]);

  const loadPending = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getPendingHostels();
      setPendingHostels(data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleApprove = async (id) => {
    try {
      await adminApi.approveHostel(id);
      setPendingHostels(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      alert("Failed to approve property.");
    }
  };

  const handleReject = async (id) => {
    if(!window.confirm("Are you sure you want to reject this property?")) return;
    try {
      await adminApi.rejectHostel(id);
      setPendingHostels(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      alert("Failed to reject property.");
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  if (loading) return <div style={{padding:'2rem',textAlign:'center'}}>Loading Admin Panel...</div>;

  return (
    <div className={styles.dashboardLayout}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <StuNestLogo height={32} />
          <button className={styles.sidebarClose} onClick={() => setSidebarOpen(false)}><X size={22} /></button>
        </div>

        <div className={styles.ownerProfile}>
          <div className={styles.avatar}>A</div>
          <div>
            <p className={styles.ownerName}>System Admin</p>
            <p className={styles.ownerRole}>Admin Dashboard</p>
          </div>
        </div>

        <nav className={styles.nav}>
          <button className={`${styles.navItem} ${styles.navItemActive}`}>
            <LayoutDashboard size={20} />
            <span>Pending Approvals</span>
            {pendingHostels.length > 0 && <span className={styles.navBadge}>{pendingHostels.length}</span>}
          </button>
        </nav>

        <div className={styles.sidebarFooter}>
          <button onClick={toggleTheme} className={styles.themeBtn}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
          <Link to="/" className={styles.logoutBtn}>
            <LogOut size={18} /> <span>Back to Site</span>
          </Link>
        </div>
      </aside>

      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      {/* Main Content */}
      <div className={styles.mainArea}>
        <header className={styles.topBar}>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div className={styles.topBarRight}>
            <Link to="/" className={styles.actionBtn}><Home size={20} /></Link>
          </div>
        </header>

        <main className={styles.content}>
          <div className={styles.tabContent}>
            <div className={styles.tabHeader}>
              <div>
                <h1>Pending Properties</h1>
                <p>Review and approve new property registrations</p>
              </div>
            </div>

            {/* --- SEED DATABASE BANNER --- */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Database Seeding & Demo Data Control
                </h3>
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                  Your website frontend is already populated with **160 real-world Indian colleges** (20 per city) and **1,600 clustered hostels** out-of-the-box! Click the button below to instantly load these 1,760 entries permanently into your active **Supabase Cloud Database**!
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={handleSeedDatabase}
                  disabled={isSeeding}
                  style={{
                    background: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: isSeeding ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                    opacity: isSeeding ? 0.7 : 1,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {isSeeding ? (
                    <>
                      <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                      Loading Records...
                    </>
                  ) : (
                    "Seed Supabase Cloud Database"
                  )}
                </button>

                {seedingStatus && (
                  <span style={{
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: seedingStatus.includes('❌') ? '#EF4444' : (seedingStatus.includes('🎉') ? '#10B981' : '#F59E0B'),
                    background: seedingStatus.includes('❌') ? 'rgba(239, 68, 68, 0.1)' : (seedingStatus.includes('🎉') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'),
                    padding: '0.4rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid currentColor'
                  }}>
                    {seedingStatus}
                  </span>
                )}
              </div>
            </div>

            {pendingHostels.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', background: 'var(--color-background)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                <CheckCircle size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p>No pending properties. All caught up!</p>
              </div>
            ) : (
              <div className={styles.propertyList}>
                {pendingHostels.map(h => (
                  <div key={h.id} className={styles.propertyRow} style={{ alignItems: 'center' }}>
                    <div className={styles.propertyInfo}>
                      <h4>{h.name} <span style={{fontSize:'0.8rem', fontWeight:'normal', background:'var(--color-primary)', color:'#fff', padding:'2px 8px', borderRadius:'12px', marginLeft:'8px'}}>{h.type?.toUpperCase()}</span></h4>
                      <p><MapPin size={14}/> {h.address}</p>
                      <div className={styles.propertyMeta}>
                        <span>₹{h.price}/mo</span>
                        <span>For: {h.category?.toUpperCase()}</span>
                        <span>Owner: {h.profiles?.full_name} ({h.phone})</span>
                      </div>
                    </div>
                    <div className={styles.propertyActions} style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleApprove(h.id)} style={{ background:'#10B981', color:'#fff', border:'none', padding:'8px 16px', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', fontWeight:600 }}>
                        <CheckCircle size={16}/> Approve
                      </button>
                      <button onClick={() => handleReject(h.id)} style={{ background:'#EF4444', color:'#fff', border:'none', padding:'8px 16px', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', fontWeight:600 }}>
                        <XCircle size={16}/> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
