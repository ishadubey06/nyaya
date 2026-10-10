import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import themisImg from '../assets/themis.jpg';
import logoImg from '../assets/logo.svg';
import { Mail, Lock, ArrowRight, Eye, EyeOff, KeyRound, ChevronLeft, UserCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const VIEWS = {
  SIGN_IN: 'sign_in',
  SIGN_UP: 'sign_up',
  FORGOT_PASSWORD: 'forgot_password',
  OTP_VERIFY: 'otp_verify',
  RESET_SENT: 'reset_sent',
};

export default function AuthPage({ onAuthComplete }) {
  const { loginAsGuest } = useAuth();
  const [view, setView] = useState(VIEWS.SIGN_IN);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emerged, setEmerged] = useState(false);

  useEffect(() => {
    setTimeout(() => setEmerged(true), 100);
  }, []);

  const clearMessages = () => {
    setError('');
    setMessage('');
  };

  // Email + Password Sign Up
  const handleSignUp = async (e) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) throw signUpError;
      
      if (data.user && !data.session) {
        // Email confirmation required
        setMessage('Check your email for a verification link to complete sign up.');
        setView(VIEWS.SIGN_IN);
      } else if (data.session) {
        // Auto-confirmed (e.g. in dev or email confirmation disabled)
        onAuthComplete();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Email + Password Sign In
  const handleSignIn = async (e) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      if (data.session) {
        onAuthComplete();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Email OTP Sign In (Magic Link alternative)
  const handleSendOTP = async (e) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
      });
      if (otpError) throw otpError;
      setMessage('An OTP has been sent to your email.');
      setView(VIEWS.OTP_VERIFY);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });
      if (verifyError) throw verifyError;
      if (data.session) {
        onAuthComplete();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/home`,
      });
      if (resetError) throw resetError;
      setView(VIEWS.RESET_SENT);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth
  const handleGoogleSignIn = async () => {
    clearMessages();
    setIsLoading(true);
    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/home`,
        },
      });
      if (googleError) throw googleError;
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const renderForm = () => {
    switch (view) {
      case VIEWS.SIGN_IN:
        return (
          <form onSubmit={handleSignIn} className="auth-form">
            <h2 className="auth-heading">Welcome Back</h2>
            <p className="auth-subheading">Sign in to access your legal dashboard</p>

            <div className="auth-input-group">
              <Mail size={18} className="auth-input-icon" />
              <input
                id="signin-email"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
              />
            </div>

            <div className="auth-input-group">
              <Lock size={18} className="auth-input-icon" />
              <input
                id="signin-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="auth-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="auth-toggle-password"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="button"
              className="auth-forgot-link"
              onClick={() => { clearMessages(); setView(VIEWS.FORGOT_PASSWORD); }}
            >
              Forgot your password?
            </button>

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
              {!isLoading && <ArrowRight size={18} />}
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <button
              type="button"
              onClick={() => {
                loginAsGuest();
                onAuthComplete();
              }}
              className="auth-google-btn"
              style={{
                marginBottom: '0.75rem',
                background: 'rgba(218, 165, 32, 0.15)',
                borderColor: 'rgba(218, 165, 32, 0.4)',
                color: '#fff',
                fontWeight: 600
              }}
            >
              <UserCheck size={18} color="#e5a93c" />
              Continue as Guest (Local User)
            </button>

            <button type="button" onClick={handleGoogleSignIn} className="auth-google-btn" disabled={isLoading}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>

            <button type="button" onClick={handleSendOTP} className="auth-otp-link" disabled={isLoading || !email}>
              <KeyRound size={14} /> Sign in with Email OTP
            </button>

            <p className="auth-switch-text">
              Don't have an account?{' '}
              <button type="button" onClick={() => { clearMessages(); setView(VIEWS.SIGN_UP); }} className="auth-switch-link">
                Sign Up
              </button>
            </p>
          </form>
        );

      case VIEWS.SIGN_UP:
        return (
          <form onSubmit={handleSignUp} className="auth-form">
            <h2 className="auth-heading">Create Account</h2>
            <p className="auth-subheading">Join Nyaya AI to protect your rights</p>

            <div className="auth-input-group">
              <Mail size={18} className="auth-input-icon" />
              <input
                id="signup-email"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
              />
            </div>

            <div className="auth-input-group">
              <Lock size={18} className="auth-input-icon" />
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="auth-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="auth-toggle-password"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Sign Up'}
              {!isLoading && <ArrowRight size={18} />}
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <button type="button" onClick={handleGoogleSignIn} className="auth-google-btn" disabled={isLoading}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>

            <p className="auth-switch-text">
              Already have an account?{' '}
              <button type="button" onClick={() => { clearMessages(); setView(VIEWS.SIGN_IN); }} className="auth-switch-link">
                Sign In
              </button>
            </p>
          </form>
        );

      case VIEWS.FORGOT_PASSWORD:
        return (
          <form onSubmit={handleForgotPassword} className="auth-form">
            <button type="button" className="auth-back-btn" onClick={() => { clearMessages(); setView(VIEWS.SIGN_IN); }}>
              <ChevronLeft size={18} /> Back to Sign In
            </button>
            <h2 className="auth-heading">Reset Password</h2>
            <p className="auth-subheading">Enter your email and we'll send a reset link</p>

            <div className="auth-input-group">
              <Mail size={18} className="auth-input-icon" />
              <input
                id="reset-email"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Reset Link'}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>
        );

      case VIEWS.OTP_VERIFY:
        return (
          <form onSubmit={handleVerifyOTP} className="auth-form">
            <button type="button" className="auth-back-btn" onClick={() => { clearMessages(); setView(VIEWS.SIGN_IN); }}>
              <ChevronLeft size={18} /> Back to Sign In
            </button>
            <h2 className="auth-heading">Enter OTP</h2>
            <p className="auth-subheading">We sent a code to <strong>{email}</strong></p>

            <div className="auth-input-group">
              <KeyRound size={18} className="auth-input-icon" />
              <input
                id="otp-input"
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                className="auth-input"
                style={{ letterSpacing: '6px', textAlign: 'center', fontSize: '1.3rem' }}
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Verify OTP'}
              {!isLoading && <ArrowRight size={18} />}
            </button>

            <button type="button" onClick={handleSendOTP} className="auth-otp-link" disabled={isLoading}>
              Resend OTP
            </button>
          </form>
        );

      case VIEWS.RESET_SENT:
        return (
          <div className="auth-form">
            <h2 className="auth-heading">Check Your Email</h2>
            <p className="auth-subheading">
              We've sent a password reset link to <strong>{email}</strong>. Follow the link to reset your password.
            </p>
            <button
              type="button"
              className="auth-submit-btn"
              onClick={() => { clearMessages(); setView(VIEWS.SIGN_IN); }}
            >
              Back to Sign In
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="auth-page">
      <section className={`auth-hero-fullscreen ${emerged ? 'emerged' : ''}`}>
        <img
          src={themisImg}
          alt="Lady of Justice"
          className="themis-bg-image"
        />
        <div className="themis-ambient-glow"></div>

        {/* Logo */}
        <div className="landing-logo-overlay">
          <img src={logoImg} alt="Ashoka Stambh Logo" className="landing-logo-img" />
          <span className="landing-logo-text">NYAYA AI</span>
        </div>

        {/* Auth Card */}
        <div className="auth-overlay-content">
          <div className={`auth-card-container ${emerged ? 'emerged' : ''}`}>
            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}
            {message && (
              <div className="auth-message">
                {message}
              </div>
            )}
            {renderForm()}
          </div>
        </div>
      </section>
    </div>
  );
}
