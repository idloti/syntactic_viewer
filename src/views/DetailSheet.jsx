// src/views/DetailSheet.jsx — 現在の綴りの下部シート（spec §5.2「語は下部シートで」）。
// 常時表示：word未選択のときは焦点までの綴り（辿った字＝濃・続きは薄）、
// 決まり字選択後は語＋gloss＋n字決まり（S-3）。

import React from "react";
import { kimarijiDepth } from "../../core/kimariji.js";
import { C, hbtn } from "./theme.js";

export default function DetailSheet({ word, root, atomsByWord, entryMap, focusAtoms, onClose }) {
  if (!word) {
    return (
      <div
        style={{
          background: C.sheet,
          borderTop: `3px solid ${C.lineSoft}`,
          padding: "12px 16px 14px",
          boxShadow: "0 -4px 16px rgba(0,0,0,0.05)",
        }}
      >
        <span style={{ fontFamily: "Avenir Next,sans-serif", fontSize: 24, fontWeight: 600 }}>
          {focusAtoms.length === 0 ? (
            <span style={{ color: C.ghost }}>（語頭）</span>
          ) : (
            focusAtoms.map((a, i) => <span key={i} style={{ color: C.ink }}>{a}</span>)
          )}
          <span style={{ color: C.ghost }}>…</span>
        </span>
      </div>
    );
  }

  const atoms = atomsByWord.get(word) || [];
  const depth = kimarijiDepth(root, atoms); // null = 詠み切り札（spec §9-A1）
  const entry = entryMap.get(word);

  return (
    <div
      style={{
        background: C.sheet,
        borderTop: `3px solid ${C.rose}`,
        padding: "12px 16px 14px",
        boxShadow: "0 -4px 16px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "Avenir Next,sans-serif", fontSize: 24, fontWeight: 600 }}>
          {atoms.map((a, i) => {
            const isKimEdge = depth != null && i === depth - 1;
            const past = depth != null && i >= depth;
            return (
              <span
                key={i}
                style={{
                  color: isKimEdge ? C.roseDeep : past ? "#CFC6C1" : C.ink,
                  borderBottom: isKimEdge ? `2px solid ${C.roseDeep}` : "none",
                }}
              >
                {a}
              </span>
            );
          })}
        </span>
        <span style={{ fontSize: 12.5, color: C.ink }}>{entry?.g || ""}</span>
        {depth != null ? (
          <span
            style={{
              background: C.blue,
              color: "#fff",
              borderRadius: 999,
              fontSize: 10.5,
              fontWeight: 700,
              padding: "3px 10px",
            }}
          >
            {depth}字決まり「{atoms.slice(0, depth).join("")}」
          </span>
        ) : (
          <span
            style={{
              background: C.ghost,
              color: "#fff",
              borderRadius: 999,
              fontSize: 10.5,
              fontWeight: 700,
              padding: "3px 10px",
            }}
            title="他の語の接頭辞になっていて、最後まで読まないと一意に定まらない語（決まり字なし）"
          >
            詠み切り札
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={onClose} style={{ ...hbtn, border: "none", color: C.ghost }}>
          ×
        </button>
      </div>
      {Array.isArray(entry?.seg) && entry.seg.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 11.5, color: C.inkSoft }}>
          {entry.seg.map((s) => (typeof s === "string" ? s : s.s)).join(" + ")}
          <span style={{ color: C.ghost }}>（形態素ビューは次のマイルストーンで）</span>
        </div>
      )}
    </div>
  );
}
