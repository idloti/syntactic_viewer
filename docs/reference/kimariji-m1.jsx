import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";

/* ================================================================
   決まり字トライ M1 — 編集可能な語彙DB ＋ 魚眼トライビュー
   ・真実は語彙 W ただひとつ。トライ/count/決まり字/順序は全て純関数
   ・子の順序：count降順、同数はアルファベット順（決定的）
   ・扇は均等間隔、太さ（半径）が count を語る
   ・カメラ＝魚眼。タップ＝焦点変更。ノードはバネで移動し、
     タップされた点は左右にひと揺れして減衰する
   ================================================================ */

// ---------- palette ----------
const C = {
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

// ---------- seed vocabulary (編集で上書き可能) ----------
const SEED = [
  ["extract","抽出する","ex","tract"],["expect","予期する","ex","spect"],["expose","さらす","ex","pose"],
  ["express","表現する","ex","press"],["exclude","除外する","ex","clude"],["extend","伸ばす","ex","tend"],
  ["expand","拡大する","ex","pand"],["explore","探検する","ex","plore"],["explode","爆発する","ex","plode"],
  ["explain","説明する","ex","plain"],["exist","存在する","ex","sist"],["exceed","超える","ex","ceed"],
  ["expire","期限が切れる","ex","spire"],["export","輸出する","ex","port"],["emit","放出する","ex","mit"],
  ["evolve","進化する","ex","volve"],["erupt","噴火する","ex","rupt"],
  ["contract","契約する・縮む","con","tract"],["contain","含む","con","tain"],["conclude","結論づける","con","clude"],
  ["construct","建設する","con","struct"],["convert","転換する","con","vert"],["conduct","実施する","con","duct"],
  ["consist","成り立つ","con","sist"],["consume","消費する","con","sume"],["contribute","貢献する","con","tribute"],
  ["conform","従う","con","form"],["conserve","保存する","con","serve"],["connect","つなぐ","con","nect"],
  ["compose","構成する","con","pose"],["commit","委ねる・犯す","con","mit"],["compare","比べる","con","pare"],
  ["complain","不平を言う","con","plain"],["compress","圧縮する","con","press"],["correspond","一致する","con","spond"],
  ["corrupt","堕落させる","con","rupt"],
  ["include","含める","in","clude"],["inspect","検査する","in","spect"],["instruct","指導する","in","struct"],
  ["inject","注入する","in","ject"],["insist","主張する","in","sist"],["inspire","鼓舞する","in","spire"],
  ["intend","意図する","in","tend"],["invent","発明する","in","vent"],["involve","巻き込む","in","volve"],
  ["inform","知らせる","in","form"],["inquire","尋ねる","in","quire"],["impose","課す","in","pose"],
  ["impress","印象づける","in","press"],["import","輸入する","in","port"],["improve","改善する","in","prove"],
  ["reject","拒む","re","ject"],["receive","受け取る","re","ceive"],["reduce","減らす","re","duct"],
  ["refer","言及する","re","fer"],["resist","抵抗する","re","sist"],["retain","保持する","re","tain"],
  ["respond","応じる","re","spond"],["respect","尊敬する","re","spect"],["report","報告する","re","port"],
  ["require","要求する","re","quire"],["resume","再開する","re","sume"],["reserve","予約する","re","serve"],
  ["resolve","解決する","re","solve"],["revive","復活させる","re","vive"],["revolve","回転する","re","volve"],
  ["remove","取り除く","re","move"],
  ["describe","描写する","de","scribe"],["deceive","だます","de","ceive"],["depress","落ち込ませる","de","press"],
  ["deserve","値する","de","serve"],["detach","切り離す","de","tach"],["deduct","差し引く","de","duct"],
  ["distract","気を散らす","dis","tract"],["dissolve","溶かす","dis","solve"],["distribute","分配する","dis","tribute"],
  ["dispose","処分する","dis","pose"],["digest","消化する","dis","gest"],
  ["subtract","引く","sub","tract"],["submit","提出する","sub","mit"],["subscribe","定期購読する","sub","scribe"],
  ["sustain","持続させる","sub","tain"],["suspect","疑う","sub","spect"],["support","支える","sub","port"],
  ["suppose","仮定する","sub","pose"],["suppress","抑える","sub","press"],["succeed","成功する・続く","sub","ceed"],
  ["suggest","提案する","sub","gest"],["survive","生き残る","sur","vive"],
  ["transport","輸送する","trans","port"],["transform","変換する","trans","form"],["transfer","移す","trans","fer"],
  ["transmit","伝送する","trans","mit"],
  ["prevent","防ぐ","pre","vent"],["prepare","準備する","pre","pare"],["prescribe","処方する","pre","scribe"],
  ["pretend","ふりをする","pre","tend"],["prefer","好む","pre","fer"],["preserve","保存する","pre","serve"],
  ["produce","生産する","pro","duct"],["propose","提案する","pro","pose"],["project","投影する・計画する","pro","ject"],
  ["proceed","進む","pro","ceed"],["pronounce","発音する","pro","nounce"],["protect","守る","pro","tect"],
  ["object","反対する","ob","ject"],["observe","観察する","ob","serve"],["obtain","得る","ob","tain"],
  ["oppose","反対する","ob","pose"],["omit","省く","ob","mit"],
  ["admit","認める","ad","mit"],["attract","引きつける","ad","tract"],["attend","出席する","ad","tend"],
  ["attach","付ける","ad","tach"],["attempt","試みる","ad","tempt"],["assist","手伝う","ad","sist"],
  ["assume","仮定する","ad","sume"],["announce","発表する","ad","nounce"],["acquire","獲得する","ad","quire"],
  ["approve","承認する","ad","prove"],
  ["perceive","知覚する","per","ceive"],["perform","遂行する","per","form"],["permit","許可する","per","mit"],
  ["persist","固執する","per","sist"],
  ["interrupt","遮る","inter","rupt"],["introduce","紹介する・導入する","intro","duct"],
  ["maintain","維持する","main","tain"],["understand","理解する","under","stand"],["stand","立つ",null,"stand"],
].map(([w, g, p, r]) => ({ w, g, p, r }));

const STORE_KEY = "kimariji:vocab:v1";

// ---------- trie（W の純関数） ----------
function buildTrie(entries) {
  const root = { ch: "", children: {}, count: 0, word: null, only: null };
  for (const e of entries) {
    let n = root;
    n.count++;
    for (const c of e.w) {
      if (!n.children[c]) n.children[c] = { ch: c, children: {}, count: 0, word: null, only: null };
      n = n.children[c];
      n.count++;
    }
    n.word = e.w;
  }
  (function dfs(n) {
    if (n.count === 1) {
      let m = n;
      while (!m.word) m = m.children[sortedKids(m)[0][0]];
      n.only = m.word;
    }
    Object.values(n.children).forEach(dfs);
  })(root);
  return root;
}

// 子の順序：count降順 → アルファベット昇順（全順序＝描画が決定的）
function sortedKids(node) {
  return Object.entries(node.children).sort(
    (a, b) => b[1].count - a[1].count || (a[0] < b[0] ? -1 : 1)
  );
}

function nodeAt(trie, prefix) {
  let n = trie;
  for (const c of prefix) {
    n = n.children[c];
    if (!n) return null;
  }
  return n;
}

// 焦点の修復：meet（最長の生きている接頭辞）へ落とす
function repairFocus(trie, prefix) {
  let ok = "";
  let n = trie;
  for (const c of prefix) {
    if (!n.children[c]) break;
    n = n.children[c];
    ok += c;
  }
  return ok;
}

function kimarijiDepth(trie, word) {
  let n = trie;
  for (let i = 0; i < word.length; i++) {
    n = n.children[word[i]];
    if (!n) return word.length;
    if (n.count === 1) return i + 1;
  }
  return word.length;
}

// ---------- fisheye layout（焦点の純関数） ----------
// 扇＝文字盤。頻度1位が1時の位置、以降25°刻みで5時方向へ。
// あふれた分は回転（rot）で出す。トレイルは0.6の等比で必ず画面内に収まる。
const FE = {
  S_TRAIL: 0.6, STEP: 88, GAP: 62,
  R_FAN: 118, FOCUS_R: 19,
  DTH: 25, START: -50, VISIBLE: 63,
};

function baseRadius(count) {
  if (count === 1) return 13;
  return Math.min(20, 10.5 + 2.4 * Math.log2(count + 1));
}

function computeTargets(trie, focusId, rot, dims) {
  const T = new Map();
  const put = (id, t) => T.set(id, t);
  const ax = Math.min(dims.w * 0.34, 150);
  const ay = dims.h * 0.44;
  const { S_TRAIL, STEP, GAP, R_FAN, FOCUS_R, DTH, START, VISIBLE } = FE;

  const focus = nodeAt(trie, focusId);
  if (!focus) return { T, fanMeta: null };

  put(focusId, {
    x: ax, y: ay, r: focusId === "" ? 11 : FOCUS_R,
    kind: "focus", letter: focus.ch, count: focus.count, alpha: 1,
  });

  // --- 祖先トレイル（等比0.6：総幅 ≤ STEP·1.5 で必ず収まる）---
  let x = ax, y = ay;
  for (let k = 1; k <= focusId.length; k++) {
    const pid = focusId.slice(0, focusId.length - k);
    const parent = nodeAt(trie, pid);
    const takenCh = focusId[focusId.length - k];
    const kids = sortedKids(parent);
    const m = kids.length;
    const rank = kids.findIndex(([c]) => c === takenCh);
    const sc = Math.pow(S_TRAIL, k);
    const off = (rank - (m - 1) / 2) * GAP * sc;
    const px = x - STEP * sc;
    const py = y - off;

    put(pid, {
      x: px, y: py, r: Math.max(3.5, (pid === "" ? 11 : FOCUS_R) * sc),
      kind: "trail", letter: parent.ch, count: parent.count, alpha: 1,
    });

    kids.forEach(([c, child], rk) => {
      if (c === takenCh || Math.abs(rk - rank) > 3) return;
      const sid = pid + c;
      if (T.has(sid)) return;
      put(sid, {
        x: px + STEP * sc * 0.3,
        y: py + (rk - (m - 1) / 2) * GAP * sc,
        r: Math.max(2.5, baseRadius(child.count) * sc * 0.4),
        kind: "ghost", letter: c, count: child.count, alpha: 0.9,
      });
    });

    x = px; y = py;
  }

  // --- 扇（文字盤）：θ_i = START + i·DTH + rot ---
  const kids = sortedKids(focus);
  const m = kids.length;
  let above = 0, below = 0;
  kids.forEach(([c, child], i) => {
    const th = START + i * DTH + rot;
    if (th < -VISIBLE) { above++; return; }
    if (th > VISIBLE) { below++; return; }
    const rad = (th * Math.PI) / 180;
    const edgeFade = Math.max(0.15, Math.min(1, (VISIBLE - Math.abs(th)) / 14 + 0.15));
    put(focusId + c, {
      x: ax + R_FAN * Math.cos(rad),
      y: ay + R_FAN * Math.sin(rad),
      r: baseRadius(child.count),
      kind: child.count === 1 ? "kimariji" : "child",
      letter: c, count: child.count,
      only: child.only,
      rest: child.count === 1 ? child.only.slice(focusId.length + 1) : null,
      alpha: edgeFade,
    });
  });

  // 最終順位が5時（+50°）に来るまで回せる
  const rotMin = m > 5 ? Math.min(0, 100 - DTH * (m - 1)) : 0;
  const fanMeta = above + below > 0 || rotMin < 0
    ? { above, below, rotMin, rotMax: 0 }
    : null;

  return { T, fanMeta };
}

// ---------- spring engine ----------
const SPRING = { K: 110, D: 14, WOBBLE: 240, EPS: 0.08 };

function useReducedMotion() {
  const [rm, setRm] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setRm(mq.matches);
    const fn = (e) => setRm(e.matches);
    mq.addEventListener?.("change", fn);
    return () => mq.removeEventListener?.("change", fn);
  }, []);
  return rm;
}

