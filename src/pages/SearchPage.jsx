import { useState, useMemo, useEffect } from 'react';
import { Filter, Map as MapIcon, List as ListIcon, Search, RotateCcw, MapPin, GraduationCap, CheckCircle, Navigation } from 'lucide-react';
import HostelCard from '../components/HostelCard';
import styles from './SearchPage.module.css';
import { hostelsApi, collegesApi } from '../lib/api';
import { generatedColleges, generatedHostels } from '../lib/seedGenerator';

// --- Fallback Dummy Data ---
// Kept for demonstration if database is empty
const DUMMY_HOSTELS = [
  { id: '1', name: 'Sunrise Premium Boys Hostel', address: 'Near JNTUH, Kukatpally', price: 8500, category: 'boys', type: 'hostel', rating: 4.8, reviews: 124, isPremium: true, facilities: ['ac', 'wifi', 'food', 'laundry', 'security', 'gym'], image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=1000', lat: 17.4910, lng: 78.3930 },
  { id: '2', name: 'Cozy Living PG for Girls', address: 'KPHB Colony, Near JNTUH', price: 6000, category: 'girls', type: 'pg', rating: 4.2, reviews: 89, isPremium: false, facilities: ['wifi', 'food', 'security', 'study table'], image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1000', lat: 17.4850, lng: 78.3900 },
  { id: '3', name: 'Elite Unisex Co-living', address: 'Gachibowli (Near CBIT)', price: 12000, category: 'both', type: 'hostel', rating: 4.9, reviews: 210, isPremium: true, facilities: ['ac', 'wifi', 'food', 'laundry', 'security', 'parking', 'pool'], image: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=1000', lat: 17.4200, lng: 78.3400 },
];

const INITIAL_FILTERS = {
  categories: [], types: [], budget: [], maxDistance: null, facilities: [], rating: null, maxPrice: 20000
};

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))); 
}

