import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell, Cookie, FileText, Globe, Lock, ShieldCheck, Trash2, UserCog } from 'lucide-react';
import { createPageUrl } from '@/utils';

const settings = [
  { icon: Bell, title: 'Notifications', desc: 'Only messages and new joins in your plans.', page: 'NotificationsSettings' },
  { icon: Globe, title: 'Language', desc: 'Keep the public app in English.', page: 'LanguageSettings' },
  { icon: UserCog, title: 'Account', desc: 'Remember-me, security and deletion.', page: 'AccountSettings' },
  { icon: Lock, title: 'Privacy Policy', desc: 'How data, location, photos and profiles are handled.', page: 'Privacy' },
  { icon: FileText, title: 'Terms of Service', desc: 'Rules for using Sozzial responsibly.', page: 'Terms' },
  { icon: Cookie, title: 'Cookie Policy', desc: 'Login sessions, local storage and device preferences.', page: 'Cookies' },
  { icon: ShieldCheck, title: 'Safety Guidelines', desc: 'Meetup safety, reports and moderation basics.', page: 'Safety' },
  { icon: Trash2, title: 'Delete Account', desc: 'How deletion requests are handled.', page: 'DeleteAccount' },
];

export default function SettingsPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#060606] px-4 py-4 text-white">
      <div className="surface-card mx-auto max-w-md rounded-[30px] p-5">
        <div className="mb-6 flex items-center gap-3">
          <Link to={createPageUrl('Profile')} className="interactive-lift grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-stone-200">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-3xl font-black">Settings</h1>
            <p className="text-sm text-stone-500">Only the essentials.</p>
          </div>
        </div>
        <div className="stagger-in space-y-3">
          {settings.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.title} to={createPageUrl(item.page)} className="soft-list-item block rounded-2xl px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/[0.04]">
                    <Icon className="h-4 w-4 text-[#efbf3a]" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-white">{item.title}</div>
                    <div className="mt-1 text-sm leading-6 text-stone-500">{item.desc}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
