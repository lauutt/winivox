def test_submission_flow(client, monkeypatch):
    from backend.app.api import submissions as submissions_api

    monkeypatch.setattr(
        submissions_api,
        "generate_presigned_put",
        lambda *args, **kwargs: "http://example.com/upload",
    )
    monkeypatch.setattr(submissions_api, "enqueue_submission", lambda *args: None)

    register = client.post(
        "/auth/register", json={"email": "uploader@example.com", "password": "pass-123"}
    )
    token = register.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/submissions",
        json={
            "filename": "clip.wav",
            "content_type": "audio/wav",
            "anonymization_mode": "SOFT",
        },
        headers=headers,
    )
    assert res.status_code == 200
    payload = res.json()
    assert payload["upload_url"] == "http://example.com/upload"

    uploaded = client.post(
        f"/submissions/{payload['id']}/uploaded",
        headers=headers,
    )
    assert uploaded.status_code == 200
    assert uploaded.json()["status"] == "UPLOADED"

    listed = client.get("/submissions", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1
