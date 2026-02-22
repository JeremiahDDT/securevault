from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from services.breach import check_password_breach

router = APIRouter()


class BreachResponse(BaseModel):
    breached: bool
    count: int
    message: str


@router.get("/breach-check", response_model=BreachResponse)
async def breach_check(password: str = Query(..., description="Password to check")):
    """
    Check if a password has appeared in known data breaches.
    Uses k-anonymity — the full password and hash never leave this service.
    """
    try:
        breached, count = await check_password_breach(password)
        
        if breached:
            return BreachResponse(
                breached=True,
                count=count,
                message=f"⚠️ This password has appeared in {count:,} data breaches. Change it immediately."
            )
        
        return BreachResponse(
            breached=False,
            count=0,
            message="✅ This password has not appeared in any known data breaches."
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Breach check service unavailable: {str(e)}")
