'use client';

import { useEffect, useRef } from 'react';
import { fixUnknownDuration } from '@/lib/audio/recording-duration';

/** Native audio player that also works for recordings saved without a duration. */
export function RecordingPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    return fixUnknownDuration(ref.current);
  }, [src]);
  return <audio ref={ref} controls preload="metadata" className="w-full" src={src} />;
}
