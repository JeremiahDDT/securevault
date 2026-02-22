from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.encryption import encrypt, decrypt
from cryptography.exceptions import InvalidTag

router = APIRouter()


class EncryptRequest(BaseModel):
    plaintext: str


class DecryptRequest(BaseModel):
    ciphertext: str
    iv: str
    tag: str


@router.post("/encrypt")
async def encrypt_endpoint(req: EncryptRequest):
    """Encrypt plaintext using AES-256-GCM."""
    if not req.plaintext:
        raise HTTPException(status_code=400, detail="Plaintext cannot be empty")
    return encrypt(req.plaintext)


@router.post("/decrypt")
async def decrypt_endpoint(req: DecryptRequest):
    """Decrypt AES-256-GCM ciphertext. Returns 422 if content was tampered with."""
    try:
        plaintext = decrypt(req.ciphertext, req.iv, req.tag)
        return {"plaintext": plaintext}
    except InvalidTag:
        # This means the stored data was modified — this is a security event
        raise HTTPException(
            status_code=422,
            detail="Decryption failed: authentication tag invalid. Data may have been tampered with."
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Decryption error: {str(e)}")
