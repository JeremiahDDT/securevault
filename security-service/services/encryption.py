"""
AES-256-GCM Encryption Service
================================
Uses Authenticated Encryption with Associated Data (AEAD).

Why GCM mode over CBC?
- CBC is malleable: attackers can flip bits in ciphertext to predictably modify plaintext
- GCM generates an authentication tag that detects ANY tampering with the ciphertext
- GCM is parallelizable and faster on hardware with AES-NI support

Key: 256-bit (32 bytes) loaded from environment — never hardcoded
IV:  96-bit (12 bytes) randomly generated per encryption — never reused
Tag: 128-bit authentication tag stored alongside ciphertext
"""

import os
import base64
import secrets
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _load_key() -> bytes:
    """Load encryption key from environment variable."""
    key_hex = os.environ.get("VAULT_ENCRYPTION_KEY")
    if not key_hex:
        raise RuntimeError("VAULT_ENCRYPTION_KEY environment variable not set")
    
    key_bytes = bytes.fromhex(key_hex)
    if len(key_bytes) != 32:
        raise RuntimeError("VAULT_ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars)")
    
    return key_bytes


def encrypt(plaintext: str) -> dict:
    """
    Encrypt plaintext string using AES-256-GCM.
    
    Returns:
        dict with keys: ciphertext (b64), iv (b64), tag (b64)
    """
    key = _load_key()
    aesgcm = AESGCM(key)
    
    # Generate a cryptographically random 96-bit IV — never reuse IVs!
    # IV reuse with GCM is catastrophic — it can reveal the key
    iv = secrets.token_bytes(12)
    
    plaintext_bytes = plaintext.encode('utf-8')
    
    # AESGCM.encrypt() returns ciphertext + 16-byte auth tag appended
    ciphertext_with_tag = aesgcm.encrypt(iv, plaintext_bytes, None)
    
    # Split ciphertext and tag (tag is last 16 bytes)
    ciphertext = ciphertext_with_tag[:-16]
    tag = ciphertext_with_tag[-16:]
    
    return {
        "ciphertext": base64.b64encode(ciphertext).decode(),
        "iv": base64.b64encode(iv).decode(),
        "tag": base64.b64encode(tag).decode(),
    }


def decrypt(ciphertext_b64: str, iv_b64: str, tag_b64: str) -> str:
    """
    Decrypt AES-256-GCM encrypted content.
    
    Raises:
        cryptography.exceptions.InvalidTag if content was tampered with
    """
    key = _load_key()
    aesgcm = AESGCM(key)
    
    ciphertext = base64.b64decode(ciphertext_b64)
    iv = base64.b64decode(iv_b64)
    tag = base64.b64decode(tag_b64)
    
    # GCM verification: if the auth tag doesn't match, raises InvalidTag
    # This means any tampering with the stored data is immediately detected
    ciphertext_with_tag = ciphertext + tag
    plaintext_bytes = aesgcm.decrypt(iv, ciphertext_with_tag, None)
    
    return plaintext_bytes.decode('utf-8')
