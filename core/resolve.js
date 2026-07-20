// core/resolve.js — seg（構文の事実）× 辞書（解釈）の突き合わせ。
//
// 思想（spec §3.3 / handoff §2-10,11）:
//   構文とモデルの分離。segは語彙側の切れ目の事実、辞書は交換可能な解釈。
//   突き合わせの結果は4状態のどれかであって、エラーは存在しない。
//     inconsistent … seg連結 ≠ w（語全体の状態。セマンティック層から黙って除外）
//     unique / ambiguous / unknown … seg要素ごとの状態
//   ピン留め {s, m:"dictId/morphId"} は既定の読みを上書きする。
//   参照先が消えたピンは保持したまま通常解決へ降格し、danglingPinを立てる
//   （spec §9-A6: 辞書を戻せばピンが蘇る）。

import { normalize } from "./tokenize.js";

/**
 * 有効辞書列から 表層形→候補 の索引を作る。辞書の順序＝優先順位を保存する。
 * @param {{meta:{id:string}, morphs:{id:string,forms:string[]}[]}[]} dicts
 * @returns {Map<string, {dictId:string, morph:object, rank:number}[]>}
 */
export function buildFormIndex(dicts) {
  const index = new Map();
  dicts.forEach((dict, rank) => {
    for (const morph of dict.morphs || []) {
      for (const f of morph.forms || []) {
        const key = normalize(f);
        if (!index.has(key)) index.set(key, []);
        index.get(key).push({ dictId: dict.meta.id, morph, rank });
      }
    }
  });
  return index;
}

/**
 * 1エントリのsegを解決する。純関数・非破壊・投げない。
 * @param {{w:string, seg?:(string|{s:string,m:string})[]}} entry
 * @param {Map<string,{dictId:string,morph:object,rank:number}[]>} formIndex
 * @returns {{
 *   status: "none"|"inconsistent"|"ok",
 *   parts: {
 *     surface: string,
 *     status: "unique"|"ambiguous"|"unknown",
 *     matches: {dictId:string, morph:object, rank:number}[],  // 優先順
 *     chosen: {dictId:string, morph:object}|null,             // 既定の読み（先頭 or ピン先）
 *     pinned: boolean,
 *     danglingPin: string|null                                // 消えた参照 "dictId/morphId"
 *   }[]
 * }}
 */
export function resolveSeg(entry, formIndex) {
  if (!Array.isArray(entry.seg) || entry.seg.length === 0) {
    return { status: "none", parts: [] };
  }

  const surfaces = entry.seg.map((el) => (typeof el === "string" ? el : el.s));
  const joined = normalize(surfaces.join(""));
  const w = normalize(entry.w);
  const inconsistent = joined !== w;

  const parts = entry.seg.map((el) => {
    const surface = normalize(typeof el === "string" ? el : el.s);
    const pinRef = typeof el === "object" && el.m ? el.m : null;
    const matches = (formIndex.get(surface) || []).slice().sort((a, b) => a.rank - b.rank);

    let pinned = false;
    let danglingPin = null;
    let chosen = null;

    if (pinRef) {
      const [dictId, morphId] = pinRef.split("/");
      const hit = matches.find((m) => m.dictId === dictId && m.morph.id === morphId);
      if (hit) {
        chosen = { dictId: hit.dictId, morph: hit.morph };
        pinned = true;
      } else {
        danglingPin = pinRef; // 保持したまま通常解決へ降格
      }
    }
    if (!chosen && matches.length > 0) {
      chosen = { dictId: matches[0].dictId, morph: matches[0].morph };
    }

    const status =
      matches.length === 0 ? "unknown" : matches.length === 1 || pinned ? "unique" : "ambiguous";

    return { surface, status, matches, chosen, pinned, danglingPin };
  });

  return { status: inconsistent ? "inconsistent" : "ok", parts };
}

/**
 * 語彙全体の引き当て集計（書庫画面の「一意n・多義n・未知n・不整合n」用）。
 * @returns {{unique:number, ambiguous:number, unknown:number, inconsistent:number,
 *            none:number, danglingPins:{w:string,pin:string}[]}}
 */
export function resolveSummary(entries, formIndex) {
  const sum = { unique: 0, ambiguous: 0, unknown: 0, inconsistent: 0, none: 0, danglingPins: [] };
  for (const e of entries) {
    const r = resolveSeg(e, formIndex);
    if (r.status === "none") { sum.none++; continue; }
    if (r.status === "inconsistent") { sum.inconsistent++; continue; }
    let worst = "unique";
    for (const p of r.parts) {
      if (p.danglingPin) sum.danglingPins.push({ w: e.w, pin: p.danglingPin });
      if (p.status === "unknown") worst = "unknown";
      else if (p.status === "ambiguous" && worst === "unique") worst = "ambiguous";
    }
    sum[worst]++;
  }
  return sum;
}
