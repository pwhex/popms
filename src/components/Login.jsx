import React, { useState, useEffect, useRef } from 'react';
import { HeartPulse, ShieldAlert, Activity } from 'lucide-react';

function Login({ googleClientId, googleSignInEnabled, onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const googleButtonRef = useRef(null);

  const handleGoogleCredential = async (response) => {
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      const data = await res.json();
      if (res.ok) {
        onLoginSuccess(data);
      } else {
        setErrorMsg(data.error || 'Google sign-in failed.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error during Google sign-in.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!googleSignInEnabled || !googleClientId || !window.google || !googleButtonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredential
    });
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'filled_blue',
      size: 'large',
      width: 320
    });
  }, [googleSignInEnabled, googleClientId]);

  const handleBypass = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/bypass', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        onLoginSuccess(data);
      } else {
        setErrorMsg(data.error || 'Unable to start local session.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error while starting local session.');
    } finally {
      setLoading(false);
    }
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

        {errorMsg && (
          <div className="login-alert error">
            <ShieldAlert size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="login-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          {googleSignInEnabled && (
            <div ref={googleButtonRef} style={{ display: 'flex', justifyContent: 'center' }} />
          )}

          {googleSignInEnabled && (
            <div className="auth-toggle">
              <p>or</p>
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary login-btn"
            onClick={handleBypass}
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Starting session...' : 'Continue without Google'}
          </button>
        </div>

        {!googleSignInEnabled && (
          <div className="poc-banner">
            <Activity size={16} />
            <span>Google Sign-In is not configured on this server. Continuing starts a local session.</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
