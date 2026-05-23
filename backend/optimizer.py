COURTS = 6

TEAMS = ["Team A", "Team B", "Team C", "Team D", "Team E"]

# pair_definitions index → (player_index_a, player_index_b)
# P1=(0,1), P2=(0,2), P3=(1,3), P4=(2,4), P5=(3,5),
# P6=(4,6), P7=(5,7), P8=(6,8), P9=(7,9), P10=(8,9)
PAIR_PLAYERS = {
    "P1":  (0, 1),
    "P2":  (0, 2),
    "P3":  (1, 3),
    "P4":  (2, 4),
    "P5":  (3, 5),
    "P6":  (4, 6),
    "P7":  (5, 7),
    "P8":  (6, 8),
    "P9":  (7, 9),
    "P10": (8, 9),
}


def players_in_match(match):
    """Return set of (team, player_index) for all 4 players in a match."""
    p1, p2 = PAIR_PLAYERS[match["pair_group"]]
    return {
        (match["team1"], p1),
        (match["team1"], p2),
        (match["team2"], p1),
        (match["team2"], p2),
    }


def optimize_schedule(matches):
    remaining = list(matches)
    slots = []

    while remaining:
        slot = []
        busy_players = set()
        still_remaining = []

        for match in remaining:
            players = players_in_match(match)
            if len(slot) < COURTS and not players & busy_players:
                slot.append(match)
                busy_players |= players
            else:
                still_remaining.append(match)

        slots.append(slot)
        remaining = still_remaining

    output = []
    for slot_idx, slot in enumerate(slots):
        for court_idx, match in enumerate(slot):
            output.append({**match, "slot": slot_idx, "court": court_idx + 1})

    return output
