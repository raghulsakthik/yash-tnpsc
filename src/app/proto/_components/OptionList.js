'use client';

import { useState } from 'react';

/**
 * Renders an MCQ option list with local-only selection state.
 * When `correctLetter` is provided, submitting reveals correct/incorrect styling
 * (warm ochre for "not quite" — never red) without calling any backend.
 */
export default function OptionList({ options, correctLetter, onSubmitted }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  function pick(letter) {
    if (submitted) return;
    setSelected(letter);
  }

  function submit() {
    if (!selected) return;
    setSubmitted(true);
    onSubmitted?.(selected === correctLetter);
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {options.map((opt) => {
          let cls = 'option';
          if (submitted && correctLetter) {
            if (opt.letter === correctLetter) cls += ' option-correct';
            else if (opt.letter === selected) cls += ' option-incorrect';
          } else if (selected === opt.letter) {
            cls += ' option-selected';
          }
          return (
            <button key={opt.letter} type="button" className={cls} onClick={() => pick(opt.letter)}>
              <span className="option-letter">{opt.letter}</span>
              <span>{opt.text}</span>
              {opt.note && <span className="muted" style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>{opt.note}</span>}
            </button>
          );
        })}
      </div>
      {!submitted && (
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={!selected}>
            Submit answer
          </button>
          <button type="button" className="btn btn-ghost">✦ I&apos;m struggling</button>
        </div>
      )}
    </div>
  );
}
