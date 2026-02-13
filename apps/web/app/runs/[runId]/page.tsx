'use client';

import { RunDetailView } from '../../../components/run-detail';
import { useI18n } from '../../../lib/i18n';

export default function RunDetailPage({ params }: { params: { runId: string } }) {
  const { t } = useI18n();

  return (
    <main className="space-y-4">
      <h2 className="text-xl font-semibold">
        {t('runs.runTitle')} {params.runId}
      </h2>
      <RunDetailView runId={params.runId} />
    </main>
  );
}
