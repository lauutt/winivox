import logging
import time

import redis

from db import Base, SessionLocal, engine, ensure_schema
from processing import process_submission
from settings import settings

QUEUE_NAME = "audio:queue"

logging.basicConfig(level=logging.INFO, format="[worker] %(message)s")


def main() -> None:
    client = redis.Redis.from_url(settings.redis_url)
    Base.metadata.create_all(bind=engine)
    ensure_schema()
    logging.info("Worker started")

    while True:
        try:
            result = client.blpop(QUEUE_NAME, timeout=5)
            if result is None:
                continue
            _, raw_id = result
            submission_id = raw_id.decode("utf-8")
            logging.info("Processing %s", submission_id)

            db = SessionLocal()
            try:
                process_submission(db, submission_id)
            finally:
                db.close()
        except Exception as exc:
            logging.exception("Worker error: %s", exc)
            time.sleep(2)


if __name__ == "__main__":
    main()
