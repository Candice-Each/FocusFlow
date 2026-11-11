export const HEATMAP_LUT = (() => {
  const lut = new Uint32Array(256);
  for (let v = 0; v < 256; v++) {
    if (v < 3) { lut[v] = 0; continue; }
    let r = 0, g = 0, b = 0;
    if (v < 64)       { b = 255; g = v * 4; }
    else if (v < 128) { g = 255; b = 255 - (v - 64) * 4; }
    else if (v < 192) { g = 255; r = (v - 128) * 4; }
    else              { r = 255; g = Math.max(0, 255 - (v - 192) * 4); }
    const a = Math.min(215, Math.round(v * 0.92));
    lut[v] = (a << 24) | (b << 16) | (g << 8) | r;
  }
  return lut;
})();