import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Bookmark, MapPin, Calendar, CheckCircle, Clock, XCircle, 
  Users, MessageSquare, User, Send, Heart, Shield, HelpCircle,
  Tag, Gift
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabase';
import { roommateApi, hostelsApi } from '../lib/api';
import MapSearchPage from './MapSearchPage';
import styles from './StudentDashboard.module.css';

const STATUS_CONFIG = {
  confirmed:            { label: 'Confirmed',  color: '#10B981', bg: 'rgba(16,185,129,0.1)',  icon: CheckCircle },
  pending:              { label: 'Pending',    color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: Clock },
  cancelled_by_student: { label: 'Cancelled',  color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   icon: XCircle },
};

const SLEEP_LABELS  = { early_bird: 'Early Bird', night_owl: 'Night Owl', flexible: 'Flexible' };
const STUDY_LABELS  = { silent: 'Silent Study', music: 'With Music', group_study: 'Group Study', flexible: 'Any Style' };
const DIET_LABELS   = { veg: 'Vegetarian', non_veg: 'Non-Veg', vegan: 'Vegan', any: 'Any Diet' };

// AI Heuristic Engine to generate personality type and custom aura
function identifyAIPersona(profile) {
  if (!profile) return "The Adaptive Scholar";
  
  const bio = (profile.bio || "").toLowerCase();
  const sleep = profile.sleep_schedule;
  const study = profile.study_habits || profile.study_style;
  
  const isGamer = bio.includes("game") || bio.includes("gaming") || bio.includes("play") || bio.includes("cod") || bio.includes("pubg");
  const isMusic = bio.includes("music") || bio.includes("song") || bio.includes("sing") || bio.includes("guitar") || bio.includes("spotify");
  const isFitness = bio.includes("gym") || bio.includes("workout") || bio.includes("fitness") || bio.includes("sports") || bio.includes("cricket");
  const isQuiet = bio.includes("quiet") || bio.includes("silent") || bio.includes("introvert") || bio.includes("peace");

  if (sleep === 'night_owl') {
    if (isGamer) return "Midnight Elite Gamer";
    if (study === 'music') return "Nocturnal Creative Prodigy";
    if (isQuiet) return "Zen Midnight Thinker";
    return "Dynamic Night Owl";
  }
  
  if (sleep === 'early_bird') {
    if (isFitness) return "Active Morning Champion";
    if (isQuiet) return "Disciplined Morning Scholar";
    return "Mindful Early Bird";
  }
  
  if (isGamer) return "Easygoing Tech Enthusiast";
  if (isMusic) return "Melody-Driven Explorer";
  if (isFitness) return "Wellness & Sport Ally";
  if (isQuiet) return "Peaceful Harmonist";
  
  if (study === 'group_study') return "Collaborative Team Player";
  return "Adaptive All-Rounder";
}

// Advanced AI Matching Heuristics to determine compatibility score
function calculateAIMatchScore(userProfile, otherProfile) {
  if (!userProfile || !otherProfile) return 75;
  
  let score = 60;
  
  // Sleep match
  if (userProfile.sleep_schedule === otherProfile.sleep_schedule) {
    score += 15;
  } else if (userProfile.sleep_schedule === 'flexible' || otherProfile.sleep_schedule === 'flexible') {
    score += 8;
  } else {
    score -= 12; // active mismatch
  }
  
  // Study match
  const userStudy = userProfile.study_habits || userProfile.study_style;
  const otherStudy = otherProfile.study_habits || otherProfile.study_style;
  if (userStudy === otherStudy) {
    score += 12;
  } else if (userStudy === 'flexible' || otherStudy === 'flexible') {
    score += 6;
  } else {
    score -= 5;
  }
  
  // Diet match
  if (userProfile.dietary_pref === otherProfile.dietary_pref) {
    score += 10;
  } else if (userProfile.dietary_pref === 'any' || otherProfile.dietary_pref === 'any') {
    score += 5;
  }
  
  // Hostel proximity match
  if (userProfile.hostel_id && otherProfile.hostel_id && userProfile.hostel_id === otherProfile.hostel_id) {
    score += 8;
  }

  // Handle hobbies overlaps if present
  const userHobbies = Array.isArray(userProfile.hobbies) ? userProfile.hobbies : [];
  const otherHobbies = Array.isArray(otherProfile.hobbies) ? otherProfile.hobbies : [];
  const overlap = userHobbies.filter(h => otherHobbies.includes(h));
  score += (overlap.length * 3);
  
  return Math.max(30, Math.min(score, 99)); // bounded between 30% and 99%
}

