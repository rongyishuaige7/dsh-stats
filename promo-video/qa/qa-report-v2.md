# DSH Usage Promo v2 QA

## Result

PASS. The final MP4 decodes from start to finish with 720 video frames and a complete AAC audio stream. Every product screenshot remains fully visible inside its window.

## Output

- Dimensions: 1920x1080
- Rate: 24 fps
- Duration: 30.00 seconds
- Video: H.264 High, yuv420p full range
- Audio: AAC LC, 48 kHz mono
- Size: 10,279,073 bytes
- SHA-256: `38676de528750481e4e5707244e78470921b6bde7b6960ce684d3d21ef5ae78d`
- Audio loudness: mean -33.9 dB, max -27.9 dB

## Visual Review

The seven decoded keyframes and `contact-sheet-v2.jpg` cover the hook, overview, timeline, trends, balance, merge, and close beats. Screenshots use proportional contain fitting with at least 24 pixels of internal window space, and animated translation is clamped so no source edge can leave that safe area.

The inaccurate fixed overview highlight rectangle was removed. Overview, timeline, and trends scans now derive their coordinates from the actual fitted image rectangle, so their positions remain aligned across source aspect ratios and camera motion. Chinese labels and the installation command remain within their bounds. The v2 poster is 1920x1080.

The anti-PPT gate passes: every beat retains a moving product object and state change. The common data rail, image-bound scan, provider wipe, and merge paths preserve one visual system, while text supports the product views instead of replacing them.

## Boundary Check

Mean absolute RGB difference for adjacent source frames at each beat boundary:

- 95 -> 96: 2.69
- 215 -> 216: 6.70
- 335 -> 336: 4.54
- 455 -> 456: 3.09
- 575 -> 576: 5.68
- 647 -> 648: 0.55

All six boundary pairs were visually reviewed. No boundary introduces an empty frame, clipped screenshot, or unrelated visual reset.

## Verification Notes

`ffprobe` is unavailable in this environment. Codec, dimensions, duration, frame rate, audio format, and decoded frame count were verified from ffmpeg's demux and full-decode output; the source frame directory independently contains exactly 720 frames.
