import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Heart, GitCompare, Users, LayoutDashboard, LogOut, LogIn, UserPlus, Menu, X, ChevronDown, Bell, Bookmark, Phone, Map, Globe, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import StuNestLogo from './StuNestLogo';
import styles from './Navbar.module.css';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिंदी (Hindi)' },
  { code: 'te', name: 'తెలుగు (Telugu)' },
  { code: 'ta', name: 'தமிழ் (Tamil)' },
  { code: 'mr', name: 'मराठी (Marathi)' },
  { code: 'bn', name: 'বাংলা (Bengali)' },
  { code: 'gu', name: 'ગુજરાતી (Gujarati)' }
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [langOpen, setLangOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(LANGUAGES[0]);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
    setLangOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

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
      if (!isSilent) {
        toast.success(langCode === 'en' ? 'Restoring English...' : `Translating to ${langName}...`);
      }
    } else if (attempts < 20) {
      setTimeout(() => triggerTranslate(langCode, langName, attempts + 1, isSilent), 200);
    } else if (!isSilent) {
      toast.error('Translation service starting up. Please refresh.');
    }
  };

  const handleLangChange = (lang) => {
    setCurrentLang(lang);
    setLangOpen(false);
    triggerTranslate(lang.code, lang.name, 0, false);
  };

  // Re-trigger translation silently when the route changes so new content gets translated
  useEffect(() => {
    if (currentLang && currentLang.code !== 'en') {
      // Give React a tiny moment to render the new page content before translating
      setTimeout(() => {
        triggerTranslate(currentLang.code, currentLang.name, 0, true);
      }, 150);
    }
  }, [location.pathname, currentLang]);


  const isActive = (path) => location.pathname === path;
  const ownerOrAdmin = profile?.role === 'owner' || profile?.role === 'admin';
  const isHome = location.pathname === '/';
  const forceLight = !isHome;
  const isLightTheme = scrolled || forceLight;

  return (
    <nav className={`${styles.navbar} ${isLightTheme ? styles.scrolled : ''} ${isLightTheme ? styles.lightTheme : ''}`}>
      <div className={styles.inner}>

        {/* Logo */}
        <StuNestLogo height={50} variant={isLightTheme ? 'default' : 'light'} />

        {/* Desktop Nav Links */}
        <div className={styles.navLinks}>
          <Link to="/" className={`${styles.navLink} ${isActive('/') ? styles.navLinkActive : ''}`}>
            <Home size={16} /> 
            <span className={styles.animText}><span>Home</span><span className={styles.animTextClone} aria-hidden="true">Home</span></span>
          </Link>
          <Link to="/search" className={`${styles.navLink} ${isActive('/search') ? styles.navLinkActive : ''}`}>
            <Search size={16} /> 
            <span className={styles.animText}><span>Listings</span><span className={styles.animTextClone} aria-hidden="true">Listings</span></span>
          </Link>
          <Link to="/compare" className={`${styles.navLink} ${isActive('/compare') ? styles.navLinkActive : ''}`}>
            <GitCompare size={16} /> 
            <span className={styles.animText}><span>Compare</span><span className={styles.animTextClone} aria-hidden="true">Compare</span></span>
          </Link>
        </div>

        {/* Right Actions */}
        <div className={styles.navActions}>
          <div className={styles.profileWrap}>
            <button className={styles.profileBtn} onClick={() => { setLangOpen(l => !l); setProfileOpen(false); }} title="Select Language">
              <div className={styles.avatarSmall} style={{ 
                background: isLightTheme ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.1)', 
                color: 'inherit',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Globe size={18} />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, paddingRight: '0.2rem' }}>{currentLang.code.toUpperCase()}</span>
              <ChevronDown size={16} />
            </button>
            {langOpen && (
              <div className={styles.profileDropdown} style={{ width: '200px', right: 0 }}>
                <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Regional Language
                </div>
                {LANGUAGES.map(lang => (
                  <button key={lang.code} className={styles.dropdownItem} onClick={() => handleLangChange(lang)}>
                    {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {user ? (
            <>
              <div className={styles.profileWrap}>
                <button className={styles.profileBtn} onClick={() => { setProfileOpen(p => !p); setLangOpen(false); }}>
                  <div className={styles.avatarSmall}>
                    {profile?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                  <span className={styles.profileName}>{profile?.full_name?.split(' ')[0] || 'Account'}</span>
                  <ChevronDown size={16} />
                </button>
                {profileOpen && (
                  <div className={styles.profileDropdown}>
                    <div className={styles.dropdownHeader}>
                      <div className={styles.avatarMed}>{profile?.full_name?.charAt(0) || 'U'}</div>
                      <div className={styles.dropdownInfo}>
                        <p className={styles.dropdownName}>{profile?.full_name || 'Student'}</p>
                        <p className={styles.dropdownEmail}>{user.email}</p>
                        <span className={styles.roleBadge}>{profile?.role || 'student'}</span>
                      </div>
                    </div>
                    <div className={styles.dropdownDivider} />
                    {profile?.role === 'owner' && (
                      <Link to="/owner" className={styles.dropdownItem}>
                        <LayoutDashboard size={16} /> Owner Dashboard
                      </Link>
                    )}
                    {profile?.role === 'admin' && (
                      <Link to="/admin" className={styles.dropdownItem}>
                        <LayoutDashboard size={16} /> Admin Dashboard
                      </Link>
                    )}
                    {profile?.role !== 'owner' && profile?.role !== 'admin' && (
                      <Link to="/student" className={styles.dropdownItem}>
                        <GraduationCap size={16} /> Student Panel
                      </Link>
                    )}
                    <div className={styles.dropdownDivider} />
                    <button className={`${styles.dropdownItem} ${styles.signOutItem}`} onClick={handleSignOut}>
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className={styles.loginBtn}>
                <LogIn size={16} /> Login
              </Link>
              <Link to="/signup" className={styles.signupBtn}>
                <UserPlus size={16} /> Sign Up
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button className={styles.menuBtn} onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ''}`}>
        {user && (
          <div className={styles.mobileUserHeader}>
            <div className={styles.avatarMed}>
              {profile?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
            </div>
            <div className={styles.mobileUserInfo}>
              <p className={styles.mobileUserName}>{profile?.full_name || 'Student'}</p>
              <p className={styles.mobileUserEmail}>{user.email}</p>
              <span className={styles.roleBadge}>{profile?.role || 'student'}</span>
            </div>
          </div>
        )}

        <Link to="/" className={styles.mobileLink} onClick={() => setMenuOpen(false)}><Home size={18} /> Home</Link>
        <Link to="/search" className={styles.mobileLink} onClick={() => setMenuOpen(false)}><Search size={18} /> Find Hostels</Link>
        <Link to="/compare" className={styles.mobileLink} onClick={() => setMenuOpen(false)}><GitCompare size={18} /> Compare</Link>
        {user && (
          <>
            {!ownerOrAdmin && <Link to="/student" className={styles.mobileLink} onClick={() => setMenuOpen(false)}><GraduationCap size={18} /> Student Panel</Link>}
            {ownerOrAdmin && <Link to="/owner" className={styles.mobileLink} onClick={() => setMenuOpen(false)}><LayoutDashboard size={18} /> Dashboard</Link>}
            <button className={`${styles.mobileLink} ${styles.mobileSignOut}`} onClick={() => { handleSignOut(); setMenuOpen(false); }}>
              <LogOut size={18} /> Sign Out
            </button>
          </>
        )}
        {!user && (
          <>
            <Link to="/login" className={styles.mobileLink} onClick={() => setMenuOpen(false)}><LogIn size={18} /> Login</Link>
            <Link to="/signup" className={`${styles.mobileLink} ${styles.mobileSignUp}`} onClick={() => setMenuOpen(false)}><UserPlus size={18} /> Sign Up Free</Link>
          </>
        )}

        {/* Mobile Language Selector */}
        <div className={styles.mobileLangSection}>
          <p className={styles.mobileLangTitle}><Globe size={18} /> Select Language</p>
          <div className={styles.mobileLangGrid}>
            {LANGUAGES.map(lang => (
              <button 
                key={lang.code} 
                className={`${styles.mobileLangBtn} ${currentLang.code === lang.code ? styles.mobileLangActive : ''}`} 
                onClick={() => handleLangChange(lang)}
              >
                {lang.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overlay */}
      {(menuOpen || profileOpen || langOpen) && (
        <div className={styles.overlay} onClick={() => { setMenuOpen(false); setProfileOpen(false); setLangOpen(false); }} />
      )}
    </nav>
  );
}