function SearchPage() {
  const [viewMode, setViewMode] = useState('list');
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [sortBy, setSortBy] = useState('nearest');
  
  const [colleges, setColleges] = useState([]);
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [collegeSearchTerm, setCollegeSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [dbHostels, setDbHostels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [draftFilters, setDraftFilters] = useState(INITIAL_FILTERS);
  const [activeFilters, setActiveFilters] = useState(INITIAL_FILTERS);

  // Fetch real colleges and hostels from Supabase on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const fetchedColleges = await collegesApi.getAll();
        setColleges(fetchedColleges.length > 0 ? fetchedColleges : generatedColleges);
        
        const fetchedHostels = await hostelsApi.getAll();
        setDbHostels(fetchedHostels.length > 0 ? fetchedHostels : generatedHostels);
      } catch (error) {
        console.error("Error fetching data from Supabase:", error);
        setColleges(generatedColleges);
        setDbHostels(generatedHostels);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    document.body.style.overflow = showFiltersMobile ? 'hidden' : 'unset';
  }, [showFiltersMobile]);

  const handleCheckboxChange = (group, value) => {
    setDraftFilters(prev => ({
      ...prev,
      [group]: prev[group].includes(value) ? prev[group].filter(item => item !== value) : [...prev[group], value]
    }));
  };

  const applyFilters = () => { setActiveFilters(draftFilters); setShowFiltersMobile(false); window.scrollTo({ top: 400, behavior: 'smooth' }); };
  const resetFilters = () => { setDraftFilters(INITIAL_FILTERS); setActiveFilters(INITIAL_FILTERS); };

  const selectCollege = (college) => {
    setSelectedCollege(college);
    setCollegeSearchTerm(college.name);
    setShowSuggestions(false);
  };

  const processedHostels = useMemo(() => {
    if (!selectedCollege || !dbHostels) return [];

    let result = dbHostels.map(h => ({
      ...h,
      distance: Number(calculateDistance(selectedCollege.lat, selectedCollege.lng, h.lat, h.lng).toFixed(1)),
      collegeParams: `origin=${selectedCollege.lat},${selectedCollege.lng}&destination=${h.lat},${h.lng}`,
      // Normalize DB fields to match frontend expectation for UI rendering
      image: h.images?.[0] || h.image,
    }));

    if (activeFilters.categories.length > 0) result = result.filter(h => activeFilters.categories.includes(h.category));
    if (activeFilters.types.length > 0) result = result.filter(h => activeFilters.types.includes(h.type));
    if (activeFilters.maxDistance) result = result.filter(h => h.distance <= activeFilters.maxDistance);
    if (activeFilters.rating) result = result.filter(h => h.rating >= activeFilters.rating);
    if (activeFilters.facilities.length > 0) result = result.filter(h => activeFilters.facilities.every(f => h.facilities?.includes(f)));
    if (activeFilters.budget.length > 0) {
      result = result.filter(h => {
        if (activeFilters.budget.includes('premium') && h.price >= 10000) return true;
        if (activeFilters.budget.includes('mid') && h.price >= 6000 && h.price < 10000) return true;
        if (activeFilters.budget.includes('budget') && h.price < 6000) return true;
        return false;
      });
    }
    result = result.filter(h => h.price <= activeFilters.maxPrice);

    switch (sortBy) {
      case 'lowToHigh': return result.sort((a, b) => a.price - b.price);
      case 'highestRated': return result.sort((a, b) => b.rating - a.rating);
      case 'premiumFirst': return result.sort((a, b) => ((b.is_premium || b.isPremium) === (a.is_premium || a.isPremium) ? 0 : (b.is_premium || b.isPremium) ? -1 : 1));
      case 'nearest': default: return result.sort((a, b) => a.distance - b.distance);
    }
  }, [selectedCollege, activeFilters, sortBy, dbHostels]);

  const suggestedColleges = colleges.filter(c => c.name.toLowerCase().includes(collegeSearchTerm.toLowerCase()));

  return (
    <div className={styles.pageContainer} style={{ paddingTop: '5rem' }}>
      
      {/* --- HERO SECTION --- */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Find the best hostels near your college</h1>
          <p className={styles.heroSubtitle}>Compare distance, rent, facilities, safety, and reviews in one place.</p>
          
          <div className={styles.heroSearchWrapper}>
            <div className={styles.heroSearchBar}>
              <GraduationCap className={styles.heroSearchIcon} size={24} />
              <input 
                type="text" 
                className={styles.heroSearchInput}
                placeholder="Search your college or campus..." 
                value={collegeSearchTerm}
                onChange={(e) => {
                  setCollegeSearchTerm(e.target.value);
                  setShowSuggestions(true);
                  if (selectedCollege && e.target.value !== selectedCollege.name) setSelectedCollege(null);
                }}
                onFocus={() => setShowSuggestions(true)}
              />
              <button className={styles.heroSearchBtn}>Find Hostels</button>
            </div>
            
            {showSuggestions && collegeSearchTerm && !selectedCollege && (
              <div className={styles.suggestionsDropdown}>
                {suggestedColleges.length > 0 ? (
                  suggestedColleges.map(college => (
                    <div key={college.id} className={styles.suggestionItem} onClick={() => selectCollege(college)}>
                      <MapPin size={16} /> {college.name}
                    </div>
                  ))
                ) : (
                  <div className={styles.suggestionEmpty}>No colleges found</div>
                )}
              </div>
            )}
          </div>

          <div className={styles.popularChips}>
            <span className={styles.chipsLabel}>Browse by city:</span>
            {[
              { label: 'Hyderabad', city: 'Hyderabad' },
              { label: 'Bengaluru', city: 'Bengaluru' },
              { label: 'Mumbai',    city: 'Mumbai'    },
              { label: 'Delhi',     city: 'Delhi'     },
              { label: 'Pune',      city: 'Pune'      },
              { label: 'Chennai',   city: 'Chennai'   },
              { label: 'Kolkata',   city: 'Kolkata'   },
              { label: 'Ahmedabad', city: 'Ahmedabad' },
            ].map(({ label, city }) => (
              <button
                key={city}
                className={styles.chipBtn}
                onClick={() => {
                  setCollegeSearchTerm(city);
                  setShowSuggestions(true);
                  setSelectedCollege(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* --- MAIN LAYOUT --- */}
      <div className={`container ${styles.mainLayout}`}>
        
        {/* Left Sidebar Filters */}
        <aside className={`${styles.sidebar} ${showFiltersMobile ? styles.sidebarMobileOpen : ''}`}>
          <div className={styles.sidebarHeader}>
            <h2 className={styles.sidebarTitle}>Filters</h2>
            {showFiltersMobile && <button onClick={() => setShowFiltersMobile(false)} className={styles.closeBtn}>×</button>}
          </div>
          
          <div className={styles.sidebarContent}>
            
            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Gender Category</h3>
              <div className={styles.checkboxList}>
                <label className={styles.radioLabel}>
                  <input type="radio" name="gender" checked={draftFilters.categories.length === 0} onChange={() => setDraftFilters({...draftFilters, categories: []})} />
                  <span>Any Category</span>
                </label>
                {['boys', 'girls', 'both'].map(cat => (
                  <label key={cat} className={styles.radioLabel}>
                    <input type="radio" name="gender" checked={draftFilters.categories.includes(cat)} onChange={() => setDraftFilters({...draftFilters, categories: [cat]})} />
                    <span style={{textTransform: 'capitalize'}}>{cat === 'both' ? 'Co-living' : cat}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Property Type</h3>
              <div className={styles.checkboxList}>
                {['hostel', 'pg'].map(type => (
                  <label key={type} className={styles.checkboxLabel}>
                    <input type="checkbox" checked={draftFilters.types.includes(type)} onChange={() => handleCheckboxChange('types', type)} />
                    <span>{type.toUpperCase()}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Max Price (Monthly)</h3>
              <input type="range" min="3000" max="20000" step="500" value={draftFilters.maxPrice} onChange={(e) => setDraftFilters({...draftFilters, maxPrice: parseInt(e.target.value)})} className={styles.rangeSlider} />
              <div className={styles.rangeLabels}><span>₹3k</span><span className={styles.rangeValue}>Up to ₹{draftFilters.maxPrice}</span></div>
            </div>

            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Budget Category</h3>
              <div className={styles.checkboxList}>
                <label className={styles.checkboxLabel}><input type="checkbox" checked={draftFilters.budget.includes('premium')} onChange={() => handleCheckboxChange('budget', 'premium')} /><span>Premium (₹10k+)</span></label>
                <label className={styles.checkboxLabel}><input type="checkbox" checked={draftFilters.budget.includes('mid')} onChange={() => handleCheckboxChange('budget', 'mid')} /><span>Mid-Range (₹6k - ₹10k)</span></label>
                <label className={styles.checkboxLabel}><input type="checkbox" checked={draftFilters.budget.includes('budget')} onChange={() => handleCheckboxChange('budget', 'budget')} /><span>Budget (Below ₹6k)</span></label>
              </div>
            </div>

            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Distance from College</h3>
              <div className={styles.checkboxList}>
                <label className={styles.radioLabel}><input type="radio" name="distance" checked={draftFilters.maxDistance === 1} onChange={() => setDraftFilters({...draftFilters, maxDistance: 1})} /><span>Within 1 km</span></label>
                <label className={styles.radioLabel}><input type="radio" name="distance" checked={draftFilters.maxDistance === 2} onChange={() => setDraftFilters({...draftFilters, maxDistance: 2})} /><span>Within 2 km</span></label>
                <label className={styles.radioLabel}><input type="radio" name="distance" checked={draftFilters.maxDistance === 5} onChange={() => setDraftFilters({...draftFilters, maxDistance: 5})} /><span>Within 5 km</span></label>
                <label className={styles.radioLabel}><input type="radio" name="distance" checked={draftFilters.maxDistance === null} onChange={() => setDraftFilters({...draftFilters, maxDistance: null})} /><span>Any Distance</span></label>
              </div>
            </div>

            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Facilities</h3>
              <div className={styles.checkboxList}>
                {['ac', 'wifi', 'food', 'laundry', 'security'].map(fac => (
                  <label key={fac} className={styles.checkboxLabel}>
                    <input type="checkbox" checked={draftFilters.facilities.includes(fac)} onChange={() => handleCheckboxChange('facilities', fac)} />
                    <span>{fac === 'ac' ? 'AC' : fac === 'wifi' ? 'WiFi' : fac.charAt(0).toUpperCase() + fac.slice(1)}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Minimum Rating</h3>
              <div className={styles.checkboxList}>
                <label className={styles.radioLabel}><input type="radio" name="rating" checked={draftFilters.rating === 4.5} onChange={() => setDraftFilters({...draftFilters, rating: 4.5})} /><span>4.5 & Above</span></label>
                <label className={styles.radioLabel}><input type="radio" name="rating" checked={draftFilters.rating === 4.0} onChange={() => setDraftFilters({...draftFilters, rating: 4.0})} /><span>4.0 & Above</span></label>
                <label className={styles.radioLabel}><input type="radio" name="rating" checked={draftFilters.rating === 3.0} onChange={() => setDraftFilters({...draftFilters, rating: 3.0})} /><span>3.0 & Above</span></label>
                <label className={styles.radioLabel}><input type="radio" name="rating" checked={draftFilters.rating === null} onChange={() => setDraftFilters({...draftFilters, rating: null})} /><span>Any Rating</span></label>
              </div>
            </div>

          </div>

          <div className={styles.sidebarFooter}>
            <button className={styles.resetBtn} onClick={resetFilters}>Reset</button>
            <button className={styles.applyBtn} onClick={applyFilters}>Apply Filters</button>
          </div>
        </aside>

        {showFiltersMobile && <div className={styles.sidebarOverlay} onClick={() => setShowFiltersMobile(false)}></div>}

        {/* Right Content Area */}
        <main className={styles.contentArea}>
          {!selectedCollege ? (
             <div className={styles.onboardingState}>
               <div className={styles.onboardingHeader}>
                 <div className={styles.onboardingIconBg}><MapIcon size={48} className={styles.onboardingIcon} /></div>
                 <h2 className={styles.onboardingTitle}>Search your college to discover nearby hostels</h2>
                 <p className={styles.onboardingDesc}>We’ll calculate distance from your campus and show the nearest premium accommodations first.</p>
               </div>
               
               <div className={styles.featureCards}>
                 <div className={styles.featureCard}>
                   <CheckCircle className={styles.featureIcon} />
                   <h4>Verified Hostels</h4>
                   <p>Every property is personally checked by our team for safety and quality.</p>
                 </div>
                 <div className={styles.featureCard}>
                   <MapPin className={styles.featureIcon} />
                   <h4>Distance Based Results</h4>
                   <p>See exactly how far you'll need to travel to reach your classes.</p>
                 </div>
                 <div className={styles.featureCard}>
                   <Navigation className={styles.featureIcon} />
                   <h4>Map Directions</h4>
                   <p>Get instant Google Maps directions from your campus to the hostel.</p>
                 </div>
               </div>
             </div>
          ) : (
            <>
              <div className={styles.resultsHeaderRow}>
                <div className={styles.resultsTitleArea}>
                  <h1 className={styles.pageTitle}>Hostels near {selectedCollege.name}</h1>
                  <span className={styles.resultsCountBadge}>{processedHostels.length} properties found</span>
                </div>

                <div className={styles.controlsRow}>
                  <button className={styles.mobileFilterBtn} onClick={() => setShowFiltersMobile(true)}>
                    <Filter size={18} /><span>Filters</span>
                  </button>

                  <div className={styles.sortWrapper}>
                    <span className={styles.sortLabel}>Sort by:</span>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={styles.sortDropdown}>
                      <option value="nearest">Nearest First</option>
                      <option value="lowToHigh">Lowest Price</option>
                      <option value="highestRated">Highest Rating</option>
                      <option value="premiumFirst">Premium First</option>
                    </select>
                  </div>

                  <div className={styles.viewToggle}>
                    <button className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.toggleActive : ''}`} onClick={() => setViewMode('list')}>
                      <ListIcon size={18} /><span>List</span>
                    </button>
                    <button className={`${styles.toggleBtn} ${viewMode === 'map' ? styles.toggleActive : ''}`} onClick={() => setViewMode('map')}>
                      <MapIcon size={18} /><span>Map</span>
                    </button>
                  </div>
                </div>
              </div>

              {processedHostels.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}><Search size={48} /></div>
                  <h2 className={styles.emptyStateTitle}>No hostels found</h2>
                  <p className={styles.emptyStateDesc}>Try adjusting your filters to find more properties near {selectedCollege.name}.</p>
                  <button className={styles.applyBtn} onClick={resetFilters} style={{width: 'auto', padding: '0.75rem 2rem'}}>Clear All Filters</button>
                </div>
              ) : viewMode === 'list' ? (
                <div className={styles.hostelGrid}>
                  {processedHostels.map(hostel => (
                    <HostelCard key={hostel.id} hostel={hostel} />
                  ))}
                </div>
              ) : (
                <div className={styles.mapPlaceholder}>
                  <MapIcon size={48} className={styles.mapIconBig} />
                  <h3>Interactive Map View</h3>
                  <p>Map showing {selectedCollege.name} and {processedHostels.length} nearby hostels.</p>
                  <button className={styles.applyBtn} onClick={() => setViewMode('list')} style={{marginTop: '1.5rem', width: 'auto', padding: '0.75rem 2rem'}}>Return to List View</button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default SearchPage;
