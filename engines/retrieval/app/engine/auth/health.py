from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from app.config.settings import BROWSER_EXECUTABLE, BROWSER_PROFILE


@dataclass(frozen=True)
class AuthEnvironment:
    executable: str
    executable_exists: bool
    profile: str
    profile_exists: bool
    profile_writable: bool


def inspect_environment() -> AuthEnvironment:
    executable = BROWSER_EXECUTABLE
    profile = Path(BROWSER_PROFILE)
    return AuthEnvironment(
        executable=executable,
        executable_exists=Path(executable).exists(),
        profile=str(profile),
        profile_exists=profile.exists(),
        profile_writable=profile.exists() and profile.is_dir() and __import__('os').access(profile, __import__('os').W_OK),
    )
