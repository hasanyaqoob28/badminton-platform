import itertools

TEAMS = ["Team A", "Team B", "Team C", "Team D", "Team E"]
PAIR_GROUPS = [f"P{i}" for i in range(1, 11)]


def generate_matches():
    matches = []
    for pair in PAIR_GROUPS:
        for t1, t2 in itertools.combinations(TEAMS, 2):
            matches.append({"pair_group": pair, "team1": t1, "team2": t2})
    return matches
