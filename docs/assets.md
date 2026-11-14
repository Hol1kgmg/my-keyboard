# アセットとモデル契約

## キーボード

提供元はリポジトリ所有者です。受領した `keyboard.glb` と `build_keyboard.py` は直下に保持しています。外部向けの再配布ライセンスは所有者に確認中です。リポジトリのMITライセンスを、提供データにも自動で適用したものとは扱いません。

`npm run assets` は追加のPython環境なしで、元GLBから `public/models/keyboard.glb` と `src/data/keys.json` を生成します。配信するのは `public/` 以下のモデルです。元の生成スクリプトを実行するときはNumPy・trimesh・Pillowと、スクリプトに指定されたフォントが別途必要です。

変換は `scripts/prepare-keyboard.mjs`、レイアウト定義は `scripts/keyboard-layout.mjs` にあります。現在の51キーの配置に一致するモデルを対象とし、頂点が複数キーに属する・レイアウトに収まらない・三角形がキーをまたぐ場合は失敗します。GLBを差し替えた場合は、この契約も確認してください。

- 元モデルの6部品を、静的な5部品と51個のキーキャップに分離します。
- キーIDは `Key_Q`、`Key_Escape`、`Key_Backspace` などです。12個の無刻印キーは行・列に基づく固有ID（例: `Key_Blank_R1C6`）を持ち、物理入力は未割当です。
- キーのローカル座標はメートル単位、Y-upです。原点はキー底面の中心、押下方向はローカルの−Y、押下距離は1.2mmです。
- 配信GLBには元モデルの形状・法線・UV・PBR材質・元の刻印アトラスを保持します。アプリでは同じUVに対応するアトラスをCanvasTextureで描画し直し、配列定義の刻印を表示します。キー間でこのテクスチャを共有します。元GLB単体には新しい刻印は書き込みません。
- 静的部品の座標変換は元GLBのまま保持しています。配信GLBは56ノードです。
- メタデータはID・表示名・刻印・行・幅・中心・押下距離・キー色・対応するブラウザの `KeyboardEvent.code` を含みます。刻印はBackspaceが「⌫」、Enterが「↩︎」、日本語キーが「英数」「ひら」です。ビューアでは「ひら」を含む全キーの背景色・文字色を統一しています。元GLB自体は変更していません。

英字・記号キーの刻印は左上、Tab・Esc・Shift・Space・英数・ひら・Backspace・Enterの刻印は上下左右の中央に表示します。

英数は `Lang2`、ひらは `Lang1` に対応させています。[W3CのKeyboardEvent.code仕様](https://www.w3.org/TR/uievents-code/#key-alphanumeric-functional) のMac日本語配列の対応に従い、ブラウザがこれらのコードを通知したときに押下表示を行います。IMEの状態変更は行わず、実機のファームウェア設定を表すものではありません。

モデル契約テストでは、キーとIDの対応、三角形総数、寸法、アクセサ参照、元GLBと一致する材質・刻印画像のハッシュを確認します。

## 環境照明

- ファイル: `public/environment/studio_small_03_1k.hdr`
- 作品: [Studio Small 03](https://polyhaven.com/a/studio_small_03)
- 作者: Greg Zaal
- 提供: Poly Haven
- ライセンス: [CC0](https://polyhaven.com/license)
- 取得元: https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_03_1k.hdr

HDRIはモデルと分けてローカル配信します。DreiのCDN依存プリセットや、実行時の外部フォント配信は使っていません。