// ---------- storage ----------
async function loadVocab() {
  try {
    const r = await window.storage.get(STORE_KEY);
    if (r && r.value) return JSON.parse(r.value);
  } catch (e) { /* not found */ }
  return null;
}
async function saveVocab(list) {
  try { await window.storage.set(STORE_KEY, JSON.stringify(list)); } catch (e) { console.error(e); }
}

// ================================================================
export default function App() {
  const [entries, setEntries] = useState(null); // null = loading
  const [focus, setFocus] = useState("");
  const [rot, setRot] = useState(0); // 文字盤の回転角（deg）
  const [selected, setSelected] = useState(null);
  const [editor, setEditor] = useState(false);
  const [, setTick] = useState(0);
  const reduced = useReducedMotion();

  // load vocab
  useEffect(() => {
    (async () => {
      const v = await loadVocab();
      if (v && Array.isArray(v) && v.length) setEntries(v);
      else { setEntries(SEED); saveVocab(SEED); }
    })();
  }, []);

  const trie = useMemo(() => (entries ? buildTrie(entries) : null), [entries]);
  const entryMap = useMemo(
    () => (entries ? Object.fromEntries(entries.map((e) => [e.w, e])) : {}),
    [entries]
  );

  // 語彙が変わったら焦点を meet に修復
  useEffect(() => {
    if (!trie) return;
    setFocus((f) => repairFocus(trie, f));
    setSelected((s) => (s && entryMap[s] ? s : null));
  }, [trie]); // eslint-disable-line

  // canvas dims
  const canvasRef = useRef(null);
  const [dims, setDims] = useState({ w: 390, h: 560 });
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setDims({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [entries]);

  // targets（純関数）
  const layout = useMemo(
    () => (trie ? computeTargets(trie, focus, rot, dims) : null),
    [trie, focus, rot, dims]
  );

  // spring states
  const states = useRef(new Map());
  const needFrame = useRef(true);
  useEffect(() => { needFrame.current = true; }, [layout, reduced]);

  useEffect(() => {
    let raf, last = performance.now();
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!layout) return;
      const { T } = layout;
      let moving = false;

      // remove departed
      for (const id of [...states.current.keys()]) if (!T.has(id)) states.current.delete(id);

      for (const [id, t] of T) {
        let s = states.current.get(id);
        if (!s) {
          // 新規ノードは親の現在位置から生まれる
          const parent = states.current.get(id.slice(0, -1));
          s = parent
            ? { x: parent.x, y: parent.y, r: 0, vx: 0, vy: 0, vr: 0 }
            : { x: t.x, y: t.y, r: reduced ? t.r : 0, vx: 0, vy: 0, vr: 0 };
          states.current.set(id, s);
        }
        if (reduced) { s.x = t.x; s.y = t.y; s.r = t.r; s.vx = s.vy = s.vr = 0; continue; }
        const { K, D } = SPRING;
        s.vx += (K * (t.x - s.x) - D * s.vx) * dt;
        s.vy += (K * (t.y - s.y) - D * s.vy) * dt;
        s.vr += (K * (t.r - s.r) - D * s.vr) * dt;
        s.x += s.vx * dt; s.y += s.vy * dt; s.r += s.vr * dt;
        if (
          Math.abs(s.vx) + Math.abs(s.vy) + Math.abs(s.vr) > SPRING.EPS ||
          Math.abs(t.x - s.x) + Math.abs(t.y - s.y) > SPRING.EPS
        ) moving = true;
      }
      if (moving || needFrame.current) { needFrame.current = false; setTick((v) => v + 1); }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [layout, reduced]);

  // ---------- interactions ----------
  const wobble = (id) => {
    const s = states.current.get(id);
    if (s && !reduced) s.vx += (Math.random() < 0.5 ? -1 : 1) * SPRING.WOBBLE;
    needFrame.current = true;
  };

  const tapNode = (id, t) => {
    wobble(id);
    if (t.kind === "kimariji") {
      setSelected(t.only);
      return;
    }
    if (id === focus) return; // 焦点の再タップ＝揺れるだけ
    setRot(0);
    setFocus(id);
  };

  // swipe（文字盤の回転）＋ tap 判定
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
    p.x = e.clientX; p.y = e.clientY;
    const meta = layout?.fanMeta;
    if (meta && dy !== 0) {
      // 下へなぞる＝盤が時計回り＝上に隠れた候補が降りてくる
      setRot((r) => Math.max(meta.rotMin, Math.min(meta.rotMax, r + dy * 0.45)));
    }
  };
  const onPointerUp = () => { ptr.current = null; };
  const wasDrag = () => dragAmt.current > 8;

  // ---------- editor ops ----------
  const addWord = (w, g) => {
    w = w.trim().toLowerCase();
    if (!/^[a-z]+$/.test(w)) return "a〜zの小文字だけで入れて";
    if (entryMap[w]) return "もうある";
    const next = [...entries, { w, g: g.trim() || "—", p: null, r: null }];
    setEntries(next); saveVocab(next);
    return null;
  };
  const removeWord = (w) => {
    const next = entries.filter((e) => e.w !== w);
    setEntries(next); saveVocab(next);
  };
  const importJson = (text, replace) => {
    try {
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error();
      const clean = arr
        .filter((e) => e && typeof e.w === "string" && /^[a-z]+$/.test(e.w))
        .map((e) => ({ w: e.w, g: e.g || "—", p: e.p ?? null, r: e.r ?? null }));
      let next;
      if (replace) next = clean;
      else {
        const map = Object.fromEntries(entries.map((e) => [e.w, e]));
        for (const e of clean) map[e.w] = e;
        next = Object.values(map);
      }
      setEntries(next); saveVocab(next);
      return null;
    } catch {
      return "JSONが読めない（配列 [{w, g, p, r}] の形で）";
    }
  };

  // ================================================================
  if (!entries || !trie || !layout) {
    return (
      <div style={{ height: "100dvh", display: "grid", placeItems: "center", background: C.paper, color: C.inkSoft, fontFamily: "sans-serif" }}>
        語彙を読み込み中…
      </div>
    );
  }

  const { T, fanMeta } = layout;
  const focusNode = nodeAt(trie, focus);
  const kimStr = selected ? selected.slice(0, kimarijiDepth(trie, selected)) : null;

  // 描画順：edge → ghost → trail → child → focus
  const order = { ghost: 0, trail: 1, child: 2, kimariji: 2, focus: 3 };
  const items = [...T.entries()].sort((a, b) => order[a[1].kind] - order[b[1].kind]);

  return (
    <div style={{
      height: "100dvh", display: "flex", flexDirection: "column",
      background: C.paper, fontFamily: '"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif',
      userSelect: "none",
    }}>
      <style>{`*{box-sizing:border-box;-webkit-tap-highlight-color:transparent} input,textarea{font-family:inherit}`}</style>

      {/* header */}
      <header style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "14px 16px 6px" }}>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.ink, letterSpacing: "0.06em" }}>決まり字トライ</h1>
        <span style={{ fontSize: 11, color: C.ghost }}>{entries.length}語</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => { setFocus(""); setRot(0); }} style={hbtn}>語頭へ</button>
        <button onClick={() => setEditor(true)} style={{ ...hbtn, borderColor: C.rose, color: C.roseDeep }}>語彙</button>
      </header>
      <div style={{ padding: "0 16px 6px", fontSize: 10.5, color: C.ghost }}>
        接頭：<span style={{ color: C.roseDeep, fontWeight: 700, fontFamily: "Avenir Next,sans-serif" }}>{focus || "（語頭）"}</span>
        ・頻度1位が1時の位置・塗り＝決まり字{fanMeta ? "・スワイプで盤を回す" : ""}
      </div>

      {/* canvas */}
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
            if (id === "") return null;
            const pid = id.slice(0, -1);
            const ps = states.current.get(pid), s = states.current.get(id);
            if (!ps || !s) return null;
            const det = t.kind === "kimariji" || t.kind === "ghost";
            return (
              <line key={"e" + id}
                x1={ps.x} y1={ps.y} x2={s.x} y2={s.y}
                stroke={t.kind === "ghost" ? C.lineSoft : t.kind === "kimariji" ? C.rose : C.line}
                strokeWidth={t.kind === "ghost" ? 1 : 1.3}
                strokeDasharray={det && t.kind === "ghost" ? "3 3" : "none"}
                opacity={t.kind === "ghost" ? 0.8 : 1}
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
            // 塗り＝決まり字だけ。焦点は白地＋朱の輪（意味論を混ぜない）
            const fill = isKim ? C.rose : "#fff";
            const stroke = isFocus ? C.roseDeep : isGhost ? C.ghost : isKim ? "none" : C.inkSoft;
            return (
              <g key={id} opacity={t.alpha ?? 1}
                onClick={() => { if (!wasDrag()) tapNode(id, t); }}
                style={{ cursor: "pointer" }}>
                {/* hit area */}
                <circle cx={s.x} cy={s.y} r={Math.max(r + 6, 16)} fill="transparent" />
                {isFocus && (
                  <circle cx={s.x} cy={s.y} r={r + 4.5} fill="none"
                    stroke={C.rose} strokeWidth="1.2" opacity="0.55" />
                )}
                <circle cx={s.x} cy={s.y} r={r} fill={fill}
                  stroke={stroke} strokeWidth={isFocus ? 2.4 : isGhost ? 1 : 1.3}
                  strokeDasharray={isGhost ? "2.5 2.5" : "none"} />
                {r >= 7 && t.letter && (
                  <text x={s.x} y={s.y + r * 0.36} textAnchor="middle"
                    style={{
                      fontFamily: "Avenir Next,'Hiragino Kaku Gothic ProN',sans-serif",
                      fontSize: Math.max(9, r * 0.95),
                      fontWeight: isFocus || isKim ? 600 : 500,
                      fill: isKim ? "#fff" : isFocus ? C.roseDeep : isGhost ? C.ghost : C.ink,
                      pointerEvents: "none",
                    }}>{t.letter}</text>
                )}
                {id === "" && <circle cx={s.x} cy={s.y} r={2.5} fill={C.rose} pointerEvents="none" />}
                {/* count 真上 */}
                {(t.kind === "child") && t.count > 1 && (
                  <text x={s.x} y={s.y - r - 5} textAnchor="middle"
                    style={{ fontSize: 9.5, fill: C.ghost, pointerEvents: "none" }}>{t.count}</text>
                )}
                {/* 決まり字：残りのゴースト連鎖＋語 */}
                {isKim && t.rest != null && (
                  <g pointerEvents="none">
                    {[...t.rest].slice(0, 6).map((c, i) => (
                      <g key={i}>
                        <line x1={s.x + r + 4 + i * 22} y1={s.y} x2={s.x + r + 14 + i * 22} y2={s.y}
                          stroke={C.lineSoft} strokeDasharray="3 3" strokeWidth="1" />
                        <circle cx={s.x + r + 20 + i * 22} cy={s.y} r={8}
                          fill="#fff" stroke={C.ghost} strokeWidth="1" strokeDasharray="2.5 2.5" />
                        <text x={s.x + r + 20 + i * 22} y={s.y + 3} textAnchor="middle"
                          style={{ fontFamily: "Avenir Next,sans-serif", fontSize: 9, fill: C.ghost }}>{c}</text>
                      </g>
                    ))}
                    <text x={s.x + r + 20 + Math.min(6, t.rest.length) * 22 + 8} y={s.y - 2}
                      style={{ fontFamily: "Avenir Next,sans-serif", fontSize: 13.5, fontWeight: 600, fill: C.ink }}>
                      {t.only}
                    </text>
                    <text x={s.x + r + 20 + Math.min(6, t.rest.length) * 22 + 8} y={s.y + 12}
                      style={{ fontSize: 9.5, fill: C.ghost }}>
                      {entryMap[t.only]?.g || ""}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* 文字盤の残数と回転ボタン */}
        {fanMeta && (
          <div style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            display: "flex", flexDirection: "column", gap: 6, alignItems: "center",
            color: C.ghost, fontSize: 10.5,
          }}>
            <button style={fanBtn} disabled={fanMeta.above === 0}
              onClick={() => setRot((r) => Math.min(fanMeta.rotMax, r + FE.DTH))}>↻</button>
            <span>{fanMeta.above}</span>
            <div style={{ width: 1, height: 26, background: C.lineSoft }} />
            <span>{fanMeta.below}</span>
            <button style={fanBtn} disabled={fanMeta.below === 0}
              onClick={() => setRot((r) => Math.max(fanMeta.rotMin, r - FE.DTH))}>↺</button>
          </div>
        )}

        {focusNode && focusNode.count === 0 && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: C.ghost }}>
            語彙が空。右上の「語彙」から追加して。
          </div>
        )}
      </div>

      {/* detail sheet */}
      {selected && (
        <div style={{
          background: C.sheet, borderTop: `3px solid ${C.rose}`,
          padding: "12px 16px 14px", boxShadow: "0 -4px 16px rgba(0,0,0,0.05)",
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "Avenir Next,sans-serif", fontSize: 24, fontWeight: 600 }}>
              {selected.split("").map((c, i) => (
                <span key={i} style={{
                  color: i === kimStr.length - 1 ? C.roseDeep : i >= kimStr.length ? "#CFC6C1" : C.ink,
                  borderBottom: i === kimStr.length - 1 ? `2px solid ${C.roseDeep}` : "none",
                }}>{c}</span>
              ))}
            </span>
            <span style={{ fontSize: 12.5, color: C.ink }}>{entryMap[selected]?.g}</span>
            <span style={{
              background: C.blue, color: "#fff", borderRadius: 999,
              fontSize: 10.5, fontWeight: 700, padding: "3px 10px",
            }}>{kimStr.length}字決まり「{kimStr}」</span>
            <div style={{ flex: 1 }} />
            <button onClick={() => setSelected(null)} style={{ ...hbtn, border: "none", color: C.ghost }}>×</button>
          </div>
          {(entryMap[selected]?.p || entryMap[selected]?.r) && (
            <div style={{ marginTop: 6, fontSize: 11.5, color: C.inkSoft }}>
              {entryMap[selected].p ? `${entryMap[selected].p}- ＋ ` : ""}{entryMap[selected].r}
              <span style={{ color: C.ghost }}>（形態素ビューは次のマイルストーンで）</span>
            </div>
          )}
        </div>
      )}

      {/* editor overlay */}
      {editor && (
        <Editor
          entries={entries}
          onClose={() => setEditor(false)}
          onAdd={addWord}
          onRemove={removeWord}
          onImport={importJson}
        />
      )}
    </div>
  );
}

