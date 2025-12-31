def test_events_for_submission(client, monkeypatch):
    from backend.app.api import submissions as submissions_api

    monkeypatch.setattr(
        submissions_api,
        "generate_presigned_put",
        lambda *args, **kwargs: "http://example.com/upload",
    )
    monkeypatch.setattr(submissions_api, "enqueue_submission", lambda *args: None)

    register = client.post(
        "/auth/register", json={"email": "events@example.com", "password": "pass-123"}
    )
    token = register.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    created = client.post(
        "/submissions",
        json={
            "filename": "clip.wav",
            "content_type": "audio/wav",
            "anonymization_mode": "SOFT",
        },
        headers=headers,
    )
    submission_id = created.json()["id"]

    client.post(f"/submissions/{submission_id}/uploaded", headers=headers)

    events = client.get(f"/events?submission_id={submission_id}", headers=headers)
    assert events.status_code == 200
    names = [event["event_name"] for event in events.json()]
    assert "audio.uploaded" in names


def test_events_stream(client, monkeypatch):
    from backend.app.api import submissions as submissions_api

    monkeypatch.setattr(
        submissions_api,
        "generate_presigned_put",
        lambda *args, **kwargs: "http://example.com/upload",
    )
    monkeypatch.setattr(submissions_api, "enqueue_submission", lambda *args: None)

    register = client.post(
        "/auth/register", json={"email": "stream@example.com", "password": "pass-123"}
    )
    token = register.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    created = client.post(
        "/submissions",
        json={
            "filename": "clip.wav",
            "content_type": "audio/wav",
            "anonymization_mode": "SOFT",
        },
        headers=headers,
    )
    submission_id = created.json()["id"]

    client.post(f"/submissions/{submission_id}/uploaded", headers=headers)

    stream_url = f"/events/stream?token={token}&since=1970-01-01T00:00:00Z"
    with client.stream("GET", stream_url) as response:
        assert response.status_code == 200
        chunks = ""
        for _ in range(4):
            chunks += next(response.iter_text())
            if "data:" in chunks:
                break

    assert "audio.uploaded" in chunks
