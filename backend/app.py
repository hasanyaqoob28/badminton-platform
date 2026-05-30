from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from collections import defaultdict

from database import Base, engine, SessionLocal
from models import Match, Team, Player, Pair, Captain
from scheduler import generate_matches
from optimizer import optimize_schedule
from auth import (
    verify_password, create_token, get_current_user,
    require_auth, require_admin, hash_password
)

app = FastAPI(title="Badminton Tournament v2")

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── seed on startup ──────────────────────────────────────────────────────────
_db = SessionLocal()
if not _db.query(Team).first():
    from seed import seed
    seed()
_db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Pydantic schemas ─────────────────────────────────────────────────────────
class ScoreUpdate(BaseModel):
    set1_team1: int
    set1_team2: int
    set2_team1: int
    set2_team2: int

class TeamUpdate(BaseModel):
    name: str

class PlayerUpdate(BaseModel):
    name: str

class PairUpdate(BaseModel):
    name: str
    player1_id: int
    player2_id: int

class CaptainCreate(BaseModel):
    username: str
    password: str
    team_id: int
    name: str = ""

class RegisterBody(BaseModel):
    username: str
    password: str
    team_id: int
    name: str = ""


# ── Auth ─────────────────────────────────────────────────────────────────────
@app.get("/")
def home():
    return {"status": "running", "version": "2.0"}


@app.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    captain = db.query(Captain).filter(Captain.username == form.username).first()
    if not captain or not verify_password(form.password, captain.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_token({
        "sub": captain.username,
        "team": captain.team_name,
        "team_id": captain.team_id,
        "is_admin": captain.is_admin
    })
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": captain.username,
        "team": captain.team_name,
        "is_admin": captain.is_admin
    }


@app.get("/me")
def me(user=Depends(require_auth)):
    return user


