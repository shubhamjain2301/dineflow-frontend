# DineFlow — Frontend

Next.js 14 (App Router) frontend for the DineFlow collaborative pre-arrival ordering platform.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

The default values in `.env.local.example` point to a locally running backend:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

Update these values if your backend runs on a different host or port.

### 3. Start the development server

```bash
npm run dev
```

The app will be available at **http://localhost:3000**.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Build the production bundle |
| `npm run start` | Start the production server (requires `build` first) |
| `npm run lint` | Run ESLint |

---

## Key Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page — browse all restaurants |
| `/restaurant/[restaurantId]` | Restaurant menu + create Dining Group |
| `/session/[sessionId]` | Live Dining Group session (real-time shared cart) |
| `/dashboard/[restaurantId]` | Restaurant staff dashboard (live order management) |

---

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx                        # Root layout (dark theme, fonts, Toaster)
│   ├── page.tsx                          # Landing page
│   ├── restaurant/[restaurantId]/        # Restaurant detail + menu
│   ├── session/[sessionId]/              # Dining Group session view
│   └── dashboard/[restaurantId]/         # Staff dashboard
├── components/
│   ├── landing/                          # HeroSection, RestaurantCard, RestaurantGrid
│   ├── restaurant/                       # MenuSection, MenuItemCard, PrepTimeIndicator
│   ├── session/                          # SharedCart, CartItem, ParticipantList, etc.
│   ├── dashboard/                        # OrderCard, StatusBadge
│   └── ui/                              # Base UI components
├── hooks/
│   ├── useWebSocket.ts                   # Raw WebSocket lifecycle + reconnect
│   ├── useDiningSession.ts               # Session state from WS sync messages
│   └── useEtaCountdown.ts               # Live countdown timer
└── lib/
    ├── api.ts                            # Typed fetch wrappers for all REST endpoints
    ├── types.ts                          # Shared TypeScript interfaces
    └── utils.ts                          # getInitials, formatPrice, computeSubtotal
```

---

## Prerequisites

- **Node.js** 18 or later
- **npm** 9 or later
- The [DineFlow backend](../backend/README.md) running on `http://localhost:8000`
