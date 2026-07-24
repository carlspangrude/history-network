#!/usr/bin/env python3
"""
audit_shortcuts.py — find person->person edges that might be better routed
through an intermediate theory/publication node.

USAGE:
    python3 audit_shortcuts.py path/to/sampleGraph.json

WHAT IT DOES:
For every person->person edge using a relationship type that usually stands
in for "their WORK did this" (influenced, enabled, challenged, criticized,
supported, responded_to, anticipated), checks whether the source person has
an origination edge (authored/proposed/discovered/formalized/developed/
founded) to a theory or publication node. If so, the edge is flagged as a
candidate for expansion — e.g. instead of "Kepler enabled Newton", route it
through "Kepler discovered Kepler's Laws" -> "Kepler's Laws enabled Newton".

Genuinely interpersonal relationship types (mentored, collaborated_with,
inspired, converged_with, belonged_to) are excluded — those describe real
direct relationships, not proxies for work-to-work influence, and don't need
an intermediate node.

THIS IS A REVIEW LIST, NOT AN AUTO-FIX LIST. Some flagged edges are fine as
direct person-to-person claims (e.g. genuine personal rivalry or debate).
Prioritize edges where the source has MULTIPLE possible connector works —
that's the strongest signal of real ambiguity worth resolving, since it
means the direct edge doesn't specify which of the person's works is meant.
"""

import json
import sys
from collections import defaultdict

ORIGINATION_RELS = {
    "authored", "proposed", "discovered", "formalized", "developed", "founded",
}

SHORTCUT_CANDIDATE_RELS = {
    "influenced", "enabled", "challenged", "criticized",
    "supported", "responded_to", "anticipated",
}


def main(path: str) -> None:
    with open(path) as f:
        data = json.load(f)

    node_by_id = {n["id"]: n for n in data["nodes"]}
    edges = data["edges"]

    # Map: person_id -> [(target_id, target_name, relationship), ...]
    person_origination = defaultdict(list)
    for e in edges:
        src = node_by_id.get(e["source"])
        tgt = node_by_id.get(e["target"])
        if not src or not tgt:
            continue
        if (
            src["type"] == "person"
            and tgt["type"] in ("theory", "publication")
            and e["relationship"] in ORIGINATION_RELS
        ):
            person_origination[src["id"]].append(
                (tgt["id"], tgt["name"], e["relationship"])
            )

    candidates = []
    for e in edges:
        src = node_by_id.get(e["source"])
        tgt = node_by_id.get(e["target"])
        if not src or not tgt:
            continue
        if (
            src["type"] == "person"
            and tgt["type"] == "person"
            and e["relationship"] in SHORTCUT_CANDIDATE_RELS
        ):
            connectors = person_origination.get(src["id"], [])
            if connectors:
                candidates.append((src["name"], e["relationship"], tgt["name"], connectors, e["id"]))

    # Sort so multi-connector (highest-ambiguity) cases surface first
    candidates.sort(key=lambda c: -len(c[3]))

    print(f"Found {len(candidates)} shortcut candidates\n")
    for src_name, rel, tgt_name, connectors, eid in candidates:
        flag = "  ⚠ multiple connectors" if len(connectors) > 1 else ""
        connector_str = ", ".join(f"{name} ({r})" for _, name, r in connectors)
        print(f"[{eid}]{flag}")
        print(f"  {src_name} --{rel}--> {tgt_name}")
        print(f"  {src_name} has origination edges to: {connector_str}")
        print()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 audit_shortcuts.py path/to/sampleGraph.json")
        sys.exit(1)
    main(sys.argv[1])