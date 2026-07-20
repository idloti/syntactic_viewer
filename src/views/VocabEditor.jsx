// src/views/VocabEditor.jsx — 語彙エディタ（一覧・追加・削除）＋JSON入出力。
// 保存はApp側のlocalStorageアダプタに委ねる（ここはvocabFileを作って渡すだけ）。

import React, { useMemo, useState } from "react";
import { normalize } from "../../core/tokenize.js";
import { mergeEntries, parseVocabText, stringifyVocab } from "../adapters/files.js";
import { C, hbtn, inp } from "./theme.js";

function nextId(entries) {
  const nums = entries.map((e) => parseInt(e.id, 10)).filter((n) => Number.isFinite(n));
  const n = (nums.length ? Math.max(...nums) : 0) + 1;
  return String(n).padStart(4, "0");
}

export default function VocabEditor({ vocabFile, onChange, onClose }) {
  const [w, setW] = useState("");
  const [g, setG] = useState("");
  const [msg, setMsg] = useState(null);
  const [io, setIo] = useState(false);
  const [text, setText] = useState("");

  const entries = vocabFile.entries;
  const sorted = useMemo(() => [...entries].sort((a, b) => (a.w < b.w ? -1 : a.w > b.w ? 1 : 0)), [entries]);

  const add = () => {
    const word = normalize(w.trim());
    if (!word) {
      setMsg("語が空");
      return;
    }
    if (entries.some((e) => e.w === word)) {
      setMsg("もうある");
      return;
    }
    const entry = { id: nextId(entries), w: word };
    if (g.trim()) entry.g = g.trim();
    onChange({ ...vocabFile, entries: [...entries, entry] });
    setW("");
    setG("");
    setMsg(null);
  };

  const remove = (target) => {
    onChange({ ...vocabFile, entries: entries.filter((e) => e !== target) });
  };

  const doImport = (replace) => {
    const r = parseVocabText(text);
    if (!r.ok) {
      setMsg(r.error);
      return;
    }
    const nextEntries = replace ? r.vocabFile.entries : mergeEntries(entries, r.vocabFile.entries);
    onChange({ ...vocabFile, manifest: { ...vocabFile.manifest, ...(replace ? r.vocabFile.manifest : {}) }, entries: nextEntries });
    setMsg(replace ? "置換した" : "マージした");
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(60,50,45,0.28)", display: "flex", alignItems: "flex-end", zIndex: 10 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.paper,
          width: "100%",
          maxHeight: "86dvh",
          borderRadius: "18px 18px 0 0",
          display: "flex",
          flexDirection: "column",
          padding: "14px 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <strong style={{ color: C.ink, fontSize: 15 }}>語彙</strong>
          <span style={{ fontSize: 11, color: C.ghost }}>{entries.length}語（有限集合）</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => setIo(!io)} style={hbtn}>
            {io ? "一覧へ" : "JSON入出力"}
          </button>
          <button onClick={onClose} style={{ ...hbtn, border: "none" }}>
            閉じる ×
          </button>
        </div>

        {!io ? (
          <>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <input value={w} onChange={(e) => setW(e.target.value)} placeholder="語（例 educate）" style={{ flex: 1.2, ...inp }} />
              <input value={g} onChange={(e) => setG(e.target.value)} placeholder="意味（任意）" style={{ flex: 1, ...inp }} />
              <button
                onClick={add}
                style={{ background: C.rose, color: "#fff", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 700, padding: "0 14px" }}
              >
                追加
              </button>
            </div>
            {msg && <div style={{ color: C.roseDeep, fontSize: 11, marginTop: 5 }}>{msg}</div>}
            <div style={{ fontSize: 10.5, color: C.ghost, marginTop: 6 }}>
              追加・削除のたびにトライ・決まり字・枝の順序を全再計算。1語で地形が変わる。
            </div>
            <div style={{ overflowY: "auto", marginTop: 8, borderTop: `1px solid ${C.lineSoft}` }}>
              {sorted.map((e) => (
                <div key={e.id ?? e.w} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 2px", borderBottom: "1px solid #F2ECE8" }}>
                  <span style={{ fontFamily: "Avenir Next,sans-serif", fontWeight: 600, fontSize: 13.5, color: C.ink, minWidth: 96 }}>{e.w}</span>
                  <span style={{ fontSize: 11, color: C.inkSoft, flex: 1 }}>{e.g || ""}</span>
                  <button onClick={() => remove(e)} style={{ ...hbtn, border: "none", color: C.ghost }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 10 }}>
              形式：<code>{'{"manifest":{...},"entries":[{"id":"0001","w":"educate","g":"教育する"}, …]}'}</code>
              　（旧M1形式の素配列 <code>[{'{'}"w","g","p","r"{'}'}]</code> も読み込み時に自動変換）
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="ここに貼り付け（読み込み）／下のボタンで現在の語彙を書き出し"
              style={{ ...inp, height: 160, marginTop: 8, fontSize: 11, fontFamily: "monospace" }}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <button style={hbtn} onClick={() => setText(stringifyVocab(vocabFile))}>
                現在の語彙を書き出す
              </button>
              <button style={hbtn} onClick={() => doImport(false)}>
                マージ読み込み
              </button>
              <button style={{ ...hbtn, color: C.roseDeep, borderColor: C.rose }} onClick={() => doImport(true)}>
                置換読み込み
              </button>
            </div>
            {msg && <div style={{ color: C.inkSoft, fontSize: 11, marginTop: 6 }}>{msg}</div>}
            <div style={{ fontSize: 10.5, color: C.ghost, marginTop: 8 }}>
              保存先は端末内（localStorage）。書き出したJSONをGitに置けば本番のdata/vocab/*.jsonになる（spec §7-11）。
            </div>
          </>
        )}
      </div>
    </div>
  );
}
