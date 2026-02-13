'use client';

import { useI18n } from '../lib/i18n';

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <label className="lang-switch">
      <select
        aria-label="Language"
        className="lang-switch-select"
        value={locale}
        onChange={(e) => setLocale(e.target.value as 'es' | 'en')}
      >
        <option value="es">🇪🇸</option>
        <option value="en">🇬🇧</option>
      </select>
    </label>
  );
}
