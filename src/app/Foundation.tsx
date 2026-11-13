import { useRef, useState } from 'react';
import type { FormEvent } from 'react';

export function Foundation() {
  const [sample, setSample] = useState('');
  const [preview, setPreview] = useState('Your sample will appear here.');
  const [invalid, setInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const knownRoute = ['/', '/foundation', '/foundation/'].includes(window.location.pathname);

  function previewSample(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sample.trim()) {
      setInvalid(true);
      input.current?.focus();
      return;
    }
    setInvalid(false);
    setPreview(sample.trim());
  }

  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className="site-header page-width">
        <p className="brand"><span className="brand-mark" aria-hidden="true">u<span>·</span></span>Unpause <span className="brand-detail">Languages</span></p>
        <span className="build-label">Foundation preview</span>
      </header>
      <main id="main" className="page-width" tabIndex={-1}>
        {knownRoute ? (
          <>
            <section className="intro" aria-labelledby="foundation-title">
              <p className="eyebrow">A thoughtful place to begin</p>
              <h1 id="foundation-title">Engineering foundations</h1>
              <p className="tagline">Learn at your pace.<br />Return whenever you’re ready.</p>
              <p className="availability">No courses are available in this foundation build.</p>
            </section>
            <div className="foundation-grid">
              <section className="sample-card" aria-labelledby="sample-title">
                <p className="eyebrow">01 / Controls &amp; feedback</p>
                <h2 id="sample-title">A little room to try things.</h2>
                <p className="section-copy">Try the controls with a keyboard or touch. This sample stays on the page and isn’t saved.</p>
                <form onSubmit={previewSample} noValidate>
                  <label htmlFor="sample">Sample text</label>
                  <p id="sample-hint" className="field-hint">Write a short phrase of your own.</p>
                  <input
                    id="sample"
                    ref={input}
                    type="text"
                    value={sample}
                    maxLength={200}
                    autoComplete="off"
                    aria-invalid={invalid}
                    aria-describedby={invalid ? 'sample-hint sample-error' : 'sample-hint'}
                    onChange={(event) => { setSample(event.target.value); setInvalid(false); }}
                  />
                  {invalid && <p id="sample-error" className="error" role="alert">Enter sample text to preview.</p>}
                  <button type="submit">Preview sample <span aria-hidden="true">↗</span></button>
                </form>
                <div className="sample-output"><span className="eyebrow">Your preview</span><p role="status" aria-live="polite">{preview}</p></div>
              </section>
              <aside className="design-note" aria-labelledby="design-title">
                <div className="paper-illustration" aria-hidden="true"><span className="paper-line" /><span className="paper-line" /><span className="paper-line short" /><span className="paper-dot" /></div>
                <p className="eyebrow">02 / Visual foundations</p>
                <h2 id="design-title">Clear. Calm.<br />Considered.</h2>
                <p>Readable type, warm surfaces, generous space, and visible focus. A small foundation for the learning experience to come.</p>
                <div className="swatches" role="img" aria-label="Warm paper, forest green, and ochre color palette"><span /><span /><span /></div>
                <p className="note-caption">Original design elements. No learning data collected.</p>
              </aside>
            </div>
          </>
        ) : (
          <section className="intro">
            <p className="eyebrow">Let’s find your way back</p>
            <h1>Page not found</h1>
            <p>This address isn’t part of the foundation preview.</p>
            <a className="return-link" href="/">Return to foundations</a>
          </section>
        )}
      </main>
      <footer className="site-footer page-width"><span>Unpause Languages</span><span>Built with room to return.</span></footer>
    </>
  );
}
