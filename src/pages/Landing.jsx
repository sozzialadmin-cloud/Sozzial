import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Download, Flame, Map, Pizza, Plus, Smartphone, Sparkles, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

const slides = [
  {
    eyebrow: 'Public map',
    title: 'Great slices, faster.',
    text: 'Open the map, compare price, rating and best slice, and find the spots worth your time.',
    icon: Map,
    tone: 'from-[#111111] via-[#181818] to-[#2b2b28]',
    accent: 'text-[#f3be35]',
    summary: 'Price + map',
  },
  {
    eyebrow: 'Discover plans',
    title: 'Swipe into plans you want.',
    text: 'Join real pizza meetups in seconds with a swipe experience that stays quick and focused.',
    icon: Flame,
    tone: 'from-[#2a140f] via-[#571d16] to-[#8f2c21]',
    accent: 'text-[#ffd6c9]',
    summary: 'Social swipe',
  },
  {
    eyebrow: 'Your account',
    title: 'Create plans and groups.',
    text: 'Publish places, save plans, join groups and keep the social layer organized from one account.',
    icon: Users,
    tone: 'from-[#173322] via-[#255334] to-[#3f744c]',
    accent: 'text-[#f4f0d7]',
    summary: 'Account + groups',
  },
];

const floatingSlices = [
  'left-[10%] top-[14%] h-10 w-10 rotate-[-10deg]',
  'right-[9%] top-[22%] h-7 w-7 rotate-[14deg]',
  'left-[17%] bottom-[28%] h-6 w-6 rotate-[22deg]',
  'right-[15%] bottom-[18%] h-9 w-9 rotate-[-18deg]',
];

