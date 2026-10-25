"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  Play, 
  Pause, 
  Volume1,
  Volume2, 
  VolumeX, 
  Maximize, 
  Calendar, 
  CheckCircle2, 
  Activity, 
  ArrowRight,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { RecoveryStory } from "@/data/stories";

interface StoryVideoModalProps {
  story: RecoveryStory | null;
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY_VOLUME = "gpc_recovery_video_volume";
const STORAGE_KEY_MUTED = "gpc_recovery_video_muted";

// Retrieve saved volume and mute preference from localStorage
function getStoredVolumePreferences(): { volume: number; isMuted: boolean } {
  if (typeof window === "undefined") {
    return { volume: 0.8, isMuted: false };
  }
  try {
    const savedVol = localStorage.getItem(STORAGE_KEY_VOLUME);
    const savedMuted = localStorage.getItem(STORAGE_KEY_MUTED);

    const volume = savedVol !== null ? Math.max(0, Math.min(1, parseFloat(savedVol))) : 0.8;
    const isMuted = savedMuted !== null ? savedMuted === "true" : false;

    return { volume, isMuted };
  } catch (e) {
    return { volume: 0.8, isMuted: false };
  }
}

// Persist volume and mute state
function persistVolumePreferences(volume: number, isMuted: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_VOLUME, volume.toString());
    localStorage.setItem(STORAGE_KEY_MUTED, isMuted.toString());
  } catch (e) {}
}

