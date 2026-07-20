# CLAUDE.md — 決まり字トライ 作業ルール

## 基本
- 言語: 日本語
- 発注者はコードを読まない。JSONと実機の挙動でレビューする
- まず docs/spec-v1.md（§5は暫定）と docs/handoff-log.md を読む

## 分業体制（重要）
- **core/ と data/ は発注者側の領土**。別セッション（設計会話）で作成・検証済み
  - あなたの仕事は「使うこと」。書き換えは指示があるときだけ
  - 不備を見つけたら、直さずPRの説明で報告する
- **あなた（Claude Code）の領土**: src/views/ src/adapters/ src/state
  ビルド設定・配備・PWA・見た目のすべて

## core/ の扱い
- 依存ゼロの素のESモジュール（node単体でもブラウザ直読みでも動く）
- `node core/selftest.js ./data` が**全PRの前提条件**（現在28本、ALL GREEN）
- core/ に import を追加しない。React/DOM/ビルド固有の機能を持ち込まない
- UIが必要とする関数が足りない場合：core/を書き換えず、
  src/ 側にラッパーを書くか、PRで「core/への追加要望」として報告する

## いま作るもの（プランS）
M1プロトタイプ（kimariji-m1.jsx 参照）相当のトライビューを、core/ を使って
Vite + React で再実装し、GitHub Pages で公開する。
- 語彙は data/vocab/en-b2-verbs.json を読み込む（辞書はまだ使わない）
- 語彙エディタとJSON入出力（保存は localStorage）
- 単一HTML書き出し（vite-plugin-singlefile）を release/ に置く
- **作らないもの**: テスト基盤・辞書UI・セマンティックビュー・PC最適化
  （spec §5にあるが後のプラン。作り込まない）

## 判断に迷ったら
止まらず暫定判断で進み、docs/02-decisions.md に1行追記:
`日付 / 何を / どう決めたか / 理由 / 暫定or確定`
価値判断は docs/handoff-log.md 補遺の一問一答に従う。
spec §7 の決定記録は再審理しない。

## PRの書き方
1. 何を変えたか（3行以内、非エンジニアに読める言葉で）
2. `node core/selftest.js ./data` の結果
3. 暫定判断の一覧（あれば）
4. スクリーンショットと、可能ならデプロイURL
5. 発注者に見てほしい点（1〜3個）

## セッション終了時
1. コミット＆PR（可能なら配備まで）
2. docs/HANDOFF.md 更新（現状／未完／次の一手）
3. 暫定判断を docs/02-decisions.md へ

## 禁止事項
- mainへの直接コミット
- core/ data/ の無断変更
- エラーのthrowでの表現（欠落・不整合・未知・多義は表示される状態）
- プランS範囲外の機能の先行実装
