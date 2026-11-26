import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, MapPin, BarChart3, Brain, Gauge, Sparkles, EyeOff } from 'lucide-react';
import { Portal } from '../../utils/autoPlacement';

// One-time guided tour for beta testers — explains the pin system, the Beta
// Viewer tabs, the MDL trainer and the resource limits. Fires automatically
// once per user (localStorage flag lives in BetaPinLayer) and is replayable
// from the "?" button in the Beta Viewer header.
const STEPS = [
  {
    Icon: Sparkles,
    title: 'Welcome, Beta Tester!',
    tint: 'from-violet-500 to-fuchsia-600',
    bullets: [
      'You get early features — and tools to shape them',
      'The red button stack (bottom corner) is your beta toolkit',
      'The slim edge tab collapses/restores it anytime',
    ],
  },
  {
    Icon: MapPin,
    title: 'Drop Pins',
    tint: 'from-red-500 to-rose-600',
    bullets: [
      'The big red + enters pin-drop mode — then click anywhere on the page',
      'Pin a bug, note or idea — click a real element to anchor the pin to it',
      'The "Private" checkbox makes a pin visible to admins only',
      'The number badge on the + button shows pins you have left today',
    ],
  },
  {
    Icon: EyeOff,
    title: 'Show / Hide Pins',
    tint: 'from-zinc-500 to-slate-600',
    bullets: [
      'The eye button toggles every pin on the page',
      'Hiding pins never deletes them — they just stop rendering',
    ],
  },
  {
    Icon: BarChart3,
    title: 'The Beta Viewer',
    tint: 'from-blue-500 to-indigo-600',
    bullets: [
      'Polls — vote on features the admins are considering',
      'Submissions — track feedback you sent through the beta widget',
      'My Pins — every pin you dropped, across all pages',
      'Chat — the beta chatroom for testers + admins',
    ],
  },
  {
    Icon: Brain,
    title: 'Help MDL (Train tab)',
    tint: 'from-emerald-500 to-teal-600',
    bullets: [
      'Pick A or B on suggestions the app is learning — names, units, categories',
      'Your votes bubble up to the admin review queue — you are the filter for bad data',
      'Terms the crowd likes get approved faster',
    ],
  },
  {
    Icon: Gauge,
    title: 'Limits & Score',
    tint: 'from-amber-500 to-orange-600',
    bullets: [
      'The Limits tab shows everything you can spend: pins per day, icon uploads, your contribution score',
      'Icons start at 5/day — share them globally (admin-approved) to earn more headroom',
      'Categories, units and icons you create can be donated to the MDL — approved terms raise your score',
    ],
  },
];

const BetaOnboarding = ({ open, onClose }) => {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  const close = () => { setStep(0); onClose(); };

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={close}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ type: 'spring', damping: 24, stiffness: 300 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className={`h-1.5 bg-gradient-to-r ${s.tint}`} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.tint} flex items-center justify-center shadow-lg shrink-0`}>
                      <s.Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">{s.title}</h3>
                      <p className="text-[11px] text-slate-400">Step {step + 1} of {STEPS.length}</p>
                    </div>
                  </div>
                  <button type="button" onClick={close} className="text-slate-500 hover:text-slate-300 shrink-0" title="Close guide">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  <motion.ul
                    key={step}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.18 }}
                    className="mt-4 space-y-2 min-h-[120px]"
                  >
                    {s.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full bg-gradient-to-r ${s.tint} shrink-0`} />
                        {b}
                      </li>
                    ))}
                  </motion.ul>
                </AnimatePresence>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex gap-1.5">
                    {STEPS.map((st, i) => (
                      <button
                        key={st.title}
                        type="button"
                        onClick={() => setStep(i)}
                        className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-white' : i < step ? 'w-1.5 bg-white/50' : 'w-1.5 bg-white/20'}`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {step > 0 && (
                      <button
                        type="button"
                        onClick={() => setStep((v) => v - 1)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-slate-200 hover:bg-white/20 transition-all"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Back
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={last ? close : () => setStep((v) => v + 1)}
                      className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:scale-105 active:scale-95 transition-all"
                    >
                      {last ? 'Got it!' : <>Next <ChevronRight className="w-3.5 h-3.5" /></>}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

export const betaOnboardingKey = (userId) => `beta_onboarding_v1_${userId || 'guest'}`;

export default BetaOnboarding;
