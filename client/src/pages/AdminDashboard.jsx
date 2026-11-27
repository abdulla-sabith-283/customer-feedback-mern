import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Trash2, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import AdminNav from '../components/AdminNav';

const STARS = Array.from({ length: 5 }, (_, i) => i + 1);

export default function AdminDashboard() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, averageRating: 0, fiveStarCount: 0 });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalFiltered: 0 });
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const token = localStorage.getItem('softrate_token');

  const loadData = useCallback(async () => {
    if (!token) return navigate('/admin/login');
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '5');
    if (search.trim()) params.set('search', search.trim());
    if (ratingFilter) params.set('rating', ratingFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    if (statusFilter) params.set('status', statusFilter);

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
    setPagination(data.pagination || { page: 1, totalPages: 1, totalFiltered: 0 });
  }, [token, page, search, ratingFilter, categoryFilter, statusFilter, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleStatusChange(id, nextStatus) {
    await fetch(`/api/admin/feedback/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status: nextStatus })
    });
    loadData();
  }

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

  function exportCsv() {
    const headers = ['Date', 'Name', 'Rating', 'Category', 'Status', 'Message'];
    const rows = items.map((i) => [
      new Date(i.createdAt).toLocaleDateString(),
      `"${(i.name || 'Anonymous').replace(/"/g, '""')}"`,
      i.rating,
      `"${i.category}"`,
      i.status || 'New',
      `"${i.message.replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `softrate-feedback-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <AdminNav />

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

        <div className="toolbar-header">
          <div>
            <h2>Customer Feedback Inbox</h2>
            <p className="meta">Showing {items.length} of {pagination.totalFiltered} matching submissions</p>
          </div>
          <button type="button" className="btn btn-outline" onClick={exportCsv} disabled={items.length === 0}>
            <Download size={15} /> Export CSV
          </button>
        </div>

        <div className="filters-bar">
          <div className="search-wrap">
            <Search size={16} className="search-icon" />
            <input
              className="input"
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name or message..."
            />
          </div>

          <select
            className="select"
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>

          <select
            className="select"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Categories</option>
            <option value="Product / Service">Product / Service</option>
            <option value="Staff / Support">Staff / Support</option>
            <option value="Website / Digital Experience">Website / Digital Experience</option>
            <option value="Other">Other</option>
          </select>

          <select
            className="select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="New">New</option>
            <option value="Reviewed">Reviewed</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>

        <div className="feedback-list">
          {items.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--muted)' }}>
              No feedback submissions found.
            </div>
          ) : (
            items.map((item) => (
              <div key={item._id} className="feedback-item">
                <div className="feedback-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', gap: '2px' }}>
                      {STARS.map((s) => (
                        <Star
                          key={s}
                          size={15}
                          fill={item.rating >= s ? 'var(--star)' : 'none'}
                          color={item.rating >= s ? 'var(--star)' : 'var(--border)'}
                        />
                      ))}
                    </span>
                    <span className="badge">{item.category}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select
                      className="status-select"
                      aria-label="Submission status"
                      value={item.status || 'New'}
                      onChange={(e) => handleStatusChange(item._id, e.target.value)}
                    >
                      <option value="New">New</option>
                      <option value="Reviewed">Reviewed</option>
                      <option value="Resolved">Resolved</option>
                    </select>

                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => setDeleteId(item._id)}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>

                <p style={{ marginBottom: '10px', fontSize: '15px' }}>{item.message}</p>

                <div className="meta">
                  {item.name || 'Anonymous'} · {new Date(item.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pagination-bar">
          <span className="meta">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-outline"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
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
