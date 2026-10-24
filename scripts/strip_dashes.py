#!/usr/bin/env python3
"""Replace en dashes and em dashes in built files.

ECharts ships a Chinese locale string that uses U+2014. The page copy
does not, and the build must not contain those characters either.
"""

from __future__ import annotations

import sys
from pathlib import Path

REPLACEMENTS = {
    "\u2013": ",",
    "\u2014": ",",
}
EXTENSIONS = {".html", ".js", ".css", ".json", ".svg", ".txt", ".md"}


def main() -> None:
    roots = [Path(arg) for arg in sys.argv[1:]]
    if not roots:
        print("usage: strip_dashes.py <file-or-dir>...", file=sys.stderr)
        sys.exit(2)
    changed = 0
    for root in roots:
        files = [root] if root.is_file() else [path for path in root.rglob("*") if path.is_file()]
        for path in files:
            if path.suffix.lower() not in EXTENSIONS:
                continue
            text = path.read_text(encoding="utf-8", errors="replace")
            updated = text
            for char, replacement in REPLACEMENTS.items():
                updated = updated.replace(char, replacement)
            if updated != text:
                path.write_text(updated, encoding="utf-8")
                changed += 1
                print(f"stripped {path}")
    if not changed:
        print("nothing to strip")


if __name__ == "__main__":
    main()
