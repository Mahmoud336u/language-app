import { useRef, useState } from 'react';
import type { FormEvent } from 'react';

export function SamplePreview() {
  const [sample, setSample] = useState('');
  const [preview, setPreview] = useState('Your sample will appear here.');
  const [invalid, setInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null);

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
  );
}
