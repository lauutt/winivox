import importlib
import os
import sys

# Add /app to path for imports
sys.path.insert(0, '/app')

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker


@pytest.fixture(scope="session")
def app_state(tmp_path_factory):
    db_path = tmp_path_factory.mktemp("db") / "test.db"
    os.environ["DATABASE_URL"] = f"sqlite+pysqlite:///{db_path}"
    os.environ.setdefault("OPENAI_API_KEY", "")

    from app import db as app_db
    from app import main

    importlib.reload(app_db)
    importlib.reload(main)

    engine = app_db.engine
    TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    app_db.ensure_schema = lambda: None
    main.ensure_schema = app_db.ensure_schema

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app = main.app
    app.dependency_overrides[app_db.get_db] = override_get_db

    return app, app_db, TestingSessionLocal


@pytest.fixture()
def client(app_state):
    app, app_db, _ = app_state
    app_db.Base.metadata.drop_all(bind=app_db.engine)
    app_db.Base.metadata.create_all(bind=app_db.engine)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def db_session(app_state, client):
    _, app_db, TestingSessionLocal = app_state
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
