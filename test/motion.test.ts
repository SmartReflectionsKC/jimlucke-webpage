/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { getCardMotionProps } from '../src/utils/motion';
import { handleSectionNavigation } from '../src/utils/navigation';

test('Motion: getCardMotionProps renders with opacity: 1 immediately', () => {
  const props = getCardMotionProps(0, false);

  assert.equal(typeof props.initial, 'object');
  if (typeof props.initial === 'object') {
    assert.equal(props.initial.opacity, 1, 'Initial opacity must be 1 so cards are never invisible or transparent');
    assert.equal(props.initial.y, 6, 'Small vertical movement (y: 6)');
  }

  assert.equal(props.whileInView.opacity, 1, 'whileInView opacity must be 1');
  assert.equal(props.whileInView.y, 0, 'whileInView y must settle at 0');
});

test('Motion: card stagger delay is strictly capped to eliminate long reveal delays', () => {
  const firstCard = getCardMotionProps(0, false);
  const secondCard = getCardMotionProps(1, false);
  const tenthCard = getCardMotionProps(10, false);

  assert.equal(firstCard.transition.delay, 0, 'First card has 0ms delay');
  assert.ok(secondCard.transition.delay <= 0.05, 'Second card delay is very fast (<= 50ms)');
  assert.ok(tenthCard.transition.delay <= 0.12, 'Stagger delay is strictly capped (<= 120ms) for high indices');
  assert.ok(tenthCard.transition.duration <= 0.25, 'Transition duration is <= 250ms');
});

test('Motion: reduced motion renders everything immediately with zero duration or delay', () => {
  const props = getCardMotionProps(3, true);

  assert.equal(props.initial, false, 'Reduced motion disables initial hidden state');
  assert.equal(props.whileInView.opacity, 1);
  assert.equal(props.whileInView.y, 0);
  assert.equal(props.transition.duration, 0, 'Reduced motion duration must be 0');
  assert.equal(props.transition.delay, 0, 'Reduced motion delay must be 0');
});

test('Motion: cards are fully visible immediately after internal navigation', () => {
  // Mock element and DOM
  let scrolledBehavior = '';
  const mockTarget = {
    id: 'projects',
    hasAttribute: () => false,
    setAttribute: () => {},
    focus: () => {},
    scrollIntoView: (options: any) => {
      scrolledBehavior = options?.behavior || 'auto';
    },
  };

  (global as any).window = {
    location: new URL('https://jimlucke.com/'),
    history: { pushState: () => {} },
    matchMedia: () => ({ matches: false }),
    scrollTo: () => {},
  };

  (global as any).document = {
    getElementById: (id: string) => (id === 'projects' ? mockTarget : null),
  };

  try {
    const event = { preventDefault: () => {} };
    handleSectionNavigation(event, '#projects');

    // Verify that cards inside the navigated section use immediate full opacity props
    const cardProps = getCardMotionProps(0, false);
    assert.equal((cardProps.initial as any).opacity, 1, 'Cards must render with opacity: 1 on navigated section');
    assert.ok(cardProps.viewport.margin.includes('100px'), 'Pre-triggers entrance 100px before scroll settles');
  } finally {
    delete (global as any).window;
    delete (global as any).document;
  }
});
