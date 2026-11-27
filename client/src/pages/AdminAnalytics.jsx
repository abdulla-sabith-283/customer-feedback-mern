import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNav from '../components/AdminNav';

const RATING_TIERS = Array.from({ length: 5 }, (_, i) => 5 - i);
const CATEGORIES = [
  'Product / Service',
  'Staff / Support',
  'Website / Digital Experience',
  'Other'
];
const STATUSES = ['New', 'Reviewed', 'Resolved'];

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('softrate_token');

  useEffect(() => {
    if (!token) return navigate('/admin/login');
    fetch('/api/admin/analytics', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (res.status === 401) {
          localStorage.removeItem('softrate_token');
          navigate('/admin/login');
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (json) setData(json);
      });
  }, [token, navigate]);

  const summary = data?.summary || {
    total: 0,
    averageRating: 0,
    fiveStarCount: 0,
    resolvedCount: 0,
    resolutionRate: 0
  };

  const getRatingCount = (star) =>
    data?.byRating?.find((r) => r._id === star)?.count || 0;

  const getCategoryCount = (cat) =>
    data?.byCategory?.find((c) => c._id === cat)?.count || 0;

  const getStatusCount = (st) =>
    data?.byStatus?.find((s) => s._id === st)?.count || 0;

  return (
    <>
      <AdminNav />

      <main className="container-wide">
        <div style={{ marginBottom: '24px' }}>
          <h1>Feedback Analytics</h1>
          <p className="meta">Real-time customer satisfaction breakdown and resolution metrics.</p>
        </div>

        <div className="stats-grid-4">
          <div className="stat-card">
            <div className="stat-label">Total Feedback</div>
            <div className="stat-value">{summary.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Average Rating</div>
            <div className="stat-value">{summary.averageRating} / 5</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">5-Star Reviews</div>
            <div className="stat-value">{summary.fiveStarCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Resolution Rate</div>
            <div className="stat-value">{summary.resolutionRate}%</div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-card">
            <h2>Rating Distribution</h2>
            <p className="meta">Share of reviews by star rating</p>

            {RATING_TIERS.map((star) => {
              const count = getRatingCount(star);
              const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
              return (
                <div key={star} className="chart-row">
                  <div className="chart-row-head">
                    <span>{star} {star === 1 ? 'Star' : 'Stars'}</span>
                    <span className="meta">{count} ({pct}%)</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill bar-fill-star" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="chart-card">
            <h2>Category Breakdown</h2>
            <p className="meta">Feedback volume across departments</p>

            {CATEGORIES.map((cat) => {
              const count = getCategoryCount(cat);
              const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
              return (
                <div key={cat} className="chart-row">
                  <div className="chart-row-head">
                    <span>{cat}</span>
                    <span className="meta">{count} ({pct}%)</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="chart-card">
          <h2>Triage & Resolution Pipeline</h2>
          <p className="meta">Current workflow status across all {summary.total} submissions</p>

          {STATUSES.map((st) => {
            const count = getStatusCount(st);
            const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
            return (
              <div key={st} className="chart-row">
                <div className="chart-row-head">
                  <span>{st}</span>
                  <span className="meta">{count} ({pct}%)</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
