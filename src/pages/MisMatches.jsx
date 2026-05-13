import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Info, MapPin, MessageCircle, Pizza, Send, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";
import { getPublicUsername, getAvatarLetter } from "@/lib/display-name";

const avatar = (name) => name?.slice(0, 1)?.toUpperCase() || "?";
const GROUP_READ_KEY = "sozzial_group_read_state";

function readGroupState() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(GROUP_READ_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function writeGroupState(next) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GROUP_READ_KEY, JSON.stringify(next));
}

function fmtDate(date, time) {
  if (!date) return "";
  const d = new Date(`${date}T${time || "20:00"}`);
  if (Number.isNaN(d.getTime())) return `${date} - ${String(time || "").slice(0, 5)}`;
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}


async function resolveSpotPhoto(value) {
  if (!isSupabaseConfigured || !supabase) return null;
  if (!value) return null;
  if (String(value).startsWith("http")) return value;
  const { data } = await supabase.storage.from("spot-photos").createSignedUrl(value, 60 * 60);
  return data?.signedUrl || null;
}

function mapUrl(spot) {
  if (!spot?.lat || !spot?.lng) return "https://maps.google.com";
  return `https://www.google.com/maps?q=${spot.lat},${spot.lng}`;
}

async function fetchGroups(userId) {
  if (!isSupabaseConfigured || !supabase) return [];
  const [{ data: owned }, { data: joined }] = await Promise.all([
    supabase.from("plans").select("id").eq("created_by", userId),
    supabase.from("plan_members").select("plan_id").eq("user_id", userId).eq("status", "joined"),
  ]);

  const planIds = Array.from(new Set([...(owned || []).map((r) => r.id), ...(joined || []).map((r) => r.plan_id)])).filter(Boolean);
  if (!planIds.length) return [];

  const { data: plans, error } = await supabase
    .from("plans")
    .select("id,title,plan_date,plan_time,max_people,quick_note,status,created_by,spot_id")
    .in("id", planIds)
    .order("plan_date", { ascending: true });
  if (error) throw error;

  const creatorIds = Array.from(new Set((plans || []).map((p) => p.created_by).filter(Boolean)));
  const spotIds = Array.from(new Set((plans || []).map((p) => p.spot_id).filter(Boolean)));

  const [{ data: profiles }, { data: spots }, { data: members }, { data: messages }] = await Promise.all([
    creatorIds.length ? supabase.from("profiles").select("id,username,avatar_url,role").in("id", creatorIds) : Promise.resolve({ data: [] }),
    spotIds.length ? supabase.from("spots").select("id,name,address,lat,lng,slice_price,best_slice,quick_note,photo_url,status").in("id", spotIds) : Promise.resolve({ data: [] }),
    supabase.from("plan_members").select("plan_id,user_id,status").in("plan_id", planIds),
    supabase.from("messages").select("id,plan_id,user_id,content,created_at").in("plan_id", planIds).order("created_at", { ascending: true }),
  ]);

  const memberIds = Array.from(new Set((members || []).map((m) => m.user_id).filter(Boolean)));
  const memberProfiles = memberIds.length
    ? (await supabase.from("profiles").select("id,username,avatar_url,role").in("id", memberIds)).data || []
    : [];

  const profileMap = new Map([...(profiles || []), ...memberProfiles].map((p) => [p.id, p]));
  const resolvedSpots = await Promise.all((spots || []).map(async (s) => ({ ...s, photo_url: await resolveSpotPhoto(s.photo_url) })));
  const spotMap = new Map(resolvedSpots.map((s) => [s.id, s]));

  return (plans || []).map((plan) => {
    const planMembers = (members || []).filter((m) => m.plan_id === plan.id && m.status === "joined");
    const planMessages = (messages || []).filter((m) => m.plan_id === plan.id);
    const host = profileMap.get(plan.created_by);
    return {
      id: plan.id,
      titulo: plan.title,
      fecha_hora: `${plan.plan_date}T${String(plan.plan_time).slice(0, 5) || "20:00"}`,
      plan_date: plan.plan_date,
      plan_time: String(plan.plan_time).slice(0, 5),
      max_participantes: plan.max_people,
      descripcion: plan.quick_note || "",
      status: plan.status,
      place: spotMap.get(plan.spot_id),
      pizzeria_nombre: spotMap.get(plan.spot_id)?.name || "Pizza spot",
      host,
      participants: planMembers.map((m) => profileMap.get(m.user_id)).filter(Boolean),
      messageList: planMessages,
      lastMessage: planMessages[planMessages.length - 1],
    };
  });
}

