export const appNavigation = [
  {
    href: "/dashboard",
    label: "Dashboard",
    blurb: "Weekly planning and AI timing",
  },
  {
    href: "/account",
    label: "Account",
    blurb: "Audience, goals, and voice",
  },
  {
    href: "/accounts",
    label: "Account Linking",
    blurb: "Provider health and permissions",
  },
] as const;

export const workspaceSignals = [
  {
    label: "Calendar coverage",
    value: "18 slots",
    note: "Five day desktop planning board",
  },
  {
    label: "Connected apps",
    value: "4 ready",
    note: "Instagram, TikTok, Facebook, X",
  },
  {
    label: "AI review lane",
    value: "6 queued",
    note: "Media analysis and timing suggestions",
  },
] as const;

export const overviewCards = [
  {
    label: "Scheduled this week",
    value: "24 posts",
    note: "+6 from last planning cycle",
  },
  {
    label: "Connected channels",
    value: "4 platforms",
    note: "One workspace, multiple surfaces",
  },
  {
    label: "Media awaiting analysis",
    value: "9 assets",
    note: "Ready for AI timing guidance",
  },
  {
    label: "Approval turnaround",
    value: "14 hrs",
    note: "Average from brief to sign-off",
  },
] as const;

export const scheduleDays = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

export const scheduleTimes = [
  "08:00",
  "10:00",
  "12:00",
  "14:00",
  "16:00",
  "18:00",
] as const;

export const scheduledPosts = [
  {
    day: "Mon",
    time: "10:00",
    platform: "Instagram",
    title: "Founder workflow reel",
    caption: "Show the before and after of the weekly planner.",
    toneClass: "status-ok",
  },
  {
    day: "Tue",
    time: "12:00",
    platform: "Facebook",
    title: "Community launch post",
    caption: "Drive comments with a clear audience hook.",
    toneClass: "status-info",
  },
  {
    day: "Wed",
    time: "08:00",
    platform: "X",
    title: "Hook + thread opener",
    caption: "Lead with the outcome, then unpack the workflow.",
    toneClass: "status-warn",
  },
  {
    day: "Thu",
    time: "14:00",
    platform: "TikTok",
    title: "Quick scheduling walkthrough",
    caption: "Clip the product demo into a faster cadence.",
    toneClass: "status-ok",
  },
  {
    day: "Fri",
    time: "16:00",
    platform: "Instagram",
    title: "Analytics proof carousel",
    caption: "End the week with performance receipts.",
    toneClass: "status-info",
  },
  {
    day: "Sun",
    time: "12:00",
    platform: "Facebook",
    title: "Next week preview",
    caption: "Seed the upcoming campaign before Monday.",
    toneClass: "status-muted",
  },
] as const;

export const connectedPlatforms = [
  {
    name: "Instagram",
    handle: "@ritmiohq",
    health: "Creative assets healthy",
    toneClass: "status-ok",
  },
  {
    name: "TikTok",
    handle: "@ritmiotips",
    health: "Needs fresh vertical cuts",
    toneClass: "status-warn",
  },
  {
    name: "Facebook",
    handle: "Ritmio Studio",
    health: "Community cadence balanced",
    toneClass: "status-info",
  },
  {
    name: "X",
    handle: "@ritmioapp",
    health: "Hooks outperforming replies",
    toneClass: "status-ok",
  },
] as const;

export const uploadChecklist = [
  "Drop image, video, or carousel drafts into the intake lane.",
  "Add campaign context and audience signal before review.",
  "Let AI suggest the best publish window per platform.",
] as const;

export const recommendationCards = [
  {
    title: "Best window for the founder reel",
    detail: "Tuesday, 10:30 AM MT on Instagram",
    note: "Visual education content is currently peaking mid-morning.",
  },
  {
    title: "Repurpose the analytics proof point",
    detail: "Thursday, 12:15 PM MT on X",
    note: "Short commentary threads are outperforming static screenshots.",
  },
  {
    title: "Hold the TikTok cut for later",
    detail: "Friday, 2:45 PM MT",
    note: "Short-form demo clips have stronger completion rates late afternoon.",
  },
] as const;

export const authHighlights = [
  {
    value: "Desktop-first",
    label: "Design the full planning flow before the mobile layer.",
  },
  {
    value: "Single weekly board",
    label: "See every channel and every slot in one calendar.",
  },
  {
    value: "Media-to-schedule loop",
    label: "Upload assets, get AI timing guidance, place them fast.",
  },
  {
    value: "Identity-driven AI",
    label: "Profile the artist or brand first so recommendations start from the right voice.",
  },
] as const;

export const onboardingSteps = [
  {
    step: "Step 1",
    title: "Tell Ritmio who you are",
    body: "Band, solo artist, influencer, chef, venue, or another creator-led brand. This becomes the base layer for voice and timing.",
  },
  {
    step: "Step 2",
    title: "Define what social is for",
    body: "Choose the outcomes that matter most: grow fandom, sell tickets, drive streams, fill reservations, or land collaborations.",
  },
  {
    step: "Step 3",
    title: "Prioritize your channels",
    body: "Tell the app which platforms deserve the best slots and which ones should inherit lighter repurposed content.",
  },
  {
    step: "Step 4",
    title: "Connect accounts and content lanes",
    body: "Stage provider links, review permissions, and decide what each channel is actually allowed to publish.",
  },
  {
    step: "Step 5",
    title: "Get first recommendations",
    body: "Generate starter timing, cadence, and caption guidance before the first weekly board is filled out.",
  },
] as const;

export const identityTypes = [
  "Band",
  "Solo artist",
  "Influencer",
  "Chef or restaurant",
  "Venue or event brand",
  "Creator business",
] as const;

