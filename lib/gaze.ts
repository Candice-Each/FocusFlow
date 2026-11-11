import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import type { GazeTelemetry } from "./types";

function projectEyeLocal(lm: { x: number; y: number }[], outer: number, inner: number, iris: number) {
  const dx = lm[inner].x - lm[outer].x;
  const dy = lm[inner].y - lm[outer].y;
  const len = Math.hypot(dx, dy) || 1e-5;
  const ux = dx / len, uy = dy / len;
  const ix = lm[iris].x - lm[outer].x, iy = lm[iris].y - lm[outer].y;
  return { u: (ix * ux + iy * uy) / len, v: (-ix * uy + iy * ux) / len };
}

export function extractGazeTelemetry(res: FaceLandmarkerResult): GazeTelemetry | null {
  const lm = res.faceLandmarks?.[0];
  const bs = res.faceBlendshapes?.[0]?.categories;
  const mat = res.facialTransformationMatrixes?.[0]?.data;
  if (!lm || lm.length < 478 || !bs || !mat) return null;
  const getBs = (n: string) => bs.find(c => c.categoryName === n)?.score ?? 0;
  const blink = Math.max(getBs("eyeBlinkLeft"), getBs("eyeBlinkRight"));
  const jawOpen = getBs("jawOpen");
  const browDown = Math.max(getBs("browDownLeft"), getBs("browDownRight"));
  const rEye = projectEyeLocal(lm, 33, 133, 468);
  const lEye = projectEyeLocal(lm, 362, 263, 473);
  const lookHoriz = getBs("eyeLookOutLeft") - getBs("eyeLookInLeft") +
    (getBs("eyeLookInRight") - getBs("eyeLookOutRight"));
  const lookVert = getBs("eyeLookDownLeft") + getBs("eyeLookDownRight") -
    (getBs("eyeLookUpLeft") + getBs("eyeLookUpRight"));
  const pitch = Math.asin(Math.max(-1, Math.min(1, -mat[6])));
  const yaw = Math.atan2(mat[2], mat[10]);
  const roll = Math.atan2(mat[4], mat[5]);
  const tx = mat[12] * 0.05, ty = mat[13] * 0.05, tz = (mat[14] + 50) * 0.02;
  const uMean = (rEye.u + lEye.u) * 0.5, vMean = (rEye.v + lEye.v) * 0.5;
  return {
    features: [1, rEye.u, rEye.v, lEye.u, lEye.v, lookHoriz, lookVert,
      yaw, pitch, roll, tx, ty, tz, uMean * yaw, vMean * pitch],
    yawDeg: Math.round((yaw * 180) / Math.PI),
    pitchDeg: Math.round((pitch * 180) / Math.PI),
    rollDeg: Math.round((roll * 180) / Math.PI),
    blink, jawOpen, browDown,
    rU: rEye.u, rV: rEye.v, lU: lEye.u, lV: lEye.v,
    lookH: lookHoriz, lookV: lookVert,
  };
}

const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10];
const RIGHT_EYE_LOOP = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33];
const LEFT_EYE_LOOP = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398, 362];
const RIGHT_EYEBROW = [46, 53, 52, 65, 55, 70, 63, 105, 66, 107];
const LEFT_EYEBROW = [276, 283, 282, 295, 285, 300, 293, 334, 296, 336];
const NOSE_BRIDGE = [168, 6, 197, 195, 5, 4, 1];
const LIPS_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185, 61];

