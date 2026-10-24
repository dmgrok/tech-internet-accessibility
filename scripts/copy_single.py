#!/usr/bin/env python3
"""Keep dist-single/index.html as the offline hour-of-pay file."""

from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist-single"
target = DIST / "index.html"
nested = [path for path in DIST.rglob("index.html") if path.is_file() and path.resolve() != target.resolve()]
if not target.exists() and not nested:
    raise SystemExit("dist-single has no index.html")
if nested:
    shutil.copyfile(nested[0], target)
    print(f"copied {nested[0].relative_to(ROOT)} to dist-single/index.html")
for child in list(DIST.iterdir()):
    if child.resolve() == target.resolve():
        continue
    if child.is_dir():
        shutil.rmtree(child)
    else:
        child.unlink()
    print(f"removed {child.relative_to(ROOT)}")
