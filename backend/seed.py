from database import SessionLocal
from models import Team, Player, Pair, Captain
from auth import hash_password


def seed():
    db = SessionLocal()

    teams = ["Team A", "Team B", "Team C", "Team D", "Team E"]

    for team_name in teams:
        team = Team(name=team_name)
        db.add(team)
        db.commit()
        db.refresh(team)

        players = []
        prefix = team_name.split()[-1]

        for i in range(1, 11):
            p = Player(name=f"{prefix}{i}", team_id=team.id)
            db.add(p)
            db.commit()
            db.refresh(p)
            players.append(p)

        pair_definitions = [
            (0,1),(0,2),(1,3),(2,4),(3,5),
            (4,6),(5,7),(6,8),(7,9),(8,9),
        ]

        for idx, (a, b) in enumerate(pair_definitions):
            pair = Pair(
                name=f"P{idx+1}",
                player1_id=players[a].id,
                player2_id=players[b].id,
                team_id=team.id
            )
            db.add(pair)

        # create captain account: username = "captain_a", password = "pass_a"
        suffix = team_name.split()[-1].lower()
        captain = Captain(
            username=f"captain_{suffix}",
            hashed_password=hash_password(f"pass_{suffix}"),
            team_id=team.id,
            team_name=team_name,
            is_admin=False
        )
        db.add(captain)

    # admin account
    admin = Captain(
        username="admin",
        hashed_password=hash_password("admin123"),
        team_id=None,
        team_name="Admin",
        is_admin=True
    )
    db.add(admin)

    db.commit()


if __name__ == "__main__":
    seed()
