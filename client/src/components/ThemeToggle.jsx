import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => localStorage.getItem('softrate_theme') === 'dark');

  useEffect(() => {
    const theme = dark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('softrate_theme', theme);
  }, [dark]);

  return (
    <button
      type="button"
      className="btn btn-outline"
      aria-label="Toggle dark mode"
      onClick={() => setDark(!dark)}
      style={{ padding: '8px 10px' }}
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
