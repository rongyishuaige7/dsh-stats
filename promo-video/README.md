# DSH Usage Promo Video

Deterministic 1920x1080, 24 fps Canvas composition built from the redacted product screenshots in `docs/images/`.

## Render

```sh
node promo-video/scripts/render-frames.mjs \
  --start 0 --end 720 \
  --output promo-video/build/frames

node promo-video/scripts/encode-video.mjs \
  --input promo-video/build/frames \
  --output promo-video/final/dsh-usage-promo-v1.mp4 \
  --frames 720
```

The frame cache and local Python QA environment are ignored. The final video, poster, timeline, encoding manifest, and QA evidence are retained.
