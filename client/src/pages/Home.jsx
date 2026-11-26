import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Star, CheckCircle2 } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very good', 5: 'Excellent' };
const CATEGORIES = [
  'Product / Service',
  'Staff / Support',
  'Website / Digital Experience',
  'Other'
];

export default function Home() {
  const [showForm, setShowForm] = useState(true);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef(null);

  function openFeedback() {
    setShowForm(true);
    setSubmitted(false);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!rating) return setError('Please select a star rating.');
    if (message.trim().length < 10) return setError('Feedback must be at least 10 characters.');

    setLoading(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, rating, category, message })
      });
      const data = await res.json();
    if (!res.ok) {
    const msg = typeof data.error === 'string' ? data.error : 'Submission failed';
    throw new Error(msg);
    }
      setSubmitted(true);
      setName('');
      setRating(0);
      setMessage('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#526B58" strokeWidth="2">
            <rect x="3" y="4" width="18" height="14" rx="2" />
            <path d="M8 21l4-3h9" />
          </svg>
          <span>SOFTRATE TECH</span>
        </Link>
        <div className="nav-links">
          <ThemeToggle />
          <button type="button" className="btn btn-primary" onClick={openFeedback}>
            Customer Feedback
          </button>
          <Link to="/admin/login" className="btn btn-outline">
            Staff Login
          </Link>
        </div>
      </nav>

      <main className="container" ref={formRef}>
        <div style={{ marginBottom: '28px' }}>
          <p className="meta" style={{ marginBottom: '6px' }}>SOFTRATE TECH · Customer Portal</p>
          <h1>Your experience matters.</h1>
          <p className="subtitle">
            We appreciate you taking the time to share your feedback. Your honest input helps us improve.
          </p>
        </div>

        {showForm && (
          <div className="card">
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <CheckCircle2 size={36} color="#54765C" style={{ marginBottom: '12px' }} />
                <h2 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, marginBottom: '8px' }}>
                  Thank you for your feedback
                </h2>
                <p className="subtitle">Your response has been recorded.</p>
                <button type="button" className="btn btn-outline" onClick={() => setSubmitted(false)}>
                  Submit another response
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label className="label">Your name (optional)</label>
                  <input
                    className="input"
                    type="text"
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>

                <div className="field">
                  <label className="label">Rating *</label>
                  <div className="star-row">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        aria-label={`Rate ${num} stars`}
                        className={`star-btn ${rating >= num ? 'active' : ''}`}
                        onClick={() => setRating(num)}
                      >
                        <Star
                          size={20}
                          fill={rating >= num ? '#C18A3D' : 'none'}
                          color={rating >= num ? '#C18A3D' : '#747A72'}
                        />
                      </button>
                    ))}
                    {rating > 0 && <span className="rating-text">{LABELS[rating]}</span>}
                  </div>
                </div>

                <div className="field">
                  <label className="label">Feedback category</label>
                  <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label className="label">Feedback message *</label>
                    <span className="meta">{message.length} / 1200</span>
                  </div>
                  <textarea
                    className="textarea"
                    rows={4}
                    maxLength={1200}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us about your experience..."
                  />
                </div>

                {error && <p className="error-msg">{error}</p>}

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </form>
            )}
          </div>
        )}
      </main>
    </>
  );
}
