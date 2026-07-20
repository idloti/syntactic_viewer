# 決定記録
形式：日付 / 何を / どう決めたか / 理由 / 暫定or確定

2026-07-20 / トライの座標計算(computeTargets)の置き場所 / core/layout.jsが無いので src/views/layout.js に純関数として実装 / core/を無断で書き換えない取り決め（CLAUDE.md）。spec §4.1では本来core領域 / 暫定（core/への追加要望としてPRで報告）

2026-07-20 / ノードの同一性 / M1プロトタイプの文字列連結ではなく、core/trie.jsのpathKey（原子配列をU+241Fで結合）をSVGノードのReact keyおよびバネ状態Mapのキーに採用 / spec §9-A2の多重字衝突を避けるため（tableトークナイザ語彙で必須） / 確定

2026-07-20 / GitHub Actions → Pages 配備 / ワークフローYAML案を docs/deploy-pages.yml に用意したが、このセッションのGitHub App権限では .github/workflows/ への書き込みができないため、PR説明で発注者に手動追加を依頼する / claude-code-actionの制約 / 暫定（発注者が追加すればM1完了条件を満たす）

2026-07-20 / 単一HTML書き出し先 / vite.config.jsのbuild.outDirを直接release/にし、vite-plugin-singlefileで常に単一HTMLとして出す（distとreleaseを分けない） / 「配布用に別途コピーする」手順を増やさないため / 暫定（触感で問題なければ確定）

2026-07-20 / 語彙エディタでの新規語の詠み方 / セグメント(seg)は素通しで保存するが、フォーム追加時はw・gのみを書く（seg・idは編集しない） / spec §3.1「必須はwのみ」。辞書UIも作らない方針のため形態素分割は編集対象にしない / 暫定

2026-07-20 / エントリid採番 / 既存4桁ゼロ埋め連番(0001…)の最大値+1を採番。旧M1配列インポートも同形式に変換 / data/vocab/en-b2-verbs.jsonの既存採番方式に合わせる / 暫定

2026-07-20 / 詠み切り札の表示 / kimarijiDepthがnullの語は詳細シートで「詠み切り札」バッジ（青バッジの代わりに灰色）を出す。M1プロトタイプにはこの分岐が無かった / spec §9-A1・core/kimariji.jsの仕様どおり実装 / 確定

2026-07-20 / PWA（manifest/service worker） / このPRでは作らない / Issueの「やること」4項目に含まれず、spec §6ではM5相当。CLAUDE.mdの「プランS範囲外の先行実装禁止」に該当すると判断 / 暫定（次PRで着手）

2026-07-20 / `node core/selftest.js` の実行確認 / このセッションのBash権限では `node core/selftest.js ./data` と `npm` コマンドが承認待ちで実行できなかった（`git status`/`node --version`等の読み取り専用コマンドのみ許可）。core/には一切手を加えていないため回帰は無いはずだが、機械的な確認はできていない / claude-code-actionの許可リスト制約 / 暫定（発注者に手元での実行を依頼。将来のPRのため許可リスト拡大を検討）