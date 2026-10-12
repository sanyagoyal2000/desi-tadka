/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { Camera, CheckCircle, Fire, Hand, Pause, Play, Plus, SkipForward, SpeakerHigh, SpeakerSlash, X } from "@phosphor-icons/react/dist/ssr";
import type { WorkoutCard, WorkoutEntry } from "@/lib/schema";
import { kcalForMinutes, parseReps } from "@/lib/fitness";
import { bodyVisible, MoveTracker, patternFor, SIGNAL_JOINTS, type Landmark } from "@/lib/coach/motion";
import { cheer, hush, speak, unlockSpeech } from "@/lib/coach/voice";
import { todayISO } from "@/lib/plan";
import { postEntry } from "@/lib/todayClient";

// Pinned to the installed @mediapipe/tasks-vision version.
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const REST_SECONDS = 10;
const GET_READY_SECONDS = 5;

type Phase = "intro" | "loading" | "ready" | "move" | "rest" | "done" | "error";
type Step = { name: string; image: string; round: number; count: number; seconds: number; timed: boolean };

// Indian treats for the finish screen: "you earned back 1 gulab jamun".
const TREATS = [
  { name: "samosa", kcal: 250 },
  { name: "gulab jamun", kcal: 150 },
  { name: "roti", kcal: 100 },
  { name: "chai with sugar", kcal: 60 },
];