export const presenceGoals = [
  "Grow fandom",
  "Sell tickets",
  "Drive streams",
  "Fill reservations",
  "Promote launches",
  "Build community",
  "Book collaborations",
  "Move merch",
] as const;

export const audienceSignals = [
  {
    title: "Primary audience",
    value: "18-34 indie music fans in Denver, Austin, and Chicago",
  },
  {
    title: "Desired perception",
    value: "Intimate, cinematic, worth following even between releases",
  },
  {
    title: "Priority action",
    value: "Save the track, buy tickets, and share the live moment",
  },
] as const;

export const voiceAttributes = [
  "Personal",
  "Hype without cringe",
  "Playful in captions",
  "Behind-the-scenes friendly",
  "Cinematic on launches",
  "Community-first replies",
] as const;

export const contentPillars = [
  {
    title: "Live moments",
    body: "Show clips from rehearsals, gigs, crowd reactions, and the atmosphere around the event.",
  },
  {
    title: "Making the work",
    body: "Studio sessions, creative process, drafts, mistakes, and the human side of building the art.",
  },
  {
    title: "Fan connection",
    body: "Q&A prompts, comments worth replying to, duets, fan shoutouts, and community-led stories.",
  },
  {
    title: "Promotion with taste",
    body: "Tickets, merch, drops, launches, and calls to action that still feel on-brand.",
  },
] as const;

export const platformPriorities = [
  {
    platform: "Instagram",
    priority: "Primary",
    role: "Visual identity, reels, polished launch moments",
  },
  {
    platform: "TikTok",
    priority: "Primary",
    role: "Discovery, personality, rougher short-form performance clips",
  },
  {
    platform: "Facebook",
    priority: "Secondary",
    role: "Events, local community, older fan retention",
  },
  {
    platform: "X",
    priority: "Secondary",
    role: "Fast hooks, commentary, release-day updates, conversations",
  },
] as const;

export const recommendationInputs = [
  {
    label: "Geography",
    value: "Mountain + Central time fans matter most",
    note: "Use audience geography before generic platform averages.",
  },
  {
    label: "Cadence",
    value: "3 anchor posts + 4 lighter touch points",
    note: "Avoid overposting when the content quality drops.",
  },
  {
    label: "Approval style",
    value: "Founder reviews launches only",
    note: "Everyday content should move faster than release content.",
  },
  {
    label: "Quiet hours",
    value: "No auto-posts after midnight local",
    note: "Respect the brand’s energy and team availability.",
  },
] as const;

export const onboardingPreview = [
  {
    title: "Detected profile",
    body: "Band with live-performance priority and growth tied to ticket sales plus streaming spikes.",
  },
  {
    title: "Suggested starting platforms",
    body: "Instagram and TikTok get first-class windows. Facebook supports event promotion. X supports release-day commentary.",
  },
  {
    title: "Starter cadence",
    body: "Two personality posts, one live clip, one promotional push, and one fan-interaction moment each week.",
  },
] as const;

export const futureIdeas = [
  {
    title: "Release mode",
    body: "Flip the workspace into a short campaign mode around singles, albums, tours, menus, launches, or creator drops.",
  },
  {
    title: "Geo-aware timing",
    body: "Bias recommendations toward the cities and regions that actually matter for shows, pop-ups, or reservations.",
  },
  {
    title: "Fan or customer loops",
    body: "Prompt reposts, comment replies, UGC follow-ups, and community moments instead of treating social as one-way broadcasting.",
  },
  {
    title: "Persona memory",
    body: "Remember the tone, topics, and ambitions set during onboarding so the app stays strategically consistent over time.",
  },
] as const;

export const accountProviders = [
  {
    name: "Instagram",
    status: "Ready to connect",
    toneClass: "status-ok",
    description: "Best for reels, carousels, and polished launch visuals.",
    permissions: ["Media publish", "Caption variants", "Carousel support"],
    formats: ["Image", "Video", "Carousel"],
    sync: "Profiles and asset rules reviewed every morning",
  },
  {
    name: "TikTok",
    status: "Needs content policy review",
    toneClass: "status-warn",
    description: "Short-form storytelling with stronger trend timing pressure.",
    permissions: ["Video publish", "Trend hooks", "Creator briefs"],
    formats: ["Vertical video"],
    sync: "Review audio and creator notes before activation",
  },
  {
    name: "Facebook",
    status: "Page healthy",
    toneClass: "status-info",
    description: "Broader community posts and link-forward campaign updates.",
    permissions: ["Page posting", "Comment tracking", "Community sync"],
    formats: ["Image", "Video", "Document"],
    sync: "Sync page and moderation settings with workspace defaults",
  },
  {
    name: "X",
    status: "Thread lane configured",
    toneClass: "status-ok",
    description: "Fast-moving commentary, short updates, and launch hooks.",
    permissions: ["Single posts", "Thread planning", "UTM guardrails"],
    formats: ["Text", "Image", "Video"],
    sync: "Hook testing logic shared with the weekly planner",
  },
] as const;

export const connectionChecklist = [
  "Confirm the brand account handle and profile destination.",
  "Choose the media formats allowed for each workspace lane.",
  "Set approval rules before enabling automated publishing.",
  "Review token health, fallback captions, and retry behavior.",
] as const;

export const automationGuardrails = [
  {
    title: "Approval before publish",
    body: "Require sign-off for launches, paid campaigns, and partner content.",
  },
  {
    title: "Fallback time windows",
    body: "If a slot becomes unavailable, hold the draft instead of auto-posting blind.",
  },
  {
    title: "Caption versioning",
    body: "Store platform-specific edits separately so each channel keeps its own voice.",
  },
] as const;
