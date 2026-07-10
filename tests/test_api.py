from __future__ import annotations

import time


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_meta_reports_providers(client):
    r = client.get("/api/v1/meta")
    assert r.status_code == 200
    body = r.json()
    assert body["mock_mode"] is True
    assert body["providers"]["synthesizer"] == "mock"
    assert "hardware" in body


def test_create_and_fetch_recipe(client):
    r = client.post("/api/v1/recipes", json={"url": "https://youtube.com/watch?v=demo"})
    assert r.status_code == 202
    job_id = r.json()["id"]

    # Poll until the job finishes.
    recipe_id = None
    for _ in range(50):
        jr = client.get(f"/api/v1/jobs/{job_id}")
        assert jr.status_code == 200
        data = jr.json()
        if data["status"] == "succeeded":
            recipe_id = data["recipe_id"]
            break
        if data["status"] == "failed":
            raise AssertionError(f"job failed: {data['error']}")
        time.sleep(0.1)
    assert recipe_id, "job did not complete"

    rr = client.get(f"/api/v1/recipes/{recipe_id}")
    assert rr.status_code == 200
    recipe = rr.json()
    assert recipe["title"]
    assert recipe["ingredients"] and recipe["steps"]

    so = client.get(f"/api/v1/recipes/{recipe_id}/schema-org")
    assert so.status_code == 200
    assert so.json()["@type"] == "Recipe"


def test_empty_url_rejected(client):
    r = client.post("/api/v1/recipes", json={"url": "  "})
    assert r.status_code == 422


def test_missing_recipe_404(client):
    assert client.get("/api/v1/recipes/does-not-exist").status_code == 404
