import { DashboardPanel } from "./dashboard-panel";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-50">
        Health dashboard
      </h1>
      <p className="mt-2 max-w-2xl text-slate-400">
        Visual BMI classification, weighted wellness score components, trends from stored
        snapshots, and AI insights with versioning & consent.
      </p>
      <div className="mt-10">
        <DashboardPanel />
      </div>
    </main>
  );
}