export function drawFaceAndEyeMesh(
  canvas: HTMLCanvasElement, res: FaceLandmarkerResult, tel: GazeTelemetry | null,
  video: HTMLVideoElement, showVideoBg: boolean, isNight: boolean
) {
  const ctx = canvas.getContext("2d"); if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = isNight ? "#181a1e" : "#f5f3ef";
  ctx.fillRect(0, 0, W, H);
  if (showVideoBg) {
    ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1);
    ctx.globalAlpha = isNight ? 0.35 : 0.28;
    ctx.drawImage(video, 0, 0, W, H); ctx.restore();
  } else {
    ctx.strokeStyle = isNight ? "rgba(120, 113, 108, 0.16)" : "rgba(168, 162, 158, 0.25)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }
  const lm = res.faceLandmarks?.[0];
  if (!lm) {
    ctx.fillStyle = isNight ? "rgba(28,25,23,0.85)" : "rgba(255,255,255,0.88)";
    ctx.fillRect(10, 10, W - 20, 34);
    ctx.strokeStyle = isNight ? "rgba(87,83,78,0.6)" : "rgba(214,211,209,0.9)";
    ctx.strokeRect(10, 10, W - 20, 34);
    ctx.fillStyle = "#e11d48"; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("No face detected - please face camera", 18, 31);
    return;
  }
  const px = (i: number) => (1 - lm[i].x) * W;
  const py = (i: number) => lm[i].y * H;
  const strokePath = (idx: number[], color: string, width = 1.2) => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
    idx.forEach((id, i) => i === 0 ? ctx.moveTo(px(id), py(id)) : ctx.lineTo(px(id), py(id)));
    ctx.stroke();
  };
  ctx.fillStyle = isNight ? "rgba(168,162,158,0.35)" : "rgba(120,113,108,0.4)";
  for (let i = 0; i < 468; i += 2) ctx.fillRect(px(i) - 0.7, py(i) - 0.7, 1.4, 1.4);
  strokePath(FACE_OVAL, isNight ? "rgba(168,162,158,0.6)" : "rgba(87,83,78,0.55)", 1.2);
  strokePath(RIGHT_EYEBROW, isNight ? "rgba(214,211,209,0.65)" : "rgba(68,64,60,0.65)", 1.2);
  strokePath(LEFT_EYEBROW, isNight ? "rgba(214,211,209,0.65)" : "rgba(68,64,60,0.65)", 1.2);
  strokePath(NOSE_BRIDGE, "rgba(14,116,144,0.65)", 1.3);
  strokePath(LIPS_OUTER, tel && tel.jawOpen > 0.32 ? "#d97706" : isNight ? "rgba(168,162,158,0.55)" : "rgba(120,113,108,0.6)", 1.3);
  strokePath(RIGHT_EYE_LOOP, "#0284c7", 1.4);
  strokePath(LEFT_EYE_LOOP, "#0284c7", 1.4);
  strokePath([33, 133], "rgba(14,116,144,0.85)", 1.4);
  strokePath([362, 263], "rgba(14,116,144,0.85)", 1.4);
  strokePath([469, 470, 471, 472, 469], "#d97706", 1.6);
  strokePath([474, 475, 476, 477, 474], "#d97706", 1.6);
  [468, 473].forEach(i => {
    const cx = px(i), cy = py(i);
    ctx.fillStyle = "#d97706"; ctx.beginPath(); ctx.arc(cx, cy, 2.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy);
    ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 6); ctx.stroke();
  });
  if (tel) {
    const nx = px(168), ny = py(168);
    ctx.strokeStyle = "#e11d48"; ctx.lineWidth = 1.8; ctx.beginPath();
    ctx.moveTo(nx, ny);
    ctx.lineTo(nx - Math.sin((tel.yawDeg * Math.PI) / 180) * 55, ny + Math.sin((tel.pitchDeg * Math.PI) / 180) * 55);
    ctx.stroke();
    const rDx = -tel.lookH * 42 - Math.sin((tel.yawDeg * Math.PI) / 180) * 35;
    const rDy = tel.lookV * 48 + Math.sin((tel.pitchDeg * Math.PI) / 180) * 35;
    ctx.strokeStyle = "#059669"; ctx.lineWidth = 1.8;
    [468, 473].forEach(id => {
      ctx.beginPath(); ctx.moveTo(px(id), py(id));
      ctx.lineTo(px(id) + rDx, py(id) + rDy); ctx.stroke();
    });
    ctx.fillStyle = isNight ? "rgba(28,25,23,0.84)" : "rgba(255,255,255,0.86)";
    ctx.fillRect(8, 8, 218, 66);
    ctx.strokeStyle = isNight ? "rgba(87,83,78,0.65)" : "rgba(214,211,209,0.9)";
    ctx.strokeRect(8, 8, 218, 66);
    ctx.fillStyle = isNight ? "#e7e5e4" : "#292524"; ctx.font = "11px monospace";
    ctx.fillText(`Head Y/P/R: ${tel.yawDeg}° / ${tel.pitchDeg}° / ${tel.rollDeg}°`, 14, 23);
    ctx.fillStyle = isNight ? "#38bdf8" : "#0369a1";
    ctx.fillText(`Iris U/V  : ${tel.rU.toFixed(2)}, ${tel.rV.toFixed(2)}`, 14, 37);
    ctx.fillStyle = tel.blink > 0.45 ? "#e11d48" : "#059669";
    ctx.fillText(`Blink     : ${tel.blink.toFixed(2)} ${tel.blink > 0.45 ? "[Filtered]" : "[Stable]"}`, 14, 51);
    ctx.fillStyle = tel.jawOpen > 0.32 ? "#d97706" : isNight ? "#a8a29e" : "#78716c";
    ctx.fillText(`Jaw Open  : ${tel.jawOpen.toFixed(2)} ${tel.jawOpen > 0.32 ? "[Menu Open]" : ""}`, 14, 65);
  }
}