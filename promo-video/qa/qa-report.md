# DSH Usage Promo v1 QA

## Result

PASS. The final MP4 decodes from start to finish with 720 video frames and a complete AAC audio stream.

## Output

- Dimensions: 1920x1080
- Rate: 24 fps
- Duration: 30.00 seconds
- Video: H.264 High, yuv420p full range
- Audio: AAC LC, 48 kHz mono
- Size: 12,299,876 bytes
- SHA-256: `23c7ec02b40309b4e31a1ec52187aa6fceef31fd4514c42ddb29c4578bcfbeb4`
- Audio loudness: mean -33.9 dB, max -27.9 dB

## Visual Review

The seven decoded keyframes and `contact-sheet.jpg` cover the hook, overview, timeline, trends, balance, merge, and close beats. Product screenshots retain their original aspect ratio. Chinese labels and the installation command remain within their bounds. The final poster is 1920x1080.

The anti-PPT gate passes: every beat has a moving product object and a state change; the common data rail, scan edge, cursor, camera pan, provider wipe, and merge paths preserve one visual system; text supports the product views instead of replacing them.

## Boundary Check

Mean absolute RGB difference for adjacent source frames at each beat boundary:

- 95 -> 96: 2.20
- 215 -> 216: 1.23
- 335 -> 336: 1.31
- 455 -> 456: 0.95
- 575 -> 576: 3.04
- 647 -> 648: 0.55

No boundary introduces an empty frame or an unrelated visual reset.

## Verification Notes

`ffprobe` is unavailable in this environment. Codec, dimensions, duration, frame rate, audio format, and decoded frame count were verified from ffmpeg's demux and full-decode output; the source frame directory independently contains exactly 720 frames.
