// core/kimariji.js — 決まり字。
//
// 定義（spec §2.1）: kimariji(w) = min{ p ⊑ w : count(p) = 1 }
//   countは鎖上で反調和なので、count=1は上に閉じた区間。その最小元＝閾値。
//
// 例外（spec §9-A1「詠み切り札」）:
//   wが他の語の接頭辞である（または将来の重複由来で）終端でもcount>1の場合、
//   count=1に到達する接頭辞が存在しない。このとき決まり字はnull。
//   語は「最後まで詠まれて初めて取れる札」として一級市民のまま扱う。
//   （エラーではない。spec §7-8: エラー概念は存在しない）

import { nodeAt } from "./trie.js";

/**
 * 決まり字の深さ（原子数）。
 * @param {import("./trie.js").TrieNode} root
 * @param {string[]} atoms 語の原子列
 * @returns {number|null} 1始まりの深さ。null＝詠み切り札（一意点なし）
 */
export function kimarijiDepth(root, atoms) {
  let n = root;
  for (let i = 0; i < atoms.length; i++) {
    n = n.children.get(atoms[i]);
    if (!n) return null; // 語彙に無い語（呼び出し側の契約違反だが、投げない）
    if (n.count === 1) return i + 1;
  }
  return null; // 終端でも count > 1 ＝ 詠み切り札
}

/**
 * 語彙全体の決まり字分布。語彙の「地形」を数字で見るための計測。
 * @param {import("./trie.js").TrieNode} root
 * @param {Map<string,string[]>} atomsByWord buildTrieの返り値
 * @returns {{byDepth:Map<number,number>, yomikiri:string[], total:number}}
 *   byDepth: 深さ→語数。yomikiri: 決まり字を持たない語の一覧。
 */
export function kimarijiDistribution(root, atomsByWord) {
  const byDepth = new Map();
  const yomikiri = [];
  for (const [w, atoms] of atomsByWord) {
    const d = kimarijiDepth(root, atoms);
    if (d === null) yomikiri.push(w);
    else byDepth.set(d, (byDepth.get(d) || 0) + 1);
  }
  return { byDepth, yomikiri, total: atomsByWord.size };
}
