// Pure timeline calculations shared by the React view and unit tests.
// No React, DOM or browser storage belongs in this module.
const { SLOT_MS, mergeCostSummaries, sessionCostSummary, summarizeCosts, usageCostDetail } = require("./client-format.cjs");
const { dayStartMs, localDayKey } = require("./client-data.cjs");

const TIMELINE_PAGE_DAYS = 30;
const TIMELINE_LANE_PAGE = 50;
const TIMELINE_SESSION_PAGE = 50;
const POP_PROJECTS = 20;
const POP_SESSIONS = 10;

const TIMELINE_PREF_DEFAULTS = { axis: "focus", metric: "cost", color: "level", activeOnly: false };

function normalizeTimelinePrefs(value) {
	const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
	return {
		axis: input.axis === "focus" || input.axis === "full" ? input.axis : TIMELINE_PREF_DEFAULTS.axis,
		metric: input.metric === "cost" || input.metric === "token" ? input.metric : TIMELINE_PREF_DEFAULTS.metric,
		color: input.color === "level" || input.color === "project" ? input.color : TIMELINE_PREF_DEFAULTS.color,
		activeOnly: typeof input.activeOnly === "boolean" ? input.activeOnly : TIMELINE_PREF_DEFAULTS.activeOnly
	};
}

