// 保留标准化计算，但 std 下限 0.15，且 lambda 降为 0.02；
// 已修复：旧版（效果好）之所以稳，是因为"无标准化 + lambda=0.05" 的隐式正则化。
// 这条路径在"标准化 + std 极小 + lambda=0.6"下会放大权重 50~300 倍，导致飞顶/飞底。
// 方案：std 设 0.15 下限（防止极小方差放大），lambda 改为 0.02（保留真正正则化作用）。
export function solveRidgeRegression(
  X: number[][],
  Y: number[][],
  lambda = 0.02
): number[][] {
  const n = X.length;
  const d = X[0]?.length ?? 14;
  const outDim = Y[0]?.length ?? 2;
  if (n < 3) {
    return Array.from({ length: d }, (_, i) =>
      i === 0 ? [window.innerWidth / 2, window.innerHeight / 2] : [0, 0]
    );
  }
  const mean = new Array(d).fill(0);
  const std = new Array(d).fill(1);
  for (let j = 1; j < d; j++) {
    let sum = 0;
    for (let k = 0; k < n; k++) sum += X[k][j];
    mean[j] = sum / n;
    let varSum = 0;
    for (let k = 0; k < n; k++) {
      const diff = X[k][j] - mean[j];
      varSum += diff * diff;
    }
    // 关键修复：std 下限从 1e-8 提到 0.15，防止极小方差特征权重爆炸 50~300 倍
    std[j] = Math.max(0.15, Math.sqrt(varSum / n + 1e-8));
  }
  const Xn = X.map((row) =>
    row.map((val, j) => (j === 0 ? 1 : (val - mean[j]) / std[j]))
  );
  const A = Array.from({ length: d }, (_, i) =>
    Array.from({ length: d }, (_, j) => {
      let sum = 0;
      for (let k = 0; k < n; k++) sum += Xn[k][i] * Xn[k][j];
      if (i === j) sum += i === 0 ? 1e-7 : lambda;
      return sum;
    })
  );
  const B = Array.from({ length: d }, (_, i) =>
    Array.from({ length: outDim }, (_, j) => {
      let sum = 0;
      for (let k = 0; k < n; k++) sum += Xn[k][i] * Y[k][j];
      return sum;
    })
  );
  const aug = A.map((row, i) => [...row, ...B[i]]);
  for (let col = 0; col < d; col++) {
    let pivot = col;
    for (let row = col + 1; row < d; row++)
      if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col])) pivot = row;
    [aug[col], aug[pivot]] = [aug[pivot], aug[col]];
    const div = aug[col][col] || 1e-8;
    for (let j = col; j < d + outDim; j++) aug[col][j] /= div;
    for (let row = 0; row < d; row++) {
      if (row !== col) {
        const factor = aug[row][col];
        for (let j = col; j < d + outDim; j++) aug[row][j] -= factor * aug[col][j];
      }
    }
  }
  const Wn = aug.map((row) => row.slice(d));
  const W = Array.from({ length: d }, () => new Array(outDim).fill(0));
  for (let m = 0; m < outDim; m++) {
    let interceptShift = 0;
    for (let j = 1; j < d; j++) {
      const wVal = Wn[j][m] / std[j];
      W[j][m] = Number.isFinite(wVal) ? wVal : 0;
      interceptShift += W[j][m] * mean[j];
    }
    const w0 = Wn[0][m] - interceptShift;
    W[0][m] = Number.isFinite(w0)
      ? w0
      : m === 0
      ? window.innerWidth / 2
      : window.innerHeight / 2;
  }
  return W;
}