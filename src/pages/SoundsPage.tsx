import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './SoundsPage.css';

function SoundsPage() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="sounds-page">
      <header className="sounds-header">
        <h1>Soundboard</h1>
        <div className="sounds-header-user">
          <span>{username}</span>
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>
      <main className="sounds-main">
        <p>Sounds coming in Phase 4.</p>
      </main>
    </div>
  );
}

export default SoundsPage;
