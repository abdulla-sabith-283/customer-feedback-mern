import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Star, Trash2, LogOut } from 'lucide-react';

export default function AdminDashboard() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, averageRating: 0, fiveStarCount: 0 });
  const [ratingFilter, setRatingFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const navigate = useNavigate();

  const token = localStorage.getItem('softrate_token');

  const loadData = useCallback(async () => {
    if (!token) return navigate('/admin/login');
    const params = new URLSearchParams();
    if (ratingFilter) params.set('rating', ratingFilter);
    if (categoryFilter) params.set('category', categoryFilter);

    const res = await fetch(`/api/admin/feedback?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 401) {
      localStorage.removeItem('softrate_token');
      return navigate('/admin/login');
    }
    const data = await res.json();
    setItems(data.items || []);
    setStats(data.stats || { total: 0, averageRating: 0, fiveStarCount: 0 });
  }, [token, ratingFilter, categoryFilter, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function confirmDelete() {
  if (!deleteId) return;
  setDeleting(true);
  try {
    await fetch(`/api/admin/feedback/${deleteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    setDeleteId(null);
    loadData();
  } finally {
    setDeleting(false);
  }
}


  function logout() {
    localStorage.removeItem('softrate_token');
    navigate('/admin/login');
  }

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="brand">SOFTRATE TECH · Dashboard</Link>
        <button type="button" className="btn btn-outline" onClick={logout}>
          <LogOut size={16} /> Logout
        </button>
      </nav>

      <main className="container-wide">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Submissions</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Average Rating</div>
            <div className="stat-value">{stats.averageRating} / 5</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">5-Star Reviews</div>
            <div className="stat-value">{stats.fiveStarCount}</div>
          </div>
        </div>

        <div className="filters-bar">
          <select className="select" value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
            <option value="">All Ratings</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>{r} Stars</option>
            ))}
          </select>

          <select className="select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            <option value="Product / Service">Product / Service</option>
            <option value="Staff / Support">Staff / Support</option>
            <option value="Website / Digital Experience">Website / Digital Experience</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="feedback-list">
          {items.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: '#747A72' }}>
              No feedback submissions found.
            </div>
          ) : (
            items.map((item) => (
              <div key={item._id} className="feedback-item">
                <div className="feedback-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ display: 'inline-flex', gap: '2px' }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={15}
                          fill={item.rating >= s ? '#C18A3D' : 'none'}
                          color={item.rating >= s ? '#C18A3D' : '#E5E3DA'}
                        />
                      ))}
                    </span>
                    <span className="badge">{item.category}</span>
                  </div>
                  <button type="button" className="btn btn-danger" onClick={() => setDeleteId(item._id)}>
  <Trash2 size={14} /> Delete
</button>

                </div>

                <p style={{ marginBottom: '10px', fontSize: '15px' }}>{item.message}</p>

                <div className="meta">
                  {item.name || 'Anonymous'} · {new Date(item.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
         {deleteId && (
     <div className="modal-backdrop" onClick={() => !deleting && setDeleteId(null)}>
       <div className="modal-card" onClick={(e) => e.stopPropagation()}>
         <h2 className="modal-title">Delete feedback?</h2>
         <p className="meta">
           This action cannot be undone. The feedback submission will be permanently removed.
         </p>
         <div className="modal-actions">
           <button
             type="button"
             className="btn btn-outline"
             disabled={deleting}
             onClick={() => setDeleteId(null)}
           >
             Cancel
           </button>
           <button
             type="button"
             className="btn btn-danger-solid"
             disabled={deleting}
             onClick={confirmDelete}
           >
             {deleting ? 'Deleting...' : 'Delete'}
           </button>
         </div>
       </div>
     </div>
   )}

    </>
  );
}
