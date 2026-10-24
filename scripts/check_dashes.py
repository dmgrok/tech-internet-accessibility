#!/usr/bin/env python3
"""Fail if built copy contains an en dash (U+2013) or em dash (U+2014)."""

from __future__ import annotations

import sys
from pathlib import Path

NEEDLES = {
    "\u2013": "en dash U+2013",
    "\u2014": "em dash U+2014",
}
EXTENSIONS = {".html", ".js", ".css", ".json", ".svg", ".txt", ".md"}


def main() -> None:
    roots = [Path(arg) for arg in sys.argv[1:]] or [Path("dist-single")]
    hits: list[str] = []
    for root in roots:
        if not root.exists():
            print(f"missing {root}", file=sys.stderr)
            sys.exit(2)
        files = [root] if root.is_file() else [path for path in root.rglob("*") if path.is_file()]
        for path in files:
            if path.suffix.lower() not in EXTENSIONS:
                continue
            text = path.read_text(encoding="utf-8", errors="replace")
            for char, name in NEEDLES.items():
                count = text.count(char)
                if count:
                    hits.append(f"{path}: {count} x {name}")
    if hits:
        print("\n".join(hits))
        sys.exit(1)
    print("no en dashes or em dashes in " + ", ".join(str(root) for root in roots))


if __name__ == "__main__":
    main()
