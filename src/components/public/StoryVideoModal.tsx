"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  Play, 
  Pause, 
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

export default function StoryVideoModal({ story, isOpen, onClose }: StoryVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  // Reset and auto-play when a new story opens
  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Browser autoplay policy might require muted start
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
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
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
              className={`w-full h-full object-contain rounded-2xl border border-white/10 shadow-inner cursor-pointer`}
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
            <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col gap-1.5 bg-black/70 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/10 shadow-lg">
              {/* Scrub bar */}
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#f9ab55]"
              />

              <div className="flex items-center justify-between text-xs text-white font-medium pt-1">
                <div className="flex items-center gap-3">
                  <button onClick={togglePlay} className="hover:text-[#f9ab55] transition-colors cursor-pointer">
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>
                  <button onClick={toggleMute} className="hover:text-[#f9ab55] transition-colors cursor-pointer">
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <span className="text-[11px] text-slate-300 font-mono font-bold">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Verified Case
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Case Details & Consultation Column */}
        <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto space-y-6">
          <div className="space-y-4">
            {/* Lead Tag & Condition */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f9ab55]/15 border border-[#f9ab55]/30 text-[#f9ab55] text-xs font-black uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{story.condition}</span>
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

            {/* Clinical Notes by Dr. Kinnera */}
            <div className="space-y-1.5 border-t border-white/10 pt-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                Doctor&apos;s Clinical Assessment
              </span>
              <p className="text-xs text-slate-300 leading-relaxed italic bg-black/20 p-3.5 rounded-xl border border-white/5">
                &ldquo;{story.clinicalNotes}&rdquo;
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs text-slate-400 font-bold">
                <div className="w-6 h-6 rounded-full bg-[#f9ab55]/20 flex items-center justify-center text-[#f9ab55] text-[10px] font-black">
                  DK
                </div>
                <span>{story.therapist}</span>
              </div>
            </div>
          </div>

          {/* Action Call to Action */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/patienthub/appointments"
              onClick={onClose}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#f9ab55] hover:bg-[#e09840] text-[#062e36] px-6 py-3.5 text-xs font-black shadow-lg hover:shadow-xl transition-all active:scale-95 cursor-pointer uppercase tracking-wide"
            >
              <Calendar className="w-4 h-4" />
              <span>Consult Dr. Kinnera for Similar Condition</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
