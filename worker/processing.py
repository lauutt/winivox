import math
import os
import shutil
import subprocess
import tempfile
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from events import record_event
from llm import generate_metadata
from moderation import moderate_text
from models import AudioSubmission
from settings import settings
from storage import get_s3_client
from transcription import transcribe_audio

STEPS = {
    "normalize": 1,
    "transcribe": 2,
    "moderate": 3,
    "tag": 4,
    "anonymize": 5,
    "publish": 6,
}

ANON_SEMITONES = {
    "OFF": 0,
    "SOFT": 2,
    "MEDIUM": 3,
    "STRONG": 4,
}


def _run(cmd: list[str]) -> bool:
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return True
    except subprocess.CalledProcessError:
        return False


def _probe_sample_rate(path: str) -> Optional[int]:
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "a:0",
        "-show_entries",
        "stream=sample_rate",
        "-of",
        "default=nokey=1:noprint_wrappers=1",
        path,
    ]
    try:
        result = subprocess.run(
            cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
        )
        return int(result.stdout.strip())
    except Exception:
        return None


def normalize_audio(input_path: str, output_path: str) -> None:
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        input_path,
        "-af",
        "loudnorm=I=-16:TP=-1.5:LRA=11",
        output_path,
    ]
    if not _run(cmd):
        if not _run(["ffmpeg", "-y", "-i", input_path, output_path]):
            shutil.copyfile(input_path, output_path)


def pitch_shift_audio(input_path: str, output_path: str, semitones: int) -> None:
    if semitones == 0:
        shutil.copyfile(input_path, output_path)
        return

    sample_rate = _probe_sample_rate(input_path) or 44100
    ratio = math.pow(2, semitones / 12)
    atempo = 1 / ratio
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        input_path,
        "-filter:a",
        f"asetrate={sample_rate}*{ratio},aresample={sample_rate},atempo={atempo}",
        output_path,
    ]
    if not _run(cmd):
        if not _run(["ffmpeg", "-y", "-i", input_path, output_path]):
            shutil.copyfile(input_path, output_path)


def process_submission(db: Session, submission_id: str) -> None:
    submission = (
        db.query(AudioSubmission).filter(AudioSubmission.id == submission_id).first()
    )
    if not submission:
        return

    if submission.status in {"REJECTED", "QUARANTINED"}:
        return

    if submission.status == "UPLOADED":
        submission.status = "PROCESSING"
        db.commit()

    if not submission.original_audio_key:
        return

    s3_client = get_s3_client()

    with tempfile.TemporaryDirectory() as tmpdir:
        original_ext = os.path.splitext(submission.original_audio_key)[1] or ".bin"
        original_path = os.path.join(tmpdir, f"original{original_ext}")
        normalized_path = os.path.join(tmpdir, "normalized.wav")
        anonymized_path = os.path.join(tmpdir, "anonymized.wav")

        s3_client.download_file(
            settings.s3_private_bucket, submission.original_audio_key, original_path
        )

        normalize_audio(original_path, normalized_path)
        if submission.processing_step < STEPS["normalize"]:
            submission.processing_step = STEPS["normalize"]
            db.commit()
            record_event(db, "audio.normalized", submission.id, {})

        if submission.processing_step < STEPS["transcribe"]:
            transcript = transcribe_audio(normalized_path)
            submission.transcript_preview = transcript
            submission.processing_step = STEPS["transcribe"]
            db.commit()
            record_event(
                db,
                "audio.transcribed",
                submission.id,
                {"chars": len(transcript)},
            )

        if submission.processing_step < STEPS["moderate"]:
            decision, details = moderate_text(submission.transcript_preview or "")
            submission.moderation_result = decision
            submission.processing_step = STEPS["moderate"]
            if decision == "REJECT":
                submission.status = "REJECTED"
            elif decision == "QUARANTINE":
                submission.status = "QUARANTINED"
            db.commit()
            record_event(
                db,
                "audio.moderated",
                submission.id,
                {"result": decision, **details},
            )
            if decision == "REJECT":
                record_event(db, "audio.rejected", submission.id, {})
                return
            if decision == "QUARANTINE":
                record_event(db, "audio.quarantined", submission.id, {})
                return

        if submission.processing_step < STEPS["tag"]:
            summary, tags, used_llm = generate_metadata(
                submission.transcript_preview or ""
            )
            submission.summary = summary
            submission.tags = tags
            submission.processing_step = STEPS["tag"]
            db.commit()
            record_event(
                db,
                "audio.tagged",
                submission.id,
                {"tags": tags, "summary": summary, "llm_used": used_llm},
            )

        if submission.processing_step < STEPS["anonymize"] or submission.processing_step < STEPS["publish"]:
            mode = submission.anonymization_mode or "SOFT"
            semitones = ANON_SEMITONES.get(mode, 2)
            pitch_shift_audio(normalized_path, anonymized_path, semitones)
            if submission.processing_step < STEPS["anonymize"]:
                submission.processing_step = STEPS["anonymize"]
                db.commit()
                record_event(db, "audio.anonymized", submission.id, {"mode": mode})

        if submission.processing_step < STEPS["publish"]:
            public_key = f"{submission.user_id}/{submission.id}/public.wav"
            s3_client.upload_file(anonymized_path, settings.s3_public_bucket, public_key)
            submission.public_audio_key = public_key
            submission.status = "APPROVED"
            submission.published_at = datetime.utcnow()
            submission.processing_step = STEPS["publish"]
            db.commit()
            record_event(db, "audio.published", submission.id, {"key": public_key})
