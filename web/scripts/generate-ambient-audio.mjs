import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const sampleRate = 22050;
const durationSeconds = 28;

function clamp(value) {
  return Math.max(-1, Math.min(1, value));
}

function createOriginalAmbientLoop({ filename, root, shimmer, seed }) {
  const sampleCount = sampleRate * durationSeconds;
  const pcm = Buffer.alloc(sampleCount * 2);
  let random = seed;
  const noise = () => {
    random = (random * 16807) % 2147483647;
    return (random / 2147483647) * 2 - 1;
  };

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    const slowFade = Math.min(1, time / 2, (durationSeconds - time) / 2);
    const pad =
      Math.sin(Math.PI * 2 * root * time) * 0.1 +
      Math.sin(Math.PI * 2 * root * 1.5 * time + 0.7) * 0.055 +
      Math.sin(Math.PI * 2 * root * 2 * time + 1.4) * 0.025;
    const pulsePosition = (time % 7.0) / 7.0;
    const pulse = Math.exp(-pulsePosition * 7) * Math.sin(Math.PI * 2 * shimmer * time) * 0.06;
    const breath = Math.sin(Math.PI * 2 * 0.045 * time) * 0.012;
    const texture = noise() * 0.0035;
    const sample = clamp((pad + pulse + breath + texture) * slowFade * 0.7);
    pcm.writeInt16LE(Math.round(sample * 32767), index * 2);
  }

  const bytesPerSample = 2;
  const dataSize = pcm.length;
  const wav = Buffer.alloc(44 + dataSize);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * bytesPerSample, 28);
  wav.writeUInt16LE(bytesPerSample, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataSize, 40);
  pcm.copy(wav, 44);

  const destination = resolve(process.cwd(), "public", "audio", filename);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, wav);
  console.log(`Wrote ${destination}`);
}

// Created entirely from deterministic sine waves and low-level noise in this script.
createOriginalAmbientLoop({ filename: "quiet-drift.wav", root: 110, shimmer: 523.25, seed: 431 });
createOriginalAmbientLoop({ filename: "lantern-rain.wav", root: 146.83, shimmer: 659.25, seed: 907 });
