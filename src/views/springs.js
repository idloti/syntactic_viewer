// src/views/springs.js — 表示専用のバネ（減衰振動子）。
//
// spec §2.3 末尾: 「バネの実行時状態（位置・速度）は導出値のアニメーションであり、
// Stateに含めない」。だからここはReactの状態でなくrefで持ち、tickだけをStateっぽく
// 再描画トリガに使う。views内に閉じた副作用（View自身のアニメーションループ）。

import { useEffect, useRef, useState } from "react";
import { pathKey, unkey } from "../../core/trie.js";

export const SPRING = { K: 110, D: 14, WOBBLE: 240, EPS: 0.08 };

export function useReducedMotion() {
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

function parentKeyOf(id) {
  if (id === "") return null;
  return pathKey(unkey(id).slice(0, -1));
}

/**
 * layout.T（目標座標）をバネで追いかける実行時状態を作る。
 * @param {{T: Map<string,object>}|null} layout
 * @param {boolean} reduced prefers-reduced-motion時は即時整定
 * @returns {{states: React.MutableRefObject<Map>, wobble:(id:string)=>void}}
 */
export function useSprings(layout, reduced) {
  const states = useRef(new Map());
  const needFrame = useRef(true);
  const [, setTick] = useState(0);

  useEffect(() => {
    needFrame.current = true;
  }, [layout, reduced]);

  useEffect(() => {
    let raf;
    let last = performance.now();
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!layout) return;
      const { T } = layout;
      let moving = false;

      for (const id of [...states.current.keys()]) if (!T.has(id)) states.current.delete(id);

      for (const [id, t] of T) {
        let s = states.current.get(id);
        if (!s) {
          const parent = states.current.get(parentKeyOf(id));
          s = parent
            ? { x: parent.x, y: parent.y, r: 0, vx: 0, vy: 0, vr: 0 }
            : { x: t.x, y: t.y, r: reduced ? t.r : 0, vx: 0, vy: 0, vr: 0 };
          states.current.set(id, s);
        }
        if (reduced) {
          s.x = t.x;
          s.y = t.y;
          s.r = t.r;
          s.vx = s.vy = s.vr = 0;
          continue;
        }
        const { K, D } = SPRING;
        s.vx += (K * (t.x - s.x) - D * s.vx) * dt;
        s.vy += (K * (t.y - s.y) - D * s.vy) * dt;
        s.vr += (K * (t.r - s.r) - D * s.vr) * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.r += s.vr * dt;
        if (
          Math.abs(s.vx) + Math.abs(s.vy) + Math.abs(s.vr) > SPRING.EPS ||
          Math.abs(t.x - s.x) + Math.abs(t.y - s.y) > SPRING.EPS
        )
          moving = true;
      }
      if (moving || needFrame.current) {
        needFrame.current = false;
        setTick((v) => v + 1);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [layout, reduced]);

  const wobble = (id) => {
    const s = states.current.get(id);
    if (s && !reduced) s.vx += (Math.random() < 0.5 ? -1 : 1) * SPRING.WOBBLE;
    needFrame.current = true;
  };

  return { states, wobble };
}