export default function StudentDashboard({ defaultTab }) {
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || defaultTab || 'bookings';

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Student';

  // State Management
  const [bookings, setBookings] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [roommates, setRoommates] = useState([]);
  const [myRoommateProfile, setMyRoommateProfile] = useState(null);
  const [hostels, setHostels] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSubmitted, setProfileSubmitted] = useState(false);

  // Roommate Form State
  const [roommateForm, setRoommateForm] = useState({
    branch: '',
    year_of_study: 1,
    hostel_id: '',
    sleep_schedule: 'flexible',
    study_habits: 'flexible',
    dietary_pref: 'any',
    hobbies: '',
    bio: '',
  });

  const updateForm = (key, value) => {
    setRoommateForm(prev => ({ ...prev, [key]: value }));
  };

  // Main Loader Function
  const loadDashboardData = async () => {
    if (!user) return;
    try {
      const [bookingsRes, enquiriesRes, hostelsRes, myProfileRes] = await Promise.allSettled([
        supabase
          .from('bookings')
          .select('*, hostels(name, address, images, price)')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('enquiries')
          .select('*, hostels(name, address)')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false }),
        hostelsApi.getAll({ limit: 100 }),
        roommateApi.getProfile(user.id)
      ]);

      if (bookingsRes.status === 'fulfilled' && !bookingsRes.value.error) {
        setBookings(bookingsRes.value.data || []);
      }
      if (enquiriesRes.status === 'fulfilled' && !enquiriesRes.value.error) {
        setEnquiries(enquiriesRes.value.data || []);
      }
      if (hostelsRes.status === 'fulfilled') {
        setHostels(hostelsRes.value || []);
      }
      if (myProfileRes.status === 'fulfilled' && myProfileRes.value) {
        const p = myProfileRes.value;
        setMyRoommateProfile(p);
        setProfileSubmitted(true);
        setRoommateForm({
          branch: p.branch || '',
          year_of_study: p.year_of_study || 1,
          hostel_id: p.hostel_id || '',
          sleep_schedule: p.sleep_schedule || 'flexible',
          study_habits: p.study_habits || p.study_style || 'flexible',
          dietary_pref: p.dietary_pref || 'any',
          hobbies: Array.isArray(p.hobbies) ? p.hobbies.join(', ') : '',
          bio: p.bio || '',
        });
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    }
  };

  // Load roommate list for match calculations
  const loadRoommateList = async () => {
    try {
      const data = await roommateApi.getAllActive(user?.id);
      setRoommates(data || []);
    } catch (err) {
      console.error("Error loading roommate list:", err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadDashboardData(), loadRoommateList()]);
      setLoading(false);
    };
    if (user) init();
  }, [user]);

  // Real-Time Data Sync Setup
  useEffect(() => {
    if (!user) return;

    // 1. Listen for changes in bookings
    const bookingsChannel = supabase
      .channel('student-bookings-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'bookings', 
        filter: `student_id=eq.${user.id}` 
      }, () => {
        loadDashboardData();
      })
      .subscribe();

    // 2. Listen for replies or updates to enquiries
    const enquiriesChannel = supabase
      .channel('student-enquiries-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'enquiries', 
        filter: `student_id=eq.${user.id}` 
      }, () => {
        loadDashboardData();
      })
      .subscribe();

    // 3. Listen for roommate profiles additions/updates globally
    const roommatesChannel = supabase
      .channel('roommates-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'roommate_profiles' 
      }, () => {
        loadRoommateList();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(enquiriesChannel);
      supabase.removeChannel(roommatesChannel);
    };
  }, [user]);

  // Handle Roommate Profile Form Submit
  const handleRoommateSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const parsedHobbies = roommateForm.hobbies
        .split(',')
        .map(h => h.trim())
        .filter(h => h.length > 0);

      const saved = await roommateApi.upsertProfile(user.id, {
        branch: roommateForm.branch,
        year_of_study: parseInt(roommateForm.year_of_study),
        hostel_id: roommateForm.hostel_id || null,
        sleep_schedule: roommateForm.sleep_schedule,
        study_habits: roommateForm.study_habits,
        dietary_pref: roommateForm.dietary_pref,
        hobbies: parsedHobbies,
        bio: roommateForm.bio,
        is_looking: true,
      });

      // Update state
      setMyRoommateProfile(saved);
      setProfileSubmitted(true);
      
      // Reload matching pool
      await loadRoommateList();
    } catch (err) {
      console.error("Error saving roommate profile:", err);
    } finally {
      setSavingProfile(false);
    }
  };

  // Remove roommate profile from discovery
  const handleRemoveProfile = async () => {
    if (!myRoommateProfile) return;
    setSavingProfile(true);
    try {
      await roommateApi.upsertProfile(user.id, {
        ...myRoommateProfile,
        is_looking: false
      });
      setMyRoommateProfile(null);
      setProfileSubmitted(false);
    } catch (err) {
      console.error("Error disabling roommate profile:", err);
    } finally {
      setSavingProfile(false);
    }
  };

  // Compute matches using dynamic AI Engine
  const computedMatches = roommates.map(r => {
    const score = calculateAIMatchScore(myRoommateProfile || roommateForm, r);
    const persona = identifyAIPersona(r);
    return { ...r, match_score: score, ai_persona: persona };
  }).sort((a, b) => b.match_score - a.match_score);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-background)' }}>
        <div style={{ width: '45px', height: '45px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      {/* Sidebar Navigation */}
      <aside className={styles.sidebar}>
        <div className={styles.profileCard}>
          <div className={styles.avatar}>
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className={styles.profileInfo}>
            <h3>{displayName}</h3>
            <p>Student Account</p>
          </div>
        </div>

        <nav className={styles.nav}>
          <button 
            className={`${styles.navBtn} ${activeTab === 'bookings' ? styles.navBtnActive : ''}`}
            onClick={() => setSearchParams({ tab: 'bookings' })}
          >
            <Bookmark size={18} /> My Bookings
          </button>
          <button 
            className={`${styles.navBtn} ${activeTab === 'map' ? styles.navBtnActive : ''}`}
            onClick={() => setSearchParams({ tab: 'map' })}
          >
            <MapPin size={18} /> Interactive Map View
          </button>
          <button 
            className={`${styles.navBtn} ${activeTab === 'roommates' ? styles.navBtnActive : ''}`}
            onClick={() => setSearchParams({ tab: 'roommates' })}
          >
            <Users size={18} /> AI Roommate Matcher
          </button>
          <button 
            className={`${styles.navBtn} ${activeTab === 'enquiries' ? styles.navBtnActive : ''}`}
            onClick={() => setSearchParams({ tab: 'enquiries' })}
          >
            <MessageSquare size={18} /> My Enquiries
          </button>
          <button 
            className={`${styles.navBtn} ${activeTab === 'profile' ? styles.navBtnActive : ''}`}
            onClick={() => setSearchParams({ tab: 'profile' })}
          >
            <User size={18} /> AI Profile Settings
          </button>
          <button 
            className={`${styles.navBtn} ${activeTab === 'discounts' ? styles.navBtnActive : ''}`}
            onClick={() => setSearchParams({ tab: 'discounts' })}
          >
            <Tag size={18} /> Exclusive Discounts
          </button>
        </nav>
      </aside>

      {/* Main Panel Content */}
      <main className={styles.mainContent}>
        {/* Render: Map View Tab */}
        {activeTab === 'map' && (
          <div style={{ height: '700px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--color-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <MapSearchPage />
          </div>
        )}

        {/* Render: Bookings Tab */}
        {activeTab === 'bookings' && (
          <div>
            <div className={styles.header}>
              <h1>My Bookings</h1>
              <p>Verify escrow tokens, active statuses, and move-in schedules.</p>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}><Bookmark size={20} /></div>
                <div className={styles.statInfo}>
                  <h3>{bookings.length}</h3>
                  <p>Total Bookings</p>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}><CheckCircle size={20} style={{ color: '#10B981' }} /></div>
                <div className={styles.statInfo}>
                  <h3>{bookings.filter(b => b.status === 'confirmed').length}</h3>
                  <p>Confirmed Stay</p>
                </div>
              </div>
            </div>

            {bookings.length === 0 ? (
              <div className={styles.emptyState}>
                <Bookmark size={48} style={{ opacity: 0.15, marginBottom: '1rem' }} />
                <h3>No Bookings Found</h3>
                <p>Browse through hundreds of JNTUH/CMRIT premium hostels and book your slot.</p>
                <Link to="/search" className={styles.primaryBtn}>Find Hostels</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {bookings.map(b => {
                  const hostel = b.hostels || {};
                  const statusInfo = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusInfo.icon;
                  const img = hostel.images?.[0] || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=600';

                  return (
                    <div key={b.id} className={styles.card} style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <img src={img} alt={hostel.name} style={{ width: '150px', height: '100px', objectFit: 'cover', borderRadius: '12px', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: '250px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>{hostel.name}</h3>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: statusInfo.bg, color: statusInfo.color, padding: '0.3rem 0.75rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 800 }}>
                            <StatusIcon size={12} /> {statusInfo.label}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', margin: '0 0 0.75rem 0' }}>
                          <MapPin size={14} /> {hostel.address}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                          <span>Monthly Rent: <strong style={{ color: 'var(--color-primary)' }}>₹{hostel.price ? hostel.price.toLocaleString('en-IN') : 'N/A'}/mo</strong></span>
                          <span>Room: <strong>{b.room_type || 'Standard Sharing'}</strong></span>
                          <span>Move-in: <strong>{b.move_in_date ? new Date(b.move_in_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pending'}</strong></span>
                          <span>Escrow Token: <strong>₹{b.token_amount || 200}</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Render: Roommate AI Matcher Tab */}
        {activeTab === 'roommates' && (
          <div>
            <div className={styles.header}>
              <h1>AI Roommate Matcher</h1>
              <p>Connect with campus peers matching your strict lifestyle and academic personality rules.</p>
            </div>

            {/* Display user's own generated AI Persona */}
            {profileSubmitted && myRoommateProfile ? (
              <div className={styles.aiPersonaCard} style={{ marginBottom: '2.5rem' }}>
                <div className={styles.aiPersonaHeader}>
                  <div>
                    <span className={styles.aiBadge}>Your AI Personality Profile</span>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.75rem 0 0.25rem 0' }}>
                      {myRoommateProfile.name || displayName}
                    </h2>
                    <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', margin: 0 }}>
                      {myRoommateProfile.branch} &middot; Year {myRoommateProfile.year_of_study}
                    </p>
                    <div className={styles.personaAura}>
                      {identifyAIPersona(myRoommateProfile)}
                    </div>
                  </div>
                  <button 
                    onClick={() => setSearchParams({ tab: 'profile' })}
                    className={styles.secondaryBtn}
                  >
                    Adjust Habits
                  </button>
                </div>
                <p style={{ marginTop: '1.25rem', fontSize: '0.92rem', fontStyle: 'italic', color: 'var(--color-text-muted)', borderLeft: '3px solid var(--color-primary)', paddingLeft: '1rem', lineHeight: 1.6 }}>
                  "{myRoommateProfile.bio || 'No bio specified yet.'}"
                </p>
              </div>
            ) : (
              <div className={styles.aiPersonaCard} style={{ marginBottom: '2.5rem', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.03), rgba(245, 158, 11, 0.03))', borderColor: 'rgba(245, 158, 11, 0.15)' }}>
                <span className={styles.aiBadge} style={{ background: '#F59E0B' }}>Action Required</span>
                <h3 style={{ fontWeight: 800, fontSize: '1.15rem', margin: '0.75rem 0 0.35rem 0' }}>AI Persona Discovery Disabled</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                  Configure your rooming settings to enable dynamic matchmaking metrics. You can still see default matches below.
                </p>
                <button onClick={() => setSearchParams({ tab: 'profile' })} className={styles.primaryBtn}>Configure My Habits</button>
              </div>
            )}

            {/* Match List */}
            <h2 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '1.25rem' }}>Personalized Compatibility Pool</h2>
            {computedMatches.length === 0 ? (
              <div className={styles.emptyState}>
                <Users size={48} style={{ opacity: 0.15, marginBottom: '1rem' }} />
                <h3>No Matches Found</h3>
                <p>Check back shortly as more students verify their profiles near your campus.</p>
              </div>
            ) : (
              <div className={styles.roommateGrid}>
                {computedMatches.map(r => {
                  const details = r.profiles || {};
                  const hostelName = r.hostels?.name || 'Searching for Hostel';

                  return (
                    <div key={r.id} className={styles.roommateCard}>
                      <span className={styles.matchScoreBadge}>
                        {r.match_score}% Match
                      </span>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div className={styles.avatar} style={{ width: '44px', height: '44px', fontSize: '1rem' }}>
                          {(details.full_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 style={{ fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>{details.full_name || 'Anonymous Student'}</h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.1rem 0 0 0' }}>
                            {r.branch} &middot; Year {r.year_of_study}
                          </p>
                        </div>
                      </div>

                      <div style={{ marginBottom: '0.85rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-primary)', background: 'rgba(139, 92, 246, 0.08)', padding: '0.2rem 0.55rem', borderRadius: '4px', display: 'inline-block' }}>
                          {r.ai_persona}
                        </span>
                      </div>

                      <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: '1rem', lineHeight: 1.6 }}>
                        "{r.bio || 'Hey there! Looking for a neat room and a chill study companion.'}"
                      </p>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                        <span className={styles.tag}>{SLEEP_LABELS[r.sleep_schedule] || r.sleep_schedule}</span>
                        <span className={styles.tag}>{STUDY_LABELS[r.study_habits] || r.study_habits}</span>
                        <span className={styles.tag}>{DIET_LABELS[r.dietary_pref] || r.dietary_pref}</span>
                      </div>

                      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <MapPin size={12} /> {hostelName}
                      </div>

                      <a 
                        href={`https://wa.me/${r.profiles?.phone || ''}?text=Hi!%20I%20saw%20your%20profile%20on%20StuNest.%20We%20have%20a%20${r.match_score}%25%20AI%20roommate%20match!%20Let's%20connect.`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.whatsappBtn}
                      >
                        <Users size={16} /> Connect on WhatsApp
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Render: My Enquiries Tab */}
        {activeTab === 'enquiries' && (
          <div>
            <div className={styles.header}>
              <h1>My Enquiries</h1>
              <p>Real-time updates on replies and questions sent directly to hostel wardens.</p>
            </div>

            {enquiries.length === 0 ? (
              <div className={styles.emptyState}>
                <MessageSquare size={48} style={{ opacity: 0.15, marginBottom: '1rem' }} />
                <h3>No Active Enquiries</h3>
                <p>Have specific pricing or double-occupancy questions? Ask owners directly from their hostel pages.</p>
                <Link to="/search" className={styles.primaryBtn}>Explore Hostels</Link>
              </div>
            ) : (
              <div className={styles.enquiryList}>
                {enquiries.map(e => (
                  <div key={e.id} className={styles.enquiryCard}>
                    <div className={styles.enquiryHeader}>
                      <span className={styles.enquiryLabel}>{e.hostels?.name || 'Hostel'}</span>
                      <span className={styles.enquiryTime}>
                        {new Date(e.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={styles.enquiryMsg}>
                      {e.message}
                    </div>
                    {e.reply ? (
                      <div className={styles.enquiryReply}>
                        {e.reply}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#F59E0B', marginLeft: '1rem' }}>
                        <Clock size={12} /> Awaiting warden response...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Render: AI Profile Settings Tab */}
        {activeTab === 'profile' && (
          <div style={{ maxWidth: '650px' }}>
            <div className={styles.header}>
              <h1>AI Profile Settings</h1>
              <p>Specify your lifestyle constraints to train the roommate indexing algorithms.</p>
            </div>

            <form onSubmit={handleRoommateSubmit} className={styles.card} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>Branch / Major</label>
                  <input 
                    type="text" 
                    placeholder="e.g. B.Tech CSE" 
                    className={styles.inputField}
                    value={roommateForm.branch} 
                    onChange={e => updateForm('branch', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>Year of Study</label>
                  <select 
                    className={styles.inputField}
                    value={roommateForm.year_of_study} 
                    onChange={e => updateForm('year_of_study', e.target.value)}
                  >
                    <option value={1}>First Year</option>
                    <option value={2}>Second Year</option>
                    <option value={3}>Third Year</option>
                    <option value={4}>Fourth Year</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>Target Hostel (Optional)</label>
                <select 
                  className={styles.inputField}
                  value={roommateForm.hostel_id} 
                  onChange={e => updateForm('hostel_id', e.target.value)}
                >
                  <option value="">Searching for matching options...</option>
                  {hostels.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>Sleep Schedule</label>
                  <select 
                    className={styles.inputField}
                    value={roommateForm.sleep_schedule} 
                    onChange={e => updateForm('sleep_schedule', e.target.value)}
                  >
                    <option value="flexible">Flexible</option>
                    <option value="early_bird">Early Bird (🌅 6 AM - 10 PM)</option>
                    <option value="night_owl">Night Owl (🦉 2 AM - 10 AM)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>Study habits</label>
                  <select 
                    className={styles.inputField}
                    value={roommateForm.study_habits} 
                    onChange={e => updateForm('study_habits', e.target.value)}
                  >
                    <option value="flexible">Any style</option>
                    <option value="silent">Strictly Silent (🤫)</option>
                    <option value="music">Background Music (🎵)</option>
                    <option value="group_study">Collaborative Groups (👥)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>Dietary Preference</label>
                <select 
                  className={styles.inputField}
                  value={roommateForm.dietary_pref} 
                  onChange={e => updateForm('dietary_pref', e.target.value)}
                >
                  <option value="any">No specific dietary constraints</option>
                  <option value="veg">Vegetarian</option>
                  <option value="non_veg">Non-Vegetarian</option>
                  <option value="vegan">Vegan</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>Hobbies (Comma separated)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Gaming, Music, Gym, Reading" 
                  className={styles.inputField}
                  value={roommateForm.hobbies} 
                  onChange={e => updateForm('hobbies', e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>Short Bio</label>
                <textarea 
                  placeholder="Tell potential roommates about yourself, your habits, and your ideal stay..." 
                  className={styles.inputField}
                  rows={4}
                  value={roommateForm.bio} 
                  onChange={e => updateForm('bio', e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  type="submit" 
                  className={styles.primaryBtn}
                  disabled={savingProfile}
                  style={{ flex: 1 }}
                >
                  {savingProfile ? 'Saving Settings...' : 'Save AI Persona Profile'}
                </button>
                {profileSubmitted && (
                  <button 
                    type="button" 
                    className={styles.secondaryBtn}
                    onClick={handleRemoveProfile}
                    disabled={savingProfile}
                    style={{ color: '#EF4444', borderColor: '#EF4444' }}
                  >
                    Disable Matching
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Render: Discounts Tab */}
        {activeTab === 'discounts' && (
          <div>
            <div className={styles.header}>
              <h1>Exclusive Student Discounts</h1>
              <p>Apply verified promo codes, track booking cashback milestones, and activate referral perks.</p>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}><Tag size={20} style={{ color: 'var(--color-primary)' }} /></div>
                <div className={styles.statInfo}>
                  <h3>₹1,500</h3>
                  <p>Active Savings</p>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}><Gift size={20} style={{ color: '#10B981' }} /></div>
                <div className={styles.statInfo}>
                  <h3>2 Active</h3>
                  <p>Promo Coupons</p>
                </div>
              </div>
            </div>

            {/* Promo Code Redeemer Panel */}
            <div className={styles.card} style={{ marginBottom: '2rem', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>Redeem Promo Code</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                Enter an official campus or seasonal promo code to unlock instant cashback credited to your reservation.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', maxWidth: '480px' }}>
                <input 
                  type="text" 
                  placeholder="e.g. STUNESTNEW, CAMPUSFEST" 
                  id="promoInput"
                  style={{
                    flex: 1,
                    padding: '0.65rem 1rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                    fontFamily: 'inherit'
                  }}
                />
                <button 
                  onClick={() => {
                    const val = document.getElementById('promoInput')?.value?.toUpperCase();
                    if (!val) return;
                    if (val === 'STUNESTNEW' || val === 'CAMPUSFEST' || val === 'STUDENT50') {
                      alert(`Promo Code "${val}" applied successfully! Flat ₹1,500 student discount activated for your next reservation.`);
                    } else {
                      alert(`Promo Code "${val}" is invalid or has expired.`);
                    }
                  }}
                  className={styles.primaryBtn}
                  style={{ padding: '0.65rem 1.25rem', fontSize: '0.875rem', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'var(--color-primary)', color: '#fff', fontWeight: 700 }}
                >
                  Apply Code
                </button>
              </div>
            </div>

            {/* Active Coupons Grid */}
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Available Coupons & Offers</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
              <div className={styles.card} style={{ position: 'relative', borderLeft: '4px solid var(--color-primary)' }}>
                <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-primary)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>ACTIVE</span>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 800 }}>STUNESTNEW</h4>
                <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  Flat ₹1,500 discount on your first month's rent token when reserving rooms near JNTUH/CMRIT campuses.
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Expires 31 Dec 2026</span>
                  <button 
                    onClick={() => {
                      const inp = document.getElementById('promoInput');
                      if (inp) {
                        inp.value = 'STUNESTNEW';
                        alert('Coupon copied to input box! Click Apply Code to activate.');
                      }
                    }} 
                    style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)', padding: '0.3rem 0.6rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Copy Code
                  </button>
                </div>
              </div>

              <div className={styles.card} style={{ position: 'relative', borderLeft: '4px solid #10B981' }}>
                <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(16,185,129,0.1)', color: '#10B981', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>EXCLUSIVE</span>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 800 }}>CAMPUSFEST</h4>
                <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  Save 10% on AC hostels and premium unisex co-living bookings. Applicable across all major cities.
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Expires 30 Sep 2026</span>
                  <button 
                    onClick={() => {
                      const inp = document.getElementById('promoInput');
                      if (inp) {
                        inp.value = 'CAMPUSFEST';
                        alert('Coupon copied to input box! Click Apply Code to activate.');
                      }
                    }} 
                    style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)', padding: '0.3rem 0.6rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Copy Code
                  </button>
                </div>
              </div>
            </div>

            {/* Gamified Cashback Milestones */}
            <div className={styles.card} style={{ marginTop: '2rem', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>Cashback Milestones</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
                Complete staying cycles at StuNest verified hostels to unlock tier milestones and premium cashbacks!
              </p>
              
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  <span>Tier 1: 30-Day Move-in Stay</span>
                  <span style={{ color: 'var(--color-primary)' }}>100% Completed</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--color-background)', borderRadius: '100px', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, var(--color-primary), #10B981)', borderRadius: '100px' }} />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>✓ Flat ₹500 cashback credited to your registered bank account on move-in verification!</p>
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  <span>Tier 2: 6-Month Loyal Resident</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>40% (2 / 6 months)</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--color-background)', borderRadius: '100px', overflow: 'hidden' }}>
                  <div style={{ width: '40%', height: '100%', background: 'var(--color-primary)', borderRadius: '100px' }} />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Unlock flat ₹1,000 bonus stay cashback on completing 6 months of active residency.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
