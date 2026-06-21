"""Push notifications via Expo.

`send_expo_push` is a best-effort fire-and-forget POST to Expo's push service (never
raises). `notify_users` persists an in-app Notification per recipient and pushes to each
recipient's registered devices — call it on notice / absence / fee events.
"""

import json
import logging
import urllib.request
from uuid import UUID

from sqlalchemy.future import select

from app.models.notifications import DeviceToken, Notification

logger = logging.getLogger(__name__)
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def send_expo_push(tokens, title: str, body: str, data: dict = None) -> None:
    messages = [{"to": t, "title": title, "body": body, "data": data or {}} for t in tokens if t]
    if not messages:
        return
    try:
        req = urllib.request.Request(
            EXPO_PUSH_URL,
            data=json.dumps(messages).encode("utf-8"),
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=5)  # noqa: S310 (fixed Expo URL)
    except Exception:
        logger.warning("Expo push send failed", exc_info=True)


async def notify_users(db, school_id, user_ids, title, body, ntype="general", ref_id=None) -> None:
    """Persist a Notification row per user and best-effort push to their devices.
    The caller is responsible for committing the session."""
    user_ids = [u for u in (user_ids or [])]
    if not user_ids:
        return
    sid = UUID(str(school_id))
    for uid in user_ids:
        db.add(
            Notification(school_id=sid, user_id=uid, title=title, body=body, type=ntype, ref_id=ref_id)
        )
    await db.flush()
    tokens = (
        (await db.execute(select(DeviceToken.expo_push_token).filter(DeviceToken.user_id.in_(user_ids))))
        .scalars()
        .all()
    )
    if tokens:
        send_expo_push(tokens, title, body, {"type": ntype, "ref_id": str(ref_id) if ref_id else None})
