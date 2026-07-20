// src/views/TrieView.jsx — トライビュー本体（文字盤・魚眼トレイル・バネ・決まり字）。
// Stateを読むだけ。書き込みは props で渡されたコールバック（Msg発行）経由のみ（CQRS）。

import React, { useEffect, useMemo, useRef, useState } from "react";
import { nodeAt, pathKey } from "../../core/trie.js";
import { computeTargets, FE } from "./layout.js";
import { useSprings } from "./springs.js";
import { C, fanBtn } from "./theme.js";

const DRAW_ORDER = { ghost: 0, trail: 1, child: 2, kimariji: 2, focus: 3 };

export default function TrieView({
  root,
  atomsByWord,
  focusAtoms,
  rot,
  atomCompare,
  entryMap,
  reduced,
  onFocusChange,
  onRotChange,
  onSelect,
}) {
  const canvasRef = useRef(null);
  const [dims, setDims] = useState({ w: 390, h: 560 });

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setDims({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(
    () => computeTargets(root, focusAtoms, rot, dims, atomCompare, atomsByWord),
    [root, focusAtoms, rot, dims, atomCompare, atomsByWord]
  );
  const { states, wobble } = useSprings(layout, reduced);
  const { T, fanMeta } = layout;
  const focusKey = pathKey(focusAtoms);

  // ---------- interactions ----------
  const tapNode = (id, t) => {
    wobble(id);
    if (t.kind === "kimariji") {
      onSelect(t.only);
      return;
    }
    if (id === focusKey) return; // 焦点の再タップ＝揺れるだけ
    onFocusChange(t.atoms);
  };

  const ptr = useRef(null);
  const dragAmt = useRef(0);
  const onPointerDown = (e) => {
    ptr.current = { x: e.clientX, y: e.clientY };
    dragAmt.current = 0;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const p = ptr.current;
    if (!p) return;
    const dy = e.clientY - p.y;
    dragAmt.current += Math.abs(e.clientX - p.x) + Math.abs(dy);
    p.x = e.clientX;
    p.y = e.clientY;
    const meta = fanMeta;
    if (meta && dy !== 0) {
      // 下へなぞる＝盤が時計回り＝上に隠れた候補が降りてくる
      onRotChange(Math.max(meta.rotMin, Math.min(meta.rotMax, rot + dy * 0.45)));
    }
  };
  const onPointerUp = () => {
    ptr.current = null;
  };
  const wasDrag = () => dragAmt.current > 8;

  const focusNode = root && focusAtoms ? nodeAt(root, focusAtoms) : null;
  const items = [...T.entries()].sort((a, b) => DRAW_ORDER[a[1].kind] - DRAW_ORDER[b[1].kind]);

  return (
    <div
      ref={canvasRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ position: "relative", flex: 1, minHeight: 0, touchAction: "none", overflow: "hidden" }}
    >
      <svg width="100%" height="100%" style={{ display: "block" }}>
        {/* edges */}
        {items.map(([id, t]) => {
          if (t.atoms.length === 0) return null;
          const pid = pathKey(t.atoms.slice(0, -1));
          const ps = states.current.get(pid);
          const s = states.current.get(id);
          if (!ps || !s) return null;
          const isGhost = t.kind === "ghost";
          return (
            <line
              key={"e" + id}
              x1={ps.x}
              y1={ps.y}
              x2={s.x}
              y2={s.y}
              stroke={isGhost ? C.lineSoft : t.kind === "kimariji" ? C.rose : C.line}
              strokeWidth={isGhost ? 1 : 1.3}
              strokeDasharray={isGhost ? "3 3" : "none"}
              opacity={isGhost ? 0.8 : 1}
            />
          );
        })}

        {/* nodes */}
        {items.map(([id, t]) => {
          const s = states.current.get(id);
          if (!s) return null;
          const r = Math.max(0.1, s.r);
          const isFocus = t.kind === "focus";
          const isKim = t.kind === "kimariji";
          const isGhost = t.kind === "ghost";
          const fill = isKim ? C.rose : "#fff";
          const stroke = isFocus ? C.roseDeep : isGhost ? C.ghost : isKim ? "none" : C.inkSoft;
          return (
            <g
              key={id}
              opacity={t.alpha ?? 1}
              onClick={() => {
                if (!wasDrag()) tapNode(id, t);
              }}
              style={{ cursor: "pointer" }}
            >
              <circle cx={s.x} cy={s.y} r={Math.max(r + 6, 16)} fill="transparent" />
              {isFocus && (
                <circle cx={s.x} cy={s.y} r={r + 4.5} fill="none" stroke={C.rose} strokeWidth="1.2" opacity="0.55" />
              )}
              <circle
                cx={s.x}
                cy={s.y}
                r={r}
                fill={fill}
                stroke={stroke}
                strokeWidth={isFocus ? 2.4 : isGhost ? 1 : 1.3}
                strokeDasharray={isGhost ? "2.5 2.5" : "none"}
              />
              {r >= 7 && t.atom && (
                <text
                  x={s.x}
                  y={s.y + r * 0.36}
                  textAnchor="middle"
                  style={{
                    fontFamily: "Avenir Next,'Hiragino Kaku Gothic ProN',sans-serif",
                    fontSize: Math.max(9, r * 0.95),
                    fontWeight: isFocus || isKim ? 600 : 500,
                    fill: isKim ? "#fff" : isFocus ? C.roseDeep : isGhost ? C.ghost : C.ink,
                    pointerEvents: "none",
                  }}
                >
                  {t.atom}
                </text>
              )}
              {t.atoms.length === 0 && <circle cx={s.x} cy={s.y} r={2.5} fill={C.rose} pointerEvents="none" />}
              {t.kind === "child" && t.count > 1 && (
                <text
                  x={s.x}
                  y={s.y - r - 5}
                  textAnchor="middle"
                  style={{ fontSize: 9.5, fill: C.ghost, pointerEvents: "none" }}
                >
                  {t.count}
                </text>
              )}
              {isKim && t.restAtoms != null && (
                <KimarijiTail x={s.x} y={s.y} r={r} restAtoms={t.restAtoms} word={t.only} entryMap={entryMap} />
              )}
            </g>
          );
        })}
      </svg>

      {fanMeta && (
        <div
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            alignItems: "center",
            color: C.ghost,
            fontSize: 10.5,
          }}
        >
          <button
            style={fanBtn}
            disabled={fanMeta.above === 0}
            onClick={() => onRotChange(Math.min(fanMeta.rotMax, rot + FE.DTH))}
          >
            ↻
          </button>
          <span>{fanMeta.above}</span>
          <div style={{ width: 1, height: 26, background: C.lineSoft }} />
          <span>{fanMeta.below}</span>
          <button
            style={fanBtn}
            disabled={fanMeta.below === 0}
            onClick={() => onRotChange(Math.max(fanMeta.rotMin, rot - FE.DTH))}
          >
            ↺
          </button>
        </div>
      )}

      {focusNode && focusNode.count === 0 && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: C.ghost }}>
          語彙が空。右上の「語彙」から追加して。
        </div>
      )}
    </div>
  );
}

