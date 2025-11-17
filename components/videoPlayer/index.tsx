import { useLogMutation } from 'libs/redux/services/karnama'
import { RootState } from 'libs/redux/store'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useSelector } from 'react-redux'
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { MediaLoadedMetadataEvent, SeekButton, MediaPlayer, MediaPlayerInstance, MediaPlayingEvent, MediaProvider, useMediaState, DefaultLayoutTranslations, Controls, Track, isHLSProvider, type MediaProviderAdapter, type MediaProviderChangeEvent } from '@vidstack/react';

// See "Icons" component page for setup before importing the following:
import { SeekForward10Icon } from '@vidstack/react/icons';


import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';
import { CircularProgress } from '@mui/material';
import { useRouter } from 'next/router';

export const VideoJS = (props: any) => {
  const { push } = useRouter()
  const player = useRef<MediaPlayerInstance>(null);
  const paused = useMediaState('paused', player);
  const ended = useMediaState('ended', player);

  const { accessToken } = useSelector((state: RootState) => state.auth)
  const { next, src, id, timeOfVideo, setShowNewUGQ, onTimeChange, changeCurrentTime, setChangeCurrentTime, hasSubtitle } = props
console.log(props)
  const [secondCounter, setSecondCounter] = useState(0)
  const [lastPausedState, setLastPausedState] = useState<boolean | undefined>(undefined)

  const [sendLog] = useLogMutation()

  useEffect(() => {
    console.log(changeCurrentTime)
    if (changeCurrentTime >= 0) {
      if (player.current)
        player.current.currentTime = changeCurrentTime
      setChangeCurrentTime(-1)
    }
  }, [changeCurrentTime])

  // useEffect(() => { 
  //   const handleOrientationChange = () => {
  //     console.log(screen.orientation.angle)
  //     if (screen.orientation.angle === 90 || screen.orientation.angle === -90) {
  //       // Device is in landscape mode
  //       player.current?.enterFullscreen()
  //     } else {
  //       // Device is in portrait mode
  //       player.current?.exitFullscreen()

  //     }
  //   };

  //   window.addEventListener('orientationchange', handleOrientationChange);

  //   // Cleanup listener on component unmount
  //   return () => {
  //     window.removeEventListener('orientationchange', handleOrientationChange);
  //   };
  // }, []);

  useEffect(() => {
    if (ended)
      localSendLog('End')
    if (ended && next) {
      // push(next)
      console.log('go to next lesson')
    }
  }, [ended])

  useEffect(() => {
    if (setShowNewUGQ) {
      setShowNewUGQ(paused)
    }
  }, [paused, setShowNewUGQ])

  useEffect(() => {
    if (paused === lastPausedState) return;
    
    setLastPausedState(paused);
    
    if (paused !== undefined) {
      localSendLog(paused ? 'Pause' : 'Play');
    }
  }, [paused]);

  const localSendLog = useCallback((action: string) => {
    
    if (accessToken && player.current && id) {
      sendLog({
        playLogDto: {
          action,
          time: +player.current.currentTime.toFixed(0),
          lessonId: id,
          speed: player.current.playbackRate as number,
        },
      })
    }
  }, [accessToken, id, sendLog])

  const checkAndCount = useCallback(() => {
    if (!paused) {
      setSecondCounter((t) => {
        if (t >= 60) {
          localSendLog('Playing')
          return 0
        }
        localStorage.setItem(`currentTimeVideo-${id}`, (player.current?.currentTime as number).toFixed(0))
        return t + (player.current?.playbackRate as number ?? 0)
      })
    }
    onTimeChange && onTimeChange(player.current?.currentTime)
  }, [paused, id, localSendLog, onTimeChange])

  useEffect(() => {
    const interval = setInterval(checkAndCount, 1000)
    return () => clearInterval(interval)
  }, [checkAndCount])

  function onLoadedMetadata(nativeEvent: MediaLoadedMetadataEvent) {
    if (player.current && timeOfVideo && timeOfVideo < player.current.duration-20)
        player.current.currentTime = timeOfVideo
  }





  // useEffect(() => {
  //   const player = playerRef.current

  //   return () => {
  //     if (player && !player.isDisposed()) {
  //       player.dispose()
  //       playerRef.current = null
  //     }
  //   }
  // }, [playerRef])

  const HLS_URL = 'https://proback.namatek.com/js/hls.min.js';

  function onProviderChange(
    provider: MediaProviderAdapter | null,
    _evt: MediaProviderChangeEvent,
  ) {
    if (isHLSProvider(provider)) {
      // ↙ نسخهٔ میزبانی‌شدهٔ خودتان
      provider.library = HLS_URL;          // ➊ استاتیک با یک رشته URL
      // یا برای بارگذاری تنبل:
      // provider.library = () => import(/* webpackIgnore: true */ HLS_URL).then(m => m.default);
    }
  }
  

  if (!id || !src)
    return <CircularProgress />
  return (
    <div style={{ direction: "ltr" }}>
      <MediaPlayer autoPlay onLoadedMetadata={onLoadedMetadata} src={src} ref={player} storage="videoOptions" onProviderChange={onProviderChange}
        //poster='https://newcdn.namatek.com/playerposter.jpg'
        //hlsLibrary='https://proback.namatek.com/js/hls.min.js'
        viewType='video'
        streamType='on-demand'
        logLevel='warn'
        crossOrigin
        playsInline
      >
        <MediaProvider>
          {hasSubtitle && (
            <Track
              src={src.replace('.m3u8','.vtt').replace('.mp4','.vtt')}
              kind="subtitles"
              label="Persian"
              lang="fa"
              default
            />

          )}
        </MediaProvider>
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>
    </div>
  )
}

export default VideoJS
