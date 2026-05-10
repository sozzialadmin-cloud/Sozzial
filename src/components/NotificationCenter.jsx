import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, MessageCircle, Users, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ZINDEX } from '@/lib/zindex';
import { readAppSettings } from '@/lib/appSettings';

const storageKeyFor = (userId) => `sozzial_notifications_state_${userId}`;

function readNotificationState(userId) {
  if (typeof window === 'undefined' || !userId) return { dismissedIds: [], clearedAt: null, notifiedIds: [] };
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKeyFor(userId)) || 'null');
    return {
      dismissedIds: Array.isArray(parsed?.dismissedIds) ? parsed.dismissedIds : [],
      clearedAt: parsed?.clearedAt || null,
      notifiedIds: Array.isArray(parsed?.notifiedIds) ? parsed.notifiedIds : [],
    };
  } catch {
    return { dismissedIds: [], clearedAt: null, notifiedIds: [] };
  }
}

function writeNotificationState(userId, next) {
  if (typeof window === 'undefined' || !userId) return;
  localStorage.setItem(storageKeyFor(userId), JSON.stringify(next));
}

function NotificationIcon({ type }) {
  if (type === 'message') return <MessageCircle className="w-5 h-5 text-blue-400" />;
  return <Users className="w-5 h-5 text-emerald-400" />;
}

async function fetchNotifications(user) {
  if (!user?.id) return [];
  if (!isSupabaseConfigured || !supabase) return [];
  const settings = readAppSettings();
  const [{ data: joinedRows, error: joinedError }, { data: ownedPlans, error: plansError }] = await Promise.all([
    supabase.from('plan_members').select('plan_id,created_at').eq('user_id', user.id).eq('status', 'joined'),
    supabase.from('plans').select('id,title').eq('created_by', user.id),
  ]);
  if (joinedError || plansError) return [];
  const joinedIds = (joinedRows || []).map((row) => row.plan_id).filter(Boolean);
  const ownedIds = (ownedPlans || []).map((row) => row.id).filter(Boolean);
  const notifications = [];
  if (settings.notifications.messageAlerts && joinedIds.length) {
    const { data: messages, error: messagesError } = await supabase.from('messages').select('id,plan_id,content,created_at,user_id').in('plan_id', joinedIds).neq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
    const { data: plans, error: plansLookupError } = await supabase.from('plans').select('id,title').in('id', joinedIds);
    if (messagesError || plansLookupError) return notifications;
    const planMap = new Map((plans || []).map((plan) => [plan.id, plan.title]));
    (messages || []).forEach((message) => notifications.push({ id: `message-${message.id}`, type: 'message', title: planMap.get(message.plan_id) || 'New group message', description: message.content, created_at: message.created_at }));
  }
  if (settings.notifications.groupAlerts && ownedIds.length) {
    const { data: members, error: membersError } = await supabase.from('plan_members').select('id,plan_id,created_at,user_id').in('plan_id', ownedIds).neq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
    if (membersError) return notifications;
    const planMap = new Map((ownedPlans || []).map((plan) => [plan.id, plan.title]));
    (members || []).forEach((member) => notifications.push({ id: `member-${member.id}`, type: 'group', title: 'New member joined', description: `${planMap.get(member.plan_id) || 'Your plan'} has a new member.`, created_at: member.created_at }));
  }
  return notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20);
}

export default function NotificationCenter({ user }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState([]);
  const [notified, setNotified] = useState([]);
  const [clearedAt, setClearedAt] = useState(null);

  useEffect(() => {
    const state = readNotificationState(user?.id);
    setDismissed(state.dismissedIds);
    setNotified(state.notifiedIds);
    setClearedAt(state.clearedAt);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    writeNotificationState(user.id, { dismissedIds: dismissed, notifiedIds: notified, clearedAt });
  }, [user?.id, dismissed, notified, clearedAt]);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications-supabase', user?.id],
    queryFn: () => fetchNotifications(user),
    refetchInterval: 15000,
    enabled: Boolean(user?.id && isSupabaseConfigured && supabase),
  });

  const visible = useMemo(() => notifications.filter((item) => {
    if (dismissed.includes(item.id)) return false;
    if (clearedAt && new Date(item.created_at).getTime() <= new Date(clearedAt).getTime()) return false;
    return true;
  }), [notifications, dismissed, clearedAt]);

  const unreadCount = visible.length;

  useEffect(() => {
    const settings = readAppSettings();
    if (!settings.notifications.pushEnabled || typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;
    visible.slice(0, 3).forEach((item) => {
      if (notified.includes(item.id)) return;
      new Notification(item.title, { body: item.description });
      setNotified((prev) => [...new Set([...prev, item.id])]);
    });
  }, [visible, notified]);

  if (!user) return null;

  const dismissOne = (id) => setDismissed((prev) => [...new Set([...prev, id])]);
  const clearAll = () => {
    setDismissed([]);
    setNotified([]);
    setClearedAt(new Date().toISOString());
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return <div className="relative" onClick={(e) => e.stopPropagation()}>
    <button onClick={() => setOpen((prev) => !prev)} aria-label="Open notifications" className="relative rounded-2xl p-2 text-stone-400 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 hover:text-white active:scale-95">
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && <span className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
    </button>
    <AnimatePresence>{open && <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/10 backdrop-blur-[1px]" style={{ zIndex: ZINDEX.NOTIFICATION_BACKDROP }} onClick={() => setOpen(false)} />
      <motion.div initial={{ opacity: 0, y: -12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ type: "spring", stiffness: 420, damping: 34 }} className="fixed left-4 right-4 top-[96px] max-h-[75vh] overflow-hidden rounded-[26px] border border-white/10 bg-[#101010] shadow-[0_28px_80px_rgba(0,0,0,0.38)] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80" style={{ zIndex: ZINDEX.NOTIFICATION_POPUP }}>
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-white">Notifications</h3>
              <p className="mt-1 text-xs text-stone-500">Only new messages and joins stay here. Cleared items do not come back.</p>
            </div>
            <button onClick={clearAll} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-stone-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95">Clear all</button>
          </div>
        </div>
        <div className="overflow-y-auto max-h-[60vh]">
          {visible.length === 0 ? <div className="p-6 text-center text-stone-500 text-sm">No new notifications.</div> : <div className="p-2 space-y-1">{visible.map((notification) => <motion.div key={notification.id} layout className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
            <div className="mt-1"><NotificationIcon type={notification.type} /></div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-white truncate">{notification.title}</p>
              <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{notification.description}</p>
            </div>
            <button onClick={() => dismissOne(notification.id)} className="text-stone-600 hover:text-white transition-colors mt-1"><X className="w-4 h-4" /></button>
          </motion.div>)}</div>}
        </div>
      </motion.div>
    </>}</AnimatePresence>
  </div>;
}

