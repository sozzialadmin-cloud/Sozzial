import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Cookie, FileText, Lock, ShieldCheck, Trash2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

const pages = {
  privacy: {
    icon: Lock,
    title: 'Privacy Policy',
    eyebrow: 'Privacy',
    updated: 'Last updated: 2026',
    intro: 'Sozzial uses the minimum personal data needed to run a social pizza map: accounts, public profiles, spots, plans, comments, photos, reports and approximate location features.',
    sections: [
      ['Data we collect', 'Email, username, avatar, profile details, saved spots, comments, plans, messages, uploaded photos, reports and technical data such as device/browser information. Location is used only when you allow it or search an area manually.'],
      ['How we use data', 'To authenticate users, show public profiles, display spots and plans, moderate unsafe content, prevent spam, improve the product and respond to support or deletion requests.'],
      ['Third-party services', 'The app may use Supabase for authentication/database/storage, Vercel for hosting, map/search providers for location features and Google authentication if you sign in with Google.'],
      ['Public content', 'Public profiles, spots, recipes, comments and plans may be visible to other users unless the feature or visibility setting says otherwise. Do not publish private information.'],
      ['Your controls', 'You can edit your profile, report content, request account deletion and contact the owner for privacy questions or data requests.'],
    ],
  },
  terms: {
    icon: FileText,
    title: 'Terms of Service',
    eyebrow: 'Terms',
    updated: 'Last updated: 2026',
    intro: 'By using Sozzial you agree to use the app responsibly and to respect other users, restaurants and communities.',
    sections: [
      ['User responsibility', 'You are responsible for your profile, photos, comments, plans, messages and any other content you publish.'],
      ['Content rules', 'Do not post illegal content, harassment, threats, spam, explicit sexual content, hate, scams, private data or intentionally false restaurant information.'],
      ['Moderation', 'Sozzial may hide, remove, reject or moderate content and may warn, suspend or ban accounts that create risk or abuse the platform.'],
      ['Meetups and safety', 'Plans are user-created. Sozzial does not verify every person or guarantee the safety, accuracy or availability of places or meetups.'],
      ['Availability', 'The service may change, break, be limited or be discontinued. Use it as an app-in-progress until a formal launch.'],
    ],
  },
  cookies: {
    icon: Cookie,
    title: 'Cookie Policy',
    eyebrow: 'Cookies',
    updated: 'Last updated: 2026',
    intro: 'Sozzial keeps cookies/local storage minimal and uses them mainly for login sessions, device preferences and app basics.',
    sections: [
      ['Essential storage', 'Authentication and security sessions may be stored by Supabase. These are needed for login and account features.'],
      ['Preferences', 'The app may store local preferences such as remember-me, UI settings or temporary local fallback data.'],
      ['Analytics and ads', 'If analytics or advertising tools are added later, this policy should be updated before public launch.'],
      ['Control', 'You can clear cookies and local storage from your browser settings, but doing so may log you out or reset device preferences.'],
    ],
  },
  safety: {
    icon: ShieldCheck,
    title: 'Safety Guidelines',
    eyebrow: 'Safety',
    updated: 'Last updated: 2026',
    intro: 'Sozzial is social, so safety matters. Use public places, protect your personal data and report suspicious behavior.',
    sections: [
      ['Meet in public', 'For plans with people you do not know, choose public, busy places and tell someone where you are going.'],
      ['Protect private data', 'Do not share your address, financial information, passwords, personal documents or sensitive private details in chats or profiles.'],
      ['Report abuse', 'Report harassment, scams, spam, suspicious users, inappropriate photos or unsafe plans so admins can review them.'],
      ['Content moderation', 'Moderators can hide content, review reports, warn users, suspend accounts or ban accounts when needed.'],
    ],
  },
  deleteAccount: {
    icon: Trash2,
    title: 'Delete Account',
    eyebrow: 'Account deletion',
    updated: 'Last updated: 2026',
    intro: 'You can request deletion from Account Settings. Public profile data is anonymized and user-created content is hidden or removed where possible.',
    sections: [
      ['What happens immediately', 'Your profile is marked as deleted, personal profile fields are cleared, your content is hidden where possible and you are signed out.'],
      ['Authentication record', 'Deleting the underlying Supabase Auth user requires a server-side service-role process. The app creates a deletion request so an admin/server job can complete the final removal.'],
      ['Before deleting', 'Export or save anything you need. Deletion can remove access to plans, messages, saved spots, photos and profile history.'],
    ],
  },
};

export default function LegalPage({ type }) {
  const page = pages[type] || pages.privacy;
  const Icon = page.icon;
  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#060606] px-4 py-5 text-white">
      <section className="mx-auto max-w-3xl rounded-[32px] border border-white/10 bg-[#101010] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <Link to={createPageUrl('SettingsPage')} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-stone-200">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#efbf3a]/25 bg-[#efbf3a]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#efbf3a]">
              <Icon className="h-3.5 w-3.5" /> {page.eyebrow}
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{page.title}</h1>
            <p className="mt-1 text-sm text-stone-500">{page.updated}</p>
          </div>
        </div>
        <p className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-stone-300">{page.intro}</p>
        <div className="mt-5 space-y-3">
          {page.sections.map(([title, text]) => (
            <article key={title} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <h2 className="text-base font-black text-white">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-stone-400">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
