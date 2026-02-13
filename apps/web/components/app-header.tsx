'use client';

import Link from 'next/link';
import { useI18n } from '../lib/i18n';
import { LanguageSwitcher } from './language-switcher';
import { ThemeToggle } from './theme-toggle';

export function AppHeader() {
  const { t } = useI18n();

  return (
    <header className="mb-6 grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
      <h1 className="text-2xl font-semibold md:justify-self-start">RestLab Control Center</h1>
      <nav className="mx-auto flex gap-2 text-sm md:justify-self-center">
          <Link href="/" className="nav-link">
            {t('nav.dashboard')}
          </Link>
          <Link href="/services" className="nav-link">
            {t('nav.services')}
          </Link>
          <Link href="/sigkill" className="nav-link">
            {t('nav.sigkill')}
          </Link>
      </nav>
      <div className="flex items-center justify-center gap-3 md:justify-self-end">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
