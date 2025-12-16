# Coffee Shop Challenge - Public Wi-Fi Decision Simulator

## Overview

This is an interactive educational web application that teaches users about public Wi-Fi security risks through a gamified decision simulator. Users navigate realistic coffee shop and hotel scenarios where they must choose networks, complete tasks, and learn to recognize security threats. The application uses a scenario-based game engine with scoring, badges, and consequence feedback to reinforce safe networking habits.

The core educational goals are:
- Teach users to identify suspicious Wi-Fi networks
- Build instincts for avoiding sensitive activities on untrusted networks
- Demonstrate realistic consequences of poor security decisions (credential harvesting, session compromise, privacy leakage)
- Provide progressive difficulty levels (beginner, intermediate, advanced)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React useState for local game state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for transitions and feedback
- **Build Tool**: Vite with React plugin

The frontend follows a component-based architecture with:
- Game components (GameContainer, NetworkCard, TaskPromptCard, ConsequenceScreen, CompletionScreen)
- UI components from shadcn/ui library
- Custom hooks for theme management and mobile detection
- Game engine logic in `client/src/lib/gameEngine.ts`

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful endpoints under `/api/` prefix
- **Build**: esbuild for production bundling with selective dependency bundling

Key API endpoints:
- `GET /api/scenarios` - List available game scenarios
- `GET /api/scenarios/:id` - Get full scenario details
- `POST /api/sessions` - Create new game session
- `PATCH /api/sessions/:id` - Update session state
- `POST /api/progress/complete` - Save completed session (auth required)
- `GET /api/progress` - Get user's progress statistics (auth required)
- `GET /api/educator/analytics` - Get educator analytics (educator role required)
- `GET /api/educator/status` - Check if user has educator role (auth required)

### Data Storage
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Storage**: HybridStorage class - game sessions in-memory, completed sessions in PostgreSQL
- **Schema Location**: `shared/schema.ts` with Zod validation via drizzle-zod
- **Tables**:
  - `users` - User accounts with `is_educator` role flag
  - `sessions` - Auth session storage for Replit Auth
  - `completed_sessions` - Persisted game completions for progress tracking

### Authentication
- **Provider**: Replit Auth (OIDC-based)
- **Roles**: Regular users and Educators (`is_educator` flag in users table)
- **Educator promotion**: Must be done via direct database update (no self-promotion)

### Game Data Model
The game uses a scene-based state machine:
- **Scenarios**: Top-level game configurations with difficulty, location, and scene graphs
- **Scenes**: Individual game states (arrival, network_selection, task_prompt, consequence, completion)
- **Networks**: Wi-Fi network options with security attributes and risk levels
- **Tasks**: Actions players must complete with sensitivity ratings
- **Sessions**: Player progress tracking with scores, badges, and completed scenes

### Content Files (Educator-Editable)
Game content is separated from code for easy editing by educators:
- `content/scenarios/*.json` - Scenario definitions (one file per scenario)
- `content/badges.json` - Badge definitions and descriptions
- Loaded at server startup via `server/scenarioLoader.ts`

### Shared Code
The `shared/` directory contains code used by both frontend and backend:
- `schema.ts`: Database schema and Zod validation types
- `scenarios.ts`: Runtime scenario access via dynamic getters (loads from JSON)

### Internationalization (i18n)
Full i18n support with three languages:
- **English (en)**: Source locale (canonical keyset)
- **Latvian (lv)**: Full translation, first fallback
- **Russian (ru)**: Full translation with proper ICU pluralization

**Loading Strategy:** Bundled (all locales loaded at startup for instant switching)

**Fallback Chain:** User preference (localStorage) → Browser locale → Latvian → English

**Key Files:**
- `client/src/lib/i18n.ts` - i18next configuration with ICU support
- `client/src/lib/intlFormatters.ts` - Locale-aware number/date/duration formatting
- `client/src/locales/*.json` - Translation files (en.json, lv.json, ru.json)
- `client/src/components/LanguageSwitcher.tsx` - Language switcher UI
- `content/i18n-glossary.md` - Translation glossary (30+ terms)

**i18n Validation Tooling:**
- `node scripts/i18n-extract.js` - Extract translation keys from source code
- `node scripts/i18n-validate.js` - Validate key parity and ICU syntax across locales
- Run both: `node scripts/i18n-extract.js && node scripts/i18n-validate.js`

**CI Integration:**
- Run validation on every PR: `node scripts/i18n-validate.js` (exits 1 on failure)
- Validation fails on: invalid ICU syntax, missing keys, placeholder mismatch, empty values
- For pre-commit hooks, add: `node scripts/i18n-validate.js` to your workflow

**Key Naming Conventions:**
- Format: `namespace.screen.element.state`
- Examples:
  - `home.title` - Homepage title
  - `game.network.connect` - Game network connect button
  - `scenario.difficulty.beginner` - Scenario difficulty label
  - `errors.networkError` - Error messages
- Namespaces: common, nav, home, scenario, network, game, actions, consequence, completion, grades, tips, threats, aria, errors

**Translation Guidelines:**
- Use stable key-based IDs (e.g., `home.title`) not English text as keys
- Keep technical terms untranslated: Wi-Fi, VPN, SSID, WPA, HTTPS
- Use ICU MessageFormat for pluralization: `{count, plural, one {...} other {...}}`
- Russian requires all four plural forms: one, few, many, other
- Dev mode shows `[MISSING:key]` for untranslated strings
- Prod mode falls back gracefully to lv → en

## Recent Changes (December 2025)

### Code Quality Improvements
- **Removed duplicate sessions table** - Auth session table is now defined only in `server/auth.ts`
- **Fixed badge data access** - Use `getAvailableBadges()` getter function instead of deprecated array export
- **Rate limiting** - Session creation endpoints limited to 10 requests/minute per IP
- **Improved type safety** - Added proper TypeScript types, removed unsafe type assertions
- **Database indexes** - Added indexes on `completed_sessions.userId` and `completedAt`
- **Graceful shutdown** - Storage cleanup interval properly stops on SIGTERM/SIGINT

### API Usage Notes
- **Badge access**: Always use `getAvailableBadges()` from `shared/scenarios.ts` for runtime badge data
- **Scenario access**: Always use `getAvailableScenarios()` from `shared/scenarios.ts` for runtime scenario data
- **Analytics limits**: Educator analytics returns maximum 1000 sessions for performance

## External Dependencies

### UI Framework
- **shadcn/ui**: Pre-built accessible components using Radix UI primitives
- **Radix UI**: Underlying headless UI components (dialog, dropdown, tooltip, etc.)
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

### Database & ORM
- **Drizzle ORM**: Type-safe SQL query builder
- **PostgreSQL**: Target production database (via `connect-pg-simple` for sessions)
- **drizzle-zod**: Schema validation integration

### State & Data Fetching
- **TanStack React Query**: Server state management and caching
- **Zod**: Runtime type validation

### Animation & UX
- **Framer Motion**: Animation library for React
- **Embla Carousel**: Carousel component
- **Vaul**: Drawer component

### Build & Development
- **Vite**: Frontend build tool and dev server
- **esbuild**: Production server bundling
- **tsx**: TypeScript execution for development

### Fonts (Google Fonts)
- Inter / DM Sans: Primary body fonts
- Space Grotesk / Geist Mono: Display and monospace fonts
- Fira Code: Code display font