function isDateKey(value) {
	return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function dateOf(value) {
	if (isDateKey(value)) return value;
	return value && isDateKey(value.date) ? value.date : null;
}

function addDays(date, n) {
	const time = Date.parse(date + "T00:00:00Z");
	if (!Number.isFinite(time)) return date;
	const offset = Number.isFinite(n) ? n : 0;
	return new Date(time + offset * 864e5).toISOString().slice(0, 10);
}

// Monday-based week number: epoch day 0 (1970-01-01) was a Thursday.
function weekOf(date) {
	return Math.floor((Date.parse(date + "T00:00:00Z") / 864e5 + 3) / 7);
}

function calendarDates(days, today) {
	const dates = (Array.isArray(days) ? days : []).map(dateOf).filter(Boolean).sort();
	if (!dates.length) return [];
	const first = dates[0];
	const last = dates[dates.length - 1];
	const end = isDateKey(today) && today > last ? today : last;
	const count = Math.round((Date.parse(end + "T00:00:00Z") - Date.parse(first + "T00:00:00Z")) / 864e5);
	const out = [];
	for (let index = 0; index <= count; index++) out.push(addDays(first, index));
	return out;
}

function isHidden(hidden, id) {
	return !!(hidden && typeof hidden === "object" && hidden[id]);
}

// Merge duplicate project/slot rows (the local fallback timeline can produce
// them) and cap every half hour at SLOT_MS.
function projectSlotMs(day, hidden) {
	const projects = new Map();
	const blocks = day && Array.isArray(day.slotBlocks) ? day.slotBlocks : [];
	blocks.forEach(function(block) {
		if (!block || block.projectId == null) return;
		const slot = Number(block.slot);
		if (!Number.isInteger(slot) || slot < 0 || slot >= 48) return;
		if (isHidden(hidden, block.projectId)) return;
		const ms = Math.max(0, Number(block.ms) || 0);
		if (!ms) return;
		let entry = projects.get(block.projectId);
		if (!entry) {
			entry = {
				projectId: block.projectId,
				name: block.name || "",
				colorIndex: normalizeColorIndex(block.colorIndex),
				ms: new Array(48).fill(0)
			};
			projects.set(block.projectId, entry);
		} else if (!entry.name && block.name) {
			entry.name = block.name;
		}
		entry.ms[slot] = Math.min(SLOT_MS, entry.ms[slot] + ms);
	});
	return projects;
}

function projectDurations(days, hidden) {
	const durations = new Map();
	(Array.isArray(days) ? days : []).forEach(function(day) {
		projectSlotMs(day, hidden).forEach(function(entry, projectId) {
			let total = durations.get(projectId) || 0;
			for (let slot = 0; slot < 48; slot++) total += entry.ms[slot];
			durations.set(projectId, total);
		});
	});
	return durations;
}

function timelineWindow(first, last, axis) {
	if (axis === "full" || !Number.isFinite(first) || !Number.isFinite(last) || first < 0 || last < 0 || last < first) {
		return { start: 0, end: 48 };
	}
	let start = Math.max(0, Math.min(48, Math.floor(first / 2) * 2));
	let end = Math.max(0, Math.min(48, Math.ceil((last + 1) / 2) * 2));
	if (end <= start) end = Math.min(48, start + 2);
	if (end - start < 12) {
		// Keep both edges on the hour while centring the six-hour minimum.
		const mid = (start + end) / 2;
		start = 2 * Math.round((mid - 6) / 2);
		end = start + 12;
		if (start < 0) { start = 0; end = 12; }
		if (end > 48) { end = 48; start = 36; }
	}
	return { start: start, end: end };
}

function slotClock(slot) {
	const minutes = slot * 30;
	const hour = Math.floor(minutes / 60);
	const minute = minutes % 60;
	return (hour < 10 ? "0" : "") + hour + ":" + (minute < 10 ? "0" : "") + minute;
}

function timelineTicks(win) {
	const start = win && Number.isFinite(win.start) ? win.start : 0;
	const end = win && Number.isFinite(win.end) ? win.end : 48;
	const span = Math.max(0, end - start);
	const step = span <= 12 ? 2 : span <= 24 ? 4 : 6;
	const ticks = [];
	let index = 0;
	for (let slot = start; slot <= end; slot += step, index++) {
		ticks.push({
			slot: slot,
			label: slotClock(slot),
			edge: slot === start ? "first" : slot === end ? "last" : null,
			odd: index % 2 === 1
		});
	}
	if (ticks.length && ticks[ticks.length - 1].slot !== end) {
		ticks.push({
			slot: end,
			label: slotClock(end),
			edge: "last",
			odd: ticks.length % 2 === 1
		});
	}
	return ticks;
}

function timelineGrid(win) {
	const start = win && Number.isFinite(win.start) ? win.start : 0;
	const end = win && Number.isFinite(win.end) ? win.end : 48;
	const grid = [];
	for (let hour = Math.ceil(start / 2); hour * 2 <= end; hour++) {
		if (hour * 2 === start || hour * 2 === end) continue;
		grid.push({ hour: hour, major: hour % 3 === 0 });
	}
	return grid;
}

function timelineRuns(ms, win) {
	const values = Array.isArray(ms) ? ms : [];
	const start = win && Number.isFinite(win.start) ? Math.max(0, Math.floor(win.start)) : 0;
	const end = win && Number.isFinite(win.end) ? Math.min(48, Math.ceil(win.end)) : 48;
	const limit = Math.min(values.length, 48);
	const runs = [];
	let slot = 0;
	while (slot < limit) {
		if (!(values[slot] > 0)) { slot++; continue; }
		let last = slot;
		while (last + 1 < limit && values[last + 1] > 0) last++;
		const from = Math.max(slot, start);
		const to = Math.min(last + 1, end);
		if (to > from) {
			const segments = [];
			let total = 0;
			for (let index = from; index < to; index++) {
				const value = Math.max(0, Number(values[index]) || 0);
				total += value;
				segments.push({ slot: index, opacity: Number((0.3 + 0.7 * Math.min(1, value / SLOT_MS)).toFixed(2)) });
			}
			runs.push({ from: from, to: to, total: total, segments: segments });
		}
		slot = last + 1;
	}
	return runs;
}

function runSlotAt(run, fraction) {
	const from = run && Number.isFinite(run.from) ? Math.floor(run.from) : 0;
	const to = run && Number.isFinite(run.to) ? Math.ceil(run.to) : from + 1;
	const width = to - from;
	if (width <= 0) return from;
	const ratio = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;
	return Math.min(to - 1, Math.max(from, from + Math.floor(ratio * width)));
}

function sessionTokens(session) {
	const stats = session && session.stats ? session.stats : {};
	const cacheRead = Math.max(0, Number(stats.cacheRead) || 0);
	const cacheWrite = Math.max(0, Number(stats.cacheWrite) || 0);
	const uncached = stats.uncached != null
		? Math.max(0, Number(stats.uncached) || 0)
		: Math.max(0, (Number(stats.inputTokens) || 0) - cacheRead - cacheWrite);
	const output = stats.output != null
		? Math.max(0, Number(stats.output) || 0)
		: Math.max(0, Number(stats.outputTokens) || 0);
	return uncached + cacheRead + cacheWrite + output;
}

// Split a session into day slots. Per-slot usage rows carry the pricing detail;
// sessions without slotUsage (old hosts or the local approximation) put their
// whole cost and token count on the timestamp's slot.
function sessionDaySlots(session, date) {
	const ms = new Array(48).fill(0);
	const usage = new Map();
	const start = date ? dayStartMs(date) : NaN;
	if (!Number.isFinite(start)) return { ms: ms, usage: usage };
	const base = Math.floor(start / SLOT_MS);
	const activity = session && Array.isArray(session.slots) ? session.slots : [];
	activity.forEach(function(row) {
		if (!row || !Number.isFinite(row.slot)) return;
		const slot = row.slot - base;
		if (slot < 0 || slot >= 48) return;
		ms[slot] = Math.min(SLOT_MS, ms[slot] + Math.max(0, Number(row.ms) || 0));
	});
	const rows = session && Array.isArray(session.slotUsage) ? session.slotUsage : [];
	if (rows.length) {
		rows.forEach(function(row) {
			if (!row || !Number.isFinite(row.slot)) return;
			const slot = row.slot - base;
			if (slot < 0 || slot >= 48) return;
			const entry = usage.get(slot) || { tokens: 0, details: [], summaries: [] };
			entry.tokens += Math.max(0, Number(row.uncached) || 0) + Math.max(0, Number(row.cacheRead) || 0) + Math.max(0, Number(row.cacheWrite) || 0) + Math.max(0, Number(row.output) || 0);
			entry.details.push(usageCostDetail(row, session.modelRaw || session.model, session.providerId, session.accountType));
			usage.set(slot, entry);
		});
	} else {
		const timestamp = session && session.updatedAt != null ? session.updatedAt : session && session.createdAt;
		if (timestamp != null && localDayKey(timestamp) === date) {
			const slot = Math.floor(timestamp / SLOT_MS) - base;
			if (slot >= 0 && slot < 48) {
				usage.set(slot, { tokens: sessionTokens(session), details: [], summaries: [sessionCostSummary(session)] });
			}
		}
	}
	return { ms: ms, usage: usage };
}

function colorIndexFrom(colorIndexes, id) {
	let value;
	if (colorIndexes instanceof Map) value = colorIndexes.get(id);
	else if (colorIndexes && typeof colorIndexes === "object") value = colorIndexes[id];
	return Number.isInteger(value) ? value : null;
}

// The host and the local fallback assign project ordinals, which can exceed
// the 16 palette slots on large datasets.
function normalizeColorIndex(value) {
	const number = Number(value);
	if (!Number.isFinite(number)) return 0;
	return ((Math.trunc(number) % 16) + 16) % 16;
}

function resolveColorIndex(colorIndexes, id, fallback) {
	const explicit = colorIndexFrom(colorIndexes, id);
	const value = explicit == null ? fallback : explicit;
	return value == null ? null : normalizeColorIndex(value);
}

function firstSlotOf(ms) {
	for (let slot = 0; slot < 48; slot++) if (ms[slot] > 0) return slot;
	return 48;
}

function totalOf(ms) {
	let total = 0;
	for (let slot = 0; slot < 48; slot++) total += ms[slot];
	return total;
}

function lastSlotOf(ms) {
	for (let slot = 47; slot >= 0; slot--) if (ms[slot] > 0) return slot;
	return -1;
}

function orderSessions(rows) {
	const compare = function(a, b) {
		return (a.first - b.first) || String(a.id == null ? "" : a.id).localeCompare(String(b.id == null ? "" : b.id));
	};
	const main = rows.filter(function(row) { return !row.subagent; }).sort(compare);
	const children = new Map();
	const orphans = [];
	rows.filter(function(row) { return row.subagent; }).forEach(function(row) {
		if (row.parentSession != null && main.some(function(parent) { return parent.id === row.parentSession; })) {
			const list = children.get(row.parentSession) || [];
			list.push(row);
			children.set(row.parentSession, list);
		} else {
			orphans.push(row);
		}
	});
	children.forEach(function(list) { list.sort(compare); });
	orphans.sort(compare);
	const ordered = [];
	main.forEach(function(row) {
		ordered.push(row);
		const list = children.get(row.id);
		if (list) ordered.push.apply(ordered, list);
	});
	ordered.push.apply(ordered, orphans);
	return ordered;
}

function timelineDayModel(input) {
	const options = input && typeof input === "object" ? input : {};
	const day = options.day && typeof options.day === "object" ? options.day : {};
	const projects = Array.isArray(options.projects) ? options.projects : [];
	const hidden = options.hidden && typeof options.hidden === "object" ? options.hidden : {};
	const date = options.date || (day && day.date) || null;
	const colorIndexes = options.colorIndexes;
	const projectSlots = projectSlotMs(day, hidden);

	const visibleProjects = projects.filter(function(project) { return project && project.id != null && !isHidden(hidden, project.id); });
	const projectIndex = new Map();
	visibleProjects.forEach(function(project) {
		projectIndex.set(project.id, {
			projectId: project.id,
			name: project.name || "",
			colorIndex: resolveColorIndex(colorIndexes, project.id, null)
		});
	});
	projectSlots.forEach(function(entry, projectId) {
		let info = projectIndex.get(projectId);
		if (!info) {
			info = { projectId: projectId, name: entry.name, colorIndex: null };
			projectIndex.set(projectId, info);
		}
		if (!info.name && entry.name) info.name = entry.name;
		if (info.colorIndex == null) info.colorIndex = resolveColorIndex(colorIndexes, projectId, entry.colorIndex);
	});
	projectIndex.forEach(function(info) {
		if (info.colorIndex == null) info.colorIndex = 0;
	});

	const sessionRows = [];
	visibleProjects.forEach(function(project) {
		(project.sessions || []).forEach(function(session) {
			if (!session) return;
			const daySlots = sessionDaySlots(session, date);
			sessionRows.push({
				projectId: project.id,
				id: session.id == null ? null : session.id,
				title: session.title || null,
				subagent: session.subagent === true,
				archived: session.archived === true,
				parentSession: session.parentSession == null ? null : session.parentSession,
				session: session,
				ms: daySlots.ms,
				usage: daySlots.usage,
				total: totalOf(daySlots.ms),
				first: firstSlotOf(daySlots.ms)
			});
		});
	});

	const lanes = [];
	projectSlots.forEach(function(entry, projectId) {
		const info = projectIndex.get(projectId) || { projectId: projectId, name: entry.name, colorIndex: entry.colorIndex };
		const rows = orderSessions(sessionRows.filter(function(row) { return row.projectId === projectId; }));
		lanes.push({
			projectId: projectId,
			name: info.name || entry.name || "",
			colorIndex: info.colorIndex == null ? normalizeColorIndex(entry.colorIndex) : info.colorIndex,
			ms: entry.ms,
			total: totalOf(entry.ms),
			first: firstSlotOf(entry.ms),
			last: lastSlotOf(entry.ms),
			mainCount: rows.filter(function(row) { return !row.subagent; }).length,
			hasSessions: rows.some(function(row) { return Array.isArray(row.session.slots) && row.session.slots.length > 0; }),
			sessions: rows
		});
	});
	lanes.sort(function(a, b) {
		return (b.total - a.total) || (a.first - b.first) || String(a.projectId).localeCompare(String(b.projectId));
	});

	let total = 0, first = 48, last = -1;
	lanes.forEach(function(lane) {
		total += lane.total;
		if (lane.first < first) first = lane.first;
		if (lane.last > last) last = lane.last;
	});

	const detailsBySlot = Array.from({ length: 48 }, function() { return []; });
	const summariesBySlot = Array.from({ length: 48 }, function() { return []; });
	const slotTokens = new Array(48).fill(0);
	sessionRows.forEach(function(row) {
		row.usage.forEach(function(entry, slot) {
			if (!Number.isInteger(slot) || slot < 0 || slot >= 48) return;
			slotTokens[slot] += entry.tokens || 0;
			if (entry.details && entry.details.length) detailsBySlot[slot].push.apply(detailsBySlot[slot], entry.details);
			if (entry.summaries && entry.summaries.length) summariesBySlot[slot].push.apply(summariesBySlot[slot], entry.summaries);
		});
	});
	const slotCost = [];
	const slotPartial = [];
	for (let slot = 0; slot < 48; slot++) {
		const summary = mergeCostSummaries([summarizeCosts(detailsBySlot[slot])].concat(summariesBySlot[slot]));
		slotCost.push(summary);
		slotPartial.push(summary.status === "partial" || (summary.unpricedTokens || 0) > 0);
	}

	return {
		lanes: lanes,
		total: total,
		first: first,
		last: last,
		slotCost: slotCost,
		slotTokens: slotTokens,
		slotPartial: slotPartial,
		hasSessions: sessionRows.some(function(row) { return Array.isArray(row.session.slots) && row.session.slots.length > 0; }),
		projectIndex: projectIndex,
		sessionRows: sessionRows
	};
}

function timelinePeak(values, win) {
	const list = Array.isArray(values) ? values : [];
	const start = win && Number.isFinite(win.start) ? Math.max(0, Math.floor(win.start)) : 0;
	const end = win && Number.isFinite(win.end) ? Math.min(48, Math.ceil(win.end)) : 48;
	let bestSlot = null;
	let bestValue = 0;
	for (let slot = start; slot < end && slot < list.length; slot++) {
		const value = Number(list[slot]) || 0;
		if (value > bestValue) { bestValue = value; bestSlot = slot; }
	}
	return bestSlot == null ? null : { slot: bestSlot, value: bestValue };
}

function timelineSlotDetail(model, slot) {
	const index = Number.isInteger(slot) ? slot : Math.floor(Number(slot) || 0);
	const empty = { projects: [], moreProjects: 0, total: { ms: 0, tokens: 0, cost: summarizeCosts([]) }, parallel: 0 };
	if (!model || index < 0 || index >= 48) return empty;
	const lanes = Array.isArray(model.lanes) ? model.lanes : [];
	const laneById = new Map(lanes.map(function(lane) { return [lane.projectId, lane]; }));
	const projectIndex = model.projectIndex instanceof Map ? model.projectIndex : new Map();
	const rows = Array.isArray(model.sessionRows) ? model.sessionRows : [];
	const groups = new Map();
	const groupFor = function(projectId) {
		let group = groups.get(projectId);
		if (!group) {
			const lane = laneById.get(projectId);
			const info = projectIndex.get(projectId) || lane || {};
			group = {
				projectId: projectId,
				name: info.name || "",
				colorIndex: Number.isInteger(info.colorIndex) ? info.colorIndex : 0,
				ms: 0,
				tokens: 0,
				costSummaries: [],
				sessions: []
			};
			groups.set(projectId, group);
		}
		return group;
	};

	const laneOrder = new Map();
	lanes.forEach(function(lane) {
		const ms = lane.ms && lane.ms[index] || 0;
		if (ms > 0) {
			const group = groupFor(lane.projectId);
			group.ms = Math.max(group.ms, ms);
		}
		(lane.sessions || []).forEach(function(row, rowIndex) {
			if (row.id != null && !laneOrder.has(row.id)) laneOrder.set(row.id, rowIndex);
		});
	});
	const showSessions = model.hasSessions !== false;
	rows.forEach(function(row) {
		const usage = row.usage && typeof row.usage.get === "function" ? row.usage.get(index) : null;
		const ms = row.ms && row.ms[index] || 0;
		if (!usage && !(ms > 0)) return;
		const group = groupFor(row.projectId);
		let cost = summarizeCosts([]);
		if (usage) {
			cost = mergeCostSummaries([summarizeCosts(usage.details || [])].concat(usage.summaries || []));
			group.tokens += usage.tokens || 0;
			group.costSummaries.push(cost);
		}
		if (showSessions) {
			group.sessions.push({
				projectId: row.projectId,
				id: row.id,
				title: row.title,
				subagent: row.subagent,
				parentSession: row.parentSession,
				session: row.session,
				ms: ms,
				tokens: usage ? usage.tokens || 0 : 0,
				cost: cost
			});
		}
	});

	const list = Array.from(groups.values()).filter(function(group) {
		return group.ms > 0 || group.tokens > 0 || group.costSummaries.length > 0 || group.sessions.length > 0;
	});
	list.forEach(function(group) {
		group.cost = mergeCostSummaries(group.costSummaries);
		delete group.costSummaries;
		group.sessions.sort(function(a, b) {
			const orderA = laneOrder.has(a.id) ? laneOrder.get(a.id) : Infinity;
			const orderB = laneOrder.has(b.id) ? laneOrder.get(b.id) : Infinity;
			return (orderA - orderB) || String(a.id == null ? "" : a.id).localeCompare(String(b.id == null ? "" : b.id));
		});
	});
	list.sort(function(a, b) {
		return (b.ms - a.ms) || String(a.projectId).localeCompare(String(b.projectId));
	});
	const shown = list.slice(0, POP_PROJECTS).map(function(group) {
		const sessions = group.sessions.slice(0, POP_SESSIONS);
		return {
			projectId: group.projectId,
			name: group.name,
			colorIndex: group.colorIndex,
			ms: group.ms,
			tokens: group.tokens,
			cost: group.cost,
			sessions: sessions,
			moreSessions: group.sessions.length - sessions.length
		};
	});
	let totalMs = 0;
	list.forEach(function(group) { totalMs += group.ms; });
	return {
		projects: shown,
		moreProjects: list.length - shown.length,
		total: {
			ms: totalMs,
			tokens: model.slotTokens && Number.isFinite(model.slotTokens[index]) ? model.slotTokens[index] : 0,
			cost: model.slotCost && model.slotCost[index] ? model.slotCost[index] : summarizeCosts([])
		},
		parallel: list.length
	};
}

function dayCostSummaries(projects, hidden) {
	const byDay = new Map();
	(Array.isArray(projects) ? projects : []).forEach(function(project) {
		if (!project || isHidden(hidden, project.id)) return;
		(project.sessions || []).forEach(function(session) {
			if (!session) return;
			const rows = Array.isArray(session.slotUsage) ? session.slotUsage : [];
			if (rows.length) {
				const perDay = new Map();
				rows.forEach(function(row) {
					if (!row || !Number.isFinite(row.slot)) return;
					const day = localDayKey(row.slot * SLOT_MS);
					const details = perDay.get(day) || [];
					details.push(usageCostDetail(row, session.modelRaw || session.model, session.providerId, session.accountType));
					perDay.set(day, details);
				});
				perDay.forEach(function(details, day) {
					const summaries = byDay.get(day) || [];
					summaries.push(summarizeCosts(details));
					byDay.set(day, summaries);
				});
			} else {
				const timestamp = session.updatedAt != null ? session.updatedAt : session.createdAt;
				if (timestamp == null) return;
				const day = localDayKey(timestamp);
				const summaries = byDay.get(day) || [];
				summaries.push(sessionCostSummary(session));
				byDay.set(day, summaries);
			}
		});
	});
	const result = new Map();
	byDay.forEach(function(summaries, day) { result.set(day, mergeCostSummaries(summaries)); });
	return result;
}

function dayCostOf(dayCosts, date) {
	if (!dayCosts) return null;
	if (dayCosts instanceof Map) return dayCosts.get(date) || null;
	return dayCosts[date] || null;
}

function timelineRangeModel(input) {
	const options = input && typeof input === "object" ? input : {};
	const days = Array.isArray(options.days) ? options.days : [];
	const hidden = options.hidden && typeof options.hidden === "object" ? options.hidden : {};
	const today = isDateKey(options.today) ? options.today : null;
	const columns = options.columns === 24 ? 24 : 48;
	const per = 48 / columns;
	const activeOnly = options.activeOnly === true;
	const dayCosts = options.dayCosts;
	const colorIndexes = options.colorIndexes;
	const allDates = calendarDates(days, today);
	const dayMap = new Map();
	days.forEach(function(day) {
		const date = dateOf(day);
		if (date) dayMap.set(date, day);
	});
	const dayModels = new Map();
	allDates.forEach(function(date) {
		const slots = projectSlotMs(dayMap.get(date), hidden);
		const perProject = new Map();
		let total = 0;
		slots.forEach(function(entry, projectId) {
			let projectTotal = 0;
			for (let slot = 0; slot < 48; slot++) projectTotal += entry.ms[slot];
			perProject.set(projectId, projectTotal);
			total += projectTotal;
		});
		dayModels.set(date, { slots: slots, perProject: perProject, total: total });
	});
	const list = activeOnly ? allDates.filter(function(date) { return dayModels.get(date).total > 0; }) : allDates;
	const pageCount = Math.max(1, Math.ceil(list.length / TIMELINE_PAGE_DAYS));
	const requested = Number.isFinite(options.page) ? Math.floor(options.page) : 0;
	const currentPage = Math.min(Math.max(0, requested), pageCount - 1);
	const end = list.length - 1 - currentPage * TIMELINE_PAGE_DAYS;
	const pageDates = [];
	for (let index = end; index >= Math.max(0, end - TIMELINE_PAGE_DAYS + 1); index--) pageDates.push(list[index]);

	const rows = pageDates.map(function(date, rowIndex) {
		const data = dayModels.get(date);
		const byColumn = Array.from({ length: columns }, function() { return {}; });
		const projectIds = new Map();
		data.slots.forEach(function(entry, projectId) {
			projectIds.set(String(projectId), projectId);
			for (let slot = 0; slot < 48; slot++) {
				const value = entry.ms[slot];
				if (!value) continue;
				const column = Math.floor(slot / per);
				byColumn[column][projectId] = (byColumn[column][projectId] || 0) + value;
			}
		});
		const full = SLOT_MS * per;
		const cells = byColumn.map(function(by) {
			let sum = 0;
			Object.keys(by).forEach(function(projectId) { sum += by[projectId]; });
			const ms = Math.min(full, sum);
			const level = ms <= 0 ? 0 : ms < full * 0.25 ? 1 : ms < full * 0.5 ? 2 : ms < full * 0.75 ? 3 : 4;
			let dominant = null;
			let dominantMs = -1;
			Object.keys(by).sort().forEach(function(projectId) {
				if (by[projectId] > dominantMs) { dominantMs = by[projectId]; dominant = projectId; }
			});
			if (dominant != null) dominant = projectIds.get(dominant);
			return { level: level, dominant: dominant, by: by, ms: ms };
		});
		const projects = [];
		data.perProject.forEach(function(ms, projectId) {
			const entry = data.slots.get(projectId);
			const colorIndex = resolveColorIndex(colorIndexes, projectId, entry ? entry.colorIndex : null);
			projects.push({
				projectId: projectId,
				name: entry ? entry.name : "",
				colorIndex: colorIndex == null ? 0 : colorIndex,
				ms: ms
			});
		});
		projects.sort(function(a, b) { return (b.ms - a.ms) || String(a.projectId).localeCompare(String(b.projectId)); });
		const dow = new Date(date + "T00:00:00Z").getUTCDay();
		return {
			date: date,
			idle: data.total <= 0,
			newWeek: rowIndex > 0 && weekOf(date) !== weekOf(pageDates[rowIndex - 1]),
			weekend: dow === 0 || dow === 6,
			today: date === today,
			cells: cells,
			total: data.total,
			projects: projects,
			cost: dayCostOf(dayCosts, date) || summarizeCosts([])
		};
	});

	const profile = new Array(columns).fill(0);
	let maxDay = 0;
	rows.forEach(function(row) {
		maxDay = Math.max(maxDay, row.total);
		row.cells.forEach(function(cell, index) { profile[index] += cell.ms; });
	});
	let peak = null;
	for (let index = 0; index < profile.length; index++) {
		if (profile[index] > 0 && (peak == null || profile[index] > profile[peak])) peak = index;
	}

	// T10: the summary describes the rows on this page, not the full history.
	let activeDays = 0;
	let total = 0;
	let streak = 0;
	let longestStreak = 0;
	let previousActive = false;
	let previousDate = null;
	const costSummaries = [];
	rows.slice().reverse().forEach(function(row) {
		if (!row.idle) {
			activeDays++;
			streak = previousActive && previousDate && addDays(previousDate, 1) === row.date ? streak + 1 : 1;
			longestStreak = Math.max(longestStreak, streak);
			previousActive = true;
		} else {
			streak = 0;
			previousActive = false;
		}
		previousDate = row.date;
		total += row.total;
		if (row.cost) costSummaries.push(row.cost);
	});
	const from = pageDates.length ? pageDates[pageDates.length - 1] : "";
	const to = pageDates.length ? pageDates[0] : "";
	const spanDays = pageDates.length
		? Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 864e5) + 1
		: 0;

	return {
		rows: rows,
		pageCount: pageCount,
		currentPage: currentPage,
		profile: profile,
		peak: peak,
		maxDay: maxDay,
		summary: {
			from: from,
			to: to,
			rowCount: rows.length,
			spanDays: spanDays,
			activeDays: activeDays,
			total: total,
			avg: activeDays ? total / activeDays : 0,
			cost: mergeCostSummaries(costSummaries),
			streak: longestStreak
		}
	};
}

