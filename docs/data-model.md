# Modelo de datos — PoC

## users
- id
- email
- password_hash
- created_at

## audio_submissions
- id
- user_id
- status
- original_audio_key
- public_audio_key
- transcript_preview
- summary
- tags
- moderation_result
- anonymization_mode
- created_at
- published_at

## votes
- id
- user_id
- audio_id
- created_at
