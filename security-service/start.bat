@echo off
set VAULT_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
python -m uvicorn main:app --port 8001