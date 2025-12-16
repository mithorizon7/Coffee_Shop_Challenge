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