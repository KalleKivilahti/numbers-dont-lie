"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import Link from "next/link";

type AnalyticsPayload = {
  error?: string;
  status?: string;
  message?: string;
  bmi?: { value: number; category: string };
  wellness?: {
    score: number;
    breakdown: {
      bmi: number;
      activity: number;
      progress: number;
      habits: number;
    };
  };
  snapshots?: {
    recordedAt: string;
    weightKg: number | null;
    wellnessScore: number | null;
  }[];
  progress?: { weightDelta: number | null; snapshotsCount: number };
  comparison?: {
    currentWeightKg?: number | null;
    targetWeightKg?: number | null;
    weeklyActivityDays?: number | null;
    activityLevel?: string | null;
    targetActivityLevel?: string | null;
  };
  targetWeightKg?: number | null;
  milestones?: {
    weightProgress?: {
      percentTowardGoal: number | null;
      milestonesReached: number[];
    };
    activity?: { extraDays: number; notes: string };
  };
};

type SummaryPayload = {
  headline?: string;
  bullets?: string[];
  metrics?: Record<string, unknown>;
};

type InsightRow = {
  id: string;
  summary: string;
  detail?: string | null;
  createdAt: string;
  priority?: string | null;
};

export function DashboardPanel() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [sumWeek, setSumWeek] = useState<SummaryPayload | null>(null);
  const [sumMonth, setSumMonth] = useState<SummaryPayload | null>(null);
  const [insights, setInsights] = useState<InsightRow[]>([]);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/analytics")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ error: "Failed to load analytics" }));
    void fetch("/api/analytics/summary?period=week")
      .then((r) => r.json())
      .then(setSumWeek)
      .catch(() => {});
    void fetch("/api/analytics/summary?period=month")
      .then((r) => r.json())
      .then(setSumMonth)
      .catch(() => {});
    void fetch("/api/insights", { credentials: "include" })
      .then((r) => r.json())
      .then((j: { insights?: InsightRow[] }) => setInsights(j.insights ?? []))
      .catch(() => {});
  }, []);

  const chartData = useMemo(() => {
    if (!data?.snapshots?.length) return [];
    return data.snapshots.map((s) => ({
      t: format(new Date(s.recordedAt), "MMM d"),
      weight: s.weightKg ?? undefined,
      wellness: s.wellnessScore ?? undefined,
    }));
  }, [data]);

  const weightDomain = useMemo((): [number, number] => {
    const target = data?.targetWeightKg;
    const weights = chartData.map((d) => d.weight).filter((w): w is number => w != null);
    let lo = weights.length ? Math.min(...weights) : 50;
    let hi = weights.length ? Math.max(...weights) : 80;
    if (typeof target === "number") {
      lo = Math.min(lo, target);
      hi = Math.max(hi, target);
    }
    const pad = (hi - lo) * 0.08 || 2;
    return [Math.floor(lo - pad), Math.ceil(hi + pad)];
  }, [chartData, data?.targetWeightKg]);

  async function generateInsight() {
    setLoadingInsight(true);
    setInsightError(null);
    const res = await fetch("/api/insights", {
      method: "POST",
      credentials: "include",
    });
    const j = (await res.json()) as { insight?: InsightRow; error?: string };
    setLoadingInsight(false);
    if (!res.ok) {
      setInsightError(j.error ?? "Could not generate insights");
      return;
    }
    if (j.insight) {
      setInsights((prev) => [j.insight as InsightRow, ...prev]);
    }
  }

  if (data === null) {
    return (
      <div className="animate-pulse space-y-6" aria-busy="true">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-36 rounded-2xl bg-slate-800/60" />
          <div className="h-36 rounded-2xl bg-slate-800/60" />
          <div className="h-36 rounded-2xl bg-slate-800/60" />
        </div>
        <div className="h-72 rounded-2xl bg-slate-800/50" />
      </div>
    );
  }

  if ("error" in data && data.error) {
    return <p className="text-sm text-rose-300">{data.error}</p>;
  }

  if ("status" in data && data.status === "incomplete_profile") {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-amber-100">
        <p className="font-medium">{data.message}</p>
        <Link href="/profile" className="mt-3 inline-block text-sm text-sky-400 hover:underline">
          Complete health profile →
        </Link>
      </div>
    );
  }

  const bmi = data.bmi;
  const wellness = data.wellness;
  const cmp = data.comparison;
  const targetW = data.targetWeightKg ?? undefined;
  const mi = data.milestones;

  return (
    <div className="space-y-10">
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 lg:col-span-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            BMI
          </h2>
          <p className="mt-2 text-4xl font-semibold text-slate-50">{bmi?.value ?? "—"}</p>
          <p className="text-sm capitalize text-sky-300">{bmi?.category?.replace(/_/g, " ")}</p>
          <BmiSpectrum value={bmi?.value ?? 0} />
          <p className="mt-3 text-xs text-slate-500">
            Bands: underweight &lt;18.5 · normal 18.5–24.9 · overweight 25–29.9 · obese ≥30
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 lg:col-span-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Wellness score
          </h2>
          <WellnessDial score={wellness?.score ?? 0} />
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-400">
            <Breakdown label="BMI" value={wellness?.breakdown.bmi} />
            <Breakdown label="Activity" value={wellness?.breakdown.activity} />
            <Breakdown label="Progress" value={wellness?.breakdown.progress} />
            <Breakdown label="Habits" value={wellness?.breakdown.habits} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 lg:col-span-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Progress
          </h2>
          <p className="mt-3 text-sm text-slate-300">
            Snapshots: <strong>{data.progress?.snapshotsCount ?? 0}</strong>
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Weight delta (series):{" "}
            <strong>
              {data.progress?.weightDelta != null
                ? `${data.progress.weightDelta > 0 ? "+" : ""}${data.progress.weightDelta} kg`
                : "—"}
            </strong>
          </p>
          <p className="mt-4 text-xs text-slate-500">
            Log weight via Profile saves or <code className="text-slate-400">POST /api/metrics</code>.
          </p>
        </div>
      </section>

      {cmp && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-slate-200">Current vs target</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <CompareCard label="Weight (kg)" current={cmp.currentWeightKg} target={cmp.targetWeightKg} />
            <CompareCard
              label="Activity days / week"
              current={cmp.weeklyActivityDays}
              target={null}
            />
            <div className="rounded-xl bg-black/25 p-3">
              <p className="text-xs uppercase text-slate-500">Activity level</p>
              <p className="mt-1 capitalize text-slate-200">
                {cmp.activityLevel?.replace(/_/g, " ") ?? "—"}
              </p>
              <p className="text-xs text-slate-500">
                Target: {cmp.targetActivityLevel?.replace(/_/g, " ") ?? "—"}
              </p>
            </div>
          </div>
        </section>
      )}

      {(sumWeek?.bullets?.length || sumMonth?.bullets?.length) && (
        <section className="grid gap-4 md:grid-cols-2">
          <SummaryCard title="Weekly summary" payload={sumWeek} />
          <SummaryCard title="Monthly summary" payload={sumMonth} />
        </section>
      )}

      {mi && (
        <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-5">
          <h2 className="text-sm font-semibold text-emerald-100">Milestones</h2>
          <p className="mt-1 text-xs text-slate-400">
            Weight: 5% bands toward goal · Activity: vs baseline 2 days/week
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm text-slate-300">
            <div>
              <p className="text-xs uppercase text-slate-500">Goal progress</p>
              <p className="mt-1">
                {mi.weightProgress?.percentTowardGoal != null
                  ? `${mi.weightProgress.percentTowardGoal}% toward goal`
                  : "Set target weight for % milestones."}
              </p>
              {!!mi.weightProgress?.milestonesReached?.length && (
                <p className="mt-2 text-xs text-emerald-300/90">
                  Bands reached:{" "}
                  {mi.weightProgress.milestonesReached.filter((x) => x % 5 === 0).join(", ")}%
                </p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Activity milestone</p>
              <p className="mt-1">{mi.activity?.notes}</p>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
        <h2 className="mb-4 text-sm font-semibold text-slate-200">Weight &amp; wellness trend</h2>
        <div className="h-72 w-full min-h-[12rem]">
          {chartData.length === 0 ? (
            <p className="text-sm text-slate-500">No time-series data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="t" stroke="#94a3b8" fontSize={11} />
                <YAxis
                  yAxisId="left"
                  stroke="#94a3b8"
                  fontSize={11}
                  domain={weightDomain}
                />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #334155" }}
                />
                {typeof targetW === "number" && (
                  <ReferenceLine
                    yAxisId="left"
                    y={targetW}
                    stroke="#f472b6"
                    strokeDasharray="6 4"
                    label={{ value: "Goal wt", fill: "#f472b6", fontSize: 11 }}
                  />
                )}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="weight"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  name="Weight (kg)"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-6 h-56 min-h-[10rem]">
          {chartData.length === 0 ? null : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="wl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="t" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #334155" }} />
                <Area
                  type="monotone"
                  dataKey="wellness"
                  stroke="#c084fc"
                  fillOpacity={1}
                  fill="url(#wl)"
                  name="Wellness"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">AI insights</h2> 
          </div>
          <button
            type="button"
            onClick={() => void generateInsight()}
            disabled={loadingInsight}
            className="rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {loadingInsight ? "Generating…" : "Generate insight"}
          </button>
        </div>
        {insightError && (
          <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {insightError}
          </p>
        )}
        <ul className="mt-6 space-y-4">
          {insights.slice(0, 8).map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-white/5 bg-black/20 p-4 text-sm text-slate-300"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs text-slate-500">{format(new Date(row.createdAt), "PPpp")}</p>
                {row.priority && (
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      row.priority === "high"
                        ? "bg-rose-500/30 text-rose-100"
                        : row.priority === "low"
                          ? "bg-slate-600 text-slate-300"
                          : "bg-amber-500/25 text-amber-100"
                    }`}
                  >
                    {row.priority}
                  </span>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-slate-100">{row.summary}</p>
            </li>
          ))}
          {insights.length === 0 && (
            <li className="text-sm text-slate-500">No AI insights yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function CompareCard({
  label,
  current,
  target,
}: {
  label: string;
  current?: number | null;
  target?: number | null;
}) {
  return (
    <div className="rounded-xl bg-black/25 p-3">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-lg text-slate-100">{current ?? "—"}</p>
      {target != null && (
        <p className="text-xs text-slate-500">
          Target: <span className="text-pink-300">{target}</span>
        </p>
      )}
    </div>
  );
}

function SummaryCard({ title, payload }: { title: string; payload: SummaryPayload | null }) {
  if (!payload?.bullets?.length) return null;
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      <p className="mt-1 text-xs text-slate-500">{payload.headline}</p>
      <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-slate-400">
        {payload.bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

function Breakdown({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-lg bg-black/20 px-2 py-1">
      <span className="text-slate-500">{label}: </span>
      <span className="font-mono text-slate-200">{value != null ? Math.round(value) : "—"}</span>
    </div>
  );
}

function WellnessDial({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const hue = pct > 70 ? 145 : pct > 45 ? 45 : 0;
  return (
    <div className="relative mx-auto mt-4 flex h-36 w-36 items-center justify-center">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(hsl(${hue},80%,45%) ${pct * 3.6}deg, #1e293b 0deg)`,
        }}
      />
      <div className="relative flex h-28 w-28 flex-col items-center justify-center rounded-full bg-[#0f1419]">
        <span className="text-3xl font-semibold text-slate-50">{Math.round(pct)}</span>
        <span className="text-[10px] uppercase tracking-wide text-slate-500">Score</span>
      </div>
    </div>
  );
}

function BmiSpectrum({ value }: { value: number }) {
  if (!value) return <div className="mt-4 h-2 rounded-full bg-slate-800" />;
  const clamped = Math.min(40, Math.max(15, value));
  const leftPct = ((clamped - 15) / (40 - 15)) * 100;
  return (
    <div className="relative mt-4">
      <div className="h-3 w-full rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-rose-500 opacity-80" />
      <div
        className="absolute -top-1 h-5 w-1 rounded bg-white shadow"
        style={{ left: `calc(${leftPct}% - 2px)` }}
        title={`BMI ${value}`}
      />
    </div>
  );
}
