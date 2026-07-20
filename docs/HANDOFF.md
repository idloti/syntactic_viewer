# HANDOFF — プランS: Vite+Reactトライビュー

## 現状（S-3で変更したもの）

Issue #6（S-3）対応：決定記録§7-3の撤回（トレイル魚眼の廃止）＋下部シート常時表示。

- `src/views/layout.js`：深さ≥1のトレイル（祖先ノード）計算から魚眼スケール（S_TRAIL）・
  GAPによる折れオフセット・姉妹ゴーストを削除。等サイズ（TRAIL_R=15固定）・等間隔（STEP=88固定）の
  横一直線に変更。焦点x座標は深さに比例して右へ伸びる形にし（`ax = 基準 + STEP*depth`）、
  横スクロールで追従させることで「焦点は右寄り固定」を実現。`contentWidth`を新規に返す。
- `src/views/TrieView.jsx`：
  - キャンバスのoverflowXをautoにし、layout変化のたびscrollLeftを右端（contentWidth-viewport幅）へ
    スナップ。左端に紙色→透明のグラデーションを重ねて「古い側フェード」の見た目を追加。
  - タッチ操作はtouchAction:pan-xにし、横スワイプはネイティブスクロール・縦ドラッグは従来通り
    盤の回転（onRotChange）に使う。
  - 廃止した「ghost」kind（姉妹ゴースト）に依存していた描画分岐を削除。
- `src/views/DetailSheet.jsx`：word未選択時（決まり字未タップ時）でも常時マウントされ、
  焦点までの綴り（濃）＋続きを示す薄い「…」を表示するよう分岐を追加。語選択後は従来通り
  語＋gloss＋n字決まりバッジ。
- `src/App.jsx`：DetailSheetを`state.selection`の有無で条件レンダリングせず常時マウント。
  ヘッダー下にあった「接頭：」表示は下部シートと重複するため削除。
- `docs/spec-v1.md` §5.2・`docs/handoff-log.md` §2-3を新方針に更新。

core/ と data/ には一切手を加えていない。詳細はdocs/02-decisions.mdのS-3エントリを参照。

## 現状（S-2で追加したもの）

Issue #4（S-2）対応：spec §5.2の未実装3点を修正。

- `src/views/layout.js`：focus=ε（語頭）専用の縦一列レイアウトを追加（文字盤の扇とは別分岐）。
- `src/views/TrieView.jsx`：
  - 語頭のとき、キャンバスをネイティブスクロール（overflowY:auto）に切替。
  - トレイルの文字が `r<7` で消えていた不具合を修正。全ノードでフォントサイズ下限10pxを保証。
  - 決まり字の尾（KimarijiTail）に直書きされていた単語・意味を削除（下部シートに一本化、spec §7-10）。
- `src/App.jsx`：TrieViewへの不要になった `entryMap` propを削除。

core/ と data/ には一切手を加えていない。詳細はdocs/02-decisions.mdのS-2エントリを参照。

## 現状（このPRで作ったもの）

- Vite + React の骨組み一式（`package.json` / `vite.config.js` / `index.html` / `src/main.jsx`）。
  `vite-plugin-singlefile` を使い、`npm run build` で `release/` に単一HTMLを直接書き出す。
- `src/adapters/storage.js`：localStorageアダプタ（本番用、spec §4.3）。
- `src/adapters/files.js`：語彙JSONの解析・旧M1配列からv2形式への自動移行・マージ。
- `src/state/state.js`：State（vocabFile/focus/rot/selection/editorOpen）とupdate(state,msg)。
- `src/views/layout.js`：焦点(W,focus,rot,dims)から座標を導く純関数（M1のcomputeTargetsを
  core/trie.jsのpathKey（原子配列ベース）で作り直したもの）。
- `src/views/springs.js`：バネ（表示専用の実行時状態、Stateには含めない）。
- `src/views/TrieView.jsx`：文字盤・魚眼トレイル・決まり字・タップ／スワイプ。
- `src/views/DetailSheet.jsx`：選択語の下部シート。詠み切り札（kimarijiDepth=null）にも対応。
- `src/views/VocabEditor.jsx`：語彙一覧・追加・削除・JSON入出力（貼り付け／書き出し）。
- `src/App.jsx`：配線。既定語彙は `data/vocab/en-b2-verbs.json` を直接importし、
  localStorageに保存済みならそちらを優先する。
- `docs/deploy-pages.yml`：GitHub Pages配備ワークフロー案（後述の理由で `.github/workflows/` には置けていない）。

core/ と data/ には一切手を加えていない。

## 未完・持ち越し

1. **`.github/workflows/` への配備ワークフロー追加** — このセッションのGitHub App権限では
   `.github/workflows/` を書き込めない（claude-code-actionの制約）。
   `docs/deploy-pages.yml` の中身を `.github/workflows/deploy-pages.yml` として
   発注者側でコピーし、Settings → Pages → Source を「GitHub Actions」にしてください。
   それまでは公開URLが存在しません。
2. **S-3セッションで確認できたこと／できなかったこと** — 今回は `npm install` /
   `npm run build` / `node core/selftest.js ./data` は実行でき、いずれも成功
   （selftest ALL GREEN 28本、buildは`release/`に単一HTML書き出し成功）。
   ただしブラウザを開いての実機確認（スマホ幅での横スクロールの触感、右寄り固定の見え方、
   左端フェードの見栄え）はこのセッションの環境では行えていません。お手数ですが
   `npm run dev` を開いて、深い階層まで辿ったときのトレイルの挙動を見てください：
   ```
   npm run dev                    # http://localhost:5173 で確認
   ```
3. **core/layout.jsへの追加要望** — `src/views/layout.js` の`computeTargets`は
   数学的には純関数でReact/DOMに依存しないため、spec §4.1の設計どおりなら
   本来core/の管轄。現状core/にlayoutモジュールが無いためsrc/views/側に書いた。
   将来coreに正式採用するならインターフェースはこのファイルのまま移設できるはず。
4. 語彙エディタは追加・削除・JSON入出力のみ。seg編集・ピン留め・辞書UIは
   プランS範囲外のため未実装（CLAUDE.md「作らないもの」）。

## 次の一手

- 発注者に `docs/deploy-pages.yml` を `.github/workflows/` へ移してもらい、Pages配備を確認。
- 実機（スマホ390px）で新トレイル（等サイズ・横一直線・横スクロール・右寄り固定）の触感、
  下部シートの常時表示を確認してもらい、TRAIL_R・STEP・RIGHT_PADの値を触感で調整。
- 語頭の縦一列（§7-4）は今回のS-3スコープ外のまま。
