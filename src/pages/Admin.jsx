import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Database,
  Download,
  Eye,
  EyeOff,
  Filter,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessageSquare,
  Pencil,
  Pizza,
  Search,
  Settings2,
  Shield,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserCog,
  Users,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { formatPrice } from '@/lib/place-helpers';
import { cn } from '@/lib/utils';
import { getPublicUsername, getAvatarLetter } from '@/lib/display-name';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Sparkles },
  { id: 'spots', label: 'Spots', icon: Pizza },
  { id: 'plans', label: 'Plans', icon: CalendarDays },
  { id: 'reports', label: 'Reports', icon: ShieldAlert },
  { id: 'users', label: 'Users', icon: UserCog },
  { id: 'messages', label: 'Chat', icon: MessageSquare },
  { id: 'photos', label: 'Photos', icon: ImageIcon },
  { id: 'operations', label: 'Operations', icon: Database },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

const SPOT_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'hidden', label: 'Hidden' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'no-photo', label: 'No photo' },
  { id: 'broken-photo', label: 'Broken photo' },
  { id: 'duplicates', label: 'Likely duplicates' },
  { id: 'low-quality', label: 'Low data' },
  { id: 'reported', label: 'Most reported' },
  { id: 'top-rated', label: 'Top rated' },
  { id: 'recent', label: 'Recent' },
];

const PLAN_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'past', label: 'Past' },
  { id: 'full', label: 'Full' },
  { id: 'empty', label: 'Empty' },
  { id: 'reported', label: 'Reported' },
  { id: 'today', label: 'Created today' },
  { id: 'invalid-spot', label: 'Invalid spot' },
  { id: 'suspicious', label: 'Suspicious' },
  { id: 'cancelled', label: 'Cancelled' },
];

const USER_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'admin', label: 'Admin' },
  { id: 'active', label: 'Active' },
  { id: 'new', label: 'New' },
  { id: 'reported', label: 'Reported' },
  { id: 'warned', label: 'Warned' },
  { id: 'banned', label: 'Banned' },
  { id: 'inactive', label: 'Inactive' },
];

const suspiciousTerms = [
  'spam',
  'telegram',
  'whatsapp',
  'sex',
  'escort',
  'apuesta',
  'casino',
  'free money',
  'link',
  'http',
  'www',
  'xxx',
];

function AdminActionButton({ onClick, children, variant = 'neutral', disabled = false }) {
  const variants = {
    neutral: 'bg-white text-[#141414] border-black/10 hover:bg-[#f5ecdf]',
    success: 'bg-[#216b33] text-white border-[#216b33] hover:bg-[#195127]',
    warn: 'bg-[#efbf3a] text-[#141414] border-[#efbf3a] hover:bg-[#e2b229]',
    danger: 'bg-[#df5b43] text-white border-[#df5b43] hover:bg-[#c74e39]',
    dark: 'bg-[#141414] text-white border-[#141414] hover:bg-[#232323]',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'premium-press inline-flex h-10 items-center justify-center rounded-2xl border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
      )}
    >
      {children}
    </button>
  );
}

function StatusPill({ tone = 'neutral', children }) {
  const tones = {
    success: 'bg-[#e6f5e8] text-[#216b33] border-[#cfead4]',
    warn: 'bg-[#fff4d4] text-[#7a5a00] border-[#f1dd9a]',
    danger: 'bg-[#fde8e4] text-[#a03f2d] border-[#f0c3b7]',
    dark: 'bg-[#141414] text-white border-[#141414]',
    neutral: 'bg-[#f3ecdf] text-[#5f584d] border-black/10',
    info: 'bg-[#eef5ff] text-[#325f92] border-[#d7e5f8]',
  };

  return <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em]', tones[tone])}>{children}</span>;
}

function StatCard({ label, value, note, icon: Icon, accent = 'text-[#df5b43]' }) {
  return (
    <div className="premium-motion-card rounded-[28px] border border-black/10 bg-[#fffaf1] px-5 py-5 shadow-[0_20px_45px_rgba(34,25,11,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8a8174]">{label}</div>
          <div className="mt-3 text-4xl font-black tracking-[-0.05em] text-[#111111]">{value}</div>
          {note ? <div className="mt-2 text-sm text-[#6d665b]">{note}</div> : null}
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-[0_10px_24px_rgba(34,25,11,0.08)]">
          <Icon className={cn('h-5 w-5', accent)} />
        </div>
      </div>
    </div>
  );
}