function timelineJumpSlot(day, hidden, col, per) {
	const width = Number.isFinite(per) && per > 0 ? Math.floor(per) : 1;
	const column = Number.isFinite(col) ? Math.max(0, Math.floor(col)) : 0;
	const base = Math.min(47, column * width);
	if (width <= 1) return base;
	const slots = projectSlotMs(day, hidden);
	let bestSlot = base;
	let bestValue = -1;
	for (let offset = 0; offset < width; offset++) {
		const slot = base + offset;
		if (slot >= 48) break;
		let value = 0;
		slots.forEach(function(entry) { value += entry.ms[slot] || 0; });
		if (value > bestValue) { bestValue = value; bestSlot = slot; }
	}
	return bestSlot;
}

module.exports = {
	TIMELINE_PAGE_DAYS,
	TIMELINE_LANE_PAGE,
	TIMELINE_SESSION_PAGE,
	POP_PROJECTS,
	POP_SESSIONS,
	TIMELINE_PREF_DEFAULTS,
	normalizeTimelinePrefs,
	addDays,
	weekOf,
	calendarDates,
	projectSlotMs,
	projectDurations,
	timelineWindow,
	timelineTicks,
	timelineGrid,
	timelineRuns,
	runSlotAt,
	sessionDaySlots,
	timelineDayModel,
	timelinePeak,
	timelineSlotDetail,
	dayCostSummaries,
	timelineRangeModel,
	timelineJumpSlot
};
