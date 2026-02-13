'use client';

import { ServiceCards } from '../../components/service-cards';
import { useI18n } from '../../lib/i18n';

export default function ServicesPage() {
  const { t } = useI18n();

  return (
    <main className="space-y-4">
      <h2 className="text-xl font-semibold">{t('services.title')}</h2>
      <ServiceCards />
    </main>
  );
}
