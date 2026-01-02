from datetime import datetime


def test_feed_and_tags(client, db_session, monkeypatch):
    from backend.app.api import feed as feed_api
    from backend.app.models import AudioSubmission, User

    monkeypatch.setattr(
        feed_api,
        "generate_presigned_get",
        lambda *args, **kwargs: "http://example.com/audio",
    )

    user = User(email="listener@example.com", password_hash="hashed")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    submission_a = AudioSubmission(
        id="sub-a",
        user_id=user.id,
        status="APPROVED",
        processing_step=6,
        original_audio_key="orig-a.wav",
        public_audio_key="pub-a.wav",
        transcript_preview="hola mundo",
        title="Fui a la comisaria y me atendieron mal",
        summary="resumen a",
        tags=["relato personal", "noche larga"],
        viral_analysis=12,
        moderation_result="APPROVE",
        anonymization_mode="SOFT",
        created_at=datetime.utcnow(),
        published_at=datetime.utcnow(),
    )
    submission_b = AudioSubmission(
        id="sub-b",
        user_id=user.id,
        status="APPROVED",
        processing_step=6,
        original_audio_key="orig-b.wav",
        public_audio_key="pub-b.wav",
        transcript_preview="otra historia",
        title="Me olvide el cafe de todos los dias",
        summary="resumen b",
        tags=["trabajo remoto", "cambio de rutina"],
        viral_analysis=90,
        moderation_result="APPROVE",
        anonymization_mode="SOFT",
        created_at=datetime.utcnow(),
        published_at=datetime.utcnow(),
    )
    db_session.add_all([submission_a, submission_b])
    db_session.commit()

    res = client.get("/feed")
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 2
    assert items[0]["public_url"] == "http://example.com/audio"

    tagged = client.get("/feed?tags=relato%20personal")
    assert tagged.status_code == 200
    tagged_items = tagged.json()
    assert len(tagged_items) == 1
    assert tagged_items[0]["id"] == "sub-a"

    tags = client.get("/feed/tags?limit=30")
    assert tags.status_code == 200
    assert "relato personal" in tags.json()

    story = client.get("/feed/sub-a")
    assert story.status_code == 200
    payload = story.json()
    assert payload["id"] == "sub-a"
    assert payload["transcript"] == "hola mundo"

    low = client.get("/feed/low-serendipia?limit=1")
    assert low.status_code == 200
    low_items = low.json()
    assert len(low_items) == 1
    assert low_items[0]["id"] == "sub-a"
