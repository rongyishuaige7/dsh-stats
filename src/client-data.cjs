// Pure statistics: date windows, prefs storage, projection aggregation, timeline and trend data.
let pricing = require("./pricing.cjs");
let routeData = require("./route-data.cjs");
const { BEIJING_OFFSET_MS, SLOT_MS, identityForUsage, mergeCostSummaries, projectCostSummary, sessionCostSummary, summarizeCosts, usageCostDetail } = require("./client-format.cjs");

// 把一组会话的展示统计重新求和（日期范围过滤后重建项目聚合）
function sumSessionStats(sessions) {
	var raw = { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 };
	sessions.forEach((s) => {
		var st = s.stats;
		raw.turns += st.turns; raw.steps += st.steps;
		raw.llmMs += st.llmMs; raw.toolMs += st.toolMs;
		raw.ttftMs += st.ttftMs; raw.ttftSteps += st.ttftSteps;
		raw.decodeMs += st.decodeMs; raw.decodeTokens += st.decodeTokens;
		raw.uncached += st.uncached; raw.output += st.output;
		raw.cacheRead += st.cacheRead; raw.cacheWrite += st.cacheWrite;
		raw.reasoning += st.reasoning || 0;
	});
	return display(raw);
}
function slotOnDate(slot, dateKey) {
	return localDayKey(slot * SLOT_MS) === dateKey;
}
function slotInWindow(slot, startMs, endMs) {
	var t = slot * SLOT_MS;
	return t >= startMs && t < endMs;
}

// 按北京时间日期过滤并重建聚合。宿主数据同时裁剪 activity slots、token slots
// 和 stats slots；因此无 token 的工具活动不会丢失，跨日会话也不会重复整段统计。
function applyWindow(projects, startMs, endMs) {
	if (startMs == null || endMs == null) return projects;
	return projects.map((p) => {
		var sessions = p.sessions.filter(function(s) {
			var usageTimestamp = s.updatedAt != null ? s.updatedAt : s.createdAt;
			var detailedRows = (s.slots || []).concat(s.slotStats || [], s.slotUsage || []);
			if (detailedRows.length) return detailedRows.some(function(x) { return slotInWindow(x.slot, startMs, endMs); });
			// 无逐槽数据（客户端近似）：退回按会话时间戳判断
			return usageTimestamp != null && usageTimestamp >= startMs && usageTimestamp < endMs;
		});
		if (!sessions.length) return null;
		// 裁剪每个会话到当天
		var clipped = sessions.map(function(s) {
			var hasDetailed = (s.slotUsage && s.slotUsage.length) || (s.slotStats && s.slotStats.length) || (s.slots && s.slots.length);
			if (!hasDetailed) return s;
			var su = (s.slotUsage || []).filter(function(u) { return slotInWindow(u.slot, startMs, endMs); });
			var ss = (s.slotStats || []).filter(function(x) { return slotInWindow(x.slot, startMs, endMs); });
			var activity = (s.slots || []).filter(function(x) { return slotInWindow(x.slot, startMs, endMs); });
			var tok = { uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 };
			su.forEach(function(u) {
				tok.uncached += u.uncached || 0;
				tok.output += u.output || 0;
				tok.cacheRead += u.cacheRead || 0;
				tok.cacheWrite += u.cacheWrite || 0;
				tok.reasoning += u.reasoning || 0;
			});
			var st = s.stats || {};
			var hasUsageData = Array.isArray(s.slotUsage) && s.slotUsage.length > 0;
			var hasStatData = Array.isArray(s.slotStats) && s.slotStats.length > 0;
			var usageTimestamp = s.updatedAt != null ? s.updatedAt : s.createdAt;
			var fallbackUsageInWindow = !hasUsageData && usageTimestamp != null && usageTimestamp >= startMs && usageTimestamp < endMs;
			var fallbackStatsInWindow = !hasStatData && usageTimestamp != null && usageTimestamp >= startMs && usageTimestamp < endMs;
			var timed = ss.reduce(function(acc, row) {
				acc.turns += row.turns || 0; acc.steps += row.steps || 0;
				acc.llmMs += row.llmMs || 0; acc.toolMs += row.toolMs || 0;
				acc.ttftMs += row.ttftMs || 0; acc.ttftSteps += row.ttftSteps || 0;
				acc.decodeMs += row.decodeMs || 0; acc.decodeTokens += row.decodeTokens || 0;
				return acc;
			}, { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0 });
			// 旧宿主或降级会话没有有效 slotStats 时，将会话级时间指标
			// 只归到时间戳所在窗口，避免跨日活动重复整段耗时。
			var newStats = display({
				turns: hasStatData ? timed.turns : fallbackStatsInWindow ? (st.turns || 0) : 0,
				steps: hasStatData ? timed.steps : fallbackStatsInWindow ? (st.steps || 0) : 0,
				llmMs: hasStatData ? timed.llmMs : fallbackStatsInWindow ? (st.llmMs || 0) : 0,
				toolMs: hasStatData ? timed.toolMs : fallbackStatsInWindow ? (st.toolMs || 0) : 0,
				ttftMs: hasStatData ? timed.ttftMs : fallbackStatsInWindow ? (st.ttftMs || 0) : 0,
				ttftSteps: hasStatData ? timed.ttftSteps : fallbackStatsInWindow ? (st.ttftSteps || 0) : 0,
				decodeMs: hasStatData ? timed.decodeMs : fallbackStatsInWindow ? (st.decodeMs || 0) : 0,
				decodeTokens: hasStatData ? timed.decodeTokens : fallbackStatsInWindow ? (st.decodeTokens || 0) : 0,
				uncached: hasUsageData ? tok.uncached : fallbackUsageInWindow ? (st.uncached || 0) : 0,
				output: hasUsageData ? tok.output : fallbackUsageInWindow ? (st.output || st.outputTokens || 0) : 0,
				cacheRead: hasUsageData ? tok.cacheRead : fallbackUsageInWindow ? (st.cacheRead || 0) : 0,
				cacheWrite: hasUsageData ? tok.cacheWrite : fallbackUsageInWindow ? (st.cacheWrite || 0) : 0,
				reasoning: hasUsageData ? tok.reasoning : fallbackUsageInWindow ? (st.reasoning || 0) : 0
			});
			var clippedSession = { ...s, slots: activity, slotStats: ss, slotUsage: su, stats: newStats, durMs: newStats.llmMs + newStats.toolMs };
			// 宿主逐槽费用必须和当前窗口使用同一批 usage；粗粒度费用
			// 只归到会话时间戳所在的窗口，不能在每个活动日重复出现。
			clippedSession.cost = hasUsageData
				? summarizeCosts(su.map(function(usage) { return usageCostDetail(usage, s.modelRaw || s.model, s.providerId, s.accountType); }))
				: fallbackUsageInWindow ? sessionCostSummary(clippedSession) : summarizeCosts([]);
			return clippedSession;
		});
		var clippedProject = { ...p, sessions: clipped, sessionCount: clipped.length, subagentCount: clipped.filter((s) => s.subagent).length,
			lastActiveAt: clipped.reduce(function(max, s) { return Math.max(max || 0, s.updatedAt || 0); }, 0) || null,
			stats: sumSessionStats(clipped) };
		clippedProject.cost = projectCostSummary(clippedProject);
		return clippedProject;
	}).filter(Boolean);
}

