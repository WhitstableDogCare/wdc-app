# Whitstable Dog Care — Care Manager

A local-first management app for [Whitstable Dog Care](https://whitstabledogcare.co.uk), a dog boarding and daycare business in Whitstable, Kent.

Built with Next.js 15, SQLite (via Prisma), and runs entirely on a local machine — no cloud hosting, no external database.

---

## Features

- **Dog profiles** — full care cards including feeding, medical, behaviour, and consent details
- **Bookings** — create and manage daycare and boarding bookings with conflict detection
- **Calendar** — visual week/month calendar with Google Calendar sync
- **Invoices** — auto-generated on booking, PDF export, email sending
- **Dashboard** — at-a-glance stats: today's dogs, upcoming bookings, unpaid invoices, revenue
- **Incidents** — log and track any incidents with root cause and prevention notes
- **Export** — data export tools for reporting
- **Tally sync** — import new client intake forms submitted via Tally
- **Dark mode** — warm dark theme, persisted in localStorage

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | SQLite via Prisma ORM |
| Styling | CSS custom properties + Tailwind CSS |
| Fonts | Merienda, Oswald, Open Sans (local) |
| Auth | Password-protected, cookie session |
| Email | Nodemailer |
| PDF | Puppeteer |
| Tests | Vitest |

---

## Getting Started

### Prerequisites

- Node.js 18+
- macOS (paths assume `~/Library/Application Support/`)

### Install

```bash
npm install
```

### Database setup

The database lives at `~/Library/Application Support/wdc-app/wdc.db`. Create the directory and push the schema:

```bash
mkdir -p ~/Library/"Application Support"/wdc-app
DATABASE_URL="file:///Users/$USER/Library/Application Support/wdc-app/wdc.db" npx prisma db push
```

> Always use `prisma db push`, never `prisma migrate dev` — migrate dev can reset data.

### Config file

Create `~/Library/Application Support/wdc-app/config.json` with your settings:

```json
{
  "password": "your-app-password",
  "businessName": "Whitstable Dog Care",
  "businessEmail": "your@email.com",
  "businessPhone": "01234 567890",
  "businessAddress": "Your Address, Whitstable, Kent",
  "googleCalendarId": "",
  "googleClientId": "",
  "googleClientSecret": "",
  "googleRefreshToken": "",
  "smtpHost": "",
  "smtpPort": 587,
  "smtpUser": "",
  "smtpPass": ""
}
```

### Run

```bash
npm run dev
```

Open [http://localhost:3003](http://localhost:3003) and sign in with the password set in your config.

---

## Project Structure

```
app/
  dashboard/       # Dashboard overview
  dogs/            # Dog profiles + detail pages
  bookings/        # Booking management
  calendar/        # Calendar view
  invoices/        # Invoice list (redirects to bookings)
  incidents/       # Incident log
  export/          # Data export
  settings/        # App settings
  sync/            # Tally form sync
  components/      # Shared UI components (Sidebar, Topbar, ui.tsx)
  api/             # API routes
prisma/
  schema.prisma    # Database schema
scripts/
  import-csv.ts    # One-time CSV import utility
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server on port 3003 |
| `npm run build` | Production build |
| `npm run test` | Run Vitest test suite |
| `npm run db:push` | Push schema changes to the database |
| `npm run db:generate` | Regenerate Prisma client |

---

## Notes

- Dog photos are stored in `public/photos/` and excluded from git
- The database file and config are excluded from git — they live in `~/Library/Application Support/wdc-app/` on the host machine
- This app is designed to run on a single trusted machine, not as a multi-user hosted service
