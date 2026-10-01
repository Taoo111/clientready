'use client';

import { ArrowRight, CircleCheck, Headphones, MicOff, RotateCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Notice } from '@/components/common/notice';
import { Button } from '@/components/ui/button';
import { en } from '@/i18n/en';
import { LevelMeter, SPEAKING_THRESHOLD } from '@/lib/audio/level-meter';
import { cn } from '@/lib/utils';
import { CandidateCard } from './candidate-shell';
import { VoiceOrb } from './voice-orb';

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
  const [requesting, setRequesting] = useState(false);
  const [level, setLevel] = useState(0);
  const [detected, setDetected] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const handedOver = useRef(false);

  async function enable() {
    setError(undefined);
    setRequesting(true);
    try {
      setStream(await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS));
    } catch (e) {
      setError(micErrorFor(e));
    } finally {
      setRequesting(false);
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

  const speaking = level > SPEAKING_THRESHOLD;

  return (
    <CandidateCard className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {resume ? t.resumeTitle : t.title}
        </h1>
        <p className="text-pretty text-muted-foreground">{resume ? t.resumeBody : t.body}</p>
      </div>

      <div className="flex flex-col items-center gap-4 py-2">
        <VoiceOrb
          size="md"
          mode={!stream ? 'idle' : speaking ? 'you' : 'listening'}
          level={stream ? level * 1.4 : 0}
        />
        {stream && (
          <>
            <div
              className="flex h-2 w-48 overflow-hidden rounded-full bg-muted"
              role="meter"
              aria-label={t.level}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(level * 100)}
            >
              <span
                className={cn(
                  'h-full rounded-full transition-[width] duration-75',
                  detected ? 'bg-success' : 'bg-brand',
                )}
                style={{ width: `${Math.round(Math.min(1, level * 1.4) * 100)}%` }}
              />
            </div>
            <p
              className={cn(
                'flex items-center gap-2 text-center text-sm',
                detected ? 'font-medium text-success' : 'text-muted-foreground',
              )}
              aria-live="polite"
            >
              {detected && <CircleCheck className="size-4" aria-hidden />}
              {detected ? t.detected : t.speakNow}
            </p>
          </>
        )}
      </div>

      {error && (
        <Notice tone="danger" icon={MicOff} title={t.errors[error].title}>
          {t.errors[error].body}
        </Notice>
      )}
      {stream && !detected && showHint && (
        <Notice tone="warning" icon={MicOff}>
          {t.notDetected}
        </Notice>
      )}

      {!stream ? (
        <Button size="lg" className="w-full" disabled={requesting} onClick={() => void enable()}>
          {error ? <RotateCw aria-hidden /> : null}
          {error ? en.retry : t.allow}
        </Button>
      ) : (
        <div className="space-y-3">
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Headphones className="size-4" aria-hidden />
            {t.headphones}
          </p>
          <Button
            size="lg"
            className="w-full"
            disabled={!detected}
            onClick={() => {
              handedOver.current = true;
              onReady(stream);
            }}
          >
            {resume ? t.resume : t.start}
            <ArrowRight aria-hidden />
          </Button>
          {!resume && <p className="text-center text-xs text-muted-foreground">{t.startHint}</p>}
        </div>
      )}
    </CandidateCard>
  );
}
