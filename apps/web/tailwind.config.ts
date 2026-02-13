import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#f5f7fa',
        card: '#ffffff',
        ink: '#111827',
        muted: '#64748b',
        accent: '#0f766e',
        warn: '#b45309',
        danger: '#b91c1c',
      },
      boxShadow: {
        panel: '0 10px 30px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
