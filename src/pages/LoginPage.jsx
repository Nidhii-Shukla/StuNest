import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, GraduationCap, Home } from 'lucide-react';
import { toast } from 'react-hot-toast';
import supabase from '../lib/supabase';
import StuNestLogo from '../components/StuNestLogo';
import styles from './AuthPage.module.css';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('student'); // 'student' | 'owner'
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (authError) throw authError;

      // Verify the role matches what they selected (optional but good practice)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        // If profile doesn't exist, allow them to log in but warn or default
        console.error("Profile not found:", profileError);
      }

      setLoading(false);
      
      const userRole = profileData?.role || role;
      const destination = location.state?.from || (userRole === 'owner' ? '/owner' : userRole === 'admin' ? '/admin' : '/search');
      navigate(destination);
    } catch (err) {
      // Intercept authentication failure to verify if user profile exists
      try {
        const { data: profileCheck, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', form.email.trim().toLowerCase())
          .maybeSingle();

        if (!checkError && !profileCheck) {
          // Account does not exist in profiles table! Redirect to Signup with state.
          setError('');
          setLoading(false);
          toast.error("You've never signed up, Please sign Up first!", {
            duration: 3000,
            icon: '👋'
          });
          setTimeout(() => {
            navigate('/signup', { state: { email: form.email, role } });
          }, 1500);
          return;
        }
      } catch (checkErr) {
        console.warn("User existence DB check failed:", checkErr);
      }

      setError(err.message || 'Invalid email or password.');
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
          src="https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=1200"
          alt="Student hostel"
          className={styles.visualImg}
        />
        <div className={styles.visualContent}>
          <div style={{ marginBottom: '1.5rem' }}>
            <StuNestLogo height={44} variant="light" />
          </div>
          <h2 className={styles.visualHeading}>Find your perfect student home near campus</h2>
          <p className={styles.visualSubtext}>500+ verified hostels · Distance-based search · Student-friendly pricing</p>
          <div className={styles.visualStats}>
            <div className={styles.visualStat}><strong>500+</strong><span>Hostels</span></div>
            <div className={styles.visualStat}><strong>10K+</strong><span>Students</span></div>
            <div className={styles.visualStat}><strong>50+</strong><span>Colleges</span></div>
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

          <h1 className={styles.formTitle}>Welcome back</h1>
          <p className={styles.formSubtitle}>Sign in to your account to continue</p>

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

          {/* Google Sign In */}
          <button type="button" className={styles.googleBtn} onClick={handleGoogleSignIn}>
            <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <div className={styles.divider}><span>or sign in with email</span></div>

          {/* Form */}
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.errorMsg}>{error}</div>}

            <div className={styles.inputGroup}>
              <label className={styles.label}>Email address</label>
              <div className={styles.inputWrapper}>
                <Mail size={18} className={styles.inputIcon} />
                <input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  className={styles.input}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <div className={styles.labelRow}>
                <label className={styles.label}>Password</label>
                <Link to="/forgot-password" className={styles.forgotLink}>Forgot password?</Link>
              </div>
              <div className={styles.inputWrapper}>
                <Lock size={18} className={styles.inputIcon} />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  className={styles.input}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className={styles.eyeBtn}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? <span className={styles.spinner}></span> : `Sign In as ${role === 'student' ? 'Student' : 'Owner'}`}
            </button>
          </form>

          <p className={styles.switchAuth}>
            Don't have an account? <Link to="/signup" className={styles.switchLink}>Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