function GroupInfoSheet({ group, open, onClose }) {
  if (!group || !open) return null;
  return (
    <div className="fixed inset-0 z-[1400] bg-black/55 backdrop-blur-sm" onClick={onClose}>
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-lg overflow-hidden rounded-t-[30px] border border-white/10 bg-[#101010] text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative h-44 border-b border-white/10 bg-black">
          {group.place?.photo_url ? <img src={group.place.photo_url} alt={group.pizzeria_nombre} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[#efbf3a]"><Pizza className="h-16 w-16" /></div>}
          <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/35 to-black/85" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <div className="inline-flex rounded-full bg-[#efbf3a] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#141414]">${Number(group.place?.slice_price || 0).toFixed(2)} slice</div>
            <h3 className="mt-3 text-2xl font-black leading-tight text-white">{group.titulo}</h3>
            <div className="mt-2 text-sm text-stone-200">{group.pizzeria_nombre}</div>
          </div>
          <button onClick={onClose} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/40 text-stone-100"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">When</div>
              <div className="mt-2 text-sm font-bold">{fmtDate(group.plan_date, group.plan_time)}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">People</div>
              <div className="mt-2 text-sm font-bold">{group.participants.length} / {group.max_participantes}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">Best slice</div>
              <div className="mt-2 text-sm font-bold">{group.place?.best_slice || 'Optional'}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">Address</div>
              <div className="mt-2 line-clamp-2 text-sm font-bold">{group.place?.address || 'Open in maps'}</div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">Quick note</div>
            <div className="mt-2 text-sm leading-7 text-stone-300">{group.descripcion || 'Simple pizza plan. Good spot, clear time, easy join.'}</div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {group.participants.map((person) => (
              <Link to={`/profile/${person.id}`} key={person.id} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-stone-200 hover:bg-white/[0.08]">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-[#efbf3a] to-[#df5b43] text-[11px] font-bold text-white">{avatar(getPublicUsername(person))}</div>
                {getPublicUsername(person)}
              </Link>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <a href={mapUrl(group.place)} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-bold text-white">
              <MapPin className="mr-2 h-4 w-4" />Open in Google Maps
            </a>
            <button onClick={onClose} className="inline-flex h-12 items-center justify-center rounded-2xl bg-red-600 text-sm font-bold text-white">Back to chat</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageRow({ message, currentUserId, usersById }) {
  const own = message.user_id === currentUserId;
  const sender = usersById.get(message.user_id);
  return (
    <div className={`flex ${own ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[82%] rounded-[22px] px-4 py-3 ${own ? "rounded-br-md bg-[#e62f2f] text-white" : "rounded-bl-md border border-white/6 bg-[#171717] text-stone-100"}`}>
        {!own ? <Link to={`/profile/${sender?.id || message.user_id}`} className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500 hover:text-stone-300">{getPublicUsername(sender)}</Link> : null}
        <div className="text-sm leading-6">{message.content}</div>
      </div>
    </div>
  );
}

function GroupListItem({ group, active, unreadCount = 0, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-[22px] border px-3 py-3 text-left transition ${unreadCount ? "border-[#efbf3a]/35 bg-[#efbf3a]/10" : active ? "border-white/12 bg-white/[0.04]" : "border-white/6 bg-transparent hover:bg-white/[0.03]"}`}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#efbf3a] to-[#df5b43] text-sm font-black text-white">{avatar(getPublicUsername(group.host))}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate font-bold text-white">{group.titulo}</div>
            <div className="text-[11px] text-stone-500">{group.lastMessage ? new Date(group.lastMessage.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : String(group.plan_time || "").slice(0,5)}</div>
          </div>
          <div className="mt-1 truncate text-xs text-stone-400">{group.pizzeria_nombre}</div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="truncate text-sm text-stone-300">{group.lastMessage?.content || group.descripcion || "No messages yet"}</div>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function MisMatches() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState("upcoming");
  const [showInfo, setShowInfo] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["my-groups-supabase", user?.id],
    enabled: Boolean(user?.id && isSupabaseConfigured && supabase),
    queryFn: () => fetchGroups(user.id),
    refetchInterval: 30000,
  });

  const requestedFocus = searchParams.get("focus");
  const [timeBucket, setTimeBucket] = useState(() => Date.now());
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const interval = window.setInterval(() => setTimeBucket(Date.now()), 60000);
    return () => window.clearInterval(interval);
  }, []);
  const now = useMemo(() => new Date(timeBucket), [timeBucket]);
  const upcoming = useMemo(() => groups.filter((item) => new Date(item.fecha_hora) >= now), [groups, now]);
  const history = useMemo(() => groups.filter((item) => new Date(item.fecha_hora) < now), [groups, now]);
  const allVisible = useMemo(() => [...upcoming, ...history], [upcoming, history]);
  const visible = tab === "upcoming" ? upcoming : history;
  const selected = visible.find((item) => item.id === selectedId) || allVisible.find((item) => item.id === selectedId) || null;
  const [readState, setReadState] = useState(() => readGroupState());
  const unreadByGroup = useMemo(() => {
    const map = new Map();
    allVisible.forEach((group) => {
      const lastRead = readState[group.id] ? new Date(readState[group.id]).getTime() : 0;
      const count = (group.messageList || []).filter((message) => message.user_id !== user?.id && new Date(message.created_at).getTime() > lastRead).length;
      map.set(group.id, count);
    });
    return map;
  }, [allVisible, readState, user?.id]);
  const markGroupRead = React.useCallback((group) => {
    const last = group?.lastMessage?.created_at || new Date().toISOString();
    setReadState((current) => {
      const next = { ...current, [group.id]: last };
      writeGroupState(next);
      return next;
    });
  }, []);
  const usersById = useMemo(() => new Map(allVisible.flatMap((g) => [g.host, ...(g.participants || [])]).filter(Boolean).map((p) => [p.id, p])), [allVisible]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('sozzial:group-chat-state', { detail: { open: Boolean(mobileChatOpen) } }));
    return () => window.dispatchEvent(new CustomEvent('sozzial:group-chat-state', { detail: { open: false } }));
  }, [mobileChatOpen]);

  useEffect(() => {
    if (!allVisible.length) {
      setSelectedId(null);
      setMobileChatOpen(false);
      return;
    }
    if (requestedFocus && allVisible.some((item) => item.id === requestedFocus)) {
      const focused = allVisible.find((item) => item.id === requestedFocus);
      setSelectedId(requestedFocus);
      setTab(new Date(focused.fecha_hora) >= now ? "upcoming" : "history");
      setMobileChatOpen(true);
      setSearchParams((params) => {
        const next = new URLSearchParams(params);
        next.delete("focus");
        return next;
      }, { replace: true });
      return;
    }
    if (selectedId && !allVisible.some((item) => item.id === selectedId)) {
      setSelectedId(null);
      setMobileChatOpen(false);
    }
  }, [selectedId, visible, allVisible, requestedFocus, setSearchParams, now]);

  useEffect(() => {
    if (selected) markGroupRead(selected);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messageList?.length, selected?.id, markGroupRead]);

  const sendMutation = useMutation({
    mutationFn: async (text) => {
      if (!selected) throw new Error("No group selected");
      if (!isSupabaseConfigured || !supabase) throw new Error("Chat service is not configured yet.");
      const { error } = await supabase.from("messages").insert({
        plan_id: selected.id,
        user_id: user.id,
        content: text,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["my-groups-supabase", user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Could not send the message",
        description: error?.message || "Check permissions or try again.",
        variant: "destructive",
      });
    },
  });

  function handleSend() {
    if (!messageText.trim() || !selected || sendMutation.isPending) return;
    sendMutation.mutate(messageText.trim());
  }

  if (!user || isLoading) return <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[#060606] text-white">Loading...</div>;

  if (!groups.length) {
    return (
      <div className="h-[calc(100dvh-var(--header-height)-5.5rem)] overflow-hidden bg-[#060606] px-4 py-6">
        <div className="mx-auto flex h-full max-w-md items-center">
          <div className="w-full rounded-[30px] border border-white/10 bg-[#111] p-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-white/[0.04] text-[#efbf3a]"><MessageCircle className="h-10 w-10" /></div>
          <h1 className="mt-6 text-3xl font-black text-white">You have not joined any groups yet</h1>
          <p className="mt-3 text-sm leading-7 text-stone-400">When you like a plan in Discover or create one yourself, the group appears here automatically.</p>
          <Link to={createPageUrl("Descubrir")} className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-red-600 text-sm font-bold text-white">Go to Discover</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="groups-screen overflow-hidden bg-[#070707] text-white" style={{ height: "calc(100dvh - var(--header-height) - 5.5rem)" }}>
        <div className="mx-auto grid h-full max-w-6xl lg:grid-cols-[360px,1fr]">
          <aside className={`${mobileChatOpen ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-r border-white/6 bg-[#0f0f0f]`}>
            <div className="border-b border-white/6 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-[2rem] font-black tracking-tight text-white">My groups</h1>
                  <p className="mt-1 text-sm text-stone-400">Your real chats and pizza plans.</p>
                </div>
                <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm font-bold text-white">{visible.length}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setTab("upcoming")} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "upcoming" ? "bg-red-600 text-white" : "border border-white/10 bg-white/[0.04] text-stone-300"}`}>Upcoming</button>
                <button onClick={() => setTab("history")} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "history" ? "bg-red-600 text-white" : "border border-white/10 bg-white/[0.04] text-stone-300"}`}>History</button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 space-y-2">
              {visible.map((hangout) => (
                <GroupListItem key={hangout.id} group={hangout} unreadCount={unreadByGroup.get(hangout.id) || 0} active={selected?.id === hangout.id} onSelect={() => { setSelectedId(hangout.id); markGroupRead(hangout); setMobileChatOpen(true); }} />
              ))}
            </div>
          </aside>

          {selected ? (
            <section className={`${mobileChatOpen ? "flex" : "hidden lg:flex"} min-h-0 min-w-0 flex-col bg-[#0b0b0b]`}>
              <div className="flex items-center gap-3 border-b border-white/6 px-4 py-3">
                <button onClick={() => setMobileChatOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-stone-300 lg:hidden"><ArrowLeft className="h-4 w-4" /></button>
                <button onClick={() => setShowInfo(true)} className="min-w-0 flex-1 text-left">
                  <div className="truncate text-base font-black text-white">{selected.titulo}</div>
                  <div className="truncate text-sm text-stone-400">{selected.pizzeria_nombre}</div>
                </button>
                <a href={mapUrl(selected.place)} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-stone-300"><ExternalLink className="h-4 w-4" /></a>
                <button onClick={() => setShowInfo(true)} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-stone-300"><Info className="h-4 w-4" /></button>
              </div>

              <div className="border-b border-white/6 px-4 py-3 text-sm text-stone-300">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-violet-500/20 px-3 py-1 text-[11px] font-bold text-violet-200">{fmtDate(selected.plan_date, selected.plan_time)}</span>
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-200">{selected.participants.length} / {selected.max_participantes}</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-stone-200">Slice plan</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-stone-200">${Number(selected.place?.slice_price || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.12),transparent_24%),linear-gradient(180deg,#0b0b0b_0%,#0a0a0a_100%)] px-4 py-4 pb-4">
                <div className="mb-4 flex flex-wrap gap-2">
                  {selected.participants.map((person) => (
                    <Link to={`/profile/${person.id}`} key={person.id} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-stone-200 hover:bg-white/[0.08]">
                      <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-[#efbf3a] to-[#df5b43] text-[10px] font-bold text-white">{avatar(getPublicUsername(person))}</div>
                      {getPublicUsername(person)}
                    </Link>
                  ))}
                </div>
                <div className="space-y-3 pb-2">
                  {selected.messageList.map((message) => <MessageRow key={message.id} message={message} currentUserId={user.id} usersById={usersById} />)}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="shrink-0 border-t border-white/6 px-4 py-3 bg-[#0a0a0a]" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))", paddingLeft: "max(1rem, env(safe-area-inset-left))", paddingRight: "max(1rem, env(safe-area-inset-right))" }}>
                <div className="flex w-full items-center gap-2 rounded-[24px] border border-white/10 bg-[#121212] p-2">
                  <input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Write a message..."
                    className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-stone-500"
                  />
                  <button onClick={handleSend} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-600 text-white disabled:opacity-50" disabled={!messageText.trim() || sendMutation.isPending}>
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <div className="hidden items-center justify-center bg-[#0b0b0b] px-6 text-center text-stone-500 lg:flex">Select a group to open the chat.</div>
          )}
        </div>
      </div>
      <GroupInfoSheet group={selected} open={showInfo} onClose={() => setShowInfo(false)} />
    </>
  );
}
