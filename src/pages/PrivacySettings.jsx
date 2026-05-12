import React, { useEffect, useState } from 'react';
import { ArrowLeft, FileText, Lock, Shield, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { readAppSettings, writeAppSettings } from '@/lib/appSettings';

const privacyItems = [
  ['showProfile', 'Show my username publicly', 'Your public profile can appear in rankings, feed and recipe pages.'],
  ['showJoinedPlans', 'Show plans I joined', 'Lets other members understand your pizza activity.'],
  ['allowMessagesFromMembers', 'Allow messages from group members', 'Group chat still works for plans you join.'],
];

const legalCards = [
  { icon: Shield, title: 'Privacy basics', text: 'Email addresses stay private. Public content can include your username, avatar, recipes, ratings, comments, check-ins and joined public plans.' },
  { icon: UserCheck, title: 'Community safety', text: 'Profiles, comments, photos, recipes and groups can be reported and reviewed by admins. Abusive or misleading content can be hidden or removed.' },
  { icon: Lock, title: 'Data control', text: 'Users should be able to request account deletion, data export and correction. Keep Supabase auth and storage policies enabled before launch.' },
  { icon: FileText, title: 'Launch checklist', text: 'Before public release, publish full Terms, Privacy Policy, Cookie notice and contact email for legal/data requests.' },
];

export default function PrivacySettings() {
  const [settings, setSettings] = useState(readAppSettings());

  useEffect(() => {
    writeAppSettings(settings);
  }, [settings]);

  return (
    <div className="min-h-[calc(100dvh-var(--header-height)-5.5rem)] bg-[#060606] px-3 py-4 pb-[calc(var(--mobile-nav-height)+1rem)] text-white sm:px-5 sm:py-6">
      <main className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center gap-3">
          <Link to={createPageUrl('SettingsPage')} className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-stone-200"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <div className="inline-flex rounded-full border border-[#efbf3a]/25 bg-[#efbf3a]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#efbf3a]">Legal center</div>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.05em]">Privacy and safety</h1>
          </div>
        </div>

        <section className="rounded-[30px] border border-white/10 bg-[#101010] p-4 shadow-[0_22px_55px_rgba(0,0,0,0.25)]">
          <h2 className="text-xl font-black">Visibility controls</h2>
          <p className="mt-1 text-sm leading-6 text-stone-500">These controls affect how your social information appears in the app experience.</p>
          <div className="mt-4 grid gap-3">
            {privacyItems.map(([key, label, text]) => (
              <button key={key} type="button" onClick={() => setSettings((prev) => ({ ...prev, privacy: { ...prev.privacy, [key]: !prev.privacy[key] } }))} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-left transition hover:bg-white/[0.06]">
                <div className="min-w-0">
                  <div className="font-black text-white">{label}</div>
                  <div className="mt-1 text-sm leading-5 text-stone-500">{text}</div>
                </div>
                <div className={`h-7 w-12 shrink-0 rounded-full p-1 transition ${settings.privacy[key] ? 'bg-emerald-500' : 'bg-white/10'}`}><div className={`h-5 w-5 rounded-full bg-white transition ${settings.privacy[key] ? 'translate-x-5' : ''}`} /></div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          {legalCards.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-[24px] border border-white/10 bg-[#101010] p-4">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#efbf3a] text-[#141414]"><Icon className="h-5 w-5" /></div>
              <div className="mt-3 text-lg font-black">{title}</div>
              <p className="mt-2 text-sm leading-6 text-stone-500">{text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}