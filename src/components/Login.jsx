import React, { useState } from 'react';
import { HeartPulse, Lock, Mail, ShieldAlert, Sparkles, Activity } from 'lucide-react';

function Login({ supabase, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    if (!supabase) {
      // Excel PoC Bypass mode
      setTimeout(() => {
        onLoginSuccess({
          access_token: 'poc-bypass-token',
          user: { email: 'doctor@popms.com', id: 'poc-user-id' }
        });
        setLoading(false);
      }, 600);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg('Account registered successfully! Check your inbox for a verification email, or log in if email confirmation is disabled.');
          setIsSignUp(false);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setErrorMsg(error.message);
        } else if (data.session) {
          // Fetch user role
          const token = data.session.access_token;
          const statsRes = await fetch('/api/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          let role = 'doctor';
          if (statsRes.ok) {
            // Note: role verification is also queried in frontend app level, 
            // but we can pass user info.
          }
          onLoginSuccess(data.session);
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleBypass = () => {
    onLoginSuccess({
      user: { email: 'doctor@popms.com', id: 'poc-user-id' },
      role: 'admin',
      session: { access_token: 'poc-bypass-token' }
    });
  };

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <HeartPulse size={32} />
          </div>
          <h2>POPMS</h2>
          <span>Pediatric Orthopedic Patient Management System</span>
        </div>

        {/* Local PoC Banner */}
        {!supabase && (
          <div className="poc-banner">
            <Activity size={16} />
            <span>
              <strong>Local PoC Mode Active:</strong> Supabase keys are not set. You can bypass the login gateway.
            </span>
          </div>
        )}

        <form onSubmit={handleAuth} className="login-form">
          {errorMsg && (
            <div className="login-alert error">
              <ShieldAlert size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="login-alert success">
              <Sparkles size={16} style={{ color: 'var(--success)' }} />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="form-group">
            <label>Clinical Email</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@hospital.com"
                required={supabase ? true : false}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Security Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required={supabase ? true : false}
                disabled={loading}
              />
            </div>
          </div>

          {supabase ? (
            <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
              {loading ? 'Authenticating...' : isSignUp ? 'Create Account' : 'Log In'}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <button type="submit" className="btn btn-primary login-btn">
                Bypass Login
              </button>
            </div>
          )}

          {supabase && (
            <div className="auth-toggle">
              {isSignUp ? (
                <p>
                  Already have an account?{' '}
                  <span onClick={() => setIsSignUp(false)}>Sign In</span>
                </p>
              ) : (
                <p>
                  New staff member?{' '}
                  <span onClick={() => setIsSignUp(true)}>Sign Up</span>
                </p>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default Login;