function Shell({ title, subtitle, actions, children }) {
  return (
    <section className="premium-motion-card rounded-[30px] border border-black/10 bg-[#fffaf1] p-5 shadow-[0_22px_50px_rgba(34,25,11,0.08)]">
      <div className="flex flex-col gap-4 border-b border-black/8 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-[1.4rem] font-black tracking-[-0.04em] text-[#111111]">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-[#6d665b]">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="grid min-h-[220px] place-items-center rounded-[28px] border border-dashed border-black/10 bg-[#fbf6ed] px-6 py-10 text-center">
      <div>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-[0_12px_26px_rgba(34,25,11,0.08)]">
          <Icon className="h-6 w-6 text-[#216b33]" />
        </div>
        <h3 className="mt-4 text-xl font-black text-[#111111]">{title}</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-[#6d665b]">{text}</p>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold transition',
        active ? 'border-[#141414] bg-[#141414] text-white' : 'border-black/10 bg-white text-[#5d574d] hover:bg-[#f3ecdf]',
      )}
    >
      {children}
    </button>
  );
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function formatDateOnly(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString([], { dateStyle: 'medium' });
}

function toTs(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function normalizedText(...parts) {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactName(value = '') {
  return normalizedText(value)
    .replace(/\b(pizza|pizzeria|slice|shop|nyc|new york|manhattan|brooklyn|queens)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactAddress(value = '') {
  return normalizedText(value)
    .replace(/\b(street|st|avenue|ave|road|rd|boulevard|blvd|new york|ny|usa|estados unidos)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function distanceMeters(a, b) {
  if (!a || !b || typeof a.lat !== 'number' || typeof a.lng !== 'number' || typeof b.lat !== 'number' || typeof b.lng !== 'number') return Infinity;
  const dx = (a.lat - b.lat) * 111320;
  const dy = (a.lng - b.lng) * 40075000 * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180) / 360;
  return Math.sqrt(dx * dx + dy * dy);
}

function isSuspiciousText(text = '') {
  const normalized = normalizedText(text);
  if (!normalized) return false;
  if (suspiciousTerms.some((term) => normalized.includes(term))) return true;
  if (/(.)\1{4,}/.test(normalized)) return true;
  return false;
}

async function safeFetchRows(table, select = '*', options = {}) {
  try {
    let query = supabase.from(table).select(select);
    if (options.orderBy) query = query.order(options.orderBy, { ascending: options.ascending ?? false });
    if (options.limit) query = query.limit(options.limit);
    const { data, error } = await query;
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}


async function safeRpcRows(fnName) {
  try {
    const { data, error } = await supabase.rpc(fnName);
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

async function updateRow(table, id, payload) {
  const { error } = await supabase.from(table).update(payload).eq('id', id);
  if (error) throw error;
}

function useAdminData(enabled) {
  return useQuery({
    queryKey: ['admin-dashboard-v2'],
    enabled,
    queryFn: async () => {
      const [
        spotsRes,
        plansRes,
        profilesRes,
        membersRes,
        messagesRes,
        ratingsRes,
        commentsRes,
        photosRes,
        dashboardStatsRes,
        attentionNowRes,
      ] = await Promise.all([
        safeFetchRows('spots', 'id,name,address,lat,lng,slice_price,best_slice,quick_note,photo_url,status,created_by,reviewed_by,reviewed_at,created_at,updated_at,average_rating,ratings_count', { orderBy: 'created_at' }),
        safeFetchRows('plans', 'id,spot_id,title,plan_date,plan_time,max_people,quick_note,status,created_by,created_at,updated_at', { orderBy: 'created_at' }),
        safeFetchRows('profiles', '*', { orderBy: 'created_at' }),
        safeFetchRows('plan_members', 'id,plan_id,user_id,status,created_at', { orderBy: 'created_at' }),
        safeFetchRows('messages', 'id,plan_id,user_id,content,created_at', { orderBy: 'created_at' }),
        safeFetchRows('spot_ratings', 'id,spot_id,user_id,rating,created_at,updated_at', { orderBy: 'updated_at' }),
        safeFetchRows('spot_comments', 'id,spot_id,user_id,content,status,created_at,updated_at,reviewed_by,reviewed_at', { orderBy: 'created_at' }),
        safeFetchRows('spot_photos', 'id,spot_id,user_id,photo_url,status,created_at,updated_at,reviewed_by,reviewed_at', { orderBy: 'created_at' }),
        safeRpcRows('admin_get_dashboard_stats'),
        safeRpcRows('admin_get_attention_now'),
      ]);

      return {
        spots: spotsRes.data,
        plans: plansRes.data,
        users: profilesRes.data,
        members: membersRes.data,
        messages: messagesRes.data,
        ratings: ratingsRes.data,
        comments: commentsRes.data,
        photos: photosRes.data,
        dashboardStats: dashboardStatsRes.data,
        attentionNow: attentionNowRes.data,
        diagnostics: [
          { table: 'spot_comments', available: !commentsRes.error, error: commentsRes.error?.message || null },
          { table: 'spot_photos', available: !photosRes.error, error: photosRes.error?.message || null },
        ],
      };
    },
  });
}

function DetailMetric({ label, value, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-white',
    warn: 'bg-[#fff4d4]',
    success: 'bg-[#eaf6ec]',
    danger: 'bg-[#fde8e4]',
  };
  return (
    <div className={cn('rounded-[20px] border border-black/8 px-4 py-3', tones[tone])}>
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a8174]">{label}</div>
      <div className="mt-1 text-lg font-black leading-tight text-[#111111]">{value}</div>
    </div>
  );
}

function QueueItem({ title, subtitle, tone = 'warn', actionLabel, onAction }) {
  return (
    <div className="rounded-[22px] border border-black/8 bg-white px-4 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <StatusPill tone={tone}>{tone === 'danger' ? 'urgent' : tone === 'warn' ? 'review' : 'info'}</StatusPill>
            <div className="text-base font-black text-[#111111]">{title}</div>
          </div>
          <div className="mt-2 text-sm text-[#6d665b]">{subtitle}</div>
        </div>
        {actionLabel ? (
          <AdminActionButton variant="neutral" onClick={onAction}>
            {actionLabel}
          </AdminActionButton>
        ) : null}
      </div>
    </div>
  );
}

function ActionBlock({ icon: Icon, title, text, cta, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-[26px] border border-black/10 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:bg-[#fff8ed] hover:shadow-[0_18px_40px_rgba(34,25,11,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#141414] text-[#efbf3a]">
          <Icon className="h-5 w-5" />
        </div>
        <ChevronRight className="h-5 w-5 text-[#8a8174] transition group-hover:translate-x-1" />
      </div>
      <div className="mt-4 text-lg font-black text-[#111111]">{title}</div>
      <div className="mt-1 text-sm leading-6 text-[#6d665b]">{text}</div>
      <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#141414]">{cta}<ArrowRight className="h-4 w-4" /></div>
    </button>
  );
}

function downloadCsv(filename, rows) {
  const safeRows = rows || [];
  const columns = Array.from(new Set(safeRows.flatMap((row) => Object.keys(row || {})))).slice(0, 40);
  const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
  const csv = [columns.join(','), ...safeRows.map((row) => columns.map((column) => escapeCell(row[column])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Admin() {
  const { role, user, profile } = useAuth();
  const enabled = role === 'admin' && isSupabaseConfigured && Boolean(supabase);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState('overview');
  const [search, setSearch] = React.useState('');
  const [spotFilter, setSpotFilter] = React.useState('all');
  const [planFilter, setPlanFilter] = React.useState('all');
  const [userFilter, setUserFilter] = React.useState('all');
  const [selectedSpotId, setSelectedSpotId] = React.useState(null);
  const [selectedPlanId, setSelectedPlanId] = React.useState(null);
  const [selectedUserId, setSelectedUserId] = React.useState(null);

  const { data, isLoading } = useAdminData(enabled);

  const spots = data?.spots || [];
  const plans = data?.plans || [];
  const users = data?.users || [];
  const members = data?.members || [];
  const messages = data?.messages || [];
  const ratings = data?.ratings || [];
  const comments = data?.comments || [];
  const photos = data?.photos || [];
  const diagnostics = data?.diagnostics || [];
  const dashboardStatsRow = data?.dashboardStats?.[0] || null;
  const attentionNowRows = data?.attentionNow || [];
  const profileCompleteness = React.useMemo(() => {
    if (!users.length) return { complete: 0, missingBio: 0, missingAvatar: 0, missingFavorite: 0, score: 0 };
    const complete = users.filter((person) => person.bio && person.avatar_url && person.favorite_spot_id).length;
    return {
      complete,
      missingBio: users.filter((person) => !person.bio).length,
      missingAvatar: users.filter((person) => !person.avatar_url).length,
      missingFavorite: users.filter((person) => !person.favorite_spot_id).length,
      score: Math.round((complete / users.length) * 100),
    };
  }, [users]);

  const userMap = React.useMemo(() => new Map(users.map((item) => [item.id, item])), [users]);
  const spotMap = React.useMemo(() => new Map(spots.map((item) => [item.id, item])), [spots]);
  const planMap = React.useMemo(() => new Map(plans.map((item) => [item.id, item])), [plans]);

  const memberCountMap = React.useMemo(() => {
    const map = new Map();
    members.forEach((row) => {
      if (row.status !== 'joined') return;
      map.set(row.plan_id, (map.get(row.plan_id) || 0) + 1);
    });
    return map;
  }, [members]);

  const userJoinedCountMap = React.useMemo(() => {
    const map = new Map();
    members.forEach((row) => {
      if (row.status !== 'joined') return;
      map.set(row.user_id, (map.get(row.user_id) || 0) + 1);
    });
    return map;
  }, [members]);

  const userSpotCountMap = React.useMemo(() => {
    const map = new Map();
    spots.forEach((row) => map.set(row.created_by, (map.get(row.created_by) || 0) + 1));
    return map;
  }, [spots]);

  const userPlanCountMap = React.useMemo(() => {
    const map = new Map();
    plans.forEach((row) => map.set(row.created_by, (map.get(row.created_by) || 0) + 1));
    return map;
  }, [plans]);

  const userMessageCountMap = React.useMemo(() => {
    const map = new Map();
    messages.forEach((row) => map.set(row.user_id, (map.get(row.user_id) || 0) + 1));
    return map;
  }, [messages]);

  const ratingHistoryMap = React.useMemo(() => {
    const map = new Map();
    ratings.forEach((row) => {
      const list = map.get(row.spot_id) || [];
      list.push(row);
      map.set(row.spot_id, list);
    });
    return map;
  }, [ratings]);

  const duplicatePairs = React.useMemo(() => {
    const pairs = [];
    for (let i = 0; i < spots.length; i += 1) {
      for (let j = i + 1; j < spots.length; j += 1) {
        const a = spots[i];
        const b = spots[j];
        const closeEnough = distanceMeters(a, b) < 160;
        const sameCoreName = compactName(a.name) && compactName(a.name) === compactName(b.name);
        const sameAddressCore = compactAddress(a.address) && compactAddress(a.address) === compactAddress(b.address);
        if ((sameCoreName && closeEnough) || (sameCoreName && sameAddressCore) || (sameAddressCore && closeEnough)) {
          pairs.push({ a, b, distance: Math.round(distanceMeters(a, b)) });
        }
      }
    }
    return pairs;
  }, [spots]);

  const duplicateSpotIds = React.useMemo(() => new Set(duplicatePairs.flatMap((pair) => [pair.a.id, pair.b.id])), [duplicatePairs]);

  const suspiciousMessages = React.useMemo(() => messages.filter((row) => isSuspiciousText(row.content)), [messages]);
  const suspiciousPlans = React.useMemo(() => plans.filter((row) => isSuspiciousText(row.title) || isSuspiciousText(row.quick_note)), [plans]);

  const todayStart = React.useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.getTime();
  }, []);
  const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;
  const nowTs = Date.now();

  const usersToday = users.filter((row) => (toTs(row.created_at) || 0) >= todayStart);
  const usersWeek = users.filter((row) => (toTs(row.created_at) || 0) >= weekStart);
  const activePlans = plans.filter((row) => row.status === 'active');
  const pendingSpots = spots.filter((row) => row.status === 'pending');
  const hiddenSpots = spots.filter((row) => row.status === 'hidden');
  const approvedSpots = spots.filter((row) => row.status === 'approved');
  const rejectedSpots = spots.filter((row) => row.status === 'rejected');
  const pendingPhotos = photos.filter((row) => row.status === 'pending');
  const pendingComments = comments.filter((row) => row.status === 'pending');

  const openReports = React.useMemo(() => {
    const items = [];

    approvedSpots.forEach((spot) => {
      if (!spot.photo_url) {
        items.push({
          id: `spot-no-photo-${spot.id}`,
          type: 'spot',
          severity: 'warn',
          label: 'Approved spot without photo',
          entityTitle: spot.name,
          entityId: spot.id,
          subtitle: 'It is public without a main photo.',
          createdAt: spot.updated_at || spot.created_at,
        });
      }
    });

    suspiciousPlans.forEach((plan) => {
      items.push({
        id: `plan-suspicious-${plan.id}`,
        type: 'plan',
        severity: 'danger',
        label: 'Plan with suspicious description',
        entityTitle: plan.title,
        entityId: plan.id,
        subtitle: plan.quick_note || 'The text looks like spam or abuse.',
        createdAt: plan.updated_at || plan.created_at,
      });
    });

    suspiciousMessages.forEach((message) => {
      const linkedPlan = planMap.get(message.plan_id);
      items.push({
        id: `message-report-${message.id}`,
        type: 'message',
        severity: 'danger',
        label: 'Group with problematic messages',
        entityTitle: linkedPlan?.title || 'Plan',
        entityId: message.id,
        subtitle: message.content,
        createdAt: message.created_at,
      });
    });

    const reportedUserIds = new Map();
    suspiciousMessages.forEach((row) => {
      reportedUserIds.set(row.user_id, (reportedUserIds.get(row.user_id) || 0) + 1);
    });
    suspiciousPlans.forEach((row) => {
      reportedUserIds.set(row.created_by, (reportedUserIds.get(row.created_by) || 0) + 1);
    });

    users.forEach((person) => {
      const count = reportedUserIds.get(person.id) || 0;
      if (count >= 3) {
        items.push({
          id: `user-reported-${person.id}`,
          type: 'user',
          severity: 'danger',
          label: 'User reported 3 times',
          entityTitle: getPublicUsername(person),
          entityId: person.id,
          subtitle: `There are ${count} risk signals in recent activity.`,
          createdAt: person.updated_at || person.created_at,
        });
      }
    });

    duplicatePairs.forEach((pair, index) => {
      items.push({
        id: `duplicate-${index}`,
        type: 'spot',
        severity: 'warn',
        label: 'Likely duplicate spot',
        entityTitle: `${pair.a.name} / ${pair.b.name}`,
        entityId: pair.a.id,
        subtitle: `Name/address match and ${pair.distance} m apart.`,
        createdAt: pair.a.updated_at || pair.a.created_at,
      });
    });

    return items.sort((a, b) => (toTs(b.createdAt) || 0) - (toTs(a.createdAt) || 0));
  }, [approvedSpots, suspiciousPlans, suspiciousMessages, users, duplicatePairs, planMap]);

  const urgentItems = openReports.filter((item) => item.severity === 'danger');

  const overviewStats = {
    pendingSpots: dashboardStatsRow?.pending_spots ?? pendingSpots.length,
    activePlans: dashboardStatsRow?.active_plans ?? activePlans.length,
    openReports: dashboardStatsRow?.open_reports ?? openReports.length,
    reportedMessages: dashboardStatsRow?.reported_messages ?? suspiciousMessages.length,
    pendingPhotos: dashboardStatsRow?.pending_photos ?? pendingPhotos.length,
    newUsersToday: dashboardStatsRow?.new_users_today ?? usersToday.length,
    newUsersWeek: dashboardStatsRow?.new_users_week ?? usersWeek.length,
    urgentItems: dashboardStatsRow?.urgent_items ?? urgentItems.length,
  };

  const attentionQueue = attentionNowRows.length
    ? attentionNowRows.map((item, index) => ({
        id: `${item.entity_type || 'item'}-${item.entity_id || index}`,
        type: item.entity_type || 'report',
        severity: item.priority === 'high' ? 'danger' : 'warn',
        label: String(item.issue_type || 'review').replace(/_/g, ' '),
        entityTitle: item.title || 'Item',
        entityId: item.entity_id || null,
        subtitle: item.subtitle || '',
        createdAt: item.created_at || null,
      }))
    : openReports;

  const normalizedSearch = search.trim().toLowerCase();
  const includesSearch = React.useCallback((...values) => {
    if (!normalizedSearch) return true;
    return normalizedText(...values).includes(normalizedSearch);
  }, [normalizedSearch]);

  const spotRows = React.useMemo(() => {
    let rows = [...spots].map((spot) => ({
      ...spot,
      isDuplicate: duplicateSpotIds.has(spot.id),
      isBrokenPhoto: Boolean(spot.photo_url && !/^https?:\/\//.test(spot.photo_url) && !spot.photo_url.startsWith('/')),
      qualityScore: [spot.name, spot.address, spot.best_slice, spot.quick_note, spot.photo_url].filter(Boolean).length,
      reportCount: openReports.filter((item) => item.type === 'spot' && item.entityId === spot.id).length,
    }));

    if (spotFilter === 'pending') rows = rows.filter((row) => row.status === 'pending');
    if (spotFilter === 'approved') rows = rows.filter((row) => row.status === 'approved');
    if (spotFilter === 'hidden') rows = rows.filter((row) => row.status === 'hidden');
    if (spotFilter === 'rejected') rows = rows.filter((row) => row.status === 'rejected');
    if (spotFilter === 'no-photo') rows = rows.filter((row) => !row.photo_url);
    if (spotFilter === 'broken-photo') rows = rows.filter((row) => row.isBrokenPhoto);
    if (spotFilter === 'duplicates') rows = rows.filter((row) => row.isDuplicate);
    if (spotFilter === 'low-quality') rows = rows.filter((row) => row.qualityScore <= 3);
    if (spotFilter === 'reported') rows = rows.filter((row) => row.reportCount > 0).sort((a, b) => b.reportCount - a.reportCount);
    if (spotFilter === 'top-rated') rows = rows.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    if (spotFilter === 'recent') rows = rows.sort((a, b) => (toTs(b.created_at) || 0) - (toTs(a.created_at) || 0));

    rows = rows.filter((row) => includesSearch(row.name, row.address, row.best_slice, row.quick_note));
    return rows;
  }, [spots, duplicateSpotIds, openReports, spotFilter, includesSearch]);

  const planRows = React.useMemo(() => {
    let rows = [...plans].map((plan) => {
      const joinedCount = memberCountMap.get(plan.id) || 0;
      const planDateTime = new Date(`${plan.plan_date || ''}T${plan.plan_time || '00:00'}`);
      const hasValidSpot = Boolean(spotMap.get(plan.spot_id));
      const reportCount = openReports.filter((item) => item.type === 'plan' && item.entityId === plan.id).length;
      return {
        ...plan,
        joinedCount,
        hasValidSpot,
        seatsOver: joinedCount > (plan.max_people || 0),
        isPast: !Number.isNaN(planDateTime.getTime()) && planDateTime.getTime() < nowTs,
        isSuspicious: isSuspiciousText(plan.title) || isSuspiciousText(plan.quick_note),
        reportCount,
      };
    });

    if (planFilter === 'active') rows = rows.filter((row) => row.status === 'active');
    if (planFilter === 'past') rows = rows.filter((row) => row.isPast);
    if (planFilter === 'full') rows = rows.filter((row) => row.joinedCount >= (row.max_people || 0));
    if (planFilter === 'empty') rows = rows.filter((row) => row.joinedCount === 0);
    if (planFilter === 'reported') rows = rows.filter((row) => row.reportCount > 0 || row.isSuspicious);
    if (planFilter === 'today') rows = rows.filter((row) => (toTs(row.created_at) || 0) >= todayStart);
    if (planFilter === 'invalid-spot') rows = rows.filter((row) => !row.hasValidSpot);
    if (planFilter === 'suspicious') rows = rows.filter((row) => row.isSuspicious || row.seatsOver);
    if (planFilter === 'cancelled') rows = rows.filter((row) => row.status === 'cancelled');

    rows = rows.filter((row) => includesSearch(row.title, row.quick_note, row.status, spotMap.get(row.spot_id)?.name));
    return rows;
  }, [plans, memberCountMap, spotMap, openReports, planFilter, includesSearch, nowTs, todayStart]);

  const userRows = React.useMemo(() => {
    let rows = users.map((person) => {
      const signals = openReports.filter((item) => item.type === 'user' && item.entityId === person.id).length;
      const totalActivity = (userSpotCountMap.get(person.id) || 0) + (userPlanCountMap.get(person.id) || 0) + (userMessageCountMap.get(person.id) || 0);
      const roleLabel = person.role || 'user';
      let state = 'active';
      if (signals >= 3) state = 'banned';
      else if (signals > 0) state = 'warned';
      else if (totalActivity === 0) state = 'inactive';
      return {
        ...person,
        spotsCount: userSpotCountMap.get(person.id) || 0,
        plansCount: userPlanCountMap.get(person.id) || 0,
        groupsJoined: userJoinedCountMap.get(person.id) || 0,
        reportsCount: signals,
        state,
        totalActivity,
        roleLabel,
      };
    });

    if (userFilter === 'admin') rows = rows.filter((row) => row.role === 'admin');
    if (userFilter === 'active') rows = rows.filter((row) => row.state === 'active');
    if (userFilter === 'new') rows = rows.filter((row) => (toTs(row.created_at) || 0) >= weekStart);
    if (userFilter === 'reported') rows = rows.filter((row) => row.reportsCount > 0);
    if (userFilter === 'warned') rows = rows.filter((row) => row.state === 'warned');
    if (userFilter === 'banned') rows = rows.filter((row) => row.state === 'banned');
    if (userFilter === 'inactive') rows = rows.filter((row) => row.state === 'inactive');

    rows = rows.filter((row) => includesSearch(row.email, row.username, row.role, row.state));
    return rows;
  }, [users, openReports, userSpotCountMap, userPlanCountMap, userMessageCountMap, userJoinedCountMap, userFilter, includesSearch, weekStart]);

  const selectedSpot = spotRows.find((row) => row.id === selectedSpotId) || spotRows[0] || null;
  const selectedPlan = planRows.find((row) => row.id === selectedPlanId) || planRows[0] || null;
  const selectedUser = userRows.find((row) => row.id === selectedUserId) || userRows[0] || null;

  React.useEffect(() => {
    if (!selectedSpotId && spotRows[0]?.id) setSelectedSpotId(spotRows[0].id);
  }, [selectedSpotId, spotRows]);
  React.useEffect(() => {
    if (!selectedPlanId && planRows[0]?.id) setSelectedPlanId(planRows[0].id);
  }, [selectedPlanId, planRows]);
  React.useEffect(() => {
    if (!selectedUserId && userRows[0]?.id) setSelectedUserId(userRows[0].id);
  }, [selectedUserId, userRows]);

  const invalidateAll = React.useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-dashboard-v2'] });
  }, [queryClient]);

  const spotMutation = useMutation({
    mutationFn: ({ id, payload }) => updateRow('spots', id, payload),
    onSuccess: invalidateAll,
  });
  const planMutation = useMutation({
    mutationFn: ({ id, payload }) => updateRow('plans', id, payload),
    onSuccess: invalidateAll,
  });
  const userMutation = useMutation({
    mutationFn: ({ id, payload }) => updateRow('profiles', id, payload),
    onSuccess: invalidateAll,
  });
  const messageMutation = useMutation({
    mutationFn: ({ id, payload }) => updateRow('messages', id, payload),
    onSuccess: invalidateAll,
  });
  const photoMutation = useMutation({
    mutationFn: ({ id, payload }) => updateRow('spot_photos', id, payload),
    onSuccess: invalidateAll,
  });
  const deleteMutation = useMutation({
    mutationFn: ({ table, id }) => deleteRow(table, id),
    onSuccess: invalidateAll,
  });

  const moderationPayload = React.useCallback((status) => ({
    status,
    reviewed_by: profile?.id || user?.id || null,
    reviewed_at: new Date().toISOString(),
  }), [profile?.id, user?.id]);

  if (!enabled) {
    return (
      <div className="grid min-h-[calc(100vh-64px)] place-items-center bg-[#f4efe6] px-4 py-6">
        <div className="rounded-[28px] border border-black/10 bg-[#fffaf1] px-6 py-10 text-center shadow-[0_24px_60px_rgba(34,25,11,0.12)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#111111] text-[#f0bf39]"><Shield className="h-6 w-6" /></div>
          <h1 className="text-2xl font-black text-[#111111]">Administrators only</h1>
          <p className="mt-2 text-sm text-[#6d665b]">You need a profile with role = admin to access this area.</p>
        </div>
      </div>
    );
  }

  const goTo = (tab, filters = {}) => {
    setActiveTab(tab);
    if (filters.spotFilter) setSpotFilter(filters.spotFilter);
    if (filters.planFilter) setPlanFilter(filters.planFilter);
    if (filters.userFilter) setUserFilter(filters.userFilter);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f4efe6] px-3 py-3 text-[#111111] sm:px-4 md:px-5">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="rounded-[34px] border border-black/10 bg-[linear-gradient(180deg,#fffaf1_0%,#f7efe4_100%)] px-5 py-6 shadow-[0_24px_60px_rgba(34,25,11,0.10)] md:px-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#216b33]">
                <Sparkles className="h-3.5 w-3.5" /> operations command
              </div>
              <h1 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-black leading-none tracking-[-0.06em]">Admin Sozzial</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#6d665b]">
                A dashboard built for fast decisions: pending spots, active plans, risk signals, new users, problematic messages and content that needs moderation.
              </p>
            </div>
            <div className="grid gap-3 rounded-[28px] border border-black/10 bg-white px-5 py-4 shadow-[0_18px_40px_rgba(39,29,14,0.08)] sm:grid-cols-2">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8a8174]">Current session</div>
                <div className="mt-2 text-base font-bold text-[#111111]">{user?.email}</div>
                <div className="mt-1 text-sm text-[#6d665b]">Role: {role}</div>
              </div>
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8a8174]">Urgency</div>
                <div className="mt-2 text-base font-bold text-[#111111]">{overviewStats.urgentItems ? `${overviewStats.urgentItems} critical alerts` : 'No critical alerts'}</div>
                <div className="mt-1 text-sm text-[#6d665b]">Today: {overviewStats.newUsersToday} new users</div>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Pending spots" value={overviewStats.pendingSpots} note="Waiting for review" icon={Pizza} accent="text-[#df5b43]" />
          <StatCard label="Active plans" value={overviewStats.activePlans} note="Ongoing or upcoming" icon={CalendarDays} accent="text-[#216b33]" />
          <StatCard label="Open reports" value={overviewStats.openReports} note={overviewStats.urgentItems ? `${overviewStats.urgentItems} urgent` : 'No urgent items'} icon={ShieldAlert} accent="text-[#df5b43]" />
          <StatCard label="New users" value={overviewStats.newUsersToday} note={`${overviewStats.newUsersWeek} this week`} icon={Users} accent="text-[#111111]" />
          <StatCard label="Reported messages" value={overviewStats.reportedMessages} note="Automatic signals" icon={MessageSquare} accent="text-[#df5b43]" />
          <StatCard label="Pending photos" value={overviewStats.pendingPhotos} note="Waiting for approval" icon={Camera} accent="text-[#216b33]" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
          <section className="attention-glow rounded-[30px] border border-black/10 bg-[#141414] p-5 text-white shadow-[0_24px_70px_rgba(17,17,17,0.18)]">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#f0bf39]">
                  <ShieldAlert className="h-3.5 w-3.5" /> live command center
                </div>
                <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">Moderation queue ready for scale</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-white/65">
                  Focus on risk first: pending spots, reports, suspicious text, missing media and accounts that need review.
                </p>
              </div>
              <div className="grid min-w-[220px] gap-2">
                <button type="button" onClick={() => goTo('reports')} className="premium-press inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#efbf3a] px-4 text-sm font-black text-[#141414]">
                  Review alerts <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => goTo('operations')} className="premium-press inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-bold text-white">
                  Open operations
                </button>
              </div>
            </div>
          </section>

          <section className="premium-motion-card rounded-[30px] border border-black/10 bg-[#fffaf1] p-5 shadow-[0_22px_50px_rgba(34,25,11,0.08)]">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8a8174]">System health</div>
            <div className="mt-4 grid gap-3">
              <DetailMetric label="Data tables online" value={`${diagnostics.filter((item) => item.available).length}/${diagnostics.length}`} tone={diagnostics.every((item) => item.available) ? 'success' : 'warn'} />
              <DetailMetric label="Priority queue" value={attentionQueue.length} tone={attentionQueue.length ? 'warn' : 'success'} />
              <DetailMetric label="Profile health" value={`${profileCompleteness.score}%`} tone={profileCompleteness.score > 60 ? 'success' : 'warn'} />
            </div>
          </section>
        </div>

        <div className="sticky top-[72px] z-20 rounded-[26px] border border-black/10 bg-[#fffaf1]/95 p-3 shadow-[0_20px_50px_rgba(34,25,11,0.10)] backdrop-blur sm:rounded-[30px] sm:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    'inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl px-4 text-sm font-bold transition',
                    activeTab === id ? 'bg-[#141414] text-white shadow-[0_12px_32px_rgba(17,17,17,0.18)]' : 'bg-[#f0e8dc] text-[#5d574d] hover:bg-[#eadfcc]',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
            <div className="flex w-full flex-col gap-3 md:flex-row xl:w-auto">
              <div className="relative w-full md:w-[360px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8174]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search spot, user, plan, address or message"
                  className="h-11 w-full rounded-2xl border border-black/10 bg-white pl-11 pr-4 text-sm text-[#111111] outline-none transition focus:border-[#efbf3a]"
                />
              </div>
              <button type="button" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 text-sm font-semibold text-[#141414]">
                <Filter className="h-4 w-4" /> Saved filters
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid min-h-[320px] place-items-center rounded-[30px] border border-black/10 bg-[#fffaf1]">
            <Loader2 className="h-8 w-8 animate-spin text-[#111111]" />
          </div>
        ) : null}

        {!isLoading && activeTab === 'overview' ? (
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
              <ActionBlock icon={Pizza} title="Review pending spots" text={`${overviewStats.pendingSpots} waiting for approval or rejection.`} cta="Open spots" onClick={() => goTo('spots', { spotFilter: 'pending' })} />
              <ActionBlock icon={CalendarDays} title="Review recent plans" text={`${overviewStats.activePlans} active plans and ${plans.filter((row) => (toTs(row.created_at) || 0) >= todayStart).length} created today.`} cta="Open plans" onClick={() => goTo('plans', { planFilter: 'today' })} />
              <ActionBlock icon={ShieldAlert} title="Review urgent reports" text={`${overviewStats.urgentItems} strong risk signals right now.`} cta="Go to reports" onClick={() => goTo('reports')} />
              <ActionBlock icon={AlertTriangle} title="Review suspicious activity" text={`${suspiciousMessages.length + suspiciousPlans.length} texts flagged by heuristics.`} cta="Open chat" onClick={() => goTo('messages')} />
              <ActionBlock icon={UserCog} title="Go to users" text={`${overviewStats.newUsersToday} signups today and ${overviewStats.newUsersWeek} in the last week.`} cta="Open users" onClick={() => goTo('users', { userFilter: 'new' })} />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.2fr,0.8fr]">
              <Shell title="Needs attention now" subtitle="A real priority queue. The riskiest items stay on top.">
                {attentionQueue.length ? (
                  <div className="grid gap-3">
                    {attentionQueue.slice(0, 10).map((item) => (
                      <QueueItem
                        key={item.id}
                        title={`${item.label} - ${item.entityTitle}`}
                        subtitle={item.subtitle}
                        tone={item.severity === 'danger' ? 'danger' : 'warn'}
                        actionLabel={item.type === 'spot' ? 'View spots' : item.type === 'plan' ? 'View plans' : item.type === 'user' ? 'View users' : 'View chat'}
                        onAction={() => goTo(item.type === 'spot' ? 'spots' : item.type === 'plan' ? 'plans' : item.type === 'user' ? 'users' : 'messages')}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={CheckCircle2} title="All under control" text="There are no major alerts right now. Use quick actions or review recent content." />
                )}
              </Shell>

              <div className="space-y-5">
                <Shell title="Overall status" subtitle="Designed for a response in under 5 seconds.">
                  <div className="grid gap-3">
                    <DetailMetric label="Approved spots" value={approvedSpots.length} tone="success" />
                    <DetailMetric label="Hidden/rejected spots" value={hiddenSpots.length + rejectedSpots.length} tone="warn" />
                    <DetailMetric label="Pending comments" value={pendingComments.length} tone="neutral" />
                    <DetailMetric label="Group messages" value={messages.length} tone="neutral" />
                    <DetailMetric label="Registered users" value={users.length} tone="neutral" />
                  </div>
                </Shell>

                <Shell title="Table diagnostics" subtitle="The panel keeps working even if some tables do not exist yet.">
                  <div className="grid gap-3">
                    {diagnostics.map((item) => (
                      <div key={item.table} className="rounded-[20px] border border-black/8 bg-white px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-black text-[#111111]">{item.table}</div>
                            <div className="mt-1 text-xs text-[#6d665b]">{item.available ? 'Available.' : 'Missing or not accessible yet.'}</div>
                          </div>
                          <StatusPill tone={item.available ? 'success' : 'warn'}>{item.available ? 'ok' : 'missing'}</StatusPill>
                        </div>
                      </div>
                    ))}
                  </div>
                </Shell>
              </div>
            </div>
          </div>
        ) : null}

        {!isLoading && activeTab === 'spots' ? (
          <div className="grid gap-5 xl:grid-cols-[0.95fr,1.05fr]">
            <Shell
              title="Spots"
              subtitle="Approve, reject, hide, detect duplicates and review data quality."
              actions={SPOT_FILTERS.map((filter) => (
                <FilterChip key={filter.id} active={spotFilter === filter.id} onClick={() => setSpotFilter(filter.id)}>{filter.label}</FilterChip>
              ))}
            >
              {spotRows.length ? (
                <div className="grid gap-3 max-h-[900px] overflow-auto pr-1">
                  {spotRows.map((spot) => {
                    const creator = userMap.get(spot.created_by);
                    return (
                      <button
                        key={spot.id}
                        type="button"
                        onClick={() => setSelectedSpotId(spot.id)}
                        className={cn(
                          'rounded-[24px] border px-4 py-4 text-left transition',
                          selectedSpot?.id === spot.id ? 'border-[#141414] bg-white shadow-[0_12px_30px_rgba(34,25,11,0.08)]' : 'border-black/8 bg-[#fffdf9] hover:bg-white',
                        )}
                      >
                        <div className="flex gap-4">
                          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[20px] bg-[#f2eadf]">
                            {spot.photo_url ? <img src={spot.photo_url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-[#8a8174]"><ImageIcon className="h-5 w-5" /></div>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate text-base font-black text-[#111111]">{spot.name}</div>
                              <StatusPill tone={spot.status === 'approved' ? 'success' : spot.status === 'hidden' ? 'dark' : spot.status === 'rejected' ? 'danger' : 'warn'}>{spot.status}</StatusPill>
                              {spot.isDuplicate ? <StatusPill tone="warn">duplicate</StatusPill> : null}
                            </div>
                            <div className="mt-2 line-clamp-2 text-sm text-[#6d665b]">{spot.address}</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <StatusPill tone="neutral">{formatPrice(spot.slice_price)}</StatusPill>
                              <StatusPill tone="info">rating {Number(spot.average_rating || 0).toFixed(1)}</StatusPill>
                              <StatusPill tone="neutral">{spot.ratings_count || 0} ratings</StatusPill>
                              {spot.reportCount ? <StatusPill tone="danger">{spot.reportCount} flags</StatusPill> : null}
                            </div>
                            <div className="mt-3 text-xs text-[#8a8174]">{getPublicUsername(creator, 'No creator')} - {formatDateTime(spot.created_at)}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={Pizza} title="No spots in this filter" text="Try another filter or create more content to start moderating." />
              )}
            </Shell>

            <Shell title="Spot profile" subtitle="Large photo, data, history, ratings, linked plans and quick actions.">
              {selectedSpot ? (
                <div className="space-y-5">
                  <div className="grid gap-4 lg:grid-cols-[1.05fr,0.95fr]">
                    <div className="overflow-hidden rounded-[28px] border border-black/10 bg-[#f2eadf] aspect-[4/3]">
                      {selectedSpot.photo_url ? (
                        <img src={selectedSpot.photo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-center">
                          <div>
                            <ImageIcon className="mx-auto h-8 w-8 text-[#8a8174]" />
                            <div className="mt-3 text-sm font-semibold text-[#6d665b]">No main photo</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-3xl font-black tracking-[-0.05em] text-[#111111]">{selectedSpot.name}</h3>
                          <StatusPill tone={selectedSpot.status === 'approved' ? 'success' : selectedSpot.status === 'hidden' ? 'dark' : selectedSpot.status === 'rejected' ? 'danger' : 'warn'}>{selectedSpot.status}</StatusPill>
                        </div>
                        <div className="mt-2 text-sm leading-7 text-[#6d665b]">{selectedSpot.address}</div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <DetailMetric label="Slice price" value={formatPrice(selectedSpot.slice_price)} />
                        <DetailMetric label="Best slice" value={selectedSpot.best_slice || '-'} />
                        <DetailMetric label="Average rating" value={Number(selectedSpot.average_rating || 0).toFixed(1)} tone="success" />
                        <DetailMetric label="No. ratings" value={selectedSpot.ratings_count || 0} />
                        <DetailMetric label="Lat / Lng" value={`${selectedSpot.lat ?? '-'} / ${selectedSpot.lng ?? '-'}`} />
                        <DetailMetric label="Flags" value={selectedSpot.reportCount || 0} tone={selectedSpot.reportCount ? 'danger' : 'neutral'} />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[1.1fr,0.9fr]">
                    <div className="space-y-5">
                      <div className="rounded-[24px] border border-black/8 bg-white p-4">
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a8174]">Descripcion / quick note</div>
                        <div className="mt-2 text-sm leading-7 text-[#5d574d]">{selectedSpot.quick_note || 'No quick note.'}</div>
                      </div>

                      <div className="rounded-[24px] border border-black/8 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a8174]">Ratings recientes</div>
                          <StatusPill tone="info">{(ratingHistoryMap.get(selectedSpot.id) || []).length} items</StatusPill>
                        </div>
                        <div className="mt-3 space-y-2">
                          {(ratingHistoryMap.get(selectedSpot.id) || []).slice(0, 5).map((row) => (
                            <div key={row.id} className="flex items-center justify-between rounded-2xl border border-black/8 bg-[#fffaf1] px-3 py-2 text-sm">
                              <div className="text-[#5d574d]">{getPublicUsername(userMap.get(row.user_id), 'User')}</div>
                              <div className="font-black text-[#111111]">{Number(row.rating).toFixed(1)}</div>
                            </div>
                          ))}
                          {!(ratingHistoryMap.get(selectedSpot.id) || []).length ? <div className="text-sm text-[#8a8174]">No rating history yet.</div> : null}
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-black/8 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a8174]">Linked active plans</div>
                          <StatusPill tone="neutral">{plans.filter((plan) => plan.spot_id === selectedSpot.id && plan.status === 'active').length}</StatusPill>
                        </div>
                        <div className="mt-3 space-y-2">
                          {plans.filter((plan) => plan.spot_id === selectedSpot.id).slice(0, 5).map((plan) => (
                            <div key={plan.id} className="rounded-2xl border border-black/8 bg-[#fffaf1] px-3 py-3">
                              <div className="font-black text-[#111111]">{plan.title}</div>
                              <div className="mt-1 text-sm text-[#6d665b]">{plan.plan_date} - {plan.plan_time} - {plan.status}</div>
                            </div>
                          ))}
                          {!plans.some((plan) => plan.spot_id === selectedSpot.id) ? <div className="text-sm text-[#8a8174]">This spot does not have linked plans yet.</div> : null}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="rounded-[24px] border border-black/8 bg-white p-4">
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a8174]">Acciones</div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <AdminActionButton variant="success" onClick={() => spotMutation.mutate({ id: selectedSpot.id, payload: moderationPayload('approved') })}><CheckCircle2 className="mr-2 h-4 w-4" />Approve</AdminActionButton>
                          <AdminActionButton variant="warn" onClick={() => spotMutation.mutate({ id: selectedSpot.id, payload: moderationPayload('rejected') })}><XCircle className="mr-2 h-4 w-4" />Reject</AdminActionButton>
                          <AdminActionButton variant="dark" onClick={() => spotMutation.mutate({ id: selectedSpot.id, payload: moderationPayload('hidden') })}><EyeOff className="mr-2 h-4 w-4" />Hide</AdminActionButton>
                          <AdminActionButton variant="neutral" onClick={() => spotMutation.mutate({ id: selectedSpot.id, payload: { updated_at: new Date().toISOString() } })}><Pencil className="mr-2 h-4 w-4" />Edit</AdminActionButton>
                          <AdminActionButton variant="neutral" onClick={() => setSpotFilter('duplicates')}><Copy className="mr-2 h-4 w-4" />Mark duplicate</AdminActionButton>
                          <AdminActionButton variant="neutral" onClick={() => setSpotFilter('duplicates')}><MergeIcon />Merge</AdminActionButton>
                          <AdminActionButton variant="neutral" onClick={() => setActiveTab('photos')}><Camera className="mr-2 h-4 w-4" />Replace photo</AdminActionButton>
                          <AdminActionButton variant="danger" onClick={() => spotMutation.mutate({ id: selectedSpot.id, payload: { photo_url: null, updated_at: new Date().toISOString() } })}><Trash2 className="mr-2 h-4 w-4" />Delete photo</AdminActionButton>
                          <AdminActionButton variant="neutral" onClick={() => window.open(`/home?spot=${selectedSpot.id}`, '_blank')}><MapPin className="mr-2 h-4 w-4" />Ver en mapa</AdminActionButton>
                          <AdminActionButton variant="neutral" onClick={() => { setSelectedUserId(selectedSpot.created_by); setActiveTab('users'); }}><Users className="mr-2 h-4 w-4" />Ver creador</AdminActionButton>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-black/8 bg-white p-4">
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a8174]">Approval checklist</div>
                        <div className="mt-3 grid gap-2 text-sm text-[#5d574d]">
                          <div className="flex items-center justify-between rounded-2xl border border-black/8 px-3 py-2"><span>Valid name</span><StatusPill tone={selectedSpot.name?.trim() ? 'success' : 'danger'}>{selectedSpot.name?.trim() ? 'ok' : 'missing'}</StatusPill></div>
                          <div className="flex items-center justify-between rounded-2xl border border-black/8 px-3 py-2"><span>Address is not empty</span><StatusPill tone={selectedSpot.address?.trim() ? 'success' : 'danger'}>{selectedSpot.address?.trim() ? 'ok' : 'missing'}</StatusPill></div>
                          <div className="flex items-center justify-between rounded-2xl border border-black/8 px-3 py-2"><span>Valid coordinates</span><StatusPill tone={typeof selectedSpot.lat === 'number' && typeof selectedSpot.lng === 'number' ? 'success' : 'danger'}>{typeof selectedSpot.lat === 'number' && typeof selectedSpot.lng === 'number' ? 'ok' : 'review'}</StatusPill></div>
                          <div className="flex items-center justify-between rounded-2xl border border-black/8 px-3 py-2"><span>Reasonable price</span><StatusPill tone={selectedSpot.slice_price >= 0 && selectedSpot.slice_price <= 20 ? 'success' : 'warn'}>{selectedSpot.slice_price >= 0 && selectedSpot.slice_price <= 20 ? 'ok' : 'review'}</StatusPill></div>
                          <div className="flex items-center justify-between rounded-2xl border border-black/8 px-3 py-2"><span>Valid photo or fallback</span><StatusPill tone={selectedSpot.photo_url ? 'success' : 'warn'}>{selectedSpot.photo_url ? 'ok' : 'fallback'}</StatusPill></div>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-black/8 bg-white p-4">
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a8174]">Historico rapido</div>
                        <div className="mt-3 space-y-2 text-sm text-[#5d574d]">
                          <div className="rounded-2xl border border-black/8 px-3 py-2">Creado: {formatDateTime(selectedSpot.created_at)}</div>
                          <div className="rounded-2xl border border-black/8 px-3 py-2">Ultima edicion: {formatDateTime(selectedSpot.updated_at)}</div>
                          <div className="rounded-2xl border border-black/8 px-3 py-2">Last review: {formatDateTime(selectedSpot.reviewed_at)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState icon={Pizza} title="Select a spot" text="The detailed card will appear here when you choose a spot from the list." />
              )}
            </Shell>
          </div>
        ) : null}

        {!isLoading && activeTab === 'plans' ? (
          <div className="grid gap-5 xl:grid-cols-[0.95fr,1.05fr]">
            <Shell title="Plans" subtitle="Control capacity, spam, groups and data consistency." actions={PLAN_FILTERS.map((filter) => <FilterChip key={filter.id} active={planFilter === filter.id} onClick={() => setPlanFilter(filter.id)}>{filter.label}</FilterChip>)}>
              {planRows.length ? (
                <div className="grid max-h-[900px] gap-3 overflow-auto pr-1">
                  {planRows.map((plan) => {
                    const linkedSpot = spotMap.get(plan.spot_id);
                    const creator = userMap.get(plan.created_by);
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={cn('rounded-[24px] border px-4 py-4 text-left transition', selectedPlan?.id === plan.id ? 'border-[#141414] bg-white shadow-[0_12px_30px_rgba(34,25,11,0.08)]' : 'border-black/8 bg-[#fffdf9] hover:bg-white')}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-base font-black text-[#111111]">{plan.title}</div>
                          <StatusPill tone={plan.status === 'active' ? 'success' : plan.status === 'cancelled' ? 'danger' : 'warn'}>{plan.status}</StatusPill>
                          {plan.isSuspicious ? <StatusPill tone="danger">sospechoso</StatusPill> : null}
                          {plan.seatsOver ? <StatusPill tone="danger">sobre cupo</StatusPill> : null}
                        </div>
                        <div className="mt-2 text-sm text-[#6d665b]">{linkedSpot?.name || 'No spot'} - {plan.plan_date} - {plan.plan_time}</div>
                        <div className="mt-2 text-sm text-[#6d665b] line-clamp-2">{plan.quick_note || 'No description'}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <StatusPill tone="neutral">{plan.joinedCount}/{plan.max_people || 0} miembros</StatusPill>
                          {plan.reportCount ? <StatusPill tone="danger">{plan.reportCount} flags</StatusPill> : null}
                          <StatusPill tone={plan.hasValidSpot ? 'success' : 'warn'}>{plan.hasValidSpot ? 'spot ok' : 'invalid spot'}</StatusPill>
                        </div>
                        <div className="mt-3 text-xs text-[#8a8174]">{getPublicUsername(creator, 'No creator')} - {formatDateTime(plan.created_at)}</div>
                      </button>
                    );
                  })}
                </div>
              ) : <EmptyState icon={CalendarDays} title="No plans in this filter" text="Change the filter or create activity to see results here." />}
            </Shell>

            <Shell title="Plan profile" subtitle="Core info, chat, members, reports and control actions.">
              {selectedPlan ? (
                <div className="space-y-5">
                  <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-3xl font-black tracking-[-0.05em] text-[#111111]">{selectedPlan.title}</h3>
                        <StatusPill tone={selectedPlan.status === 'active' ? 'success' : selectedPlan.status === 'cancelled' ? 'danger' : 'warn'}>{selectedPlan.status}</StatusPill>
                      </div>
                      <div className="mt-3 text-sm leading-7 text-[#6d665b]">{selectedPlan.quick_note || 'No description del plan.'}</div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DetailMetric label="Linked spot" value={spotMap.get(selectedPlan.spot_id)?.name || 'No spot'} tone={selectedPlan.hasValidSpot ? 'success' : 'warn'} />
                      <DetailMetric label="Date and time" value={`${selectedPlan.plan_date || '-'} - ${selectedPlan.plan_time || '-'}`} />
                      <DetailMetric label="Miembros" value={`${selectedPlan.joinedCount}/${selectedPlan.max_people || 0}`} tone={selectedPlan.seatsOver ? 'danger' : 'neutral'} />
                      <DetailMetric label="Flags" value={selectedPlan.reportCount || 0} tone={selectedPlan.reportCount ? 'danger' : 'neutral'} />
                    </div>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[1fr,1fr]">
                    <div className="space-y-5">
                      <div className="rounded-[24px] border border-black/8 bg-white p-4">
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a8174]">Miembros</div>
                        <div className="mt-3 space-y-2">
                          {members.filter((row) => row.plan_id === selectedPlan.id).map((row) => {
                            const person = userMap.get(row.user_id);
                            return (
                              <div key={row.id} className="flex items-center justify-between rounded-2xl border border-black/8 px-3 py-3 text-sm">
                                <div>
                                  <div className="font-semibold text-[#111111]">{getPublicUsername(person, 'User')}</div>
                                  <div className="text-[#8a8174]">{row.status} - {formatDateTime(row.created_at)}</div>
                                </div>
                                <AdminActionButton variant="danger" onClick={() => deleteMutation.mutate({ table: 'plan_members', id: row.id })}>Expulsar</AdminActionButton>
                              </div>
                            );
                          })}
                          {!members.some((row) => row.plan_id === selectedPlan.id) ? <div className="text-sm text-[#8a8174]">No members yet.</div> : null}
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-black/8 bg-white p-4">
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a8174]">Chat reciente</div>
                        <div className="mt-3 space-y-2">
                          {messages.filter((row) => row.plan_id === selectedPlan.id).slice(-6).map((row) => (
                            <div key={row.id} className="rounded-2xl border border-black/8 px-3 py-3">
                              <div className="flex items-center justify-between gap-2 text-xs text-[#8a8174]">
                                <span>{getPublicUsername(userMap.get(row.user_id), 'User')}</span>
                                <span>{formatDateTime(row.created_at)}</span>
                              </div>
                              <div className="mt-2 text-sm text-[#111111]">{row.content}</div>
                            </div>
                          ))}
                          {!messages.some((row) => row.plan_id === selectedPlan.id) ? <div className="text-sm text-[#8a8174]">No group messages.</div> : null}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="rounded-[24px] border border-black/8 bg-white p-4">
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a8174]">Acciones</div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <AdminActionButton variant="neutral" onClick={() => planMutation.mutate({ id: selectedPlan.id, payload: { updated_at: new Date().toISOString() } })}><Pencil className="mr-2 h-4 w-4" />Edit</AdminActionButton>
                          <AdminActionButton variant="warn" onClick={() => planMutation.mutate({ id: selectedPlan.id, payload: { status: 'cancelled' } })}><Clock3 className="mr-2 h-4 w-4" />Cerrar</AdminActionButton>
                          <AdminActionButton variant="dark" onClick={() => planMutation.mutate({ id: selectedPlan.id, payload: { status: 'hidden' } })}><EyeOff className="mr-2 h-4 w-4" />Hide</AdminActionButton>
                          <AdminActionButton variant="danger" onClick={() => deleteMutation.mutate({ table: 'plans', id: selectedPlan.id })}><Trash2 className="mr-2 h-4 w-4" />Delete</AdminActionButton>
                          <AdminActionButton variant="neutral" onClick={() => setActiveTab('messages')}><MessageSquare className="mr-2 h-4 w-4" />Ver grupo</AdminActionButton>
                          <AdminActionButton variant="neutral" onClick={() => { setSelectedUserId(selectedPlan.created_by); setActiveTab('users'); }}><Users className="mr-2 h-4 w-4" />Ver creador</AdminActionButton>
                          <AdminActionButton variant="neutral" onClick={() => planMutation.mutate({ id: selectedPlan.id, payload: { status: 'draft' } })}><Copy className="mr-2 h-4 w-4" />Duplicar / recrear</AdminActionButton>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-black/8 bg-white p-4">
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a8174]">Deteccion de problemas</div>
                        <div className="mt-3 grid gap-2 text-sm text-[#5d574d]">
                          <div className="flex items-center justify-between rounded-2xl border border-black/8 px-3 py-2"><span>Plan without valid spot</span><StatusPill tone={selectedPlan.hasValidSpot ? 'success' : 'danger'}>{selectedPlan.hasValidSpot ? 'no' : 'si'}</StatusPill></div>
                          <div className="flex items-center justify-between rounded-2xl border border-black/8 px-3 py-2"><span>Fecha pasada pero sigue activo</span><StatusPill tone={selectedPlan.isPast && selectedPlan.status === 'active' ? 'danger' : 'success'}>{selectedPlan.isPast && selectedPlan.status === 'active' ? 'si' : 'no'}</StatusPill></div>
                          <div className="flex items-center justify-between rounded-2xl border border-black/8 px-3 py-2"><span>Mas miembros que plazas</span><StatusPill tone={selectedPlan.seatsOver ? 'danger' : 'success'}>{selectedPlan.seatsOver ? 'si' : 'no'}</StatusPill></div>
                          <div className="flex items-center justify-between rounded-2xl border border-black/8 px-3 py-2"><span>Creador baneado / advertido</span><StatusPill tone={(userRows.find((row) => row.id === selectedPlan.created_by)?.state || 'active') !== 'active' ? 'warn' : 'success'}>{userRows.find((row) => row.id === selectedPlan.created_by)?.state || 'active'}</StatusPill></div>
                          <div className="flex items-center justify-between rounded-2xl border border-black/8 px-3 py-2"><span>Texto spam o abuso</span><StatusPill tone={selectedPlan.isSuspicious ? 'danger' : 'success'}>{selectedPlan.isSuspicious ? 'si' : 'no'}</StatusPill></div>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-black/8 bg-white p-4">
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a8174]">Historico</div>
                        <div className="mt-3 space-y-2 text-sm text-[#5d574d]">
                          <div className="rounded-2xl border border-black/8 px-3 py-2">Creado: {formatDateTime(selectedPlan.created_at)}</div>
                          <div className="rounded-2xl border border-black/8 px-3 py-2">Ultima edicion: {formatDateTime(selectedPlan.updated_at)}</div>
                          <div className="rounded-2xl border border-black/8 px-3 py-2">Creador: {getPublicUsername(userMap.get(selectedPlan.created_by), '-')}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : <EmptyState icon={CalendarDays} title="Select a plan" text="The detailed card will appear here when you choose a plan from the list." />}
            </Shell>
          </div>
        ) : null}

        {!isLoading && activeTab === 'reports' ? (
          <Shell title="Reports / moderation" subtitle="Until a formal reports table exists, this inbox uses real content signals to prioritize review.">
            {attentionQueue.length ? (
              <div className="grid gap-3">
                {openReports.map((item) => (
                  <div key={item.id} className="rounded-[24px] border border-black/8 bg-white px-4 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill tone={item.severity === 'danger' ? 'danger' : 'warn'}>{item.severity === 'danger' ? 'alta' : 'media'}</StatusPill>
                          <StatusPill tone="neutral">{item.type}</StatusPill>
                          <div className="text-base font-black text-[#111111]">{item.label}</div>
                        </div>
                        <div className="mt-2 text-sm font-semibold text-[#111111]">{item.entityTitle}</div>
                        <div className="mt-1 text-sm text-[#6d665b]">{item.subtitle}</div>
                        <div className="mt-2 text-xs text-[#8a8174]">Date: {formatDateTime(item.createdAt)} - Status: open</div>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <AdminActionButton variant="neutral" onClick={() => goTo(item.type === 'spot' ? 'spots' : item.type === 'plan' ? 'plans' : item.type === 'user' ? 'users' : 'messages')}>Ver</AdminActionButton>
                        <AdminActionButton variant="dark">Descartar</AdminActionButton>
                        <AdminActionButton variant="warn">Hide contenido</AdminActionButton>
                        <AdminActionButton variant="danger">Avisar / sancionar</AdminActionButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyState icon={ShieldAlert} title="No open reports" text="When real reports or automatic signals arrive, they will appear here with priority and status." />}
          </Shell>
        ) : null}

        {!isLoading && activeTab === 'users' ? (
          <div className="grid gap-5 xl:grid-cols-[0.95fr,1.05fr]">
            <Shell title="Users" subtitle="Basic control focused on activity, reports and role." actions={USER_FILTERS.map((filter) => <FilterChip key={filter.id} active={userFilter === filter.id} onClick={() => setUserFilter(filter.id)}>{filter.label}</FilterChip>)}>
              {userRows.length ? (
                <div className="grid max-h-[900px] gap-3 overflow-auto pr-1">
                  {userRows.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => setSelectedUserId(person.id)}
                      className={cn('rounded-[24px] border px-4 py-4 text-left transition', selectedUser?.id === person.id ? 'border-[#141414] bg-white shadow-[0_12px_30px_rgba(34,25,11,0.08)]' : 'border-black/8 bg-[#fffdf9] hover:bg-white')}
                    >
                      <div className="flex items-start gap-4">
                        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#141414] text-lg font-black text-[#efbf3a]">{getAvatarLetter(person, 'U')}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-base font-black text-[#111111]">{getPublicUsername(person)}</div>
                            <StatusPill tone={person.role === 'admin' ? 'dark' : 'neutral'}>{person.roleLabel}</StatusPill>
                            <StatusPill tone={person.state === 'banned' ? 'danger' : person.state === 'warned' ? 'warn' : 'success'}>{person.state}</StatusPill>
                          </div>
                          <div className="mt-2 truncate text-sm text-[#6d665b]">{person.email}</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <StatusPill tone="neutral">{person.spotsCount} spots</StatusPill>
                            <StatusPill tone="neutral">{person.plansCount} plans</StatusPill>
                            <StatusPill tone="neutral">{person.groupsJoined} grupos</StatusPill>
                            {person.reportsCount ? <StatusPill tone="danger">{person.reportsCount} flags</StatusPill> : null}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : <EmptyState icon={Users} title="No users in this filter" text="Try another filter or wait for more people to join the platform." />}
            </Shell>

            <Shell title="User profile" subtitle="Activity, reports and safety actions.">
              {selectedUser ? (
                <div className="space-y-5">
                  <div className="grid gap-4 lg:grid-cols-[1fr,1fr]">
                    <div className="rounded-[24px] border border-black/8 bg-white p-4">
                      <div className="flex items-center gap-4">
                        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#141414] text-2xl font-black text-[#efbf3a]">{getAvatarLetter(selectedUser, 'U')}</div>
                        <div>
                          <div className="text-2xl font-black tracking-[-0.04em] text-[#111111]">{selectedUser.username || 'Unnamed user'}</div>
                          <div className="mt-1 text-sm text-[#6d665b]">{selectedUser.email}</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <StatusPill tone={selectedUser.role === 'admin' ? 'dark' : 'neutral'}>{selectedUser.roleLabel}</StatusPill>
                            <StatusPill tone={selectedUser.state === 'banned' ? 'danger' : selectedUser.state === 'warned' ? 'warn' : 'success'}>{selectedUser.state}</StatusPill>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DetailMetric label="Created spots" value={selectedUser.spotsCount} />
                      <DetailMetric label="Created plans" value={selectedUser.plansCount} />
                      <DetailMetric label="Joined groups" value={selectedUser.groupsJoined} />
                      <DetailMetric label="Received reports" value={selectedUser.reportsCount} tone={selectedUser.reportsCount ? 'danger' : 'neutral'} />
                    </div>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[1fr,1fr]">
                    <div className="space-y-5">
                      <div className="rounded-[24px] border border-black/8 bg-white p-4">
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a8174]">Actividad reciente</div>
                        <div className="mt-3 space-y-2 text-sm text-[#5d574d]">
                          <div className="rounded-2xl border border-black/8 px-3 py-2">Alta: {formatDateTime(selectedUser.created_at)}</div>
                          <div className="rounded-2xl border border-black/8 px-3 py-2">Ultima actualizacion: {formatDateTime(selectedUser.updated_at)}</div>
                          <div className="rounded-2xl border border-black/8 px-3 py-2">Mensajes recientes: {userMessageCountMap.get(selectedUser.id) || 0}</div>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-black/8 bg-white p-4">
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a8174]">Contenido del usuario</div>
                        <div className="mt-3 space-y-3">
                          {spots.filter((row) => row.created_by === selectedUser.id).slice(0, 3).map((row) => (
                            <div key={row.id} className="rounded-2xl border border-black/8 px-3 py-3 text-sm">
                              <div className="font-black text-[#111111]">{row.name}</div>
                              <div className="mt-1 text-[#6d665b]">Spot - {row.status}</div>
                            </div>
                          ))}
                          {plans.filter((row) => row.created_by === selectedUser.id).slice(0, 3).map((row) => (
                            <div key={row.id} className="rounded-2xl border border-black/8 px-3 py-3 text-sm">
                              <div className="font-black text-[#111111]">{row.title}</div>
                              <div className="mt-1 text-[#6d665b]">Plan - {row.status}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="rounded-[24px] border border-black/8 bg-white p-4">
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a8174]">Acciones admin</div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {selectedUser.role !== 'admin' ? (
                            <AdminActionButton variant="warn" onClick={() => userMutation.mutate({ id: selectedUser.id, payload: { role: 'admin' } })}><Shield className="mr-2 h-4 w-4" />Cambiar rol</AdminActionButton>
                          ) : (
                            <AdminActionButton variant="dark" disabled={selectedUser.id === profile?.id} onClick={() => userMutation.mutate({ id: selectedUser.id, payload: { role: 'user' } })}><Shield className="mr-2 h-4 w-4" />Quitar admin</AdminActionButton>
                          )}
                          <AdminActionButton variant="warn"><AlertTriangle className="mr-2 h-4 w-4" />Advertir</AdminActionButton>
                          <AdminActionButton variant="dark"><Ban className="mr-2 h-4 w-4" />Suspender</AdminActionButton>
                          <AdminActionButton variant="danger"><Ban className="mr-2 h-4 w-4" />Banear</AdminActionButton>
                          <AdminActionButton variant="neutral">Hide contenido</AdminActionButton>
                          <AdminActionButton variant="neutral">Ver todo su contenido</AdminActionButton>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-black/8 bg-white p-4">
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a8174]">Seguridad</div>
                        <div className="mt-3 space-y-2 text-sm text-[#5d574d]">
                          <div className="rounded-2xl border border-black/8 px-3 py-2">High-impact actions should ask for extra confirmation.</div>
                          <div className="rounded-2xl border border-black/8 px-3 py-2">Keep change logs and traceability for admin actions.</div>
                          <div className="rounded-2xl border border-black/8 px-3 py-2">Avoid one-click actions for bans or bulk deletes.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : <EmptyState icon={Users} title="Select a user" text="The detailed card will appear here when you choose a profile from the list." />}
            </Shell>
          </div>
        ) : null}

        {!isLoading && activeTab === 'messages' ? (
          <Shell title="Chat / messages" subtitle="Text search, plan filtering, chat context and targeted moderation.">
            {messages.length ? (
              <div className="grid gap-3">
                {messages.filter((row) => includesSearch(row.content, planMap.get(row.plan_id)?.title, userMap.get(row.user_id)?.email)).slice(0, 100).map((row) => (
                  <div key={row.id} className="rounded-[24px] border border-black/8 bg-white px-4 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill tone={isSuspiciousText(row.content) ? 'danger' : 'neutral'}>{isSuspiciousText(row.content) ? 'reportado' : 'normal'}</StatusPill>
                          <div className="text-base font-black text-[#111111]">{planMap.get(row.plan_id)?.title || 'Plan'}</div>
                        </div>
                        <div className="mt-2 text-sm text-[#6d665b]">{getPublicUsername(userMap.get(row.user_id), 'User')} - {formatDateTime(row.created_at)}</div>
                        <div className="mt-3 rounded-2xl border border-black/8 bg-[#fffaf1] px-3 py-3 text-sm leading-7 text-[#111111]">{row.content}</div>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <AdminActionButton variant="neutral" onClick={() => setSelectedPlanId(row.plan_id) || setActiveTab('plans')}><Eye className="mr-2 h-4 w-4" />Contexto</AdminActionButton>
                        <AdminActionButton variant="warn" onClick={() => messageMutation.mutate({ id: row.id, payload: { content: '[message removed by moderation]' } })}>Hide</AdminActionButton>
                        <AdminActionButton variant="danger" onClick={() => deleteMutation.mutate({ table: 'messages', id: row.id })}>Delete</AdminActionButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyState icon={MessageSquare} title="No messages yet" text="When groups start talking, you will be able to review context and moderate from here." />}
          </Shell>
        ) : null}

        {!isLoading && activeTab === 'photos' ? (
          <Shell title="Photos / media" subtitle="Pending, broken, orphaned and photos linked to problematic spots.">
            {photos.length ? (
              <div className="grid gap-3">
                {photos.filter((row) => includesSearch(spotMap.get(row.spot_id)?.name, row.photo_url, row.status)).map((row) => {
                  const linkedSpot = spotMap.get(row.spot_id);
                  const isOrphan = !linkedSpot;
                  const broken = Boolean(row.photo_url && !/^https?:\/\//.test(row.photo_url) && !row.photo_url.startsWith('/'));
                  return (
                    <div key={row.id} className="rounded-[24px] border border-black/8 bg-white p-4">
                      <div className="grid gap-4 lg:grid-cols-[140px,1fr,auto] lg:items-start">
                        <div className="h-[120px] overflow-hidden rounded-[22px] bg-[#f2eadf]">
                          {row.photo_url ? <img src={row.photo_url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><ImageIcon className="h-6 w-6 text-[#8a8174]" /></div>}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-black text-[#111111]">{linkedSpot?.name || 'Spot not found'}</div>
                            <StatusPill tone={row.status === 'approved' ? 'success' : row.status === 'hidden' ? 'dark' : 'warn'}>{row.status}</StatusPill>
                            {isOrphan ? <StatusPill tone="danger">orphan</StatusPill> : null}
                            {broken ? <StatusPill tone="warn">broken</StatusPill> : null}
                          </div>
                          <div className="mt-2 break-all text-sm text-[#6d665b]">{row.photo_url}</div>
                          <div className="mt-2 text-xs text-[#8a8174]">{formatDateTime(row.created_at)}</div>
                        </div>
                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <AdminActionButton variant="success" onClick={() => photoMutation.mutate({ id: row.id, payload: moderationPayload('approved') })}>Approve</AdminActionButton>
                          <AdminActionButton variant="warn" onClick={() => photoMutation.mutate({ id: row.id, payload: moderationPayload('hidden') })}>Reject</AdminActionButton>
                          <AdminActionButton variant="neutral">Open original</AdminActionButton>
                          <AdminActionButton variant="danger" onClick={() => deleteMutation.mutate({ table: 'spot_photos', id: row.id })}>Delete</AdminActionButton>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyState icon={Camera} title="No photos in the media table" text="If you have not created spot_photos yet, admin still works and this space is ready." />}
          </Shell>
        ) : null}

        {!isLoading && activeTab === 'operations' ? (
          <div className="space-y-5">
            <Shell
              title="Operations center"
              subtitle="Tools for running a large app: volume, quality, export and data health."
              actions={
                <>
                  <AdminActionButton variant="neutral" onClick={() => downloadCsv('sozzial-users.csv', users)}><Download className="mr-2 h-4 w-4" />Users CSV</AdminActionButton>
                  <AdminActionButton variant="neutral" onClick={() => downloadCsv('sozzial-spots.csv', spots)}><Download className="mr-2 h-4 w-4" />Spots CSV</AdminActionButton>
                  <AdminActionButton variant="neutral" onClick={() => downloadCsv('sozzial-plans.csv', plans)}><Download className="mr-2 h-4 w-4" />Plans CSV</AdminActionButton>
                </>
              }
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <DetailMetric label="Total users" value={users.length} />
                <DetailMetric label="Profile completeness" value={`${profileCompleteness.score}%`} tone={profileCompleteness.score > 60 ? 'success' : 'warn'} />
                <DetailMetric label="Total content" value={spots.length + plans.length + messages.length + comments.length + photos.length} />
                <DetailMetric label="Open alerts" value={openReports.length} tone={openReports.length ? 'danger' : 'success'} />
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-2">
                <div className="rounded-[24px] border border-black/8 bg-white p-5">
                  <div className="text-lg font-black text-[#111111]">Profile quality</div>
                  <div className="mt-4 grid gap-3">
                    <DetailMetric label="No bio" value={profileCompleteness.missingBio} tone={profileCompleteness.missingBio ? 'warn' : 'success'} />
                    <DetailMetric label="No photo" value={profileCompleteness.missingAvatar} tone={profileCompleteness.missingAvatar ? 'warn' : 'success'} />
                    <DetailMetric label="No favorite spot" value={profileCompleteness.missingFavorite} tone={profileCompleteness.missingFavorite ? 'warn' : 'success'} />
                  </div>
                </div>

                <div className="rounded-[24px] border border-black/8 bg-white p-5">
                  <div className="text-lg font-black text-[#111111]">Ready for thousands of users</div>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-[#5d574d]">
                    <div className="rounded-2xl border border-black/8 bg-[#fffaf1] px-4 py-3">Use indexes on profiles.favorite_spot_id, spots.status, plans.status, messages.plan_id and spot_comments.status.</div>
                    <div className="rounded-2xl border border-black/8 bg-[#fffaf1] px-4 py-3">Keep destructive actions behind confirmation and audit logs.</div>
                    <div className="rounded-2xl border border-black/8 bg-[#fffaf1] px-4 py-3">For real volume, move heavy counters to RPCs or materialized views.</div>
                  </div>
                </div>
              </div>
            </Shell>
          </div>
        ) : null}

        {!isLoading && activeTab === 'settings' ? (
          <Shell title="Settings / configuration" subtitle="Not huge, but useful for operating and moderating better.">
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-[24px] border border-black/8 bg-white p-5">
                <div className="text-lg font-black text-[#111111]">Seat limits</div>
                <div className="mt-2 text-sm leading-7 text-[#6d665b]">Define max seats per plan, soft limits and over-capacity rules.</div>
              </div>
              <div className="rounded-[24px] border border-black/8 bg-white p-5">
                <div className="text-lg font-black text-[#111111]">Allowed statuses</div>
                <div className="mt-2 text-sm leading-7 text-[#6d665b]">active, draft, cancelled, approved, hidden, rejected and any extra workflow you add.</div>
              </div>
              <div className="rounded-[24px] border border-black/8 bg-white p-5">
                <div className="text-lg font-black text-[#111111]">Moderation copy</div>
                <div className="mt-2 text-sm leading-7 text-[#6d665b]">Templates for notices, photo rejections, warnings and temporary sanctions.</div>
              </div>
              <div className="rounded-[24px] border border-black/8 bg-white p-5">
                <div className="text-lg font-black text-[#111111]">Suspicion thresholds</div>
                <div className="mt-2 text-sm leading-7 text-[#6d665b]">Heuristics for spam, duplicates, unusual activity or excessive reports.</div>
              </div>
              <div className="rounded-[24px] border border-black/8 bg-white p-5">
                <div className="text-lg font-black text-[#111111]">Default values</div>
                <div className="mt-2 text-sm leading-7 text-[#6d665b]">Price, seats, initial statuses and public visibility by content type.</div>
              </div>
              <div className="rounded-[24px] border border-black/8 bg-white p-5">
                <div className="text-lg font-black text-[#111111]">Product badges</div>
                <div className="mt-2 text-sm leading-7 text-[#6d665b]">cheap, good value, overpriced or any visual category you want to use in map and admin.</div>
              </div>
            </div>
          </Shell>
        ) : null}
      </div>
    </div>
  );
}

function MergeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 7h4a4 4 0 0 1 4 4v6" />
      <path d="M7 17h4a4 4 0 0 0 4-4V7" />
      <path d="m14 17 3 3 3-3" />
      <path d="m14 7 3-3 3 3" />
    </svg>
  );
}




