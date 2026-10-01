# """JWT verification for Supabase-issued access tokens.

# The frontend authenticates directly against Supabase Auth and attaches the
# resulting access token to every API request as `Authorization: Bearer <jwt>`.
# This module verifies that token so protected endpoints can trust
# `current_user.id` without re-implementing authentication.
# """

# from dataclasses import dataclass

# import jwt
# from fastapi import Depends, HTTPException, status
# from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

# from app.core.config import get_settings

# settings = get_settings()
# bearer_scheme = HTTPBearer(auto_error=False)


# @dataclass
# class CurrentUser:
#     id: str
#     email: str | None = None


# def _decode_token(token: str) -> dict:
#     if not settings.supabase_jwt_secret:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail="Server misconfiguration: SUPABASE_JWT_SECRET is not set.",
#         )
#     try:
#         return jwt.decode(
#             token,
#             settings.supabase_jwt_secret,
#             algorithms=["HS256"],
#             audience="authenticated",
#         )
#     except jwt.PyJWTError as exc:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Invalid or expired authentication token.",
#         ) from exc


# async def get_current_user(
#     credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
# ) -> CurrentUser:
#     """Require a valid Supabase access token. Raises 401 if missing/invalid."""
#     if credentials is None:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Missing authentication token.",
#         )
#     payload = _decode_token(credentials.credentials)
#     user_id = payload.get("sub")
#     if not user_id:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Token did not contain a valid subject.",
#         )
#     return CurrentUser(id=user_id, email=payload.get("email"))


# async def get_current_user_optional(
#     credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
# ) -> CurrentUser | None:
#     """Like get_current_user, but returns None instead of raising for public endpoints
#     that behave differently when a user happens to be logged in."""
#     if credentials is None:
#         return None
#     try:
#         payload = _decode_token(credentials.credentials)
#     except HTTPException:
#         return None
#     user_id = payload.get("sub")
#     if not user_id:
#         return None
#     return CurrentUser(id=user_id, email=payload.get("email"))
