# HANDOFF — プランS: Vite+Reactトライビュー

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
2. **ビルド未検証** — このセッションのBash権限では `npm install` / `npm run build` /
   `node core/selftest.js ./data` が承認待ちで実行できませんでした
   （`git status` や `node --version` など読み取り専用コマンドのみ許可）。
   コードは目視で作り込みましたが、実機・ブラウザでの動作確認ができていません。
   お手数ですが手元で次を実行して確認してください：
   ```
   node core/selftest.js ./data   # 変更なし。ALL GREENのはず
   npm install
   npm run dev                    # http://localhost:5173 で確認
   npm run build                  # release/ に単一HTMLが出る
   ```
3. **core/layout.jsへの追加要望** — `src/views/layout.js` の`computeTargets`は
   数学的には純関数でReact/DOMに依存しないため、spec §4.1の設計どおりなら
   本来core/の管轄。現状core/にlayoutモジュールが無いためsrc/views/側に書いた。
   将来coreに正式採用するならインターフェースはこのファイルのまま移設できるはず。
4. 語彙エディタは追加・削除・JSON入出力のみ。seg編集・ピン留め・辞書UIは
   プランS範囲外のため未実装（CLAUDE.md「作らないもの」）。

## 次の一手

- 発注者に `docs/deploy-pages.yml` を `.github/workflows/` へ移してもらい、Pages配備を確認。
- 実機（スマホ390px）でバネの触感・盤の回転方向・トレイルの見え方を確認してもらい、
  §8未決事項（回転符号・バネ定数・魚眼比）を触感で調整。
- ALL GREENの再確認（このセッションでは未実施）。
