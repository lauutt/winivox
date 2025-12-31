import redis

from .settings import settings

QUEUE_NAME = "audio:queue"


_redis_client = None


def get_redis_client():
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.Redis.from_url(settings.redis_url)
    return _redis_client


def enqueue_submission(submission_id: str) -> None:
    client = get_redis_client()
    client.rpush(QUEUE_NAME, submission_id)