// Live workout: the phone camera watches you, counts reps, calls them out and logs the burn.
export default function Coach({ card, weightKg }: { card: WorkoutCard; weightKg: number }) {
  const steps = useMemo<Step[]>(
    () =>
      Array.from({ length: Math.max(1, card.rounds) }, (_, r) =>
        card.exercises.map((ex) => ({ name: ex.name, image: ex.image, round: r + 1, ...parseReps(ex.reps) })),
      ).flat(),
    [card],
  );

  const [phase, setPhase] = useState<Phase>("intro");
  const [manual, setManual] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [reps, setReps] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [cue, setCue] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ reps: number; minutes: number; kcal: number; logged: boolean } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const depthRef = useRef<HTMLDivElement>(null);
  const landmarker = useRef<PoseLandmarker | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef<number>(0);
  const wakeLock = useRef<WakeLockSentinel | null>(null);
  const tracker = useRef<MoveTracker | null>(null);

  // Everything the frame loop reads lives in refs so it never sees stale state.
  const s = useRef({ phase: "intro" as Phase, step: 0, reps: 0, timeLeft: 0, paused: false, muted: false, manual: false, totalReps: 0, startedAt: 0, pausedMs: 0, lastT: 0, lastVisible: false, cueUntil: 0 });

  const say = useCallback((text: string) => {
    if (!s.current.muted) speak(text);
  }, []);

  const go = useCallback((phase: Phase) => {
    s.current.phase = phase;
    setPhase(phase);
  }, []);

  const startStep = useCallback(
    (i: number) => {
      const st = steps[i];
      tracker.current = new MoveTracker(st.name);
      Object.assign(s.current, { step: i, reps: 0, timeLeft: st.timed ? st.seconds : 0 });
      setStepIdx(i);
      setReps(0);
      setSecondsLeft(st.timed ? st.seconds : 0);
      setCue(null);
      go("move");
      say(`${st.name}. ${st.timed ? `${st.seconds} seconds` : `${st.count} reps`}. Go!`);
    },
    [steps, go, say],
  );

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    landmarker.current?.close();
    landmarker.current = null;
    wakeLock.current?.release().catch(() => {});
    wakeLock.current = null;
  }, []);

  const finish = useCallback(async () => {
    go("done");
    const minutes = Math.max(1, (performance.now() - s.current.startedAt - s.current.pausedMs) / 60000);
    const kcal = kcalForMinutes(minutes, weightKg);
    const result = { reps: s.current.totalReps, minutes: Math.round(minutes), kcal, logged: false };
    setSummary(result);
    say(`${cheer()} Workout done. About ${kcal} calories burned.`);
    stopCamera();
    const entry: WorkoutEntry = { kind: "workout", id: `done-${Date.now().toString(36)}`, at: new Date().toISOString(), title: card.title, cardId: card.id, minutes: Math.round(minutes), reps: s.current.totalReps, calories: kcal };
    if (await postEntry(todayISO(), entry)) setSummary({ ...result, logged: true });
  }, [card, weightKg, go, say, stopCamera]);

  const next = useCallback(() => {
    const i = s.current.step;
    if (i >= steps.length - 1) return void finish();
    s.current.timeLeft = REST_SECONDS;
    setSecondsLeft(REST_SECONDS);
    setStepIdx(i + 1);
    setCue(null);
    go("rest");
    say(`${cheer()} Rest. Next up: ${steps[i + 1].name}.`);
  }, [steps, finish, go, say]);

  const addRep = useCallback(() => {
    s.current.reps++;
    s.current.totalReps++;
    setReps(s.current.reps);
    const st = steps[s.current.step];
    if (!st.timed) {
      const left = st.count - s.current.reps;
      if (left <= 0) return next();
      say(left <= 3 && left > 0 ? `${s.current.reps}. ${left} more!` : String(s.current.reps));
    }
  }, [steps, next, say]);

  const loopRef = useRef<() => void>(() => {});
  // One loop does pose detection, drawing, and every timer (get ready, timed moves, rest).
  const loop = useCallback(() => {
    const now = performance.now();
    const dt = s.current.lastT ? (now - s.current.lastT) / 1000 : 0;
    s.current.lastT = now;
    const st = s.current;

    let lm: Landmark[] | undefined;
    const video = videoRef.current;
    if (!st.manual && landmarker.current && video && video.readyState >= 2) {
      lm = landmarker.current.detectForVideo(video, now).landmarks[0];
      draw(canvasRef.current, video, lm, tracker.current?.signal ? SIGNAL_JOINTS[tracker.current.signal] : []);
    }
    const isVisible = st.manual || bodyVisible(lm);
    if (isVisible !== st.lastVisible) {
      st.lastVisible = isVisible;
      setVisible(isVisible);
    }

    if (st.paused) st.pausedMs += dt * 1000;
    else if (st.phase === "ready" || st.phase === "rest") {
      const before = Math.ceil(st.timeLeft);
      st.timeLeft -= dt;
      if (Math.ceil(st.timeLeft) !== before) {
        setSecondsLeft(Math.max(0, Math.ceil(st.timeLeft)));
        if (st.timeLeft > 0 && st.timeLeft <= 3) say(String(Math.ceil(st.timeLeft)));
      }
      if (st.timeLeft <= 0) startStep(st.phase === "ready" ? 0 : st.step + 1);
    } else if (st.phase === "move") {
      const step = steps[st.step];
      if (lm && tracker.current && !tracker.current.isHold) {
        const aspect = video!.videoWidth / Math.max(1, video!.videoHeight);
        const { rep, cue } = tracker.current.update(now, lm, aspect);
        if (rep) {
          if (cue) {
            setCue(cue);
            st.cueUntil = now + 2500;
            if (!step.timed) say(cue);
          }
          addRep();
        }
        if (depthRef.current) depthRef.current.style.transform = `scaleY(${tracker.current.depth.toFixed(3)})`;
      }
      if (st.cueUntil && now > st.cueUntil) {
        st.cueUntil = 0;
        setCue(null);
      }
      // Timed moves only tick while you're in frame, so walking off doesn't count.
      if (step.timed && isVisible) {
        const before = Math.ceil(st.timeLeft);
        st.timeLeft -= dt;
        if (Math.ceil(st.timeLeft) !== before) {
          const left = Math.max(0, Math.ceil(st.timeLeft));
          setSecondsLeft(left);
          if (left === 10 || (left <= 3 && left > 0)) say(String(left));
        }
        if (st.timeLeft <= 0) next();
      }
    }
    if (s.current.phase !== "done") raf.current = requestAnimationFrame(() => loopRef.current());
  }, [steps, addRep, next, startStep, say]);
  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  async function begin(useCamera: boolean) {
    unlockSpeech();
    setError(null);
    s.current.manual = !useCamera;
    setManual(!useCamera);
    if (useCamera) {
      go("loading");
      try {
        stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        const video = videoRef.current!;
        video.srcObject = stream.current;
        await video.play();
        const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
        connections = PoseLandmarker.POSE_CONNECTIONS;
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        const make = (delegate: "GPU" | "CPU") =>
          PoseLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: MODEL_URL, delegate }, runningMode: "VIDEO", numPoses: 1 });
        landmarker.current = await make("GPU").catch(() => make("CPU"));
      } catch (err) {
        stopCamera();
        const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
        setError(
          denied
            ? "Camera access was blocked. Allow the camera for this site (it needs HTTPS or localhost), or work out without it."
            : "Couldn't start the camera coach on this device. You can still work out with taps and timers.",
        );
        go("error");
        return;
      }
    }
    navigator.wakeLock?.request("screen").then((l) => (wakeLock.current = l)).catch(() => {});
    Object.assign(s.current, { startedAt: performance.now(), pausedMs: 0, totalReps: 0, lastT: 0, timeLeft: GET_READY_SECONDS });
    setSecondsLeft(GET_READY_SECONDS);
    go("ready");
    say(useCamera ? "Prop your phone up and step back until I can see your whole body." : `Get ready. First up: ${steps[0].name}.`);
    raf.current = requestAnimationFrame(loop);
  }

  useEffect(
    () => () => {
      stopCamera();
      hush();
    },
    [stopCamera],
  );

  function togglePause() {
    s.current.paused = !s.current.paused;
    setPaused(s.current.paused);
    if (s.current.paused) hush();
  }

  function toggleMute() {
    s.current.muted = !s.current.muted;
    setMuted(s.current.muted);
    if (s.current.muted) hush();
  }

  const step = steps[stepIdx];
  const isHold = step ? patternFor(step.name).signal === "hold" : false;
  const live = phase === "ready" || phase === "move" || phase === "rest";
  const exitHref = `/cards/${card.id}`;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col text-white ${live && !manual ? "bg-black" : "glow-card"}`}>
      {/* Camera + skeleton, mirrored like a selfie. */}
      <video ref={videoRef} playsInline muted className={`absolute inset-0 size-full -scale-x-100 object-cover ${manual || !live ? "opacity-0" : ""}`} />
      <canvas ref={canvasRef} className={`pointer-events-none absolute inset-0 size-full -scale-x-100 object-cover ${manual || !live ? "opacity-0" : ""}`} />
      {live && !manual && <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />}

      <div className="relative flex items-center justify-between gap-2 p-4" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
        <Link href={exitHref} aria-label="Exit coach" className="grid size-11 place-items-center rounded-full bg-white/15 backdrop-blur">
          <X aria-hidden="true" size={20} weight="bold" />
        </Link>
        <p className="min-w-0 truncate text-center text-sm font-semibold text-white/80">{card.title}</p>
        <button type="button" onClick={toggleMute} aria-label={muted ? "Turn voice on" : "Mute voice"} className="grid size-11 place-items-center rounded-full bg-white/15 backdrop-blur">
          {muted ? <SpeakerSlash aria-hidden="true" size={20} weight="bold" /> : <SpeakerHigh aria-hidden="true" size={20} weight="bold" />}
        </button>
      </div>

      {live && (
        <div className="relative mx-4 flex gap-1" aria-hidden="true">
          {steps.map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i < stepIdx || (i === stepIdx && phase === "rest") ? "bg-electric" : i === stepIdx ? "bg-white" : "bg-white/25"}`} />
          ))}
        </div>
      )}

      <div className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
        {phase === "intro" && (
          <div className="flex max-w-sm flex-col items-center gap-4">
            <span className="grid size-20 place-items-center rounded-full bg-volt">
              <Camera aria-hidden="true" size={40} weight="fill" />
            </span>
            <h1 className="font-display text-3xl font-extrabold leading-tight">Your reel is now your coach</h1>
            <p className="text-white/70">
              Prop your phone against a wall, step back about 2 metres so your whole body is in view, and I&apos;ll count every rep out loud. Your video never leaves your phone.
            </p>
            <ol className="w-full rounded-2xl bg-white/10 p-3 text-left text-sm">
              {card.exercises.map((ex, i) => (
                <li key={i} className="flex justify-between gap-2 py-1">
                  <span className="truncate">{ex.name}</span>
                  <span className="shrink-0 text-white/60">{ex.reps}</span>
                </li>
              ))}
              <li className="mt-1 border-t border-white/10 pt-2 text-white/60">
                × {card.rounds} {card.rounds === 1 ? "round" : "rounds"}
              </li>
            </ol>
          </div>
        )}

        {phase === "loading" && (
          <p role="status" className="animate-pulse font-display text-xl font-bold">
            Waking up your coach…
          </p>
        )}

        {phase === "error" && (
          <div className="flex max-w-sm flex-col items-center gap-4">
            <p role="alert" className="text-white/80">
              {error}
            </p>
          </div>
        )}

        {phase === "ready" && (
          <div className="flex flex-col items-center gap-2" role="status" aria-live="polite">
            <p className="text-sm font-bold uppercase tracking-widest text-electric">Get ready</p>
            <p className="font-display text-8xl font-extrabold tabular-nums">{secondsLeft}</p>
            <p className="font-semibold">First: {steps[0].name}</p>
          </div>
        )}

        {phase === "rest" && step && (
          <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
            <p className="text-sm font-bold uppercase tracking-widest text-electric">Rest</p>
            <p className="font-display text-8xl font-extrabold tabular-nums">{secondsLeft}</p>
            <p className="text-white/70">Next up</p>
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-2 pr-4">
              {step.image && <img src={step.image} alt="" className="size-14 rounded-xl object-cover" />}
              <span className="text-left">
                <span className="block font-display text-xl font-bold">{step.name}</span>
                <span className="text-sm text-white/60">{step.timed ? `${step.seconds} sec` : `${step.count} reps`} · round {step.round}</span>
              </span>
            </div>
          </div>
        )}

        {phase === "move" && step && (
          <div className="flex w-full flex-1 flex-col items-center justify-end gap-1 pb-4" aria-live="polite">
            {!visible && (
              <p className="absolute top-6 rounded-full bg-volt px-4 py-2 text-sm font-bold">Step back so I can see your whole body</p>
            )}
            {cue && <p className="absolute top-20 rounded-full bg-electric px-4 py-2 text-sm font-bold text-black">{cue}</p>}
            <p className="text-sm font-bold uppercase tracking-widest text-electric">
              Round {step.round} of {card.rounds}
            </p>
            <h2 className="font-display text-3xl font-extrabold leading-tight drop-shadow">{step.name}</h2>
            <div className="flex items-end gap-4">
              {!manual && !isHold && (
                <div className="mb-4 h-24 w-2 overflow-hidden rounded-full bg-white/20" aria-hidden="true">
                  <div ref={depthRef} className="size-full origin-bottom bg-electric transition-transform duration-75" style={{ transform: "scaleY(0)" }} />
                </div>
              )}
              <p className="font-display text-[7.5rem] font-extrabold leading-none tabular-nums drop-shadow-lg">
                {step.timed ? secondsLeft : reps}
                <span className="text-4xl text-white/50">{step.timed ? "s" : `/${step.count}`}</span>
              </p>
            </div>
            {step.timed && !isHold && reps > 0 && <p className="text-white/70">{reps} reps</p>}
          </div>
        )}

        {phase === "done" && summary && (
          <div className="flex max-w-sm flex-col items-center gap-4">
            <CheckCircle aria-hidden="true" size={64} weight="fill" className="text-aqua" />
            <h1 className="font-display text-4xl font-extrabold">Shabaash!</h1>
            <dl className="grid w-full grid-cols-3 gap-2">
              <Stat label="reps" value={summary.reps} />
              <Stat label="minutes" value={summary.minutes} />
              <Stat label="kcal" value={summary.kcal} />
            </dl>
            <p className="flex items-center gap-2 rounded-2xl bg-electric/20 px-4 py-3 text-left">
              <Fire aria-hidden="true" size={24} weight="fill" className="shrink-0 text-blaze" />
              <span>{treat(summary.kcal)}</span>
            </p>
            <p className="text-sm text-white/60">{summary.logged ? "Logged to Today." : "Saving to Today…"} Calories are estimates.</p>
          </div>
        )}
      </div>

      <div className="relative mx-auto flex w-full max-w-md flex-col gap-2 p-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        {(phase === "intro" || phase === "error") && (
          <>
            {phase === "intro" && (
              <button type="button" onClick={() => begin(true)} className="flex items-center justify-center gap-2 rounded-2xl bg-white py-4 font-display text-xl font-black uppercase text-[#4b1fd6] shadow-[0_10px_30px_rgba(20,0,80,0.35)]">
                <Camera aria-hidden="true" size={24} weight="fill" /> Start with camera
              </button>
            )}
            <button type="button" onClick={() => begin(false)} className="flex items-center justify-center gap-2 rounded-2xl bg-white/15 py-3 font-bold">
              <Hand aria-hidden="true" size={20} weight="bold" /> Without camera (tap to count)
            </button>
          </>
        )}

        {live && (
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={togglePause} className="flex flex-col items-center gap-1 rounded-2xl bg-white/15 py-3 text-xs font-bold backdrop-blur">
              {paused ? <Play aria-hidden="true" size={22} weight="fill" /> : <Pause aria-hidden="true" size={22} weight="fill" />}
              {paused ? "Resume" : "Pause"}
            </button>
            <button
              type="button"
              onClick={addRep}
              disabled={phase !== "move" || paused}
              className="flex flex-col items-center gap-1 rounded-2xl bg-volt py-3 text-xs font-bold disabled:opacity-40"
            >
              <Plus aria-hidden="true" size={22} weight="bold" />
              {manual ? "Tap per rep" : "Missed one"}
            </button>
            <button
              type="button"
              onClick={() => (phase === "move" ? next() : phase === "rest" ? startStep(stepIdx) : startStep(0))}
              disabled={paused}
              className="flex flex-col items-center gap-1 rounded-2xl bg-white/15 py-3 text-xs font-bold backdrop-blur disabled:opacity-40"
            >
              <SkipForward aria-hidden="true" size={22} weight="fill" />
              {phase === "move" ? "Done / skip" : "Start now"}
            </button>
          </div>
        )}

        {phase === "done" && (
          <div className="grid grid-cols-2 gap-2">
            <Link href={exitHref} className="rounded-2xl bg-white/15 py-3 text-center font-bold">
              Back to card
            </Link>
            <Link href="/today" className="rounded-2xl bg-volt py-3 text-center font-bold">
              See today
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/10 py-3">
      <dd className="font-display text-3xl font-extrabold leading-none tabular-nums">{value}</dd>
      <dt className="mt-1 text-xs text-white/60">{label}</dt>
    </div>
  );
}

