# DSH Usage Promo v3 zh-TW QA

## Result

PASS. The Taiwan Mandarin voiceover is mixed into the previously approved v2 visuals. The final MP4 decodes from start to finish with 720 video frames and a complete AAC audio stream.

## Output

- Dimensions: 1920x1080
- Rate: 24 fps
- Duration: 30.00 seconds
- Video: H.264 High, yuv420p full range
- Audio: AAC LC, 48 kHz mono
- Size: 10,354,846 bytes
- SHA-256: `f197a3ff18988799abdcda67c34b57f1718424997c73e284b522279ff22bfa18`
- Audio loudness: mean -18.4 dB, max -3.2 dB

## Voiceover

- Voice: macOS `Meijia` (`zh_TW`)
- Rate: 210
- Script: seven short lines aligned to the seven visual beats
- Source track: `promo-video/audio/voiceover-zh-tw-meijia.m4a`
- Source SHA-256: `03f0d507ba331e185f45781fd5f3808adf102b8e3418e950c97261affe5beeb4`

The spoken lines begin at 00:00.08, 00:04.35, 00:09.55, 00:14.45, 00:19.55, 00:24.04, and 00:27.00. Silence detection confirms the first six lines finish before their next scene boundary; the final line finishes at the end card. Background audio is sidechain-compressed while the voice is active.

## Visual Integrity

The encoded H.264 stream SHA-256 is `e82926fbfd527a3a7c96a92a51313301d010fb15a7f57b6b7da88238557f6345`, exactly matching v2. Adding narration did not alter any video frame.

## Verification Notes

Codec, dimensions, duration, frame rate, audio format, loudness, and decoded frame count were verified from ffmpeg demux and full-decode output. The standalone voiceover and final mixed audio both decode for the complete 30-second timeline.
