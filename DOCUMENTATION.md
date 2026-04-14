# Whitstable Dog Care App — Documentation

A local-first Next.js app for managing Whitstable Dog Care's dog boarding and daycare business. Handles dog profiles, bookings, invoicing, trials, incident reports, and Google Calendar sync.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [App Structure](#app-structure)
3. [Features](#features)
4. [Database & Models](#database--models)
5. [Pages](#pages)
6. [API Routes](#api-routes)
7. [Integrations](#integrations)
8. [Configuration](#configuration)
9. [Backup & Export](#backup--export)
10. [Outstanding Tasks](#outstanding-tasks)

---

## Getting Started

**Run the dev server:**
```bash
npm run dev
```
The app runs on **http://localhost:3004** (also accessible on the local network via your machine's IP).

**Push schema changes to the database:**
```bash
DATABASE_URL="file:///Users/jack/Library/Application Support/wdc-app/wdc.db" npx prisma db push
```
> ⚠️ Always use `prisma db push`, never `prisma migrate dev` — migrate dev can wipe data.

**Other scripts:**
| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server on port 3004 |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:push` | Sync Prisma schema to the database |
| `npm run db:generate` | Regenerate Prisma client |

---

## App Structure

```
DogCareApp/
├── app/                        # Next.js app directory
│   ├── api/                    # API routes (server-side)
│   │   ├── dogs/               # Dog CRUD + trials + photos
│   │   ├── bookings/           # Bookings + capacity + calendar sync
│   │   ├── invoices/           # Invoicing + email sending
│   │   ├── incidents/          # Incident reports
│   │   ├── calendar/           # Google Calendar OAuth + events
│   │   ├── tally/              # Tally form sync + import
│   │   ├── config/             # App configuration
│   │   ├── dashboard/          # Stats and analytics
│   │   ├── backup/             # DB backup and JSON export
│   │   └── export/             # Booking exports
│   ├── components/             # Shared UI components
│   ├── bookings/               # Bookings pages
│   ├── calendar/               # Calendar view
│   ├── dashboard/              # Dashboard page
│   ├── dogs/                   # Dog profile pages
│   ├── export/                 # Export/print pages
│   ├── incidents/              # Incident pages
│   ├── invoices/               # Invoice pages
│   ├── settings/               # Settings page
│   ├── sync/                   # Tally sync page
│   ├── layout.tsx              # Root layout + navigation
│   └── page.tsx                # Home — dog profiles gallery
├── components/
│   └── DogForm.tsx             # Full dog profile form (shared)
├── lib/
│   ├── config.ts               # Read/write config.json
│   ├── prisma.ts               # Prisma client singleton
│   ├── google-calendar.ts      # Google Calendar helpers (private + public calendar)
│   ├── public-calendar.ts      # Public availability calendar sync logic (event names: Spaces Available / Fully Booked / Unavailable)
│   └── invoice-html.ts         # Invoice HTML template
├── instrumentation.ts              # Runs on server start — triggers daily public calendar auto-sync
├── prisma/
│   └── schema.prisma           # Database schema
└── public/
    └── wdc-logo.png
```

**Key file locations:**
| Item | Location |
|------|----------|
| SQLite database | `~/Library/Application Support/wdc-app/wdc.db` |
| Config file | `~/Library/Application Support/wdc-app/config.json` |
| Dog photos | `DogCareApp/public/photos/` |

---

## Features

| Feature | Description |
|---------|-------------|
| **Dog Profiles** | Full profiles with behaviour, feeding, medical, consent, and equipment details |
| **Bookings** | Boarding and daycare bookings with capacity enforcement (max 5/day) and recurring support |
| **Invoicing** | Auto-numbered invoices, payment status tracking, email sending, tax year totals |
| **Trial Reviews** | Boarding/daycare trial records with pass/fail outcomes and detailed notes |
| **Incident Reports** | Document accidents/incidents with root cause analysis |
| **Unavailable Periods** | Block out dates when the business is not accepting bookings (holidays, illness, etc.) with overlap warnings. Managed from the Bookings page (Unavailable tab) |
| **Public Availability Calendar** | Anonymised daily events pushed to a public Google Calendar. Every day shows either "Spaces Available" (green/yellow), "Fully Booked" (red), or "Unavailable" (grey). Auto-synced on startup and every 24 hours covering 12 months ahead |
| **Google Calendar Sync** | Bidirectional sync — bookings pushed to calendar; calendar events imported as bookings |
| **Unified Calendar View** | Calendar page shows dog bookings, personal calendar events, family calendar events, and Google Tasks in a day-by-day view for the next 28 days |
| **Google Tasks** | Tasks visible in the calendar. Can be created and checked off directly in the app |
| **Tally Form Sync** | New client registrations from Tally form auto-imported as dog profiles |
| **Dark Mode** | Toggle between light and dark themes |
| **PDF Export** | Export dog profiles, trial reports, and invoices to PDF |
| **Email** | Booking confirmation emails and invoice delivery via Gmail |
| **Backup** | One-click database backup saved to Google Drive |
| **Dashboard** | Stats on dog counts, breeds, vaccination status, revenue, and upcoming bookings |

---

## Database & Models

**Type:** SQLite, managed by Prisma ORM.

---

### Dog
The core entity. Stores everything about a dog.

| Field Group | Fields |
|-------------|--------|
| Identity | `id`, `name`, `breed`, `age`, `birth_date`, `sex`, `neutered`, `microchip_number`, `photo_path` |
| Behaviour | `gets_along_with_cats`, `good_with_children`, `energy_level`, `special_behaviours`, `off_lead` |
| Feeding | `feeding_schedule`, `food_type`, `portion_size`, `treats_allowed`, `food_and_treats`, `dietary_requirements` |
| Care | `exercise_needs`, `favourite_activities`, `sleeping_arrangements`, `dog_commands` |
| Medical | `medical_requirements`, `vaccination_date`, `flea_worm_date` |
| Consents | `consent_daily_activities`, `concerns_daily_activities`, `consent_social_media`, `consent_communication` |
| Equipment | `equipment_provided`, `equipment_wdc` |
| Status | `archived`, `created_at`, `updated_at` |

**Relations:** owners, vets, buddies, tally_submissions, invoices, bookings, trial_reviews, incidents

---

### Owner
Contact info for a dog's owner(s). Multiple owners per dog supported.
- `name`, `phone`, `emergency_phone`, `address`, `email`

### Vet
Vet contact info linked to a dog.
- `name`, `phone`, `emergency_phone`, `address`, `email`

### Buddy
Emergency/buddy contacts for a dog.
- `name`, `phone`, `emergency_phone`, `address`, `email`, `is_primary`

---

### Booking
A booking for boarding or daycare.

| Field | Description |
|-------|-------------|
| `booking_type` | `Boarding` or `Daycare` |
| `service_type` | `Half Day Care`, `Full Day Care`, `Long Day Care`, `Overnight` |
| `rate_type` | `Standard` or `Peak` |
| `status` | `Confirmed` or `Cancelled` |
| `start_date` / `end_date` | Booking dates |
| `drop_off_time` / `pick_up_time` | Times as strings |
| `is_recurring` | Whether it repeats weekly |
| `day_of_week` | For recurring bookings |
| `google_event_id` | Linked Google Calendar event |
| `confirmation_sent` | Whether confirmation email was sent |

---

### Invoice
Financial records.

| Field | Description |
|-------|-------------|
| `invoice_number` | Unique, auto-generated (started at 0061) |
| `status` | `Unpaid` or `Paid` |
| `services` | JSON array of line items |
| `total` | Total amount |
| `apply_discount` | Whether a discount is applied |
| `invoice_date` / `due_date` / `paid_date` | Key dates |
| `client_name/email/phone/address` | Client details |
| `dog_name` / `dog_breed` | Dog details at time of invoice |

---

### TrialReview
A trial boarding or daycare visit assessment.

| Field | Description |
|-------|-------------|
| `trial_type` | `Boarding` or `Daycare` |
| `outcome` | `Passed`, `Failed`, or `Pending` |
| `start_datetime` / `end_datetime` | Trial period |
| `completed_by` | Staff member name |
| `dogs_mixed_with` | Which other dogs were present |
| Notes sections | `behaviour_notes`, `toileting_notes`, `appetite_notes`, `sleeping_notes`, `walks_notes`, `health_notes`, `actions_notes` |

---

### Incident
An accident or incident report.

| Field | Description |
|-------|-------------|
| `incident_date` / `incident_time` | When it happened |
| `location` | Where it happened |
| `description` | What happened |
| `witnesses` | Who witnessed it |
| `root_causes` | Analysis of why it happened |
| `prevention_measures` | Steps to prevent recurrence |
| `completed_by` | Staff member |

---

### TallySubmission
Raw storage for Tally form submissions before they're imported as dog profiles.
- `submission_id` (unique), `raw_data` (JSON), `imported_at`, linked `dog_id` (once imported)

---

### UnavailablePeriod
Dates when the business is not accepting bookings.

| Field | Description |
|-------|-------------|
| `start_date` | First day of the unavailable period (YYYY-MM-DD) |
| `end_date` | Last day of the unavailable period (inclusive) |
| `reason` | One of: `Holiday`, `Illness`, `Personal`, `Other` |
| `created_at` | When the record was created |

---

## Pages

| URL | Purpose |
|-----|---------|
| `/` | Dog profiles gallery with search and filtering |
| `/dogs/new` | Create a new dog profile |
| `/dogs/[id]` | View full dog profile |
| `/dogs/[id]/edit` | Edit dog profile |
| `/dashboard` | Stats, upcoming bookings, revenue overview |
| `/bookings` | Bookings, invoices, and unavailable periods in tabbed view (3 tabs) |
| `/bookings/new` | Create a new booking |
| `/bookings/[id]` | View booking details |
| `/bookings/[id]/edit` | Edit a booking |
| `/invoices/new` | Create a new invoice |
| `/invoices/[id]` | View invoice |
| `/invoices/[id]/edit` | Edit invoice |
| `/incidents/new` | File an incident report |
| `/incidents/[id]` | View an incident report |
| `/calendar` | Unified calendar — day-by-day view (next 28 days) mixing dog bookings, personal/family Google Calendar events, and Google Tasks. Month-grouped view for bookings beyond 28 days |
| `/export` | Export dog profiles and trial reports to PDF |
| `/export/invoices` | Export invoices to PDF |
| `/settings` | App settings, config, backup |
| `/sync` | Tally form sync and import tool |

---

## API Routes

### Dogs — `/api/dogs`

| Method | Endpoint | Action |
|--------|----------|--------|
| GET | `/api/dogs` | List all dogs (`?includeArchived=true` for archived) |
| POST | `/api/dogs` | Create dog |
| GET | `/api/dogs/[id]` | Get dog with all relations |
| PUT | `/api/dogs/[id]` | Update dog |
| DELETE | `/api/dogs/[id]` | Delete dog |
| POST | `/api/dogs/[id]/photo` | Upload photo |
| GET | `/api/dogs/[id]/trials` | List trial reviews |
| POST | `/api/dogs/[id]/trials` | Create trial review |
| PUT | `/api/dogs/[id]/trials/[trialId]` | Update trial |
| DELETE | `/api/dogs/[id]/trials/[trialId]` | Delete trial |
| GET | `/api/dogs/trials-summary` | Trial eligibility summary for all dogs |

### Bookings — `/api/bookings`

| Method | Endpoint | Action |
|--------|----------|--------|
| GET | `/api/bookings` | List bookings (filterable by status/dogId) |
| POST | `/api/bookings` | Create booking + send confirmation email + sync to Google Calendar + update public calendar |
| GET | `/api/bookings/[id]` | Get booking |
| PUT | `/api/bookings/[id]` | Update booking + update public calendar for old and new date ranges |
| DELETE | `/api/bookings/[id]` | Cancel booking + update public calendar |
| POST | `/api/bookings/[id]/sync-calendar` | Sync specific booking to Google Calendar |
| GET | `/api/bookings/capacity` | Check daily capacity (max 5 confirmed bookings) |
| GET | `/api/bookings/import-calendar` | Preview calendar import |
| POST | `/api/bookings/import-calendar` | Import bookings from Google Calendar |

### Unavailable Periods — `/api/unavailable-periods`

| Method | Endpoint | Action |
|--------|----------|--------|
| GET | `/api/unavailable-periods` | List all unavailable periods (ordered by start date) |
| POST | `/api/unavailable-periods` | Create a period — validates dates and reason, returns any overlapping confirmed bookings as a warning (non-blocking) + updates public calendar |
| DELETE | `/api/unavailable-periods/[id]` | Delete a period + updates public calendar |

**POST body:**
```json
{ "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "reason": "Holiday" }
```
Valid reasons: `Holiday`, `Illness`, `Personal`, `Other`

### Public Calendar — `/api/public-calendar`

| Method | Endpoint | Action |
|--------|----------|--------|
| POST | `/api/public-calendar/sync` | Recalculate and rewrite all public calendar events from today through the next 365 days |

### Invoices — `/api/invoices`

| Method | Endpoint | Action |
|--------|----------|--------|
| GET | `/api/invoices` | List all invoices |
| POST | `/api/invoices` | Create invoice (auto-generates number) |
| GET | `/api/invoices/[id]` | Get invoice |
| PUT | `/api/invoices/[id]` | Update invoice |
| DELETE | `/api/invoices/[id]` | Delete invoice |
| POST | `/api/invoices/[id]/email` | Send invoice by email |

### Incidents — `/api/incidents`

| Method | Endpoint | Action |
|--------|----------|--------|
| GET | `/api/incidents` | List all incidents |
| POST | `/api/incidents` | Create incident report |
| GET | `/api/incidents/[id]` | Get incident |
| PUT | `/api/incidents/[id]` | Update incident |
| DELETE | `/api/incidents/[id]` | Delete incident |

### Calendar — `/api/calendar`

| Method | Endpoint | Action |
|--------|----------|--------|
| GET | `/api/calendar` | Fetch and parse Google Calendar events (expands recurring events) |
| GET | `/api/calendar/auth` | Start Google OAuth flow |
| GET | `/api/calendar/auth/callback` | Handle OAuth callback |
| GET | `/api/calendar/unified` | Fetch personal calendar events, family calendar events, and Google Tasks for a date range. Query params: `start`, `end` (YYYY-MM-DD) |

### Tasks — `/api/tasks`

| Method | Endpoint | Action |
|--------|----------|--------|
| POST | `/api/tasks` | Create a task in the default Google Tasks list. Body: `{ title, due? }` (due is YYYY-MM-DD, omit to show under today) |
| PATCH | `/api/tasks/[id]` | Mark a task as complete. Body: `{ tasklistId }` |

### Tally Sync — `/api/tally`

| Method | Endpoint | Action |
|--------|----------|--------|
| GET | `/api/tally/sync` | Fetch new submissions from Tally |
| POST | `/api/tally/sync` | Save Tally API key |
| POST | `/api/tally/import/[submissionId]` | Import a submission as a new/existing dog |
| DELETE | `/api/tally/cleanup` | Remove dogs named "Unknown" |
| GET | `/api/tally/debug` | View raw field data from a submission |

### Other

| Endpoint | Action |
|----------|--------|
| `GET /api/dashboard` | Stats: dog count, photos, sex/neuter split, energy levels, top breeds, vaccination status |
| `GET /api/config` | Fetch config |
| `PUT /api/config` | Update config |
| `GET /api/backup` | List recent backups |
| `POST /api/backup` | Create a backup |
| `GET /api/backup/db` | Download raw SQLite database |
| `GET /api/backup/json` | Export all data as JSON |
| `POST /api/backup/save-to-folder` | Save backup to Google Drive WDC Backups folder |
| `GET /api/export/bookings` | Export bookings for a date range |

---

## Integrations

### Google Calendar

**Private calendar (bookings):**
- OAuth 2.0 authentication (client ID, secret, and refresh token stored in config)
- Bookings are pushed to Google Calendar when created
- Calendar events are parsed back into bookings on the import page
- Supports event title prefixes: `Boarding:`, `Daycare:`, `Boarding Trial:`, `Daycare Trial:`
- Recurring events are expanded over a 2-year window
- Dog name aliases handled: `Vinnie → Vinny`, `Whiskey → Royski`, `Lilly → Lilly`

**Public availability calendar:**
- A separate Google Calendar showing anonymised availability — no personal details ever written
- One all-day event per day for every day in the next 12 months
- Event titles and colours:
  - `Spaces Available` — Green (Sage, colorId `2`) when 3–5 spaces remain
  - `Spaces Available` — Yellow (Banana, colorId `5`) when 1–2 spaces remain
  - `Fully Booked` — Red (Tomato, colorId `10`) when at capacity
  - `Unavailable` — Grey (Graphite, colorId `11`) — unavailable period
- Event descriptions: e.g. `All 5 spaces available`, `3 spaces remaining`, `No spaces remaining`, or the unavailable reason (e.g. `Holiday`)
- Recalculated automatically when bookings or unavailable periods are created, edited, or deleted
- **Auto-syncs on app startup and every 24 hours** via `instrumentation.ts`, covering today through 12 months ahead
- Manual full resync available via **Settings → Sync Public Calendar** (or `POST /api/public-calendar/sync`)
- Configured via `publicGoogleCalendarId` in config

**Personal & family calendars (read-only display):**
- Events from a personal Google Calendar and a family Google Calendar are fetched via private iCal URLs
- Displayed on the calendar page in the day-by-day view (next 28 days only)
- Personal events shown in blue, family events in teal
- Configured via `personalCalendarIcalUrl` and `familyCalendarIcalUrl` in config

**Google Tasks:**
- Tasks fetched via the Google Tasks API using the same OAuth credentials
- Tasks with a due date appear on that date; tasks with no due date appear under today
- Can be created and checked off directly from the calendar page
- Requires `tasks` OAuth scope (full read/write)

### Tally Forms
- Form ID: `nrbqY2`
- API key stored in config
- New submissions pulled via Tally API and stored as `TallySubmission` records
- Reviewed and imported individually on the `/sync` page

### Gmail / Nodemailer
- Booking confirmation emails sent automatically when a booking is created
- Invoices can be emailed directly from the invoice view
- Uses Gmail App Password stored in config

---

## Configuration

Config is stored at `~/Library/Application Support/wdc-app/config.json`.

Managed via the **Settings** page (`/settings`) or directly via `/api/config`.

| Setting | Description |
|---------|-------------|
| `businessName` | Your business name (appears on invoices) |
| `businessAddress` | Business address |
| `businessEmail` | Business email |
| `businessPhone` | Business phone |
| `paymentInfo` | Payment details shown on invoices |
| `nextInvoiceNumber` | Next invoice number to use (started at 0061) |
| `tallyApiKey` | API key for Tally form integration |
| `gmailAppPassword` | Gmail app password for sending emails |
| `googleClientId` | Google OAuth client ID |
| `googleClientSecret` | Google OAuth client secret |
| `googleRefreshToken` | Google OAuth refresh token (set automatically after auth) |
| `calendarUrl` | Public Google Calendar URL (for read-only calendar view) |
| `publicGoogleCalendarId` | Calendar ID for the public availability calendar (e.g. `xxx@group.calendar.google.com`) |
| `personalCalendarIcalUrl` | Private iCal URL for personal Google Calendar (for display on calendar page) |
| `familyCalendarIcalUrl` | Private iCal URL for family Google Calendar (for display on calendar page) |

---

## Backup & Export

### Database Backup
- Go to **Settings** → click the **Backup** button
- Saves a copy of the SQLite database to `My Drive/Coding Projects/WDC Backups/`
- You can also download the raw `.db` file or a full JSON export from the same page

### PDF Export
- **Dog profiles & trials:** `/export`
- **Invoices:** `/export/invoices`
- Uses Puppeteer to render and download PDFs

---

## Outstanding Tasks

These features were planned but not yet built:

1. **Duplicate merge tool** — Three dogs have duplicate records from early Tally sync: Uther, Vinny (submitted as "Vincent"), and Snoop. A merge UI is needed to combine them cleanly.

2. **Invoice status field** — Add Paid / Unpaid / Overdue filter/display to the invoices list view. (The `status` field exists in the database, just needs surfacing better in the UI.)

3. **Buddy 2 contact fields** — The Tally form has a second buddy/emergency contact, but the question IDs for those fields haven't been mapped yet. Needs investigation via `/api/tally/debug`.

4. **Invoice numbering** — Invoice numbers started at 0061 to account for ~60 prior paper invoices. This is working correctly and is documented here for reference.