function applyDate(projects, dateKey) {
	if (!dateKey) return projects;
	var start = Date.parse(dateKey + "T00:00:00+08:00");
	return applyWindow(projects, start, start + 86400000);
}
function applyRange(projects, endKey, days) {
	if (!endKey || !days) return projects;
	var end = Date.parse(endKey + "T00:00:00+08:00") + 86400000;
	return applyWindow(projects, end - days * 86400000, end);
}

// 活动日列表（timeline 里有活动的日期，升序）
function activityDates(timeline) {
	var dates = (timeline && timeline.days ? timeline.days : []).map(function(d) { return d.date; });
	dates.sort();
	return dates;
}

// 中文日期：2026年8月16日 周六
function fmtDateCN(dateKey) {
	if (!dateKey) return "—";
	var d = new Date(dateKey + "T00:00:00Z");
	var DOW = ["日","一","二","三","四","五","六"];
	return dateKey.slice(0, 4) + "年" + Number(dateKey.slice(5, 7)) + "月" + Number(dateKey.slice(8, 10)) + "日 周" + DOW[d.getUTCDay()];
}

// 偏好持久化（localStorage）
function loadPref(key, def) {
	try {
		var v = localStorage.getItem("dsh-stats." + key);
		return v == null ? def : JSON.parse(v);
	} catch (err) { return def; }
}
function savePref(key, val) {
	try { localStorage.setItem("dsh-stats." + key, JSON.stringify(val)); } catch (err) {}
}

