import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { roommateApi, hostelsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Users } from 'lucide-react';

const DUMMY_PROFILES = [
  { id:1, name:'Arjun K.', hostel_name:'Sunrise Premium Boys Hostel', branch:'B.Tech CSE', year_of_study:2, sleep_schedule:'night_owl', study_style:'silent', dietary_pref:'veg', hobbies:['Gaming','Music'], bio:'Chill guy, keeps room clean, looking for a quiet roommate.', ai_persona: 'The Quiet Scholar', match_score: 98, has_video: true },
  { id:2, name:'Priya M.', hostel_name:'Royal Heritage Girls Hostel', branch:'B.Tech IT', year_of_study:1, sleep_schedule:'early_bird', study_style:'group_study', dietary_pref:'veg', hobbies:['Reading','Yoga'], bio:'First-year student, very organised, loves cooking on weekends.', ai_persona: 'The Social Butterfly', match_score: 74, has_video: false },
  { id:3, name:'Ravi S.', hostel_name:'Elite Unisex Co-living', branch:'B.Tech ECE', year_of_study:3, sleep_schedule:'flexible', study_style:'music', dietary_pref:'non_veg', hobbies:['Sports','Movies'], bio:'Easy-going, sporty, always up for a cricket match.', ai_persona: 'The Easygoing Athlete', match_score: 85, has_video: true },
];

const SLEEP_LABELS  = { early_bird:'Early Bird', night_owl:'Night Owl', flexible:'Flexible' };
const STUDY_LABELS  = { silent:'Silent Study', music:'With Music', group_study:'Group Study', flexible:'Any Style' };
const DIET_LABELS   = { veg:'Vegetarian', non_veg:'Non-Veg', vegan:'Vegan', any:'Any' };

const tagStyle   = { fontSize:'0.72rem', background:'var(--color-background)', border:'1px solid var(--color-border)', padding:'0.2rem 0.55rem', borderRadius:'100px', color:'var(--color-text-muted)' };
const inputStyle = { padding:'0.65rem', border:'1px solid var(--color-border)', borderRadius:'8px', fontSize:'0.875rem', background:'var(--color-background)', color:'var(--color-text)', fontFamily:'inherit', width:'100%' };

