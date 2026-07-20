// core/trie.js — 接頭辞半束のHasse図。
//
// 数学（spec §2.1）:
//   語彙Wの接頭辞閉包P(W)は、接頭辞順序⊑に関する有限meet半束。
//   meet(p,q) = 最長共通接頭辞。最小元はε（根）。
//   トライは A^(Σ*) ≅ A × (A^Σ*)^Σ が与える再帰構造（カリー化の帰結）。
//
// count: P(W)→ℕ は反調和（p⊑q ⇒ count(p)≥count(q)）。
//   相異なる語（NFC正規化後のw）で数える（spec §9-A3: 重複エントリは二重加算しない）。
//
// ノードの同一性は「原子の列」。文字列連結ではない（spec §9-A2:
//   多重字で "s"+"ch" と "sc"+"h" が衝突するため）。UIがMapキーとして
//   使うための pathKey は不可視区切り U+241F で結合する。

export const SEP = "\u241F";

/** 原子列 → UI状態用のキー。逆変換は unkey。 */
export const pathKey = (atoms) => atoms.join(SEP);
export const unkey = (key) => (key === "" ? [] : key.split(SEP));

/**
 * @typedef {Object} TrieNode
 * @property {string} atom        このノードへ入る原子（根は ""）
 * @property {Map<string,TrieNode>} children
 * @property {number} count       部分木に含まれる相異なる語の数
 * @property {string[]} words     ちょうどこの点で終わる語（通常0or1件。重複綴りは1件に正規化済み）
 * @property {string|null} only   count===1 のとき、その唯一の語
 */

/**
 * 語彙からトライを立てる。純関数。
 * @param {{w:string, atoms?:string[]}[]} entries
 * @param {(w:string)=>string[]} tokenize
 * @returns {{root:TrieNode, words:string[], atomsByWord:Map<string,string[]>}}
 *   words は正規化・重複除去後の語（挿入順）。
 */
export function buildTrie(entries, tokenize) {
  const atomsByWord = new Map(); // 正規化済みw → 原子列（初出のatoms指定を採用）
  for (const e of entries) {
    const atoms = Array.isArray(e.atoms) && e.atoms.length ? e.atoms : tokenize(e.w);
    const w = atoms.join("");
    if (!atomsByWord.has(w)) atomsByWord.set(w, atoms);
  }
  const words = [...atomsByWord.keys()];

  const mk = (atom) => ({ atom, children: new Map(), count: 0, words: [], only: null });
  const root = mk("");

  for (const w of words) {
    let n = root;
    n.count++;
    for (const a of atomsByWord.get(w)) {
      if (!n.children.has(a)) n.children.set(a, mk(a));
      n = n.children.get(a);
      n.count++;
    }
    n.words.push(w);
  }

  (function setOnly(n) {
    if (n.count === 1) {
      let m = n;
      while (m.words.length === 0) m = m.children.values().next().value;
      n.only = m.words[0];
    }
    for (const c of n.children.values()) setOnly(c);
  })(root);

  return { root, words, atomsByWord };
}

/** 原子列で降りる。無ければnull。 */
export function nodeAt(root, atoms) {
  let n = root;
  for (const a of atoms) {
    n = n.children.get(a);
    if (!n) return null;
  }
  return n;
}

/**
 * 原子の全順序を作る（同countのタイブレーク用）。
 * @param {string|undefined} collation manifest.collation。
 *   文字列 → Intl.Collator(locale)。undefined → 符号位置順。
 *   （tableトークナイザの語彙では省略し符号位置順、が現行の暫定。spec §9-C4）
 */
export function makeAtomCompare(collation) {
  if (typeof collation === "string" && typeof Intl !== "undefined" && Intl.Collator) {
    try {
      return new Intl.Collator(collation).compare;
    } catch {
      /* 不明ロケールは符号位置順へ */
    }
  }
  return (a, b) => (a < b ? -1 : a > b ? 1 : 0);
}

/**
 * 子の決定的順序：count降順 → 原子昇順（spec §7-1）。
 * @returns {[string, TrieNode][]}
 */
export function sortedKids(node, atomCompare) {
  return [...node.children.entries()].sort(
    (x, y) => y[1].count - x[1].count || atomCompare(x[0], y[0])
  );
}

/**
 * 焦点の修復（spec §2.1）: 編集後、旧焦点の接頭辞のうち
 * 新しいP(W)に残る最大元へ落とす（meetフォールバック）。
 * @param {TrieNode} root
 * @param {string[]} atoms 旧焦点
 * @returns {string[]} 新焦点（必ず有効）
 */
export function repairFocus(root, atoms) {
  const ok = [];
  let n = root;
  for (const a of atoms) {
    const c = n.children.get(a);
    if (!c) break;
    ok.push(a);
    n = c;
  }
  return ok;
}
