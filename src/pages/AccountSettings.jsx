import React, { useEffect, useState } from 'react';
import { ArrowLeft, ShieldAlert, Trash2, UserCog } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { readAppSettings, writeAppSettings } from '@/lib/appSettings';
import { useAuth } from '@/lib/AuthContext';

export default function AccountSettings() {
  const [settings, setSettings] = useState(readAppSettings());
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const { deleteAccount, isAuthenticated } = useAuth();

  useEffect(() => {
    writeAppSettings(settings);
  }, [settings]);

  const canDelete = confirmText.trim().toUpperCase() === 'DELETE';

  async function handleDeleteAccount() {
    if (!canDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteAccount();
      toast.success('Account deletion requested.');
    } catch (error) {
      toast.error(error?.message || 'Could not request account deletion.');
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#060606] px-4 py-4 text-white">
      <div className="mx-auto max-w-md space-y-4">
        <section className="rounded-[30px] border border-white/10 bg-[#101010] p-5">
          <div className="mb-6 flex items-center gap-3">
            <Link to={createPageUrl('SettingsPage')} className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-stone-200">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-3xl font-black">Account</h1>
              <p className="text-sm text-stone-500">Session, privacy and deletion.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSettings((prev) => ({ ...prev, account: { ...prev.account, rememberMe: !prev.account.rememberMe } }))}
            className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.04]">
                <UserCog className="h-4 w-4 text-red-400" />
              </div>
              <div className="font-medium text-white">Remember my email on this device</div>
            </div>
            <div className={`h-7 w-12 rounded-full p-1 transition ${settings.account.rememberMe ? 'bg-emerald-500' : 'bg-white/10'}`}>
              <div className={`h-5 w-5 rounded-full bg-white transition ${settings.account.rememberMe ? 'translate-x-5' : ''}`} />
            </div>
          </button>
        </section>

        <section className="rounded-[30px] border border-red-500/25 bg-red-500/8 p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-500/15 text-red-300">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black">Delete account</h2>
              <p className="mt-2 text-sm leading-6 text-stone-400">
                This requests deletion, anonymizes your profile, hides your public content where possible and signs you out.
                Final deletion of the Supabase Auth record must be completed by a secure server-side job/admin process.
              </p>
              <Link to={createPageUrl('DeleteAccount')} className="mt-3 inline-flex text-sm font-bold text-[#efbf3a] underline underline-offset-4">
                Read deletion policy
              </Link>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <label className="block text-xs font-black uppercase tracking-[0.16em] text-stone-500">Type DELETE to confirm</label>
            <input
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder="DELETE"
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-bold text-white outline-none focus:border-red-400"
            />
            <button
              type="button"
              disabled={!isAuthenticated || !canDelete || deleting}
              onClick={handleDeleteAccount}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 text-sm font-black text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> {deleting ? 'Requesting deletion...' : 'Request account deletion'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
