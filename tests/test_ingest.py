"""URL ingest: input validation, client-safe error translation, and the YouTube kill-switch.

The contract these lock in: a raw extractor error (YouTube's "confirm you're not a bot",
"format not available", …) must NEVER reach the client — it's translated to a calm
"temporarily unavailable — please upload" message; junk URLs are rejected up front; and an
operator can cleanly disable YouTube links.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from app.config import settings
from app.services.ingest import IngestError, _friendly_url_error, _validate_url, ingest_url


def test_friendly_error_never_leaks_the_bot_wall():
    raw = "ERROR: [youtube] kfW94tNMFkA: Sign in to confirm you're not a bot. Use --cookies..."
    msg = _friendly_url_error("youtube", raw)
    assert "not a bot" not in msg.lower() and "cookies" not in msg.lower()
    assert "upload" in msg.lower()


@pytest.mark.parametrize("raw", [
    "Requested format is not available",
    "Only images are available for download",
    "Private video. Sign in if you've been granted access",
    "ERROR: Video unavailable",
    "HTTP Error 429: Too Many Requests",
])
def test_friendly_error_is_calm_for_known_failures(raw):
    msg = _friendly_url_error("youtube", raw)
    assert msg and "ERROR" not in msg and "http error" not in msg.lower()


def test_our_duration_cap_message_is_preserved():
    raw = "Video is 4000s; max allowed is 1800s."
    assert _friendly_url_error("youtube", raw) == raw


@pytest.mark.parametrize("bad", ["not a url", "ftp://x", "", "javascript:alert(1)", "  "])
def test_validate_rejects_non_http_urls(bad):
    with pytest.raises(IngestError):
        _validate_url(bad.strip())


def test_youtube_kill_switch_declines_cleanly(monkeypatch, tmp_path: Path):
    """With YouTube ingest disabled, a YouTube URL is declined with a clean message — no network."""
    monkeypatch.setattr(settings, "youtube_ingest_enabled", False)
    with pytest.raises(IngestError) as ei:
        ingest_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ", tmp_path)
    assert "unavailable" in str(ei.value).lower() and "upload" in str(ei.value).lower()
