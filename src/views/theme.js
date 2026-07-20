// src/views/theme.js — 配色トークン（spec §5.1）。
// 色の文法：塗り＝決まった札、輪＝いま居る場所。混ぜない。

export const C = {
  paper: "#FCFBF9",
  line: "#C9BEB8",
  lineSoft: "#DCD3CD",
  rose: "#C99B95",
  roseDeep: "#B3554A",
  ink: "#6D625C",
  inkSoft: "#9A908A",
  ghost: "#C7BEB8",
  blue: "#4DA3E8",
  sheet: "#FFFFFF",
};

export const hbtn = {
  background: "none",
  border: `1px solid ${C.lineSoft}`,
  borderRadius: 8,
  color: C.inkSoft,
  fontSize: 12,
  padding: "5px 10px",
};

export const fanBtn = {
  background: "#fff",
  border: `1px solid ${C.lineSoft}`,
  borderRadius: 8,
  color: C.inkSoft,
  fontSize: 11,
  width: 30,
  height: 30,
};

export const inp = {
  background: "#fff",
  border: `1px solid ${C.lineSoft}`,
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 13,
  color: C.ink,
  width: "100%",
};
