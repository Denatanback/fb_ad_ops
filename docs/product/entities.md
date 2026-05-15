# Entities

## Approach
Top-level business entity.
Examples:
- Past Life
- Soulmate
- IQ Test

## Creative
A finished ad asset.
Rules:
- belongs to exactly one Approach
- can have many Launches

Suggested fields:
- id
- name
- approach_id
- type
- source_url
- asset_url
- preview_url
- thumbnail_url
- drive_file_id
- drive_web_view_link
- source_filename
- source_mime_type
- source_byte_size
- current_status
- notes
- created_at
- updated_at

## Lander
Landing destination used in tests.

Suggested fields:
- id
- name
- url
- approach_id (optional, decide later)
- notes
- created_at
- updated_at

## Launch
A specific test or scaling run of a Creative with a Lander and setup.

Suggested fields:
- id
- creative_id
- lander_id
- setup_name
- lifecycle_status
- launched_at
- stopped_at
- notes
- created_at
- updated_at

## Launch Metrics
Metrics recorded for a Launch.

Suggested fields:
- id
- launch_id
- cpc
- ctr
- cplpv
- outbound_ctr
- cpm
- clicks
- cr
- results
- cost_per_result
- captured_at

## Creative Tags
Labels applied to a creative:
- winner
- loser
- top_ctr
