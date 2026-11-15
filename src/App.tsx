import { KeyboardViewer } from "./components/KeyboardViewer";
import { useKeyInteraction } from "./hooks/useKeyInteraction";

export function App() {
  const interaction = useKeyInteraction();
  return (
    <div className="app-shell">
      <header className="site-header">
        <span className="wordmark">
          <svg width="31" height="24" viewBox="0 0 31 24" fill="none" aria-hidden="true">
            <rect x="1" y="3" width="29" height="18" rx="4" />
            <path d="M6 8h3m4 0h3m4 0h4M6 12h3m4 0h3m4 0h4M6 16h3m4 0h11" />
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
