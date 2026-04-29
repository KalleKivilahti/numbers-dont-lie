"use client";

import { useEffect, useState } from "react";

const defaults = {
  age: "",
  gender: "prefer_not",
  heightCm: "",
  weightKg: "",
  occupationType: "mixed",
  activityLevel: "moderate",
  targetWeightKg: "",
  weeklyActivityDays: "3",
  sessionDurationBand: "30-60",
  fitnessLevelSelf: "intermediate",
  exerciseEnvironment: "home",
  exerciseTimeOfDay: "morning",
  enduranceMinutes: "20",
  pushupsMax: "",
  squatsMax: "",
};

export function ProfileEditor() {
  const [form, setForm] = useState<Record<string, string>>(defaults);
  const [prefs, setPrefs] = useState("vegetarian");
  const [restrictions, setRestrictions] = useState("");
  const [goals, setGoals] = useState("general_fitness");
  const [types, setTypes] = useState("cardio,strength");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        const p = d.profile;
        if (!p) return;
        setForm({
          age: p.age?.toString() ?? "",
          gender: p.gender ?? "prefer_not",
          heightCm: p.heightCm?.toString() ?? "",
          weightKg: p.weightKg?.toString() ?? "",
          occupationType: p.occupationType ?? "mixed",
          activityLevel: p.activityLevel ?? "moderate",
          targetWeightKg: p.targetWeightKg?.toString() ?? "",
          weeklyActivityDays: p.weeklyActivityDays?.toString() ?? "3",
          sessionDurationBand: p.sessionDurationBand ?? "30-60",
          fitnessLevelSelf: p.fitnessLevelSelf ?? "intermediate",
          exerciseEnvironment: p.exerciseEnvironment ?? "home",
          exerciseTimeOfDay: p.exerciseTimeOfDay ?? "morning",
          enduranceMinutes: p.enduranceMinutes?.toString() ?? "",
          pushupsMax: p.pushupsMax?.toString() ?? "",
          squatsMax: p.squatsMax?.toString() ?? "",
        });
        try {
          const dp = JSON.parse(p.dietaryPreferences ?? "[]");
          if (Array.isArray(dp)) setPrefs(dp.join(","));
        } catch {
          /* ignore */
        }
        try {
          const dr = JSON.parse(p.dietaryRestrictions ?? "[]");
          if (Array.isArray(dr)) setRestrictions(dr.join(","));
        } catch {
          /* ignore */
        }
        try {
          const fg = JSON.parse(p.fitnessGoals ?? "[]");
          if (Array.isArray(fg)) setGoals(fg.join(","));
        } catch {
          /* ignore */
        }
        try {
          const et = JSON.parse(p.exerciseTypes ?? "[]");
          if (Array.isArray(et)) setTypes(et.join(","));
        } catch {
          /* ignore */
        }
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const payload = {
      age: form.age ? Number(form.age) : undefined,
      gender: form.gender as "female" | "male" | "non_binary" | "prefer_not",
      heightCm: form.heightCm ? Number(form.heightCm) : undefined,
      weightKg: form.weightKg ? Number(form.weightKg) : undefined,
      occupationType: form.occupationType as "sedentary" | "mixed" | "physical",
      activityLevel: form.activityLevel as
        | "sedentary"
        | "light"
        | "moderate"
        | "active"
        | "very_active",
      dietaryPreferences: prefs
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      dietaryRestrictions: restrictions
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      fitnessGoals: goals
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean) as (
        | "weight_loss"
        | "muscle_gain"
        | "general_fitness"
        | "endurance"
        | "flexibility"
      )[],
      targetWeightKg: form.targetWeightKg ? Number(form.targetWeightKg) : undefined,
      weeklyActivityDays: form.weeklyActivityDays
        ? Number(form.weeklyActivityDays)
        : undefined,
      exerciseTypes: types.split(",").map((s) => s.trim()).filter(Boolean) as (
        | "cardio"
        | "strength"
        | "flexibility"
        | "sports"
      )[],
      sessionDurationBand: form.sessionDurationBand as "15-30" | "30-60" | "60+",
      fitnessLevelSelf: form.fitnessLevelSelf as "beginner" | "intermediate" | "advanced",
      exerciseEnvironment: form.exerciseEnvironment as "home" | "gym" | "outdoors",
      exerciseTimeOfDay: form.exerciseTimeOfDay as "morning" | "afternoon" | "evening",
      enduranceMinutes: form.enduranceMinutes ? Number(form.enduranceMinutes) : undefined,
      pushupsMax: form.pushupsMax ? Number(form.pushupsMax) : undefined,
      squatsMax: form.squatsMax ? Number(form.squatsMax) : undefined,
    };

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(JSON.stringify(data.error ?? data));
      return;
    }
    setMsg("Profile saved.");
  }

  async function exportData() {
    const res = await fetch("/api/profile/export");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wellness-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function field<K extends keyof typeof defaults>(key: K, label: string, type = "text") {
    return (
      <label className="block text-sm">
        <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
        <input
          type={type}
          className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-sky-500/40 focus:ring-2"
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        />
      </label>
    );
  }

  return (
    <form onSubmit={save} className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        {field("age", "Age", "number")}
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-wide text-slate-500">Gender</span>
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-sky-500/40 focus:ring-2"
            value={form.gender}
            onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
          >
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="non_binary">Non-binary</option>
            <option value="prefer_not">Prefer not to say</option>
          </select>
        </label>
        {field("heightCm", "Height", "number")}
        {field("weightKg", "Weight", "number")}
        <label className="block text-sm md:col-span-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">
            Dietary preferences
          </span>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-sky-500/40 focus:ring-2"
            value={prefs}
            onChange={(e) => setPrefs(e.target.value)}
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">
            Restrictions
          </span>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-sky-500/40 focus:ring-2"
            value={restrictions}
            onChange={(e) => setRestrictions(e.target.value)}
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">
            Fitness goals
          </span>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-sky-500/40 focus:ring-2"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-wide text-slate-500">Occupation type</span>
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-sky-500/40 focus:ring-2"
            value={form.occupationType}
            onChange={(e) => setForm((f) => ({ ...f, occupationType: e.target.value }))}
          >
            <option value="sedentary">Mostly sedentary</option>
            <option value="mixed">Mixed</option>
            <option value="physical">Physical</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-wide text-slate-500">Activity level</span>
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-sky-500/40 focus:ring-2"
            value={form.activityLevel}
            onChange={(e) => setForm((f) => ({ ...f, activityLevel: e.target.value }))}
          >
            <option value="sedentary">Sedentary</option>
            <option value="light">Light</option>
            <option value="moderate">Moderate</option>
            <option value="active">Active</option>
            <option value="very_active">Very active</option>
          </select>
        </label>
        {field("targetWeightKg", "Target weight", "number")}
        {field("weeklyActivityDays", "Weekly activity days", "number")}
        <label className="block text-sm md:col-span-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">
            Exercise types
          </span>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-sky-500/40 focus:ring-2"
            value={types}
            onChange={(e) => setTypes(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-wide text-slate-500">
            Session duration band
          </span>
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-sky-500/40 focus:ring-2"
            value={form.sessionDurationBand}
            onChange={(e) => setForm((f) => ({ ...f, sessionDurationBand: e.target.value }))}
          >
            <option value="15-30">15–30 min</option>
            <option value="30-60">30–60 min</option>
            <option value="60+">60+ min</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-wide text-slate-500">Fitness level</span>
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-sky-500/40 focus:ring-2"
            value={form.fitnessLevelSelf}
            onChange={(e) => setForm((f) => ({ ...f, fitnessLevelSelf: e.target.value }))}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-wide text-slate-500">Environment</span>
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-sky-500/40 focus:ring-2"
            value={form.exerciseEnvironment}
            onChange={(e) => setForm((f) => ({ ...f, exerciseEnvironment: e.target.value }))}
          >
            <option value="home">Home</option>
            <option value="gym">Gym</option>
            <option value="outdoors">Outdoors</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-wide text-slate-500">Preferred time</span>
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-sky-500/40 focus:ring-2"
            value={form.exerciseTimeOfDay}
            onChange={(e) => setForm((f) => ({ ...f, exerciseTimeOfDay: e.target.value }))}
          >
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
          </select>
        </label>
        {field("enduranceMinutes", "Endurance minutes", "number")}
        {field("pushupsMax", "Max push-ups", "number")}
        {field("squatsMax", "Max squats", "number")}
      </div>

      {err && (
        <pre className="whitespace-pre-wrap rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-100">
          {err}
        </pre>
      )}
      {msg && (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-100">
          {msg}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded-full bg-sky-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400"
        >
          Save profile
        </button>
        <button
          type="button"
          className="rounded-full border border-white/15 px-6 py-2.5 text-sm text-slate-200 hover:bg-white/5"
          onClick={() => void exportData()}
        >
          Export JSON
        </button>
      </div>
    </form>
  );
}
