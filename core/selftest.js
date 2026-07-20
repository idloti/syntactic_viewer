// core/selftest.js — 依存ゼロの受け入れテスト。
// 実行: node core/selftest.js [dataDir]   （既定 ./data）
// テストフレームワーク不要。フィクスチャのgloss欄（試験仕様）を機械化したもの。
// これが緑であることが、コアを触るすべてのPRの前提条件。

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { makeTokenizer, atomsOf, normalize, joinAtoms } from "./tokenize.js";
import { buildTrie, nodeAt, makeAtomCompare, sortedKids, repairFocus } from "./trie.js";
import { kimarijiDepth, kimarijiDistribution } from "./kimariji.js";
import { buildFormIndex, resolveSeg, resolveSummary } from "./resolve.js";

const dataDir = process.argv[2] || "./data";
const load = (p) => JSON.parse(readFileSync(join(dataDir, p), "utf8"));

let pass = 0, fail = 0;
const ok = (cond, name) => {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name); }
};

function setup(vocabFile, dictFiles) {
  const vocab = load(join("vocab", vocabFile));
  const dicts = dictFiles.map((f) => load(join("dicts", f)));
  const tokenize = makeTokenizer(vocab.manifest.tokenizer);
  const { root, words, atomsByWord } = buildTrie(vocab.entries, tokenize);
  const formIndex = buildFormIndex(dicts);
  return { vocab, dicts, tokenize, root, words, atomsByWord, formIndex };
}

// ---------------- ① 正常系: en-b2-verbs ----------------
console.log("\n[en-b2-verbs × std-en-latin]");
{
  const s = setup("en-b2-verbs.json", ["std-en-latin.json"]);
  ok(s.words.length === 129, "129語（重複なし）");

  // 法則1: 切断の可逆性
  ok(s.words.every((w) => joinAtoms(s.atomsByWord.get(w)) === w), "法則: join∘tokenize = id");

  // 法則2: count反調和（全ノードで子のcount和≤自身…ではなく単調性を直接）
  const antitone = (n) => [...n.children.values()].every((c) => c.count <= n.count && antitone(c));
  ok(antitone(s.root), "法則: countは接頭辞順序で反調和");

  // 一字決まり: maintain と understand の2枚
  const cmp = makeAtomCompare(s.vocab.manifest.collation);
  const oneLetter = sortedKids(s.root, cmp).filter(([, n]) => n.count === 1).map(([, n]) => n.only);
  ok(oneLetter.length === 2 && oneLetter.includes("maintain") && oneLetter.includes("understand"),
    "一字決まりは maintain / understand の2枚");

  // extract は4字決まり「extr」
  ok(kimarijiDepth(s.root, s.atomsByWord.get("extract")) === 4, "extract は4字決まり");

  // 全segが一意に解決
  const sum = resolveSummary(s.vocab.entries, s.formIndex);
  ok(sum.ambiguous === 0 && sum.unknown === 0 && sum.inconsistent === 0,
    `全seg一意（unique=${sum.unique}, none=${sum.none}）`);

  // 詠み切り札なし
  ok(kimarijiDistribution(s.root, s.atomsByWord).yomikiri.length === 0, "詠み切り札なし");
}

