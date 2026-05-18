import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Building, PlusCircle, MessageSquare, Star,
  LogOut, Sun, Moon, Menu, X, Eye, TrendingUp, Bell, Send,
  Bookmark, CheckCircle, Globe, ChevronDown
} from 'lucide-react';
import StuNestLogo from '../components/StuNestLogo';
import styles from './OwnerDashboard.module.css';
import { ownerApi, enquiriesApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabase';

const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',             icon: LayoutDashboard },
  { id: 'properties',   label: 'My Properties',         icon: Building },
  { id: 'reservations', label: 'Reservations & Escrow', icon: Bookmark },
  { id: 'add',          label: 'Add Property',          icon: PlusCircle },
  { id: 'enquiries',    label: 'Enquiries',             icon: MessageSquare },
  { id: 'reviews',      label: 'Reviews',               icon: Star },
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिंदी (Hindi)' },
  { code: 'te', name: 'తెలుగు (Telugu)' },
  { code: 'ta', name: 'தமிழ் (Tamil)' },
  { code: 'mr', name: 'मराठी (Marathi)' },
  { code: 'bn', name: 'বাংলা (Bengali)' },
  { code: 'gu', name: 'ગુજરાતી (Gujarati)' }
];

function StatCard({ icon: Icon, label, value, color, trend }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIcon} style={{ backgroundColor: `${color}18`, color }}>
        <Icon size={24} />
      </div>
      <div className={styles.statInfo}>
        <p className={styles.statLabel}>{label}</p>
        <h3 className={styles.statValue}>{value}</h3>
        {trend && <p className={styles.statTrend}>{trend}</p>}
      </div>
    </div>
  );
}

