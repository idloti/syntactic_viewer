// src/adapters/files.js — 語彙JSONの読み書き。
//
// spec §3.1: 必須は w のみ。未知フィールドは保存時に削除しない。
// 旧形式（M1の素配列 [{w,g,p,r}]）は読み込み時に v2 へ自動変換する。
// S9: 読み込み失敗はthrowせず、呼び出し側が表示できる結果オブジェクトへ写像する。

import { normalize } from "../../core/tokenize.js";

/** M1プロトタイプの素配列を v2（{manifest, entries}）へ変換する。未知フィールドは保全。 */
function migrateFlatArray(arr) {
  const entries = arr
    .filter((e) => e && typeof e.w === "string" && e.w.trim() !== "")
    .map((e, i) => {
      const { w, g, p, r, ...rest } = e;
      const seg = p || r ? [p, r].filter((x) => typeof x === "string" && x !== "") : undefined;
      const entry = { id: String(i + 1).padStart(4, "0"), w: normalize(w), ...rest };
      if (g != null) entry.g = g;
      if (seg && seg.length) entry.seg = seg;
      return entry;
    });
  return {
    manifest: { format: 2, name: "インポート", tokenizer: "grapheme" },
    entries,
  };
}

/** v2形式を軽く正規化する（wのNFC化、id自動採番、manifest既定値の補完）。未知フィールドはそのまま。 */
function normalizeV2(data) {
  const manifest = { format: 2, tokenizer: "grapheme", ...(data.manifest || {}) };
  const clean = data.entries.filter((e) => e && typeof e.w === "string" && e.w.trim() !== "");
  const entries = assignIds(clean).map((e) => ({ ...e, w: normalize(e.w) }));
  return { manifest, entries };
}

/** idを持たないエントリに自動採番する（spec §3.1: 「省略時は…採番結果は保存する」）。 */
function assignIds(entries) {
  const used = new Set(entries.map((e) => e.id).filter((id) => typeof id === "string"));
  let next = 1;
  const freshId = () => {
    let id;
    do {
      id = String(next++).padStart(4, "0");
    } while (used.has(id));
    used.add(id);
    return id;
  };
  return entries.map((e) => (e.id ? e : { ...e, id: freshId() }));
}

/**
 * 語彙データ（JSON.parse済み）をv2形式へ写す。未知の形は例外だが、
 * 呼び出し側は parseVocabText 経由でこれを握りつぶし、結果を状態として返す。
 */
export function migrateVocab(data) {
  if (Array.isArray(data)) return migrateFlatArray(data);
  if (data && typeof data === "object" && Array.isArray(data.entries)) return normalizeV2(data);
  throw new Error("unrecognized vocab format");
}

/**
 * 貼り付け/読み込みJSONテキストをvocabFileへ。失敗はエラー文字列として返す（投げない）。
 * @returns {{ok:true, vocabFile:object} | {ok:false, error:string}}
 */
export function parseVocabText(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "JSONとして読めない" };
  }
  try {
    return { ok: true, vocabFile: migrateVocab(data) };
  } catch {
    return { ok: false, error: "語彙の形が分からない（配列、または {manifest, entries} の形で）" };
  }
}

/** 現在の語彙をエクスポート用テキストへ（保存済みJSONと同じ形）。 */
export function stringifyVocab(vocabFile) {
  return JSON.stringify(vocabFile, null, 1);
}

/**
 * マージ：既存語彙に対し、idが一致するものは上書き、無ければ追加。
 * idを持たないインポート行はw基準でマージする（旧形式の救済）。
 */
export function mergeEntries(existing, incoming) {
  const byId = new Map(existing.map((e) => [e.id ?? `w:${e.w}`, e]));
  for (const e of incoming) {
    const key = e.id ?? `w:${e.w}`;
    byId.set(key, e);
  }
  return [...byId.values()];
}
