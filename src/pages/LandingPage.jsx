import { Link } from 'react-router-dom';
import { useLayoutEffect, useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Search, Shield, MapPin, Zap } from 'lucide-react';
import HostelCard from '../components/HostelCard';
import styles from './LandingPage.module.css';
import { hostelsApi } from '../lib/api';

gsap.registerPlugin(ScrollTrigger);

// --- Fallback Dummy Data ---
const DUMMY_FEATURED = [
  { id: '1', name: 'Sunrise Premium Boys Hostel', address: 'Near JNTUH, Kukatpally', price: 8500, category: 'boys', type: 'hostel', rating: 4.8, reviews: 124, isPremium: true, distance: 0.5, facilities: ['ac', 'wifi', 'food'], image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=800' },
  { id: '5', name: 'Royal Heritage Girls Hostel', address: 'Kompally, Near CMRIT', price: 15000, category: 'girls', type: 'hostel', rating: 4.7, reviews: 320, isPremium: true, distance: 0.2, facilities: ['ac', 'wifi', 'security'], image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=800' },
  { id: '3', name: 'Elite Unisex Co-living', address: 'Gachibowli, Near CBIT', price: 12000, category: 'both', type: 'hostel', rating: 4.9, reviews: 210, isPremium: true, distance: 2.0, facilities: ['ac', 'wifi', 'pool'], image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800' },
];

export default function LandingPage() {
  const containerRef = useRef(null);
  const [featuredHostels, setFeaturedHostels] = useState([]);

  useEffect(() => {
    async function loadFeatured() {
      try {
        const data = await hostelsApi.getFeatured(3);
        setFeaturedHostels(data.length > 0 ? data : DUMMY_FEATURED);
      } catch (err) {
        setFeaturedHostels(DUMMY_FEATURED);
      }
    }
    loadFeatured();
  }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      
      // --- HERO TIMELINE ---
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
      
      // Initial states
      gsap.set(".hero-badge", { opacity: 0, y: 20 });
      gsap.set(".hero-title-line", { y: 100, opacity: 0 });
      gsap.set(".hero-sub", { opacity: 0, y: 20 });
      gsap.set(".hero-cta", { opacity: 0, scale: 0.9 });

      // Animate Hero
      tl.to(".hero-badge", { opacity: 1, y: 0, duration: 0.8, delay: 0.2 })
        .to(".hero-title-line", { y: 0, opacity: 1, duration: 1, stagger: 0.15 }, "-=0.6")
        .to(".hero-sub", { opacity: 1, y: 0, duration: 1 }, "-=0.7")
        .to(".hero-cta", { opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.5)" }, "-=0.8");


      // --- SCROLL REVEALS ---
      // Features header
      gsap.fromTo(".feat-header", 
        { opacity: 0, y: 40 },
        { 
          opacity: 1, y: 0, duration: 1, 
          scrollTrigger: { trigger: ".features-trigger", start: "top 80%" }
        }
      );

      // Feature cards stagger
      gsap.fromTo(".feat-card", 
        { opacity: 0, y: 60, scale: 0.98 },
        { 
          opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.1, ease: "power3.out",
          scrollTrigger: { trigger: ".features-trigger", start: "top 70%" }
        }
      );

      // Hostels stagger
      gsap.fromTo(".hostel-card", 
        { opacity: 0, y: 50 },
        { 
          opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: "power2.out",
          scrollTrigger: { trigger: ".hostels-trigger", start: "top 75%" }
        }
      );

      // Bottom CTA scale and glow
      gsap.fromTo(".cta-box", 
        { opacity: 0, scale: 0.9, y: 50 },
        { 
          opacity: 1, scale: 1, y: 0, duration: 1, ease: "expo.out",
          scrollTrigger: { trigger: ".cta-trigger", start: "top 85%" }
        }
      );

    }, containerRef);
    
    return () => ctx.revert(); // Cleanup on unmount
  }, []);

  return (
    <div className={styles.landing} ref={containerRef}>
      {/* ============ HERO SECTION ============ */}
      <section className={styles.heroSection}>
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className={styles.heroVideo}
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
        <div className={styles.noiseOverlay} />

        <div className={styles.heroContent}>
          <div className={`${styles.heroBadge} hero-badge`}>
            <div className={styles.heroBadgeCircle} />
            The New Standard in Student Housing
          </div>

          <h1 className={styles.heroTitle}>
            <div style={{ overflow: "hidden", display: "inline-block" }}>
              <span className="hero-title-line" style={{ display: "inline-block" }}>Find the perfect place</span>
            </div><br />
            <div style={{ overflow: "hidden", display: "inline-block" }}>
              <span className="hero-title-line" style={{ display: "inline-block" }}>to call home.</span>
            </div>
          </h1>

          <p className={`${styles.heroSubtitle} hero-sub`}>
            Discover verified hostels and PGs near your campus. Browse premium listings, compare prices, and navigate with ease.
          </p>

          <div className={`${styles.heroCtas} hero-cta`}>
            <Link to="/search" className={styles.primaryBtn}>
              Explore Hostels <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* ============ FEATURES SECTION ============ */}
      <section className={`${styles.featuresSection} features-trigger`}>
        <div className={styles.sectionContainer}>
          <div className="feat-header">
            <div className={styles.sectionBadge}>Why StuNest</div>
            <h2 className={styles.sectionTitle}>Everything you need to secure your stay, without the hassle.</h2>
          </div>

          <div className={styles.featuresGrid}>
            <div className={`${styles.featureCard} feat-card`}>
              <div className={styles.featureContent}>
                <div className={styles.featureIcon}><MapPin size={28} /></div>
                <h3>Campus Proximity</h3>
                <p>We map exactly how far every property is from your college gates, complete with walking distance estimates and safe routes.</p>
              </div>
            </div>

            <div className={`${styles.featureCard} feat-card`}>
              <div className={styles.featureContent}>
                <div className={styles.featureIcon}><Shield size={28} /></div>
                <h3>Verified Security</h3>
                <p>Every listing undergoes rigorous physical verification. We check CCTV coverage, warden availability, and biometric access.</p>
              </div>
            </div>

            <div className={`${styles.featureCard} feat-card`}>
              <div className={styles.featureContent}>
                <div className={styles.featureIcon}><Search size={28} /></div>
                <h3>Smart Filtering</h3>
                <p>Looking for a single room with AC and vegetarian food? Our deep filters help you find exactly what you want instantly.</p>
              </div>
            </div>

            <div className={`${styles.featureCard} feat-card`}>
              <div className={styles.featureContent}>
                <div className={styles.featureIcon}><Zap size={28} /></div>
                <h3>Zero Brokerage</h3>
                <p>Connect directly with property owners. No middlemen, no hidden fees, just transparent pricing for your entire stay.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOSTEL PREVIEW SECTION ============ */}
      <section className={`${styles.hostelsSection} hostels-trigger`}>
        <div className={styles.sectionContainer}>
          <div className="feat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
            <div>
              <div className={styles.sectionBadge}>Premium Stays</div>
              <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 700, letterSpacing: '-0.02em', marginTop: '0.75rem', color: '#111' }}>Featured Hostels</h2>
            </div>
            <Link to="/search" style={{ color: '#111', fontWeight: 600, textDecoration: 'none', borderBottom: '2px solid var(--color-primary)', paddingBottom: '4px', whiteSpace: 'nowrap' }}>
              View All
            </Link>
          </div>

          <div className={styles.hostelsGrid}>
            {featuredHostels.map((hostel) => (
              <div key={hostel.id} className="hostel-card">
                <HostelCard hostel={hostel} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA SECTION ============ */}
      <section className={`${styles.ctaSection} cta-trigger`}>
        <div className={styles.heroGlow} style={{ top: '0', background: 'radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, transparent 60%)' }} />
        <div className={`${styles.ctaBox} cta-box`}>
          <h2>Ready to list your property?</h2>
          <p>
            Join hundreds of owners who trust StuNest to fill their vacancies with verified students.
          </p>
          <div>
            <Link to="/owner" className={styles.primaryBtn}>
              Get Started as Owner <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
