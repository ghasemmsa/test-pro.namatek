// components/videoPlayer/VideoJS.tsx
import { useLogMutation } from 'libs/redux/services/karnama'
import { RootState } from 'libs/redux/store'
import React, { useEffect, useRef, useState, useCallback } from 'react'
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
  // queue for sending logs (prevents burst/double sends)
  const logQueue = useRef<string[]>([])
  // prevent multiple intervals
  const intervalRef = useRef<number | null>(null)
  // last timeline (player.current.currentTime) seen
  const lastTimelineRef = useRef<number>(0)
  // accumulated timeline progress (seconds of timeline progressed not wall-time)
  const timelineAccRef = useRef<number>(0)
  // last time (player time) we sent a log (to avoid duplicates)
  const lastSentTimeRef = useRef<number | null>(null)
  // last paused state to avoid duplicate Play/Pause logs
  const lastPausedStateRef = useRef<boolean | undefined>(undefined)
  // when component mounted (for debugging if needed)
  const mountedRef = useRef(false)

  // ---------- helper: enqueue log ----------
  const enqueueLog = useCallback((action: string) => {
    logQueue.current.push(action)
  }, [])

  // ---------- flush logs (one by one) ----------
  const flushLogs = useCallback(() => {
    if (!accessToken || !player.current) return
    if (logQueue.current.length === 0) return

    const action = logQueue.current.shift()
    if (!action) return

    // protect: avoid sending duplicate time for same action/time
    const nowTime = Math.floor(player.current.currentTime)
    if (lastSentTimeRef.current === nowTime && action === 'Playing') {
      // skip duplicate Playing at same player time
      return
    }
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

  // flush loop — runs independently, small interval
  useEffect(() => {
    if (intervalRef.current != null) return // already set
    // use window.setInterval to get numeric id
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

  // ---------- Play/Pause handling (debounced via lastPausedStateRef) ----------
  useEffect(() => {
    if (paused === lastPausedStateRef.current) return
    lastPausedStateRef.current = paused
    enqueueLog(paused ? 'Pause' : 'Play')
    if (setShowNewUGQ) setShowNewUGQ(Boolean(paused))
  }, [paused, enqueueLog, setShowNewUGQ])

  // ---------- End handling ----------
  useEffect(() => {
    if (ended) enqueueLog('End')
  }, [ended, enqueueLog])

  // ---------- protect against multiple mounts (debug) ----------
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // ---------- core tick: measure timeline progress (delta = now - lastTimeline) ----------
  // logic:
  //  - read current player.currentTime
  //  - delta = now - lastTimeline
  //  - if delta <=0 => likely seek back; set lastTimeline = now; do not add negative delta
  //  - if delta > 5 (big jump) => likely tab freeze or huge skip; treat as seek or skip; set lastTimeline = now
  //  - otherwise add delta to timelineAccRef
  //  - if timelineAccRef >= 60 => enqueue Playing and subtract 60 (keep remainder)
  const tick = useCallback(() => {
    const pl = player.current
    if (!pl) return
    if (paused) {
      // update lastTimelineRef to currentTime so when resume we delta from correct position
      lastTimelineRef.current = pl.currentTime ?? pl.currentTime ?? 0
      return
    }

    const now = pl.currentTime ?? 0
    const last = lastTimelineRef.current ?? 0
    let delta = now - last

    // first-run: initialize
    if (last === 0 && now > 0) {
      lastTimelineRef.current = now
      return
    }

    // negative delta => user seeked backward: reset baseline
    if (delta <= 0) {
      lastTimelineRef.current = now
      timelineAccRef.current = 0
      return
    }

    // huge delta => likely tab freeze, network lag, or a big seek forward: treat as seek (do not count huge delta)
    // threshold: 5s (tuneable)
    if (delta > 5) {
      lastTimelineRef.current = now
      timelineAccRef.current = 0
      return
    }

    // normal small positive delta -> add to acc
    timelineAccRef.current += delta

    // while >= 60, enqueue playing and subtract 60 (handle multiple minutes in one tick)
    while (timelineAccRef.current >= 60) {
      // protect duplicate same-time playing logs
      // determine what time we'll report: use Math.floor(now) at the moment of enqueue
      // but rely on flush logic to dedupe exact time duplicates
      enqueueLog('Playing')
      timelineAccRef.current -= 60
    }

    lastTimelineRef.current = now

    // callback for parent
    onTimeChange && onTimeChange(now)
  }, [paused, enqueueLog, onTimeChange])

  // make sure only one interval for tick is created
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

  // ---------- respond to external seek/setCurrentTime requests ----------
  useEffect(() => {
    if (typeof changeCurrentTime === 'number' && changeCurrentTime >= 0 && player.current) {
      player.current.currentTime = changeCurrentTime
      // reset changeCurrentTime signal
      setChangeCurrentTime && setChangeCurrentTime(-1)
      // reset baselines so next tick computes deltas correctly
      lastTimelineRef.current = player.current.currentTime ?? 0
      timelineAccRef.current = 0
    }
  }, [changeCurrentTime, setChangeCurrentTime])

  // ---------- loadedmetadata: initialize baseline ----------
  function onLoadedMetadata(e: MediaLoadedMetadataEvent) {
    if (!player.current) return
    if (typeof timeOfVideo === 'number' && !Number.isNaN(timeOfVideo) && timeOfVideo > 0 && timeOfVideo < (player.current.duration ?? Infinity) - 1) {
      player.current.currentTime = timeOfVideo
    }
    lastTimelineRef.current = player.current.currentTime ?? 0
  }

  // ---------- HLS provider ----------
  const HLS_URL = 'https://proback.namatek.com/js/hls.min.js' // or CDN fallback
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
