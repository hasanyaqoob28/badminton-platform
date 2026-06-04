from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from collections import defaultdict
from datetime import datetime, timedelta
import secrets

from database import Base, engine, SessionLocal
from models import Match, Team, Player, Pair, Captain, PasswordResetToken, PasswordChangeRequest
from scheduler import generate_matches
from optimizer import optimize_schedule
from auth import (
    verify_password, create_token, get_current_user,
    require_auth, require_admin, hash_password,
    create_access_token, create_refresh_token, verify_refresh_token,
    validate_password_strength, generate_session_token, oauth2_scheme, decode_token
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


def require_session(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Validate JWT + enforce single session."""
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    captain = db.query(Captain).filter(Captain.username == payload["sub"]).first()
    if not captain:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    if captain.session_token and captain.session_token != payload.get("sid"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired — logged in elsewhere")
    return payload


def require_admin_session(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Validate JWT + enforce single session + require admin."""
    if not token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    payload = decode_token(token)
    if not payload or payload.get("type") != "access" or not payload.get("is_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    captain = db.query(Captain).filter(Captain.username == payload["sub"]).first()
    if not captain:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    if captain.session_token and captain.session_token != payload.get("sid"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired — logged in elsewhere")
    return payload


# ── Pydantic schemas ─────────────────────────────────────────────────────────
class ScoreUpdate(BaseModel):
    set1_team1: int
    set1_team2: int
    set2_team1: int
    set2_team2: int

    def validate_scores(self):
        for v in [self.set1_team1, self.set1_team2, self.set2_team1, self.set2_team2]:
            if v < 0 or v > 21:
                raise ValueError("Score must be between 0 and 21")

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
    player_id: int = None

class RefreshRequest(BaseModel):
    refresh_token: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class RequestPasswordResetBody(BaseModel):
    username: str

class RequestPasswordChangeBody(BaseModel):
    reason: str = ""

class RequestTeamRenameBody(BaseModel):
    new_name: str

class ApproveResetBody(BaseModel):
    new_password: str = None


# ── Auth ─────────────────────────────────────────────────────────────────────
@app.get("/")
def home():
    return {"status": "running", "version": "2.0"}


@app.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    captain = db.query(Captain).filter(Captain.username == form.username).first()
    if not captain or not verify_password(form.password, captain.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not captain.is_admin:
        pending = db.query(PasswordChangeRequest).filter(
            PasswordChangeRequest.captain_id == captain.id,
            PasswordChangeRequest.request_type == "registration_approval",
            PasswordChangeRequest.status == "pending"
        ).first()
        if pending:
            raise HTTPException(status_code=403, detail="Your registration is pending admin approval. Please wait.")
    # Generate new session token — invalidates any existing session
    sid = generate_session_token()
    captain.session_token = sid
    db.commit()
    access_token = create_access_token({
        "sub": captain.username, "team": captain.team_name,
        "team_id": captain.team_id, "is_admin": captain.is_admin, "sid": sid
    })
    refresh_token = create_refresh_token({"sub": captain.username, "sid": sid})
    return {
        "access_token": access_token, "refresh_token": refresh_token,
        "token_type": "bearer", "expires_in": 900,
        "username": captain.username, "team": captain.team_name, "is_admin": captain.is_admin
    }


@app.post("/refresh")
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    payload = verify_refresh_token(body.refresh_token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")
    captain = db.query(Captain).filter(Captain.username == payload["sub"]).first()
    if not captain:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    # Validate session token
    if captain.session_token and captain.session_token != payload.get("sid"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired — logged in elsewhere")
    new_access_token = create_access_token({
        "sub": captain.username, "team": captain.team_name,
        "team_id": captain.team_id, "is_admin": captain.is_admin,
        "sid": captain.session_token
    })
    return {"access_token": new_access_token, "expires_in": 900}


@app.get("/me")
def me(user=Depends(require_session)):
    return user


@app.post("/change-password")
def change_password(body: ChangePasswordRequest, db: Session = Depends(get_db), user=Depends(require_session)):
    """Change password for authenticated user."""
    # Get captain from database
    captain = db.query(Captain).filter(Captain.username == user["sub"]).first()
    if not captain:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    # Verify current password is correct
    if not verify_password(body.current_password, captain.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    
    # Validate new password strength
    is_valid, error_msg = validate_password_strength(body.new_password)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)
    
    # Verify new password is different from current
    if body.current_password == body.new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be different from current password")
    
    # Update password
    captain.hashed_password = hash_password(body.new_password)
    db.commit()
    
    return {"detail": "Password changed successfully"}


@app.post("/request-password-reset")
def request_password_reset(body: RequestPasswordResetBody, db: Session = Depends(get_db)):
    """Request a password reset - sends request to admin for approval."""
    captain = db.query(Captain).filter(Captain.username == body.username).first()
    if not captain:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    existing = db.query(PasswordChangeRequest).filter(
        PasswordChangeRequest.captain_id == captain.id,
        PasswordChangeRequest.request_type == "password_reset",
        PasswordChangeRequest.status == "pending"
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Password reset request already pending. Please wait for admin approval.")

    db.add(PasswordChangeRequest(
        captain_id=captain.id,
        request_type="password_reset",
        reason=f"Password reset requested by {captain.username}",
        status="pending"
    ))
    db.commit()
    return {"detail": "Password reset request submitted to admin. Please wait for approval."}


@app.get("/admin-requests")
def get_admin_requests(db: Session = Depends(get_db), user=Depends(require_admin_session)):
    """Get all pending requests for admin (registrations + team renames + password resets)."""
    requests = db.query(PasswordChangeRequest).order_by(PasswordChangeRequest.created_at.desc()).all()
    result = []
    for r in requests:
        captain = db.query(Captain).filter(Captain.id == r.captain_id).first()
        result.append({
            "id": r.id,
            "type": r.request_type,
            "username": captain.username if captain else "unknown",
            "team": captain.team_name if captain else "",
            "team_id": captain.team_id if captain else None,
            "reason": r.reason or "",
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return result


@app.post("/admin-requests/{request_id}/approve")
def approve_admin_request(request_id: int, body: ApproveResetBody = None, db: Session = Depends(get_db), user=Depends(require_admin_session)):
    """Approve a registration or team rename request."""
    req = db.query(PasswordChangeRequest).filter(
        PasswordChangeRequest.id == request_id,
        PasswordChangeRequest.status == "pending"
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found or already processed")

    if req.request_type == "password_reset":
        if not body or not body.new_password:
            raise HTTPException(status_code=400, detail="new_password required for password reset approval")
        is_valid, error_msg = validate_password_strength(body.new_password)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        captain = db.query(Captain).filter(Captain.id == req.captain_id).first()
        if not captain:
            raise HTTPException(status_code=404, detail="User not found")
        captain.hashed_password = hash_password(body.new_password)

    elif req.request_type == "team_rename":
        captain = db.query(Captain).filter(Captain.id == req.captain_id).first()
        if not captain:
            raise HTTPException(status_code=404, detail="Captain not found")
        new_name = req.reason
        team = db.query(Team).filter(Team.id == captain.team_id).first()
        if team:
            old_name = team.name
            team.name = new_name
            db.query(Match).filter(Match.team1 == old_name).update({"team1": new_name})
            db.query(Match).filter(Match.team2 == old_name).update({"team2": new_name})
            db.query(Captain).filter(Captain.team_id == team.id).update({"team_name": new_name})

    # registration_approval: just mark approved, no extra action needed
    req.status = "approved"
    db.commit()
    return {"detail": "Request approved"}


@app.post("/admin-requests/{request_id}/deny")
def deny_admin_request(request_id: int, db: Session = Depends(get_db), user=Depends(require_admin_session)):
    req = db.query(PasswordChangeRequest).filter(
        PasswordChangeRequest.id == request_id,
        PasswordChangeRequest.status == "pending"
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found or already processed")
    
    # If denying a registration, delete the captain account
    if req.request_type == "registration_approval":
        captain = db.query(Captain).filter(Captain.id == req.captain_id).first()
        if captain:
            db.delete(captain)
    
    req.status = "denied"
    db.commit()
    return {"detail": "Request denied"}


@app.post("/register")
def register(body: RegisterBody, db: Session = Depends(get_db)):
    if db.query(Captain).filter(Captain.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    team = db.query(Team).filter(Team.id == body.team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    existing = db.query(Captain).filter(Captain.team_id == body.team_id, Captain.is_admin == False).first()
    if existing:
        raise HTTPException(status_code=400, detail="This team already has a captain")
    # Validate password strength
    is_valid, error_msg = validate_password_strength(body.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    captain_name = body.name or body.username
    captain = Captain(
        username=body.username,
        name=captain_name,
        hashed_password=hash_password(body.password),
        team_id=body.team_id,
        team_name=team.name,
        is_admin=False
    )
    db.add(captain)
    db.flush()
    # Link to selected player and update player name
    if body.player_id:
        player = db.query(Player).filter(Player.id == body.player_id, Player.team_id == body.team_id).first()
        if player:
            captain.player_id = player.id
            captain.name = player.name  # use the player's current name as captain display name
    else:
        # Try case-insensitive name match as fallback
        existing_player = db.query(Player).filter(
            Player.team_id == body.team_id,
            Player.name.ilike(captain_name)
        ).first()
        if existing_player:
            captain.player_id = existing_player.id
    # Create registration approval request for admin
    db.add(PasswordChangeRequest(
        captain_id=captain.id,
        request_type="registration_approval",
        reason=f"{captain.username} registered for {team.name}",
        status="pending"
    ))
    sid = generate_session_token()
    captain.session_token = sid
    db.commit()
    access_token = create_access_token({"sub": captain.username, "team": captain.team_name, "team_id": captain.team_id, "is_admin": False, "sid": sid})
    refresh_token = create_refresh_token({"sub": captain.username, "sid": sid})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer", "expires_in": 900, "username": captain.username, "team": captain.team_name, "is_admin": False}


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
def update_score(match_id: int, score: ScoreUpdate, db: Session = Depends(get_db), user=Depends(require_session)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # Validate scores - exactly one team must score 21, other must be less
    for s1, s2 in [(score.set1_team1, score.set1_team2), (score.set2_team1, score.set2_team2)]:
        if s1 < 0 or s2 < 0:
            raise HTTPException(status_code=400, detail="Scores cannot be negative")
        if s1 > 21 or s2 > 21:
            raise HTTPException(status_code=400, detail="Score cannot exceed 21")
        if s1 == 21 and s2 == 21:
            raise HTTPException(status_code=400, detail="Both teams cannot score 21 in the same set")
        if s1 != 21 and s2 != 21:
            raise HTTPException(status_code=400, detail="One team must score exactly 21 to win a set")

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
def confirm_score(match_id: int, db: Session = Depends(get_db), user=Depends(require_session)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match or not match.completed:
        raise HTTPException(status_code=404, detail="Match not found or not completed")

    if user.get("is_admin"):
        # Admin force-confirms both sides
        match.confirmed_by_team1 = True
        match.confirmed_by_team2 = True
        match.disputed = False
    else:
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
def dispute_score(match_id: int, db: Session = Depends(get_db), user=Depends(require_session)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match or not match.completed:
        raise HTTPException(status_code=404, detail="Match not found or not completed")
    if not user.get("is_admin") and user.get("team") not in [match.team1, match.team2]:
        raise HTTPException(status_code=403, detail="Not your match")
    match.disputed = True
    db.commit()
    return _match_dict(match)


@app.post("/match/{match_id}/resolve")
def resolve_dispute(match_id: int, db: Session = Depends(get_db), user=Depends(require_admin_session)):
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
            "captainPlayerId": captain.player_id if captain else None,
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
def update_team(team_id: int, body: TeamUpdate, db: Session = Depends(get_db), user=Depends(require_admin_session)):
    """Admin-only: directly rename a team."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    old_name = team.name
    team.name = body.name
    db.query(Match).filter(Match.team1 == old_name).update({"team1": body.name})
    db.query(Match).filter(Match.team2 == old_name).update({"team2": body.name})
    db.query(Captain).filter(Captain.team_id == team_id).update({"team_name": body.name})
    db.commit()
    return {"id": team.id, "name": team.name}


@app.post("/teams/{team_id}/request-rename")
def request_team_rename(team_id: int, body: RequestTeamRenameBody, db: Session = Depends(get_db), user=Depends(require_session)):
    """Captain requests a team rename — requires admin approval."""
    if user.get("is_admin"):
        raise HTTPException(status_code=400, detail="Admins can rename directly")
    if user.get("team_id") != team_id:
        raise HTTPException(status_code=403, detail="Can only request rename for your own team")
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    captain = db.query(Captain).filter(Captain.team_id == team_id, Captain.is_admin == False).first()
    if not captain:
        raise HTTPException(status_code=404, detail="Captain not found")
    existing = db.query(PasswordChangeRequest).filter(
        PasswordChangeRequest.captain_id == captain.id,
        PasswordChangeRequest.request_type == "team_rename",
        PasswordChangeRequest.status == "pending"
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="A rename request is already pending for this team")
    db.add(PasswordChangeRequest(
        captain_id=captain.id,
        request_type="team_rename",
        reason=body.new_name,  # store requested name in reason field
        status="pending"
    ))
    db.commit()
    return {"detail": f"Rename request for '{body.new_name}' submitted to admin"}


@app.put("/players/{player_id}")
def update_player(player_id: int, body: PlayerUpdate, db: Session = Depends(get_db), user=Depends(require_session)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    if not user.get("is_admin") and user.get("team_id") != player.team_id:
        raise HTTPException(status_code=403, detail="Can only edit your own players")
    player.name = body.name
    # Sync captain display name if this player is the linked captain
    captain = db.query(Captain).filter(Captain.player_id == player_id).first()
    if captain:
        captain.name = body.name
    db.commit()
    return {"id": player.id, "name": player.name}


@app.put("/players/{player_id}/set-captain")
def set_player_as_captain(player_id: int, db: Session = Depends(get_db), user=Depends(require_admin_session)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    existing = db.query(Captain).filter(Captain.team_id == player.team_id, Captain.is_admin == False).first()
    if not existing:
        raise HTTPException(status_code=404, detail="No captain account exists for this team. Ask the captain to register first.")
    # Update captain display name and link to this player
    existing.name = player.name
    existing.player_id = player.id
    db.commit()
    return {"detail": "Captain updated", "captain": player.name}


@app.put("/pairs/{pair_id}")
def update_pair(pair_id: int, body: PairUpdate, db: Session = Depends(get_db), user=Depends(require_session)):
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
def delete_captain(captain_id: int, db: Session = Depends(get_db), user=Depends(require_admin_session)):
    captain = db.query(Captain).filter(Captain.id == captain_id, Captain.is_admin == False).first()
    if not captain:
        raise HTTPException(status_code=404, detail="Captain not found")
    db.delete(captain)
    db.commit()
    return {"detail": "Captain removed"}


@app.get("/captains")
def get_captains(db: Session = Depends(get_db), user=Depends(require_admin_session)):
    captains = db.query(Captain).order_by(Captain.team_name).all()
    return [{"id": c.id, "username": c.username, "name": c.name or c.username, "team": c.team_name, "is_admin": c.is_admin} for c in captains]


@app.post("/captains")
def create_captain(body: CaptainCreate, db: Session = Depends(get_db), user=Depends(require_admin_session)):
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
