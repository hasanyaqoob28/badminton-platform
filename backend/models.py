from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
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