@app.post("/register")
def register(body: RegisterBody, db: Session = Depends(get_db)):
    if db.query(Captain).filter(Captain.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    team = db.query(Team).filter(Team.id == body.team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    # only one captain per team
    existing = db.query(Captain).filter(Captain.team_id == body.team_id, Captain.is_admin == False).first()
    if existing:
        raise HTTPException(status_code=400, detail="This team already has a captain")
    captain = Captain(
        username=body.username,
        name=body.name or body.username,
        hashed_password=hash_password(body.password),
        team_id=body.team_id,
        team_name=team.name,
        is_admin=False
    )
    db.add(captain)
    db.commit()
    token = create_token({"sub": captain.username, "team": captain.team_name, "team_id": captain.team_id, "is_admin": False})
    return {"access_token": token, "token_type": "bearer", "username": captain.username, "team": captain.team_name, "is_admin": False}


# ── Schedule ─────────────────────────────────────────────────────────────────
@app.get("/schedule")
def schedule(db: Session = Depends(get_db)):
    existing = db.query(Match).all()
    if existing:
        return [_match_dict(m) for m in existing]
    matches = generate_matches()
    optimized = optimize_schedule(matches)
    for m in optimized:
        db.add(Match(
            pair_group=m["pair_group"], team1=m["team1"],
            team2=m["team2"], court=m["court"], slot=m["slot"],
        ))
    db.commit()
    return [_match_dict(m) for m in db.query(Match).all()]


def _match_dict(m):
    return {
        "id": m.id, "pair_group": m.pair_group,
        "team1": m.team1, "team2": m.team2,
        "court": m.court, "slot": m.slot,
        "set1_team1": m.set1_team1, "set1_team2": m.set1_team2,
        "set2_team1": m.set2_team1, "set2_team2": m.set2_team2,
        "sets_won_team1": m.sets_won_team1, "sets_won_team2": m.sets_won_team2,
        "total_points_team1": m.total_points_team1, "total_points_team2": m.total_points_team2,
        "completed": m.completed,
        "confirmed_by_team1": m.confirmed_by_team1,
        "confirmed_by_team2": m.confirmed_by_team2,
        "disputed": m.disputed,
    }


# ── Score entry (captains only) ───────────────────────────────────────────────
@app.put("/match/{match_id}/score")
def update_score(match_id: int, score: ScoreUpdate, db: Session = Depends(get_db), user=Depends(require_auth)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # captains can only score their own team's matches
    if not user.get("is_admin") and user.get("team") not in [match.team1, match.team2]:
        raise HTTPException(status_code=403, detail="You can only score your own team's matches")

    match.set1_team1 = score.set1_team1
    match.set1_team2 = score.set1_team2
    match.set2_team1 = score.set2_team1
    match.set2_team2 = score.set2_team2

    s1 = 1 if score.set1_team1 > score.set1_team2 else 0
    s2 = 1 if score.set2_team1 > score.set2_team2 else 0
    match.sets_won_team1 = s1 + s2
    match.sets_won_team2 = (1 - s1) + (1 - s2)
    match.total_points_team1 = score.set1_team1 + score.set2_team1
    match.total_points_team2 = score.set1_team2 + score.set2_team2
    match.completed = True
    match.confirmed_by_team1 = False
    match.confirmed_by_team2 = False
    match.disputed = False

    db.commit()
    return _match_dict(match)


# ── Score confirmation ────────────────────────────────────────────────────────
@app.post("/match/{match_id}/confirm")
def confirm_score(match_id: int, db: Session = Depends(get_db), user=Depends(require_auth)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match or not match.completed:
        raise HTTPException(status_code=404, detail="Match not found or not completed")

    team = user.get("team")
    if team == match.team1:
        match.confirmed_by_team1 = True
    elif team == match.team2:
        match.confirmed_by_team2 = True
    else:
        raise HTTPException(status_code=403, detail="Not your match")

    db.commit()
    return _match_dict(match)


# ── Dispute ───────────────────────────────────────────────────────────────────
@app.post("/match/{match_id}/dispute")
def dispute_score(match_id: int, db: Session = Depends(get_db), user=Depends(require_auth)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match or not match.completed:
        raise HTTPException(status_code=404, detail="Match not found or not completed")
    if user.get("team") not in [match.team1, match.team2] and not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Not your match")
    match.disputed = True
    db.commit()
    return _match_dict(match)


@app.post("/match/{match_id}/resolve")
def resolve_dispute(match_id: int, db: Session = Depends(get_db), user=Depends(require_admin)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    match.disputed = False
    match.confirmed_by_team1 = True
    match.confirmed_by_team2 = True
    db.commit()
    return _match_dict(match)


# ── Teams ─────────────────────────────────────────────────────────────────────
@app.get("/teams")
def get_teams(db: Session = Depends(get_db)):
    all_teams = db.query(Team).all()
    result = []
    for team in all_teams:
        players = db.query(Player).filter(Player.team_id == team.id).all()
        pairs = db.query(Pair).filter(Pair.team_id == team.id).all()
        player_map = {p.id: p.name for p in players}
        captain = db.query(Captain).filter(Captain.team_id == team.id).first()
        result.append({
            "id": team.id, "name": team.name,
            "captain": (captain.name or captain.username) if captain else None,
            "captainId": captain.id if captain else None,
            "players": [{"id": p.id, "name": p.name} for p in players],
            "pairs": [{
                "id": pair.id, "name": pair.name,
                "player1_id": pair.player1_id, "player2_id": pair.player2_id,
                "player1": player_map.get(pair.player1_id, ""),
                "player2": player_map.get(pair.player2_id, ""),
            } for pair in pairs]
        })
    return result


@app.put("/teams/{team_id}")
def update_team(team_id: int, body: TeamUpdate, db: Session = Depends(get_db), user=Depends(require_auth)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if not user.get("is_admin") and user.get("team_id") != team_id:
        raise HTTPException(status_code=403, detail="Can only edit your own team")
    old_name = team.name
    team.name = body.name
    db.query(Match).filter(Match.team1 == old_name).update({"team1": body.name})
    db.query(Match).filter(Match.team2 == old_name).update({"team2": body.name})
    captain = db.query(Captain).filter(Captain.team_id == team_id).first()
    if captain:
        captain.team_name = body.name
    db.commit()
    return {"id": team.id, "name": team.name}


@app.put("/players/{player_id}")
def update_player(player_id: int, body: PlayerUpdate, db: Session = Depends(get_db), user=Depends(require_auth)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    if not user.get("is_admin") and user.get("team_id") != player.team_id:
        raise HTTPException(status_code=403, detail="Can only edit your own players")
    player.name = body.name
    db.commit()
    return {"id": player.id, "name": player.name}


@app.put("/players/{player_id}/set-captain")
def set_player_as_captain(player_id: int, db: Session = Depends(get_db), user=Depends(require_admin)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    # Find existing captain for this team
    existing = db.query(Captain).filter(Captain.team_id == player.team_id, Captain.is_admin == False).first()
    if existing:
        # Just update the display name — preserve username and password
        existing.name = player.name
        db.commit()
        return {"detail": "Captain name updated", "captain": player.name}
    else:
        raise HTTPException(status_code=404, detail="No captain account exists for this team. Ask the captain to register first.")


@app.put("/pairs/{pair_id}")
def update_pair(pair_id: int, body: PairUpdate, db: Session = Depends(get_db), user=Depends(require_auth)):
    pair = db.query(Pair).filter(Pair.id == pair_id).first()
    if not pair:
        raise HTTPException(status_code=404, detail="Pair not found")
    if not user.get("is_admin") and user.get("team_id") != pair.team_id:
        raise HTTPException(status_code=403, detail="Can only edit your own pairs")
    pair.name = body.name
    pair.player1_id = body.player1_id
    pair.player2_id = body.player2_id
    db.commit()
    return {"id": pair.id, "name": pair.name}


# ── Standings ─────────────────────────────────────────────────────────────────
@app.get("/standings")
def standings(db: Session = Depends(get_db)):
    all_teams = {t.name for t in db.query(Team).all()}
    matches = db.query(Match).filter(Match.completed == True).all()
    teams = {name: {"team": name, "sets_won": 0, "sets_diff": 0, "points_diff": 0, "points_for": 0, "played": 0} for name in all_teams}
    for m in matches:
        for team, sw, sa, pts, pta in [
            (m.team1, m.sets_won_team1, m.sets_won_team2, m.total_points_team1, m.total_points_team2),
            (m.team2, m.sets_won_team2, m.sets_won_team1, m.total_points_team2, m.total_points_team1),
        ]:
            if team not in teams:
                teams[team] = {"team": team, "sets_won": 0, "sets_diff": 0, "points_diff": 0, "points_for": 0, "played": 0}
            teams[team]["sets_won"] += sw
            teams[team]["sets_diff"] += sw - sa
            teams[team]["points_diff"] += pts - pta
            teams[team]["points_for"] += pts
            teams[team]["played"] += 1
    return sorted(teams.values(), key=lambda x: (x["sets_won"], x["sets_diff"], x["points_diff"], x["points_for"]), reverse=True)


# ── Stats ─────────────────────────────────────────────────────────────────────
@app.get("/stats")
def stats(db: Session = Depends(get_db)):
    matches = db.query(Match).filter(Match.completed == True).all()
    pair_stats = defaultdict(lambda: {"played": 0, "sets_won": 0, "sets_lost": 0, "points_for": 0, "points_against": 0})
    h2h = defaultdict(lambda: defaultdict(lambda: {"wins": 0, "losses": 0}))

    for m in matches:
        k1 = f"{m.team1} {m.pair_group}"
        k2 = f"{m.team2} {m.pair_group}"
        pair_stats[k1]["played"] += 1
        pair_stats[k1]["sets_won"] += m.sets_won_team1
        pair_stats[k1]["sets_lost"] += m.sets_won_team2
        pair_stats[k1]["points_for"] += m.total_points_team1
        pair_stats[k1]["points_against"] += m.total_points_team2
        pair_stats[k2]["played"] += 1
        pair_stats[k2]["sets_won"] += m.sets_won_team2
        pair_stats[k2]["sets_lost"] += m.sets_won_team1
        pair_stats[k2]["points_for"] += m.total_points_team2
        pair_stats[k2]["points_against"] += m.total_points_team1

        winner = m.team1 if m.sets_won_team1 > m.sets_won_team2 else m.team2
        loser = m.team2 if winner == m.team1 else m.team1
        h2h[winner][loser]["wins"] += 1
        h2h[loser][winner]["losses"] += 1

    return {
        "pair_stats": [{"pair": k, **v, "win_rate": round(v["sets_won"] / max(v["sets_won"] + v["sets_lost"], 1) * 100)} for k, v in sorted(pair_stats.items(), key=lambda x: x[1]["sets_won"], reverse=True)],
        "head_to_head": {t1: dict(v) for t1, v in h2h.items()}
    }


# ── Knockout ──────────────────────────────────────────────────────────────────
@app.get("/knockout")
def knockout(db: Session = Depends(get_db)):
    all_teams = {t.name for t in db.query(Team).all()}
    matches = db.query(Match).filter(Match.completed == True).all()
    teams = {name: {"team": name, "sets_won": 0, "sets_diff": 0, "points_diff": 0} for name in all_teams}
    for m in matches:
        for team, sw, sa, pts, pta in [
            (m.team1, m.sets_won_team1, m.sets_won_team2, m.total_points_team1, m.total_points_team2),
            (m.team2, m.sets_won_team2, m.sets_won_team1, m.total_points_team2, m.total_points_team1),
        ]:
            if team in teams:
                teams[team]["sets_won"] += sw
                teams[team]["sets_diff"] += sw - sa
                teams[team]["points_diff"] += pts - pta

    ranked = sorted(teams.values(), key=lambda x: (x["sets_won"], x["sets_diff"], x["points_diff"]), reverse=True)
    top4 = ranked[:4]

    return {
        "qualified": top4,
        "semifinals": [
            {"match": "SF1", "team1": top4[0]["team"], "team2": top4[3]["team"]},
            {"match": "SF2", "team1": top4[1]["team"], "team2": top4[2]["team"]},
        ],
        "final": {"match": "FINAL", "team1": "Winner SF1", "team2": "Winner SF2"},
        "third_place": {"match": "3rd Place", "team1": "Loser SF1", "team2": "Loser SF2"},
    }


# ── Captains (admin only) ─────────────────────────────────────────────────────
@app.delete("/captains/{captain_id}")
def delete_captain(captain_id: int, db: Session = Depends(get_db), user=Depends(require_admin)):
    captain = db.query(Captain).filter(Captain.id == captain_id, Captain.is_admin == False).first()
    if not captain:
        raise HTTPException(status_code=404, detail="Captain not found")
    db.delete(captain)
    db.commit()
    return {"detail": "Captain removed"}


@app.get("/captains")
def get_captains(db: Session = Depends(get_db), user=Depends(require_admin)):
    captains = db.query(Captain).order_by(Captain.team_name).all()
    return [{"id": c.id, "username": c.username, "name": c.name or c.username, "team": c.team_name, "is_admin": c.is_admin} for c in captains]


@app.post("/captains")
def create_captain(body: CaptainCreate, db: Session = Depends(get_db), user=Depends(require_admin)):
    team = db.query(Team).filter(Team.id == body.team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    captain = Captain(
        username=body.username,
        hashed_password=hash_password(body.password),
        team_id=body.team_id,
        team_name=team.name,
        is_admin=False
    )
    db.add(captain)
    db.commit()
    return {"id": captain.id, "username": captain.username, "team": captain.team_name}