// 決まり字の子：残りのゴースト連鎖＋語＋意味（spec §5.2「尾は小さなゴースト文字連鎖のみ」）
function KimarijiTail({ x, y, r, restAtoms, word, entryMap }) {
  const shown = restAtoms.slice(0, 6);
  const tailX = x + r + 20 + shown.length * 22 + 8;
  return (
    <g pointerEvents="none">
      {shown.map((a, i) => (
        <g key={i}>
          <line
            x1={x + r + 4 + i * 22}
            y1={y}
            x2={x + r + 14 + i * 22}
            y2={y}
            stroke={C.lineSoft}
            strokeDasharray="3 3"
            strokeWidth="1"
          />
          <circle cx={x + r + 20 + i * 22} cy={y} r={8} fill="#fff" stroke={C.ghost} strokeWidth="1" strokeDasharray="2.5 2.5" />
          <text x={x + r + 20 + i * 22} y={y + 3} textAnchor="middle" style={{ fontFamily: "Avenir Next,sans-serif", fontSize: 9, fill: C.ghost }}>
            {a}
          </text>
        </g>
      ))}
      <text x={tailX} y={y - 2} style={{ fontFamily: "Avenir Next,sans-serif", fontSize: 13.5, fontWeight: 600, fill: C.ink }}>
        {word}
      </text>
      <text x={tailX} y={y + 12} style={{ fontSize: 9.5, fill: C.ghost }}>
        {entryMap.get(word)?.g || ""}
      </text>
    </g>
  );
}
