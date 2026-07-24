#!/usr/bin/env python3
"""
audit_path_gaps.py — find chronologically-plausible person pairs that lack
a directed path between them, despite sitting in movements that are
themselves strongly chained together.

USAGE:
    python3 audit_path_gaps.py path/to/sampleGraph.json [--loose]

WHAT IT DOES:
1. Finds movement->movement edges using "enabled" or "influenced" (a real
   lineage claim, not just loose thematic relatedness).
2. For each such chain (early movement -> later movement), gathers the
   high-importance people connected to each movement.
3. For every chronologically-ordered pair (early person's startYear before
   later person's), where the two people share at least one discipline,
   checks whether a directed path exists from the earlier person to the
   later one anywhere in the graph.
4. Reports pairs with no path as candidates worth a manual look.

--loose drops the discipline-overlap and importance filters and includes
ALL movement->movement edges (any relationship), not just enabled/influenced.
This reproduces the noisy, over-inclusive first-pass version — useful to
see how much a given filter is cutting down false positives, but the
default (tight) mode is what's actually meant to be reviewed regularly.

THIS IS A CANDIDATE LIST, NOT A TO-FIX LIST. A missing path is not
automatically a graph error — most historical figures simply aren't
connected, even ones in loosely-related movements or eras. Only add an
edge if you can independently justify a real, specific historical
connection; don't add edges just to make this script's output shrink.
"""

import json
import sys
from collections import defaultdict, deque

MIN_IMPORTANCE = 9
STRONG_CHAIN_RELS = {"enabled", "influenced"}


def build_adjacency(edges):
    adjacency = defaultdict(list)
    for e in edges:
        adjacency[e["source"]].append(e["target"])
    return adjacency


def has_path(adjacency, start, end, max_depth=12):
    if start == end:
        return True
    visited = {start}
    queue = deque([(start, 0)])
    while queue:
        node, depth = queue.popleft()
        if depth >= max_depth:
            continue
        for neighbor in adjacency[node]:
            if neighbor == end:
                return True
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, depth + 1))
    return False


def people_connected_to(edges, node_by_id, movement_id, min_importance):
    people = set()
    for e in edges:
        for pid in (e["source"], e["target"]):
            node = node_by_id.get(pid)
            if (
                node
                and node["type"] == "person"
                and node.get("importance", 0) >= min_importance
                and (e["source"] == movement_id or e["target"] == movement_id)
            ):
                people.add(pid)
    return people


def main(path: str, loose: bool) -> None:
    with open(path) as f:
        data = json.load(f)

    node_by_id = {n["id"]: n for n in data["nodes"]}
    edges = data["edges"]
    adjacency = build_adjacency(edges)

    min_importance = 0 if loose else MIN_IMPORTANCE
    require_shared_discipline = not loose
    allowed_chain_rels = None if loose else STRONG_CHAIN_RELS

    movement_chains = []
    for e in edges:
        src = node_by_id.get(e["source"])
        tgt = node_by_id.get(e["target"])
        if not (src and tgt and src["type"] == "movement" and tgt["type"] == "movement"):
            continue
        if allowed_chain_rels is not None and e["relationship"] not in allowed_chain_rels:
            continue
        movement_chains.append((src["id"], src["name"], tgt["id"], tgt["name"]))

    print(f"Mode: {'loose' if loose else 'tight'}")
    print(f"Movement chains considered: {len(movement_chains)}")
    for _, en, _, ln in movement_chains:
        print(f"  {en} -> {ln}")
    print()

    gaps = []
    checked = 0
    for early_id, early_name, later_id, later_name in movement_chains:
        early_people = people_connected_to(edges, node_by_id, early_id, min_importance)
        later_people = people_connected_to(edges, node_by_id, later_id, min_importance)
        for p1 in early_people:
            for p2 in later_people:
                if p1 == p2:
                    continue
                n1, n2 = node_by_id[p1], node_by_id[p2]
                y1, y2 = n1.get("startYear"), n2.get("startYear")
                if y1 is None or y2 is None or y1 >= y2:
                    continue
                if require_shared_discipline:
                    shared = set(n1.get("disciplines", [])) & set(n2.get("disciplines", []))
                    if not shared:
                        continue
                else:
                    shared = set()
                checked += 1
                if not has_path(adjacency, p1, p2):
                    gaps.append((n1["name"], n2["name"], early_name, later_name, shared))

    print(f"Pairs checked: {checked}")
    print(f"Gaps found: {len(gaps)}\n")
    for src, tgt, m1, m2, shared in gaps:
        shared_str = f", shared: {', '.join(shared)}" if shared else ""
        print(f"  {src} -> {tgt}   (via {m1} -> {m2}{shared_str})")


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(__doc__)
        sys.exit(0 if args else 1)
    loose = "--loose" in args
    path = [a for a in args if not a.startswith("--")][0]
    main(path, loose)