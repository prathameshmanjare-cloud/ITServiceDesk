import re
from typing import Dict, Any
from datetime import datetime

TECHNICAL_TERMS = {"server", "database", "api", "authentication", "error code",
                    "configuration", "deployment", "migration", "ssl", "dns",
                    "firewall", "vpn", "directory", "permission"}

URGENT_KEYWORDS = ["server down", "production", "critical", "urgent", "all users affected"]
NETWORK_KEYWORDS = ["down", "outage", "offline", "all users"]

def analyze_priority(category: str, title: str, description: str) -> Dict[str, Any]:
    title_lower = title.lower()
    desc_lower = description.lower()
    combined = f"{title_lower} {desc_lower}"

    reasoning = ""
    priority = "low"
    confidence = 1.0

    if category == "security":
        priority = "critical"
        reasoning = "Security category automatically set to critical"
    elif category == "network" and any(kw in combined for kw in NETWORK_KEYWORDS):
        priority = "critical"
        reasoning = "Network outage affecting all users"
    elif any(kw in combined for kw in URGENT_KEYWORDS):
        priority = "critical"
        reasoning = "Urgent keywords detected in title/description"
    elif category in ("network", "access"):
        priority = "high"
        reasoning = f"{category.capitalize()} category defaults to high priority"
    elif category == "software" and any(kw in combined for kw in ["crash", "not working", "error", "broken"]):
        priority = "high"
        reasoning = "Software issue with failure keywords"
    elif category in ("hardware", "email"):
        priority = "medium"
        reasoning = f"{category.capitalize()} category defaults to medium priority"
    else:
        priority = "low"
        reasoning = "Default low priority assignment"
        confidence = 0.7

    if len(description) > 500:
        tech_count = sum(1 for term in TECHNICAL_TERMS if term in combined)
        if tech_count >= 2:
            priority = _bump_priority(priority)
            reasoning += "; bumped due to technical complexity"
            confidence = min(1.0, confidence + 0.1)

    now = datetime.utcnow()
    hour = now.hour
    is_after_hours = hour < 8 or hour >= 18
    flag_immediate = is_after_hours and priority in ("critical", "high")

    return {
        "priority": priority,
        "confidence_score": round(confidence, 2),
        "reasoning": reasoning,
        "flag_immediate_notification": flag_immediate
    }

def _bump_priority(current: str) -> str:
    levels = ["low", "medium", "high", "critical"]
    if current in levels:
        idx = levels.index(current)
        if idx < len(levels) - 1:
            return levels[idx + 1]
    return current
