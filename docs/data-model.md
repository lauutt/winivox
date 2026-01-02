# Modelo de datos — PoC

## users
- id
- email
- password_hash
- bio
- social_links
- profile_image_key
- created_at

## audio_submissions
- id
- user_id
- status
- original_audio_key
- public_audio_key
- cover_image_key
- transcript_preview
- title
- summary
- tags
- viral_analysis (interno)
- moderation_result
- anonymization_mode
- description
- tags_suggested
- created_at
- published_at

## votes
- id
- user_id
- audio_id
- created_at
