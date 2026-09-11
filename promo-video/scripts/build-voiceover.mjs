import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

function readArgument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function run(command, argumentsList) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argumentsList, { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

const outputPath = path.resolve(readArgument('--output', 'promo-video/audio/voiceover-zh-tw-meijia.m4a'));
const voice = readArgument('--voice', 'Meijia');
const rate = readArgument('--rate', '210');
const duration = 30;
const segments = [
  { start: 0.08, text: '用量查得好累？D S H Usage，一眼看懂。' },
  { start: 4.35, text: '專案、用量、時間、花費，打開就有答案。' },
  { start: 9.55, text: '開發時間軸，讓每段投入清清楚楚。' },
  { start: 14.45, text: '用量趨勢和模型分布，一張圖就掌握。' },
  { start: 19.55, text: '餘額、額度和方案進度，隨時掌握。' },
  { start: 24.04, text: '所有關鍵資料，匯成完整視角。' },
  { start: 27, text: '安裝 D S H，開發資料一眼懂。' },
];

await mkdir(path.dirname(outputPath), { recursive: true });
const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'dsh-voiceover-'));

try {
  const clips = [];
  for (const [index, segment] of segments.entries()) {
    const clipPath = path.join(temporaryDirectory, `segment-${index}.aiff`);
    await run('say', ['-v', voice, '-r', rate, '-o', clipPath, segment.text]);
    clips.push(clipPath);
  }

  const filterParts = segments.map((segment, index) => (
    `[${index}:a]aformat=sample_rates=48000:channel_layouts=mono,` +
    `highpass=f=90,adelay=${Math.round(segment.start * 1000)}:all=1[segment${index}]`
  ));
  const mixInputs = segments.map((_, index) => `[segment${index}]`).join('');
  filterParts.push(
    `${mixInputs}amix=inputs=${segments.length}:normalize=0:duration=longest,` +
    `loudnorm=I=-18:LRA=7:TP=-1.5,apad,atrim=duration=${duration}[voice]`,
  );

  const ffmpegArguments = ['-y'];
  for (const clip of clips) ffmpegArguments.push('-i', clip);
  ffmpegArguments.push(
    '-filter_complex', filterParts.join(';'),
    '-map', '[voice]',
    '-c:a', 'aac',
    '-b:a', '160k',
    '-ar', '48000',
    outputPath,
  );
  await run('ffmpeg', ffmpegArguments);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
