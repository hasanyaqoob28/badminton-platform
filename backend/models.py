from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime
from datetime import datetime
from database import Base


class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)


class Player(Base):
    __tablename__ = "players"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    team_id = Column(Integer, ForeignKey("teams.id"))


class Pair(Base):
    __tablename__ = "pairs"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    player1_id = Column(Integer, ForeignKey("players.id"))
    player2_id = Column(Integer, ForeignKey("players.id"))
    team_id = Column(Integer, ForeignKey("teams.id"))


class Match(Base):
    __tablename__ = "matches"
    id = Column(Integer, primary_key=True)
    pair_group = Column(String)
    team1 = Column(String)
    team2 = Column(String)
    pair1 = Column(String)
    pair2 = Column(String)
    court = Column(Integer)
    slot = Column(Integer)
    set1_team1 = Column(Integer, default=0)
    set1_team2 = Column(Integer, default=0)
    set2_team1 = Column(Integer, default=0)
    set2_team2 = Column(Integer, default=0)
    sets_won_team1 = Column(Integer, default=0)
    sets_won_team2 = Column(Integer, default=0)
    total_points_team1 = Column(Integer, default=0)
    total_points_team2 = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    confirmed_by_team1 = Column(Boolean, default=False)
    confirmed_by_team2 = Column(Boolean, default=False)
    disputed = Column(Boolean, default=False)


class Captain(Base):
    __tablename__ = "captains"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    hashed_password = Column(String)
    team_id = Column(Integer, ForeignKey("teams.id"))
    team_name = Column(String)
    is_admin = Column(Boolean, default=False)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    session_token = Column(String, nullable=True)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id = Column(Integer, primary_key=True)
    captain_id = Column(Integer, ForeignKey("captains.id"))
    token = Column(String, unique=True)
    expires_at = Column(DateTime)
    used = Column(Boolean, default=False)


class PasswordChangeRequest(Base):
    __tablename__ = "password_change_requests"
    id = Column(Integer, primary_key=True)
    captain_id = Column(Integer, ForeignKey("captains.id"))
    request_type = Column(String)  # "password_reset" or "change_captain" or "change_team_name"
    reason = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, approved, denied
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
