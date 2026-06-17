/**
 * Regression test: the scribble detector must separate the labeled corpus of real
 * strokes captured on-device (scribbles vs handwriting). Locks the
 * direction-consistency rule against future tuning.
 */

import { classifyScribble } from '../src/logic/detect';
import corpus from './fixtures/scribble-corpus.json';

type Stroke = { seq: number; label: 'scribble' | 'word'; points: { x: number; y: number }[] };

describe('classifyScribble against the labeled corpus', () => {
  const strokes = corpus as Stroke[];

  it('has corpus data of both classes', () => {
    expect(strokes.filter(s => s.label === 'scribble').length).toBeGreaterThan(0);
    expect(strokes.filter(s => s.label === 'word').length).toBeGreaterThan(0);
  });

  it('classifies every stroke correctly (0 FP, 0 FN)', () => {
    const wrong = strokes
      .map(s => ({ seq: s.seq, label: s.label, got: classifyScribble(s.points).isScribble }))
      .filter(r => r.got !== (r.label === 'scribble'));
    expect(wrong).toEqual([]);
  });
});