// ---------------- ② エッジケース ----------------
console.log("\n[edge-cases × edge-dict]");
{
  const s = setup("edge-cases.json", ["edge-dict.json"]);
  const byId = Object.fromEntries(s.vocab.entries.map((e) => [e.id, e]));

  // A5: café NFC/NFD が1語に統合される（22エントリ→重複doubleと合わせ20語）
  ok(s.words.length === s.vocab.entries.length - 2, "NFC統合＋重複除去で語数 = エントリ−2");
  const cafeAtoms = s.tokenize("café"); // NFC
  ok(nodeAt(s.root, cafeAtoms)?.count === 1, "café は1語として数えられる");

  // A1: extra は詠み切り札（終端でcount=2、決まり字なし）
  const extraAtoms = s.atomsByWord.get("extra");
  ok(nodeAt(s.root, extraAtoms).count === 2, "extra 終端の count = 2");
  ok(kimarijiDepth(s.root, extraAtoms) === null, "extra の決まり字は null（詠み切り札）");
  const dist = kimarijiDistribution(s.root, s.atomsByWord);
  ok(dist.yomikiri.includes("extra") && dist.yomikiri.includes("in"), "詠み切り一覧に extra と in");

  // e010: 不整合
  ok(resolveSeg(byId.e010, s.formIndex).status === "inconsistent", "misfit は inconsistent");

  // e011: zorb未知 × ify既知の混在
  const r11 = resolveSeg(byId.e011, s.formIndex);
  ok(r11.parts[0].status === "unknown" && r11.parts[1].status === "unique",
    "zorbify: zorb=unknown, ify=unique");

  // e012: 辞書内多義（coが2候補）
  const r12 = resolveSeg(byId.e012, s.formIndex);
  ok(r12.parts[0].status === "ambiguous" && r12.parts[0].matches.length === 2,
    "cotangent: co は2候補の ambiguous");

  // e013: ピンが既定の読みを上書き
  const r13 = resolveSeg(byId.e013, s.formIndex);
  ok(r13.parts[0].pinned && r13.parts[0].chosen.morph.id === "co-compl",
    "cosine: ピンで co-compl が選ばれる");

  // e014: 宙吊りピン → 降格して通常解決、danglingPin保持
  const r14 = resolveSeg(byId.e014, s.formIndex);
  ok(r14.parts[0].danglingPin === "ghost-dict/co-x" && r14.parts[0].status === "ambiguous",
    "cooperate: 宙吊りピンを保持して ambiguous へ降格");
  ok(resolveSummary(s.vocab.entries, s.formIndex).danglingPins.length === 1,
    "集計に宙吊りピン1件");

  // e019: 絵文字はgraphemeで1原子
  ok(s.atomsByWord.get("go🚀").length === 3, "go🚀 は3原子（🚀が1原子）");

  // e021/e022: 最終字決まり
  ok(kimarijiDepth(s.root, s.atomsByWord.get("extend")) === 6 &&
     kimarijiDepth(s.root, s.atomsByWord.get("extent")) === 6,
    "extend/extent は6字決まり（語長＝決まり字）");

  // 焦点修復: "extrac" に居て extract を消した世界を模擬
  const without = s.vocab.entries.filter((e) => e.w !== "extract");
  const t2 = buildTrie(without, s.tokenize);
  const repaired = repairFocus(t2.root, s.tokenize("extrac"));
  ok(joinAtoms(repaired) === "extra", "法則: 焦点修復はmeetへ落ちる（extrac→extra）");
}

// ---------------- ③ ンガティ語 ----------------
console.log("\n[ngati × ngati-dict]");
{
  const s = setup("ngati.json", ["ngati-dict.json"]);

  ok(s.atomsByWord.get("ngatsot").join("|") === "ng|a|ts|o|t",
    "ngatsot → ng|a|ts|o|t（tsが形態素境界をまたぐ）");
  ok(s.atomsByWord.get("anga").join("|") === "a|ng|a", "anga → a|ng|a");
  ok(s.atomsByWord.get("mungatdu").join("|") === "m|u|ng|a|t|d|u", "mungatdu の切断");

  // ná と na は第2原子で分岐（náはnaの接頭辞ではない）
  const na = s.atomsByWord.get("na"), naH = s.atomsByWord.get("ná");
  ok(na[0] === naH[0] && na[1] !== naH[1], "na / ná は第2原子で分岐");

  // 母音調和: di/du が同一形態素に解決される
  const byW = Object.fromEntries(s.vocab.entries.map((e) => [e.w, e]));
  const past1 = resolveSeg(byW["keldi"], s.formIndex).parts[1].chosen.morph.id;
  const past2 = resolveSeg(byW["ngatdu"], s.formIndex).parts[1].chosen.morph.id;
  ok(past1 === "past" && past2 === "past", "di と du は同一形態素 past に解決（con/comの一般化）");

  // 完全重複: kelkel の2要素が同じmorph
  const r = resolveSeg(byW["kelkel"], s.formIndex);
  ok(r.parts[0].chosen.morph.id === "kel" && r.parts[1].chosen.morph.id === "kel",
    "kelkel は kel×2 に解決");

  // 全seg解決に未知なし
  const sum = resolveSummary(s.vocab.entries, s.formIndex);
  ok(sum.unknown === 0 && sum.inconsistent === 0, "未知・不整合なし");
}

console.log(`\n${fail === 0 ? "ALL GREEN" : "RED"}: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
