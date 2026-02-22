from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import datetime

router = APIRouter()


class AuditEntry(BaseModel):
    id: str
    title: str
    type: str
    last_updated: str


class AuditReport(BaseModel):
    user_id: str
    generated_at: str
    total_entries: int
    recommendations: List[str]
    risk_score: str


class AuditRequest(BaseModel):
    user_id: str
    entries: List[AuditEntry]


@router.post("/audit", response_model=AuditReport)
async def generate_audit(req: AuditRequest):
    """
    Generate a security audit report for a user's vault.
    Analyzes entry age, diversity, and provides recommendations.
    """
    recommendations = []
    risk_factors = 0

    # Check for stale entries (not updated in 90+ days)
    now = datetime.now()
    stale_entries = []
    for entry in req.entries:
        try:
            updated = datetime.fromisoformat(req.entries[0].last_updated.replace("Z", "+00:00"))
            days_old = (now - updated.replace(tzinfo=None)).days
            if days_old > 90 and entry.type == "credential":
                stale_entries.append(entry.title)
                risk_factors += 1
        except Exception:
            pass

    if stale_entries:
        recommendations.append(
            f"🔄 Update these credentials — not changed in 90+ days: {', '.join(stale_entries[:3])}"
        )

    # Check vault size
    if len(req.entries) == 0:
        recommendations.append("📝 Your vault is empty. Start adding your credentials to keep them secure.")

    if len(req.entries) > 0 and not any(e.type == "note" for e in req.entries):
        recommendations.append("📋 Consider adding secure notes for recovery codes and other sensitive info.")

    # General recommendations
    recommendations.append("🔑 Use unique passwords for every account — never reuse credentials.")
    recommendations.append("🛡️ Enable two-factor authentication on all critical accounts.")
    recommendations.append("🔍 Run breach checks on your stored passwords regularly.")

    risk_score = "LOW" if risk_factors == 0 else ("MEDIUM" if risk_factors <= 2 else "HIGH")

    return AuditReport(
        user_id=req.user_id,
        generated_at=now.isoformat(),
        total_entries=len(req.entries),
        recommendations=recommendations,
        risk_score=risk_score,
    )
