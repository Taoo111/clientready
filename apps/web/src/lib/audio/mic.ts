/** Clear, echo-cancelled speech is what the realtime model and the recording need. */
export const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
};

/** True while the microphone still delivers sound to the call. */
export function micIsLive(mic: MediaStream): boolean {
  const track = mic.getAudioTracks()[0];
  return track !== undefined && track.readyState === 'live' && !track.muted;
}

/**
 * The microphone to use from now on: the current one while it works, otherwise a new one
 * (another app, e.g. a phone call, ended or muted it). Must run from a user gesture on
 * mobile; throws like getUserMedia when the microphone cannot be opened.
 */
export async function liveMic(current: MediaStream): Promise<MediaStream> {
  if (micIsLive(current)) return current;
  const next = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
  for (const track of current.getTracks()) track.stop();
  return next;
}
