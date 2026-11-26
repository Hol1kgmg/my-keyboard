import { KeyboardViewer } from "./components/KeyboardViewer";
import { useKeyInteraction } from "./hooks/useKeyInteraction";

const PARTS = [
  { role: "キット", name: "GOFORTY V2", url: "https://keeb-on.com/products/goforty-v2" },
  {
    role: "キーキャップ",
    name: "THT 98key White",
    url: "https://shop.talpkeyboard.com/products/tht-98key-white",
  },
  {
    role: "スイッチ",
    name: "Kailh Glacial Silver Switch",
    url: "https://shop.yushakobo.jp/products/10670",
    note: "バネを45gに入れ替え",
  },
  {
    role: "ワッシャー",
    name: "Rushbox Washer",
    url: "https://shop.moimate.com/products/rushbox-washer",
  },
];

export function App() {
  const interaction = useKeyInteraction();
  return (
    <div className="app-shell">
      <header className="site-header">
        <span className="wordmark">
          <svg width="31" height="24" viewBox="0 0 31 24" fill="none" aria-hidden="true">
            <rect x="1" y="3" width="29" height="18" rx="4" />
            <path d="M6 8h3m4 0h3m4 0h4M6 12h3m4 0h3m4 0h4M6 16h3m4 0h3m4 0h11" />
          </svg>
          my keyboard<span className="brand-period">.</span>
        </span>
        <span className="header-note">いつも手元にある、小さな道具。</span>
      </header>
      <main>
        <section className="viewer-section" aria-labelledby="viewer-heading">
          <div className="intro">
            <div>
              <h1 id="viewer-heading">いつものキーボード。</h1>
              <p>回して、近づいて、キーを押す。</p>
            </div>
            <div className="model-caption">
              <span className="material-swatch" />
              <span>
                白いキーキャップ<span className="caption-sub">真鍮のサイドレール</span>
              </span>
            </div>
          </div>
          <KeyboardViewer interaction={interaction} />
          <div className="controls-area">
            <p className="operation-hint" id="viewer-instructions">
              <span>ドラッグで回転</span>
              <span>スクロールでズーム</span>
              <span>キーをクリックして押下</span>
            </p>
          </div>
        </section>
        <section className="object-info" aria-label="キーボードの情報">
          <div className="object-title">
            <span className="object-mark" aria-hidden="true">
              ⌘
            </span>
            <div>
              <h2>小さく、まっすぐに。</h2>
              <p>ロープロファイルのオーソリニア配列</p>
            </div>
          </div>
          <dl className="object-specs">
            <div>
              <dt>キー数</dt>
              <dd>
                51<span>keys</span>
              </dd>
            </div>
            <div>
              <dt>配列</dt>
              <dd>13 × 4</dd>
            </div>
            <div>
              <dt>幅</dt>
              <dd>
                270.25<span>mm</span>
              </dd>
            </div>
          </dl>
        </section>

        <section className="design-story" aria-labelledby="story-heading">
          <div className="story-heading">
            <span className="section-kicker">THE REASONS BEHIND MY KEYBOARD</span>
            <h2 id="story-heading">このキーボードを選んだ理由。</h2>
            <p>毎日触れる道具だから、配列も、押し心地も、自分の「ちょうどいい」に。</p>
          </div>

          <article className="story-chapter" aria-labelledby="layout-story-heading">
            <div className="chapter-index">01 / LAYOUT</div>
            <div className="chapter-content">
              <div className="chapter-title-row">
                <div>
                  <h3 id="layout-story-heading">配列へのこだわり</h3>
                  <p className="chapter-lead">
                    キーを探す時間をなくして、「入力する」ことに集中したい。
                  </p>
                </div>
                <span className="chapter-number" aria-hidden="true">
                  01
                </span>
              </div>
              <div className="story-grid">
                <div className="story-point">
                  <span className="point-label">SIZE</span>
                  <h4>40%サイズを選ぶ</h4>
                  <p>
                    入力以外の動作は、できるだけ減らしたい。キーを見失って探す、視線を落とす、入力が止まる。その小さな中断を減らすため、すべてのキーがホームポジションの隣にある40%サイズにしました。
                  </p>
                </div>
                <div className="story-point">
                  <span className="point-label">LAYOUT</span>
                  <h4>格子状（オーソリニア）配列</h4>
                  <p>
                    キーが縦横まっすぐ並ぶ、シンプルな配列。慣れるまでは打ち間違えることもありますが、キーの形と間隔が揃うので、キーキャップやキーマップを自由に組み替えられます。
                  </p>
                </div>
              </div>
              <div className="story-note">
                <span className="note-mark" aria-hidden="true">
                  ↳
                </span>
                <p>
                  指の長さに合わせた縦ずれ配列も魅力的。それでも、配列を自分好みにカスタマイズできる自由度を優先しました。
                </p>
              </div>
              <div className="chapter-footer">
                <div className="story-tags" aria-label="配列の特徴">
                  <span>40%</span>
                  <span>51 keys</span>
                  <span>Ortholinear</span>
                </div>
                <a
                  className="slide-link"
                  href="https://talks.hol1kgmg.com/2026/keyboard-tech-stack-review/"
                  target="_blank"
                  rel="noreferrer"
                >
                  配列を選んだときの話をスライドで読む <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </article>

          <article
            className="story-chapter hardware-chapter"
            aria-labelledby="hardware-story-heading"
          >
            <div className="chapter-index">02 / HARDWARE</div>
            <div className="chapter-content">
              <div className="chapter-title-row">
                <div>
                  <h3 id="hardware-story-heading">ハードウェアへのこだわり</h3>
                  <p className="chapter-lead">
                    目指すのは、Magic Keyboardのような「浅くて軽い」打鍵感。
                  </p>
                </div>
                <span className="chapter-number" aria-hidden="true">
                  02
                </span>
              </div>
              <div className="hardware-summary">
                <div className="hardware-spec">
                  <span className="point-label">SWITCH</span>
                  <strong>リニア</strong>
                  <span>引っかかりなく、まっすぐ沈む</span>
                </div>
                <div className="hardware-spec">
                  <span className="point-label">ACTUATION</span>
                  <strong>
                    0.8<span>mm</span>
                  </strong>
                  <span>浅く押すだけで反応</span>
                </div>
                <div className="hardware-spec">
                  <span className="point-label">TRAVEL</span>
                  <strong>
                    2.0<span>mm</span>
                  </strong>
                  <span>底までのストロークも浅く</span>
                </div>
              </div>
              <div className="story-grid hardware-points">
                <div className="story-point">
                  <span className="point-label">01 / SWITCH TUNING</span>
                  <h4>ワッシャーで浅く、バネは45gに</h4>
                  <p>
                    Kailh Glacial Silver
                    Switchをベースに、ワッシャーでストロークを浅くして、底打ちに固さと跳ね返りをプラス。さらに、軽すぎて連続入力を誤検知しやすかったため、バネを45gに交換してキーの戻りを速くしました。
                  </p>
                </div>
                <div className="story-point">
                  <span className="point-label">02 / KEYCAP</span>
                  <h4>指に沿う、薄いキーキャップ</h4>
                  <p>
                    指の腹にフィットする湾曲した天面と、ロープロファイルらしい薄さが決め手。さらに親指のホームポジションが触って分かるよう、無刻印のキーキャップにUVレジンで小さな突起を付けています。
                  </p>
                </div>
              </div>
              <div className="chapter-footer">
                <div className="story-tags" aria-label="ハードウェアの特徴">
                  <span>Kailh Choc V2</span>
                  <span>45g spring</span>
                  <span>UV resin</span>
                </div>
                <a
                  className="slide-link"
                  href="https://talks.hol1kgmg.com/2026/keyboard-customize/"
                  target="_blank"
                  rel="noreferrer"
                >
                  パーツ選びとカスタマイズをスライドで読む <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </article>
        </section>

        <section className="parts" aria-labelledby="parts-heading">
          <h2 id="parts-heading">構成パーツ</h2>
          <dl>
            {PARTS.map((part) => (
              <div key={part.role}>
                <dt>{part.role}</dt>
                <dd>
                  <a href={part.url} target="_blank" rel="noreferrer">
                    {part.name}
                  </a>
                  {part.note && <span>{part.note}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
      <footer>
        <span>my keyboard</span>
        <span>お気に入りの道具を、ブラウザで。</span>
        <a href="https://polyhaven.com/a/studio_small_03" target="_blank" rel="noreferrer">
          照明素材：Poly Haven
        </a>
      </footer>
    </div>
  );
}
