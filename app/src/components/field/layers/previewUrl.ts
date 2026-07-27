// TiTiler serves the same COG either as a tile pyramid or as one finished PNG, so a picture of a
// scene is a pure string transform of the tile template the map is already using — same COG, same
// colormap, same rescale, therefore the same colours by construction. Derived rather than fetched
// because the alternative is a second server read model for a ~1 KB image we already hold a URL
// for. max_size mirrors indices.py::_THUMB_MAX_SIZE; a field COG is ~30x25px, so it is a ceiling,
// not a resize. An unrecognised URL shape yields null → no picture, never a guessed URL.
//
// This lives here rather than inside FieldMapCard because the layer picker's tiles and the card's
// date-strip thumbs are the SAME transform and sit on the same screen. Two copies would drift
// apart the day max_size or the query shape changes, and the drift would be invisible: both would
// still render, just at different sizes or against a different rescale.

export const LAYER_PREVIEW_MAX_SIZE = 128;

export function scenePreviewUrl(
  tileUrl: string | null | undefined,
  maxSize: number = LAYER_PREVIEW_MAX_SIZE,
): string | null {
  if (!tileUrl) return null;
  const cut = tileUrl.indexOf("/cog/");
  const q = tileUrl.indexOf("?");
  if (cut < 0 || q < 0 || q < cut) return null;
  return `${tileUrl.slice(0, cut)}/cog/preview.png${tileUrl.slice(q)}&max_size=${maxSize}`;
}
