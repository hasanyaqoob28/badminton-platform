# 🏸 Badminton Tournament Platform

A full-stack web application for managing and running a badminton tournament with real-time score tracking, standings, team management, and a secure authentication system.

---

## Tech Stack

**Backend**
- Python 3.14 + FastAPI
- SQLAlchemy + SQLite
- JWT Authentication — short-lived access tokens (15 min) + refresh tokens (7 days)
- bcrypt password hashing (cost factor 12)
- OR-Tools for schedule optimization

**Frontend**
- React 18 + Vite
- Axios with auto-refresh interceptor
- Inline CSS styling (dark theme)
- Toast notification system

---

## Features

### Tournament Management
- Auto-generated round-robin match schedule across 6 courts
- Optimized scheduling using OR-Tools to minimize conflicts
- Live ticker showing recently completed matches
- Tournament progress bar with completion percentage

### Teams & Roster
- 5 teams, each with players and doubles pairs
- Inline editing of team names, player names, and pair compositions (admin/captain only)
- Captain display per team with 👑 badge
- Admins can rename teams directly; captains submit a rename request for admin approval

### Score Entry
- Captains log in to enter scores for their team's matches
- Two-set scoring system with automatic sets won calculation
- Score confirmation by both teams
- Dispute system — captains can flag incorrect scores
- Admin can force-confirm or resolve disputed matches

### Standings
- Live standings sorted by sets won, set difference, points difference
- Pair-level stats: win rate, sets won/lost, points for/against
- Head-to-head records between teams

### Knockout Stage
- Auto-qualifies top 4 teams from standings
- Generates semi-final, final, and 3rd place match brackets

### Authentication & Roles
- **Admin** — full access: manage teams, players, pairs, captains, resolve disputes, approve/deny requests
- **Captain** — can enter and confirm scores for their own team only, edit their team roster, request team rename
- JWT access tokens (15 min) auto-refreshed silently via Axios interceptor
- Refresh tokens (7 days) stored in localStorage
- Single active session enforced per user — logging in on a new device invalidates the previous session
- 30-minute inactivity auto-logout
- If a session conflict is detected, a banner notifies the user they were logged out

### Registration Flow (Captains)
1. Click **LOGIN / REGISTER** in the top-right corner
2. Switch to the **REGISTER** tab
3. Choose a username and a strong password *(min 8 chars, uppercase, lowercase, number)*
4. Select your team — teams marked ✗ already have a captain assigned
5. Select which player slot in the roster you are
6. Submit — your account is created but **pending admin approval**
7. Admin approves or denies from the **SETTINGS** tab
8. Once approved, log in with your credentials

> One captain per team is enforced. Contact admin to remove an existing captain before re-registering for that team.

### Password Management
- **Change password** — any logged-in user can change their password from the Settings tab (⚙️)
- **Forgot password** — click "FORGOT PASSWORD?" on the login form to submit a reset request to admin
- Admin sets a new password for the user from the **SETTINGS → Password Reset Requests** panel
- Password strength enforced everywhere: min 8 chars · uppercase · lowercase · number

### Admin Panel (SETTINGS tab)
- **Pending requests** badge on the SETTINGS tab shows count of items needing attention
- **Password Reset Requests** — approve (with new password) or deny captain reset requests
- **Registration Approvals** — approve or deny new captain registrations
- **Team Rename Requests** — approve or deny captain-submitted rename requests
- **Account Security** — admin can change their own password

---

## Getting Started

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`  
Backend API runs at `http://localhost:8000`

---

## Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Captain A | `captain_a` | `pass_a` |
| Captain B | `captain_b` | `pass_b` |
| Captain C | `captain_c` | `pass_c` |
| Captain E | `captain_e` | `pass_e` |

> **Note:** `captain_d` does not exist — Team D has no registered captain yet.  
> Captain passwords above are the seeded defaults. If a captain has changed their password, use the admin reset flow.

---

## API Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/login` | — | Login, returns access + refresh tokens |
| POST | `/refresh` | — | Exchange refresh token for new access token |
| POST | `/register` | — | Register new captain (pending approval) |
| POST | `/change-password` | Captain/Admin | Change own password |
| POST | `/request-password-reset` | — | Request admin-mediated password reset |
| GET | `/admin-requests` | Admin | List all pending requests |
| POST | `/admin-requests/{id}/approve` | Admin | Approve a request |
| POST | `/admin-requests/{id}/deny` | Admin | Deny a request |
| GET | `/schedule` | — | Full match schedule |
| PUT | `/match/{id}/score` | Captain/Admin | Submit scores |
| POST | `/match/{id}/confirm` | Captain/Admin | Confirm a score |
| POST | `/match/{id}/dispute` | Captain/Admin | Flag a score dispute |
| GET | `/standings` | — | Current standings |
| GET | `/stats` | — | Pair-level stats + head-to-head |
| GET | `/knockout` | — | Knockout bracket |
| GET | `/teams` | — | All teams with players and pairs |
| PUT | `/teams/{id}` | Admin | Direct team rename |
| POST | `/teams/{id}/request-rename` | Captain | Submit rename request |
| PUT | `/players/{id}` | Captain/Admin | Update player name |
| PUT | `/pairs/{id}` | Captain/Admin | Update pair |
| GET | `/captains` | Admin | List all captains |
| DELETE | `/captains/{id}` | Admin | Remove a captain |

---

## Session & Token Behaviour

- **Access token** expires in **15 minutes** — automatically refreshed in the background
- **Refresh token** expires in **7 days** — on expiry a re-login modal appears
- **Single session** — logging in elsewhere immediately invalidates the previous session; the displaced user sees a conflict banner
- **Inactivity timeout** — 30 minutes of no mouse/keyboard activity triggers automatic logout
- All tokens are stored in `localStorage` under keys `badminton_token` and `badminton_refresh_token`

---

## Project Structure

```
badminton-platform/
├── backend/
│   ├── app.py              # FastAPI routes and business logic
│   ├── models.py           # SQLAlchemy models
│   ├── auth.py             # JWT helpers, bcrypt, password validation
│   ├── database.py         # DB connection
│   ├── scheduler.py        # Match generation
│   ├── optimizer.py        # OR-Tools schedule optimizer
│   ├── seed.py             # Initial data seeding
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.jsx                     # Main layout and routing
        ├── AuthContext.jsx             # Auth state, login/logout, token restore
        ├── ToastContext.jsx            # Global toast notifications
        ├── api.js                      # Axios instance + auto-refresh interceptor
        └── components/
            ├── AuthModal.jsx           # Login / Register / Forgot password modal
            ├── ReLoginModal.jsx        # Session-expired re-login prompt
            ├── PasswordChangeModal.jsx # Change password form
            ├── AdminSettings.jsx       # Admin requests panel + account security
            ├── Teams.jsx               # Teams, roster, captains views
            ├── ScheduleTable.jsx
            ├── ScoreEntry.jsx
            ├── Standings.jsx
            ├── Stats.jsx
            └── Knockout.jsx
```

---

## Branches

| Branch | Description |
|--------|-------------|
| `master` | Stable v1 — core tournament platform |
| `v2-enhancements` | Phase 2 — secure auth, token refresh, password management, admin approval flows |
