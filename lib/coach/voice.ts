"use client";

// Spoken coaching through the browser's own speech engine (works offline on iPhone and Mac).
// Prefers an Indian-English voice; a new line cuts off the previous one so counts never lag.
let voice: SpeechSynthesisVoice | null | undefined;

function pickVoice() {
  if (voice !== undefined || typeof speechSynthesis === "undefined") return voice ?? null;
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null; // not loaded yet; try again next time
  voice = voices.find((v) => v.lang === "en-IN") ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
  return voice;
}

export function speak(text: string, { interrupt = true, rate = 1.05 } = {}) {
  if (typeof speechSynthesis === "undefined") return;
  if (interrupt) speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) u.voice = v;
  u.lang = v?.lang ?? "en-IN";
  u.rate = rate;
  speechSynthesis.speak(u);
}

export function hush() {
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}

// iOS only allows speech that starts inside a tap; call this from the Start button.
export function unlockSpeech() {
  if (typeof speechSynthesis === "undefined") return;
  pickVoice();
  const u = new SpeechSynthesisUtterance(" ");
  u.volume = 0;
  speechSynthesis.speak(u);
}

const CHEERS = ["Shabaash!", "Bahut badhiya!", "Nice work!", "Kya baat hai!", "Strong!"];
export const cheer = () => CHEERS[Math.floor(Math.random() * CHEERS.length)];