export default function OwnerDashboard() {
  const { user, profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState('light');

  const [langOpen, setLangOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(LANGUAGES[0]);

  const triggerTranslate = (langCode, langName, attempts = 0, isSilent = false) => {
    const select = document.querySelector('.goog-te-combo');
    
    if (select) {
      select.value = langCode;
      
      let event;
      if (typeof Event === 'function') {
        event = new Event('change', { bubbles: true });
      } else {
        event = document.createEvent('HTMLEvents');
        event.initEvent('change', true, true);
      }
      
      select.dispatchEvent(event);
    } else if (attempts < 20) {
      setTimeout(() => triggerTranslate(langCode, langName, attempts + 1, isSilent), 200);
    }
  };

  const handleLangChange = (lang) => {
    setCurrentLang(lang);
    setLangOpen(false);
    triggerTranslate(lang.code, lang.name, 0, false);
  };

  // Re-trigger translation silently when tab changes
  useEffect(() => {
    if (currentLang && currentLang.code !== 'en') {
      setTimeout(() => {
        triggerTranslate(currentLang.code, currentLang.name, 0, true);
      }, 150);
    }
  }, [activeTab, currentLang]);

  // Data state
  const [hostels, setHostels]     = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [bookings, setBookings]   = useState([]);
  const [loading, setLoading]     = useState(true);

  // Add property form
  const [addForm, setAddForm] = useState({
    name: '', address: '', price: '', phone: '', type: 'hostel', category: 'boys',
    lat: '', lng: '', description: '', facilities: [], is_premium: false,
    image_url: '', warden_name: '', warden_phone: '', hospital_name: '', hospital_phone: '', room_types: ''
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  // Enquiry reply state
  const [replyTexts, setReplyTexts] = useState({});
  const [replyLoading, setReplyLoading] = useState({});

  const [osmSuggestions, setOsmSuggestions] = useState([]);
  const [osmLoading, setOsmLoading] = useState(false);
  const [showOsmDropdown, setShowOsmDropdown] = useState(false);

  const handleAddressChange = async (val) => {
    setAddForm(prev => ({ ...prev, address: val }));
    if (val.trim().length < 3) {
      setOsmSuggestions([]);
      setShowOsmDropdown(false);
      return;
    }
    setOsmLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=in&limit=5`, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'StuNest-Hostel-Booking-Application'
        }
      });
      const data = await res.json();
      setOsmSuggestions(data || []);
      setShowOsmDropdown(true);
    } catch (err) {
      console.error("Nominatim Search Error:", err);
    }
    setOsmLoading(false);
  };

  const handleSelectSuggestion = (item) => {
    setAddForm(prev => ({
      ...prev,
      address: item.display_name,
      lat: Number(item.lat).toFixed(6),
      lng: Number(item.lon).toFixed(6)
    }));
    setShowOsmDropdown(false);
  };

  const FACILITIES = ['ac', 'wifi', 'food', 'laundry', 'security', 'gym', 'parking', 'study table', 'library', 'balcony'];

  const loadDashboardData = async () => {
    if (!user) return;
    try {
      const [h, e, b] = await Promise.allSettled([
        ownerApi.getMyHostels(user.id),
        enquiriesApi.getForOwner(user.id),
        supabase
          .from('bookings')
          .select('*, hostels(id, name, owner_id, price), profiles:student_id(full_name, phone, email)')
      ]);
      if (h.status === 'fulfilled') setHostels(h.value || []);
      if (e.status === 'fulfilled') setEnquiries(e.value || []);
      if (b.status === 'fulfilled' && b.value.data) {
        const ownerHostelIds = (h.value || []).map(x => x.id);
        const filtered = b.value.data.filter(x => ownerHostelIds.includes(x.hostel_id));
        setBookings(filtered);
      }
    } catch (err) {
      console.error("Error loading owner dashboard data:", err);
    }
  };

  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);
      if (error) throw error;
      alert(`Reservation status successfully updated to ${newStatus}!`);
      await loadDashboardData();
    } catch (err) {
      console.error("Error updating reservation:", err);
      alert("Failed to update reservation status.");
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadDashboardData();
      setLoading(false);
    };
    if (user) init();
  }, [user]);

  // Real-Time Data Sync Setup
  useEffect(() => {
    if (!user) return;

    // 1. Listen for new enquiries or updates globally
    const enquiriesChannel = supabase
      .channel('owner-enquiries-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'enquiries'
      }, () => {
        loadDashboardData();
      })
      .subscribe();

    // 2. Listen for hostel listings additions or updates
    const hostelsChannel = supabase
      .channel('owner-hostels-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'hostels', 
        filter: `owner_id=eq.${user.id}` 
      }, () => {
        loadDashboardData();
      })
      .subscribe();

    // 3. Listen for bookings modifications
    const bookingsChannel = supabase
      .channel('owner-bookings-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings'
      }, () => {
        loadDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(enquiriesChannel);
      supabase.removeChannel(hostelsChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, [user]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const totalViews     = hostels.reduce((a, h) => a + (h.total_views || 0), 0);
  const totalEnquiries = hostels.reduce((a, h) => a + (h.enquiry_count || 0), 0);
  const unreadCount    = enquiries.filter(e => !e.is_read).length;
  const avgRating      = hostels.length
    ? (hostels.reduce((a, h) => a + (h.rating || 0), 0) / hostels.length).toFixed(1)
    : '–';

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Owner';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  // --- Handlers ---
  const toggleFacility = (f) => {
    setAddForm(prev => ({
      ...prev,
      facilities: prev.facilities.includes(f) ? prev.facilities.filter(x => x !== f) : [...prev.facilities, f],
    }));
  };

  const handleAddProperty = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      const newHostel = await ownerApi.createHostel({
        name:        addForm.name,
        address:     addForm.address,
        price:       Number(addForm.price),
        phone:       addForm.phone,
        type:        addForm.type,
        category:    addForm.category,
        lat:         addForm.lat ? Number(addForm.lat) : null,
        lng:         addForm.lng ? Number(addForm.lng) : null,
        description: addForm.description,
        facilities:  addForm.facilities,
        is_premium:  addForm.is_premium,
        images:      addForm.image_url ? addForm.image_url.split(',').map(s=>s.trim()) : null,
        owner_id:    user.id,
        status:      'pending',
      });

      // Insert Emergency Contacts
      if (addForm.warden_name || addForm.hospital_name) {
        await ownerApi.upsertEmergencyContacts(newHostel.id, {
          warden_name: addForm.warden_name,
          warden_phone: addForm.warden_phone,
          nearest_hospital: addForm.hospital_name,
          hospital_phone: addForm.hospital_phone
        });
      }

      // Insert Room Types
      if (addForm.room_types) {
        const types = addForm.room_types.split(',');
        for (const t of types) {
          const [tName, tPrice] = t.split('-');
          if (tName && tPrice) {
             await ownerApi.upsertRoomType(newHostel.id, tName.trim(), Number(tPrice.trim()), 1, 10, 10);
          }
        }
      }
      setAddSuccess(true);
      // Reload hostels list
      const fresh = await ownerApi.getMyHostels(user.id);
      setHostels(fresh);
    } catch (err) {
      alert('Failed to create listing. Please check your details and try again.');
    }
    setAddLoading(false);
  };

  const handleReply = async (enquiryId) => {
    const text = replyTexts[enquiryId]?.trim();
    if (!text) return;
    setReplyLoading(r => ({ ...r, [enquiryId]: true }));
    try {
      await enquiriesApi.reply(enquiryId, text);
      setReplyTexts(r => ({ ...r, [enquiryId]: '' }));
      setEnquiries(prev => prev.map(e => e.id === enquiryId ? { ...e, reply: text, is_read: true } : e));
    } catch {}
    setReplyLoading(r => ({ ...r, [enquiryId]: false }));
  };

  // Mark enquiry as read when clicked
  const handleEnquiryClick = async (enquiryId) => {
    const eq = enquiries.find(e => e.id === enquiryId);
    if (eq && !eq.is_read) {
      await enquiriesApi.markRead(enquiryId).catch(() => {});
      setEnquiries(prev => prev.map(e => e.id === enquiryId ? { ...e, is_read: true } : e));
    }
  };

  return (
    <div className={styles.dashboardLayout}>

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <StuNestLogo height={32} />
          <button className={styles.sidebarClose} onClick={() => setSidebarOpen(false)}><X size={22} /></button>
        </div>

        <div className={styles.ownerProfile}>
          <div className={styles.avatar}>{avatarLetter}</div>
          <div>
            <p className={styles.ownerName}>{displayName}</p>
            <p className={styles.ownerRole}>Property Owner</p>
          </div>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`${styles.navItem} ${activeTab === item.id ? styles.navItemActive : ''}`}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {item.id === 'enquiries' && unreadCount > 0 && <span className={styles.navBadge}>{unreadCount}</span>}
            </button>
          ))}
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

        {/* Top Bar */}
        <header className={styles.topBar}>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div className={styles.topBarTitle}>
            <h2>{NAV_ITEMS.find(n => n.id === activeTab)?.label}</h2>
          </div>
          <div className={styles.topBarActions}>
            {/* Regional Language Translation */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setLangOpen(l => !l)}
                style={{
                  background: 'none',
                  border: '1.5px solid var(--color-border)',
                  color: 'var(--color-text)',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
                title="Select Language"
              >
                <Globe size={16} />
                <span>{currentLang.code.toUpperCase()}</span>
                <ChevronDown size={14} style={{ transform: langOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </button>

              {langOpen && (
                <>
                  <div 
                    onClick={() => setLangOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 0.5rem)',
                    right: 0,
                    width: '180px',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                    padding: '0.5rem',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}>
                    <div style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Translate Panel
                    </div>
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => handleLangChange(lang)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.88rem',
                          fontWeight: 500,
                          color: currentLang.code === lang.code ? 'var(--color-primary)' : 'var(--color-text)',
                          backgroundColor: currentLang.code === lang.code ? 'rgba(255, 90, 110, 0.08)' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                          transition: 'all 0.15s'
                        }}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button className={styles.notifBtn}>
              <Bell size={20} />
              {unreadCount > 0 && <span className={styles.notifDot}>{unreadCount}</span>}
            </button>
          </div>
        </header>

        <main className={styles.content}>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
              <div style={{ width: '36px', height: '36px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <>
              {/* === DASHBOARD TAB === */}
              {activeTab === 'dashboard' && (
                <div className={styles.tabContent}>
                  <div className={styles.welcomeBanner}>
                    <div>
                      <h1>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {displayName.split(' ')[0]}!</h1>
                      <p>Here's an overview of your properties and enquiries.</p>
                    </div>
                    <button className={styles.addBtn} onClick={() => setActiveTab('add')}>
                      <PlusCircle size={18} /> Add Property
                    </button>
                  </div>

                  <div className={styles.statsGrid}>
                    <StatCard icon={Building}      label="Total Properties" value={hostels.length}             color="#FF5A6E" trend={`${hostels.filter(h => h.status === 'active').length} active`} />
                    <StatCard icon={Eye}           label="Total Views"      value={totalViews.toLocaleString()} color="#3B82F6" trend="All time" />
                    <StatCard icon={MessageSquare} label="Enquiries"        value={enquiries.length}            color="#8B5CF6" trend={`${unreadCount} unread`} />
                    <StatCard icon={TrendingUp}    label="Avg. Rating"      value={`${avgRating} ⭐`}           color="#F59E0B" trend={`${hostels.length} listing${hostels.length !== 1 ? 's' : ''}`} />
                  </div>

                  <h2 className={styles.sectionTitle}>Your Properties</h2>
                  {hostels.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)', background: 'var(--color-background)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                      <Building size={36} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
                      <p>No properties yet. Add your first listing!</p>
                    </div>
                  ) : (
                    <div className={styles.propertyList}>
                      {hostels.map(h => (
                        <div key={h.id} className={styles.propertyRow}>
                          <img src={h.images?.[0] || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=400'} alt={h.name} className={styles.propertyImg} />
                          <div className={styles.propertyInfo}>
                            <h4>{h.name}</h4>
                            <p>{h.address}</p>
                            <div className={styles.propertyMeta}>
                              <span>₹{h.price}/mo</span>
                              <span><Eye size={14} /> {h.total_views || 0} views</span>
                              <span><MessageSquare size={14} /> {h.enquiry_count || 0} enquiries</span>
                              <span><Star size={14} fill="#F59E0B" color="#F59E0B" /> {h.rating || '–'}</span>
                            </div>
                          </div>
                          <div className={styles.propertyActions}>
                            <span className={`${styles.statusBadge} ${h.status === 'active' ? styles.statusActive : styles.statusPending}`}>
                              {h.status}
                            </span>
                            <Link to={`/hostel/${h.id}`} className={styles.editBtn}>View</Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <h2 className={styles.sectionTitle}>Recent Enquiries</h2>
                  <div className={styles.enquiryList}>
                    {enquiries.slice(0, 3).map(eq => (
                      <div key={eq.id} className={`${styles.enquiryCard} ${!eq.is_read ? styles.enquiryUnread : ''}`} onClick={() => handleEnquiryClick(eq.id)}>
                        <div className={styles.enquiryAvatar}>{eq.student_name?.charAt(0) || '?'}</div>
                        <div className={styles.enquiryBody}>
                          <div className={styles.enquiryHeader}>
                            <strong>{eq.student_name}</strong>
                            <span className={styles.enquiryCollege}>{eq.student_college}</span>
                            <span className={styles.enquiryTime}>{new Date(eq.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                          </div>
                          <p className={styles.enquiryHostel}>Re: {eq.hostels?.name}</p>
                          <p className={styles.enquiryMsg}>{eq.message}</p>
                        </div>
                        {!eq.is_read && <span className={styles.unreadDot} />}
                      </div>
                    ))}
                    {enquiries.length === 0 && (
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '1rem 0' }}>No enquiries yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* === RESERVATIONS TAB === */}
              {activeTab === 'reservations' && (
                <div className={styles.tabContent}>
                  <div className={styles.tabHeader}>
                    <div>
                      <h1>Reservations & Escrow Management</h1>
                      <p>Monitor student booking escrows, verify room holds, and confirm move-in schedules.</p>
                    </div>
                  </div>

                  {bookings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', background: 'var(--color-background)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                      <Bookmark size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                      <p>No active reservations received yet.</p>
                    </div>
                  ) : (
                    <div className={styles.propertyList}>
                      {bookings.map(b => (
                        <div key={b.id} className={styles.propertyRow} style={{ alignItems: 'center' }}>
                          <div className={styles.propertyInfo}>
                            <h4>
                              {b.profiles?.full_name || 'Anonymous Student'}{' '}
                              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                                ({b.profiles?.email})
                              </span>
                            </h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.2rem 0 0.5rem 0' }}>
                              Reserved property: <strong>{b.hostels?.name}</strong>
                            </p>
                            <div className={styles.propertyMeta}>
                              <span>Room: <strong>{b.room_type || 'Standard Sharing'}</strong></span>
                              <span>Move-in: <strong>{b.move_in_date ? new Date(b.move_in_date).toLocaleDateString('en-IN') : 'Pending'}</strong></span>
                              <span>Escrow Token: <strong style={{ color: 'var(--color-primary)' }}>₹{b.token_amount}</strong></span>
                              <span>Booked: <strong>{new Date(b.created_at).toLocaleDateString('en-IN')}</strong></span>
                            </div>
                          </div>
                          <div className={styles.propertyActions} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span 
                              className={styles.statusBadge} 
                              style={{
                                background: b.status === 'confirmed' ? 'rgba(16, 185, 129, 0.1)' : b.status === 'pending' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: b.status === 'confirmed' ? '#10B981' : b.status === 'pending' ? '#F59E0B' : '#EF4444',
                                textTransform: 'capitalize'
                              }}
                            >
                              {b.status.replace(/_/g, ' ')}
                            </span>
                            
                            {b.status === 'pending' && (
                              <button 
                                onClick={() => handleUpdateBookingStatus(b.id, 'confirmed')} 
                                className={styles.editBtn} 
                                style={{ background: '#10B981', color: '#fff', border: '#10B981' }}
                              >
                                Confirm
                              </button>
                            )}

                            {b.status !== 'cancelled_by_owner' && b.status !== 'completed' && (
                              <button 
                                onClick={() => handleUpdateBookingStatus(b.id, 'cancelled_by_owner')} 
                                className={styles.editBtn} 
                                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: 'none' }}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* === PROPERTIES TAB === */}
              {activeTab === 'properties' && (
                <div className={styles.tabContent}>
                  <div className={styles.tabHeader}>
                    <div>
                      <h1>My Properties</h1>
                      <p>{hostels.length} properties listed</p>
                    </div>
                    <button className={styles.addBtn} onClick={() => setActiveTab('add')}>
                      <PlusCircle size={18} /> Add New
                    </button>
                  </div>
                  {hostels.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', background: 'var(--color-background)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                      <p>No properties yet.</p>
                    </div>
                  ) : (
                    <div className={styles.propertyList}>
                      {hostels.map(h => (
                        <div key={h.id} className={styles.propertyRow}>
                          <img src={h.images?.[0] || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=400'} alt={h.name} className={styles.propertyImg} />
                          <div className={styles.propertyInfo}>
                            <h4>{h.name}</h4>
                            <p>{h.address}</p>
                            <div className={styles.propertyMeta}>
                              <span>₹{h.price}/mo</span>
                              <span><Eye size={14} /> {h.total_views || 0}</span>
                              <span><MessageSquare size={14} /> {h.enquiry_count || 0}</span>
                            </div>
                          </div>
                          <div className={styles.propertyActions}>
                            <span className={`${styles.statusBadge} ${h.status === 'active' ? styles.statusActive : styles.statusPending}`}>{h.status}</span>
                            <Link to={`/hostel/${h.id}`} className={styles.editBtn}>View</Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* === ADD PROPERTY TAB === */}
              {activeTab === 'add' && (
                <div className={styles.tabContent}>
                  <h1>Add New Property</h1>
                  <p className={styles.tabDesc}>Fill in the details below to list your hostel or PG on StuNest.</p>

                  {addSuccess ? (
                    <div style={{ padding: '1.5rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', color: '#059669', fontWeight: 600, maxWidth: '560px', marginTop: '1.5rem' }}>
                      ✅ Property submitted for review! It will be visible once approved by our team.
                      <button style={{ display: 'block', marginTop: '1rem', padding: '0.6rem 1.5rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }} onClick={() => { setAddSuccess(false); setAddForm({ name:'', address:'', price:'', phone:'', type:'hostel', category:'boys', lat:'', lng:'', description:'', facilities:[], is_premium:false, image_url:'', warden_name:'', warden_phone:'', hospital_name:'', hospital_phone:'', room_types:'' }); }}>
                        Add Another
                      </button>
                    </div>
                  ) : (
                    <form className={styles.addForm} onSubmit={handleAddProperty}>
                      <div className={styles.formSection}>
                        <h3>Basic Information</h3>
                        <div className={styles.formGrid}>
                          <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                            <div style={{ padding: '0.75rem 1rem', borderRadius: '12px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.85rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              ✨ <strong>OpenStreetMap Autocomplete Active:</strong> Start typing below to auto-detect location coordinates for free!
                            </div>
                          </div>
                          <div className={styles.formGroup}>
                            <label>Property Name *</label>
                            <input type="text" placeholder="e.g. Sunrise Boys Hostel" className={styles.formInput} value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} required />
                          </div>
                          <div className={styles.formGroup}>
                            <label>Monthly Rent (₹) *</label>
                            <input type="number" placeholder="e.g. 8500" className={styles.formInput} value={addForm.price} onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))} required />
                          </div>
                          <div className={styles.formGroup} style={{ position: 'relative' }}>
                            <label>Full Address *</label>
                            <input
                              type="text"
                              placeholder="Street, Area, City (e.g., Kukatpally)"
                              className={styles.formInput}
                              value={addForm.address}
                              onChange={e => handleAddressChange(e.target.value)}
                              onFocus={() => setShowOsmDropdown(osmSuggestions.length > 0)}
                              onBlur={() => setTimeout(() => setShowOsmDropdown(false), 200)}
                              required
                            />
                            {osmLoading && (
                              <div style={{ position: 'absolute', right: '12px', bottom: '12px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                Loading...
                              </div>
                            )}
                            {showOsmDropdown && osmSuggestions.length > 0 && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                backgroundColor: 'var(--color-surface)',
                                border: '1.5px solid var(--color-border)',
                                borderRadius: '12px',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                                zIndex: 100,
                                maxHeight: '220px',
                                overflowY: 'auto',
                                marginTop: '6px'
                              }}>
                                {osmSuggestions.map((item, index) => (
                                  <div
                                    key={index}
                                    style={{
                                      padding: '0.75rem 1rem',
                                      cursor: 'pointer',
                                      borderBottom: index === osmSuggestions.length - 1 ? 'none' : '1px solid var(--color-border)',
                                      fontSize: '0.875rem',
                                      color: 'var(--color-text)',
                                      transition: 'background 0.2s',
                                    }}
                                    onMouseDown={() => handleSelectSuggestion(item)}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-background)'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                  >
                                    📍 {item.display_name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className={styles.formGroup}>
                            <label>Phone Number *</label>
                            <input type="tel" placeholder="+91 98765 43210" className={styles.formInput} value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} required />
                          </div>
                          <div className={styles.formGroup}>
                            <label>Property Type *</label>
                            <select className={styles.formInput} value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))}>
                              <option value="hostel">Hostel</option>
                              <option value="pg">PG</option>
                            </select>
                          </div>
                          <div className={styles.formGroup}>
                            <label>Gender Category *</label>
                            <select className={styles.formInput} value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}>
                              <option value="boys">Boys</option>
                              <option value="girls">Girls</option>
                              <option value="both">Both (Co-living)</option>
                            </select>
                          </div>
                          <div className={styles.formGroup}>
                            <label>Latitude (for map)</label>
                            <input type="number" step="any" placeholder="e.g. 17.4910" className={styles.formInput} value={addForm.lat} onChange={e => setAddForm(f => ({ ...f, lat: e.target.value }))} />
                          </div>
                          <div className={styles.formGroup}>
                            <label>Longitude (for map)</label>
                            <input type="number" step="any" placeholder="e.g. 78.3930" className={styles.formInput} value={addForm.lng} onChange={e => setAddForm(f => ({ ...f, lng: e.target.value }))} />
                          </div>
                        </div>
                      </div>

                      <div className={styles.formSection}>
                        <h3>Images</h3>
                        <div className={styles.formGroup}>
                          <label>Image URLs (Comma separated)</label>
                          <input type="text" placeholder="https://image1.jpg, https://image2.jpg" className={styles.formInput} value={addForm.image_url} onChange={e => setAddForm(f => ({ ...f, image_url: e.target.value }))} />
                        </div>
                      </div>

                      <div className={styles.formSection}>
                        <h3>Room Types & Pricing</h3>
                        <div className={styles.formGroup}>
                          <label>Room Types (Format: Name-Price, e.g., Single-15000, Double-8500)</label>
                          <input type="text" placeholder="Single-15000, Double-8500" className={styles.formInput} value={addForm.room_types} onChange={e => setAddForm(f => ({ ...f, room_types: e.target.value }))} />
                        </div>
                      </div>

                      <div className={styles.formSection}>
                        <h3>Emergency Contacts</h3>
                        <div className={styles.formGrid}>
                          <div className={styles.formGroup}>
                            <label>Warden Name</label>
                            <input type="text" placeholder="Warden Name" className={styles.formInput} value={addForm.warden_name} onChange={e => setAddForm(f => ({ ...f, warden_name: e.target.value }))} />
                          </div>
                          <div className={styles.formGroup}>
                            <label>Warden Phone</label>
                            <input type="text" placeholder="Warden Phone" className={styles.formInput} value={addForm.warden_phone} onChange={e => setAddForm(f => ({ ...f, warden_phone: e.target.value }))} />
                          </div>
                          <div className={styles.formGroup}>
                            <label>Nearest Hospital</label>
                            <input type="text" placeholder="Hospital Name" className={styles.formInput} value={addForm.hospital_name} onChange={e => setAddForm(f => ({ ...f, hospital_name: e.target.value }))} />
                          </div>
                          <div className={styles.formGroup}>
                            <label>Hospital Phone</label>
                            <input type="text" placeholder="Hospital Phone" className={styles.formInput} value={addForm.hospital_phone} onChange={e => setAddForm(f => ({ ...f, hospital_phone: e.target.value }))} />
                          </div>
                        </div>
                      </div>

                      <div className={styles.formSection}>
                        <h3>Description</h3>
                        <textarea className={styles.formTextarea} rows={5} placeholder="Describe your property — facilities, rules, nearby landmarks..." value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} />
                      </div>

                      <div className={styles.formSection}>
                        <h3>Facilities Offered</h3>
                        <div className={styles.facilityCheckGrid}>
                          {FACILITIES.map(f => (
                            <label key={f} className={styles.facilityCheckLabel}>
                              <input type="checkbox" checked={addForm.facilities.includes(f)} onChange={() => toggleFacility(f)} />
                              {' '}{f === 'ac' ? 'AC' : f === 'wifi' ? 'WiFi' : f.charAt(0).toUpperCase() + f.slice(1)}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className={styles.formSection}>
                        <h3>Category</h3>
                        <div className={styles.facilityCheckGrid}>
                          <label className={styles.facilityCheckLabel}><input type="radio" name="is_premium" checked={!addForm.is_premium} onChange={() => setAddForm(f => ({ ...f, is_premium: false }))} /> Standard</label>
                          <label className={styles.facilityCheckLabel}><input type="radio" name="is_premium" checked={addForm.is_premium} onChange={() => setAddForm(f => ({ ...f, is_premium: true }))} /> Premium</label>
                        </div>
                      </div>

                      <button type="submit" className={styles.submitPropertyBtn} disabled={addLoading}>
                        <PlusCircle size={20} /> {addLoading ? 'Submitting...' : 'List Property'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* === ENQUIRIES TAB === */}
              {activeTab === 'enquiries' && (
                <div className={styles.tabContent}>
                  <h1>Student Enquiries</h1>
                  <p className={styles.tabDesc}>{unreadCount} unread · {enquiries.length} total enquiries</p>
                  <div className={styles.enquiryList}>
                    {enquiries.length === 0 && (
                      <p style={{ color: 'var(--color-text-muted)', padding: '2rem 0', textAlign: 'center' }}>No enquiries yet.</p>
                    )}
                    {enquiries.map(eq => (
                      <div key={eq.id} className={`${styles.enquiryCard} ${!eq.is_read ? styles.enquiryUnread : ''}`} onClick={() => handleEnquiryClick(eq.id)}>
                        <div className={styles.enquiryAvatar}>{eq.student_name?.charAt(0) || '?'}</div>
                        <div className={styles.enquiryBody}>
                          <div className={styles.enquiryHeader}>
                            <strong>{eq.student_name}</strong>
                            <span className={styles.enquiryCollege}>{eq.student_college}</span>
                            <span className={styles.enquiryTime}>{new Date(eq.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                          <p className={styles.enquiryHostel}>Re: {eq.hostels?.name}</p>
                          <p className={styles.enquiryMsg}>{eq.message}</p>
                          {eq.reply && (
                            <div style={{ marginTop: '0.5rem', padding: '0.65rem', background: 'rgba(59,130,246,0.07)', borderLeft: '3px solid #3B82F6', borderRadius: '4px', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                              <strong style={{ color: '#3B82F6' }}>Your reply:</strong> {eq.reply}
                            </div>
                          )}
                          <div className={styles.enquiryReplyRow} onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              placeholder="Type a reply..."
                              className={styles.replyInput}
                              value={replyTexts[eq.id] || ''}
                              onChange={e => setReplyTexts(r => ({ ...r, [eq.id]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && handleReply(eq.id)}
                            />
                            <button className={styles.replyBtn} onClick={() => handleReply(eq.id)} disabled={replyLoading[eq.id]}>
                              {replyLoading[eq.id] ? '...' : <Send size={15} />}
                            </button>
                          </div>
                        </div>
                        {!eq.is_read && <span className={styles.unreadDot} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* === REVIEWS TAB === */}
              {activeTab === 'reviews' && (
                <div className={styles.tabContent}>
                  <h1>Student Reviews</h1>
                  <p className={styles.tabDesc}>Reviews from students for your properties.</p>
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-background)', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
                    <Star size={36} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
                    <p>Review summaries will appear here once students submit them.</p>
                    <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Students can leave reviews from the hostel detail page.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