// ------------------------------------------------------------------
// 聚合（数据源：session.list 的 projectionValues）
// ------------------------------------------------------------------
function isRecord(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
function usableString(value) {
	if (typeof value !== "string") return null;
	var text = value.trim();
	return text && text !== "(unknown)" ? text : null;
}
function usableProvider(value) {
	var text = usableString(value);
	return text && text !== "unknown" ? text : null;
}
function nonNegativeFinite(value) {
	return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}
function unwrapProjectionValue(value) {
	// The browser normally receives the projection view directly. A few rc6
	// bridges expose the persisted { ver, seq, val } row instead, so unwrap it
	// without requiring a second host round trip.
	if (isRecord(value) && Object.prototype.hasOwnProperty.call(value, "val") &&
		(Object.prototype.hasOwnProperty.call(value, "ver") || Object.prototype.hasOwnProperty.call(value, "seq"))) return value.val;
	return value;
}
function projectionValuesOf(s) {
	var direct = s && s.projectionValues;
	if (isRecord(direct)) return direct;
	var block = s && s.projections;
	if (isRecord(block?.values)) return block.values;
	var rows = s && s.rows;
	if (!isRecord(rows)) return {};
	var values = {};
	Object.keys(rows).forEach(function(key) { values[key] = unwrapProjectionValue(rows[key]); });
	return values;
}
function projectionValueOf(s, key) {
	var direct = s && s.projectionValues;
	if (isRecord(direct) && Object.prototype.hasOwnProperty.call(direct, key)) return unwrapProjectionValue(direct[key]);
	var block = s && s.projections;
	if (isRecord(block?.values) && Object.prototype.hasOwnProperty.call(block.values, key)) return unwrapProjectionValue(block.values[key]);
	var rows = s && s.rows;
	if (isRecord(rows) && Object.prototype.hasOwnProperty.call(rows, key)) return unwrapProjectionValue(rows[key]);
	var values = projectionValuesOf(s);
	if (Object.prototype.hasOwnProperty.call(values, key)) return unwrapProjectionValue(values[key]);
	return undefined;
}
function routeRowsOf(route) {
	try { return routeData.routeRows(route); } catch { return []; }
}
function ownRouteRowsOf(s) {
	var route = projectionValueOf(s, "statsRoute");
	if (!isRecord(route)) return null;
	if (route.routeTree === undefined && !Array.isArray(route.routes) && !(isRecord(route.routes) && Object.keys(route.routes).length)) return null;
	try {
		var rows = routeData.routeRows(route);
		return rows.every(function(row) {
			return isRecord(row) && (Number.isSafeInteger(row.slot) && row.slot >= 0 || Number.isFinite(row.time) && row.time >= 0) &&
				["uncached", "output", "cacheRead", "cacheWrite", "reasoning"].every(function(key) { return row[key] == null || Number.isFinite(row[key]) && row[key] >= 0; });
		}) ? rows : null;
	} catch { return null; }
}
function routeRowWeight(row) {
	return nonNegativeFinite(row?.uncached) + nonNegativeFinite(row?.output) +
		nonNegativeFinite(row?.cacheRead) + nonNegativeFinite(row?.cacheWrite);
}
function compareRouteRows(a, b) {
	return (nonNegativeFinite(a?.slot) - nonNegativeFinite(b?.slot)) ||
		String(a?.providerId || "").localeCompare(String(b?.providerId || "")) ||
		String(a?.model || "").localeCompare(String(b?.model || ""));
}
function projectionIdentityOf(s) {
	var route = projectionValueOf(s, "statsRoute");
	var current = isRecord(route?.current) ? route.current : {};
	var rows = routeRowsOf(route).filter(function(row) { return isRecord(row) && usableString(row.model); }).sort(compareRouteRows);
	var primary = routeData.primaryRoute(rows, null);
	var topModel = usableString(s?.modelRaw) || usableString(s?.model);
	var source = topModel ? { model: topModel, providerId: usableProvider(s?.providerId) || current.providerId, accountType: usableString(s?.accountType) || current.accountType } : primary || current;
	var modelRaw = topModel || usableString(source.model) || "(unknown)";
	var providerId = usableProvider(s?.providerId) || usableProvider(source.providerId) || usableProvider(primary?.providerId) || "unknown";
	var accountType = usableString(s?.accountType) || usableString(source.accountType) || "api";
	var at = Number.isFinite(s?.updatedAt) ? s.updatedAt : Date.now();
	var normalized = pricing.normalizeIdentity(providerId, modelRaw, accountType, at);
	return {
		model: modelRaw === "(unknown)" ? null : modelRaw,
		modelRaw: normalized.modelRaw,
		modelCanonical: usableString(s?.modelCanonical) || normalized.modelCanonical,
		providerId: normalized.providerId,
		providerFamily: usableProvider(s?.providerFamily) || normalized.providerFamily,
		accountType: normalized.accountType
	};
}
function projectionSlotUsageOf(s, identity) {
	return (ownRouteRowsOf(s) || []).filter(function(row) {
		return routeRowWeight(row) > 0;
	}).map(function(row) {
		var modelRaw = usableString(row.model) || "(unknown)";
		var providerId = usableProvider(row.providerId) || identity.providerId;
		var accountType = usableString(row.accountType) || identity.accountType;
		var normalized = pricing.normalizeIdentity(providerId, modelRaw, accountType,
			Number.isFinite(row.time) ? row.time : Date.now());
		var uncached = nonNegativeFinite(row.uncached);
		var output = nonNegativeFinite(row.output);
		var cacheRead = nonNegativeFinite(row.cacheRead);
		var cacheWrite = nonNegativeFinite(row.cacheWrite);
		var contextTokens = Number.isFinite(row.contextTokens) ? row.contextTokens : uncached + cacheRead + cacheWrite;
		var slot = Number.isSafeInteger(row.slot) && row.slot >= 0 ? row.slot :
			Number.isFinite(row.time) && row.time >= 0 ? Math.floor(row.time / SLOT_MS) : null;
		if (slot === null) return null;
		return {
			model: normalized.modelRaw,
			providerId: normalized.providerId,
			providerFamily: normalized.providerFamily,
			modelRaw: normalized.modelRaw,
			modelCanonical: normalized.modelCanonical,
			accountType: normalized.accountType,
			serviceTier: pricing.normalizeServiceTier(row.serviceTier),
			contextTokens,
			contextOver512k: contextTokens > 512000,
			pricingIncomplete: !Number.isFinite(row.contextTokens) || !Number.isSafeInteger(row.count),
			slot,
			uncached,
			output,
			cacheRead,
			cacheWrite,
			reasoning: nonNegativeFinite(row.reasoning)
		};
	}).filter(Boolean);
}
function enrichSessionProjection(s) {
	if (!isRecord(s)) return s;
	var identity = projectionIdentityOf(s);
	var slots = projectionSlotUsageOf(s, identity);
	var next = s;
	var updates = {};
	var route = projectionValueOf(s, "statsRoute");
	if (!usableString(s.parentSession) && usableString(route?.parentSession)) updates.parentSession = route.parentSession;
	if (!usableString(s.origin) && usableString(route?.origin)) updates.origin = route.origin;
	if (!s.quality) updates.quality = ownRouteRowsOf(s) === null ? "partial" : "exact";
	if (!usableString(s.model) && identity.model) updates.model = identity.model;
	if (!usableString(s.modelRaw) && identity.modelRaw !== "(unknown)") updates.modelRaw = identity.modelRaw;
	if (!usableString(s.modelCanonical) && identity.modelCanonical !== "(unknown)") updates.modelCanonical = identity.modelCanonical;
	if (!usableProvider(s.providerId) && identity.providerId !== "unknown") updates.providerId = identity.providerId;
	if (!usableProvider(s.providerFamily) && identity.providerFamily !== "unknown") updates.providerFamily = identity.providerFamily;
	if (!usableString(s.accountType)) updates.accountType = identity.accountType;
	if ((!Array.isArray(s.slotUsage) || !s.slotUsage.length) && slots.length) updates.slotUsage = slots;
	if (Object.keys(updates).length) next = { ...s, ...updates };
	return next;
}
function clientSessionIdentityFields(s) {
	var model = usableString(s?.model) || usableString(s?.modelRaw);
	return {
		parentSession: usableString(s?.parentSession),
		quality: s?.quality || "partial",
		model: model || null,
		providerId: usableProvider(s?.providerId) || "unknown",
		providerFamily: usableProvider(s?.providerFamily) || "unknown",
		modelRaw: usableString(s?.modelRaw) || model || "(unknown)",
		modelCanonical: usableString(s?.modelCanonical) || model || "(unknown)",
		accountType: usableString(s?.accountType) || "api"
	};
}
function rawOf(s) {
	var b = projectionValueOf(s, "tokenUsage");
	b = b ? (b.totals || b) : {};
	var st = projectionValueOf(s, "sessionStats") || {};
	var route = projectionValueOf(s, "statsRoute");
	var hasOwnUsage = ownRouteRowsOf(s) !== null;
	if (hasOwnUsage) {
		var own = { uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0 };
		(s.slotUsage || projectionSlotUsageOf(s, projectionIdentityOf(s))).forEach(function(row) {
			own.uncachedInputTokens += row.uncached || 0; own.outputTokens += row.output || 0;
			own.cacheReadTokens += row.cacheRead || 0; own.cacheWriteTokens += row.cacheWrite || 0;
			own.reasoningTokens += row.reasoning || 0;
		});
		b = own;
	} else if (s.parentSession || route?.parentSession || s.isSeeded) {
		// Official token totals may include the parent's entire seed history.
		b = {};
	}
	return {
		turns: st.turns || 0, steps: st.steps || 0,
		llmMs: st.llmMs || 0, toolMs: st.toolMs || 0,
		ttftMs: st.ttftMs || 0, ttftSteps: st.ttftSteps || 0,
		decodeMs: st.decodeMs || 0, decodeTokens: st.decodeTokens || 0,
		uncached: b.uncachedInputTokens || 0, output: b.outputTokens || 0,
		cacheRead: b.cacheReadTokens || 0, cacheWrite: b.cacheWriteTokens || 0,
		reasoning: b.reasoningTokens || 0
	};
}
function display(raw) {
	var input = raw.uncached + raw.cacheRead + raw.cacheWrite;
	return {
		turns: raw.turns, steps: raw.steps, llmMs: raw.llmMs, toolMs: raw.toolMs,
		ttftMs: raw.ttftMs, ttftSteps: raw.ttftSteps, decodeMs: raw.decodeMs, decodeTokens: raw.decodeTokens,
		uncached: raw.uncached, output: raw.output, cacheRead: raw.cacheRead, cacheWrite: raw.cacheWrite,
		reasoning: raw.reasoning || 0,
		inputTokens: input, outputTokens: raw.output,
		cacheHitPct: input > 0 ? Math.round(raw.cacheRead / input * 100) : null,
		tps: raw.decodeMs > 0 ? raw.decodeTokens / (raw.decodeMs / 1000) : null,
		ttftAvgMs: raw.ttftSteps > 0 ? raw.ttftMs / raw.ttftSteps : null
	};
}
// 日期范围内只展示有 token 消耗的项目卡片；纯工具活动仍保留给时间线使用。
function hasTokenUsage(project) {
	var stats = project && project.stats;
	return !!stats && ((stats.inputTokens || 0) > 0 || (stats.outputTokens || 0) > 0);
}
function emptyRaw() {
	return { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 };
}
function addRaw(a, b) {
	a.turns += b.turns; a.steps += b.steps; a.llmMs += b.llmMs; a.toolMs += b.toolMs;
	a.ttftMs += b.ttftMs; a.ttftSteps += b.ttftSteps; a.decodeMs += b.decodeMs; a.decodeTokens += b.decodeTokens;
	a.uncached += b.uncached; a.output += b.output; a.cacheRead += b.cacheRead; a.cacheWrite += b.cacheWrite;
	a.reasoning += b.reasoning || 0;
}
function basename(p) {
	return (p || "").replace(/[/\\]+$/, "").split(/[/\\]/).pop() || "";
}

function aggregate(sessionSummaries, workspaceItems, t, archivedIds) {
	sessionSummaries = (sessionSummaries || []).map(enrichSessionProjection).filter(isRecord);
	var byId = new Map();
	sessionSummaries.forEach((s) => byId.set(s.id, s));
	var archivedSet = new Set(archivedIds || []);
	var isBlank = function(s) {
		var metadata = projectionValueOf(s, "sessionListMetadata");
		return s.blank === true || metadata?.blank === true;
	};
	var isArchived = function(s) { return s.archived === true || archivedSet.has(s.id); };
	var projects = [];
	var accounted = new Set();

	(workspaceItems || []).forEach((ws) => {
		var members = [];
		(ws.sessionIds || []).forEach((id) => {
			var s = byId.get(id);
			if (s && !accounted.has(id)) { accounted.add(id); members.push(s); }
		});
		var agg = emptyRaw();
		var sessions = [];
		var lastActiveAt = null;
		var subagentCount = 0;
		members.forEach((s) => {
			if (isBlank(s)) return;
			var raw = rawOf(s);
			addRaw(agg, raw);
			if (s.origin === "subagent") subagentCount++;
			sessions.push({
				id: s.id,
				title: s.title || s.displayTitle || null,
				updatedAt: s.updatedAt || null,
				...clientSessionIdentityFields(s),
				...(Array.isArray(s.slotUsage) && s.slotUsage.length ? { slotUsage: s.slotUsage } : {}),
				subagent: s.origin === "subagent",
				archived: isArchived(s),
				stats: display(raw),
				durMs: raw.llmMs + raw.toolMs
			});
			if (s.updatedAt != null && (lastActiveAt == null || s.updatedAt > lastActiveAt)) lastActiveAt = s.updatedAt;
		});
		sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
		projects.push({
			id: ws.workspaceId || ("ws-" + (ws.path || "")),
			name: ws.title || basename(ws.path) || t("w.unnamed"),
			path: ws.path || "",
			sessionCount: sessions.length,
			lastActiveAt,
			subagentCount,
			stats: display(agg),
			sessions
		});
	});

	// 未归入任何工作区的会话，按 cwd 分组兜底
	var strayByCwd = new Map();
	sessionSummaries.forEach((s) => {
		if (accounted.has(s.id)) return;
		var cwd = s.cwd || t("w.uncategorized");
		if (!strayByCwd.has(cwd)) strayByCwd.set(cwd, []);
		strayByCwd.get(cwd).push(s);
	});
	strayByCwd.forEach((members, cwd) => {
		var agg = emptyRaw();
		var sessions = [];
		var lastActiveAt = null;
		var subagentCount = 0;
		members.forEach((s) => {
			if (isBlank(s)) return;
			var raw = rawOf(s);
			addRaw(agg, raw);
			sessions.push({ id: s.id, title: s.title || s.displayTitle || null, updatedAt: s.updatedAt || null, ...clientSessionIdentityFields(s), ...(Array.isArray(s.slotUsage) && s.slotUsage.length ? { slotUsage: s.slotUsage } : {}), subagent: s.origin === "subagent", archived: isArchived(s), stats: display(raw), durMs: raw.llmMs + raw.toolMs });
			if (s.origin === "subagent") subagentCount++;
			if (s.updatedAt != null && (lastActiveAt == null || s.updatedAt > lastActiveAt)) lastActiveAt = s.updatedAt;
		});
		sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
		projects.push({ id: "cwd-" + cwd, name: cwd === t("w.uncategorized") ? cwd : basename(cwd), path: cwd, sessionCount: sessions.length, subagentCount: subagentCount, lastActiveAt, stats: display(agg), sessions });
	});

	projects.sort((a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0));
	return projects;
}

// ------------------------------------------------------------------
// 时间线（Tier 1：会话粒度，用 updatedAt 与 llm+tool 时长近似）
// ------------------------------------------------------------------
function dayKey(ms) {
	return localDayKey(ms);
}
function dayStartMs(key) {
	return new Date(key + "T00:00:00+08:00").getTime();
}
function dateKeyOffset(key, delta) {
	return new Date(Date.parse(key + "T00:00:00Z") + delta * 86400000).toISOString().slice(0, 10);
}
function buildTimeline(projects, slotMinutes) {
	var slotMs = slotMinutes * 60000;
	var daysMap = new Map();
	var projectIndex = new Map();
	projects.forEach((p, i) => projectIndex.set(p.id, i));

	projects.forEach((p) => {
		p.sessions.forEach((s) => {
			if (!s.updatedAt) return;
			var duration = Math.max(s.durMs || 0, 0);
			var start = duration > 0 ? s.updatedAt - duration : s.updatedAt;
			var end = duration > 0 ? s.updatedAt : s.updatedAt + 60000;
			var startSlot = Math.floor(start / slotMs);
			var endSlot = Math.floor(end / slotMs);
			for (var k = startSlot; k <= endSlot; k++) {
				var overlap = Math.min(end, (k + 1) * slotMs) - Math.max(start, k * slotMs);
				if (overlap <= 0) continue;
				var date = dayKey(k * slotMs);
				var day = daysMap.get(date);
				if (!day) { day = { date, dayTotalMs: 0, slotBlocks: [] }; daysMap.set(date, day); }
				day.dayTotalMs += overlap;
				day.slotBlocks.push({
					slot: Math.floor((k * slotMs - dayStartMs(date)) / slotMs),
					projectId: p.id,
					name: p.name,
					colorIndex: projectIndex.get(p.id),
					ms: overlap
				});
			}
		});
	});

	var days = [...daysMap.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
	days.forEach((d) => d.slotBlocks.sort((a, b) => a.slot - b.slot));
	return { days };
}

// ------------------------------------------------------------------
// 打开状态 store（触发器与面板共享）
// ------------------------------------------------------------------
function createOpenStore() {
	var state = { open: false };
	var listeners = new Set();
	return {
		getSnapshot: () => state,
		subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
		open: () => { state = { open: true }; listeners.forEach((fn) => fn()); },
		close: () => { state = { open: false }; listeners.forEach((fn) => fn()); }
	};
}

// ------------------------------------------------------------------
// 全局聚合（用于用量趋势 / 概览卡片）：按天 token、模型分布、连续天数
// ------------------------------------------------------------------
function localDayKey(ts) {
	var d = new Date(ts + BEIJING_OFFSET_MS);
	var y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
	return y + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day);
}
function emptyBucket() {
	return { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, input: 0 };
}
function addBucket(a, b) {
	a.turns += b.turns || 0; a.steps += b.steps || 0;
	a.llmMs += b.llmMs || 0; a.toolMs += b.toolMs || 0;
	a.ttftMs += b.ttftMs || 0; a.ttftSteps += b.ttftSteps || 0;
	a.decodeMs += b.decodeMs || 0; a.decodeTokens += b.decodeTokens || 0;
	a.uncached += b.uncached || 0; a.output += b.output || 0;
	a.cacheRead += b.cacheRead || 0; a.cacheWrite += b.cacheWrite || 0;
	a.reasoning += b.reasoning || 0;
	a.input += (b.uncached || 0) + (b.cacheRead || 0) + (b.cacheWrite || 0);
}

// 把会话 token 按天分布：优先用 slotUsage（30 分钟槽含真实时间戳），
// 无 slotUsage（纯客户端近似）才退化为 updatedAt 落唯一一天。
function sessionDayTokens(sessions) {
	var byDay = new Map();
	var getDay = function(k) {
		var b = byDay.get(k);
		if (!b) { b = emptyBucket(); byDay.set(k, b); }
		return b;
	};
	sessions.forEach(function(s) {
		var st = s.stats || {};
		var hasUsageSlots = !!(s.slotUsage && s.slotUsage.length);
		var hasStatSlots = !!(s.slotStats && s.slotStats.length);
		var hasActivitySlots = !!(s.slots && s.slots.length);
		var detailed = hasUsageSlots || hasStatSlots || hasActivitySlots;
		if (hasUsageSlots) {
			s.slotUsage.forEach(function(su) {
				var k = localDayKey(su.slot * 1800000);
				var b = getDay(k);
				b.uncached += su.uncached || 0;
				b.output += su.output || 0;
				b.cacheRead += su.cacheRead || 0;
				b.cacheWrite += su.cacheWrite || 0;
				b.reasoning += su.reasoning || 0;
				b.input += (su.uncached || 0) + (su.cacheRead || 0) + (su.cacheWrite || 0);
			});
		}
		if (hasStatSlots) {
			(s.slotStats || []).forEach(function(ss) {
				var b = getDay(localDayKey(ss.slot * SLOT_MS));
				b.turns += ss.turns || 0; b.steps += ss.steps || 0;
				b.llmMs += ss.llmMs || 0; b.toolMs += ss.toolMs || 0;
				b.ttftMs += ss.ttftMs || 0; b.ttftSteps += ss.ttftSteps || 0;
				b.decodeMs += ss.decodeMs || 0; b.decodeTokens += ss.decodeTokens || 0;
			});
		}
		if (hasActivitySlots) {
			s.slots.forEach(function(slot) { getDay(localDayKey(slot.slot * SLOT_MS)); });
		}
		if (detailed && !hasStatSlots) {
			var legacyTs = s.updatedAt || s.createdAt;
			if (legacyTs) {
				var legacy = getDay(localDayKey(legacyTs));
				legacy.turns += st.turns || 0; legacy.steps += st.steps || 0;
				legacy.llmMs += st.llmMs || 0; legacy.toolMs += st.toolMs || 0;
			}
		}
		var ts = s.updatedAt || s.createdAt;
		if (!ts) return;
		var b = getDay(localDayKey(ts));
		if (!detailed) {
			b.turns += st.turns || 0; b.steps += st.steps || 0;
			b.llmMs += st.llmMs || 0; b.toolMs += st.toolMs || 0;
		}
		if (!hasUsageSlots) {
			var output = st.output != null ? st.output : st.outputTokens || 0;
			var input = st.inputTokens != null ? st.inputTokens : (st.uncached || 0) + (st.cacheRead || 0) + (st.cacheWrite || 0);
			b.output += output;
			b.uncached += st.uncached || 0;
			b.cacheRead += st.cacheRead || 0;
			b.cacheWrite += st.cacheWrite || 0;
			b.reasoning += st.reasoning || 0;
			b.input += input;
		}
	});
	return byDay;
}

// 在 dayTokens 基础上按月聚合（每月一行），用于长周期条形图。
function monthlyFromDays(byDay) {
	var byMonth = new Map();
	byDay.forEach((b, day) => {
		var mk = day.slice(0, 7); // YYYY-MM
		var m = byMonth.get(mk) || emptyBucket();
		addBucket(m, b);
		byMonth.set(mk, m);
	});
	return byMonth;
}

// 一年（52 周左右）按周聚合：周日作为周首。返回 [weekStartISO, bucket][] 已排序。
function weeklyFromDays(byDay) {
	var byWeek = new Map();
	byDay.forEach((b, day) => {
		var d = new Date(day + "T00:00:00Z");
		var dow = d.getUTCDay(); // 0..6, Sun=0
		d.setUTCDate(d.getUTCDate() - dow); // back to Sunday
		var wk = d.toISOString().slice(0, 10);
		var w = byWeek.get(wk) || emptyBucket();
		addBucket(w, b);
		byWeek.set(wk, w);
	});
	return byWeek;
}

function modelNameOnly(value) {
	return value?.modelCanonical || value?.modelRaw || value?.model || "(unknown)";
}

function modelDisplayName(value) {
	var model = modelNameOnly(value);
	var provider = value?.providerId;
	return provider && provider !== "unknown" ? provider + " · " + model : model;
}

function modelTokenTotal(value) {
	return (value?.uncached || 0) + (value?.cacheRead || 0) + (value?.cacheWrite || 0) + (value?.output || 0);
}

// 模型分布按 provider + model + accountType 分组，同名模型不跨 Provider 合并。
function modelAgg(sessions) {
	var byModel = new Map();
	sessions.forEach((s) => {
		var st = s.stats || {};
		// 逐槽逐模型分布（宿主提供）：slotUsage 已带 model，各模型 token 各归其位；
		// 无逐槽数据（客户端近似）时退化为会话主要模型单条目。
		var modelTok = new Map();
		if (s.slotUsage && s.slotUsage.length) {
			s.slotUsage.forEach((su) => {
				// 某些日志会写入只有路由元数据、没有 token 的 usage 行；它们不应成为模型分布条目。
				if (modelTokenTotal(su) <= 0) return;
				var identity = identityForUsage(su, s.modelRaw || s.model, s.providerId, s.accountType);
				var mk = [identity.providerId, identity.modelRaw, identity.accountType].join("\u0000");
				var t = modelTok.get(mk) || { key: mk, model: identity.modelRaw, providerId: identity.providerId, providerFamily: identity.providerFamily, modelRaw: identity.modelRaw, modelCanonical: identity.modelCanonical, accountType: identity.accountType, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, costs: [] };
				t.uncached += su.uncached || 0;
				t.output += su.output || 0;
				t.cacheRead += su.cacheRead || 0;
				t.cacheWrite += su.cacheWrite || 0;
				t.reasoning += su.reasoning || 0;
				t.costs.push(usageCostDetail(su, s.modelRaw || s.model, s.providerId, s.accountType));
				modelTok.set(mk, t);
			});
		}
		var entries = modelTok.size
			? Array.from(modelTok.values()).map(function(t) { return { ...t, costSummary: summarizeCosts(t.costs) }; })
			: (function() {
				var usage = { model: s.modelRaw || s.model || "(unknown)", slot: Math.floor((s.updatedAt || Date.now()) / SLOT_MS) };
				if (Object.prototype.hasOwnProperty.call(s, "providerId")) usage.providerId = s.providerId;
				if (s.accountType) usage.accountType = s.accountType;
				var identity = identityForUsage(usage, usage.model, undefined, s.accountType);
				return [{
					key: [identity.providerId, identity.modelRaw, identity.accountType].join("\u0000"), model: identity.modelRaw,
					providerId: identity.providerId, providerFamily: identity.providerFamily, modelRaw: identity.modelRaw, modelCanonical: identity.modelCanonical, accountType: identity.accountType,
					uncached: st.uncached != null ? st.uncached : Math.max(0, (st.inputTokens || 0) - (st.cacheRead || 0) - (st.cacheWrite || 0)),
					output: st.output != null ? st.output : (st.outputTokens || 0),
					cacheRead: st.cacheRead || 0, cacheWrite: st.cacheWrite || 0, reasoning: st.reasoning || 0,
					costSummary: sessionCostSummary(s)
				}];
			})();
		// 有全零逐槽行时回退到会话级统计；若两者都没有 token，则跳过该会话。
		entries = entries.filter(function(entry) { return modelTokenTotal(entry) > 0; });
		if (!entries.length) return;
		// 会话总 token（用于 LLM/工具时长按占比分摊到各模型）
		var sessTok = 0;
		entries.forEach((e) => { sessTok += modelTokenTotal(e); });
		entries.forEach((e) => {
			var m = e.key;
			var cur = byModel.get(m) || { key: m, model: e.model, providerId: e.providerId, providerFamily: e.providerFamily, modelRaw: e.modelRaw, modelCanonical: e.modelCanonical, accountType: e.accountType, sessions: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, llmMs: 0, toolMs: 0, costSummaries: [] };
			cur.sessions += 1;
			cur.input += (e.uncached || 0) + (e.cacheRead || 0) + (e.cacheWrite || 0);
			cur.output += e.output || 0;
			cur.cacheRead += e.cacheRead || 0;
			cur.cacheWrite += e.cacheWrite || 0;
			cur.reasoning += e.reasoning || 0;
			cur.costSummaries.push(e.costSummary);
			// DSH 无逐模型时长数据：按 token 占比分摊会话 LLM/工具时长（近似合理）
			var share = sessTok > 0 ? modelTokenTotal(e) / sessTok : 0;
			cur.llmMs += Math.round((st.llmMs || 0) * share);
			cur.toolMs += Math.round((st.toolMs || 0) * share);
			byModel.set(m, cur);
		});
	});
	return Array.from(byModel.values()).map(function(model) {
		var costSummary = mergeCostSummaries(model.costSummaries);
		var single = costSummary.totals.length === 1 ? costSummary.totals[0].amount : 0;
		return { ...model, displayName: modelDisplayName(model), costSummary, cost: single, costKnown: costSummary.status === "exact" && costSummary.totals.length === 1 };
	}).sort((a, b) => b.input + b.output - (a.input + a.output));
}

// 连续天数与活跃天数：以 byDay 为输入（key 为 YYYY-MM-DD）。
function streakAndActive(byDay) {
	var dates = Array.from(byDay.keys()).sort();
	var activeDays = dates.length;
	if (!activeDays) return { activeDays: 0, currentStreak: 0, longestStreak: 0, firstDay: null, lastDay: null };
	var longest = 1, run = 1;
	for (var i = 1; i < dates.length; i++) {
		var prev = Date.parse(dates[i - 1] + "T00:00:00Z");
		var cur = Date.parse(dates[i] + "T00:00:00Z");
		if (cur - prev === 86400000) { run++; if (run > longest) longest = run; } else run = 1;
	}
	// 当前连续：以 lastDay 为起点往前回溯
	var last = dates[dates.length - 1];
	var cursor = Date.parse(last + "T00:00:00Z");
	var set = new Set(dates);
	var current = 0;
	while (set.has(new Date(cursor).toISOString().slice(0, 10))) { current++; cursor -= 86400000; }
	return { activeDays, currentStreak: current, longestStreak: longest, firstDay: dates[0], lastDay: last };
}

// 全局聚合：在 useMemo 中复用，减少重复计算
function buildGlobals(projects) {
	var all = [];
	for (var i = 0; i < projects.length; i++) {
		var ps = projects[i].sessions || [];
		for (var j = 0; j < ps.length; j++) all.push(ps[j]);
	}
	var byDay = sessionDayTokens(all);
	var models = modelAgg(all);
	var sa = streakAndActive(byDay);
	var totals = emptyBucket();
	byDay.forEach(function(b) { addBucket(totals, b); });
	var totalCost = mergeCostSummaries(all.map(sessionCostSummary));
	return {
		sessions: all,
		byDay, models, totals,
		streak: sa.currentStreak, longestStreak: sa.longestStreak, activeDays: sa.activeDays,
		firstDay: sa.firstDay, lastDay: sa.lastDay,
		totalCost
	};
}

module.exports = { activityDates, addBucket, aggregate, applyDate, applyRange, buildGlobals, buildTimeline, createOpenStore, display, emptyBucket, enrichSessionProjection, fmtDateCN, hasTokenUsage, loadPref, localDayKey, modelAgg, modelDisplayName, modelNameOnly, monthlyFromDays, projectionIdentityOf, projectionSlotUsageOf, savePref, sessionDayTokens, streakAndActive, weeklyFromDays };
