// core/tokenize.js — 語 → 原子列。
//
// これがΣ（原子集合）を定める唯一の場所。カーネルの他の部分はΣの中身を知らない。
// 依存ゼロ。ブラウザでもnode単体でもそのまま動く。
//
// 法則（spec §2.3-1）: joinAtoms(tokenize(w)) === normalize(w)
//   切断は可逆。逆（任意の原子列がある語のtokenize結果か）は要求しない。
//
// 正規化（spec §9-A5）: すべての文字列はここでNFCに落ちる。
//   caféのNFC/NFD二重登録はこの一点で消える。

export const normalize = (s) => s.normalize("NFC");

export const joinAtoms = (atoms) => atoms.join("");

/** grapheme分割器（Intl.Segmenter が無い環境ではコードポイント分割に退避） */
const graphemeSplit = (() => {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const seg = new Intl.Segmenter("und", { granularity: "grapheme" });
    return (s) => Array.from(seg.segment(s), (x) => x.segment);
  }
  return (s) => [...s];
})();

/**
 * トークナイザを作る。
 * @param {"grapheme"|"codepoint"|{type:"table",digraphs:string[]}|undefined} spec
 *   manifest.tokenizer の値。省略時は "grapheme"。
 * @returns {(w:string)=>string[]}
 *
 * table: digraphsを長い順に最長一致・貪欲（spec §9-C1で固定した規則）。
 *   一致しない位置はgrapheme 1個に退避。
 *   注意: 原子境界は形態素境界(seg)と独立（ngatsot = ng|a|ts|o|t が正）。
 */
export function makeTokenizer(spec) {
  const kind = spec == null ? "grapheme" : typeof spec === "string" ? spec : spec.type;

  if (kind === "codepoint") return (w) => [...normalize(w)];

  if (kind === "table") {
    const table = [...(spec.digraphs || [])].map(normalize).sort((a, b) => b.length - a.length);
    return (w) => {
      const s = normalize(w);
      const out = [];
      let i = 0;
      while (i < s.length) {
        const hit = table.find((d) => s.startsWith(d, i));
        if (hit) {
          out.push(hit);
          i += hit.length;
        } else {
          const g = graphemeSplit(s.slice(i))[0];
          out.push(g);
          i += g.length;
        }
      }
      return out;
    };
  }

  // 既定: grapheme
  return (w) => graphemeSplit(normalize(w));
}

/**
 * エントリ用: atoms明示があればトークナイザより優先する（spec §3.1）。
 * @param {{w:string, atoms?:string[]}} entry
 * @param {(w:string)=>string[]} tokenize
 */
export function atomsOf(entry, tokenize) {
  if (Array.isArray(entry.atoms) && entry.atoms.length > 0) {
    return entry.atoms.map(normalize);
  }
  return tokenize(entry.w);
}
