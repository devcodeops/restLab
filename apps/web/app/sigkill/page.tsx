'use client';

import { SigkillPanel } from '../../components/sigkill-panel';
import { useI18n } from '../../lib/i18n';

export default function SigkillPage() {
  const { t } = useI18n();

  return (
    <main className="space-y-4">
      <h2 className="text-xl font-semibold">{t('sigkill.title')}</h2>
      <SigkillPanel />
    </main>
  );
}
