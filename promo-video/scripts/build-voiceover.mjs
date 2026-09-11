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

const outputPath = path.resolve(readArgument('--output', 'promo-video/audio/voiceover-zh-tw-hsiaochen-neural.m4a'));
const voice = readArgument('--voice', 'zh-TW-HsiaoChenNeural');
const rate = readArgument('--rate', '+15%');
const duration = 30;
const segments = [
  { start: 0.35, text: 'D S H Usage，用量一眼看懂。' },
  { start: 4.35, text: '專案、用量、時間、花費，一次看懂。' },
  { start: 9.45, text: '開發時間軸，每段投入清清楚楚。' },
  { start: 14.35, text: '用量趨勢和模型分布，一張圖掌握。' },
  { start: 19.25, text: '餘額、額度和方案進度，隨時掌握。' },
  { start: 24, text: '關鍵資料，匯成完整視角。' },
  { start: 27.05, text: '安裝 D S H，資料一眼懂。' },
];

await mkdir(path.dirname(outputPath), { recursive: true });
const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'dsh-voiceover-'));

try {
  const clips = [];
  for (const [index, segment] of segments.entries()) {
    const clipPath = path.join(temporaryDirectory, `segment-${index}.mp3`);
    await run('uvx', [
      '--from', 'edge-tts==7.2.8',
      'edge-tts',
      '--voice', voice,
      `--rate=${rate}`,
      '--text', segment.text,
      '--write-media', clipPath,
    ]);
    clips.push(clipPath);
  }

  const filterParts = segments.map((segment, index) => (
    `[${index}:a]aformat=sample_rates=48000:channel_layouts=mono,` +
    `highpass=f=70,adelay=${Math.round(segment.start * 1000)}:all=1[segment${index}]`
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
