# Design Guidelines: Coffee Shop Challenge - Public Wi-Fi Decision Simulator

## Design Approach

**Selected Approach:** Design System (Material Design) with gaming elements
**Justification:** This is a utility-focused educational tool requiring clarity, immediate feedback, and progressive disclosure. Material Design provides the structured foundation while gaming UI patterns add engagement.

## Core Design Principles

1. **Clear Decision Points** - Every choice must be visually distinct and consequences immediately understandable
2. **Progressive Disclosure** - Information revealed in digestible chunks matching the narrative flow
3. **Educational Transparency** - Risk scoring and feedback always visible and explained
4. **Gamification Without Distraction** - Engaging but never obscuring the learning objective

## Typography System

- **Primary Font:** Inter (Google Fonts) for clean readability
- **Accent Font:** Space Grotesk for headings and scenario titles
- **Hierarchy:**
  - Scenario titles: Space Grotesk, 2xl-3xl, semibold
  - Task descriptions: Inter, lg-xl, medium
  - Choice buttons: Inter, base-lg, medium
  - Consequence feedback: Inter, base, regular
  - Debrief explanations: Inter, sm-base, regular

## Layout System

**Spacing Units:** Tailwind 3, 4, 6, 8, 12, 16 for consistent rhythm
**Container Strategy:** max-w-4xl centered for game area, full-width for immersive scenario headers

**Screen Structure:**
- Fixed header (scenario context + current score)
- Main game area (network selection OR task prompt OR consequence screen)
- Persistent progress indicator footer

## Component Library

### Wi-Fi Network Selection Interface
- Card-based network list (each network as interactive card)
- Signal strength indicator (bars or dots - 1-5 strength)
- Network name (SSID) prominently displayed
- Lock icon for password-protected networks
- Subtle warning indicators for suspicious networks (beginner mode only)
- Hover state reveals additional details (encryption type, "Verified by staff" badge)

### Task Prompt Cards
- Icon representing task type (email, banking, download, payment)
- Clear description of what user needs to accomplish
- Action buttons (proceed, postpone, use VPN, switch network)
- Risk hint indicator (visible in beginner, hidden in advanced)

### Consequence Screens
- Two-column layout: left shows what happened (narrative), right shows technical explanation
- Color-coded severity (amber for warnings, red for serious consequences, green for safe choices)
- "What you did" → "Why risky/safe" → "Better alternative" progression
- Continue button to proceed

### Debrief/Scoring Display
- Real-time score tracker: Safety Points (green) vs Risk Points (amber)
- Badge visualization for achievements
- "What to do next time" quick tips sidebar
- Progress through difficulty levels shown as milestone markers

### Difficulty Level Selector
- Three clearly labeled options: Beginner, Intermediate, Advanced
- Visual differentiation: Beginner (shield icon), Intermediate (balance scale), Advanced (target/crosshair)
- Description of what changes at each level

## Visual Patterns

**Network List Presentation:**
- Vertical stack of network cards with 4-unit spacing
- Each card: p-6, rounded corners, subtle shadow
- Selected/hovered network: elevated shadow, border accent

**Choice Buttons:**
- Primary actions: filled buttons (Connect, Proceed, Confirm)
- Secondary actions: outlined buttons (Postpone, Ask Staff, Switch Network)
- Danger actions: outlined red buttons (Install Profile, Override Warning)

**Branching Narrative Visualization:**
- Breadcrumb trail showing scenario progress (Scene 1 → Choice → Consequence → Scene 2)
- Positioned at top of game area

**Feedback Mechanisms:**
- Immediate visual feedback on choice selection (brief animation, score change)
- Color-coded consequence banners (green success, amber warning, red danger)
- Progressive score bars (horizontal bars showing safety vs risk accumulation)

## Images

**No hero image needed.** This is an application interface, not a marketing page.

**Contextual Images:**
- Coffee shop/hotel lobby background image (subtle, low opacity behind game cards) for scene-setting
- Icon set for tasks (email, banking, download, payment) - use Heroicons
- Badge/achievement graphics (simple SVG illustrations - coffee cup, shield, padlock themes)

## Animation Guidelines

**Minimal and purposeful only:**
- Card selection: subtle scale and shadow change (100ms)
- Score updates: brief number count-up animation
- Consequence reveal: gentle fade-in of debrief content
- NO page transitions, NO floating elements, NO background effects

## Accessibility

- High contrast text on all backgrounds
- Clear focus indicators for keyboard navigation
- Screen reader labels for all interactive elements
- Risk indicators not relying solely on color (use icons + text)

## Responsive Behavior

- Desktop (lg+): Side-by-side consequence explanations, visible score tracker
- Tablet (md): Stacked consequence cards, persistent score in header
- Mobile (base): Single column, collapsible score details, larger touch targets for network/choice cards

## Key UX Patterns

- **No undo:** Choices are final (reinforces real-world consequences)
- **Mandatory debrief:** Cannot skip consequence explanation
- **Gated progression:** Must complete scenario before advancing difficulty
- **Transparent scoring:** Always show how points were calculated

This design creates a focused, educational experience that feels like a thoughtful simulation rather than a flashy game, prioritizing learning retention over entertainment.