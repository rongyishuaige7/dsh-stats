import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

function readArgument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const inputDirectory = path.resolve(readArgument('--input', 'promo-video/pilot/frames'));
const outputPath = path.resolve(readArgument('--output', 'promo-video/pilot/pilot.mp4'));
const fps = Number.parseInt(readArgument('--fps', '24'), 10);
const frameCount = Number.parseInt(readArgument('--frames', '96'), 10);
const duration = frameCount / fps;
const fadeOutStart = Math.max(0, duration - 1);

await mkdir(path.dirname(outputPath), { recursive: true });

const filter = [
  '[1:a]volume=0.22,lowpass=f=260[bed]',
  '[2:a]volume=0.10,tremolo=f=1.25:d=0.55[pulse]',
  '[3:a]highpass=f=900,lowpass=f=5200,volume=0.08[air]',
  `[bed][pulse][air]amix=inputs=3:normalize=0,afade=t=in:st=0:d=0.45,afade=t=out:st=${fadeOutStart}:d=1[audio]`,
].join(';');

const argumentsList = [
  '-y',
  '-framerate', String(fps),
  '-start_number', '0',
  '-i', path.join(inputDirectory, 'frame-%04d.jpg'),
  '-f', 'lavfi', '-i', `sine=frequency=58:sample_rate=48000:duration=${duration}`,
  '-f', 'lavfi', '-i', `sine=frequency=116:sample_rate=48000:duration=${duration}`,
  '-f', 'lavfi', '-i', `anoisesrc=color=pink:sample_rate=48000:duration=${duration}:amplitude=0.1`,
  '-filter_complex', filter,
  '-map', '0:v:0',
  '-map', '[audio]',
  '-frames:v', String(frameCount),
  '-c:v', 'libx264',
  '-preset', 'slow',
  '-crf', '18',
  '-pix_fmt', 'yuv420p',
  '-r', String(fps),
  '-c:a', 'aac',
  '-b:a', '160k',
  '-ar', '48000',
  '-movflags', '+faststart',
  '-shortest',
  outputPath,
];

const ffmpeg = spawn('ffmpeg', argumentsList, { stdio: 'inherit' });
const exitCode = await new Promise((resolve) => ffmpeg.once('exit', resolve));
if (exitCode !== 0) throw new Error(`ffmpeg exited with code ${exitCode}`);