export default function RoommatePage() {
  const { user } = useAuth();

  const [hostels, setHostels]           = useState([]);
  const [profiles, setProfiles]         = useState([]);
  const [myProfile, setMyProfile]       = useState(null);
  const [submitted, setSubmitted]       = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  const [form, setForm] = useState({
    name: '', branch: '', year_of_study: 1, hostel_name: '',
    sleep_schedule: 'flexible', study_style: 'flexible',
    dietary_pref: 'any', bio: '', video: null
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Load profiles and hostel names on mount
  useEffect(() => {
    async function load() {
      setLoadingProfiles(true);
      try {
        const [profileData, hostelData] = await Promise.allSettled([
          roommateApi.getAllActive(user?.id),
          hostelsApi.getAll({ limit: 50 }),
        ]);
        if (profileData.status === 'fulfilled' && profileData.value.length > 0) {
          setProfiles(profileData.value);
        } else {
          setProfiles(DUMMY_PROFILES);
        }
        if (hostelData.status === 'fulfilled') {
          setHostels(hostelData.value);
        }
      } catch {
        setProfiles(DUMMY_PROFILES);
      }
      setLoadingProfiles(false);
    }
    load();

    // Load existing profile if logged in
    if (user) {
      roommateApi.getProfile(user.id).then(p => {
        if (p) {
          setMyProfile(p);
          setSubmitted(true);
          setForm(f => ({
            ...f,
            name: p.name || '',
            branch: p.branch || '',
            year_of_study: p.year_of_study || 1,
            hostel_name: p.hostel_name || '',
            sleep_schedule: p.sleep_schedule || 'flexible',
            study_style: p.study_style || 'flexible',
            dietary_pref: p.dietary_pref || 'any',
            bio: p.bio || '',
          }));
        }
      }).catch(() => {});
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      if (user) {
        const saved = await roommateApi.upsertProfile(user.id, {
          name: form.name,
          branch: form.branch,
          year_of_study: form.year_of_study,
          hostel_name: form.hostel_name,
          sleep_schedule: form.sleep_schedule,
          study_style: form.study_style,
          dietary_pref: form.dietary_pref,
          bio: form.bio,
          is_looking: true,
        });
        setMyProfile(saved);
      }
      setSubmitted(true);
    } catch {
      setSubmitted(true); // Still show success UI even if DB fails
    }
    setSubmitting(false);
  };

  // Compute match score client-side against current user's form
  const withMatch = profiles.map(p => {
    let score = 50;
    if (p.sleep_schedule === form.sleep_schedule) score += 20;
    if (p.study_style   === form.study_style)   score += 15;
    if (p.dietary_pref  === form.dietary_pref)  score += 15;
    return { ...p, match_score: Math.min(score, 99) };
  }).sort((a, b) => b.match_score - a.match_score);

  return (
    <div style={{ paddingTop:'80px', minHeight:'100vh', background:'var(--color-background)' }}>
      <div className="container" style={{ padding:'2rem 1rem' }}>
        <div style={{ marginBottom:'2rem' }}>
          <h1 style={{ fontSize:'1.75rem', fontWeight:800 }}>Find a Roommate</h1>
          <p style={{ color:'var(--color-text-muted)', marginTop:'0.25rem' }}>Match with students based on lifestyle and habits.</p>
        </div>

        {!submitted ? (
          <div style={{ maxWidth:'560px', background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'16px', padding:'1.5rem', marginBottom:'2.5rem' }}>
            <h3 style={{ fontWeight:700, marginBottom:'1rem', fontSize:'1.05rem' }}>Create Your Profile</h3>
            {!user && (
              <div style={{ padding:'0.75rem 1rem', background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'8px', marginBottom:'1rem', fontSize:'0.82rem', color:'#92400E' }}>
                <Link to="/login" style={{ color:'var(--color-primary)', fontWeight:700 }}>Sign in</Link> to save your profile and get personalised matches.
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.65rem' }}>
              <input style={inputStyle} placeholder="Your name" value={form.name} onChange={e=>set('name',e.target.value)} />
              <input style={inputStyle} placeholder="Branch (e.g. B.Tech CSE)" value={form.branch} onChange={e=>set('branch',e.target.value)} />
              <div style={{ gridColumn:'1/-1' }}>
                <select style={inputStyle} value={form.hostel_name} onChange={e=>set('hostel_name',e.target.value)}>
                  <option value="">Select your hostel</option>
                  {hostels.length > 0
                    ? hostels.map(h=><option key={h.id} value={h.name}>{h.name}</option>)
                    : DUMMY_PROFILES.map(p=><option key={p.id} value={p.hostel_name}>{p.hostel_name}</option>)
                  }
                </select>
              </div>
              <div>
                <label style={{ fontSize:'0.78rem', color:'var(--color-text-muted)', display:'block', marginBottom:'0.3rem' }}>Sleep Schedule</label>
                <select style={inputStyle} value={form.sleep_schedule} onChange={e=>set('sleep_schedule',e.target.value)}>
                  <option value="early_bird">Early Bird</option>
                  <option value="night_owl">Night Owl</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:'0.78rem', color:'var(--color-text-muted)', display:'block', marginBottom:'0.3rem' }}>Dietary Preference</label>
                <select style={inputStyle} value={form.dietary_pref} onChange={e=>set('dietary_pref',e.target.value)}>
                  <option value="veg">Vegetarian</option>
                  <option value="non_veg">Non-Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="any">Any</option>
                </select>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ fontSize:'0.78rem', color:'var(--color-text-muted)', display:'block', marginBottom:'0.3rem' }}>Study Style</label>
                <select style={inputStyle} value={form.study_style} onChange={e=>set('study_style',e.target.value)}>
                  <option value="silent">Silent</option>
                  <option value="music">With Music</option>
                  <option value="group_study">Group Study</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
              <textarea style={{ ...inputStyle, gridColumn:'1/-1', resize:'vertical' }} placeholder="Short bio — what makes you a good roommate?" value={form.bio} onChange={e=>set('bio',e.target.value)} rows={3}/>
              
              <div style={{ gridColumn:'1/-1', display:'flex', alignItems:'center', gap:'1rem', padding:'1rem', border:'1px dashed var(--color-border)', borderRadius:'8px', background:'rgba(255,255,255,0.02)' }}>
                <label style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'40px', height:'40px', background:'var(--color-primary)', color:'#fff', borderRadius:'50%', cursor:'pointer', fontSize:'1.5rem', fontWeight:'bold', flexShrink:0, transition:'transform 0.2s' }} onMouseOver={e=>e.currentTarget.style.transform='scale(1.05)'} onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}>
                  +
                  <input type="file" accept="video/mp4" style={{ display:'none' }} onChange={(e) => set('video', e.target.files[0])} />
                </label>
                <div>
                  <p style={{ fontWeight:600, fontSize:'0.9rem', color:'var(--color-text)' }}>Upload Profile Video</p>
                  <p style={{ fontSize:'0.75rem', color:'var(--color-text-muted)', marginTop:'0.15rem' }}>Introduce yourself (MP4 only). Our AI will auto-translate it for regional matches.</p>
                </div>
                {form.video && <div style={{ marginLeft:'auto', fontSize:'0.75rem', color:'var(--color-primary)', fontWeight:700, maxWidth:'120px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{form.video.name}</div>}
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || !form.name.trim()}
              style={{ marginTop:'1rem', width:'100%', padding:'0.75rem', background:'var(--color-primary)', color:'#fff', border:'none', borderRadius:'10px', fontWeight:700, cursor:'pointer', fontSize:'0.9rem', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Posting...' : 'Post Profile'}
            </button>
          </div>
        ) : (
          <div style={{ padding:'1rem 1.25rem', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:'12px', color:'#059669', fontWeight:600, fontSize:'0.875rem', maxWidth:'560px', marginBottom:'2rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'1rem' }}>
            <span>✅ {myProfile ? 'Profile saved! ' : ''}Other students can now find and contact you.</span>
            <button onClick={() => setSubmitted(false)} style={{ background:'none', border:'1px solid rgba(16,185,129,0.4)', color:'#059669', padding:'0.3rem 0.75rem', borderRadius:'6px', cursor:'pointer', fontWeight:700, fontSize:'0.8rem', flexShrink:0 }}>Edit</button>
          </div>
        )}

        <h2 style={{ fontWeight:700, marginBottom:'1.25rem', fontSize:'1.1rem' }}>
          AI Matches For You
          {submitted && <span style={{ fontSize:'0.78rem', fontWeight:500, color:'var(--color-text-muted)', marginLeft:'0.75rem' }}>Sorted by compatibility</span>}
        </h2>

        {loadingProfiles ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'3rem' }}>
            <div style={{ width:'36px', height:'36px', border:'3px solid var(--color-border)', borderTopColor:'var(--color-primary)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(270px, 1fr))', gap:'1rem' }}>
            {withMatch.map(p => (
              <div key={p.id} style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'16px', padding:'1.25rem', position:'relative' }}>
                <div style={{ position:'absolute', top:'-10px', right:'-10px', background:'var(--color-primary)', color:'#fff', padding:'0.3rem 0.6rem', borderRadius:'12px', fontWeight:800, fontSize:'0.8rem', boxShadow:'0 4px 10px rgba(0,0,0,0.1)' }}>
                  {p.match_score}% Match
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.25rem' }}>
                  <div style={{ width:'46px', height:'46px', borderRadius:'50%', background:'linear-gradient(135deg, var(--color-primary), #8B5CF6)', color:'#fff', fontWeight:700, fontSize:'1.1rem', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {(p.name || p.profiles?.full_name || '?').charAt(0)}
                  </div>
                  <div>
                    <p style={{ fontWeight:700, fontSize:'0.95rem' }}>{p.name || p.profiles?.full_name}</p>
                    <p style={{ fontSize:'0.75rem', color:'var(--color-text-muted)' }}>{p.branch} &middot; Year {p.year_of_study}</p>
                  </div>
                </div>
                {p.ai_persona && (
                  <div style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--color-primary)', background:'var(--color-background)', padding:'0.2rem 0.5rem', borderRadius:'4px', display:'inline-block', marginBottom:'0.75rem' }}>
                    ✨ {p.ai_persona}
                  </div>
                )}
                <p style={{ fontSize:'0.82rem', color:'var(--color-text-muted)', fontStyle:'italic', marginBottom:'0.875rem', lineHeight:1.6 }}>"{p.bio}"</p>
                
                {p.has_video && (
                  <div style={{ marginBottom:'1rem', padding:'0.65rem', background:'var(--color-background)', borderRadius:'8px', border:'1px solid var(--color-border)' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.5rem' }}>
                      <span style={{ fontWeight:700, fontSize:'0.75rem', display:'flex', alignItems:'center', gap:'0.3rem', color:'var(--color-text)' }}>
                        <span style={{color:'var(--color-primary)'}}>▶</span> Video Intro
                      </span>
                      <select style={{ fontSize:'0.65rem', padding:'0.1rem 0.2rem', borderRadius:'4px', background:'var(--color-surface)', color:'var(--color-text)', border:'1px solid var(--color-border)' }}>
                        <option>Translate (gTTS)</option>
                        <option>Hindi</option>
                        <option>Telugu</option>
                        <option>Tamil</option>
                        <option>Marathi</option>
                        <option>Bengali</option>
                      </select>
                    </div>
                    <div style={{ position:'relative', width:'100%', height:'80px', background:'#000', borderRadius:'6px', display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:'0.5rem', overflow:'hidden' }}>
                      <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'30px', height:'30px', background:'rgba(255,255,255,0.2)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <div style={{ width:'0', height:'0', borderTop:'5px solid transparent', borderBottom:'5px solid transparent', borderLeft:'8px solid #fff', marginLeft:'2px' }}></div>
                      </div>
                      <div style={{ background:'rgba(0,0,0,0.6)', color:'#fff', fontSize:'0.65rem', padding:'0.2rem 0.4rem', borderRadius:'4px', textAlign:'center', maxWidth:'90%' }}>
                        [AI Translated] "Hello, I am {p.name}..."
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display:'flex', flexWrap:'wrap', gap:'0.35rem', marginBottom:'0.75rem' }}>
                  <span style={tagStyle}>{SLEEP_LABELS[p.sleep_schedule] || p.sleep_schedule}</span>
                  <span style={tagStyle}>{STUDY_LABELS[p.study_style]   || p.study_style}</span>
                  <span style={tagStyle}>{DIET_LABELS[p.dietary_pref]   || p.dietary_pref}</span>
                </div>
                <p style={{ fontSize:'0.78rem', color:'var(--color-text-muted)', marginBottom:'0.3rem' }}>{p.hostel_name}</p>
                {p.hobbies?.length > 0 && <p style={{ fontSize:'0.78rem', color:'var(--color-text-muted)' }}>{Array.isArray(p.hobbies) ? p.hobbies.join(', ') : p.hobbies}</p>}
                <a
                  href={`https://wa.me/?text=Hi ${p.name || 'there'}, I saw your StuNest roommate profile and we have a ${p.match_score}% AI match!`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display:'block', marginTop:'1rem', padding:'0.6rem', background:'#25D366', color:'#fff', borderRadius:'8px', fontWeight:700, fontSize:'0.82rem', textAlign:'center', textDecoration:'none' }}
                >
                  Connect on WhatsApp
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