function treat(kcal: number) {
  const t = TREATS.find((x) => kcal >= x.kcal) ?? TREATS[TREATS.length - 1];
  const n = Math.max(1, Math.floor(kcal / t.kcal));
  return kcal < t.kcal ? `That's most of a ${t.name}. Keep going tomorrow!` : `You just earned back ${n} ${t.name}${n > 1 && !t.name.endsWith("sugar") ? "s" : ""}.`;
}

// Mirrors the video size, then draws the skeleton with the joints being counted in aqua and pink.
// Filled in when the pose model loads, so the pose bundle stays out of the first page load.
let connections: { start: number; end: number }[] = [];

function draw(canvas: HTMLCanvasElement | null, video: HTMLVideoElement, lm: Landmark[] | undefined, highlight: number[]) {
  if (!canvas) return;
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!lm) return;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(3, canvas.width / 180);
  for (const { start, end } of connections) {
    const a = lm[start];
    const b = lm[end];
    if ((a.visibility ?? 1) < 0.5 || (b.visibility ?? 1) < 0.5) continue;
    const hot = highlight.includes(start) && highlight.includes(end);
    ctx.strokeStyle = hot ? "#43e8d0" : "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.moveTo(a.x * canvas.width, a.y * canvas.height);
    ctx.lineTo(b.x * canvas.width, b.y * canvas.height);
    ctx.stroke();
  }
  for (let i = 11; i < lm.length; i++) {
    const p = lm[i];
    if ((p.visibility ?? 1) < 0.5) continue;
    ctx.fillStyle = highlight.includes(i) ? "#ff6fae" : "#ffffff";
    ctx.beginPath();
    ctx.arc(p.x * canvas.width, p.y * canvas.height, Math.max(4, canvas.width / 150), 0, Math.PI * 2);
    ctx.fill();
  }
}
