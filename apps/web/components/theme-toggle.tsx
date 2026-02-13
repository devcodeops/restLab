'use client';

import { useEffect, useRef, useState } from 'react';

type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
  try {
    localStorage.setItem('restlab-theme', theme);
  } catch {
    // ignore storage failures
  }
}

function readInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  const current = document.documentElement.getAttribute('data-theme');
  if (current === 'dark' || current === 'light') return current;
  return 'light';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const current = readInitialTheme();
    setTheme(current);
    setMounted(true);
  }, []);

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    const root = document.documentElement;
    root.classList.add('theme-animating');
    if (transitionTimerRef.current != null) {
      window.clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = window.setTimeout(() => {
      root.classList.remove('theme-animating');
      transitionTimerRef.current = null;
    }, 320);

    setTheme(next);
    applyTheme(next);
  }

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current != null) {
        window.clearTimeout(transitionTimerRef.current);
      }
      document.documentElement.classList.remove('theme-animating');
    };
  }, []);

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
      title={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
      disabled={!mounted}
    >
      <span className={`theme-toggle-track ${theme === 'dark' ? 'is-dark' : ''}`}>
        <span className={`theme-toggle-thumb ${theme === 'dark' ? 'is-dark' : ''}`}>
          {theme === 'dark' ? '☀' : '☾'}
        </span>
      </span>
    </button>
  );
}
