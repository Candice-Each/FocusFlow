export function solveRidgeRegression(
  X: number[][],
  Y: number[][],
  _lambda = 0.5
): number[][] {
  const n = X.length;
  const d = X[0] ? X[0].length : 15;
  const outDim = Y[0] ? Y[0].length : 2;

  const defaultCenterX =
    typeof window !== "undefined" ? window.innerWidth / 2 : 640;
  const defaultCenterY =
    typeof window !== "undefined" ? window.innerHeight / 2 : 400;

  if (n < 3) {
    const fallback: number[][] = [];
    for (let i = 0; i < d; i++) {
      fallback.push(i === 0 ? [defaultCenterX, defaultCenterY] : [0, 0]);
    }
    return fallback;
  }

  const mean: number[] = [];
  const std: number[] = [];
  for (let j = 0; j < d; j++) {
    mean.push(0);
    std.push(1);
  }

  for (let j = 1; j < d; j++) {
    let sum = 0;
    for (let k = 0; k < n; k++) sum += X[k][j];
    mean[j] = sum / n;

    let varSum = 0;
    for (let k = 0; k < n; k++) {
      const diff = X[k][j] - mean[j];
      varSum += diff * diff;
    }
    const rawStd = Math.sqrt(varSum / n + 1e-8);
    if (j <= 6 || j === 14) {
      // Eye iris u/v (1..4), look blendshapes (5..6), and quadratic vertical term (14)
      std[j] = Math.max(rawStd, 1e-4);
    } else {
      // Head pose and translation (7..13)
      std[j] = Math.max(rawStd, 0.08);
    }
  }

  const Xn: number[][] = [];
  for (let k = 0; k < n; k++) {
    const row: number[] = [];
    for (let j = 0; j < d; j++) {
      row.push(j === 0 ? 1 : (X[k][j] - mean[j]) / std[j]);
    }
    Xn.push(row);
  }

  // Weight middle-row calibration points (ry ≈ 0.50) by 1.5x so the central reading area has priority fit
  const sampleWeights: number[] = [];
  for (let k = 0; k < n; k++) {
    const isMidRow =
      Y[k][1] > defaultCenterY * 0.65 && Y[k][1] < defaultCenterY * 1.35;
    sampleWeights.push(isMidRow ? 1.5 : 1.0);
  }

  const aug: number[][] = [];
  for (let i = 0; i < d; i++) {
    const row: number[] = [];
    for (let j = 0; j < d; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += sampleWeights[k] * Xn[k][i] * Xn[k][j];
      }
      if (i === j) {
        // Scale regularization by sample count `n` so it properly damps collinear/head features:
        // 0: intercept (unpenalized)
        // 1..6: primary eye features (0.08 * n)
        // 14: quadratic vertical curvature term (0.15 * n)
        // 7..13: head pose/translation (2.8 * n — prevents post-calibration posture shift from drifting Y)
        const regFactor =
          i === 0 ? 1e-7 : i <= 6 ? 0.08 * n : i === 14 ? 0.15 * n : 2.8 * n;
        sum += regFactor;
      }
      row.push(sum);
    }
    for (let j = 0; j < outDim; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += sampleWeights[k] * Xn[k][i] * Y[k][j];
      }
      row.push(sum);
    }
    aug.push(row);
  }

  for (let col = 0; col < d; col++) {
    let pivot = col;
    for (let row = col + 1; row < d; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col])) pivot = row;
    }
    const tmp = aug[col];
    aug[col] = aug[pivot];
    aug[pivot] = tmp;

    const div = aug[col][col] || 1e-8;
    for (let j = col; j < d + outDim; j++) aug[col][j] /= div;

    for (let row = 0; row < d; row++) {
      if (row !== col) {
        const factor = aug[row][col];
        for (let j = col; j < d + outDim; j++) aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  const Wn: number[][] = [];
  for (let i = 0; i < d; i++) {
    Wn.push(aug[i].slice(d));
  }

  const W: number[][] = [];
  for (let i = 0; i < d; i++) {
    const row: number[] = [];
    for (let m = 0; m < outDim; m++) row.push(0);
    W.push(row);
  }

  for (let m = 0; m < outDim; m++) {
    let interceptShift = 0;
    for (let j = 1; j < d; j++) {
      const wVal = Wn[j][m] / std[j];
      W[j][m] = isFinite(wVal) ? wVal : 0;
      interceptShift += W[j][m] * mean[j];
    }
    const w0 = Wn[0][m] - interceptShift;
    W[0][m] = isFinite(w0) ? w0 : m === 0 ? defaultCenterX : defaultCenterY;
  }

  // Exact Center-Row Residual Anchoring:
  // Ensure the average vertical prediction error on the middle calibration row (Points 3, 4, 5 at ry = 0.50) is 0.0px
  let midResidualSumY = 0;
  let midCount = 0;
  for (let k = 0; k < n; k++) {
    if (Y[k][1] > defaultCenterY * 0.65 && Y[k][1] < defaultCenterY * 1.35) {
      let predY = W[0][1];
      for (let j = 1; j < d; j++) {
        predY += X[k][j] * W[j][1];
      }
      midResidualSumY += Y[k][1] - predY;
      midCount++;
    }
  }
  if (midCount > 0 && isFinite(midResidualSumY)) {
    W[0][1] += midResidualSumY / midCount;
  }

  return W;
}