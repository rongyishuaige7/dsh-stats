# DSH Usage Promo Video

Deterministic 1920x1080, 24 fps Canvas composition built from the redacted product screenshots in `docs/images/`.

## Render

```sh
node promo-video/scripts/render-frames.mjs \
  --start 0 --end 720 \
  --output promo-video/build/frames

node promo-video/scripts/encode-video.mjs \
  --input promo-video/build/frames \
  --output promo-video/final/dsh-usage-promo-v2.mp4 \
  --frames 720
```

## Taiwan Mandarin Voiceover

```sh
node promo-video/scripts/build-voiceover.mjs \
  --output promo-video/audio/voiceover-zh-tw-meijia.m4a

node promo-video/scripts/encode-video.mjs \
  --input promo-video/build/frames \
  --voiceover promo-video/audio/voiceover-zh-tw-meijia.m4a \
  --output promo-video/final/dsh-usage-promo-v3-zh-tw.mp4 \
  --frames 720
```

The frame cache and local Python QA environment are ignored. Versioned final videos, posters, encoding manifests, and QA evidence are retained. The v1 and v2 deliveries remain available for comparison.