const hbtn = {
  background: "none", border: `1px solid ${C.lineSoft}`, borderRadius: 8,
  color: C.inkSoft, fontSize: 12, padding: "5px 10px",
};
const fanBtn = {
  background: "#fff", border: `1px solid ${C.lineSoft}`, borderRadius: 8,
  color: C.inkSoft, fontSize: 11, width: 30, height: 30,
};

// ---------- editor ----------
function Editor({ entries, onClose, onAdd, onRemove, onImport }) {
  const [w, setW] = useState("");
  const [g, setG] = useState("");
  const [msg, setMsg] = useState(null);
  const [io, setIo] = useState(false);
  const [text, setText] = useState("");
  const sorted = useMemo(() => [...entries].sort((a, b) => (a.w < b.w ? -1 : 1)), [entries]);

  const add = () => {
    const err = onAdd(w, g);
    setMsg(err);
    if (!err) { setW(""); setG(""); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(60,50,45,0.28)",
      display: "flex", alignItems: "flex-end", zIndex: 10,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: C.paper, width: "100%", maxHeight: "86dvh",
        borderRadius: "18px 18px 0 0", display: "flex", flexDirection: "column",
        padding: "14px 16px",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <strong style={{ color: C.ink, fontSize: 15 }}>語彙</strong>
          <span style={{ fontSize: 11, color: C.ghost }}>{entries.length}語（有限集合）</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => setIo(!io)} style={hbtn}>{io ? "一覧へ" : "JSON入出力"}</button>
          <button onClick={onClose} style={{ ...hbtn, border: "none" }}>閉じる ×</button>
        </div>

        {!io ? (
          <>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <input value={w} onChange={(e) => setW(e.target.value)} placeholder="動詞（例 educate）"
                style={{ flex: 1.2, ...inp }} />
              <input value={g} onChange={(e) => setG(e.target.value)} placeholder="意味"
                style={{ flex: 1, ...inp }} />
              <button onClick={add} style={{
                background: C.rose, color: "#fff", border: "none",
                borderRadius: 8, fontSize: 12.5, fontWeight: 700, padding: "0 14px",
              }}>追加</button>
            </div>
            {msg && <div style={{ color: C.roseDeep, fontSize: 11, marginTop: 5 }}>{msg}</div>}
            <div style={{ fontSize: 10.5, color: C.ghost, marginTop: 6 }}>
              追加・削除のたびにトライ・決まり字・枝の順序を全再計算。1語で地形が変わる。
            </div>
            <div style={{ overflowY: "auto", marginTop: 8, borderTop: `1px solid ${C.lineSoft}` }}>
              {sorted.map((e) => (
                <div key={e.w} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 2px", borderBottom: `1px solid #F2ECE8`,
                }}>
                  <span style={{ fontFamily: "Avenir Next,sans-serif", fontWeight: 600, fontSize: 13.5, color: C.ink, minWidth: 96 }}>{e.w}</span>
                  <span style={{ fontSize: 11, color: C.inkSoft, flex: 1 }}>{e.g}</span>
                  {e.p && <span style={{ fontSize: 10, color: C.rose }}>{e.p}-{e.r}</span>}
                  <button onClick={() => onRemove(e.w)} style={{ ...hbtn, border: "none", color: C.ghost }}>×</button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 10 }}>
              形式：<code>[{'{'}"w":"educate","g":"教育する","p":null,"r":null{'}'}, …]</code>
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)}
              placeholder="ここに貼り付け（読み込み）／下のボタンで現在の語彙を書き出し"
              style={{ ...inp, height: 160, marginTop: 8, fontSize: 11, fontFamily: "monospace" }} />
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button style={hbtn} onClick={() => setText(JSON.stringify(entries))}>現在の語彙を書き出す</button>
              <button style={hbtn} onClick={() => setMsg(onImport(text, false) || "マージした")}>マージ読み込み</button>
              <button style={{ ...hbtn, color: C.roseDeep, borderColor: C.rose }}
                onClick={() => setMsg(onImport(text, true) || "置換した")}>置換読み込み</button>
            </div>
            {msg && <div style={{ color: C.inkSoft, fontSize: 11, marginTop: 6 }}>{msg}</div>}
            <div style={{ fontSize: 10.5, color: C.ghost, marginTop: 8 }}>
              保存先は端末内（この会話のアーティファクト用ストレージ）。書き出したJSONをGit/Obsidianに置けば本番のdata/verbs.jsonになる。
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const inp = {
  background: "#fff", border: `1px solid ${C.lineSoft}`, borderRadius: 8,
  padding: "8px 10px", fontSize: 13, color: C.ink, width: "100%",
};
