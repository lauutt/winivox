def test_register_login_me(client):
    payload = {"email": "user@example.com", "password": "valid-password-123"}
    res = client.post("/auth/register", json=payload)
    assert res.status_code == 200
    token = res.json()["access_token"]
    assert token

    login_res = client.post(
        "/auth/login",
        data={"username": payload["email"], "password": payload["password"]},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == payload["email"]
