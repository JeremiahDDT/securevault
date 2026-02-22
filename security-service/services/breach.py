"""
HaveIBeenPwned Breach Detection (k-Anonymity Model)
====================================================
Checks if a password has appeared in known data breaches WITHOUT
ever transmitting the actual password or its full hash.

How k-anonymity works:
1. Compute SHA-1 hash of the password
2. Send ONLY the first 5 characters of the hash to HIBP API
3. HIBP returns all hashes starting with those 5 chars (~500 results)
4. Search the response LOCALLY for the full hash
5. If found → password is compromised

The plaintext password NEVER leaves this service.
The full hash NEVER leaves this service.
This is the same technique used by 1Password and Firefox Monitor.
"""

import hashlib
import httpx
from typing import Tuple


HIBP_API_URL = "https://api.pwnedpasswords.com/range"


async def check_password_breach(password: str) -> Tuple[bool, int]:
    """
    Check if a password has appeared in known data breaches.
    
    Args:
        password: The plaintext password to check
        
    Returns:
        Tuple of (is_breached: bool, breach_count: int)
    """
    # Step 1: Hash the password with SHA-1
    sha1_hash = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()
    
    # Step 2: Split into prefix (5 chars) and suffix
    prefix = sha1_hash[:5]
    suffix = sha1_hash[5:]
    
    # Step 3: Send only the prefix to HIBP
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(
            f"{HIBP_API_URL}/{prefix}",
            headers={
                "Add-Padding": "true",  # Prevents traffic analysis attacks
                "User-Agent": "SecureVault/1.0",
            }
        )
        response.raise_for_status()
    
    # Step 4: Search the returned list locally for our suffix
    lines = response.text.splitlines()
    
    for line in lines:
        returned_suffix, count = line.split(":")
        if returned_suffix.upper() == suffix:
            return True, int(count)
    
    # Step 5: Not found → password is clean
    return False, 0
