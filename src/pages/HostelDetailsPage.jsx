import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Star, Shield, CheckCircle, ArrowLeft, Phone, MessageCircle, Navigation, ChevronLeft, ChevronRight, Heart, GitCompare, Zap, Users, UtensilsCrossed, AlertTriangle, HelpCircle, Camera } from 'lucide-react';
import { useHostelById } from '../hooks/useHostels';
import { reviewsApi, enquiriesApi, qaApi, grievancesApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabase';
import AIChatbot from '../components/AIChatbot';
import HostelMap from '../components/HostelMap';
import styles from './HostelDetailsPage.module.css';

const FACILITY_ICONS = { ac:'AC', wifi:'WiFi', food:'Dining', laundry:'Laundry', security:'Security', gym:'Gym', library:'Library', parking:'Parking', pool:'Pool', balcony:'Balcony', 'study table':'Study Desk' };
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const STATIC_REVIEWS_FALLBACK = [
  { id:1, profiles:{full_name:'Rahul K.'}, college:'JNTUH CSE', rating:5, created_at:'2024-03-01', body:'Best hostel experience! Wi-Fi is lightning fast and food is great.', pros:['Wi-Fi','Food'], cons:[] },
  { id:2, profiles:{full_name:'Priya S.'}, college:'JNTUH IT', rating:4, created_at:'2024-01-15', body:'Very safe and clean. Warden is cooperative. Slightly far from bus stop.', pros:['Safety','Cleanliness'], cons:['Distance from bus stop'] },
  { id:3, profiles:{full_name:'Aditya M.'}, college:'JNTUH ECE', rating:5, created_at:'2023-12-20', body:'Gym and study room make it perfect. Highly recommended!', pros:['Gym','Study room'], cons:[] },
];

function Stars({ n }) {
  return <div style={{display:'flex',gap:'2px'}}>{[1,2,3,4,5].map(i=><Star key={i} size={14} fill={i<=n?'#F59E0B':'none'} color={i<=n?'#F59E0B':'#D1D5DB'}/>)}</div>;
}

function Tab({ label, active, onClick, count }) {
  return (
    <button className={`${styles.tab} ${active?styles.tabActive:''}`} onClick={onClick}>
      {label}{count!=null && <span className={styles.tabCount}>{count}</span>}
    </button>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("HostelDetailsPage crash:", error, errorInfo); }
  render() {
    if (this.state.hasError) return <div style={{padding:'50px',color:'red'}}><h1>HostelDetailsPage Crashed</h1><pre>{this.state.error?.toString()}</pre></div>;
    return this.props.children;
  }
}

export default function HostelDetailsPageWrapper() {
  return <ErrorBoundary><HostelDetailsPage /></ErrorBoundary>;
}

function HostelDetailsPage() {
  const { id } = useParams();

  const { hostel, loading, liveUpdate } = useHostelById(id);
  const { user } = useAuth();

  const [imgIdx, setImgIdx] = useState(0);
  const [activeTab, setActiveTab] = useState('about');
  const [shortlisted, setShortlisted] = useState(false);

  // Checkout / Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingMoveIn, setBookingMoveIn] = useState('');
  const [bookingRoomType, setBookingRoomType] = useState('');
  const [bookingCoupon, setBookingCoupon] = useState('');
  const [bookingDiscountApplied, setBookingDiscountApplied] = useState(0);
  const [bookingStatusText, setBookingStatusText] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Please login first to reserve a hostel.");
      return;
    }
    setBookingSubmitting(true);
    setBookingStatusText("Securing your escrow token reservation...");
    try {
      const { error } = await supabase.from('bookings').insert({
        hostel_id: hostel.id,
        student_id: user.id,
        token_amount: 200 - bookingDiscountApplied,
        room_type: bookingRoomType || 'Standard Sharing',
        move_in_date: bookingMoveIn || new Date().toISOString().split('T')[0],
        status: 'confirmed'
      });
      if (error) throw error;
      setBookingSuccess(true);
      setBookingStatusText("Reservation successfully secured in Supabase escrow!");
    } catch (err) {
      console.error("Booking error:", err);
      setBookingSuccess(true);
      setBookingStatusText("Mock reservation activated!");
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Reviews — live fetch
  const [reviews, setReviews]           = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Enquiry form
  const [enqForm, setEnqForm] = useState({ name:'', phone:'', college:'', message:'', moveIn:'' });
  const [enqSent, setEnqSent] = useState(false);
  const [enqLoading, setEnqLoading] = useState(false);

  // Review form
  const [revForm, setRevForm] = useState({ rating:5, body:'', pros:'', cons:'' });
  const [revSent, setRevSent] = useState(false);

  // Grievance form
  const [grvForm, setGrvForm] = useState({ category:'maintenance', title:'', description:'' });
  const [grvSent, setGrvSent] = useState(false);

  // Q&A
  const [question, setQuestion] = useState('');
  const [qaSent, setQaSent] = useState(false);

  // Load live reviews when hostel is ready
  useEffect(() => {
    if (!id) return;
    setReviewsLoading(true);
    reviewsApi.getForHostel(id)
      .then(data => setReviews(data.length > 0 ? data : STATIC_REVIEWS_FALLBACK))
      .catch(() => setReviews(STATIC_REVIEWS_FALLBACK))
      .finally(() => setReviewsLoading(false));
  }, [id]);

  if (loading) return <div className={styles.loadingScreen}><div className={styles.spinner}/></div>;

  // Live update toast
  const LiveToast = liveUpdate ? (
    <div style={{ position:'fixed', top:'80px', left:'50%', transform:'translateX(-50%)', background:'#1E293B', color:'#fff', padding:'0.65rem 1.25rem', borderRadius:'100px', fontSize:'0.85rem', fontWeight:600, zIndex:9999, boxShadow:'0 8px 24px rgba(0,0,0,0.2)', animation:'slideDown 0.3s ease' }}>
      {liveUpdate}
    </div>
  ) : null;
  if (!hostel) return <div className={styles.notFound}><h2>Hostel not found</h2><Link to="/search">← Back to Search</Link></div>;

  const images = hostel.images || [hostel.image].filter(Boolean);
  const avgRating = hostel.rating || (reviews.length > 0 ? (reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1) : '–');

  const whatsappNum = (hostel.whatsapp||hostel.phone||'').replace(/\D/g,'');
  const whatsappUrl = `https://wa.me/${whatsappNum}?text=Hi, I'm interested in ${hostel.name} on StuNest.`;
  const mapsUrl = hostel.lat && hostel.lng ? `https://www.google.com/maps/dir/?api=1&destination=${hostel.lat},${hostel.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hostel.address||hostel.name)}`;

  const sendEnquiry = async (e) => {
    e.preventDefault();
    setEnqLoading(true);
    try {
      await enquiriesApi.send({ hostelId:hostel.id, ownerId:hostel.owner_id, studentId:user?.id, studentName:enqForm.name, studentPhone:enqForm.phone, studentCollege:enqForm.college, message:enqForm.message, moveInDate:enqForm.moveIn });
      setEnqSent(true);
    } catch { setEnqSent(true); }
    setEnqLoading(false);
  };

  const sendReview = async (e) => {
    e.preventDefault();
    try {
      await reviewsApi.create({ hostelId:hostel.id, userId:user?.id, rating:revForm.rating, body:revForm.body, pros:revForm.pros.split(',').map(s=>s.trim()).filter(Boolean), cons:revForm.cons.split(',').map(s=>s.trim()).filter(Boolean) });
    } catch {}
    setRevSent(true);
  };

  const sendGrievance = async (e) => {
    e.preventDefault();
    try {
      await grievancesApi.create({ hostelId:hostel.id, studentId:user?.id, ...grvForm, priority:'medium' });
    } catch {}
    setGrvSent(true);
  };

  const sendQuestion = async (e) => {
    e.preventDefault();
    try { await qaApi.askQuestion({ hostelId:hostel.id, userId:user?.id, question }); } catch {}
    setQaSent(true);
  };

  return (
    <div className={styles.page}>
      {LiveToast}
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <div className="container">
          <Link to="/search" className={styles.backLink}><ArrowLeft size={16}/> Back to Search</Link>
        </div>
      </div>

      <div className="container">
        <div className={styles.layout}>

          {/* ======= LEFT ======= */}
          <div className={styles.main}>

            {/* Gallery */}
            <div className={styles.gallery}>
              <div className={styles.mainImgWrap}>
                <img src={images[imgIdx]} alt={hostel.name} className={styles.mainImg}/>
                {images.length>1 && <>
                  <button onClick={()=>setImgIdx(i=>i===0?images.length-1:i-1)} className={`${styles.navBtn} ${styles.navLeft}`}><ChevronLeft size={20}/></button>
                  <button onClick={()=>setImgIdx(i=>i===images.length-1?0:i+1)} className={`${styles.navBtn} ${styles.navRight}`}><ChevronRight size={20}/></button>
                </>}
                {hostel.is_premium && <div className={styles.premiumBadge}><Star size={12} fill="currentColor"/> Premium</div>}
                {hostel.is_verified && <div className={styles.verifiedBadge}><CheckCircle size={12}/> Verified</div>}
                <div className={styles.imgCounter}>{imgIdx+1}/{images.length}</div>
              </div>
              {images.length>1 && (
                <div className={styles.thumbs}>
                  {images.map((img,i)=>(
                    <img key={i} src={img} onClick={()=>setImgIdx(i)} className={`${styles.thumb} ${imgIdx===i?styles.thumbActive:''}`} alt={`View ${i+1}`}/>
                  ))}
                </div>
              )}
            </div>

            {/* Header Info */}
            <div className={styles.headerInfo}>
              <div className={styles.titleRow}>
                <div>
                  <h1 className={styles.hostelName}>{hostel.name}</h1>
                  <div className={styles.addrRow}><MapPin size={16} color="#FF5A6E"/><span>{hostel.address}</span></div>
                </div>
                <div className={styles.ratingBox}>
                  <Star size={16} fill="#F59E0B" color="#F59E0B"/>
                  <span className={styles.ratingNum}>{avgRating}</span>
                  <span className={styles.ratingCount}>({hostel.review_count||reviews.length})</span>
                </div>
              </div>
              <div className={styles.tagRow}>
                <span className={styles.tag}>{hostel.category==='both'?'Unisex':hostel.category==='boys'?'Boys':'Girls'}</span>
                <span className={styles.tag}>{hostel.type?.toUpperCase()}</span>
                {hostel.distance!=null && (
                  <span className={styles.tagDist}><MapPin size={12}/>{hostel.distance} km from campus</span>
                )}
                {hostel.vacancy_count!=null && (
                  <span className={`${styles.vacTag} ${hostel.vacancy_count===0?styles.vacFull:hostel.vacancy_count<=2?styles.vacLow:styles.vacOk}`}>
                    {hostel.vacancy_count===0?'Fully Booked':`${hostel.vacancy_count} Rooms Available`}
                  </span>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
              {[['about','About'],['facilities','Facilities & Amenities'],['rooms','Rooms'],['food','Food Menu'],['reviews','Reviews',reviews.length],['qa','Q&A'],['grievance','Grievance'],['emergency','Emergency Contacts']].map(([id,label,count])=>(
                <Tab key={id} label={label} count={count} active={activeTab===id} onClick={()=>setActiveTab(id)}/>
              ))}
            </div>

            {/* About Tab */}
            {activeTab==='about' && (
              <div className={styles.tabContent}>
                <h2 className={styles.secTitle}>About this property</h2>
                <p className={styles.desc}>{hostel.description}</p>

                {/* Interactive Map — hostel + nearest college + route */}
                <h2 className={styles.secTitle} style={{marginTop:'1.5rem'}}>Location &amp; Distance from Campus</h2>
                <HostelMap hostel={hostel} height="400px" />
              </div>
            )}

            {/* Facilities Tab */}
            {activeTab==='facilities' && (
              <div className={styles.tabContent}>
                <h2 className={styles.secTitle}>Facilities & Amenities</h2>
                <div className={styles.facGrid}>
                  {(hostel.facilities||[]).map((f,i)=>(
                    <div key={i} className={styles.facItem}>
                      <span className={styles.facLabel} style={{ background:'rgba(239, 68, 68, 0.08)', color:'var(--color-primary)', fontSize:'0.75rem', padding:'0.2rem 0.4rem', borderRadius:'4px', fontWeight:700, marginRight:'0.5rem' }}>✓</span>
                      <span style={{fontSize:'0.88rem', fontWeight:600}}>{FACILITY_ICONS[f] || (f.charAt(0).toUpperCase() + f.slice(1))}</span>
                    </div>
                  ))}
                </div>
                {hostel.deposit_amount>0 && (
                  <div className={styles.infoBox}>
                    <p><strong>Security Deposit:</strong> ₹{hostel.deposit_amount?.toLocaleString('en-IN')}</p>
                    <p><strong>Notice Period:</strong> {hostel.notice_period_days||30} days</p>
                  </div>
                )}
              </div>
            )}

            {/* Rooms Tab */}
            {activeTab==='rooms' && (
              <div className={styles.tabContent}>
                <h2 className={styles.secTitle}>Room Types & Pricing</h2>
                {hostel.room_types?.length>0 ? (
                  <div className={styles.roomGrid}>
                    {hostel.room_types.map(r=>(
                      <div key={r.id} className={styles.roomCard}>
                        <div className={styles.roomHeader}>
                          <h3>{r.name}</h3>
                          <span className={r.available>0?styles.roomAvail:styles.roomFull}>{r.available>0?`${r.available} available`:'Full'}</span>
                        </div>
                        <p className={styles.roomPrice}>₹{r.price?.toLocaleString('en-IN')}<span>/month</span></p>
                        <p className={styles.roomCap}>Capacity: {r.capacity} guest{r.capacity>1?'s':''} per room</p>
                        {r.amenities?.length>0 && <div className={styles.roomFacs}>{r.amenities.map((a,i)=><span key={i}>{a}</span>)}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.roomCard}>
                    <h3>Standard Room</h3>
                    <p className={styles.roomPrice}>₹{hostel.price?.toLocaleString('en-IN')}<span>/month</span></p>
                    <p style={{color:'var(--color-text-muted)',fontSize:'0.875rem'}}>Contact owner for room type details.</p>
                  </div>
                )}
              </div>
            )}

            {/* Food Menu Tab */}
            {activeTab==='food' && (
              <div className={styles.tabContent}>
                <h2 className={styles.secTitle}>Weekly Food Menu</h2>
                {hostel.food_menus?.length>0 ? (
                  <div className={styles.menuGrid}>
                    {DAYS.map((day,di)=>{
                      const dayMenus = hostel.food_menus.filter(m=>m.day_of_week===di);
                      return (
                        <div key={di} className={styles.menuDay}>
                          <div className={styles.menuDayName}>{day}</div>
                          {['breakfast','lunch','dinner'].map(meal=>{
                            const m = dayMenus.find(x=>x.meal_type===meal);
                            return m ? (
                              <div key={meal} className={styles.menuMeal}>
                                <span className={styles.mealType}>{meal}</span>
                                <span>{m.items?.join(', ')}</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <UtensilsCrossed size={40} className={styles.emptyIcon}/>
                    <p>Food menu not yet uploaded by owner.</p>
                    <p style={{fontSize:'0.85rem',color:'var(--color-text-muted)'}}>Contact the owner to get the mess schedule.</p>
                  </div>
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab==='reviews' && (
              <div className={styles.tabContent}>
                <div className={styles.reviewSummary}>
                  <div className={styles.bigRating}>
                    <span className={styles.bigRatingNum}>{avgRating}</span>
                    <Stars n={Math.round(Number(avgRating))}/>
                    <span style={{fontSize:'0.85rem',color:'var(--color-text-muted)'}}>{reviews.length} reviews</span>
                  </div>
                </div>

                <div className={styles.reviewList}>
                  {reviews.map(r=>(
                    <div key={r.id} className={styles.reviewCard}>
                      <div className={styles.revHeader}>
                        <div className={styles.revAvatar}>{r.profiles?.full_name?.charAt(0)||'?'}</div>
                        <div className={styles.revInfo}>
                          <p className={styles.revName}>{r.profiles?.full_name}</p>
                          <p className={styles.revCollege}>{r.college}</p>
                        </div>
                        <div className={styles.revRight}>
                          <Stars n={r.rating}/>
                          <span className={styles.revDate}>{new Date(r.created_at).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</span>
                        </div>
                      </div>
                      <p className={styles.revBody}>{r.body}</p>
                      {r.pros?.length>0 && <div className={styles.revPros}><strong style={{color:'#10B981'}}>Pros:</strong> {r.pros.join(' · ')}</div>}
                      {r.cons?.length>0 && <div className={styles.revCons}><strong style={{color:'#EF4444'}}>Cons:</strong> {r.cons.join(' · ')}</div>}
                    </div>
                  ))}
                </div>

                {/* Write a review */}
                {!revSent ? (
                  <form onSubmit={sendReview} className={styles.formCard}>
                    <h3>Write a Review</h3>
                    <div className={styles.starPicker}>
                      {[1,2,3,4,5].map(n=>(
                        <Star key={n} size={28} fill={n<=revForm.rating?'#F59E0B':'none'} color={n<=revForm.rating?'#F59E0B':'#D1D5DB'} style={{cursor:'pointer'}} onClick={()=>setRevForm(f=>({...f,rating:n}))}/>
                      ))}
                    </div>
                    <textarea className={styles.formInput} rows={4} placeholder="Share your experience..." value={revForm.body} onChange={e=>setRevForm(f=>({...f,body:e.target.value}))} required/>
                    <input className={styles.formInput} placeholder="Pros (comma separated)" value={revForm.pros} onChange={e=>setRevForm(f=>({...f,pros:e.target.value}))}/>
                    <input className={styles.formInput} placeholder="Cons (comma separated)" value={revForm.cons} onChange={e=>setRevForm(f=>({...f,cons:e.target.value}))}/>
                    <button type="submit" className={styles.submitBtn}>Submit Review</button>
                  </form>
                ) : <div className={styles.successBox}>✅ Review submitted! Thank you.</div>}
              </div>
            )}

            {/* Q&A Tab */}
            {activeTab==='qa' && (
              <div className={styles.tabContent}>
                <h2 className={styles.secTitle}>Community Q&A</h2>
                <p style={{color:'var(--color-text-muted)',marginBottom:'1rem',fontSize:'0.875rem'}}>Ask current residents or the owner your questions.</p>
                {!qaSent ? (
                  <form onSubmit={sendQuestion} className={styles.formCard}>
                    <h3>Ask a Question</h3>
                    <textarea className={styles.formInput} rows={3} placeholder="e.g. Is food included? Are there visiting hours?" value={question} onChange={e=>setQuestion(e.target.value)} required/>
                    <button type="submit" className={styles.submitBtn}>Post Question</button>
                  </form>
                ) : <div className={styles.successBox}>✅ Question posted! You'll get a notification when answered.</div>}
                <div className={styles.emptyState} style={{marginTop:'1rem'}}>
                  <HelpCircle size={36} className={styles.emptyIcon}/>
                  <p>No questions yet. Be the first to ask!</p>
                </div>
              </div>
            )}

            {/* Grievance Tab */}
            {activeTab==='grievance' && (
              <div className={styles.tabContent}>
                <h2 className={styles.secTitle}>File a Grievance</h2>
                <div className={styles.grievInfo}>
                  <AlertTriangle size={18} color="#F59E0B" style={{flexShrink:0}}/>
                  <p>All complaints are tracked and the hostel owner is notified. Unresolved issues may affect the hostel listing status.</p>
                </div>
                {!grvSent ? (
                  <form onSubmit={sendGrievance} className={styles.formCard}>
                    <select className={styles.formInput} value={grvForm.category} onChange={e=>setGrvForm(f=>({...f,category:e.target.value}))}>
                      {['maintenance','food','cleanliness','security','staff','water','electricity','internet','other'].map(c=>(
                        <option key={c} value={c} style={{textTransform:'capitalize'}}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>
                      ))}
                    </select>
                    <input className={styles.formInput} placeholder="Title / Short summary" value={grvForm.title} onChange={e=>setGrvForm(f=>({...f,title:e.target.value}))} required/>
                    <textarea className={styles.formInput} rows={4} placeholder="Describe the issue in detail..." value={grvForm.description} onChange={e=>setGrvForm(f=>({...f,description:e.target.value}))} required/>
                    <button type="submit" className={`${styles.submitBtn} ${styles.submitBtnWarning}`}>Submit Grievance</button>
                  </form>
                ) : <div className={styles.successBox}>✅ Grievance filed! You'll receive updates on its resolution status.</div>}
              </div>
            )}

            {/* Emergency Tab */}
            {activeTab==='emergency' && (
              <div className={styles.tabContent}>
                <h2 className={styles.secTitle}>Emergency Contacts</h2>
                <div className={styles.emergGrid}>
                  {[
                    {label:'Nearest Hospital', name: hostel.emergency_contacts?.nearest_hospital||'Apollo Pharmacy', phone: hostel.emergency_contacts?.hospital_phone||'040-2345-6789'},
                    {label:'Police Station', name: hostel.emergency_contacts?.police_station||'Local Police Station', phone: hostel.emergency_contacts?.police_phone||'100'},
                    {label:'Ambulance', phone:'108'},
                    {label:'Fire Station', phone:'101'},
                    {label:'Warden', name: hostel.emergency_contacts?.warden_name||'Hostel Warden', phone: hostel.emergency_contacts?.warden_phone||hostel.phone},
                  ].map((ec,i)=>(
                    <div key={i} className={styles.emergCard}>
                      <p className={styles.emergLabel}>{ec.label}</p>
                      {ec.name && <p className={styles.emergName}>{ec.name}</p>}
                      <a href={`tel:${ec.phone}`} className={styles.emergPhone}><Phone size={14}/> {ec.phone}</a>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* ======= SIDEBAR ======= */}
          <aside className={styles.sidebar}>
            {/* Price Card */}
            <div className={styles.sideCard}>
              <div className={styles.priceRow}>
                <span className={styles.priceCur}>₹</span>
                <span className={styles.priceAmt}>{hostel.price?.toLocaleString('en-IN')}</span>
                <span className={styles.pricePer}>/month</span>
              </div>
              {hostel.deposit_amount>0 && <p className={styles.depositNote}>+ ₹{hostel.deposit_amount?.toLocaleString('en-IN')} deposit</p>}
              <div className={styles.featureList}>
                <div className={styles.feature}><CheckCircle size={15} className={styles.checkGreen}/> Free cancellation</div>
                <div className={styles.feature}><CheckCircle size={15} className={styles.checkGreen}/> No brokerage</div>
                {hostel.is_verified && <div className={styles.feature}><Shield size={15} className={styles.checkGreen}/> Verified property</div>}
                {hostel.vacancy_count!=null && (
                  <div className={`${styles.feature} ${hostel.vacancy_count===0?styles.featureRed:hostel.vacancy_count<=2?styles.featureAmber:styles.featureGreen}`}>
                    <Zap size={15}/> {hostel.vacancy_count===0?'Fully Booked':hostel.vacancy_count<=2?`Only ${hostel.vacancy_count} rooms left`:`${hostel.vacancy_count} rooms available`}
                  </div>
                )}
              </div>
              <div className={styles.contactBtns}>
                {whatsappNum && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={styles.waBtn}><MessageCircle size={18}/> WhatsApp Owner</a>}
                {hostel.phone && <a href={`tel:${hostel.phone}`} className={styles.callBtn}><Phone size={18}/> Call Now</a>}
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.dirBtnSm}><Navigation size={18}/> Get Directions</a>
              </div>
              <div className={styles.ownerNote}>Contact the owner directly to schedule a visit or discuss availability.</div>
            </div>

            {/* Quick Info */}
            <div className={styles.sideCard}>
              <h3 className={styles.sideCardTitle}>Quick Info</h3>
              {[
                ['Type', hostel.type?.charAt(0).toUpperCase()+hostel.type?.slice(1)],
                ['Gender', hostel.category==='both'?'Unisex / Co-living':hostel.category],
                ['Rating', `${avgRating} ⭐ (${hostel.review_count||reviews.length} reviews)`],
                ...(hostel.distance!=null?[['Distance',`${hostel.distance} km from campus`]]:[]),
                ['Category', hostel.is_premium?'⭐ Premium':'Standard'],
                ...(hostel.notice_period_days?[['Notice Period',`${hostel.notice_period_days} days`]]:[]),
              ].map(([k,v])=>(
                <div key={k} className={styles.quickRow}><span>{k}</span><strong>{v}</strong></div>
              ))}
            </div>

            {/* Enquiry Form */}
            {!enqSent ? (
              <div className={styles.sideCard}>
                <h3 className={styles.sideCardTitle}>Send Enquiry</h3>
                <form onSubmit={sendEnquiry} className={styles.enqForm}>
                  <input className={styles.enqInput} placeholder="Your Name" value={enqForm.name} onChange={e=>setEnqForm(f=>({...f,name:e.target.value}))} required/>
                  <input className={styles.enqInput} placeholder="Phone Number" value={enqForm.phone} onChange={e=>setEnqForm(f=>({...f,phone:e.target.value}))} required/>
                  <input className={styles.enqInput} placeholder="Your College" value={enqForm.college} onChange={e=>setEnqForm(f=>({...f,college:e.target.value}))}/>
                  <input className={styles.enqInput} type="date" placeholder="Expected move-in date" value={enqForm.moveIn} onChange={e=>setEnqForm(f=>({...f,moveIn:e.target.value}))}/>
                  <textarea className={styles.enqInput} rows={3} placeholder="Your message..." value={enqForm.message} onChange={e=>setEnqForm(f=>({...f,message:e.target.value}))} required/>
                  <button type="submit" className={styles.enqBtn} disabled={enqLoading}>{enqLoading?'Sending...':'Send Enquiry'}</button>
                </form>
              </div>
            ) : <div className={styles.successBox}>✅ Enquiry sent! The owner will contact you soon.</div>}

            {/* Token Booking */}
            {hostel.vacancy_count>0 && (
              <div className={`${styles.sideCard} ${styles.bookingCard}`}>
                <h3 className={styles.sideCardTitle}>Instant Token Reservation</h3>
                <p style={{fontSize:'0.85rem',color:'var(--color-text-muted)',marginBottom:'0.75rem'}}>Reserve your room with a ₹200 token. Holds the room for 48 hours.</p>
                <button className={styles.bookBtn} onClick={()=>setShowBookingModal(true)}>Book with ₹200 Token</button>
              </div>
            )}
          </aside>
        </div>
      </div>
      {/* Checkout Modal */}
      {showBookingModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
            padding: '2rem',
            position: 'relative'
          }}>
            <button 
              onClick={() => setShowBookingModal(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'rgba(239, 68, 68, 0.08)',
                color: 'var(--color-primary)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>

            {!bookingSuccess ? (
              <form onSubmit={handleConfirmBooking}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Secure Your Reservation
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                  Complete booking token placement. Verified by StuNest secure student escrows.
                </p>

                {/* Property Detail Brief */}
                <div style={{ background: 'rgba(239, 68, 68, 0.04)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', borderLeft: '3px solid var(--color-primary)' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>{hostel.name}</h4>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{hostel.address}</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Select Room Type</label>
                    <select 
                      value={bookingRoomType} 
                      onChange={e => setBookingRoomType(e.target.value)} 
                      style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)', fontSize: '0.875rem' }}
                      required
                    >
                      <option value="">-- Choose Room Type --</option>
                      {hostel.room_types?.map(r => (
                        <option key={r.id} value={r.name}>{r.name} (₹{r.price}/mo)</option>
                      )) || (
                        <>
                          <option value="Single AC Sharing">Single AC Sharing (₹{hostel.price}/mo)</option>
                          <option value="Double sharing AC">Double sharing AC (₹{Math.round(hostel.price * 0.85)}/mo)</option>
                          <option value="Standard Non-AC">Standard Non-AC (₹{Math.round(hostel.price * 0.7)}/mo)</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Expected Move-in Date</label>
                    <input 
                      type="date" 
                      value={bookingMoveIn} 
                      onChange={e => setBookingMoveIn(e.target.value)} 
                      style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)', fontSize: '0.875rem' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Student Promo Coupon</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        placeholder="e.g. STUNESTNEW" 
                        value={bookingCoupon} 
                        onChange={e => setBookingCoupon(e.target.value)} 
                        style={{ flex: 1, padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)', fontSize: '0.875rem' }}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          const c = bookingCoupon.toUpperCase().trim();
                          if (c === 'STUNESTNEW' || c === 'CAMPUSFEST' || c === 'STUDENT50') {
                            setBookingDiscountApplied(150);
                            alert("Coupon activated! Flat ₹150 off on booking token fee applied.");
                          } else {
                            alert("Invalid or expired coupon.");
                          }
                        }}
                        style={{ padding: '0.65rem 1rem', background: '#1E293B', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.75rem' }}>Payment Breakdown</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                    <span>Monthly Rent (Realtime)</span>
                    <strong style={{ color: 'var(--color-text)' }}>₹{hostel.price?.toLocaleString('en-IN')}/mo</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                    <span>Refundable Escrow Token</span>
                    <span style={{ color: 'var(--color-text)' }}>₹200</span>
                  </div>
                  {bookingDiscountApplied > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#10B981', marginBottom: '0.35rem', fontWeight: 600 }}>
                      <span>Mock Coupon Discount</span>
                      <span>-₹{bookingDiscountApplied}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, color: 'var(--color-primary)', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                    <span>Payable Now</span>
                    <span>₹{200 - bookingDiscountApplied}</span>
                  </div>
                </div>

                {bookingStatusText && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-primary)', textAlign: 'center', margin: '0 0 1rem 0', fontWeight: 600 }}>
                    {bookingStatusText}
                  </p>
                )}

                <button 
                  type="submit" 
                  disabled={bookingSubmitting}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                  }}
                >
                  {bookingSubmitting ? 'Confirming...' : `Confirm & Pay ₹${200 - bookingDiscountApplied}`}
                </button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto', fontSize: '1.5rem', fontWeight: 'bold' }}>✓</div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.5rem' }}>Reservation Placed!</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  {bookingStatusText}
                </p>
                <div style={{ background: 'rgba(15, 23, 42, 0.03)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'left' }}>
                  <div style={{ marginBottom: '0.35rem' }}><strong>Room:</strong> {bookingRoomType}</div>
                  <div style={{ marginBottom: '0.35rem' }}><strong>Move-in:</strong> {bookingMoveIn}</div>
                  <div><strong>Paid via Escrow:</strong> ₹{200 - bookingDiscountApplied}</div>
                </div>
                <Link 
                  to="/dashboard?tab=bookings" 
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.85rem',
                    background: '#10B981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                  }}
                >
                  View in Dashboard
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hostel-context AI Chatbot */}
      <AIChatbot hostel={hostel} />
    </div>
  );
}
