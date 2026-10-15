/** The parts of an `HTMLAudioElement` the duration fix needs (a fake in tests). */
type Media = Pick<
  HTMLMediaElement,
  'duration' | 'currentTime' | 'readyState' | 'addEventListener' | 'removeEventListener'
>;

/** Far past the end of any recording: makes the browser read the file to its real end. */
const SEEK_PAST_END = 1e101;

/**
 * Browser recordings (MediaRecorder WebM) have no duration in their header, so the player
 * reports Infinity and its progress bar is wrong. Seeking far past the end makes the browser
 * find the real duration; then the player goes back to the start. Returns a cleanup.
 */
export function fixUnknownDuration(media: Media): () => void {
  const restore = () => {
    if (media.duration === Infinity) return;
    media.removeEventListener('durationchange', restore);
    media.currentTime = 0;
  };
  const fix = () => {
    if (media.duration !== Infinity) return;
    media.addEventListener('durationchange', restore);
    media.currentTime = SEEK_PAST_END;
  };
  media.addEventListener('loadedmetadata', fix);
  if (media.readyState >= 1) fix();
  return () => {
    media.removeEventListener('loadedmetadata', fix);
    media.removeEventListener('durationchange', restore);
  };
}
