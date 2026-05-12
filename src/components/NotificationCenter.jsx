import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, MessageCircle, UserPlus, Users, X } from 'lucide-react';
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
  if (type === 'message') return <MessageCircle className="h-5 w-5 text-blue-400" />;
  if (type === 'follow') return <UserPlus className="h-5 w-5 text-[#efbf3a]" />;
  return <Users className="h-5 w-5 text-emerald-400" />;
}

async function fetchProfilesById(ids) {
  const cleanIds = [...new Set(ids.filter(Boolean))];
  if (!cleanIds.length) return new Map();
  const { data, error } = await supabase.from('profiles').select('id,username,avatar_url').in('id', cleanIds);
  if (error) return new Map();
  return new Map((data || []).map((profile) => [profile.id, profile]));
}

async function fetchNotifications(user) {
  if (!user?.id) return [];
  if (!isSupabaseConfigured || !supabase) return [];
  const settings = readAppSettings();
  const [{ data: joinedRows, error: joinedError }, { data: ownedPlans, error: plansError }, { data: follows, error: followsError }] = await Promise.all([
    supabase.from('plan_members').select('plan_id,created_at').eq('user_id', user.id).eq('status', 'joined'),
    supabase.from('plans').select('id,title').eq('created_by', user.id),
    supabase.from('profile_follows').select('follower_id,following_id,created_at').eq('following_id', user.id).order('created_at', { ascending: false }).limit(20),
  ]);
  if (joinedError || plansError) return [];
  const joinedIds = (joinedRows || []).map((row) => row.plan_id).filter(Boolean);
  const ownedIds = (ownedPlans || []).map((row) => row.id).filter(Boolean);
  const notifications = [];

  if (settings.notifications.messageAlerts && joinedIds.length) {
    const { data: messages, error: messagesError } = await supabase.from('messages').select('id,plan_id,content,created_at,user_id').in('plan_id', joinedIds).neq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
    const { data: plans, error: plansLookupError } = await supabase.from('plans').select('id,title').in('id', joinedIds);
    if (!messagesError && !plansLookupError) {
      const planMap = new Map((plans || []).map((plan) => [plan.id, plan.title]));
      (messages || []).forEach((message) => notifications.push({
        id: `message-${message.id}`,
        type: 'message',
        title: planMap.get(message.plan_id) || 'New group message',
        description: message.content,
        created_at: message.created_at,
        href: `/mismatches?focus=${message.plan_id}`,
      }));
    }
  }

  if (settings.notifications.groupAlerts && ownedIds.length) {
    const { data: members, error: membersError } = await supabase.from('plan_members').select('id,plan_id,created_at,user_id').in('plan_id', ownedIds).neq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
    if (!membersError) {
      const planMap = new Map((ownedPlans || []).map((plan) => [plan.id, plan.title]));
      (members || []).forEach((member) => notifications.push({
        id: `member-${member.id}`,
        type: 'group',
        title: 'New member joined',
        description: `${planMap.get(member.plan_id) || 'Your plan'} has a new member.`,
        created_at: member.created_at,
        href: `/mismatches?focus=${member.plan_id}`,
      }));
    }
  }

  if (!followsError && settings.notifications.followAlerts !== false) {
    const profileMap = await fetchProfilesById((follows || []).map((follow) => follow.follower_id));
    (follows || []).forEach((follow) => {
      const follower = profileMap.get(follow.follower_id);
      const username = follower?.username ? `@${follower.username}` : 'Someone';
      notifications.push({
        id: `follow-${follow.follower_id}-${follow.created_at}`,
        type: 'follow',
        title: 'New follower',
        description: `${username} started following you.`,
        created_at: follow.created_at,
        href: `/profile/${follow.follower_id}`,
      });
    });
  }

  return notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 30);
}

export default function NotificationCenter({ user }) {
  const navigate = useNavigate();
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

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!user) return null;

  const dismissOne = (id) => setDismissed((prev) => [...new Set([...prev, id])]);
  const openNotification = (notification) => {
    dismissOne(notification.id);
    setOpen(false);
    if (notification.href) navigate(notification.href);
  };
  const clearAll = () => {
    setDismissed([]);
    setNotified([]);
    setClearedAt(new Date().toISOString());
  };

  return <div className="relative" onClick={(e) => e.stopPropagation()}>
    <button onClick={() => setOpen((prev) => !prev)} aria-label="Open notifications" className="relative rounded-2xl p-2 text-stone-400 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 hover:text-white active:scale-95">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
    </button>
    <AnimatePresence>{open && <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/20 backdrop-blur-[2px]" style={{ zIndex: ZINDEX.NOTIFICATION_BACKDROP }} onClick={() => setOpen(false)} />
      <motion.div initial={{ opacity: 0, y: -12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ type: "spring", stiffness: 420, damping: 34 }} className="fixed left-4 right-4 top-[96px] max-h-[75vh] overflow-hidden rounded-[26px] border border-white/10 bg-[#101010] shadow-[0_28px_80px_rgba(0,0,0,0.38)] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80" style={{ zIndex: ZINDEX.NOTIFICATION_POPUP }}>
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-white">Notifications</h3>
              <p className="mt-1 text-xs text-stone-500">Followers, messages and group updates.</p>
            </div>
            <button onClick={clearAll} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-stone-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95">Clear all</button>
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {visible.length === 0 ? <div className="p-6 text-center text-sm text-stone-500">No new notifications.</div> : <div className="space-y-1 p-2">{visible.map((notification) => (
            <motion.div key={notification.id} layout className="group flex items-start gap-2 rounded-xl p-1 transition-colors hover:bg-white/5">
              <button type="button" onClick={() => openNotification(notification)} className="flex min-w-0 flex-1 items-start gap-3 rounded-xl p-2 text-left">
                <div className="mt-1"><NotificationIcon type={notification.type} /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{notification.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{notification.description}</p>
                </div>
              </button>
              <button onClick={(event) => { event.stopPropagation(); dismissOne(notification.id); }} className="mt-3 text-stone-600 transition-colors hover:text-white"><X className="h-4 w-4" /></button>
            </motion.div>
          ))}</div>}
        </div>
      </motion.div>
    </>}</AnimatePresence>
  </div>;
}
