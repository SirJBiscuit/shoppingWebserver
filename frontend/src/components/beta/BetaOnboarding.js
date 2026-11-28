import { useState, useEffect } from 'react';
import { Sparkles, MapPin, EyeOff, BarChart3, Vote, Send, Pin, MessagesSquare, Brain, Gauge, PanelRightClose, PartyPopper, ShieldCheck, Inbox, Lightbulb, History } from 'lucide-react';
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
      'This tour and the red Beta replay button live only on the home page — the pin stack itself follows you everywhere',
      'The Beta Viewer inside the stack bundles polls, submissions, your pins and the chat',
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
      'This button opens the Beta Viewer — polls, submissions, your pins and chat',
      'The number badge shows your message threads — plus any open polls waiting on your vote',
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
      'Pin a bug, note or question — click a real element to anchor the pin to it',
      'Drop pins freely — problems you hit, spots you\'d do differently, places where something\'s missing',
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
      'Replay this tour from the red Beta button on the home page toolbar — or the ? in the Beta Viewer',
      'Make as many useful pins as you can — problems to fix, things you\'d do differently, ideas in the exact spot they belong',
      'Polls, pins and A/B picks all feed your BTCS score',
    ],
  },
];

// Admin variant — same machinery, spotlighting the Admin Viewer + rail
// tools instead of the tester popover tabs.
const ADMIN_STEPS = [
  {
    icon: ShieldCheck,
    title: 'Beta Controls (Admin)',
    description: 'Your tester-management toolkit',
    tint: 'from-violet-500 to-fuchsia-600',
    focusElement: '[data-beta-tour="stack"]',
    drive: { panelOpen: false },
    instructions: [
      'This floating stack is the beta toolkit — it follows you on every page',
      'On desktop a slim admin rail also rides the screen edge (inspect, ghosts, BTCS, MDL)',
      'The red handle at the bottom collapses the stack to a slim edge tab',
    ],
  },
  {
    icon: BarChart3,
    title: 'The Admin Viewer',
    description: 'Everything testers send you',
    tint: 'from-blue-500 to-indigo-600',
    focusElement: '[data-beta-tour="admin-viewer"]',
    drive: { panelOpen: false },
    instructions: [
      'Opens the Admin Viewer — pins, submissions, polls, ideas, history and chat',
      'The badge shows how many open pins need attention',
      'Next — the tour opens it for you',
    ],
  },
  {
    icon: Pin,
    title: 'Pins',
    description: 'Every tester report',
    tint: 'from-rose-500 to-red-600',
    focusElement: '[data-beta-tour="admin-tab-pins"]',
    drive: { panelOpen: true, adminTab: 'pins' },
    instructions: [
      'Every pin testers dropped, across all pages — search, filter and sort them',
      'Set status (open / in progress / fixed / hidden) or move pins to history',
      'Export generates a priority-ordered bug list for planning',
    ],
  },
  {
    icon: Inbox,
    title: 'Submissions',
    description: 'Tester messages',
    tint: 'from-cyan-500 to-sky-600',
    focusElement: '[data-beta-tour="admin-tab-messages"]',
    drive: { panelOpen: true, adminTab: 'messages' },
    instructions: [
      'Feedback testers sent through the beta widget lands here',
      'Reply and mark items handled — testers watch status in their viewer',
      'The test-submission box at the top posts as a tester so you can try the whole flow',
    ],
  },
  {
    icon: Vote,
    title: 'Polls',
    description: 'Push choices to testers',
    tint: 'from-blue-500 to-indigo-600',
    focusElement: '[data-beta-tour="admin-tab-polls"]',
    drive: { panelOpen: true, adminTab: 'polls' },
    instructions: [
      'Create a poll with options — it appears in every tester\'s Beta Viewer',
      'Votes earn testers BTCS points automatically',
    ],
  },
  {
    icon: Lightbulb,
    title: 'Ideas',
    description: 'The priority queue',
    tint: 'from-amber-500 to-orange-600',
    focusElement: '[data-beta-tour="admin-tab-ideas"]',
    drive: { panelOpen: true, adminTab: 'ideas' },
    instructions: [
      'Feature ideas ranked by priority — drag the queue or right-click to re-rank',
      'Export ideas to a priority-ordered file for roadmap planning',
    ],
  },
  {
    icon: History,
    title: 'History',
    description: 'Nothing is lost',
    tint: 'from-zinc-500 to-slate-600',
    focusElement: '[data-beta-tour="admin-tab-history"]',
    drive: { panelOpen: true, adminTab: 'history' },
    instructions: [
      'Removed and fixed pins live here — restorable anytime',
      'Ghost pins on the rail show where deleted pins used to sit',
    ],
  },
  {
    icon: MessagesSquare,
    title: 'Chat',
    description: 'One channel with testers',
    tint: 'from-indigo-500 to-purple-600',
    focusElement: '[data-beta-tour="admin-tab-chat"]',
    drive: { panelOpen: true, adminTab: 'chat' },
    instructions: [
      'The beta chatroom — admins and testers share one channel',
      'Quick questions, screenshots and callouts all in one place',
    ],
  },
  {
    icon: MapPin,
    title: 'Drop a Pin',
    description: 'Report right on the page',
    tint: 'from-red-500 to-rose-600',
    focusElement: '[data-beta-tour="pin-add"]',
    drive: { panelOpen: false },
    instructions: [
      'The big red + enters pin-drop mode — then click anywhere on the page',
      'Pin a bug, note or idea — click a real element to anchor the pin to it',
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
    description: 'Happy administering',
    tint: 'from-violet-500 to-fuchsia-600',
    focusElement: '[data-beta-tour="stack"]',
    drive: { stackHidden: false, panelOpen: false },
    instructions: [
      'Replay this tour anytime from the ? button in the Admin Viewer header',
      'Tester activity feeds BTCS — polls, pins and votes all count',
    ],
  },
];

const BetaOnboarding = ({ open, onClose, onDrive, variant = 'tester' }) => {
  const [step, setStep] = useState(0);

  // Restart from step 0 every time the guide is opened (initial or replay).
  useEffect(() => { if (open) setStep(0); }, [open]);

  if (!open) return null;
  const close = () => { setStep(0); onClose(); };

  return (
    <SpotlightTour
      steps={variant === 'admin' ? ADMIN_STEPS : STEPS}
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