export default function Landing() {
  const [index, setIndex] = useState(0);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installState, setInstallState] = useState('ready');
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const slide = useMemo(() => slides[index], [index]);
  const Icon = slide.icon;
  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone);

  useEffect(() => {
    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setInstallState('ready');
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setInstallState('installed');
      setShowInstallHelp(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const goTo = (next) => {
    if (next < 0 || next >= slides.length) return;
    setIndex(next);
  };

  const handleInstall = async () => {
    if (isStandalone || installState === 'installed') {
      setShowInstallHelp(true);
      return;
    }

    if (!installPrompt) {
      setShowInstallHelp(true);
      return;
    }

    setInstallState('installing');
    try {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice?.outcome === 'accepted') {
        setInstallState('installed');
        setShowInstallHelp(false);
      } else {
        setInstallState('ready');
        setShowInstallHelp(true);
      }
      setInstallPrompt(null);
    } catch {
      setInstallState('ready');
      setShowInstallHelp(true);
    }
  };

  return (
    <div className="relative h-dvh overflow-hidden bg-[#f5f0e7] text-[#111111]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(240,191,57,0.28),transparent_34%),linear-gradient(180deg,#fff8ea_0%,#f4ecdf_58%,#efe3d1_100%)]" />
      {floatingSlices.slice(0, 2).map((className, i) => (
        <motion.div
          key={className}
          aria-hidden="true"
          className={`pointer-events-none absolute rounded-[14px] border border-black/8 bg-[#fffaf1]/70 text-[#df5b43] shadow-[0_18px_38px_rgba(34,25,11,0.10)] backdrop-blur-sm ${className}`}
          animate={{ y: [0, i % 2 ? 12 : -10, 0], rotate: [0, i % 2 ? 8 : -7, 0] }}
          transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Pizza className="m-auto h-full w-[55%]" />
        </motion.div>
      ))}

      <div className="relative z-10 mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-y-auto overflow-x-hidden px-4 pb-3 pt-3">
        <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="shrink-0 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#f0bf39] text-[#111111] shadow-[0_16px_32px_rgba(240,191,57,0.22)]">
              <Pizza className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[clamp(1.65rem,6.6vw,2.1rem)] font-black leading-none tracking-tight">Sozzial</div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#8a8174]">spots, plans and passport</div>
            </div>
          </div>
        </motion.div>

        <div className="shrink-0 pb-3">
          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24, delay: 0.08 }}
            className="rounded-[26px] border border-black/10 bg-[#fffaf1]/90 p-2.5 shadow-[0_24px_60px_rgba(34,25,11,0.12)] backdrop-blur"
          >
            <motion.div
              key={slide.eyebrow}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.14}
              onDragEnd={(_, info) => {
                if (info.offset.x <= -80) goTo(index + 1);
                if (info.offset.x >= 80) goTo(index - 1);
              }}
              initial={{ opacity: 0, x: 22, scale: 0.985 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className={`relative flex min-h-[310px] flex-col overflow-hidden rounded-[22px] bg-gradient-to-br ${slide.tone} p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] min-[390px]:min-h-[336px]`}
            >
              <motion.div
                aria-hidden="true"
                className="absolute -right-12 -top-12 h-28 w-28 rounded-full border border-white/10 bg-white/10 blur-[1px] min-[390px]:h-32 min-[390px]:w-32"
                animate={{ scale: [1, 1.08, 1], opacity: [0.45, 0.7, 0.45] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                aria-hidden="true"
                className="absolute -bottom-16 left-8 h-28 w-28 rounded-full border border-white/10 bg-black/20 min-[390px]:h-36 min-[390px]:w-36"
                animate={{ y: [0, -10, 0], opacity: [0.35, 0.5, 0.35] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              />

              <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <motion.div layout className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/90 min-[390px]:text-[11px]">
                    <Sparkles className="h-3 w-3" />
                    {slide.eyebrow}
                  </motion.div>
                  <h1 className="mt-3 max-w-[14rem] text-[clamp(1.65rem,7.5vw,2.28rem)] font-black leading-[0.94] tracking-tight">
                    {slide.title}
                  </h1>
                </div>
                <motion.div whileHover={{ rotate: -5, scale: 1.05 }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/12 backdrop-blur-sm min-[390px]:h-12 min-[390px]:w-12">
                  <Icon className={`h-5 w-5 min-[390px]:h-6 min-[390px]:w-6 ${slide.accent}`} />
                </motion.div>
              </div>

              <p className="relative mt-3 max-w-[17rem] text-[13px] leading-6 text-white/82 min-[390px]:text-sm">{slide.text}</p>

              <div className="relative mt-3 grid grid-cols-3 gap-2">
                {['Installable', 'Fast map', 'Real plans'].map((item, i) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + i * 0.06 }}
                    className="rounded-2xl border border-white/10 bg-white/10 px-2 py-2 text-center text-[10px] font-bold text-white/78 backdrop-blur-sm min-[390px]:px-3 min-[390px]:text-[11px]"
                  >
                    {item}
                  </motion.div>
                ))}
              </div>

              <div className="relative mt-auto space-y-2.5 pt-3">
                <div className="grid grid-cols-3 gap-2">
                  {slides.map((item, i) => (
                    <button
                      key={item.eyebrow}
                      type="button"
                      onClick={() => setIndex(i)}
                      className={`rounded-2xl border px-3 py-2 text-left transition hover:-translate-y-0.5 ${
                        i === index ? 'border-white/22 bg-white/14 text-white' : 'border-white/10 bg-black/10 text-white/72'
                      }`}
                    >
                      <div className="text-[10px] font-black uppercase tracking-[0.18em]">0{i + 1}</div>
                      <div className="mt-1 text-xs leading-5">{item.summary}</div>
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  <div className="flex items-center justify-center gap-2" aria-label="Slide indicators">
                    {slides.map((item, i) => (
                      <button
                        key={`${item.eyebrow}-dot`}
                        type="button"
                        onClick={() => setIndex(i)}
                        className={`h-2.5 rounded-full transition-all duration-200 ${
                          i === index ? 'w-7 bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.08)]' : 'w-2.5 bg-white/35 hover:bg-white/60'
                        }`}
                        aria-label={`Go to slide ${i + 1}`}
                        aria-pressed={i === index}
                      />
                    ))}
                  </div>

                  <div className="mt-2 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">Swipe to see more</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.42 }} className="shrink-0 space-y-2.5">
          <Button
            type="button"
            onClick={handleInstall}
            className="h-12 w-full rounded-[17px] border-0 bg-[#111111] px-5 text-[15px] font-black text-white shadow-[0_18px_36px_rgba(17,17,17,0.18)] hover:bg-[#252525] min-[390px]:h-14"
          >
            {installState === 'installed' || isStandalone ? <Smartphone className="mr-2 h-5 w-5" /> : <Download className="mr-2 h-5 w-5" />}
            {installState === 'installing' ? 'Opening install...' : installState === 'installed' || isStandalone ? 'App installed' : 'Download the app'}
          </Button>
          <div className="grid grid-cols-2 gap-2.5">
            <Link to={createPageUrl('Home')}>
              <Button className="h-12 w-full rounded-[17px] border-0 bg-[#f0bf39] px-4 text-[15px] font-black text-[#111111] shadow-[0_18px_36px_rgba(240,191,57,0.22)] hover:bg-[#d9a826] min-[390px]:h-14">
                Map
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" className="h-12 w-full rounded-[17px] border-black/10 bg-[#fffaf1] px-4 text-[15px] font-semibold text-[#141414] hover:bg-white min-[390px]:h-14">
                Account
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showInstallHelp ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-end bg-black/35 px-4 pb-4 backdrop-blur-sm"
            onClick={() => setShowInstallHelp(false)}
          >
            <motion.div
              initial={{ y: 28, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 28, opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="mx-auto w-full max-w-[398px] rounded-[28px] border border-black/10 bg-[#fffaf1] p-5 shadow-[0_26px_70px_rgba(0,0,0,0.24)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#111111] text-[#f0bf39]">
                  <Smartphone className="h-6 w-6" />
                </div>
                <button type="button" onClick={() => setShowInstallHelp(false)} className="grid h-9 w-9 place-items-center rounded-full bg-[#f0e7d8] text-[#5f584e]">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <h2 className="mt-4 text-2xl font-black leading-tight tracking-tight">Install Sozzial on your phone</h2>
              <p className="mt-2 text-sm leading-6 text-[#6d665b]">
                If your browser does not show the install prompt, open the browser menu and choose Add to Home Screen. Sozzial will launch like an app with its own icon.
              </p>
              <div className="mt-4 grid gap-2">
                {['Tap Share or the browser menu', 'Choose Add to Home Screen', 'Open Sozzial from your home screen'].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm font-semibold text-[#141414]">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-[#f0bf39] text-[#111111]">
                      <Plus className="h-3.5 w-3.5" />
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
