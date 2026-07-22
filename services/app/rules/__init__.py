"""Rule engine + multi-channel dispatcher (T1, spec §0).

Single path for ALL field alerts (weather now; vegetation T2, pest T9, irrigation T8 next): rule
producers emit candidate alerts → the dispatcher applies quiet-hours + per-type cooldown +
severity-escalation before writing a notification, so nothing re-fires every cron run."""
from .engine import run_rules

__all__ = ["run_rules"]
