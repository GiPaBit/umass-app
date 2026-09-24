/**
 * The guided tour shown once after onboarding (and replayable from Settings).
 * Pure data — `TutorialOverlay.jsx` walks this list and drives `App.jsx`'s
 * `tab` state to match each step's `tab`, so the tour narrates the real
 * screens rather than a mocked-up copy of them.
 *
 * `target` is a `data-tutorial` attribute value to spotlight; omitted steps
 * fall back to a centered, non-spotlit card (see `TutorialOverlay`).
 */
export const TUTORIAL_STEPS = [
  {
    id: 'brief',
    tab: 'today',
    target: 'brief',
    title: 'Your Daily Brief',
    body: "This is your daily brief — it sums up your assignments, events, the weather, and which dining halls are open right now.",
  },
  {
    id: 'settings',
    tab: 'today',
    target: 'settings-btn',
    title: 'Settings',
    body: 'Tap the gear anytime to change the app’s appearance, add or remove calendars, and customize what shows up in your brief.',
  },
  {
    id: 'assignments',
    tab: 'assignments',
    target: 'assignments-header',
    title: 'Assignments',
    body: 'Everything due from your connected calendars, sorted by date. Checking one off is local only — it never writes back to Canvas.',
  },
  {
    id: 'dining',
    tab: 'dining',
    target: 'dining-header',
    title: 'Dining',
    body: "Today’s menu and hours for every dining hall and cafe on campus, plus a map to find your way there.",
  },
  {
    id: 'rec',
    tab: 'rec',
    target: 'rec-header',
    title: 'Rec & Sports',
    body: 'RecWell facility hours and group fitness, or switch to Sports for your favorite teams’ games.',
  },
  {
    id: 'events',
    tab: 'events',
    target: 'events-header',
    title: 'Events',
    body: 'Campus events and sports games in one feed — quick-add your own with the button up top.',
  },
];
