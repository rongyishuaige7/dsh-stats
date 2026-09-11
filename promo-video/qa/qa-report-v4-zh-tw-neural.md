# DSH Usage Promo v4 zh-TW Neural QA

## Result

PASS. The macOS Meijia voice was replaced with the commonly available Microsoft Taiwan Mandarin neural voice `zh-TW-HsiaoChenNeural`. The final MP4 decodes from start to finish with 720 video frames and a complete AAC audio stream.

## Output

- Dimensions: 1920x1080
- Rate: 24 fps
- Duration: 30.00 seconds
- Video: H.264 High, yuv420p full range
- Audio: AAC LC, 48 kHz mono
- Size: 10,327,974 bytes
- SHA-256: `0136b0c32541013ebd6c106ddf46101089158a65a4b9df215137b9df91de667e`
- Audio loudness: mean -19.1 dB, max -1.8 dB

## Voiceover

- Engine: `edge-tts 7.2.8`
- Voice: `zh-TW-HsiaoChenNeural`
- Rate: `+15%`
- Pitch: unchanged
- Script: seven shortened lines aligned to the seven visual beats
- Source: `promo-video/audio/voiceover-zh-tw-hsiaochen-neural.m4a`
- Source SHA-256: `a65afe27e2498ce592f3294d6b1026934fe6285ce0724eb7a63fa70b6f6e889f`

Silence detection places audible speech at approximately 00:00.53-00:02.63, 00:04.53-00:07.84, 00:09.63-00:12.20, 00:14.54-00:17.32, 00:19.43-00:22.35, 00:24.19-00:26.18, and 00:27.25-00:29.22. Every line finishes before the next scene transition. Background audio is sidechain-compressed while the voice is active.

## Visual Integrity

The encoded H.264 stream SHA-256 is `e82926fbfd527a3a7c96a92a51313301d010fb15a7f57b6b7da88238557f6345`, exactly matching v2 and v3. Replacing the voice did not alter any video frame.

## Verification Notes

The available online voice list was queried before synthesis and confirmed both `zh-TW-HsiaoChenNeural` and `zh-TW-HsiaoYuNeural`. Codec, dimensions, duration, frame rate, audio format, loudness, and decoded frame count were verified from ffmpeg demux and full-decode output.
