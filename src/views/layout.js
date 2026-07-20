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
  STEP: 88,
  R_FAN: 118,
  FOCUS_R: 19,
  TRAIL_R: 15, // トレイル（辿った道）は等サイズ・焦点より一回り小さい固定値（S-3）
  RIGHT_PAD: 170, // 焦点から扇（R_FAN）とその回転ボタン分の余白
  DTH: 25,
  START: -50,
  VISIBLE: 63,
  // 語頭（focus=ε）の縦一列（spec §5.2・§7-4）。文字盤とは別の座標系。
  COL_X: 58,
  COL_TOP: 62,
  COL_ROW: 52,
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
 * @returns {{T: Map<string, object>, fanMeta: {above:number, below:number, rotMin:number, rotMax:number}|null, columnHeight: number|null, contentWidth: number|null}}
 *   columnHeight: 語頭（縦一列）モードのときだけ非null。スクロール領域の高さの目安。
 *   contentWidth: 深さ≥1（トレイル＋扇）モードのときだけ非null。横スクロール領域の幅の目安。
 */
export function computeTargets(root, focusAtoms, rot, dims, atomCompare, atomsByWord) {
  const T = new Map();
  const put = (atoms, t) => T.set(pathKey(atoms), t);
  const { STEP, R_FAN, FOCUS_R, TRAIL_R, RIGHT_PAD, DTH, START, VISIBLE, COL_X, COL_TOP, COL_ROW } = FE;

  const focusNode = nodeAt(root, focusAtoms);
  if (!focusNode) return { T, fanMeta: null, columnHeight: null, contentWidth: null };

  // --- 語頭（focus=ε）：文字盤ではなく縦一列、頻度順に上から（spec §5.2・§7-4）---
  if (focusAtoms.length === 0) {
    put(focusAtoms, {
      atoms: focusAtoms,
      x: COL_X,
      y: 16,
      r: 7,
      kind: "focus",
      atom: focusNode.atom,
      count: focusNode.count,
      alpha: 1,
    });

    const kids = sortedKids(focusNode, atomCompare);
    kids.forEach(([a, child], i) => {
      const cAtoms = [a];
      const restAtoms = child.count === 1 ? (atomsByWord.get(child.only) || []).slice(1) : null;
      put(cAtoms, {
        atoms: cAtoms,
        x: COL_X,
        y: COL_TOP + i * COL_ROW,
        r: baseRadius(child.count),
        kind: child.count === 1 ? "kimariji" : "child",
        atom: a,
        count: child.count,
        only: child.only,
        restAtoms,
        alpha: 1,
      });
    });

    const columnHeight = COL_TOP + Math.max(0, kids.length - 1) * COL_ROW + 60;
    return { T, fanMeta: null, columnHeight, contentWidth: null };
  }

  // 焦点位置は右寄り固定（S-3）：深さが増えるほど右へ進み、横スクロールで追従する。
  const ax = Math.min(dims.w * 0.34, 150) + STEP * focusAtoms.length;
  const ay = dims.h * 0.44;
  const contentWidth = ax + RIGHT_PAD;

  put(focusAtoms, {
    atoms: focusAtoms,
    x: ax,
    y: ay,
    r: FOCUS_R,
    kind: "focus",
    atom: focusNode.atom,
    count: focusNode.count,
    alpha: 1,
  });

  // --- 祖先トレイル：等サイズ・等間隔の横一直線（S-3。魚眼・折れは廃止） ---
  for (let k = 1; k <= focusAtoms.length; k++) {
    const pAtoms = focusAtoms.slice(0, focusAtoms.length - k);
    const parent = nodeAt(root, pAtoms);
    const px = ax - STEP * k;

    put(pAtoms, {
      atoms: pAtoms,
      x: px,
      y: ay,
      r: TRAIL_R,
      kind: "trail",
      atom: parent.atom,
      count: parent.count,
      alpha: 1,
    });
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

  return { T, fanMeta, columnHeight: null, contentWidth };
}
