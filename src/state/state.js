// src/state/state.js — アプリの状態と純関数update(state, msg)。
//
// spec §2.2 の State を最小実装：
//   vocab（vocabFileとして保持）/ focus（原子配列）/ rot / selection / editorOpen
// dicts と tab はプランSの範囲外（辞書UI・セマンティックビュー・書庫は作らない）なので持たない。
//
// views はこれを読むだけ。書き込みは必ずMsgを介す（CQRS、spec §4.2）。

import { repairFocus } from "../../core/trie.js";

export function initState() {
  return {
    vocabFile: null, // {manifest, entries} | null（読み込み中）
    focus: [], // 原子配列（ε=[]）
    rot: 0,
    selection: null, // 選択中の語（w）| null
    editorOpen: false,
  };
}

export function update(state, msg) {
  switch (msg.type) {
    case "VOCAB_LOADED":
      return { ...state, vocabFile: msg.vocabFile, focus: [], rot: 0, selection: null };

    case "VOCAB_CHANGED":
      return { ...state, vocabFile: msg.vocabFile };

    case "FOCUS_SET":
      if (sameAtoms(state.focus, msg.atoms)) return state;
      return { ...state, focus: msg.atoms, rot: 0 };

    case "FOCUS_HOME":
      return { ...state, focus: [], rot: 0 };

    case "ROT_SET":
      return { ...state, rot: msg.rot };

    case "SELECT_SET":
      return { ...state, selection: msg.word };

    case "EDITOR_OPEN":
      return { ...state, editorOpen: msg.open };

    // 語彙編集後の焦点修復（spec §2.1 meetフォールバック）。
    case "FOCUS_REPAIR": {
      const repaired = repairFocus(msg.root, state.focus);
      if (sameAtoms(repaired, state.focus)) return state;
      return { ...state, focus: repaired, rot: 0 };
    }

    default:
      return state;
  }
}

function sameAtoms(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
