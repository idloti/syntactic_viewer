// src/adapters/storage.js — 保存の切替口。
//
// spec §4.3: 「storageアダプタ：本番=localStorage、アーティファクト=window.storage」。
// プランSでは本番（localStorage）のみを実装する。将来window.storage版が要るときは
// このファイルの中身だけ差し替えればよい（呼び出し側は関知しない）。
//
// A7（handoff §5）: 失敗は静かに握りつぶさず、呼び出し側が気づけるよう真偽値で返す。

const PREFIX = "kimariji:";

export function loadJSON(key) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveJSON(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeJSON(key) {
  try {
    window.localStorage.removeItem(PREFIX + key);
    return true;
  } catch {
    return false;
  }
}
