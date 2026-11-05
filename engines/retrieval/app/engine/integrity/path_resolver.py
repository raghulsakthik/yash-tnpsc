from __future__ import annotations

from pathlib import Path

from app.config.settings import DATA_ROOT


_LEGACY_MARKERS = (
    "/data/tnpsc-material/",
    "\\data\\tnpsc-material\\",
)


def resolve_resource_path(raw_path: str | None, expected_size: int | None = None) -> Path | None:
    """Resolve a resource file after the material root was moved.

    Existing database rows may contain the former
    /home/yash/tnpsc-material-engine/data/tnpsc-material root. Prefer the
    recorded path, then remap only the known material-root suffix. No
    recursive basename guessing is performed, so duplicate filenames cannot
    silently resolve to the wrong document.
    """
    if not raw_path:
        return None

    recorded = Path(raw_path).expanduser()
    candidates: list[Path] = [recorded]

    raw = str(raw_path)
    for marker in _LEGACY_MARKERS:
        if marker in raw:
            suffix = raw.split(marker, 1)[1]
            candidates.append(DATA_ROOT / suffix.replace("\\", "/"))
            break

    for candidate in candidates:
        try:
            resolved = candidate.resolve()
            if not resolved.is_file():
                continue
            # Keep the resolver confined to the configured material root
            # whenever it remaps a legacy path.
            if candidate != recorded:
                resolved.relative_to(DATA_ROOT.resolve())
            if expected_size is not None and resolved.stat().st_size != expected_size:
                continue
            return resolved
        except (OSError, ValueError):
            continue

    return None
