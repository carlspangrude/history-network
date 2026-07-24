#!/usr/bin/env python3
"""
check_edges.py — flag edges whose relationship type implies a chronological
direction that contradicts the actual node dates.

USAGE:
    python3 check_edges.py path/to/sampleGraph.json

WHAT IT DOES:
Some relationship types only make sense in one chronological direction —
e.g. you can't "challenge" or "respond to" something that doesn't exist yet,
and a person can't "found" or "author" something before they were born. This
checks every edge against its source/target nodes' startYear/endYear and
flags any that violate the expected direction for that relationship type.

Relationship types with no inherent chronological direction (complemented,
converged_with, belonged_to) are skipped entirely.
"""

import json
import sys

def main(path: str) -> None:
    with open(path) as f:
        data = json.load(f)

    nodes = {n['id']: n for n in data['nodes']}
    edges = data['edges']

    def year(node):
        if node is None:
            return None
        if node.get('startYear') is not None:
            return node['startYear']
        return node.get('endYear')

    # Relationship types where source should generally PRECEDE target chronologically
    FORWARD = {
        'influenced', 'authored', 'enabled', 'founded', 'invented', 'discovered',
        'formalized', 'advanced', 'improved', 'popularized', 'mentored', 'inspired',
        'anticipated', 'published', 'developed'
    }

    # Relationship types where source should generally POSTDATE target chronologically
    # (you can only challenge/respond to/explain something that already exists)
    BACKWARD = {
        'challenged', 'criticized', 'responded_to', 'explained', 'transformed',
        'extended', 'refined', 'synthesized'
    }

    # Symmetric / order-agnostic - skip
    SKIP = {'complemented', 'converged_with', 'belonged_to'}

    flagged = []

    for edge in edges:
        rel = edge['relationship']
        if rel in SKIP:
            continue

        source = nodes.get(edge['source'])
        target = nodes.get(edge['target'])
        sy = year(source)
        ty = year(target)

        if sy is None or ty is None:
            continue

        violation = None
        if rel in FORWARD and sy > ty:
            violation = f"FORWARD type '{rel}' but source ({sy}) is LATER than target ({ty})"
        elif rel in BACKWARD and sy < ty:
            violation = f"BACKWARD type '{rel}' but source ({sy}) is EARLIER than target ({ty})"

        if violation:
            flagged.append({
                'id': edge['id'],
                'source': edge['source'],
                'source_name': source['name'],
                'source_year': sy,
                'target': edge['target'],
                'target_name': target['name'],
                'target_year': ty,
                'relationship': rel,
                'violation': violation,
                'description': edge.get('description', '(no description)'),
            })

    print(f"Total edges checked: {len(edges)}")
    print(f"Flagged: {len(flagged)}\n")

    for f_ in flagged:
        print(f"[{f_['id']}] {f_['relationship']}")
        print(f"  source: {f_['source_name']} ({f_['source_year']})  ->  target: {f_['target_name']} ({f_['target_year']})")
        print(f"  {f_['violation']}")
        print(f"  desc: {f_['description']}")
        print()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 check_edges.py path/to/sampleGraph.json")
        sys.exit(1)
    main(sys.argv[1])