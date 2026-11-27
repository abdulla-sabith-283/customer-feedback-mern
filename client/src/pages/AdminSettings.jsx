import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import AdminNav from '../components/AdminNav';

export default function AdminSettings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('softrate_token');

  useEffect(() => {
    if (!token) navigate('/admin/login');
  }, [token, navigate]);

  async function handlePasswordUpdate(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword.length < 8) {
      return setError('New password must be at least 8 characters.');
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');
      setSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AdminNav />

      <main className="container" style={{ maxWidth: '540px' }}>
        <div className="card">
          <h1>Staff Settings</h1>
          <p className="subtitle">Manage admin security credentials for SOFTRATE TECH.</p>

          <form onSubmit={handlePasswordUpdate}>
            <div className="field">
              <label className="label">Current password</label>
              <input
                className="input"
                type={showPw ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>

            <div className="field">
              <label className="label">New password (min 8 characters)</label>
              <div className="password-wrap">
                <input
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  className="eye-btn"
                  aria-label="Toggle password visibility"
                  onClick={() => setShowPw(!showPw)}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <p className="error-msg">{error}</p>}
            {success && <p className="success-msg">{success}</p>}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
