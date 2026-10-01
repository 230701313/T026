"""JWT verification for Supabase-issued access tokens."""

from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.core.config import get_settings

settings = get_settings()
bearer_scheme = HTTPBearer(auto_error=False)


@dataclass
class CurrentUser:
    id: str
    email: str | None = None


@lru_cache
def _get_jwks_client() -> PyJWKClient:
    jwks_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    return PyJWKClient(jwks_url)


def _decode_token(token: str) -> dict:
    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError as exc:
        print(f"[AUTH ERROR] Failed to parse JWT header: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid JWT header format: {str(exc)}",
        ) from exc

    alg = header.get("alg", "HS256")
    kid = header.get("kid")
    print(f"[AUTH DEBUG] Verifying token | Algorithm: {alg} | Key ID: {kid}")

    try:
        if alg == "HS256":
            if not settings.supabase_jwt_secret:
                print("[AUTH ERROR] SUPABASE_JWT_SECRET is missing in config/environment!")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Server misconfiguration: SUPABASE_JWT_SECRET is not set.",
                )
            return jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )

        # Asymmetric (ES256 / RS256): verify against Supabase public JWKS endpoint
        if not settings.supabase_url:
            print("[AUTH ERROR] SUPABASE_URL is missing in config/environment!")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Server misconfiguration: SUPABASE_URL is not set.",
            )

        jwks_client = _get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=[alg],
            options={"verify_aud": False},
        )

    except jwt.ExpiredSignatureError as exc:
        print(f"[AUTH ERROR] Token expired: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please log in again.",
        ) from exc
    except jwt.InvalidSignatureError as exc:
        print(f"[AUTH ERROR] Signature mismatch: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token signature mismatch. Check your SUPABASE_JWT_SECRET or JWKS settings.",
        ) from exc
    except jwt.PyJWTError as exc:
        print(f"[AUTH ERROR] PyJWT Error ({type(exc).__name__}): {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token ({type(exc).__name__}): {str(exc)}",
        ) from exc
    except Exception as exc:
        print(f"[AUTH ERROR] Unexpected verification error ({type(exc).__name__}): {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not verify authentication token: {str(exc)}",
        ) from exc


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    """Require a valid Supabase access token. Raises 401 if missing/invalid."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token.",
        )
    payload = _decode_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token did not contain a valid subject.",
        )
    return CurrentUser(id=user_id, email=payload.get("email"))


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser | None:
    """Returns None instead of raising for public endpoints that optionally use auth."""
    if credentials is None:
        return None
    try:
        payload = _decode_token(credentials.credentials)
    except HTTPException:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return CurrentUser(id=user_id, email=payload.get("email"))