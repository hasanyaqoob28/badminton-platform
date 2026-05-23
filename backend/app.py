from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import Base, engine, SessionLocal
from models import Match, Team, Player, Pair
from scheduler import generate_matches
from optimizer import optimize_schedule

app = FastAPI()

Base.metadata.create_all(bind=engine)

# seed on startup if empty
_db = SessionLocal()
if not _db.query(Team).first():
    from seed import seed
    seed()
_db.close()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class ScoreUpdate(BaseModel):
    set1_team1: int
    set1_team2: int
    set2_team1: int
    set2_team2: int


@app.get("/")
def home():
    return {"status": "running"}


@app.get("/schedule")
def schedule(db: Session = Depends(get_db)):
    existing = db.query(Match).all()
    if existing:
        return [m.__dict__ for m in existing]

    matches = generate_matches()
    optimized = optimize_schedule(matches)

    for m in optimized:
        db.add(Match(
            pair_group=m["pair_group"],
            team1=m["team1"],
            team2=m["team2"],
            court=m["court"],
            slot=m["slot"],
        ))
    db.commit()

    return [m.__dict__ for m in db.query(Match).all()]


@app.put("/match/{match_id}/score")
def update_score(match_id: int, score: ScoreUpdate, db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

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

    db.commit()
    db.refresh(match)
    return match.__dict__


@app.get("/teams")
def get_teams(db: Session = Depends(get_db)):
    all_teams = db.query(Team).all()
    result = []
    for team in all_teams:
        players = db.query(Player).filter(Player.team_id == team.id).all()
        pairs = db.query(Pair).filter(Pair.team_id == team.id).all()
        player_map = {p.id: p.name for p in players}
        result.append({
            "id": team.id,
            "name": team.name,
            "players": [{"id": p.id, "name": p.name} for p in players],
            "pairs": [
                {
                    "id": pair.id,
                    "name": pair.name,
                    "player1_id": pair.player1_id,
                    "player2_id": pair.player2_id,
                    "player1": player_map.get(pair.player1_id, ""),
                    "player2": player_map.get(pair.player2_id, ""),
                }
                for pair in pairs
            ]
        })
    return result


class TeamUpdate(BaseModel):
    name: str

class PlayerUpdate(BaseModel):
    name: str

class PairUpdate(BaseModel):
    name: str
    player1_id: int
    player2_id: int


@app.put("/teams/{team_id}")
def update_team(team_id: int, body: TeamUpdate, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    old_name = team.name
    team.name = body.name
    # update all matches referencing old team name
    db.query(Match).filter(Match.team1 == old_name).update({"team1": body.name})
    db.query(Match).filter(Match.team2 == old_name).update({"team2": body.name})
    db.commit()
    return {"id": team.id, "name": team.name}


@app.put("/players/{player_id}")
def update_player(player_id: int, body: PlayerUpdate, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    player.name = body.name
    db.commit()
    return {"id": player.id, "name": player.name}


@app.put("/pairs/{pair_id}")
def update_pair(pair_id: int, body: PairUpdate, db: Session = Depends(get_db)):
    pair = db.query(Pair).filter(Pair.id == pair_id).first()
    if not pair:
        raise HTTPException(status_code=404, detail="Pair not found")
    pair.name = body.name
    pair.player1_id = body.player1_id
    pair.player2_id = body.player2_id
    db.commit()
    return {"id": pair.id, "name": pair.name}


@app.get("/standings")
def standings(db: Session = Depends(get_db)):
    all_teams = {t.name for t in db.query(Team).all()}
    matches = db.query(Match).filter(Match.completed == True).all()

    teams = {name: {"team": name, "sets_won": 0, "sets_diff": 0, "points_diff": 0, "points_for": 0} for name in all_teams}

    for m in matches:
        for team, sw, sa, pts, pta in [
            (m.team1, m.sets_won_team1, m.sets_won_team2, m.total_points_team1, m.total_points_team2),
            (m.team2, m.sets_won_team2, m.sets_won_team1, m.total_points_team2, m.total_points_team1),
        ]:
            if team not in teams:
                teams[team] = {"team": team, "sets_won": 0, "sets_diff": 0, "points_diff": 0, "points_for": 0}
            teams[team]["sets_won"] += sw
            teams[team]["sets_diff"] += sw - sa
            teams[team]["points_diff"] += pts - pta
            teams[team]["points_for"] += pts

    return sorted(
        teams.values(),
        key=lambda x: (x["sets_won"], x["sets_diff"], x["points_diff"], x["points_for"]),
        reverse=True,
    )
