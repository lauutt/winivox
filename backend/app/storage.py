from botocore.config import Config
import boto3

from .settings import settings


_s3_client = None
_internal_s3_client = None


def create_s3_client(endpoint: str):
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


def get_s3_client():
    global _s3_client
    if _s3_client is None:
        _s3_client = create_s3_client(settings.s3_public_endpoint)
    return _s3_client


def get_internal_s3_client():
    global _internal_s3_client
    if _internal_s3_client is None:
        _internal_s3_client = create_s3_client(settings.s3_endpoint)
    return _internal_s3_client


def generate_presigned_put(bucket: str, key: str, content_type: str) -> str:
    client = get_s3_client()
    return client.generate_presigned_url(
        "put_object",
        Params={"Bucket": bucket, "Key": key, "ContentType": content_type},
        ExpiresIn=3600,
    )


def generate_presigned_get(bucket: str, key: str) -> str:
    client = get_s3_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=3600,
    )
