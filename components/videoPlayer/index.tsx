// components/videoPlayer/VideoJS.tsx
import { useLogMutation } from 'libs/redux/services/karnama'
import { RootState } from 'libs/redux/store'
import React, { useEffect, useRef, useCallback } from 'react'
import { useSelector } from 'react-redux'

import '@vidstack/react/player/styles/default/theme.css'
import '@vidstack/react/player/styles/default/layouts/video.css'

import {
  MediaPlayer,
  MediaProvider,
  useMediaState,
  Track,
  MediaLoadedMetadataEvent,
  isHLSProvider,
  MediaProviderAdapter,
  MediaProviderChangeEvent,
  MediaPlayerInstance,
} from '@vidstack/react'

import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default'
import { CircularProgress } from '@mui/material'

type Props = {
  id?: number
  src?: string
  timeOfVideo?: number
  onTimeChange?: (t: number) => void
  setShowNewUGQ?: (paused: boolean) => void
  changeCurrentTime?: number
  setChangeCurrentTime?: (v: number) => void
  hasSubtitle?: boolean
}

export default function VideoJS(props: Props) {
  const {
    id,
    src,
    timeOfVideo,
    onTimeChange,
    setShowNewUGQ,
    changeCurrentTime,
    setChangeCurrentTime,
    hasSubtitle,
  } = props

  const { accessToken } = useSelector((state: RootState) => state.auth)
  const player = useRef<MediaPlayerInstance | null>(null)

  const paused = useMediaState('paused', player)
  const ended = useMediaState('ended', player)

  const [sendLog] = useLogMutation()

  // ---------- protections ----------
  const logQueue = useRef<string[]>([])
  const intervalRef = useRef<number | null>(null)
  const lastTimelineRef = useRef<number>(0)
  const timelineAccRef = useRef<number>(0)
  const lastSentTimeRef = useRef<number | null>(null)
  const lastPausedStateRef = useRef<boolean | undefined>(undefined)
  const mountedRef = useRef(false)
  const currentLessonRef = useRef<number | null>(null) // ← نگهداری lesson فعلی

  // ---------- helper: enqueue log ----------
  const enqueueLog = useCallback((action: string) => {
    logQueue.current.push(action)
  }, [])

  // ---------- flush logs ----------
  const flushLogs = useCallback(() => {
    if (!accessToken || !player.current) return
    if (logQueue.current.length === 0) return

    const action = logQueue.current.shift()
    if (!action) return

    const nowTime = Math.floor(player.current.currentTime)
    if (lastSentTimeRef.current === nowTime && action === 'Playing') return

    lastSentTimeRef.current = nowTime

    void sendLog({
      playLogDto: {
        action,
        time: nowTime,
        lessonId: id,
        speed: player.current.playbackRate,
      },
    })
  }, [accessToken, id, sendLog])

  useEffect(() => {
    if (intervalRef.current != null) return
    intervalRef.current = window.setInterval(() => {
      flushLogs()
    }, 300) as unknown as number

    return () => {
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [flushLogs])

  // ---------- Play/Pause ----------
  useEffect(() => {
    if (paused === lastPausedStateRef.current) return
    lastPausedStateRef.current = paused
    enqueueLog(paused ? 'Pause' : 'Play')
    if (setShowNewUGQ) setShowNewUGQ(Boolean(paused))
  }, [paused, enqueueLog, setShowNewUGQ])

  // ---------- End ----------
  useEffect(() => {
    if (ended) enqueueLog('End')
  }, [ended, enqueueLog])

  // ---------- Mount protection ----------
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // ---------- tick ----------
  const tick = useCallback(() => {
    const pl = player.current
    if (!pl) return

    if (paused) {
      lastTimelineRef.current = pl.currentTime ?? 0
      return
    }

    const now = pl.currentTime ?? 0
    const last = lastTimelineRef.current ?? 0
    let delta = now - last

    // initialize
    if (last === 0 && now > 0) {
      lastTimelineRef.current = now
      return
    }

    // ignore negative delta یا delta خیلی بزرگ در همان lesson
    if (delta <= 0 || delta > 5) {
      lastTimelineRef.current = now
      return
    }

    // accumulate
    timelineAccRef.current += delta

    while (timelineAccRef.current >= 60) {
      enqueueLog('Playing')
      timelineAccRef.current -= 60
    }

    lastTimelineRef.current = now
    onTimeChange && onTimeChange(now)
  }, [paused, enqueueLog, onTimeChange])

  const tickIntervalRef = useRef<number | null>(null)
  useEffect(() => {
    if (tickIntervalRef.current != null) return
    tickIntervalRef.current = window.setInterval(() => {
      tick()
    }, 1000) as unknown as number

    return () => {
      if (tickIntervalRef.current != null) {
        clearInterval(tickIntervalRef.current)
        tickIntervalRef.current = null
      }
    }
  }, [tick])

  // ---------- lesson change ----------
  useEffect(() => {
    if (!id) return
    if (id !== currentLessonRef.current) {
      // lesson جدید: ریست accumulator
      currentLessonRef.current = id
      timelineAccRef.current = 0
      lastTimelineRef.current = player.current?.currentTime ?? 0
    }
  }, [id])

  // ---------- external seek ----------
  useEffect(() => {
    if (typeof changeCurrentTime === 'number' && changeCurrentTime >= 0 && player.current) {
      player.current.currentTime = changeCurrentTime
      setChangeCurrentTime && setChangeCurrentTime(-1)
      lastTimelineRef.current = player.current.currentTime ?? 0
      // در seek داخلی accumulator حفظ می‌شود
    }
  }, [changeCurrentTime, setChangeCurrentTime])

  // ---------- loadedmetadata ----------
  function onLoadedMetadata(e: MediaLoadedMetadataEvent) {
    if (!player.current) return
    if (typeof timeOfVideo === 'number' && !Number.isNaN(timeOfVideo) && timeOfVideo > 0 && timeOfVideo < (player.current.duration ?? Infinity) - 1) {
      player.current.currentTime = timeOfVideo
    }
    lastTimelineRef.current = player.current.currentTime ?? 0
    // accumulator فقط وقتی lesson جدید load می‌شود ریست می‌شود
  }

  // ---------- HLS provider ----------
  const HLS_URL = 'https://proback.namatek.com/js/hls.min.js'
  function onProviderChange(provider: MediaProviderAdapter | null, _evt: MediaProviderChangeEvent) {
    if (isHLSProvider(provider)) provider.library = HLS_URL
  }

  // ---------- render ----------
  if (!id || !src) return <CircularProgress />

  return (
    <div style={{ direction: 'ltr' }}>
      <MediaPlayer
        autoPlay
        src={src}
        ref={player}
        storage="videoOptions"
        onLoadedMetadata={onLoadedMetadata}
        onProviderChange={onProviderChange}
        viewType="video"
        streamType="on-demand"
        logLevel="warn"
        crossOrigin
        playsInline
      >
        <MediaProvider>
          {hasSubtitle && (
            <Track
              src={src!.replace('.m3u8', '.vtt').replace('.mp4', '.vtt')}
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
