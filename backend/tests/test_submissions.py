def test_submission_flow(client, monkeypatch):
    from app.api import submissions as submissions_api

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

    # 1. Create submission (sin anonymization_mode)
    res = client.post(
        "/submissions",
        json={
            "filename": "clip.wav",
            "content_type": "audio/wav",
        },
        headers=headers,
    )
    assert res.status_code == 200
    payload = res.json()
    assert payload["upload_url"] == "http://example.com/upload"

    # 2. Mark uploaded CON configuración
    uploaded = client.post(
        f"/submissions/{payload['id']}/uploaded",
        json={
            "anonymization_mode": "MEDIUM",
            "description": "Historia de prueba",
            "tags_suggested": ["test", "demo"]
        },
        headers=headers,
    )
    assert uploaded.status_code == 200
    data = uploaded.json()
    assert data["status"] == "UPLOADED"
    assert data["anonymization_mode"] == "MEDIUM"
    assert data["description"] == "Historia de prueba"
    assert data["tags_suggested"] == ["test", "demo"]

    listed = client.get("/submissions", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1
