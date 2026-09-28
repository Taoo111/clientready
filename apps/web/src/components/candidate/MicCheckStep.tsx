'use client';

import { useEffect, useRef, useState } from 'react';
import { en } from '@/i18n/en';
import { LevelMeter, SPEAKING_THRESHOLD } from '@/lib/audio/level-meter';
import { LevelBar } from './LevelBar';

type MicError = keyof typeof en.mic.errors;

/** Clear, echo-cancelled speech is what the realtime model and the recording need. */
export const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
};

function micErrorFor(error: unknown): MicError {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'notFound';
  if (name === 'NotReadableError' || name === 'AbortError') return 'busy';
  return 'generic';
}

/** Frames (~60/s) above the threshold before we accept that the candidate is audible. */
const DETECTION_FRAMES = 10;
const HINT_AFTER_MS = 6_000;

export function MicCheckStep({
  resume,
  onReady,
}: {
  resume: boolean;
  onReady: (mic: MediaStream) => void;
}) {
  const t = en.mic;
  const [stream, setStream] = useState<MediaStream>();
  const [error, setError] = useState<MicError>();
  const [level, setLevel] = useState(0);
  const [detected, setDetected] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const handedOver = useRef(false);

  async function enable() {
    setError(undefined);
    try {
      setStream(await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS));
    } catch (e) {
      setError(micErrorFor(e));
    }
  }

  useEffect(() => {
    if (!stream) return;
    const context = new AudioContext();
    const meter = new LevelMeter(context, stream);
    let frames = 0;
    let raf = 0;
    const loop = () => {
      const value = meter.level();
      setLevel(value);
      if (value > SPEAKING_THRESHOLD && ++frames >= DETECTION_FRAMES) setDetected(true);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const hint = setTimeout(() => setShowHint(true), HINT_AFTER_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(hint);
      meter.dispose();
      void context.close();
    };
  }, [stream]);

  // Release the microphone if the candidate leaves this step without starting.
  useEffect(
    () => () => {
      if (stream && !handedOver.current) for (const track of stream.getTracks()) track.stop();
    },
    [stream],
  );

  return (
    <section className="card">
      <h1>{resume ? t.resumeTitle : t.title}</h1>
      <p>{resume ? t.resumeBody : t.body}</p>

      {!stream && (
        <button type="button" onClick={() => void enable()}>
          {t.allow}
        </button>
      )}

      {error && (
        <p className="error" role="alert">
          {t.errors[error]}
        </p>
      )}

      {stream && (
        <>
          <p>{detected ? t.detected : t.speakNow}</p>
          <LevelBar level={level} label={t.level} active={detected} />
          {!detected && showHint && <p className="muted">{t.notDetected}</p>}
          <p className="muted">{t.headphones}</p>
          <button
            type="button"
            disabled={!detected}
            onClick={() => {
              handedOver.current = true;
              onReady(stream);
            }}
          >
            {resume ? t.resume : t.start}
          </button>
        </>
      )}
    </section>
  );
}
