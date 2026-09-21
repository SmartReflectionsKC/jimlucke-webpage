/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CardMotionProps {
  initial: { opacity: number; y: number } | false;
  whileInView: { opacity: number; y: number };
  viewport: { once: boolean; margin: string };
  transition: {
    duration: number;
    delay: number;
    ease: "linear" | "easeIn" | "easeOut" | "easeInOut";
  };
}

/**
 * Returns motion properties for cards.
 * - Always renders with opacity: 1 immediately so cards are never partially transparent.
 * - Applies a very small vertical rise (y: 6 to y: 0).
 * - Caps stagger delay to 90ms max to prevent delayed reveals.
 * - Pre-triggers entrance 100px before the element enters the viewport.
 * - Completely disables motion when prefersReducedMotion is true.
 */
export function getCardMotionProps(index: number = 0, isReducedMotion: boolean = false): CardMotionProps {
  if (isReducedMotion) {
    return {
      initial: false,
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, margin: "100px 0px" },
      transition: { duration: 0, delay: 0, ease: "linear" },
    };
  }

  return {
    initial: { opacity: 1, y: 6 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "100px 0px" },
    transition: {
      duration: 0.2,
      delay: Math.min(index * 0.03, 0.09),
      ease: "easeOut",
    },
  };
}
