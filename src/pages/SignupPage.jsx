import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone, GraduationCap, Home } from 'lucide-react';
import supabase from '../lib/supabase';
import StuNestLogo from '../components/StuNestLogo';
import styles from './AuthPage.module.css';

function SignupPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', college: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });

      if (authError) throw authError;

      if (authData?.user) {
        // Insert into custom profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            full_name: form.name,
            phone: form.phone,
            role: role,
            college: role === 'student' ? form.college : null,
            email: form.email
          });

        if (profileError) throw profileError;
      }

      setLoading(false);
      navigate(role === 'owner' ? '/owner' : '/search');
    } catch (err) {
      setError(err.message || 'An error occurred during signup.');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      localStorage.setItem('oauth_selected_role', role);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/search`,
        }
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err.message || 'Failed to authenticate with Google.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      {/* Left visual panel */}
      <div className={styles.visualPanel}>
        <div className={styles.visualOverlay} />
        <img
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200"
          alt="Students"
          className={styles.visualImg}
        />
        <div className={styles.visualContent}>
          <div style={{ marginBottom: '1.5rem' }}>
            <StuNestLogo height={44} variant="light" />
          </div>
          <h2 className={styles.visualHeading}>Join thousands of students finding their perfect stay</h2>
          <p className={styles.visualSubtext}>Free to use · No brokerage · Direct owner contact</p>
          <div className={styles.testimonial}>
            <p className={styles.testimonialText}>"StuNest helped me find a verified hostel 5 minutes walk from JNTUH on my very first search. Best platform for students!"</p>
            <div className={styles.testimonialAuthor}>
              <div className={styles.testimonialAvatar}>R</div>
              <div>
                <strong>Rahul K.</strong>
                <span>B.Tech CSE, JNTUH</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className={styles.formPanel}>
        <div className={styles.formWrapper}>
          {/* Mobile logo */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }} className={styles.mobileLogo}>
            <StuNestLogo height={44} />
          </div>

          <h1 className={styles.formTitle}>Create your account</h1>
          <p className={styles.formSubtitle}>Join StuNest for free — no credit card needed</p>

          {/* Role Toggle */}
          <div className={styles.roleToggle}>
            <button
              type="button"
              className={`${styles.roleBtn} ${role === 'student' ? styles.roleBtnActive : ''}`}
              onClick={() => setRole('student')}
            >
              <GraduationCap size={18} /> Student
            </button>
            <button
              type="button"
              className={`${styles.roleBtn} ${role === 'owner' ? styles.roleBtnActive : ''}`}
              onClick={() => setRole('owner')}
            >
              <Home size={18} /> Property Owner
            </button>
          </div>

          {/* Google Sign Up */}
          <button type="button" className={styles.googleBtn} onClick={handleGoogleSignIn}>
            <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <div className={styles.divider}><span>or sign up with email</span></div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.errorMsg}>{error}</div>}

            <div className={styles.inputGroup}>
              <label className={styles.label}>Full Name <span className={styles.required}>*</span></label>
              <div className={styles.inputWrapper}>
                <User size={18} className={styles.inputIcon} />
                <input name="name" type="text" placeholder="Your full name" value={form.name} onChange={handleChange} className={styles.input} />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Email address <span className={styles.required}>*</span></label>
              <div className={styles.inputWrapper}>
                <Mail size={18} className={styles.inputIcon} />
                <input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} className={styles.input} autoComplete="email" />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Phone Number</label>
              <div className={styles.inputWrapper}>
                <Phone size={18} className={styles.inputIcon} />
                <input name="phone" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={handleChange} className={styles.input} />
              </div>
            </div>

            {role === 'student' && (
              <div className={styles.inputGroup}>
                <label className={styles.label}>College / Campus</label>
                <div className={styles.inputWrapper}>
                  <GraduationCap size={18} className={styles.inputIcon} />
                  <input name="college" type="text" placeholder="e.g. JNTUH, CMRIT" value={form.college} onChange={handleChange} className={styles.input} />
                </div>
              </div>
            )}

            <div className={styles.inputGroup}>
              <label className={styles.label}>Password <span className={styles.required}>*</span></label>
              <div className={styles.inputWrapper}>
                <Lock size={18} className={styles.inputIcon} />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  className={styles.input}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className={styles.eyeBtn}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {form.password && (
                <div className={styles.passwordStrength}>
                  <div className={`${styles.strengthBar} ${form.password.length >= 8 ? styles.strengthGood : styles.strengthWeak}`}></div>
                  <span className={form.password.length >= 8 ? styles.strengthGoodText : styles.strengthWeakText}>
                    {form.password.length >= 12 ? 'Strong' : form.password.length >= 8 ? 'Good' : 'Too short'}
                  </span>
                </div>
              )}
            </div>

            <p className={styles.termsText}>
              By creating an account, you agree to our <Link to="/terms" className={styles.switchLink}>Terms of Service</Link> and <Link to="/privacy" className={styles.switchLink}>Privacy Policy</Link>.
            </p>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? <span className={styles.spinner}></span> : `Create ${role === 'student' ? 'Student' : 'Owner'} Account`}
            </button>
          </form>

          <p className={styles.switchAuth}>
            Already have an account? <Link to="/login" className={styles.switchLink}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
