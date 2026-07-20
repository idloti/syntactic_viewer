// src/App.jsx — 配線のみ（spec §4.1）。stateを持ち、viewsへ渡し、Msgを受けてupdateへ流す。

import React, { useEffect, useMemo, useReducer } from "react";
import { buildTrie, makeAtomCompare } from "../core/trie.js";
import { makeTokenizer, normalize } from "../core/tokenize.js";
import defaultVocab from "../data/vocab/en-b2-verbs.json";
import { loadJSON, saveJSON } from "./adapters/storage.js";
import { initState, update } from "./state/state.js";
import DetailSheet from "./views/DetailSheet.jsx";
import { useReducedMotion } from "./views/springs.js";
import { C, hbtn } from "./views/theme.js";
import TrieView from "./views/TrieView.jsx";
import VocabEditor from "./views/VocabEditor.jsx";

const STORE_KEY = "vocab:v1";

export default function App() {
  const [state, dispatch] = useReducer(update, undefined, initState);
  const reduced = useReducedMotion();

  // 初回読み込み：localStorageにあればそれを、無ければ既定語彙（data/vocab/en-b2-verbs.json）
  useEffect(() => {
    const saved = loadJSON(STORE_KEY);
    const vocabFile = saved && Array.isArray(saved.entries) ? saved : defaultVocab;
    dispatch({ type: "VOCAB_LOADED", vocabFile });
  }, []);

  // 変更のたびに保存（spec §4.3: 本番=localStorage）
  useEffect(() => {
    if (state.vocabFile) saveJSON(STORE_KEY, state.vocabFile);
  }, [state.vocabFile]);

  const tokenize = useMemo(
    () => makeTokenizer(state.vocabFile?.manifest?.tokenizer),
    [state.vocabFile?.manifest?.tokenizer]
  );
  const atomCompare = useMemo(
    () => makeAtomCompare(state.vocabFile?.manifest?.collation),
    [state.vocabFile?.manifest?.collation]
  );

  const trie = useMemo(
    () => (state.vocabFile ? buildTrie(state.vocabFile.entries, tokenize) : null),
    [state.vocabFile, tokenize]
  );

  // atomsByWordのキー（buildTrie内でnormalize済み）と一致させるため、正規化して引く
  const entryMap = useMemo(() => {
    const m = new Map();
    if (state.vocabFile) for (const e of state.vocabFile.entries) m.set(normalize(e.w), e);
    return m;
  }, [state.vocabFile]);

  // 語彙が変わったら焦点をmeetへ修復（spec §2.1）
  useEffect(() => {
    if (trie) dispatch({ type: "FOCUS_REPAIR", root: trie.root });
  }, [trie]);

  if (!state.vocabFile || !trie) {
    return (
      <div
        style={{
          height: "100dvh",
          display: "grid",
          placeItems: "center",
          background: C.paper,
          color: C.inkSoft,
          fontFamily: "sans-serif",
        }}
      >
        語彙を読み込み中…
      </div>
    );
  }

  const focusLabel = state.focus.length ? state.focus.join("") : "（語頭）";

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: C.paper,
        fontFamily: '"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif',
        userSelect: "none",
      }}
    >
      <style>{`*{box-sizing:border-box;-webkit-tap-highlight-color:transparent} input,textarea{font-family:inherit}`}</style>

      <header style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "14px 16px 6px" }}>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.ink, letterSpacing: "0.06em" }}>決まり字トライ</h1>
        <span style={{ fontSize: 11, color: C.ghost }}>{state.vocabFile.entries.length}語</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => dispatch({ type: "FOCUS_HOME" })} style={hbtn}>
          語頭へ
        </button>
        <button onClick={() => dispatch({ type: "EDITOR_OPEN", open: true })} style={{ ...hbtn, borderColor: C.rose, color: C.roseDeep }}>
          語彙
        </button>
      </header>
      <div style={{ padding: "0 16px 6px", fontSize: 10.5, color: C.ghost }}>
        接頭：
        <span style={{ color: C.roseDeep, fontWeight: 700, fontFamily: "Avenir Next,sans-serif" }}>{focusLabel}</span>
        ・{state.focus.length === 0 ? "頻度順に縦一列" : "頻度1位が1時の位置"}・塗り＝決まり字
      </div>

      <TrieView
        root={trie.root}
        atomsByWord={trie.atomsByWord}
        focusAtoms={state.focus}
        rot={state.rot}
        atomCompare={atomCompare}
        reduced={reduced}
        onFocusChange={(atoms) => dispatch({ type: "FOCUS_SET", atoms })}
        onRotChange={(rot) => dispatch({ type: "ROT_SET", rot })}
        onSelect={(word) => dispatch({ type: "SELECT_SET", word })}
      />

      {state.selection && (
        <DetailSheet
          word={state.selection}
          root={trie.root}
          atomsByWord={trie.atomsByWord}
          entryMap={entryMap}
          onClose={() => dispatch({ type: "SELECT_SET", word: null })}
        />
      )}

      {state.editorOpen && (
        <VocabEditor
          vocabFile={state.vocabFile}
          onChange={(vocabFile) => dispatch({ type: "VOCAB_CHANGED", vocabFile })}
          onClose={() => dispatch({ type: "EDITOR_OPEN", open: false })}
        />
      )}
    </div>
  );
}
