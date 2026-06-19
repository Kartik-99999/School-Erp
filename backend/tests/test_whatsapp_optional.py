"""WhatsApp alerts are opt-in per school.

`send_whatsapp_if_enabled` must (a) no-op unless `school.whatsapp_enabled`, and (b) swallow
any send failure — it's a best-effort side channel that must never break student creation,
attendance marking, fee recording, or broadcasts. Pure logic (no DB / no real Twilio).
"""

from types import SimpleNamespace
from unittest.mock import MagicMock

from app.utils import twilio
from app.utils.twilio import send_whatsapp_if_enabled


def test_disabled_school_does_not_send(monkeypatch):
    mock = MagicMock(return_value=True)
    monkeypatch.setattr(twilio, "send_whatsapp_message", mock)
    school = SimpleNamespace(whatsapp_enabled=False)
    assert send_whatsapp_if_enabled(school, "+919876543210", "hi") is False
    mock.assert_not_called()


def test_none_school_does_not_send(monkeypatch):
    mock = MagicMock(return_value=True)
    monkeypatch.setattr(twilio, "send_whatsapp_message", mock)
    assert send_whatsapp_if_enabled(None, "+919876543210", "hi") is False
    mock.assert_not_called()


def test_enabled_school_sends(monkeypatch):
    mock = MagicMock(return_value=True)
    monkeypatch.setattr(twilio, "send_whatsapp_message", mock)
    school = SimpleNamespace(whatsapp_enabled=True)
    assert send_whatsapp_if_enabled(school, "+919876543210", "hello") is True
    mock.assert_called_once_with("+919876543210", "hello")


def test_send_exception_is_swallowed(monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("twilio is down")

    monkeypatch.setattr(twilio, "send_whatsapp_message", boom)
    school = SimpleNamespace(whatsapp_enabled=True)
    # Must NOT raise and must report failure (False), so the caller proceeds unaffected.
    assert send_whatsapp_if_enabled(school, "+919876543210", "hello") is False
