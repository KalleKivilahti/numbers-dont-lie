import { ProfileEditor } from "./profile-editor";

export default function ProfilePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-semibold text-slate-50">Health profile</h1>
      <div className="mt-10">
        <ProfileEditor />
      </div>
    </main>
  );
}
