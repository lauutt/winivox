import shutil
from datetime import datetime

from worker.models import AudioSubmission, Event
from worker.processing import process_submission


class DummyS3:
    def download_file(self, bucket, key, dest):
        with open(dest, "wb") as handle:
            handle.write(b"audio")

    def upload_file(self, path, bucket, key):
        return None


def _copy_stub(input_path, output_path):
    shutil.copyfile(input_path, output_path)


def test_process_submission_approved(db_session, monkeypatch):
    monkeypatch.setattr("worker.processing.get_s3_client", lambda: DummyS3())
    monkeypatch.setattr("worker.processing.normalize_audio", _copy_stub)
    monkeypatch.setattr("worker.processing.pitch_shift_audio", _copy_stub)
    monkeypatch.setattr("worker.processing.transcribe_audio", lambda path: "hola mundo")
    monkeypatch.setattr(
        "worker.processing.generate_metadata",
        lambda transcript: ("resumen", ["historia personal"], True),
    )
    monkeypatch.setattr(
        "worker.processing.moderate_text",
        lambda transcript: ("APPROVE", {"flagged": False}),
    )

    submission = AudioSubmission(
        id="sub-1",
        user_id="user-1",
        status="UPLOADED",
        processing_step=0,
        original_audio_key="user-1/sub-1/original.wav",
        public_audio_key=None,
        transcript_preview=None,
        summary=None,
        tags=None,
        moderation_result=None,
        anonymization_mode="SOFT",
        created_at=datetime.utcnow(),
        published_at=None,
    )
    db_session.add(submission)
    db_session.commit()

    process_submission(db_session, submission.id)

    refreshed = db_session.query(AudioSubmission).filter_by(id="sub-1").first()
    assert refreshed.status == "APPROVED"
    assert refreshed.summary == "resumen"
    assert refreshed.tags == ["historia personal"]
    assert refreshed.public_audio_key is not None

    events = db_session.query(Event).filter_by(submission_id="sub-1").all()
    names = {event.event_name for event in events}
    assert "audio.published" in names


def test_process_submission_rejected(db_session, monkeypatch):
    monkeypatch.setattr("worker.processing.get_s3_client", lambda: DummyS3())
    monkeypatch.setattr("worker.processing.normalize_audio", _copy_stub)
    monkeypatch.setattr("worker.processing.transcribe_audio", lambda path: "bad stuff")
    monkeypatch.setattr(
        "worker.processing.moderate_text",
        lambda transcript: ("REJECT", {"flagged": True}),
    )

    submission = AudioSubmission(
        id="sub-2",
        user_id="user-1",
        status="UPLOADED",
        processing_step=0,
        original_audio_key="user-1/sub-2/original.wav",
        public_audio_key=None,
        transcript_preview=None,
        summary=None,
        tags=None,
        moderation_result=None,
        anonymization_mode="SOFT",
        created_at=datetime.utcnow(),
        published_at=None,
    )
    db_session.add(submission)
    db_session.commit()

    process_submission(db_session, submission.id)

    refreshed = db_session.query(AudioSubmission).filter_by(id="sub-2").first()
    assert refreshed.status == "REJECTED"
    assert refreshed.summary is None
