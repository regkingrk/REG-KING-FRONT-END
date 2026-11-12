# RK plate style (saved, not on sale)

Taken out of the plate builder on 12 Nov 2026 at REG KING's request. Everything it needs is kept,
so it can go back on sale in a minute.

- What it is: REG KING's own chiselled (bevel) letters, on road legal and show car plates.
- Price: never set (it showed "price on request").
- Kept in the code: its entry in `STYLES` (lib/builder.ts), its 3D letter shapes (lib/plate3d.ts),
  and its style picture (public/styles/rk.webp).
- Pictures: `rk-style-preview.png` (front and rear in the builder) and `rk-style-thumbnail.png`
  (the picture in the style list).

## To put it back on sale

In `lib/builder.ts`, add `"RK"` back to the end of `CAR_LEGAL`, and back into `CAR_SHOW` after
`"Vintage X"`. Set its prices on the `st("RK", "bevel")` line, for example `st("RK", "bevel", 70, 40)`.
