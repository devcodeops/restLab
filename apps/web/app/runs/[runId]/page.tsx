import { RunDetailView } from '../../../components/run-detail';

export default function RunDetailPage({ params }: { params: { runId: string } }) {
  return (
    <main className="space-y-4">
      <h2 className="text-xl font-semibold">Run {params.runId}</h2>
      <RunDetailView runId={params.runId} />
    </main>
  );
}
