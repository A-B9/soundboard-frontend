import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import './LoginPage.css';

/**
 * Turn a failed login into the message shown above the form.
 *
 * The backend distinguishes several cases (see IMPLEMENTATION_GUIDE.md §4;
 * note the deployed backend returns 400 — not 401 — for bad credentials):
 *  - 400: wrong username/password — error.message is the backend's
 *         "Invalid username or password"
 *  - 429: rate limit hit — error.message already says
 *         "Too many login attempts. Please try again later."
 *  - 403: account is flagged mustChangePassword — error.message already says
 *         "Password change required before accessing this resource"
 *  - 0:   network failure, backend unreachable (message set in client.ts)
 *  - anything else: unexpected; fall back to error.message
 */
function mapLoginError(error: ApiError): string {
  switch (error.status) {
    case 400:
      return 'Invalid username or password.';
    case 429:
      return 'Too many login attempts. Please try again later.';
    case 403:
      return 'Password change required before accessing this resource.';
    case 0:
      return 'Unable to connect to the server. Please check your network and try again.';
    default:
      return error.message || 'Something went wrong. Please try again.';
  }
}

function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/sounds" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/sounds', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(mapLoginError(err));
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Soundboard</h1>
        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </main>
  );
}

export default LoginPage;
