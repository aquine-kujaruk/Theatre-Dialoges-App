import { useRef, useState, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import WebAudioPlayer from 'wavesurfer.js/dist/webaudio.js';

interface UseWaveSurferOptions {
  audioUrl: string;
  onTimeUpdate: (time: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onFinish: () => void;
}

export function useWaveSurfer({
  audioUrl,
  onTimeUpdate,
  onPlay,
  onPause,
  onFinish,
}: UseWaveSurferOptions) {
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Keep refs for callbacks so we don't have to re-bind events on every render
  const callbacks = useRef({ onTimeUpdate, onPlay, onPause, onFinish });
  callbacks.current = { onTimeUpdate, onPlay, onPause, onFinish };

  useEffect(() => {
    const div = document.createElement('div');
    div.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;';
    document.body.appendChild(div);
    containerRef.current = div;

    const ws = WaveSurfer.create({
      container: div,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      media: new WebAudioPlayer() as any,
      height: 0,
      waveColor: 'transparent',
      progressColor: 'transparent',
      cursorColor: 'transparent',
      interact: false,
    });

    wavesurferRef.current = ws;

    ws.on('ready', (dur: number) => {
      setDuration(dur);
      setIsLoading(false);
    });

    ws.on('play', () => callbacks.current.onPlay());
    ws.on('pause', () => callbacks.current.onPause());
    ws.on('finish', () => callbacks.current.onFinish());
    ws.on('timeupdate', (time: number) => callbacks.current.onTimeUpdate(time));

    ws.load(audioUrl);

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
      if (div.parentNode) {
        div.parentNode.removeChild(div);
      }
      containerRef.current = null;
    };
  }, [audioUrl]);

  return { wavesurferRef, duration, isLoading };
}
