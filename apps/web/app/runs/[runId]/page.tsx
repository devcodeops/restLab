'use client';

import { use } from 'react';
import { RunDetailView } from '../../../components/run-detail';
import { useI18n } from '../../../lib/i18n';

export default function RunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { t } = useI18n();
  const { runId } = use(params);

  return (
    <main className="space-y-4">
      <h2 className="text-xl font-semibold">
        {t('runs.runTitle')} {runId}
      </h2>
      <RunDetailView runId={runId} />
    </main>
  );
}
