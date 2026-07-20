// src/views/layout.js — 焦点(W, focus, rot, dims)から座標を導く純関数。
//
// spec §4.1 では core/layout.ts の役割（純粋・DOM非依存）だが、現行core/にはまだ無い。
// CLAUDE.mdの取り決め（core/は無断で書き換えない）に従い、ここにラッパーとして置く。
// PR説明で「core/への追加要望」として報告する。
//
// spec §2.3-7: 同じ(W, focus, rot, dims)からは常に同じ座標（乱数・時刻を使わない）。
// M1プロトタイプ（docs/reference/kimariji-m1.jsx）のcomputeTargetsを、
// 文字列連結ではなく原子配列ベースのノード同一性（core/trie.js の pathKey）で作り直したもの。

import { nodeAt, sortedKids, pathKey } from "../../core/trie.js";

export const FE = {
  S_TRAIL: 0.6,
  STEP: 88,
  GAP: 62,
  R_FAN: 118,
  FOCUS_R: 19,
  DTH: 25,
  START: -50,
  VISIBLE: 63,
};

export function baseRadius(count) {
  if (count === 1) return 13;
  return Math.min(20, 10.5 + 2.4 * Math.log2(count + 1));
}

/**
 * @param {import("../../core/trie.js").TrieNode} root
 * @param {string[]} focusAtoms
 * @param {number} rot
 * @param {{w:number,h:number}} dims
 * @param {(a:string,b:string)=>number} atomCompare
 * @param {Map<string,string[]>} atomsByWord kimariji子の残り原子表示に使う
 * @returns {{T: Map<string, object>, fanMeta: {above:number, below:number, rotMin:number, rotMax:number}|null}}
 */
export function computeTargets(root, focusAtoms, rot, dims, atomCompare, atomsByWord) {
  const T = new Map();
  const put = (atoms, t) => T.set(pathKey(atoms), t);
  const ax = Math.min(dims.w * 0.34, 150);
  const ay = dims.h * 0.44;
  const { S_TRAIL, STEP, GAP, R_FAN, FOCUS_R, DTH, START, VISIBLE } = FE;

  const focusNode = nodeAt(root, focusAtoms);
  if (!focusNode) return { T, fanMeta: null };

  put(focusAtoms, {
    atoms: focusAtoms,
    x: ax,
    y: ay,
    r: focusAtoms.length === 0 ? 11 : FOCUS_R,
    kind: "focus",
    atom: focusNode.atom,
    count: focusNode.count,
    alpha: 1,
  });

  // --- 祖先トレイル（等比0.6：総幅 ≤ STEP·1.5 で必ず収まる）---
  let x = ax,
    y = ay;
  for (let k = 1; k <= focusAtoms.length; k++) {
    const pAtoms = focusAtoms.slice(0, focusAtoms.length - k);
    const parent = nodeAt(root, pAtoms);
    const takenAtom = focusAtoms[focusAtoms.length - k];
    const kids = sortedKids(parent, atomCompare);
    const m = kids.length;
    const rank = kids.findIndex(([a]) => a === takenAtom);
    const sc = Math.pow(S_TRAIL, k);
    const off = (rank - (m - 1) / 2) * GAP * sc;
    const px = x - STEP * sc;
    const py = y - off;

    put(pAtoms, {
      atoms: pAtoms,
      x: px,
      y: py,
      r: Math.max(3.5, (pAtoms.length === 0 ? 11 : FOCUS_R) * sc),
      kind: "trail",
      atom: parent.atom,
      count: parent.count,
      alpha: 1,
    });

    kids.forEach(([a, child], rk) => {
      if (a === takenAtom || Math.abs(rk - rank) > 3) return;
      const sAtoms = [...pAtoms, a];
      const key = pathKey(sAtoms);
      if (T.has(key)) return;
      put(sAtoms, {
        atoms: sAtoms,
        x: px + STEP * sc * 0.3,
        y: py + (rk - (m - 1) / 2) * GAP * sc,
        r: Math.max(2.5, baseRadius(child.count) * sc * 0.4),
        kind: "ghost",
        atom: a,
        count: child.count,
        alpha: 0.9,
      });
    });

    x = px;
    y = py;
  }

  // --- 扇（文字盤）：θ_i = START + i・DTH + rot ---
  const kids = sortedKids(focusNode, atomCompare);
  const m = kids.length;
  let above = 0,
    below = 0;
  kids.forEach(([a, child], i) => {
    const th = START + i * DTH + rot;
    if (th < -VISIBLE) {
      above++;
      return;
    }
    if (th > VISIBLE) {
      below++;
      return;
    }
    const rad = (th * Math.PI) / 180;
    const edgeFade = Math.max(0.15, Math.min(1, (VISIBLE - Math.abs(th)) / 14 + 0.15));
    const cAtoms = [...focusAtoms, a];
    const restAtoms =
      child.count === 1 ? (atomsByWord.get(child.only) || []).slice(cAtoms.length) : null;
    put(cAtoms, {
      atoms: cAtoms,
      x: ax + R_FAN * Math.cos(rad),
      y: ay + R_FAN * Math.sin(rad),
      r: baseRadius(child.count),
      kind: child.count === 1 ? "kimariji" : "child",
      atom: a,
      count: child.count,
      only: child.only,
      restAtoms,
      alpha: edgeFade,
    });
  });

  // 最終順位が5時（+50°）に来るまで回せる
  const rotMin = m > 5 ? Math.min(0, 100 - DTH * (m - 1)) : 0;
  const fanMeta =
    above + below > 0 || rotMin < 0 ? { above, below, rotMin, rotMax: 0 } : null;

  return { T, fanMeta };
}
