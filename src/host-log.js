// Bounded, cooperative decoding for hosts without official session services.
import { open, stat } from "node:fs/promises";
import { setImmediate as yieldToHost } from "node:timers/promises";
import { promisify } from "node:util";
import { zstdDecompress } from "node:zlib";
import { scanZstdFrameSteps } from "./host-util.js";

const decompress = promisify(zstdDecompress);
const MiB = 1024 * 1024;
const LEGACY_LOG_LIMITS = Object.freeze({
	fileBytes: 64 * MiB,
	frameBytes: 64 * MiB,
	decodedBytes: 128 * MiB,
	recordBytes: 8 * MiB,
	records: 250000,
	frames: 250000,
	events: 500000,
	slotOperations: 1000000
});
const LOG_BATCH_SIZE = 512;

function logLimitError(resource, limit) {
	return Object.assign(new Error(`session log budget exceeded: ${resource} (limit ${limit})`), { code: "SESSION_LOG_BUDGET_EXCEEDED" });
}

// Bound the actual read as well as stat.size: a growing/replaced file cannot
// bypass the budget. Observe the open descriptor and path before caching it.
async function readStable(file, maxBytes = LEGACY_LOG_LIMITS.fileBytes, attempts = 3) {
	let last = null;
	for (let attempt = 0; attempt < attempts; attempt++) {
		const handle = await open(file, "r");
		try {
			const before = await handle.stat();
			if (before.size > maxBytes) throw logLimitError("file bytes", maxBytes);
			const chunks = [];
			let length = 0;
			for (;;) {
				const chunk = Buffer.allocUnsafe(Math.min(MiB, maxBytes - length + 1));
				const { bytesRead } = await handle.read(chunk, 0, chunk.length, null);
				if (!bytesRead) break;
				length += bytesRead;
				if (length > maxBytes) throw logLimitError("file bytes", maxBytes);
				chunks.push(chunk.subarray(0, bytesRead));
			}
			const after = await handle.stat();
			const current = await stat(file);
			if (after.size > maxBytes || current.size > maxBytes) throw logLimitError("file bytes", maxBytes);
			const keys = ["mtimeMs", "ctimeMs", "size", "ino"];
			last = {
				buf: Buffer.concat(chunks, length),
				mtimeMs: after.mtimeMs, ctimeMs: after.ctimeMs, size: after.size, ino: after.ino,
				stable: length === after.size && keys.every(key => before[key] === after[key] && after[key] === current[key])
			};
			if (last.stable) return last;
		} finally { await handle.close(); }
	}
	return last;
}

async function readSessionRecords(file, snapshot, limits = LEGACY_LOG_LIMITS) {
	if (snapshot.buf.length > limits.fileBytes) throw logLimitError("file bytes", limits.fileBytes);
	const records = [];
	let truncated = false;
	let decodedBytes = 0;
	const parseLines = async (buffer, discardTail) => {
		decodedBytes += buffer.length;
		if (decodedBytes > limits.decodedBytes) throw logLimitError("decoded bytes", limits.decodedBytes);
		let offset = 0, lines = 0, batchBytes = 0;
		while (offset < buffer.length) {
			let end = buffer.indexOf(10, offset);
			if (end < 0) {
				truncated = true;
				if (discardTail) break;
				end = buffer.length;
			}
			const length = end - offset;
			if (length > limits.recordBytes) throw logLimitError("record bytes", limits.recordBytes);
			if (length) {
				if (records.length >= limits.records) throw logLimitError("records", limits.records);
				try { records.push(JSON.parse(buffer.toString("utf8", offset, end))); }
				catch { records.push(null); }
			}
			batchBytes += length + 1;
			offset = end + 1;
			if (++lines % LOG_BATCH_SIZE === 0 || batchBytes >= MiB) {
				await yieldToHost();
				batchBytes = 0;
			}
		}
	};
	if (file.endsWith(".jsonl")) {
		await parseLines(snapshot.buf, true);
	} else {
		const frames = scanZstdFrameSteps(snapshot.buf);
		let frameCount = 0;
		let step;
		while (!(step = frames.next()).done) {
			const frame = step.value;
			if (!frame) { await yieldToHost(); continue; }
			if (++frameCount > limits.frames) throw logLimitError("frames", limits.frames);
			const remaining = limits.decodedBytes - decodedBytes;
			const maxOutputLength = Math.max(1, Math.min(limits.frameBytes, remaining));
			let decoded;
			try { decoded = await decompress(snapshot.buf.subarray(frame.start, frame.end), { maxOutputLength }); }
			catch (error) {
				if (error.code === "ERR_BUFFER_TOO_LARGE") throw logLimitError(remaining < limits.frameBytes ? "decoded bytes" : "frame bytes", Math.min(limits.frameBytes, remaining));
				throw error;
			}
			await parseLines(decoded, false);
		}
		truncated ||= step.value.truncated;
	}
	return { records, truncated };
}

export { LEGACY_LOG_LIMITS, LOG_BATCH_SIZE, logLimitError, readSessionRecords, readStable };
