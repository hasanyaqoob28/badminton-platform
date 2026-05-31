# 🏸 Badminton Tournament Platform

A full-stack web application for managing and running a badminton tournament with real-time score tracking, standings, and team management.

---

## Tech Stack

**Backend**
- Python 3.14 + FastAPI
- SQLAlchemy + SQLite
- JWT Authentication (python-jose)
- bcrypt password hashing
- OR-Tools for schedule optimization

**Frontend**
- React 18 + Vite
- Axios for API calls
- Inline CSS styling (dark theme)

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
- Admin can set any player as the team captain display name

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
- **Admin** — full access: manage teams, players, pairs, captains, resolve disputes
- **Captain** — can enter and confirm scores for their own team only, edit their team roster
- Captains register with a username, password, full name, and team selection
- One captain per team enforced
- JWT tokens with 8-hour expiry

### Admin Panel
- Dedicated ROSTER and CAPTAINS tabs in the nav (admin only)
- Captains list sorted by team name with remove capability
- Set captain display name directly from player row

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
| Admin | `admin` | *(set during seed)* |
| Captain A | `captain_a` | `pass_a` |
| Captain B | `captain_b` | `pass_b` |
| Captain C | `captain_c` | `pass_c` |
| Captain D | `captain_d` | `pass_d` |
| Captain E | `captain_e` | `pass_e` |

---

## Project Structure

```
badminton-platform/
├── backend/
│   ├── app.py          # FastAPI routes and business logic
│   ├── models.py       # SQLAlchemy models
│   ├── auth.py         # JWT auth helpers
│   ├── database.py     # DB connection
│   ├── scheduler.py    # Match generation
│   ├── optimizer.py    # OR-Tools schedule optimizer
│   ├── seed.py         # Initial data seeding
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.jsx             # Main layout and routing
        ├── AuthContext.jsx     # Auth state management
        ├── api.js              # Axios instance
        └── components/
            ├── AuthModal.jsx   # Login/Register modal
            ├── Teams.jsx       # Teams, roster, captains view
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
| `v2-enhancements` | UI improvements, captain management, auth-gated editing |
