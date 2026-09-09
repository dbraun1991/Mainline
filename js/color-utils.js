// A small, readable-on-light-and-dark palette cycled through when a new
// storyline is created without an explicit color choice.
const PALETTE = [
  '#3b82f6', // blue
  '#ec4899', // pink
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export function nextColor(existingStorylines) {
  return PALETTE[existingStorylines.length % PALETTE.length];
}