export default function StoryVideoModal({ story, isOpen, onClose }: StoryVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prefs = getStoredVolumePreferences();
    setVolume(prefs.volume);
    setIsMuted(prefs.isMuted);
  }, []);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Synchronize audio preferences whenever a new story is opened or loaded
  useEffect(() => {
    if (isOpen && videoRef.current) {
      const prefs = getStoredVolumePreferences();
      videoRef.current.currentTime = 0;
      videoRef.current.volume = prefs.volume;
      videoRef.current.muted = prefs.isMuted;
      setVolume(prefs.volume);
      setIsMuted(prefs.isMuted);

      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            // If browser autoplay policy blocks unmuted audio on start, fallback to mute and keep preference
            if (videoRef.current) {
              videoRef.current.muted = true;
              setIsMuted(true);
              videoRef.current.play();
              setIsPlaying(true);
            }
          });
      }
    }
  }, [isOpen, story]);

  if (!mounted || !isOpen || !story) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted || volume === 0) {
      // Unmute: restore previous non-zero volume or 0.8
      const restoredVol = volume === 0 ? 0.8 : volume;
      videoRef.current.muted = false;
      videoRef.current.volume = restoredVol;
      setVolume(restoredVol);
      setIsMuted(false);
      persistVolumePreferences(restoredVol, false);
    } else {
      // Mute: save current muted state
      videoRef.current.muted = true;
      setIsMuted(true);
      persistVolumePreferences(volume, true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    const newMuted = newVol === 0;
    setIsMuted(newMuted);

    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newMuted;
    }
    persistVolumePreferences(newVol, newMuted);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    const video = videoRef.current as any;
    // Native iOS Safari video fullscreen support
    if (video.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
      return;
    }
    // Standard and WebKit/Blink Fullscreen API
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      if (video.requestFullscreen) {
        video.requestFullscreen().catch(() => {});
      } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
      } else if (video.msRequestFullscreen) {
        video.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? "0" : ""}${remainingSecs}`;
  };

  const isPortrait = story.orientation === "portrait";

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none">
      {/* Click outside to close backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Container */}
      <div 
        className={`relative z-10 w-full bg-[#062e36] dark:bg-[#0c1f24] rounded-3xl border border-white/15 shadow-2xl overflow-hidden flex flex-col ${
          isPortrait ? "max-w-4xl max-h-[92vh] md:flex-row" : "max-w-5xl max-h-[92vh] md:flex-row"
        }`}
      >
        {/* Close Button Top Right */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
          aria-label="Close Story Video"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Video Player Column */}
        <div 
          className={`relative bg-black flex items-center justify-center overflow-hidden ${
            isPortrait ? "w-full md:w-[48%] h-[55vh] md:h-auto min-h-[360px]" : "w-full md:w-[60%] h-[50vh] md:h-auto"
          }`}
        >
          <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-3">
            <video
              ref={videoRef}
              src={story.videoUrl}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              onClick={togglePlay}
              playsInline
              loop
              className="w-full h-full object-contain rounded-2xl border border-white/10 shadow-inner cursor-pointer"
            />

            {/* Subtle Overlay Badge on Video (Clinical Tag) */}
            <div className="absolute top-5 left-5 pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[#f9ab55] border border-[#f9ab55]/30 text-[10px] font-black tracking-wider uppercase shadow-md">
                <Activity className="w-3 h-3 text-[#f9ab55]" />
                {story.category}
              </span>
            </div>

            {/* Big Play/Pause Center Indicator when paused */}
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-[#f9ab55]/90 hover:bg-[#f9ab55] text-[#062e36] flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95 cursor-pointer z-10"
              >
                <Play className="w-8 h-8 fill-current translate-x-0.5" />
              </button>
            )}

            {/* Custom Bottom Control Bar inside video */}
            <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4 z-20 flex flex-col gap-1.5 bg-black/80 backdrop-blur-md px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl border border-white/10 shadow-lg">
              {/* Scrub bar */}
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#f9ab55]"
                aria-label="Seek time"
              />

              <div className="flex items-center justify-between text-xs text-white font-medium pt-1 gap-2">
                {/* Left controls: Play/Pause, Volume + Persistent Slider (Desktop), Timestamp */}
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <button 
                    onClick={togglePlay} 
                    className="hover:text-[#f9ab55] transition-colors cursor-pointer shrink-0 p-0.5"
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>

                  {/* Volume Control Group with Interactive Slider & Persistent Memory */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                      onClick={toggleMute} 
                      className="hover:text-[#f9ab55] transition-colors cursor-pointer p-0.5 shrink-0"
                      title={isMuted || volume === 0 ? "Unmute" : "Mute"}
                      aria-label="Toggle Mute"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-rose-400" />
                      ) : volume < 0.5 ? (
                        <Volume1 className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>

                    {/* Interactive Volume Slider (Hidden on mobile phones to save space for fullscreen button, visible on tablets/desktops) */}
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="hidden sm:block w-14 sm:w-18 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-[#f9ab55] transition-all"
                      title={`Volume: ${isMuted || volume === 0 ? "Muted" : `${Math.round(volume * 100)}%`}`}
                      aria-label="Volume slider"
                    />
                  </div>

                  {/* Timestamp */}
                  <span className="text-[10px] sm:text-[11px] text-slate-300 font-mono font-bold shrink-0">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {/* Right controls: Verified badge (desktop) + Fullscreen Expand Button (always visible on mobile & desktop) */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <span className="text-[9px] sm:text-[10px] text-emerald-400 font-bold uppercase tracking-wider hidden sm:flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Verified Case
                  </span>
                  <button
                    onClick={toggleFullscreen}
                    className="p-1 sm:p-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white hover:text-[#f9ab55] transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs"
                    title="Fullscreen / Expand"
                    aria-label="Toggle Fullscreen"
                  >
                    <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Case Details & Consultation Column */}
        <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto space-y-6">
          <div className="space-y-4">
            {/* Lead Tag & Title */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f9ab55]/15 border border-[#f9ab55]/30 text-[#f9ab55] text-xs font-black uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{story.category}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white font-['Plus_Jakarta_Sans',sans-serif] leading-tight">
                {story.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 leading-relaxed">
                {story.subtitle}
              </p>
            </div>

            {/* Highlights List */}
            {story.highlights && story.highlights.length > 0 && (
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#f9ab55] block">
                  Rehabilitation Highlights
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {story.highlights.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-200 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Doctor's Clinical Assessment & Technique (Optional) */}
            {(story.doctorAssessment?.trim() || story.clinicalNotes?.trim()) && (
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#f9ab55] block">
                  Doctor&apos;s Clinical Assessment &amp; Technique
                </span>
                <blockquote className="text-xs sm:text-sm text-slate-200 italic bg-white/5 p-4 rounded-2xl border-l-4 border-[#f9ab55] leading-relaxed">
                  &ldquo;{story.doctorAssessment || story.clinicalNotes}&rdquo;
                </blockquote>
                <div className="flex items-center gap-2 pt-1 text-xs text-slate-400">
                  <span className="w-6 h-6 rounded-full bg-[#f9ab55]/20 text-[#f9ab55] font-black text-[10px] flex items-center justify-center">
                    DK
                  </span>
                  <span>{story.therapist || "Dr. Kinnera (Lead Physiotherapist)"}</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Button: Book / Consult */}
          <div className="pt-2 border-t border-white/10">
            <Link
              href={`https://wa.me/918971462949?text=${encodeURIComponent(
                `Hello Dr. Kinnera, I watched the recovery story for "${story.title}" and would like to consult for a similar condition.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-full bg-[#f9ab55] hover:bg-[#e49b4b] text-[#062e36] font-black text-xs sm:text-sm shadow-xl transition-all hover:scale-[1.02] active:scale-98 group cursor-pointer"
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span>CONSULT DR. KINNERA FOR SIMILAR CONDITION</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform shrink-0" />
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
