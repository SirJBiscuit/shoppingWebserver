import { useState, useEffect } from 'react';
import { Sparkles, MapPin, EyeOff, BarChart3, Vote, Send, Pin, MessagesSquare, Brain, Gauge, PanelRightClose, PartyPopper } from 'lucide-react';
import SpotlightTour from '../SpotlightTour';

// One-time guided tour for beta testers — spotlight walkthrough of the pin
// system, the Beta Viewer tabs, the MDL trainer and the resource limits.
// Fires automatically once per user (localStorage flag lives in
// BetaPinLayer) and is replayable from the "?" button in the Beta Viewer.
//
// Each step's `drive` payload is interpreted by BetaPinLayer — the tour
// opens the real viewer, flips real tabs, and even collapses/restores the
// stack, so the ring always lands on the live control.
const STEPS = [
  {
    icon: Sparkles,
    title: 'Welcome, Beta Tester!',
    description: 'Your beta toolkit',
    tint: 'from-violet-500 to-fuchsia-600',
    focusElement: '[data-beta-tour="stack"]',
    drive: { pollsOpen: false },
    instructions: [
      'You get early features — and tools to shape them',
      'This floating stack is your beta toolkit — it follows you on every page',
      'The red handle at the bottom collapses it to a slim edge tab',
    ],
  },
  {
    icon: BarChart3,
    title: 'The Beta Viewer',
    description: 'Your tester hub',
    tint: 'from-blue-500 to-indigo-600',
    focusElement: '[data-beta-tour="viewer"]',
    drive: { pollsOpen: false },
    instructions: [
      'This button opens the Beta Viewer — polls, your submissions, pins and chat',
      'A blue dot means an open poll is waiting for your vote',
      'Next — the tour opens it for you',
    ],
  },
  {
    icon: Vote,
    title: 'Polls',
    description: 'Vote on what gets built',
    tint: 'from-blue-500 to-indigo-600',
    focusElement: '[data-beta-tour="tab-votes"]',
    drive: { pollsOpen: true, tab: 'votes' },
    instructions: [
      'Admins push polls here — vote on features being considered',
      'Voting earns BTCS contribution points automatically',
    ],
  },
  {
    icon: Send,
    title: 'Submissions',
    description: 'Track your feedback',
    tint: 'from-cyan-500 to-sky-600',
    focusElement: '[data-beta-tour="tab-messages"]',
    drive: { pollsOpen: true, tab: 'messages' },
    instructions: [
      'Every message you send through the beta widget lands here',
      'Watch its status — admins reply and mark items handled',
    ],
  },
  {
    icon: Pin,
    title: 'My Pins',
    description: 'Everything you dropped',
    tint: 'from-rose-500 to-red-600',
    focusElement: '[data-beta-tour="tab-pins"]',
    drive: { pollsOpen: true, tab: 'pins' },
    instructions: [
      'Every pin you dropped, across all pages, lives here',
      'Remove one and it moves to history — nothing is lost',
    ],
  },
  {
    icon: MessagesSquare,
    title: 'Chat',
    description: 'Talk to testers + admins',
    tint: 'from-indigo-500 to-purple-600',
    focusElement: '[data-beta-tour="tab-chat"]',
    drive: { pollsOpen: true, tab: 'chat' },
    instructions: [
      'The beta chatroom — testers and admins share one channel',
      'Quick questions, screenshots and callouts all welcome',
    ],
  },
  {
    icon: Brain,
    title: 'Help MDL',
    description: 'Train the app\'s vocabulary',
    tint: 'from-emerald-500 to-teal-600',
    focusElement: '[data-beta-tour="tab-train"]',
    drive: { pollsOpen: true, tab: 'train' },
    instructions: [
      'Pick A or B on suggestions the app is learning — names, units, categories',
      'Your votes feed the admin review queue — you are the filter for bad data',
      'A/B votes count toward your BTCS score, same as polls',
    ],
  },
  {
    icon: Gauge,
    title: 'Limits & Score',
    description: 'What you can spend',
    tint: 'from-amber-500 to-orange-600',
    focusElement: '[data-beta-tour="tab-limits"]',
    drive: { pollsOpen: true, tab: 'limits' },
    instructions: [
      'Everything you can spend lives here: pins per day, icon uploads, your score',
      'Icons start at 5/day — share them globally to earn more headroom',
      'Terms you create can be donated to the MDL — approvals raise your score',
    ],
  },
  {
    icon: MapPin,
    title: 'Drop a Pin',
    description: 'Report right on the page',
    tint: 'from-red-500 to-rose-600',
    focusElement: '[data-beta-tour="pin-add"]',
    drive: { pollsOpen: false },
    instructions: [
      'The big red + enters pin-drop mode — then click anywhere on the page',
      'Pin a bug, note or idea — click a real element to anchor the pin to it',
      'The "Private" checkbox makes a pin visible to admins only',
      'The badge shows how many pins you have left today',
    ],
  },
  {
    icon: EyeOff,
    title: 'Show / Hide Pins',
    description: 'Toggle every pin',
    tint: 'from-zinc-500 to-slate-600',
    focusElement: '[data-beta-tour="toggle-pins"]',
    instructions: [
      'The eye button toggles every pin on the page',
      'Hiding pins never deletes them — they just stop rendering',
    ],
  },
  {
    icon: PanelRightClose,
    title: 'Collapse the Stack',
    description: 'Get it out of the way',
    tint: 'from-red-500 to-rose-600',
    focusElement: '[data-beta-tour="stack-restore"]',
    drive: { stackHidden: true },
    instructions: [
      'The red handle folds the stack to this slim edge tab',
      'Click the tab to bring the buttons back — it remembers your choice',
    ],
  },
  {
    icon: PartyPopper,
    title: 'You\'re Set!',
    description: 'Happy testing',
    tint: 'from-violet-500 to-fuchsia-600',
    focusElement: '[data-beta-tour="stack"]',
    drive: { stackHidden: false, pollsOpen: false },
    instructions: [
      'Replay this tour anytime from the ? button in the Beta Viewer header',
      'Drop pins, vote in polls, train the MDL — it all feeds your score',
    ],
  },
];

const BetaOnboarding = ({ open, onClose, onDrive }) => {
  const [step, setStep] = useState(0);

  // Restart from step 0 every time the guide is opened (initial or replay).
  useEffect(() => { if (open) setStep(0); }, [open]);

  if (!open) return null;
  const close = () => { setStep(0); onClose(); };

  return (
    <SpotlightTour
      steps={STEPS}
      step={step}
      onStepChange={setStep}
      onFinish={close}
      onSkip={close}
      onDrive={onDrive}
    />
  );
};

export const betaOnboardingKey = (userId) => `beta_onboarding_v1_${userId || 'guest'}`;

export default BetaOnboarding;
