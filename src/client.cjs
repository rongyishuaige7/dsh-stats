let react = require("react");
let primitives = require("@deepseek-ai/dsh-client-ui-primitives");
let pricing = require("./pricing.cjs");

var e = react.createElement;
var useState = react.useState;
var useMemo = react.useMemo;
var useEffect = react.useEffect;
var Fragment = react.Fragment;
var IconDataOutline16 = primitives.IconDataOutline16;
var IconCloseOutline16 = primitives.IconCloseOutline16;
var BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
var MAX_VISIBLE_PROJECTS = 7;
var MAX_VISIBLE_TIMELINE_DAYS = 3;
var MAX_VISIBLE_MODELS = 3;

// ------------------------------------------------------------------
// 格式化
// ------------------------------------------------------------------
function fmtTokens(n) {
	if (n == null || !Number.isFinite(n)) return "—";
	var scaled = (v) => (v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));
	if (n < 1e3) return String(Math.round(n));
	if (n < 1e6) return `${scaled(n / 1e3)}K`;
	return `${scaled(n / 1e6)}M`;
}
function fmtDuration(ms) {
	if (ms == null || !Number.isFinite(ms) || ms <= 0) return "—";
	var s = ms / 1000;
	if (s < 60) return `${Math.round(s * 10) / 10}s`;
	var whole = Math.round(s);
	var h = Math.floor(whole / 3600);
	var m = Math.floor((whole % 3600) / 60);
	var sec = whole % 60;
	if (h > 0) return `${h}h${m}m`;
	return `${m}m${sec}s`;
}
function fmtClock(ms) {
	if (ms == null || !Number.isFinite(ms)) return "—";
	var d = new Date(ms + BEIJING_OFFSET_MS);
	return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
function pad(n) { return String(n).padStart(2, "0"); }
function fmtTps(tps) { return tps == null || !Number.isFinite(tps) ? "—" : String(tps >= 100 ? Math.round(tps) : tps.toFixed(1)); }
function fmtPct(p) { return p == null || !Number.isFinite(p) ? "—" : `${p}%`; }
function fmtSharePct(pct) {
	if (pct == null || !Number.isFinite(pct) || pct <= 0) return "0%";
	return pct < 0.1 ? "<0.1%" : pct.toFixed(1) + "%";
}
function fmtN(n) { return n == null || !Number.isFinite(n) ? "—" : n.toLocaleString("en-US"); }
function sessionCounts(sessions) {
	var c = { main: 0, subagent: 0 };
	(sessions || []).forEach(function (s) {
		if (s.subagent) c.subagent++;
		else c.main++;
	});
	return c;
}
function addCounts(a, b) { a.main += b.main; a.subagent += b.subagent; return a; }
// 紧凑格式：仅主对话 → "3"；有子对话 → "1+9"。
function fmtSessionCounts(c) {
	if (c.subagent > 0) return `${fmtN(c.main)}+${fmtN(c.subagent)}`;
	return fmtN(c.main);
}
function esc(s) {
	return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// 宿主与客户端共用同一份 Provider-scoped 计价内核。
// 纯客户端旧数据缺少 Provider 字段时保留 unknown，由计价内核按唯一
// 官方模型匹配给出 estimated，而不是把模型前缀当成官方路由。
// 所有消费展示统一为人民币；转换函数对已经是 CNY 的宿主数据幂等。
var summarizeCosts = pricing.summarizeCostsCny;
var mergeCostSummaries = pricing.mergeCostSummariesCny;
var convertCostToCny = pricing.convertCostToCny;
var convertCostSummaryToCny = pricing.convertCostSummaryToCny;
function identityForUsage(usage, fallbackModel, fallbackProvider, fallbackAccountType) {
	var model = usage?.modelRaw || usage?.model || fallbackModel || "(unknown)";
	var hasProvider = usage && Object.prototype.hasOwnProperty.call(usage, "providerId");
	var providerId = hasProvider ? usage.providerId : fallbackProvider;
	return pricing.normalizeIdentity(providerId || "unknown", model, usage?.accountType || fallbackAccountType || "api", Number.isFinite(usage?.slot) ? usage.slot * 1800000 : Date.now());
}
function costOf(stats, price) {
	var miss = stats.uncached * price.miss / 1e6;
	var write = stats.cacheWrite * (price.write == null ? price.miss : price.write) / 1e6;
	var hit = stats.cacheRead * price.hit / 1e6;
	var out = stats.output * price.out / 1e6;
	return miss + write + hit + out;
}
function fmtCost(rmb) {
	if (rmb == null || !Number.isFinite(rmb)) return "—";
	if (rmb <= 0) return "¥0";
	if (rmb >= 1000) return "¥" + rmb.toFixed(0);
	if (rmb >= 0.01) return "¥" + rmb.toFixed(2);
	return "¥" + rmb.toFixed(4);
}
function fmtCurrencyAmount(value, currency) {
	if (value == null || !Number.isFinite(value)) return "—";
	if (currency !== "CNY") return "—";
	var amount = value <= 0 ? "0" : value >= 1000 ? value.toFixed(0) : value >= 0.01 ? value.toFixed(2) : value.toFixed(4);
	return "¥" + amount;
}
function fmtCostSummary(summary) {
	if (!summary || !Array.isArray(summary.totals)) return "—";
	var display = convertCostSummaryToCny(summary);
	if (!display || !Array.isArray(display.totals)) return "—";
	if (display.totals.length === 0) return display.status === "free" ? "¥0" : "—";
	// 主汇总只展示已纳入统计的 CNY 金额。未计价会话及其原因通过
	// meta.warnings/详情呈现，避免在金额旁混入“？”造成误导。
	return display.totals.map(function(total) { return fmtCurrencyAmount(total.amount, total.currency); }).join(" + ");
}
function fmtBalanceAmount(value, currency) {
	if (value == null || !Number.isFinite(value)) return "—";
	var amount = value >= 1000 ? value.toLocaleString("en-US", { maximumFractionDigits: 2 }) : value.toFixed(2);
	return currency === "CNY" ? "¥" + amount : amount + " " + currency;
}
var SLOT_MS = 30 * 60 * 1000;
function usageCostDetail(usage, fallbackModel, fallbackProvider, fallbackAccountType) {
	if (usage?.cost && typeof usage.cost === "object") return convertCostToCny(usage.cost);
	var identity = identityForUsage(usage, fallbackModel, fallbackProvider, fallbackAccountType);
	return convertCostToCny(pricing.priceUsage(usage || {}, identity));
}
function usageCost(usage, fallbackModel, fallbackProvider, fallbackAccountType) {
	return usageCostDetail(usage, fallbackModel, fallbackProvider, fallbackAccountType).amount;
}
function sessionCostSummary(s) {
	if (s.slotUsage && s.slotUsage.length) {
		return summarizeCosts(s.slotUsage.map(function(usage) {
			return usageCostDetail(usage, s.modelRaw || s.model, s.providerId, s.accountType);
		}));
	}
	if (s.cost && Array.isArray(s.cost.totals)) return convertCostSummaryToCny(s.cost);
	var st = s.stats || {};
	var model = s.modelRaw || s.model || "(unknown)";
	var usage = {
		model,
		slot: Math.floor((s.updatedAt || Date.now()) / SLOT_MS),
		serviceTier: "standard",
		contextTokens: (st.uncached || 0) + (st.cacheRead || 0) + (st.cacheWrite || 0),
		uncached: st.uncached != null ? st.uncached : Math.max(0, (st.inputTokens || 0) - (st.cacheRead || 0) - (st.cacheWrite || 0)),
		output: st.output != null ? st.output : (st.outputTokens || 0),
		cacheRead: st.cacheRead || 0,
		cacheWrite: st.cacheWrite || 0,
		reasoning: st.reasoning || 0
	};
	if (Object.prototype.hasOwnProperty.call(s, "providerId")) usage.providerId = s.providerId;
	if (s.accountType) usage.accountType = s.accountType;
	return summarizeCosts([usageCostDetail(usage, model, undefined, s.accountType)]);
}
// 数值返回值仅保留给旧接口/测试；新 UI 与兼容路径都使用 CNY summary。
function sessionCost(s) {
	var summary = sessionCostSummary(s);
	return (summary.status === "exact" || summary.status === "estimated") && summary.totals.length === 1 ? summary.totals[0].amount : null;
}
function projectCostSummary(p) {
	return mergeCostSummaries((p.sessions || []).map(sessionCostSummary));
}
function projectCost(p) {
	var summary = projectCostSummary(p);
	return (summary.status === "exact" || summary.status === "estimated") && summary.totals.length === 1 ? summary.totals[0].amount : null;
}

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
function usePref(key, def) {
	var pair = useState(() => loadPref(key, def));
	var val = pair[0], setVal = pair[1];
	useEffect(() => { savePref(key, val); }, [key, val]);
	return [val, setVal];
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
	if (!isRecord(route)) return [];
	if (Array.isArray(route.routes)) return route.routes.slice();
	if (isRecord(route.routes)) return Object.values(route.routes);
	return [];
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
	var primary = null;
	var primaryWeight = -1;
	rows.forEach(function(row) {
		var weight = routeRowWeight(row);
		if (weight > primaryWeight) { primary = row; primaryWeight = weight; }
	});
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
	var route = projectionValueOf(s, "statsRoute");
	return routeRowsOf(route).filter(function(row) {
		return isRecord(row) && usableString(row.model) && routeRowWeight(row) > 0;
	}).map(function(row) {
		var modelRaw = usableString(row.model) || identity.modelRaw;
		var providerId = usableProvider(row.providerId) || identity.providerId;
		var accountType = usableString(row.accountType) || identity.accountType;
		var normalized = pricing.normalizeIdentity(providerId, modelRaw, accountType,
			Number.isFinite(row.time) ? row.time : Date.now());
		var uncached = nonNegativeFinite(row.uncached);
		var output = nonNegativeFinite(row.output);
		var cacheRead = nonNegativeFinite(row.cacheRead);
		var cacheWrite = nonNegativeFinite(row.cacheWrite);
		var contextTokens = uncached + cacheRead + cacheWrite;
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
			serviceTier: row.serviceTier === "priority" ? "priority" : "standard",
			contextTokens,
			contextOver512k: contextTokens > 512000,
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
			if (s) { accounted.add(id); members.push(s); }
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
// CSS
// ------------------------------------------------------------------
const CSS_ID = "@rongyi7/dsh-stats/styles.css";
const css = ".dss-overlay{position:fixed;inset:0;z-index:1000;background:rgba(10,12,16,.55);display:flex;align-items:flex-start;justify-content:center;padding:4vh 3vw;overflow:auto}" +
	".dss-panel button,.dss-trigger{-webkit-user-select:none;-moz-user-select:none;user-select:none;-webkit-touch-callout:none}" +
	".dss-trigger{box-sizing:border-box;cursor:pointer;color:var(--dsw-alias-label-primary,#f9fafb);background:transparent;border:0;display:flex;align-items:center;flex:0 0 auto;font-family:inherit;overflow:hidden;transition:background-color 140ms ease,color 140ms ease}" +
	".dss-trigger.wide{width:calc(100% + 8px);height:34px;margin:4px -4px;padding:6px 2px 6px 10px;gap:8px;border-radius:12px;justify-content:flex-start;font-size:14px;line-height:22px}" +
	".dss-trigger.rail{width:36px;height:36px;margin:0;padding:0;gap:0;border-radius:50%;justify-content:center}" +
	".dss-trigger:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))}" +
	".dss-trigger:active{background:var(--dsw-alias-interactive-bg-active,rgba(255,255,255,.12))}" +
	".dss-trigger:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#60a5fa);outline-offset:2px}" +
	".dss-trigger-label{white-space:nowrap;overflow:hidden}" +
	".dss-panel{width:min(1180px,100%);background:var(--dsw-specific-menu,#161a21);border:1px solid var(--dsw-alias-border-inverted,#2a303c);border-radius:16px;box-shadow:var(--dsw-shadow-lv3,0 20px 60px rgba(0,0,0,.5));color:var(--dsw-alias-label-primary,#e7eaf0);display:flex;flex-direction:column;overflow:hidden}" +
	".dss-head{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--dsw-alias-border,#2a303c)}" +
	".dss-head h2{margin:0;font-size:15px;font-weight:650;flex:1;min-width:0}" +
	".dss-tabs{display:flex;gap:4px}" +
	".dss-tabs button{background:none;border:none;color:var(--dsw-alias-label-secondary,#a6adbb);font-size:13px;padding:6px 12px;border-radius:8px;cursor:pointer}" +
	".dss-tabs button.on{background:rgba(79,140,255,.14);color:var(--dsw-alias-label-primary,#e7eaf0);font-weight:600}" +
	".dss-close{background:none;border:none;color:var(--dsw-alias-label-secondary,#a6adbb);cursor:pointer;border-radius:8px;width:28px;height:28px;display:grid;place-items:center}" +
	".dss-close:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))}" +
	".dss-head-actions{width:180px;flex:none;display:flex;align-items:center;justify-content:flex-end;gap:6px}" +
	".dss-export{background:none;border:1px solid var(--dsw-alias-border,#2a303c);color:var(--dsw-alias-label-secondary,#a6adbb);cursor:pointer;border-radius:7px;padding:3px 8px;font-size:11.5px}" +
	".dss-export:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#e7eaf0)}" +
	".dss-export:disabled{opacity:.45;cursor:default}" +
	".dss-body{padding:16px 18px;overflow:auto}" +
	".dss-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:14px}" +
	".dss-card{background:var(--dsw-specific-menu,#1d222c);border:1px solid var(--dsw-alias-border,#2a303c);border-radius:11px;padding:11px 13px}" +
	".dss-card .k{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:12px}" +
	".dss-card .v{font-size:18px;font-weight:650;font-variant-numeric:tabular-nums}" +
	".dss-legend{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px}" +
	".dss-chip{display:inline-flex;align-items:center;gap:7px;background:var(--dsw-specific-menu,#1d222c);border:1px solid var(--dsw-alias-border,#2a303c);border-radius:999px;padding:4px 11px;cursor:pointer;font-size:12.5px;color:var(--dsw-alias-label-secondary,#a6adbb);user-select:none}" +
	".dss-chip .sw{width:10px;height:10px;border-radius:3px;background:var(--c)}" +
	".dss-chip.off{opacity:.4}" +
	// 项目卡片列表（每项目一个圆角框）
	".dss-pcards-wrap{display:flex;flex-direction:column;gap:10px}" +
	".dss-sortbar{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--dsw-alias-label-secondary,#a6adbb)}" +
	".dss-sortbar-label{font-size:12px}" +
	".dss-sortbar-select{background:var(--dsw-specific-menu,#1d222c);border:1px solid var(--dsw-alias-border,#2a303c);color:var(--dsw-alias-label-primary,#e7eaf0);border-radius:7px;padding:4px 8px;font-size:12px}" +
	".dss-sortbar-dir{background:none;border:1px solid var(--dsw-alias-border,#2a303c);color:var(--dsw-alias-label-secondary,#a6adbb);border-radius:7px;padding:4px 10px;cursor:pointer;font-size:11.5px}" +
	".dss-sortbar-dir:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#e7eaf0)}" +
	".dss-pcards-viewport,.dss-timeline-viewport,.dss-model-list-viewport{min-height:0}" +
	".dss-pcards-viewport.scrollable{max-height:501px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;padding-right:5px}" +
	".dss-timeline-viewport.scrollable{max-height:var(--dss-timeline-max-height);overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;padding-right:5px}" +
	".dss-model-list-viewport.scrollable{max-height:204px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;padding-right:5px}" +
	".dss-pcards-viewport.scrollable,.dss-timeline-viewport.scrollable,.dss-model-list-viewport.scrollable,.dss-day-lanes{scrollbar-width:thin;scrollbar-color:rgba(166,173,187,.28) transparent}" +
	".dss-pcards-viewport.scrollable:hover,.dss-timeline-viewport.scrollable:hover,.dss-model-list-viewport.scrollable:hover,.dss-day-lanes:hover{scrollbar-color:rgba(166,173,187,.5) transparent}" +
	".dss-pcards{display:flex;flex-direction:column;gap:10px}" +
	".dss-pcard{border:1px solid var(--dsw-alias-border,#2a303c);border-radius:12px;background:var(--dsw-specific-menu,#1d222c);overflow:hidden;transition:border-color .15s}" +
	".dss-pcard:hover{border-color:var(--dsw-alias-label-tertiary,#6b7280)}" +
	".dss-pcard.sel{border-color:rgba(79,140,255,.55)}" +
	".dss-pcard-head{display:flex;align-items:center;gap:18px;padding:13px 16px;min-height:61px;box-sizing:border-box;cursor:pointer}" +
	".dss-pcard-head:focus-visible{outline:2px solid rgba(79,140,255,.8);outline-offset:-2px}" +
	".dss-pcard-metrics{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;margin-left:auto}" +
	".dss-pm{min-width:58px;text-align:right}" +
	".dss-pm-l{height:15px;font-size:10px;line-height:15px;white-space:nowrap;color:var(--dsw-alias-label-tertiary,#6b7280);margin-bottom:3px}" +
	".dss-pm-v{font-size:13px;font-weight:650;color:var(--dsw-alias-label-primary,#e7eaf0);font-variant-numeric:tabular-nums;line-height:1.15}" +
	".dss-pm.cost .dss-pm-v{color:#ff922b}" +
	".dss-pcard-detail{border-top:1px solid var(--dsw-alias-border,#2a303c);background:rgba(255,255,255,.015);padding:6px 4px;overflow-x:hidden}" +
	".dss-statline{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:11.5px;font-variant-numeric:tabular-nums}" +
	".dss-proj{display:flex;align-items:center;gap:9px;min-width:0;flex:none}" +
	".dss-proj-txt{display:flex;flex-direction:column;min-width:0}" +
	".dss-proj .dot{width:10px;height:10px;border-radius:3px;background:var(--c);flex:none;box-shadow:0 0 0 2px color-mix(in srgb,var(--c) 22%,transparent)}" +
	".dss-proj .nm{font-weight:650;color:var(--dsw-alias-label-primary,#e7eaf0);font-size:13px}" +
	".dss-proj .ph{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:11px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
	// 会话详情：数据列自适应收缩；模型与金额之间保留独立间隔列。
	".dss-sess{--dss-data-shift:20px;display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1.08fr) minmax(0,.75fr) minmax(0,.9fr) minmax(0,.85fr) minmax(0,1.3fr) minmax(0,1.25fr) clamp(8px,1.7vw,20px) minmax(0,.65fr);gap:6px;align-items:center;width:100%;box-sizing:border-box;min-width:0;padding:7px 8px;border-bottom:1px solid var(--dsw-alias-border,#2a303c);font-size:12.5px;transition:background .12s}" +
	".dss-sess:last-child{border-bottom:none}" +
	".dss-sess:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.04))}" +
	".dss-sess .ti{font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:16px;box-sizing:border-box}" +
	".dss-sess-title{display:block;width:100%;border:0;background:none;color:inherit;font:inherit;line-height:inherit;text-align:left;cursor:pointer;padding:0 16px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
	".dss-sess-title:focus-visible{outline:2px solid rgba(79,140,255,.8);outline-offset:2px;border-radius:3px}" +
	".dss-sess>:nth-child(n+2){transform:translateX(var(--dss-data-shift))}" +
	".dss-sess .me{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:11.5px;text-align:right;font-variant-numeric:tabular-nums;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
	".dss-sess .st{color:var(--dsw-alias-label-secondary,#a6adbb);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap;min-width:0;overflow:hidden;text-overflow:ellipsis}" +
	".dss-sess-model{text-align:right!important;transform:translateX(var(--dss-data-shift))!important}" +
	".dss-sess-cost{grid-column:10;text-align:left!important}" +
	".dss-tag{font-size:10px;font-weight:600;color:#4f8cff;background:rgba(79,140,255,.14);border-radius:4px;padding:1px 5px;margin-left:6px;vertical-align:middle}" +
	".dss-group{font-size:11px;font-weight:600;color:var(--dsw-alias-label-tertiary,#6b7280);padding:9px 12px 3px}" +
	".dss-hint{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:11.5px;margin-bottom:10px}" +
	".dss-heat{display:flex;align-items:center;gap:3px;overflow-x:auto;padding-bottom:8px;margin-bottom:4px}" +
	".dss-hm{width:14px;height:14px;border-radius:4px;flex:none;background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));border:1px solid var(--dsw-alias-border,#2a303c)}" +
	".dss-hm.has{cursor:pointer}" +
	".dss-hm.has:hover{outline:1.5px solid #4f8cff;outline-offset:1px}" +
	".dss-axis{display:grid;grid-template-columns:150px 1fr 104px;margin-bottom:4px}" +
	".dss-hours{display:grid;grid-template-columns:repeat(9,1fr);color:var(--dsw-alias-label-tertiary,#6b7280);font-size:10.5px}" +
	".dss-hours span{text-align:center}" +
	".dss-hours span:first-child{text-align:left}" +
	".dss-hours span:last-child{text-align:right}" +
	".dss-day{display:grid;grid-template-columns:150px 1fr 104px;align-items:stretch;border-bottom:1px solid var(--dsw-alias-border,#2a303c);min-height:56px;box-sizing:border-box}" +
	// 左侧：项目颜色块列表（总览同款色点）+ 多天模式附加日期
	".dss-day-projs{display:flex;flex-direction:column;justify-content:center;gap:9px;padding:10px 8px 10px 0;min-width:0}" +
	".dss-day-date{font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-secondary,#a6adbb);margin-bottom:3px;font-variant-numeric:tabular-nums}" +
	".dss-day-proj{display:flex;align-items:center;gap:8px;min-width:0;transition:opacity .12s}" +
	".dss-day-proj:hover{opacity:.8}" +
	".dss-day-dot{width:10px;height:10px;border-radius:3px;flex:none;background:var(--c);box-shadow:0 0 0 2px color-mix(in srgb,var(--c) 22%,transparent)}" +
	".dss-day-pname{font-size:12.5px;color:var(--dsw-alias-label-primary,#e7eaf0);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
	".dss-day-more{font-size:10.5px;color:var(--dsw-alias-label-tertiary,#6b7280);padding-left:18px}" +
	".dss-track{display:grid;grid-template-columns:repeat(48,1fr);margin:4px 0}" +
	".dss-cell{position:relative;min-width:0;border-right:1px solid var(--dsw-alias-border,#2a303c);display:flex;flex-direction:row;align-items:flex-end;gap:1px}" +
	".dss-cell:last-child{border-right:none}" +
	".dss-blk{flex:1;min-width:2px;border-radius:3px;background:var(--c);cursor:pointer;transition:filter .12s}" +
	".dss-blk:hover{filter:brightness(1.25)}" +
	// 按日模式：项目独立泳道，标签和轨道在同一个滚动容器内保持对齐。
	".dss-day.day-mode{grid-template-columns:minmax(0,1fr) 104px}" +
	".dss-day-lanes{grid-column:1;display:flex;flex-direction:column;gap:6px;align-self:start;max-height:306px;overflow-y:auto;overflow-x:hidden;margin:8px 0;min-width:0;scrollbar-gutter:stable}" +
	".dss-day-lane{display:grid;grid-template-columns:150px minmax(0,1fr);gap:0;align-items:stretch;min-height:72px;flex:none}" +
	".dss-day-lane-label{display:flex;align-items:center;gap:8px;min-width:0;padding-right:8px}" +
	".dss-day-lane-track{display:grid;grid-template-columns:repeat(48,minmax(0,1fr));min-width:0;min-height:72px}" +
	".dss-day-lane-cell{position:relative;min-width:0;border-right:1px solid var(--dsw-alias-border,#2a303c);display:flex;align-items:flex-end}" +
	".dss-day-lane-cell:last-child{border-right:none}" +
	".dss-day-lane-cell .dss-blk{width:100%;min-width:0;flex:none}" +
	// 全部模式：同槽项目合并成全宽色块，颜色沿垂直方向切分，避免并排后变窄。
	".dss-blk-composite{width:100%;min-width:0;border-radius:3px;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;cursor:pointer;transition:filter .12s}" +
	".dss-blk-composite:hover{filter:brightness(1.25)}" +
	".dss-blk-segment{display:block;flex:1;min-height:1px;background:var(--c)}" +
		// 右侧信息列：总时长 + 活动时段 + 项目数
	".dss-day-info{display:flex;flex-direction:column;justify-content:center;align-items:flex-end;gap:4px;padding:8px 0 8px 12px;min-width:0}" +
	".dss-day-info .dur{font-size:13.5px;font-weight:650;color:var(--dsw-alias-label-primary,#e7eaf0);font-variant-numeric:tabular-nums}" +
	".dss-day-info .span{font-size:10.5px;color:var(--dsw-alias-label-secondary,#a6adbb);font-variant-numeric:tabular-nums;white-space:nowrap}" +
	".dss-day-info .cnt{font-size:10.5px;color:var(--dsw-alias-label-tertiary,#6b7280);white-space:nowrap}" +
	".dss-empty{color:var(--dsw-alias-label-tertiary,#6b7280);text-align:center;padding:32px 0}" +
	".dss-tt{background:var(--dsw-specific-menu,#1d222c);border:1px solid var(--dsw-alias-border,#2a303c);border-radius:9px;padding:8px 11px;box-shadow:0 8px 24px rgba(0,0,0,.45);font-size:12.5px;position:fixed;z-index:2000;pointer-events:none;display:none;max-width:320px}" +
	".dss-tt.show{display:block}" +
	// 日期导航器
	".dss-nav{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:14px;font-size:12.5px;color:var(--dsw-alias-label-secondary,#a6adbb)}" +
	".dss-nav > .dss-tabs{gap:2px}" +
	".dss-nav > .dss-tabs button{padding:5px 9px}" +
	".dss-nav-btn{background:var(--dsw-specific-menu,#1d222c);border:1px solid var(--dsw-alias-border,#2a303c);color:var(--dsw-alias-label-secondary,#a6adbb);border-radius:7px;min-width:28px;min-height:28px;padding:3px 7px;cursor:pointer;font-size:12.5px;line-height:1.2}" +
	".dss-nav-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#e7eaf0)}" +
	".dss-nav-btn:disabled{opacity:.35;cursor:default}" +
	".dss-nav-date{font-weight:650;color:var(--dsw-alias-label-primary,#e7eaf0);font-variant-numeric:tabular-nums;min-width:160px;text-align:center}" +
	".dss-nav-note{margin-left:auto;color:var(--dsw-alias-label-tertiary,#6b7280);font-size:11.5px}" +
	".dss-cost{font-variant-numeric:tabular-nums;font-weight:600;color:var(--dsw-alias-label-primary,#e7eaf0)}" +
	"[data-color='0']{--c:#4f8cff}[data-color='1']{--c:#34d399}[data-color='2']{--c:#fbbf24}[data-color='3']{--c:#f472b6}[data-color='4']{--c:#a78bfa}[data-color='5']{--c:#22d3ee}[data-color='6']{--c:#fb923c}[data-color='7']{--c:#e879f9}[data-color='8']{--c:#a3e635}[data-color='9']{--c:#f87171}[data-color='10']{--c:#2dd4bf}[data-color='11']{--c:#facc15}[data-color='12']{--c:#60a5fa}[data-color='13']{--c:#c084fc}[data-color='14']{--c:#fb7185}[data-color='15']{--c:#38bdf8}" +
	// 用量趋势（重构版）
	".dss-trends{display:flex;flex-direction:column;gap:14px}" +
	// hero：总 token + 消费 + 最常用模型
	".dss-hero{display:grid;grid-template-columns:1.6fr 1fr;gap:10px}" +
	".dss-hero-main{background:linear-gradient(135deg,rgba(79,140,255,.16),rgba(79,140,255,.04) 55%),var(--dsw-specific-menu,#1d222c);border:1px solid rgba(79,140,255,.28);border-radius:13px;padding:18px 20px;display:flex;flex-direction:column;gap:8px;min-width:0}" +
	".dss-hero-k{color:var(--dsw-alias-label-secondary,#a6adbb);font-size:12px;font-weight:600}" +
	".dss-hero-v{font-size:34px;font-weight:750;color:var(--dsw-alias-label-primary,#e7eaf0);font-variant-numeric:tabular-nums;line-height:1.05;letter-spacing:-.5px}" +
	".dss-hero-v.model{font-size:17px;letter-spacing:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:650}" +
	".dss-hero-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}" +
	".dss-hero-chip{background:rgba(79,140,255,.12);color:var(--dsw-alias-label-secondary,#a6adbb);border-radius:999px;padding:3px 10px;font-size:11.5px;font-variant-numeric:tabular-nums}" +
	".dss-hero-side{display:grid;grid-template-rows:1fr 1fr;gap:10px}" +
	".dss-hero-cell{background:var(--dsw-specific-menu,#1d222c);border:1px solid var(--dsw-alias-border,#2a303c);border-radius:13px;padding:13px 16px;display:flex;flex-direction:column;justify-content:center;gap:5px;min-width:0}" +
	".dss-hero-cell .dss-hero-v{font-size:22px}" +
	".dss-hero-cell .dss-cost{color:#ff922b}" +
	// 指标卡
	".dss-metric-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}" +
	".dss-metric{background:var(--dsw-specific-menu,#1d222c);border:1px solid var(--dsw-alias-border,#2a303c);border-radius:11px;padding:12px 14px;display:flex;flex-direction:column;gap:2px;min-width:0}" +
	".dss-metric-v{font-size:21px;font-weight:700;color:var(--dsw-alias-label-primary,#e7eaf0);font-variant-numeric:tabular-nums;line-height:1.1}" +
	".dss-metric-l{color:var(--dsw-alias-label-secondary,#a6adbb);font-size:12px;margin-top:2px}" +
	".dss-metric-s{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:10.5px}" +
	// section 容器（紧凑：高度由内容决定，无强制拉伸、无底部空白）
	".dss-section{background:var(--dsw-specific-menu,#1d222c);border:1px solid var(--dsw-alias-border,#2a303c);border-radius:13px;padding:12px 14px}" +
	".dss-sec-head{display:flex;align-items:baseline;gap:10px;margin-bottom:10px}" +
	".dss-sec-title{color:var(--dsw-alias-label-primary,#e7eaf0);font-size:13px;font-weight:650}" +
	".dss-sec-hint{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:11px;flex:1;text-align:right}" +
	// 热力图 + 每日趋势并排
	".dss-trend-duo{display:grid;grid-template-columns:minmax(280px,360px) 1fr;gap:30px;align-items:start}" +
	".dss-duo-cell{min-width:0}" +
	".dss-duo-cell.grow{flex:1}" +
	".dss-duo-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#a6adbb);margin-bottom:10px}" +
	"@media (max-width:860px){.dss-trend-duo{grid-template-columns:1fr}}" +
	// 当月日历热力图（紧凑：格子 22px、间距 3px）
	".dss-cal-wrap{display:flex;flex-direction:column;gap:8px}" +
	".dss-cal{width:100%;max-width:360px}" +
	".dss-cal-month{min-width:0}" +
	".dss-cal-title{font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-secondary,#a6adbb);margin-bottom:6px;text-align:center}" +
	".dss-cal-dow{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;font-size:9.5px;color:var(--dsw-alias-label-tertiary,#6b7280);margin-bottom:4px}" +
	".dss-cal-dow span{text-align:center}" +
	".dss-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}" +
	".dss-cal-cell,.dss-cal-pad{aspect-ratio:1;width:min(100%,22px);justify-self:center;border-radius:3px}" +
	".dss-cal-cell{display:block;padding:0;appearance:none;background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));border:1px solid var(--dsw-alias-border,#2a303c);cursor:default}" +
	".dss-cal-cell.interactive{cursor:pointer}" +
	// 4 档分位色阶（lvl0 = 无活动底色；对比拉大，最低档也清晰可见）
	".dss-cal-cell.lvl1.has{background:rgba(79,140,255,.35);border-color:transparent}" +
	".dss-cal-cell.lvl2.has{background:rgba(79,140,255,.58);border-color:transparent}" +
	".dss-cal-cell.lvl3.has{background:rgba(79,140,255,.8);border-color:transparent}" +
	".dss-cal-cell.lvl4.has{background:rgba(79,140,255,1);border-color:transparent;box-shadow:0 0 0 1px rgba(79,140,255,.4)}" +
	".dss-cal-cell.today{outline:1.5px solid var(--dsw-alias-label-primary,#e7eaf0);outline-offset:1px}" +
	".dss-cal-cell.selected{outline:2px solid #ff922b;outline-offset:1px;z-index:1}" +
	".dss-cal-cell.future{opacity:.35;border-style:dashed}" +
	".dss-cal-cell.interactive:hover{outline:1.5px solid var(--dsw-alias-label-primary,#e7eaf0);outline-offset:1px}" +
	".dss-cal-cell.interactive:focus-visible{outline:2px solid var(--dsw-alias-label-primary,#e7eaf0);outline-offset:2px}" +
	".dss-cal-cell.interactive.selected:focus-visible{outline-color:#ff922b}" +
	".dss-cal-legend{display:flex;align-items:center;gap:3px;font-size:10px;color:var(--dsw-alias-label-tertiary,#6b7280);justify-content:center}" +
	".dss-hm-lg{width:10px;height:10px;border-radius:2px;display:inline-block;background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));border:1px solid var(--dsw-alias-border,#2a303c)}" +
	".dss-hm-lg.lvl1{background:rgba(79,140,255,.35);border-color:transparent}" +
	".dss-hm-lg.lvl2{background:rgba(79,140,255,.58);border-color:transparent}" +
	".dss-hm-lg.lvl3{background:rgba(79,140,255,.8);border-color:transparent}" +
	".dss-hm-lg.lvl4{background:rgba(79,140,255,1);border-color:transparent}" +
	// 月度堆叠柱
	".dss-mchart{display:grid;grid-template-columns:auto 1fr;gap:6px 10px;align-items:stretch}" +
	// Y 轴刻度：5 个值均匀分布（0/25/50/75/100%），与横向网格线一一对齐
	".dss-mchart-y{display:flex;flex-direction:column;justify-content:space-between;font-size:10px;color:var(--dsw-alias-label-tertiary,#6b7280);text-align:right;padding:0 0 22px;font-variant-numeric:tabular-nums;position:relative}" +
	".dss-mchart-tick{height:0;line-height:1;transform:translateY(-50%)}" +
	".dss-mchart-tick:first-child{transform:none}" +
	".dss-mchart-tick:last-child{transform:translateY(-100%)}" +
	".dss-mchart-plot{position:relative}" +
	// 网格线：25%/50%/75% 虚线 + 100% 实线 X 轴基线（刻度与线同位置）
	".dss-mchart-grid{position:absolute;inset:0 0 22px;pointer-events:none}" +
	".dss-mchart-grid i{position:absolute;left:0;right:0;border-top:1px dashed var(--dsw-alias-border,#2a303c);height:0;display:block}" +
	".dss-mchart-grid i:nth-child(1){top:25%}" +
	".dss-mchart-grid i:nth-child(2){top:50%}" +
	".dss-mchart-grid i:nth-child(3){top:75%}" +
	".dss-mchart-grid i:nth-child(4){top:100%;border-top-style:solid}" +
	".dss-mchart-bars{display:flex;align-items:flex-end;gap:6px;height:126px}" +
	".dss-mchart-col{flex:1;min-width:26px;max-width:64px;height:126px;display:flex;flex-direction:column;justify-content:flex-end}" +
	".dss-mchart-bar{width:100%;height:100%;display:flex;flex-direction:column;justify-content:flex-end;border-radius:4px 4px 0 0;overflow:hidden;cursor:default;transition:filter .15s}" +
	".dss-mchart-bar:hover{filter:brightness(1.15)}" +
	".dss-mchart-seg{width:100%}" +
	".dss-mchart-seg.input{background:#4f8cff}" +
	".dss-mchart-seg.output{background:#ffd43b}" +
// 输出通常远少于输入；有真实输出时保留 2px 可见高度，避免被压成不可见的亚像素线。
	".dss-mchart-seg.output.has-value{min-height:2px}" +
	".dss-mchart-seg.reasoning{background:#cc5de8}" +
	// 日期行：独立于柱区，位于 X 轴基线下方（margin-top 4 + 高 18 = grid 底部 22px，与 Y 轴 padding 对齐）
	".dss-mchart-xlabels{display:flex;gap:6px;margin-top:4px}" +
	".dss-mchart-label{flex:1;min-width:26px;max-width:64px;text-align:center;font-size:10px;color:var(--dsw-alias-label-tertiary,#6b7280);height:18px;line-height:18px;overflow:hidden;white-space:nowrap}" +
	".dss-mchart-label.today{color:var(--dsw-alias-label-primary,#e7eaf0);font-weight:600}" +
	".dss-mchart-label.selected{color:#ff922b;font-weight:700}" +
	".dss-mchart-legend{grid-column:2;display:flex;justify-content:center;flex-wrap:wrap;gap:14px;font-size:11.5px;color:var(--dsw-alias-label-secondary,#a6adbb);align-items:center}" +
	".dss-mchart-lg{width:9px;height:9px;border-radius:2px;display:inline-block;margin-right:5px;vertical-align:-1px}" +
	".dss-mchart-lg.input{background:#4f8cff}" +
	".dss-mchart-lg.output{background:#ffd43b}" +
	".dss-mchart-lg.reasoning{background:#cc5de8}" +
	// 模型分布（紧凑：环 112px、列表行更矮）
	".dss-model-split{display:grid;grid-template-columns:160px minmax(0,1fr);gap:18px;align-items:start}" +
	".dss-ring-wrap{display:flex;width:160px;gap:12px;align-items:center;flex-direction:column}" +
	".dss-ring{width:112px;height:112px;border-radius:50%;display:grid;place-items:center;flex:none;position:relative}" +
	".dss-ring::after{content:\"\";position:absolute;inset:19px;background:var(--dsw-specific-menu,#1d222c);border-radius:50%}" +
	".dss-ring-center{position:relative;text-align:center;z-index:1}" +
	".dss-ring-total{font-size:15px;font-weight:700;color:var(--dsw-alias-label-primary,#e7eaf0);font-variant-numeric:tabular-nums}" +
	".dss-ring-label{font-size:9.5px;color:var(--dsw-alias-label-tertiary,#6b7280);margin-top:2px}" +
	".dss-ring-legend{display:flex;flex-direction:column;gap:5px;width:100%;min-width:0}" +
	".dss-ring-legend.scrollable{max-height:58px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;padding-right:4px;scrollbar-width:thin;scrollbar-color:rgba(166,173,187,.28) transparent}" +
	".dss-ring-legend.scrollable:hover{scrollbar-color:rgba(166,173,187,.5) transparent}" +
	".dss-ring-item{display:flex;align-items:center;gap:7px;height:16px;line-height:16px;flex:none;font-size:11.5px;color:var(--dsw-alias-label-secondary,#a6adbb)}" +
	".dss-ring-swatch{width:10px;height:10px;border-radius:3px;flex:none}" +
	".dss-ring-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
	".dss-ring-pct{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#e7eaf0);font-weight:600}" +
	".dss-model-list{display:flex;flex-direction:column;gap:8px;min-width:0}" +
	".dss-model-item{padding:8px 10px;border:1px solid var(--dsw-alias-border,#2a303c);border-radius:9px;background:rgba(255,255,255,.015);min-width:0;transition:border-color .15s}" +
	".dss-model-item:hover{border-color:var(--dsw-alias-label-tertiary,#6b7280)}" +
	".dss-model-head{display:flex;align-items:center;gap:8px;margin-bottom:5px;min-width:0}" +
	".dss-model-dot{width:9px;height:9px;border-radius:3px;flex:none}" +
	".dss-model-name{flex:1;font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary,#e7eaf0);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
	".dss-model-pct{font-size:12px;font-weight:650;color:var(--dsw-alias-label-primary,#e7eaf0);font-variant-numeric:tabular-nums}" +
	".dss-model-track{height:5px;border-radius:3px;background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));overflow:hidden;margin-bottom:5px}" +
	".dss-model-fill{height:100%;border-radius:3px;transition:width .2s}" +
	".dss-model-meta{font-size:10.5px;color:var(--dsw-alias-label-tertiary,#6b7280);font-variant-numeric:tabular-nums;line-height:1.4}" +
	".dss-model-list-viewport.scrollable .dss-model-meta{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
	// tooltip 结构化样式
	".dss-tip-title{font-weight:650;margin-bottom:5px;color:var(--dsw-alias-label-primary,#e7eaf0)}" +
	".dss-tip-row{display:flex;justify-content:space-between;gap:14px;line-height:1.6;color:var(--dsw-alias-label-secondary,#a6adbb)}" +
	".dss-tip-row b{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#e7eaf0)}" +
	"@media (min-width:768px){.dss-sess-cost{width:calc(100% - 8px)}}" +
	"@media (max-width:767px){.dss-sess{--dss-data-shift:10px}}" +
	"@media (max-width:640px){.dss-trends .dss-model-split{grid-template-columns:minmax(0,1fr)}.dss-model-split>.dss-ring-wrap{min-width:0;max-width:100%}.dss-ring-wrap>.dss-ring-legend{width:auto;flex:1;min-width:0}.dss-model-split>.dss-model-list-viewport{min-width:0;max-width:100%}}" +
	"@media (max-width:640px){.dss-overlay{padding:0}.dss-panel{border-radius:0;min-height:100%;width:100%}.dss-head{flex-wrap:wrap;gap:7px;padding:11px 12px}.dss-head h2{flex-basis:100%}.dss-head-actions{width:auto;margin-left:auto}.dss-head .dss-tabs{order:3;width:100%;overflow-x:auto}.dss-head .dss-export{padding:4px 7px}.dss-body{padding:12px}.dss-cards{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.dss-card{padding:9px}.dss-card .v{font-size:16px}.dss-pcards-viewport.scrollable{max-height:70vh;padding-right:3px}.dss-pcard-head{align-items:flex-start;flex-direction:column;gap:10px;padding:11px}.dss-pcard-metrics{width:100%;justify-content:flex-start;margin-left:0}.dss-pm{text-align:left;min-width:52px}.dss-sess{width:calc(100% - 2px);gap:3px;padding:6px 4px;font-size:10px}.dss-sess .ti{padding-right:4px}.dss-sess .me,.dss-sess .st{font-size:10px}.dss-axis,.dss-day{grid-template-columns:94px 1fr 70px}.dss-day.day-mode{grid-template-columns:minmax(0,1fr) 70px}.dss-day-projs{gap:6px}.dss-day-pname{font-size:11px}.dss-day-info{padding-left:5px}.dss-day-lane{grid-template-columns:94px minmax(0,1fr)}.dss-metric-row{grid-template-columns:repeat(2,minmax(0,1fr))}.dss-hero{grid-template-columns:1fr}.dss-model-split{grid-template-columns:1fr}.dss-ring-wrap{width:100%;flex-direction:row}.dss-sec-head{align-items:flex-start;flex-direction:column;gap:4px}.dss-sec-hint{text-align:left}.dss-nav{gap:6px}.dss-nav-note{flex-basis:100%;margin-left:0}.dss-tabs button{padding:6px 8px}.dss-track{min-width:480px}.dss-day{overflow-x:auto}.dss-day .dss-track{overflow:hidden}.dss-sortbar{flex-wrap:wrap}}";

// ------------------------------------------------------------------
// 组件
// ------------------------------------------------------------------
function StatsTrigger(props) {
	var wide = props.wide;
	var t = props.t;
	var onOpen = props.onOpen;
	return e("button", {
		type: "button",
		className: "dss-trigger " + (wide ? "wide" : "rail"),
		onClick: () => onOpen(),
		title: t("trigger"),
		"aria-label": t("trigger"),
		"aria-haspopup": "dialog"
	},
		e(IconDataOutline16, { size: 16 }),
		wide ? e("span", { className: "dss-trigger-label" }, t("trigger")) : null
	);
}

function SummaryCards(props) {
	var projects = props.projects;
	var t = props.t;
	var tot = { turns: 0, steps: 0, llmMs: 0, toolMs: 0, input: 0, output: 0, cacheRead: 0 };
	var totC = { main: 0, subagent: 0 };
	projects.forEach(function(p) {
		addCounts(totC, sessionCounts(p.sessions));
		tot.turns += p.stats.turns; tot.steps += p.stats.steps;
		tot.llmMs += p.stats.llmMs; tot.toolMs += p.stats.toolMs;
		tot.input += p.stats.inputTokens; tot.output += p.stats.outputTokens; tot.cacheRead += p.stats.cacheRead;
	});
	var cost = mergeCostSummaries(projects.map(projectCostSummary));
	var cards = [
		[t("card.projects"), fmtN(projects.length)],
		[t("card.sessions"), fmtSessionCounts(totC)],
		[t("card.turnsSteps"), `${fmtN(tot.turns)} / ${fmtN(tot.steps)}`],
		[t("card.llm"), fmtDuration(tot.llmMs)],
		[t("card.tool"), fmtDuration(tot.toolMs)],
		[t("card.input"), fmtTokens(tot.input)],
		[t("card.output"), fmtTokens(tot.output)],
		[t("card.cacheHit"), tot.input > 0 ? fmtPct(Math.round(tot.cacheRead / tot.input * 100)) : "—"],
		[t("card.cost"), fmtCostSummary(cost)]
	];
	return e("div", { className: "dss-cards" },
		cards.map((c, i) => e("div", { className: "dss-card", key: i },
			e("div", { className: "k" }, c[0]),
			e("div", { className: "v", ...c[0] === t("card.cost") ? { className: "v dss-cost" } : {} }, c[1])
		))
	);
}

function projectColorIndexes(projects) {
	var indexes = new Map();
	(projects || []).forEach(function(project, index) { indexes.set(project.id, index % 16); });
	return indexes;
}

function projectColorIndex(project, indexes, fallbackIndex) {
	var index = indexes && indexes.get(project.id);
	var value = Number.isInteger(index) ? index : Number.isInteger(fallbackIndex) ? fallbackIndex : 0;
	return ((value % 16) + 16) % 16;
}

function Legend(props) {
	var projects = props.projects;
	var hidden = props.hidden;
	var onToggle = props.onToggle;
	return e("div", { className: "dss-legend" },
		projects.map(function(p, i) {
			return e("span", {
				key: p.id, className: "dss-chip" + (hidden[p.id] ? " off" : ""),
				"data-color": String(projectColorIndex(p, props.colorIndexes, i)), onClick: () => onToggle(p.id)
			},
				e("span", { className: "sw" }), p.name
			);
		})
	);
}

function sortValue(p, key) {
	switch (key) {
		case "input": return p.stats.inputTokens;
		case "output": return p.stats.outputTokens;
		case "turns": return p.stats.turns;
		case "steps": return p.stats.steps;
		case "tool": return p.stats.toolMs;
		case "sessions": return p.sessionCount;
		case "hit": return p.stats.cacheHitPct == null ? -1 : p.stats.cacheHitPct;
		case "lastActive": return p.lastActiveAt || 0;
		default: return 0;
	}
}

function projectCostSortData(project) {
	var totals = projectCostSummary(project).totals || [];
	var ordered = totals.slice().sort(function(a, b) { return a.currency.localeCompare(b.currency); });
	return { signature: ordered.map(function(total) { return total.currency; }).join("|") , amounts: ordered.map(function(total) { return total.amount; }) };
}

// 消费汇总已统一为 CNY，排序直接比较同一币种的金额向量。
function compareProjectCost(a, b) {
	var ca = projectCostSortData(a), cb = projectCostSortData(b);
	if (ca.signature !== cb.signature) return ca.signature.localeCompare(cb.signature);
	for (var i = 0; i < Math.max(ca.amounts.length, cb.amounts.length); i++) {
		var va = ca.amounts[i] ?? -1, vb = cb.amounts[i] ?? -1;
		if (va !== vb) return va > vb ? 1 : -1;
	}
	return 0;
}

function ProjectsTable(props) {
	var projects = props.projects;
	var hidden = props.hidden;
	var selected = props.selected;
	var onSelect = props.onSelect;
	var onOpenSession = props.onOpenSession;
	var t = props.t;
	var dayMode = props.dayMode === true; // 按日模式：隐藏"最近活跃"（项目级元数据与单日切片语义冲突）
	var sortPair = useState({ key: "cost", dir: -1 });
	var sort = sortPair[0], setSort = sortPair[1];

	var fallbackColorIndexes = projectColorIndexes(projects);
	var effSortKey = (dayMode && sort.key === "lastActive") ? "cost" : sort.key;
	var sorted = projects.filter((p) => !hidden[p.id]);
	sorted.sort((a, b) => {
		if (effSortKey === "cost") return compareProjectCost(a, b) * sort.dir;
		var va = sortValue(a, effSortKey), vb = sortValue(b, effSortKey);
		return (va > vb ? 1 : (va < vb ? -1 : 0)) * sort.dir;
	});

	var SORT_FIELDS = [
		{ key: "cost", label: t("th.cost") },
		{ key: "sessions", label: t("card.sessions") },
		{ key: "input", label: t("w.input") },
		{ key: "output", label: t("w.output") },
		{ key: "turns", label: t("w.turns") },
		{ key: "steps", label: t("w.steps") },
		{ key: "tool", label: t("w.tool") },
		{ key: "hit", label: t("w.cacheHit") }
	];
	if (!dayMode) SORT_FIELDS.push({ key: "lastActive", label: t("th.lastActive") });

	var toolbar = e("div", { className: "dss-sortbar" },
		e("span", { className: "dss-sortbar-label" }, t("sort.label")),
		e("select", {
			className: "dss-sortbar-select",
			value: effSortKey,
			onChange: function(ev) { setSort({ key: ev.target.value, dir: sort.dir }); }
		},
			SORT_FIELDS.map(function(f) { return e("option", { key: f.key, value: f.key }, f.label); })
		),
		e("button", {
			className: "dss-sortbar-dir",
			onClick: function() { setSort(function(s) { return { key: s.key, dir: -s.dir }; }); },
			title: t("sort.toggle")
		}, sort.dir > 0 ? t("sort.asc") + " ↑" : t("sort.desc") + " ↓")
	);

	var cards = sorted.map(function(p) {
		var i = projectColorIndex(p, props.colorIndexes, fallbackColorIndexes.get(p.id));
		var s = p.stats;
		var isSel = selected === p.id;

		var pm = function(v, l, cls) {
			return e("div", { className: "dss-pm" + (cls ? " " + cls : "") },
				e("div", { className: "dss-pm-l" }, l),
				e("div", { className: "dss-pm-v" }, v)
			);
		};

		var detail = null;
		if (isSel) {
			var mainSessions = p.sessions.filter(function(sd) { return !sd.subagent; });
			var subSessions = p.sessions.filter(function(sd) { return sd.subagent; });
				var sessRow = function(sd) {
					var modelName = modelNameOnly(sd);
					var sessionTitle = sd.title || t("w.untitled");
					var costDetail = sessionCostSummary(sd);
					var sessionCost = fmtCostSummary(costDetail);
					var titleContent = [sessionTitle, sd.subagent ? e("span", { className: "dss-tag", key: "subagent" }, t("w.subagentTag")) : null, sd.archived ? e("span", { className: "dss-tag", key: "archived" }, t("w.archivedTag")) : null, sd.quality === "partial" ? e("span", { className: "dss-tag", key: "partial", title: t("w.partialHint") }, t("w.partialTag")) : sd.quality === "stale" ? e("span", { className: "dss-tag", key: "stale", title: t("w.staleHint") }, t("w.staleTag")) : null,
						costDetail.status === "unsupported" ? e("span", { className: "dss-tag", key: "cost-excluded", title: t("w.costExcludedHint") }, t("w.costExcludedTag")) : costDetail.status === "partial" ? e("span", { className: "dss-tag", key: "cost-partial", title: t("w.costPartialHint") }, t("w.costPartialTag")) : costDetail.status === "estimated" ? e("span", { className: "dss-tag", key: "estimated", title: t("w.estimatedHint") }, t("w.estimatedTag")) : null];
				return e("div", { className: "dss-sess", key: sd.id },
					onOpenSession ? e("button", {
						type: "button",
						className: "ti dss-sess-title",
						title: t("openSession") + ": " + sessionTitle,
						"aria-label": t("openSession") + ": " + sessionTitle,
						onClick: function(ev) { ev.stopPropagation(); onOpenSession(sd); }
					}, titleContent) : e("span", { className: "ti", title: sessionTitle }, titleContent),
					e("span", { className: "me" }, fmtClock(sd.updatedAt)),
					e("span", { className: "st" }, fmtN(sd.stats.turns) + " " + t("w.turns") + " · " + fmtN(sd.stats.steps) + " " + t("w.steps")),
					e("span", { className: "st" }, "LLM " + fmtDuration(sd.stats.llmMs)),
					e("span", { className: "st" }, t("w.tool") + " " + fmtDuration(sd.stats.toolMs)),
					e("span", { className: "st" }, t("w.cacheHit") + " " + fmtPct(sd.stats.cacheHitPct)),
					e("span", { className: "st" }, t("w.input") + " " + fmtTokens(sd.stats.inputTokens) + " · " + t("w.output") + " " + fmtTokens(sd.stats.outputTokens)),
					e("span", { className: "st dss-sess-model", title: modelName }, modelName),
					e("span", { className: "st dss-cost dss-sess-cost", title: sessionCost }, sessionCost)
				);
			};
			var detailChildren = mainSessions.map(sessRow);
			if (subSessions.length) {
				detailChildren = detailChildren.concat([e("div", { className: "dss-group", key: "subgroup" }, t("w.subagentGroup") + " (" + subSessions.length + ")")]);
				detailChildren = detailChildren.concat(subSessions.map(sessRow));
			}
			detail = e("div", { className: "dss-pcard-detail" }, detailChildren);
		}

		var toggleProject = function() { onSelect(p.id); };
		return e("div", { key: p.id, className: "dss-pcard" + (isSel ? " sel" : ""), "data-color": String(i % 16) },
			e("div", {
				className: "dss-pcard-head",
				role: "button",
				tabIndex: 0,
				"aria-expanded": isSel,
				onClick: toggleProject,
				onKeyDown: function(ev) {
					if (ev.key !== "Enter" && ev.key !== " ") return;
					ev.preventDefault();
					toggleProject();
				}
			},
				e("div", { className: "dss-proj" },
					e("span", { className: "dot" }),
					e("span", { className: "dss-proj-txt" },
						e("div", { className: "nm" }, p.name),
						e("div", { className: "ph" }, p.path)
					)
				),
				e("div", { className: "dss-pcard-metrics" },
					pm(fmtSessionCounts(sessionCounts(p.sessions)), t("th.sessions")),
					pm(fmtN(s.turns), t("th.turns")),
					pm(fmtN(s.steps), t("th.steps")),
					pm(fmtDuration(s.toolMs), t("th.tool")),
					pm(fmtDuration(s.ttftAvgMs), t("th.ttft")),
					pm(fmtTps(s.tps), t("th.tps")),
					pm(fmtPct(s.cacheHitPct), t("th.cacheHit")),
					pm(fmtTokens(s.inputTokens), t("th.input")),
					pm(fmtTokens(s.outputTokens), t("th.output")),
					pm(fmtCostSummary(projectCostSummary(p)), t("th.cost"), "cost"),
					dayMode ? null : pm(fmtClock(p.lastActiveAt), t("th.lastActive"))
				)
			),
			detail
		);
	});

	return e("div", { className: "dss-pcards-wrap" },
		toolbar,
		e("div", { className: "dss-pcards-viewport" + (cards.length > MAX_VISIBLE_PROJECTS ? " scrollable" : "") },
			e("div", { className: "dss-pcards" }, cards)
		)
	);
}

// 槽索引（0-47，每槽 30 分钟）→ HH:MM
function slotToClock(s) {
	var m = s * 30;
	return pad(Math.floor(m / 60)) + ":" + pad(m % 60);
}

function groupTimelineBlocks(day, hidden) {
	var projects = new Map();
	var slots = Array.from({ length: 48 }, function() { return []; });
	(day && day.slotBlocks || []).forEach(function(b) {
		if (hidden && hidden[b.projectId]) return;
		if (b.slot < 0 || b.slot >= slots.length) return;
		var project = projects.get(b.projectId);
		if (!project) {
			project = { projectId: b.projectId, name: b.name, colorIndex: b.colorIndex, slots: new Map() };
			projects.set(b.projectId, project);
		}
		project.slots.set(b.slot, (project.slots.get(b.slot) || 0) + Math.max(0, b.ms || 0));
	});
	projects.forEach(function(project) {
		project.slots.forEach(function(ms, slot) {
			slots[slot].push({ projectId: project.projectId, name: project.name, colorIndex: project.colorIndex, ms: ms });
		});
	});
	return { projects: Array.from(projects.values()), slots: slots };
}

function timelineLayout(dayCount, dayMode) {
	// 保留单日默认值供旧调用方使用；全部模式即使只有一天也走紧凑布局。
	var isDayMode = dayMode == null ? dayCount <= 1 : dayMode;
	if (isDayMode) {
		var dayMaxBlockH = 200;
		var dayMaxProjects = 6;
		var dayProjectListH = dayMaxProjects * 15 + Math.max(0, dayMaxProjects - 1) * 9 + 20;
		return {
			maxBlockH: dayMaxBlockH,
			maxProjects: dayMaxProjects,
			laneHeight: 72,
			laneGap: 6,
			laneViewportH: 306,
			rowMinH: Math.max(dayMaxBlockH + 14, dayProjectListH)
		};
	}
	var maxBlockH = dayCount <= 7 ? 112 : 56;
	var maxProjects = dayCount <= 7 ? 5 : 4;
	// 日期行自身、列表首个间距与字体行高需要额外空间，确保三日视口不裁掉第三行。
	var projectListH = maxProjects * 15 + Math.max(0, maxProjects - 1) * 9 + 51 + (dayCount > 1 ? 22 : 0);
	return { maxBlockH: maxBlockH, maxProjects: maxProjects, rowMinH: Math.max(maxBlockH + 14, projectListH) };
}

function timelineDisplayDays(days, dayMode) {
	var ordered = Array.isArray(days) ? days.slice() : [];
	if (!dayMode) ordered.sort(function(a, b) { return String(b.date).localeCompare(String(a.date)); });
	return ordered;
}

function timelineTipRows(blocks) {
	return blocks.map(function(b) { return [b.name, fmtDuration(b.ms)]; });
}

function showTimelineBlocksTip(date, slot, blocks, ev) {
	showTipRaw(tipRows(date + " " + slotToClock(slot) + "–" + slotToClock(slot + 1), timelineTipRows(blocks)), ev);
}

function TimelineView(props) {
	var timeline = props.timeline;
	var hidden = props.hidden;
	var slotMinutes = 30;
	var slotMs = slotMinutes * 60000;
	var tt = props.tt;
	var dayMode = props.dayMode === true;

	var days = timeline.days || [];
	var displayDays = timelineDisplayDays(days, dayMode);
	var maxDay = days.reduce((m, d) => Math.max(m, d.dayTotalMs), 1);
	// 按日使用项目泳道；全部模式保持一天一行，避免长周期高度失控。
	var layout = timelineLayout(days.length, dayMode);
	var maxBlockH = layout.maxBlockH;
	var maxProjects = layout.maxProjects;
	var rowMinH = layout.rowMinH;

	return e("div", null,
		e("div", { className: "dss-hint" }, tt(dayMode ? "hint.timeline.day" : "hint.timeline.all")),
		// 单天模式下每日热条没有意义，隐藏以把空间让给时间线
		days.length > 1 ? e("div", { className: "dss-heat" },
			days.map((d) => {
				var lvl = d.dayTotalMs / maxDay;
				return e("div", {
					key: d.date,
					className: "dss-hm" + (d.dayTotalMs > 0 ? " has" : ""),
					style: d.dayTotalMs > 0 ? { background: `rgba(79,140,255,${(0.18 + 0.82 * lvl).toFixed(2)})` } : null,
					onMouseEnter: (ev) => showTip(tt, d.date, d.dayTotalMs, ev),
					onMouseLeave: () => hideTip(tt),
					onClick: () => { var el = document.getElementById("dss-day-" + d.date); if (el) el.scrollIntoView({ block: "center", behavior: "smooth" }); }
				});
			})
		) : null,
		days.length === 0 ? e("div", { className: "dss-empty" }, tt("hint.rangeEmpty")) :
		e("div", null,
			e("div", { className: "dss-axis" },
				e("div", null),
				e("div", { className: "dss-hours" }, [0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => e("span", { key: h }, h + "h"))),
				e("div", null)
			),
			e("div", {
				className: "dss-timeline-viewport" + (!dayMode && displayDays.length > MAX_VISIBLE_TIMELINE_DAYS ? " scrollable" : ""),
				style: !dayMode && displayDays.length > MAX_VISIBLE_TIMELINE_DAYS ? { "--dss-timeline-max-height": rowMinH * MAX_VISIBLE_TIMELINE_DAYS + "px" } : null
			}, displayDays.map((d) => {
				var grouped = groupTimelineBlocks(d, hidden);
				var projList = grouped.projects;
				var minSlot = 47, maxSlot = -1;
				grouped.slots.forEach(function(blocks, slot) {
					if (!blocks.length) return;
					minSlot = Math.min(minSlot, slot);
					maxSlot = Math.max(maxSlot, slot);
				});
				var wd = tt("w.weekdays").split(",")[new Date(d.date + "T00:00:00Z").getUTCDay()];
				// 右侧信息列：总时长 + 活动时段 + 项目数，填充右侧空白
				var spanText = maxSlot >= 0 ? slotToClock(minSlot) + "–" + slotToClock(maxSlot + 1) : "—";
				// 总时长按可见项目重算（隐藏的项目不计入）
				var visibleMs = grouped.slots.reduce(function(sum, blocks) {
					return sum + blocks.reduce(function(slotSum, b) { return slotSum + b.ms; }, 0);
				}, 0);
				var dayLaneContentH = projList.length ? projList.length * layout.laneHeight + Math.max(0, projList.length - 1) * layout.laneGap + 16 : 56;
				var dayRowMinH = dayMode ? Math.max(56, Math.min(rowMinH, dayLaneContentH)) : rowMinH;
				var rightCol = e("div", { className: "dss-day-info" },
					e("div", { className: "dur" }, fmtDuration(visibleMs)),
					e("div", { className: "span" }, spanText),
					e("div", { className: "cnt" }, projList.length + " " + tt("w.projects"))
				);

				if (dayMode) {
					var lanes = projList.map(function(project) {
						var laneCells = Array.from({ length: 48 }, function(_, slot) {
							var ms = project.slots.get(slot) || 0;
							var block = ms > 0 ? { projectId: project.projectId, name: project.name, colorIndex: project.colorIndex, ms: ms } : null;
							var h = ms > 0 ? Math.min(layout.laneHeight, Math.max(2, Math.round((ms / slotMs) * layout.laneHeight))) : 0;
							return e("div", { className: "dss-day-lane-cell", key: slot }, block ? e("div", {
								className: "dss-blk",
								"data-color": String((project.colorIndex || 0) % 16),
								style: { height: h + "px" },
								onMouseEnter: function(ev) { showTimelineBlocksTip(d.date, slot, [block], ev); },
								onMouseLeave: hideTip
							}) : null);
						});
						return e("div", { className: "dss-day-lane", key: project.projectId },
							e("div", { className: "dss-day-lane-label" },
								e("span", { className: "dss-day-dot", "data-color": String((project.colorIndex || 0) % 16) }),
								e("span", { className: "dss-day-pname", title: project.name }, project.name)
							),
							e("div", { className: "dss-day-lane-track" }, laneCells)
						);
					});
					return e("div", { className: "dss-day day-mode", id: "dss-day-" + d.date, key: d.date, style: { minHeight: dayRowMinH + "px" } },
						e("div", { className: "dss-day-lanes", style: { maxHeight: layout.laneViewportH + "px" } }, lanes),
						rightCol
					);
				}

				var leftCol = e("div", { className: "dss-day-projs" },
					e("div", { className: "dss-day-date" }, d.date + " " + tt("w.dayPrefix") + wd),
					projList.slice(0, maxProjects).map(function(project) {
						return e("div", { className: "dss-day-proj", key: project.projectId },
							e("span", { className: "dss-day-dot", "data-color": String((project.colorIndex || 0) % 16) }),
							e("span", { className: "dss-day-pname", title: project.name }, project.name)
						);
					}),
					projList.length > maxProjects ? e("div", { className: "dss-day-more" }, "+" + (projList.length - maxProjects) + " " + tt("w.projects")) : null
				);
				var cells = grouped.slots.map(function(blocks, slot) {
					if (!blocks.length) return e("div", { className: "dss-cell", key: slot });
					var maxMs = blocks.reduce(function(max, b) { return Math.max(max, b.ms); }, 0);
					var h = Math.min(maxBlockH, Math.max(2, Math.round((maxMs / slotMs) * maxBlockH)));
					return e("div", { className: "dss-cell", key: slot },
						e("div", {
							className: "dss-blk-composite",
							style: { height: h + "px" },
							onMouseEnter: function(ev) { showTimelineBlocksTip(d.date, slot, blocks, ev); },
							onMouseLeave: hideTip
						}, blocks.map(function(block, i) {
							return e("i", { key: block.projectId + "-" + i, className: "dss-blk-segment", "data-color": String((block.colorIndex || 0) % 16), style: { flexGrow: Math.max(1, block.ms) } });
						}))
					);
				});
				return e("div", { className: "dss-day", id: "dss-day-" + d.date, key: d.date, style: { minHeight: rowMinH + "px" } },
					leftCol,
					e("div", { className: "dss-track" }, cells),
					rightCol
				);
			}))
		)
	);
}

// 日期导航器：按日模式（◀ 日期 ▶ + 今天）与全部模式（汇总）
function DateNavigator(props) {
	var nav = props.nav, setNav = props.setNav, dates = props.dates, effectiveDate = props.effectiveDate, t = props.t;
	var mode = nav.mode || "day";
	var idx = effectiveDate ? dates.indexOf(effectiveDate) : -1;

	var setMode = function(m) { setNav({ mode: m, date: effectiveDate }); };
	var move = function(delta) {
		if (idx < 0) return;
		var ni = idx + delta;
		if (ni < 0 || ni >= dates.length) return;
		setNav({ mode: "day", date: dates[ni] });
	};

	return e("div", { className: "dss-nav" },
		e("div", { className: "dss-tabs", style: { marginBottom: 0 } },
			e("button", { className: mode === "day" ? "on" : "", onClick: () => setMode("day") }, t("nav.day")),
			e("button", { className: mode === "all" ? "on" : "", onClick: () => setMode("all") }, t("nav.all"))
		),
		mode === "day" ? e(Fragment, null,
			e("button", { className: "dss-nav-btn", onClick: () => move(-1), disabled: idx <= 0, title: t("nav.previous") }, "‹"),
			e("span", { className: "dss-nav-date" }, effectiveDate ? effectiveDate + " " + t("w.dayPrefix") + t("w.weekdays").split(",")[new Date(effectiveDate + "T00:00:00Z").getUTCDay()] : "—"),
			e("button", { className: "dss-nav-btn", onClick: () => move(1), disabled: idx < 0 || idx >= dates.length - 1, title: t("nav.next") }, "›")
		) : null,
		e("span", { className: "dss-nav-note" }, t("hint.cost"))
	);
}

function download(filename, content, mime) {
	var blob = new Blob([content], { type: mime || "application/octet-stream" });
	var url = URL.createObjectURL(blob);
	var a = document.createElement("a");
	a.href = url; a.download = filename; document.body.appendChild(a); a.click();
	setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
}
function exportJSON(projects) {
	download("dsh-stats.json", JSON.stringify(projects, null, 2), "application/json");
}
function csvField(value) {
	if (value == null) return "";
	var text = String(value);
	return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}
function sessionExportUsages(session) {
	if (Array.isArray(session?.slotUsage) && session.slotUsage.length) return session.slotUsage;
	var stats = session?.stats || {};
	var usage = {
		model: session?.modelRaw || session?.model || "(unknown)",
		slot: Math.floor((session?.updatedAt || session?.createdAt || Date.now()) / SLOT_MS),
		serviceTier: "standard",
		contextTokens: (stats.uncached || 0) + (stats.cacheRead || 0) + (stats.cacheWrite || 0),
		uncached: stats.uncached != null ? stats.uncached : Math.max(0, (stats.inputTokens || 0) - (stats.cacheRead || 0) - (stats.cacheWrite || 0)),
		cacheRead: stats.cacheRead || 0,
		cacheWrite: stats.cacheWrite || 0,
		output: stats.output != null ? stats.output : (stats.outputTokens || 0),
		reasoning: stats.reasoning || 0
	};
	if (Object.prototype.hasOwnProperty.call(session || {}, "providerId")) usage.providerId = session.providerId;
	if (session?.accountType) usage.accountType = session.accountType;
	return [usage];
}

function projectCsvTable(projects, t) {
	var headers = [
		t("th.project"), t("w.path"), t("w.sessionTotal"), t("th.sessions"), t("th.turns"), t("th.steps"), t("th.llm"), t("th.tool"),
		t("th.input"), t("th.output"), t("th.cacheHit"), t("th.cost"),
		"sessionId", "sessionTitle", "updatedAt", "quality", "slotStart", "providerId", "providerFamily", "modelRaw", "modelCanonical", "accountType",
		"serviceTier", "contextTokens", "uncachedInput", "cacheRead", "cacheWrite", "tokenOutput", "reasoning", "currency", "costAmount", "costStatus",
		"exactAmount", "estimatedAmount", "unpricedTokens", "ruleId", "pricingSource", "pricingRetrievedAt"
	];
	var rows = [headers];
	(projects || []).forEach(function (project) {
		var stats = project.stats || {};
		var summary = projectCostSummary(project);
		var projectFields = [
			project.name, project.path, project.sessionCount, fmtSessionCounts(sessionCounts(project.sessions)),
			stats.turns, stats.steps, Math.round(stats.llmMs || 0), Math.round(stats.toolMs || 0),
			stats.inputTokens, stats.outputTokens, stats.cacheHitPct == null ? "" : stats.cacheHitPct, fmtCostSummary(summary)
		];
		if (!project.sessions || !project.sessions.length) {
			rows.push(projectFields.concat(new Array(19).fill(""), summary.status, "", "", summary.unpricedTokens || 0, "", "", ""));
			return;
		}
		project.sessions.forEach(function (session) {
			sessionExportUsages(session).forEach(function (usage) {
				var identity = identityForUsage(usage, session.modelRaw || session.model, session.providerId, session.accountType);
				var cost = usageCostDetail(usage, session.modelRaw || session.model, session.providerId, session.accountType);
				var input = (usage.uncached || 0) + (usage.cacheRead || 0) + (usage.cacheWrite || 0);
				rows.push(projectFields.concat([
					session.id, session.title, session.updatedAt == null ? "" : new Date(session.updatedAt).toISOString(), session.quality || "",
					Number.isFinite(usage.slot) ? new Date(usage.slot * SLOT_MS).toISOString() : "",
					identity.providerId, identity.providerFamily, identity.modelRaw, usage.modelCanonical || cost.modelCanonical || identity.modelCanonical, identity.accountType,
					usage.serviceTier || "standard", Number.isFinite(usage.contextTokens) ? usage.contextTokens : input,
					usage.uncached || 0, usage.cacheRead || 0, usage.cacheWrite || 0, usage.output || 0, usage.reasoning || 0,
					cost.currency, cost.amount, cost.status, cost.exactAmount, cost.estimatedAmount, cost.unpricedTokens,
					cost.ruleId, cost.sourceUrl, cost.retrievedAt
				]));
			});
		});
	});
	return rows;
}

function exportCSV(projects, t) {
	var lines = projectCsvTable(projects, t).map(function(row) { return row.map(csvField).join(","); });
	download("dsh-stats.csv", "\uFEFF" + lines.join("\n"), "text/csv;charset=utf-8");
}

function exportAccountJSON(data) {
	download("dsh-accounts.json", JSON.stringify(data || { generatedAt: Date.now(), accounts: [], warnings: [] }, null, 2), "application/json");
}
function exportAccountCSV(data) {
	var lines = [["providerId", "providerFamily", "mode", "status", "stale", "currency", "remaining", "used", "total", "toppedUp", "granted", "plan", "window", "usedPercent", "remainingPercent", "resetsAt", "fetchedAt", "errorCode"].join(",")];
	(data?.accounts || []).forEach(function(account) {
		var windows = account.windows && account.windows.length ? account.windows : [null];
		windows.forEach(function(window) {
			lines.push([
				account.id, account.providerFamily, account.mode, account.status, account.stale,
				account.balance?.currency, account.balance?.remaining, account.balance?.used, account.balance?.total,
				account.balance?.toppedUp, account.balance?.granted, account.plan, window?.kind,
				window?.usedPercent, window?.remainingPercent, window?.resetsAt, account.fetchedAt, account.errorCode
			].map(csvField).join(","));
		});
	});
	download("dsh-accounts.csv", "\uFEFF" + lines.join("\n"), "text/csv;charset=utf-8");
}

function providerPickerLabel(account) {
	var family = account && typeof account.providerFamily === "string" ? account.providerFamily.trim() : "";
	var displayName = account && typeof account.displayName === "string" ? account.displayName.trim() : "";
	// Pricing keeps untrusted routes in the `unknown` family deliberately. The
	// account selector should still use the configured route name (for example
	// `yi-api`) instead of exposing that internal classification to users.
	return !family || family === "unknown" ? (displayName || family || "unknown") : family;
}

function BalanceView(props) {
	var data = props.data;
	var state = props.state || { kind: "loading" };
	var t = props.t;
	var accounts = data && Array.isArray(data.accounts) ? data.accounts : [];
	var [selectedId, setSelectedId] = useState(accounts[0]?.id || "");
	useEffect(function() {
		if (!accounts.some(function(account) { return account.id === selectedId; })) setSelectedId(accounts[0]?.id || "");
	}, [data, selectedId]);
	if (state.kind === "loading" && !data) return e("div", { className: "dss-balance-state loading" }, t("balance.loading"));
	if (!props.remote) return e("div", { className: "dss-balance-state error" }, t("balance.unavailable"));
	var account = accounts.find(function(item) { return item.id === selectedId; }) || accounts[0] || null;
	var visualStatus = account?.stale ? "stale" : account?.status;
	var ready = account && (account.status === "ok" || account.stale);
	var metrics = account?.balance ? [
		account.balance.toppedUp == null ? null : [t("balance.toppedUp"), fmtBalanceAmount(account.balance.toppedUp, account.balance.currency)],
		account.balance.granted == null ? null : [t("balance.granted"), fmtBalanceAmount(account.balance.granted, account.balance.currency)],
		account.balance.used == null ? null : [t("balance.used"), fmtBalanceAmount(account.balance.used, account.balance.currency)],
		account.balance.total == null ? null : [t("balance.limit"), fmtBalanceAmount(account.balance.total, account.balance.currency)]
	].filter(Boolean) : [];
	var statusMessage = account?.status === "not-configured"
		? t("balance.notConfigured") + (account.missingCredential ? " (" + account.missingCredential + ")" : "")
		: t("balance.message." + (account?.status || "unavailable"));
	return e("div", { className: "dss-balance" },
		e("div", { className: "dss-balance-head" },
			e("div", null,
				e("div", { className: "dss-section-title" }, t("balance.title")),
				e("div", { className: "dss-sec-hint" }, data?.generatedAt ? t("source.updated") + " " + fmtClock(data.generatedAt) : t("balance.hint"))
			),
			accounts.length > 1 ? e("label", { className: "dss-provider-picker" },
				e("span", null, t("balance.provider")),
				e("select", { value: account?.id || "", onChange: function(event) { setSelectedId(event.target.value); } },
					accounts.map(function(item) { return e("option", { key: item.id, value: item.id }, providerPickerLabel(item)); })
				)
			) : null
		),
		state.error ? e("div", { className: "dss-balance-warning" }, state.error) : null,
		!account ? e("div", { className: "dss-empty" }, t("balance.empty")) :
			e("div", { className: "dss-balance-list" },
				e("section", { className: "dss-balance-account provider-" + account.providerFamily, key: account.id },
				e("div", { className: "dss-balance-account-head" },
					e("div", null,
						e("div", { className: "dss-balance-name" }, account.displayName),
						e("div", { className: "dss-balance-currency" }, account.mode === "subscription" ? (account.plan || t("balance.subscription")) : (account.balance?.currency || providerPickerLabel(account)))
					),
					e("span", { className: "dss-balance-status " + visualStatus }, t("balance.status." + visualStatus))
				),
				ready && account.mode === "balance" && account.balance ? e(Fragment, null,
					e("div", { className: "dss-balance-total-label" }, t("balance.total")),
					e("div", { className: "dss-balance-total" }, fmtBalanceAmount(account.balance.remaining, account.balance.currency)),
					metrics.length ? e("div", { className: "dss-balance-breakdown" }, metrics.map(function(metric) {
						return e("div", { className: "dss-balance-metric", key: metric[0] }, e("span", null, metric[0]), e("b", null, metric[1]));
					})) : null
				) : ready && account.mode === "subscription" ? e(Fragment, null,
					e("div", { className: "dss-balance-total-label" }, t("balance.plan")),
					e("div", { className: "dss-balance-plan" }, account.plan || account.displayName),
					e("div", { className: "dss-quota-list" }, (account.windows || []).map(function(window) {
					return e("div", { className: "dss-quota", key: window.kind },
						e("div", { className: "dss-quota-head" }, e("span", null, t("balance.window." + window.kind)), e("b", null, window.remainingPercent.toFixed(1) + "% " + t("balance.remaining"))),
						e("div", { className: "dss-quota-track" }, e("i", { style: { width: window.usedPercent + "%" } })),
						window.resetsAt ? e("div", { className: "dss-quota-reset" }, t("balance.reset") + " " + fmtClock(window.resetsAt)) : null
					);
				}))
				) : e("div", { className: "dss-balance-message" }, statusMessage),
				account.stale ? e("div", { className: "dss-balance-stale" }, t("balance.staleHint")) : null,
				account.actionUrl ? e("a", { className: "dss-balance-topup", href: account.actionUrl, target: "_blank", rel: "noreferrer" }, account.mode === "balance" ? t("balance.topUp") : t("balance.manage")) : null
			)
		)
	);
}

function StatsPanel(props) {
	var open = props.useStatsOpen((o) => o);
	var sessionsSnap = props.useSessions((s) => s);
	var workspacesSnap = props.useWorkspaces((w) => w);
	var onClose = props.onClose;
	var onOpenSession = props.onOpenSession;
	var t = props.t;
	var aggregateRemote = props.aggregate;
	var balanceRemote = props.balance;
	var remoteMountError = props.remoteError;
	var tabPair = usePref("tab", "overview"); var tab = tabPair[0], setTab = tabPair[1];
	var hiddenPair = usePref("hidden", {}); var hidden = hiddenPair[0], setHidden = hiddenPair[1];
	var navPair = usePref("nav", { mode: "day", date: null });
	var storedNav = navPair[0] || {};
	var setNav = navPair[1];
	// 旧版本曾保存 7/30/90 模式；这些模式已从界面移除，统一回退到按日。
	var navMode = storedNav.mode === "all" ? "all" : "day";
	var nav = { mode: navMode, date: storedNav.date || null };
	var [selected, setSelected] = useState(null);
	var [remoteData, setRemoteData] = useState(null);
	var [sourceState, setSourceState] = useState({ kind: aggregateRemote ? "loading" : "fallback", error: remoteMountError || null, at: null });
	var [refreshTick, setRefreshTick] = useState(0);
	var [balanceData, setBalanceData] = useState(null);
	var [balanceState, setBalanceState] = useState({ kind: balanceRemote ? "loading" : "unavailable", error: null });
	var [balanceRefreshRequest, setBalanceRefreshRequest] = useState({ tick: 0, force: false });

	useEffect(() => {
		if (!open || !open.open) return;
		if (!aggregateRemote) { setSourceState({ kind: "fallback", error: remoteMountError || null, at: null }); return; }
		var cancelled = false;
		setSourceState(function(prev) { return { kind: remoteData ? "refreshing" : "loading", error: null, at: prev.at }; });
		aggregateRemote().then((r) => {
			if (cancelled) return;
			setRemoteData(r);
			setSourceState({ kind: r.meta?.degraded ? "partial" : "exact", error: r.meta?.warnings?.map(function(w) { return w.message; }).join("; ") || null, at: r.meta?.generatedAt || Date.now() });
		})
			.catch((err) => {
				if (cancelled) return;
				console.warn("[dsh-stats] aggregate 调用失败:", err);
				setSourceState({ kind: remoteData ? "stale" : "fallback", error: err?.message || String(err), at: remoteData?.meta?.generatedAt || null });
			});
		return () => { cancelled = true; };
	}, [open, aggregateRemote, remoteMountError, refreshTick]);

	// 面板打开期间每 60 秒自动刷新一次
	useEffect(() => {
		if (!open || !open.open || !aggregateRemote) return;
		var id = setInterval(() => {
			setRefreshTick((x) => x + 1);
			setBalanceRefreshRequest((request) => ({ tick: request.tick + 1, force: false }));
		}, 60000);
		return () => clearInterval(id);
	}, [open, aggregateRemote]);

	useEffect(() => {
		if (!open || !open.open) return;
		if (!balanceRemote) { setBalanceState({ kind: "unavailable", error: null }); return; }
		var cancelled = false;
		setBalanceState(function(prev) { return { kind: balanceData ? "refreshing" : "loading", error: null }; });
		balanceRemote(balanceRefreshRequest.force).then(function(result) {
			if (cancelled) return;
			setBalanceData(result);
			var first = result.accounts && result.accounts[0];
			var warning = result.warnings && result.warnings.length ? result.warnings[0].message : null;
			setBalanceState({ kind: first?.status || "error", error: warning });
		}).catch(function(error) {
			if (cancelled) return;
			setBalanceState({ kind: balanceData ? "stale" : "error", error: error?.message || String(error) });
		});
		return function() { cancelled = true; };
	}, [open, balanceRemote, balanceRefreshRequest.tick]);

	var data = useMemo(() => {
			if (remoteData && remoteData.projects) {
				var projects = remoteData.projects.map((p) => ({
					...p, stats: display(p.stats),
					sessions: (p.sessions || []).map((s) => ({ ...s, subagent: s.subagent === true, stats: display(s.stats) }))
				}));
			return { projects, timeline: remoteData.timeline || { days: [] }, remote: true, meta: remoteData.meta };
		}
		var summaries = sessionsSnap && sessionsSnap.byId ? Object.values(sessionsSnap.byId) : [];
		var archivedIds = workspacesSnap?.archivedSessionIds || workspacesSnap?.global?.archivedSessionIds || [];
		var projects = aggregate(summaries, workspacesSnap && workspacesSnap.items, t, archivedIds);
		var timeline = buildTimeline(projects, 30);
		return { projects, timeline, remote: false };
	}, [remoteData, sessionsSnap, workspacesSnap]);

	// hooks 必须在早退之前调用（React 规则：每次渲染 hooks 数量一致）
	// 颜色基于全量项目顺序分配；按日过滤只筛数据，不得让同一项目重新编号。
	var colorIndexes = useMemo(() => projectColorIndexes(data.projects), [data.projects]);

	// 活动日列表（timeline 中有活动的日期）
	var dates = useMemo(() => activityDates(data.timeline), [data.timeline]);

	// 按日模式的有效日期：nav.date 无效或不在活动日列表时，回退最近活动日
	var effectiveDate = useMemo(() => {
		if (navMode !== "day") return null;
		if (nav.date && dates.indexOf(nav.date) >= 0) return nav.date;
		return dates.length ? dates[dates.length - 1] : null;
	}, [navMode, nav.date, dates]);

	// 按日过滤后的项目（全部模式 = 全量）
	var dateProjects = useMemo(() => effectiveDate ? applyDate(data.projects, effectiveDate) : data.projects,
		[data.projects, effectiveDate]);

	// 时间线视图：按日模式只保留选中日
	var viewTimeline = useMemo(() => {
		if (effectiveDate) return { days: (data.timeline.days || []).filter(function(d) { return d.date === effectiveDate; }) };
		return data.timeline;
	}, [data.timeline, effectiveDate]);

	// 全局聚合：全量（热力图 / 7 天趋势 / 连续天数指标卡始终用全量）
	var globals = useMemo(() => buildGlobals(data.projects), [data.projects]);

	// 按日时，项目卡片与趋势只统计有 token 消耗的项目；时间线仍使用完整活动项目。
	var statProjects = useMemo(() => effectiveDate ? dateProjects.filter(hasTokenUsage) : dateProjects, [effectiveDate, dateProjects]);

	// 按日聚合：hero 总览 / 模型分布随选中日期变化（全部模式复用 globals，避免重复计算）
	var dateGlobals = useMemo(() => (effectiveDate ? buildGlobals(statProjects) : globals), [effectiveDate, statProjects, globals]);

	if (!open || !open.open) return null;

	var toggle = (id) => setHidden((h) => ({ ...h, [id]: !h[id] }));
	var visibleProjects = statProjects.filter((p) => !hidden[p.id]);
	var isRefreshing = tab === "balance"
		? balanceState.kind === "loading" || balanceState.kind === "refreshing"
		: sourceState.kind === "loading" || sourceState.kind === "refreshing";
	var refreshCurrent = function() {
		if (tab === "balance") setBalanceRefreshRequest((request) => ({ tick: request.tick + 1, force: true }));
		else setRefreshTick((x) => x + 1);
	};

	return e("div", { className: "dss-overlay", onClick: (ev) => { if (ev.target === ev.currentTarget) onClose(); } },
		e("div", { className: "dss-panel" },
			e("div", { className: "dss-head" },
				e("h2", null, t("title")),
				e("div", { className: "dss-tabs" },
					e("button", { className: tab === "overview" ? "on" : "", onClick: () => setTab("overview") }, t("tab.overview")),
					e("button", { className: tab === "timeline" ? "on" : "", onClick: () => setTab("timeline") }, t("tab.timeline")),
					e("button", { className: tab === "trends" ? "on" : "", onClick: () => setTab("trends") }, t("tab.trends")),
					e("button", { className: tab === "balance" ? "on" : "", onClick: () => setTab("balance") }, t("tab.balance"))
				),
				e("div", { className: "dss-head-actions" },
					e("button", { className: "dss-export", onClick: refreshCurrent, disabled: isRefreshing }, t("refresh")),
					tab !== "balance" ? e(Fragment, null,
						e("button", { className: "dss-export", onClick: () => exportCSV(dateProjects, t) }, "CSV"),
						e("button", { className: "dss-export", onClick: () => exportJSON(dateProjects) }, "JSON")
					) : null,
					e("button", { className: "dss-close", onClick: onClose, title: t("close") },
						e(IconCloseOutline16, { size: 16 })
					)
				)
			),
			e("div", { className: "dss-body" },
				tab === "balance" ? e(BalanceView, { data: balanceData, state: balanceState, remote: balanceRemote, t }) : e(Fragment, null,
					e(DateNavigator, { nav, setNav, dates, effectiveDate, t }),
				tab === "overview" ? e(Fragment, null,
					e(SummaryCards, { projects: visibleProjects, t }),
					e(Legend, { projects: statProjects, colorIndexes, hidden, onToggle: toggle }),
					visibleProjects.length === 0 ? e("div", { className: "dss-empty" }, t("empty")) :
						 e(ProjectsTable, { projects: statProjects, colorIndexes, hidden, selected, t, dayMode: effectiveDate != null, onOpenSession, onSelect: (id) => setSelected((s) => s === id ? null : id) })
				) : tab === "timeline" ? e(TimelineView, { projects: dateProjects, timeline: viewTimeline, hidden, dayMode: effectiveDate != null, tt: t })
				: e(TrendsView, {
					globals,
					dateGlobals,
					selectedDate: effectiveDate,
					onSelectDate: function(date) { setNav({ mode: "day", date: date }); },
					t
				})
				)
			)
		)
	);
}

function showTip(t, label, ms, ev) {
	var el = document.getElementById("dss-tooltip");
	if (!el) { el = document.createElement("div"); el.id = "dss-tooltip"; el.className = "dss-tt"; document.body.appendChild(el); }
	el.innerHTML = `<div style="font-weight:650">${esc(label)}</div><div style="color:var(--dsw-alias-label-secondary,#a6adbb)">${t("w.duration")} <b>${fmtDuration(ms)}</b></div>`;
	el.classList.add("show");
	var pad = 14, x = ev.clientX + pad, y = ev.clientY + pad;
	var r = el.getBoundingClientRect();
	if (x + r.width > window.innerWidth) x = ev.clientX - r.width - pad;
	if (y + r.height > window.innerHeight) y = ev.clientY - r.height - pad;
	el.style.left = x + "px"; el.style.top = y + "px";
}
function hideTip() {
	var el = document.getElementById("dss-tooltip");
	if (el) el.classList.remove("show");
}

// ------------------------------------------------------------------
// 用量趋势视图（重构版：hero 总览 + 指标卡 + 热力图 + 堆叠趋势 + 模型分布）
// ------------------------------------------------------------------
function TrendsView(props) {
	var g = props.globals; // 全量：热力图 / 7 天趋势 / 连续天数指标卡
	var dg = props.dateGlobals || props.globals; // 按日（或全部模式）：hero / 模型分布
	var topModel = dg.models && dg.models.length ? dg.models[0] : null;
	var totals = dg.totals || emptyBucket();
	var totalTok = (totals.input || 0) + (totals.output || 0);
	var hitPct = totals.input > 0 ? Math.round((totals.cacheRead || 0) / totals.input * 100) : null;

	var hero = e("div", { className: "dss-hero" },
		e("div", { className: "dss-hero-main" },
					e("div", { className: "dss-hero-k" }, props.t("trends.totalTokens")),
			e("div", { className: "dss-hero-v" }, fmtTokens(totalTok)),
			e("div", { className: "dss-hero-chips" },
					e("span", { className: "dss-hero-chip" }, props.t("w.input") + " " + fmtTokens(totals.input || 0)),
					e("span", { className: "dss-hero-chip" }, props.t("w.output") + " " + fmtTokens(totals.output || 0)),
					e("span", { className: "dss-hero-chip" }, props.t("trends.totalReasoning") + " " + fmtTokens(totals.reasoning || 0)),
					hitPct != null ? e("span", { className: "dss-hero-chip" }, props.t("w.cacheHit") + " " + hitPct + "%") : null
			)
		),
		e("div", { className: "dss-hero-side" },
			e("div", { className: "dss-hero-cell" },
					e("div", { className: "dss-hero-k" }, props.t("trends.totalCost")),
				e("div", { className: "dss-hero-v dss-cost" }, fmtCostSummary(dg.totalCost))
			),
			e("div", { className: "dss-hero-cell" },
					e("div", { className: "dss-hero-k" }, props.t("trends.mostUsed")),
				e("div", { className: "dss-hero-v model", title: topModel ? (topModel.displayName || modelDisplayName(topModel)) : "" }, topModel ? (topModel.displayName || modelDisplayName(topModel)) : "—")
			)
		)
	);

	var metrics = [
			{ v: fmtN(g.activeDays || 0), l: props.t("trends.activeDays"), s: props.t("trends.activeDaysHint") },
			{ v: fmtN(g.streak || 0), l: props.t("trends.streak"), s: props.t("trends.streakHint") },
			{ v: fmtN(g.longestStreak || 0), l: props.t("trends.longestStreak"), s: props.t("trends.longestStreakHint") },
			{ v: fmtN(g.sessions ? g.sessions.length : 0), l: props.t("trends.totalSessions"), s: props.t("trends.totalSessionsHint") }
	];

	return e("div", { className: "dss-trends" },
		hero,
		e("div", { className: "dss-metric-row" },
			metrics.map(function(m, i) {
				return e("div", { key: i, className: "dss-metric" },
					e("div", { className: "dss-metric-v" }, m.v),
					e("div", { className: "dss-metric-l" }, m.l),
					e("div", { className: "dss-metric-s" }, m.s)
				);
			})
		),
		e(Section, { title: props.t("trends.heatmap"), hint: props.t("trends.heatmapHint") },
			e("div", { className: "dss-trend-duo" },
				e("div", { className: "dss-duo-cell" },
					e(CalendarHeatmap, { byDay: g.byDay || new Map(), selectedDate: props.selectedDate, onSelectDate: props.onSelectDate, t: props.t })
				),
				e("div", { className: "dss-duo-cell grow" },
						e("div", { className: "dss-duo-title" }, props.t("trends.dailyTrend")),
						e(DailyTrendChart, { byDay: g.byDay || new Map(), selectedDate: props.selectedDate, t: props.t })
				)
			)
		),
		e(Section, { title: props.t("trends.modelDist"), hint: props.t("trends.modelHint") },
			e("div", { className: "dss-model-split" },
					e(ModelRing, { models: dg.models || [], t: props.t }),
					e(ModelList, { models: dg.models || [], t: props.t })
			)
		)
	);
}

function Section(props) {
	return e("div", { className: "dss-section" },
		e("div", { className: "dss-sec-head" },
			e("div", { className: "dss-sec-title" }, props.title),
			props.hint ? e("div", { className: "dss-sec-hint" }, props.hint) : null
		),
		props.children
	);
}

// 当月日历热力图：一个月份块，7 列 × 当月实际天数，周一起始，
// 今天描边，未来日期虚化。格子随容器宽度均匀分布（列内居中）。
// 色阶按当月数据分位数分级（GitHub 风格）：无论总量大小，色差总是明显。
function CalendarHeatmap(props) {
	var byDay = props.byDay;
	var t = props.t;
	var todayKey = localDayKey(Date.now());

	var mo = { y: Number(todayKey.slice(0, 4)), m: Number(todayKey.slice(5, 7)) - 1 };
	var first = new Date(Date.UTC(mo.y, mo.m, 1));
	var offset = (first.getUTCDay() + 6) % 7; // 周一 = 0
	var daysInMonth = new Date(Date.UTC(mo.y, mo.m + 1, 0)).getUTCDate();

	var weekLabels = t("trends.weekdays").split(",");
	var DOW = weekLabels.slice(1).concat(weekLabels[0]);

	// 第一遍：收集当月所有活动天的总量 → 分位数阈值（25% / 50% / 75%）
	var actTots = [];
	for (var d0 = 1; d0 <= daysInMonth; d0++) {
		var dk0 = mo.y + "-" + (mo.m + 1 < 10 ? "0" + (mo.m + 1) : "" + (mo.m + 1)) + "-" + (d0 < 10 ? "0" + d0 : "" + d0);
		var b0 = byDay.get(dk0);
		var t0 = (b0 && (b0.input || 0) + (b0.output || 0)) || 0;
		if (t0 > 0) actTots.push(t0);
	}
	actTots.sort(function(a, b) { return a - b; });
	var q1 = 0, q2 = 0, q3 = 0;
	if (actTots.length >= 4) {
		var fq = function(f) { return actTots[Math.min(actTots.length - 1, Math.floor(f * actTots.length))]; };
		q1 = fq(0.25); q2 = fq(0.5); q3 = fq(0.75);
	}
	function lvlOf(tot) {
		if (tot <= 0) return 0;                        // 无活动 → 底色
		if (actTots.length >= 4) {
			if (tot > q3) return 4;                     // 前 25%
			if (tot > q2) return 3;
			if (tot > q1) return 2;
			return 1;                                   // 后 25%
		}
		// 活动天太少时分位无意义：按 10 万/30 万/60 万固定阈值
		if (tot >= 600000) return 4;
		if (tot >= 300000) return 3;
		if (tot >= 100000) return 2;
		return 1;
	}

	var cells = [];
	for (var i = 0; i < offset; i++) cells.push(e("div", { key: "p" + i, className: "dss-cal-pad" }));
	for (var day = 1; day <= daysInMonth; day++) {
		// let 块级绑定：每个 cell 的回调捕获各自的 dk/isFuture（var 会共享最后一天的值）
		let dk = mo.y + "-" + (mo.m + 1 < 10 ? "0" + (mo.m + 1) : "" + (mo.m + 1)) + "-" + (day < 10 ? "0" + day : "" + day);
		let b = byDay.get(dk);
		let tot = (b && (b.input || 0) + (b.output || 0)) || 0;
		let lvl = lvlOf(tot);
		let isToday = dk === todayKey;
		let isFuture = dk > todayKey;
		let isSel = props.selectedDate != null && dk === props.selectedDate;
		let canSelect = tot > 0 && !isFuture && typeof props.onSelectDate === "function";
		cells.push(e(canSelect ? "button" : "span", {
			key: dk,
			type: canSelect ? "button" : undefined,
			className: "dss-cal-cell lvl" + lvl + (tot > 0 ? " has" : "") + (canSelect ? " interactive" : "") + (isToday ? " today" : "") + (isFuture ? " future" : "") + (isSel ? " selected" : ""),
			title: dk,
			"aria-label": canSelect ? dk : undefined,
			"aria-pressed": canSelect ? isSel : undefined,
			onClick: canSelect ? function() { props.onSelectDate(dk); } : undefined,
			onMouseEnter: function(ev) {
				var bbb = byDay.get(dk);
				if (!bbb) { showTipRaw(tipRows(dk, [[t("trends.activity"), isFuture ? t("trends.futureDate") : t("trends.none")]]), ev); return; }
				showTipRaw(tipRows(dk, [
					[t("trends.totalInput"), fmtTokens(bbb.input || 0)],
					[t("trends.totalOutput"), fmtTokens(bbb.output || 0)],
					[t("trends.totalReasoning"), fmtTokens(bbb.reasoning || 0)],
					[t("w.duration"), fmtDuration((bbb.llmMs || 0) + (bbb.toolMs || 0))]
				]), ev);
			},
			onMouseLeave: hideTip
		}));
	}

	return e("div", { className: "dss-cal-wrap" },
		e("div", { className: "dss-cal" },
			e("div", { className: "dss-cal-month" },
				e("div", { className: "dss-cal-title" }, mo.y + "-" + pad(mo.m + 1)),
				e("div", { className: "dss-cal-dow" }, DOW.map(function(dw, i) { return e("span", { key: i }, dw); })),
				e("div", { className: "dss-cal-grid" }, cells)
			)
		),
		e("div", { className: "dss-cal-legend" },
			e("span", null, t("trends.less")),
			[0,1,2,3,4].map(function(i) { return e("i", { key: i, className: "dss-hm-lg lvl" + i }); }),
			e("span", null, t("trends.more"))
		)
	);
}

// 结构化 tooltip：标题 + 键值行（内容全部转义，杜绝注入）
function tipRows(title, rows) {
	var h = "<div class='dss-tip-title'>" + esc(title) + "</div>";
	for (var i = 0; i < rows.length; i++) {
		h += "<div class='dss-tip-row'><span>" + esc(String(rows[i][0])) + "</span><b>" + esc(String(rows[i][1])) + "</b></div>";
	}
	return h;
}

function showTipRaw(html, ev) {
	var el = document.getElementById("dss-tooltip");
	if (!el) { el = document.createElement("div"); el.id = "dss-tooltip"; el.className = "dss-tt"; document.body.appendChild(el); }
	el.innerHTML = html.replace(/\n/g, "<br>");
	el.classList.add("show");
	var pad = 14, x = ev.clientX + pad, y = ev.clientY + pad;
	var r = el.getBoundingClientRect();
	if (x + r.width > window.innerWidth) x = ev.clientX - r.width - pad;
	if (y + r.height > window.innerHeight) y = ev.clientY - r.height - pad;
	el.style.left = x + "px"; el.style.top = y + "px";
}

// 向上取整到 1/2/5×10^n 的“好看”刻度值
function niceCeil(n) {
	if (!Number.isFinite(n) || n <= 0) return 1;
	var exp = Math.pow(10, Math.floor(Math.log(n) / Math.LN10));
	var f = n / exp;
	var nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
	return nice * exp;
}

// 每日 Token 趋势：最近 7 天（含今天），柱高 = 输入 + 输出；思考是输出子集，仅在提示中展示。
function DailyTrendChart(props) {
	var byDay = props.byDay;
	var t = props.t;
	var todayKey = localDayKey(Date.now());

	// 近 7 天窗口：today-6 … today
	var days = [];
	var d = new Date(todayKey + "T00:00:00Z");
	d.setUTCDate(d.getUTCDate() - 6);
	for (var i = 0; i < 7; i++) {
		days.push({ key: d.toISOString().slice(0, 10), mon: d.getUTCMonth() + 1, day: d.getUTCDate(), dow: (d.getUTCDay() + 6) % 7 });
		d.setUTCDate(d.getUTCDate() + 1);
	}

	var maxTot = 0;
	days.forEach(function(dd) {
		var b = byDay.get(dd.key);
		if (b) maxTot = Math.max(maxTot, (b.input || 0) + (b.output || 0));
	});
	var yMax = niceCeil(maxTot);

	return e("div", { className: "dss-mchart" },
		e("div", { className: "dss-mchart-y" },
			[1, 0.75, 0.5, 0.25, 0].map(function(f, i) {
				return e("div", { key: i, className: "dss-mchart-tick" }, fmtTokens(yMax * f));
			})
		),
		e("div", { className: "dss-mchart-plot" },
			e("div", { className: "dss-mchart-grid" },
				[0,1,2,3].map(function(i) { return e("i", { key: i }); })
			),
			e("div", { className: "dss-mchart-bars" },
				days.map(function(dd) {
					var b = byDay.get(dd.key) || emptyBucket();
					var pIn = Math.max(0, (b.input || 0)) / yMax * 100;
					var pOut = Math.max(0, (b.output || 0)) / yMax * 100;
					return e("div", { key: dd.key, className: "dss-mchart-col" },
						e("div", {
							className: "dss-mchart-bar",
							onMouseEnter: function(ev) {
									showTipRaw(tipRows(dd.key + (dd.key === todayKey ? " " + t("trends.today") : ""), [
										[t("trends.totalInput"), fmtTokens(b.input || 0)],
										[t("trends.totalOutput"), fmtTokens(b.output || 0)],
										[t("trends.totalReasoning"), fmtTokens(b.reasoning || 0)],
										[t("trends.cacheRead"), fmtTokens(b.cacheRead || 0)],
										[t("w.duration"), fmtDuration((b.llmMs || 0) + (b.toolMs || 0))]
								]), ev);
							},
							onMouseLeave: hideTip
						},
							e("div", { className: "dss-mchart-seg input", style: { height: pIn + "%" } }),
						e("div", { className: "dss-mchart-seg output" + ((b.output || 0) > 0 ? " has-value" : ""), style: { height: pOut + "%" } })
						)
					);
				})
			),
			// 日期行独立于柱区，位于 X 轴基线下方
			e("div", { className: "dss-mchart-xlabels" },
				days.map(function(dd) {
					return e("div", { key: dd.key, className: "dss-mchart-label" + (dd.key === todayKey ? " today" : "") + (props.selectedDate != null && dd.key === props.selectedDate ? " selected" : "") },
										dd.key === todayKey ? t("trends.today") : (dd.mon + "/" + dd.day)
					);
				})
			)
		),
		e("div", { className: "dss-mchart-legend" },
					e("span", null, e("i", { className: "dss-mchart-lg input" }), t("w.input")),
					e("span", null, e("i", { className: "dss-mchart-lg output" }), t("trends.outputIncludesReasoning"))
		)
	);
}

function ModelRing(props) {
	var models = props.models;
	var t = props.t;
	if (!models || !models.length) return e("div", { className: "dss-empty" }, t("empty"));

	var total = models.reduce(function(s, m) { return s + ((m.input || 0) + (m.output || 0)); }, 0);
	if (!total) return e("div", { className: "dss-empty" }, t("empty"));

	var cum = 0;
	var stops = models.map(function(m) {
		var v = ((m.input || 0) + (m.output || 0)) / total;
		var from = (cum * 360).toFixed(1);
		cum += v;
		var to = (cum * 360).toFixed(1);
		return { color: modelColor(m.key || m.displayName || m.model || "(unknown)"), from: from, to: to, label: m.displayName || modelDisplayName(m), pct: v * 100, model: m };
	});

	var gradient = stops.map(function(s) { return s.color + " " + s.from + "deg " + s.to + "deg"; }).join(", ");

	return e("div", { className: "dss-ring-wrap" },
		e("div", { className: "dss-ring", style: { background: "conic-gradient(" + gradient + ")" } },
			e("div", { className: "dss-ring-center" },
				e("div", { className: "dss-ring-total" }, fmtTokens(total)),
				e("div", { className: "dss-ring-label" }, t("trends.inputOutput"))
			)
		),
		e("div", { className: "dss-ring-legend" + (modelListNeedsScroll(models) ? " scrollable" : "") },
			stops.map(function(s, i) {
				return e("div", {
					key: i,
					className: "dss-ring-item",
					onMouseEnter: function(ev) { showModelTip(s.model, t, ev); },
					onMouseLeave: hideTip
				},
					e("span", { className: "dss-ring-swatch", style: { background: s.color } }),
					e("span", { className: "dss-ring-name", title: s.label }, s.label),
					e("span", { className: "dss-ring-pct" }, fmtSharePct(s.pct))
				);
			})
		)
	);
}

function showModelTip(model, t, ev) {
	showTipRaw(tipRows(model.displayName || modelDisplayName(model), [
		[t("th.cost"), fmtCostSummary(model.costSummary)],
		[t("w.input"), fmtTokens(model.input || 0)],
		[t("w.output"), fmtTokens(model.output || 0)]
	]), ev);
}

function modelListNeedsScroll(models) {
	return Array.isArray(models) && models.length > MAX_VISIBLE_MODELS;
}

function ModelList(props) {
	var models = props.models;
	var t = props.t;
	if (!models || !models.length) return e("div", { className: "dss-empty" }, t("empty"));

	var total = models.reduce(function(s, m) { return s + ((m.input || 0) + (m.output || 0)); }, 0);

	return e("div", { className: "dss-model-list-viewport" + (modelListNeedsScroll(models) ? " scrollable" : "") },
		e("div", { className: "dss-model-list" },
			models.map(function(m, i) {
				var share = total > 0 ? ((m.input || 0) + (m.output || 0)) / total : 0;
				var pct = share * 100;
				var color = modelColor(m.key || m.displayName || m.model || "(unknown)");
				return e("div", {
					key: i,
					className: "dss-model-item",
					onMouseEnter: function(ev) { showModelTip(m, t, ev); },
					onMouseLeave: hideTip
				},
					e("div", { className: "dss-model-head" },
						e("span", { className: "dss-model-dot", style: { background: color } }),
						e("span", { className: "dss-model-name", title: m.displayName || modelDisplayName(m) }, m.displayName || modelDisplayName(m)),
						e("span", { className: "dss-model-pct" }, fmtSharePct(pct))
					),
					e("div", { className: "dss-model-track" },
						e("div", { className: "dss-model-fill", style: { width: Math.max(1.5, pct) + "%", background: color } })
					),
					e("div", { className: "dss-model-meta" },
						t("w.input") + " " + fmtTokens(m.input || 0) +
							" · " + t("w.output") + " " + fmtTokens(m.output || 0) +
							" · " + t("trends.totalReasoning") + " " + fmtTokens(m.reasoning || 0) +
							" · " + t("card.sessions") + " " + fmtN(m.sessions || 0) +
							" · LLM " + fmtDuration(m.llmMs || 0) +
							" · " + t("w.tool") + " " + fmtDuration(m.toolMs || 0)
					)
				);
			})
		)
	);
}

var _modelColorCache = new Map();
var _modelFallbackIdx = 0;
// DeepSeek 官方模型固定配色：贴合 DSH 蓝色基色（#4f8cff）
var MODEL_COLOR_MAP = {
	"deepseek-v4-pro": "#4f8cff",     // 主蓝
	"deepseek-v4-flash": "#74c0fc",   // 亮蓝
	"deepseek-chat": "#5c7cfa",       // 靛蓝
	"deepseek-reasoner": "#a78bfa"    // 蓝紫
};
// 未知模型兜底色板：全部蓝/青/靛色系，与 DSH 蓝基调一致
var MODEL_PALETTE = ["#74c0fc","#22d3ee","#91a7ff","#5c7cfa","#748ffc","#4dabf7","#66d9e8","#9775fa","#b197fc","#a5d8ff","#3bc9db","#845ef7","#e3fafc","#d0bfff"];
function modelColor(model) {
	if (_modelColorCache.has(model)) return _modelColorCache.get(model);
	var name = model || "(unknown)";
	var c;
	if (MODEL_COLOR_MAP[name]) {
		c = MODEL_COLOR_MAP[name];
	} else {
		c = MODEL_PALETTE[_modelFallbackIdx % MODEL_PALETTE.length];
		_modelFallbackIdx++;
	}
	_modelColorCache.set(model, c);
	return c;
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
const inject = ["slots", "locale", "remote", "sessions"];
const NS = "stats";
const zh = {
	"trigger": "用量",
	"title": "DSH 用量",
	"tab.overview": "项目总览",
	"tab.timeline": "开发时间线",
	"tab.trends": "用量趋势",
	"tab.balance": "账户余额",
	"close": "关闭",
	"openSession": "打开对话",
	"empty": "暂无数据",
	"refresh": "刷新",
	"source.updated": "更新时间",
	"nav.day": "按日", "nav.days7": "7日", "nav.days30": "30日", "nav.days90": "90日", "nav.all": "全部", "nav.previous": "前一天", "nav.next": "后一天",
	"sort.label": "排序", "sort.toggle": "切换升降序", "sort.asc": "升序", "sort.desc": "降序",
	"card.projects": "项目",
	"card.sessions": "会话",
	"card.turnsSteps": "轮 / 步",
	"card.llm": "LLM 时长",
	"card.tool": "工具时长",
	"card.input": "输入 tok",
	"card.output": "输出 tok",
	"card.cacheHit": "平均缓存命中",
	"card.cost": "消费金额",
	"th.project": "项目",
	"th.sessions": "会话",
	"th.turns": "轮",
	"th.steps": "步",
	"th.llm": "LLM",
	"th.tool": "工具",
	"th.ttft": "首 token",
	"th.tps": "tok/s",
	"th.cacheHit": "缓存命中",
	"th.input": "输入 tok",
	"th.output": "输出 tok",
	"th.cost": "消费",
	"th.lastActive": "最近活跃",
	"w.turns": "轮",
	"w.steps": "步",
	"w.tool": "工具",
	"w.ttft": "首 token",
	"w.cacheHit": "缓存命中",
	"w.input": "输入",
	"w.output": "输出",
	"w.subagentTag": "子对话",
	"w.archivedTag": "已归档",
	"w.partialTag": "不完整",
	"w.partialHint": "日志或缓存校验未通过，仅显示已确认数据",
	"w.costExcludedTag": "未计价",
	"w.costExcludedHint": "无法确认价格，该会话未计入主费用汇总",
	"w.costPartialTag": "费用部分确认",
	"w.costPartialHint": "仅可确认的人民币金额计入主汇总",
	"w.estimatedTag": "估算",
	"w.estimatedHint": "按公开模型价格与固定汇率换算，仅供估算，不等同 Provider 账单",
	"w.staleTag": "过期",
	"w.staleHint": "读取失败，显示最近一次有效快照",
	"w.subagentGroup": "子对话",
	"w.untitled": "（未命名会话）",
	"w.duration": "开发时长",
	"w.path": "路径",
	"w.sessionTotal": "会话总数",
	"w.projects": "项目",
	"w.unnamed": "（未命名）",
	"w.uncategorized": "（未分类）",
	"w.weekdays": "日,一,二,三,四,五,六",
	"w.dayPrefix": "周",
	"hint.timeline.day": "按项目分泳道；块高 = 该 30 分钟时段开发时长占比",
	"hint.timeline.all": "同一时段的多个项目合并显示，悬停查看各项目时长",
	"hint.rangeEmpty": "该范围内暂无开发活动",
	"hint.cost": "按公开模型价格与固定汇率估算，仅供参考",
	"trends.activeDays": "活跃天数",
	"trends.streak": "当前连续",
	"trends.longestStreak": "最长连续",
	"trends.mostUsed": "最常用模型",
	"trends.totalSessions": "总会话",
	"trends.totalInput": "总输入",
	"trends.totalOutput": "总输出",
	"trends.totalReasoning": "思考 token",
	"trends.totalTokens": "总 Token 消耗", "trends.totalCost": "总消费", "trends.activeDaysHint": "有活动的自然日", "trends.streakHint": "截至最近活动日", "trends.longestStreakHint": "历史最佳纪录", "trends.totalSessionsHint": "主会话 + 子会话",
	"trends.heatmap": "活动热力图",
	"trends.heatmapHint": "左侧：当月按实际天数 · 右侧：近 7 天每日 Token", "trends.dailyTrend": "每日 Token（近 7 天）", "trends.modelHint": "按输入 + 输出 token 占比",
	"trends.activity": "活动", "trends.futureDate": "未来日期", "trends.none": "无", "trends.less": "少", "trends.more": "多", "trends.today": "今天", "trends.cacheRead": "缓存读取", "trends.outputIncludesReasoning": "输出（含思考）", "trends.inputOutput": "输入 + 输出",
	"trends.modelDist": "模型分布",
	"balance.title": "账户余额与额度", "balance.hint": "官方账户数据，凭证仅在宿主侧使用", "balance.loading": "正在读取账户数据…", "balance.unavailable": "账户服务不可用", "balance.empty": "暂无账户数据", "balance.provider": "Provider", "balance.total": "可用总余额", "balance.toppedUp": "充值余额", "balance.granted": "赠送余额", "balance.used": "已使用", "balance.limit": "总额度", "balance.plan": "当前套餐", "balance.subscription": "订阅额度", "balance.remaining": "剩余", "balance.reset": "重置时间", "balance.topUp": "前往充值", "balance.manage": "管理账户", "balance.notConfigured": "未配置所需凭证", "balance.staleHint": "本次刷新失败，当前显示上次成功结果", "balance.status.ok": "正常", "balance.status.stale": "已过期", "balance.status.not-configured": "未配置", "balance.status.unauthorized": "未授权", "balance.status.rate-limited": "请求受限", "balance.status.unavailable": "不可用", "balance.status.invalid-response": "响应异常", "balance.status.blocked": "已拦截", "balance.status.unsupported": "不支持", "balance.message.unauthorized": "凭证无效或没有查询权限", "balance.message.rate-limited": "Provider 限流，请稍后刷新", "balance.message.unavailable": "Provider 账户服务暂不可用", "balance.message.invalid-response": "Provider 返回了无法识别的账户数据", "balance.message.blocked": "账户端点不符合安全白名单", "balance.message.unsupported": "该 Provider 没有可用的官方账户查询端点", "balance.window.session": "本时段", "balance.window.weekly": "本周", "balance.window.billing": "计费周期", "balance.window.daily": "今日", "balance.window.monthly": "本月",
	"trends.days": "天",
	"trends.weekdays": "日,一,二,三,四,五,六"
};
const en = {
	"trigger": "Usage",
	"title": "DSH Usage",
	"tab.overview": "Overview",
	"tab.timeline": "Timeline",
	"tab.trends": "Usage Trends",
	"tab.balance": "Account Balance",
	"close": "Close",
	"openSession": "Open conversation",
	"empty": "No data",
	"refresh": "Refresh",
	"source.updated": "Updated",
	"nav.day": "Day", "nav.days7": "7D", "nav.days30": "30D", "nav.days90": "90D", "nav.all": "All", "nav.previous": "Previous day", "nav.next": "Next day",
	"sort.label": "Sort", "sort.toggle": "Toggle sort direction", "sort.asc": "Ascending", "sort.desc": "Descending",
	"card.projects": "Projects",
	"card.sessions": "Sessions",
	"card.turnsSteps": "Turns / Steps",
	"card.llm": "LLM time",
	"card.tool": "Tool time",
	"card.input": "Input tok",
	"card.output": "Output tok",
	"card.cacheHit": "Avg cache hit",
	"card.cost": "Cost",
	"th.project": "Project",
	"th.sessions": "Sessions",
	"th.turns": "Turns",
	"th.steps": "Steps",
	"th.llm": "LLM",
	"th.tool": "Tool",
	"th.ttft": "First token",
	"th.tps": "tok/s",
	"th.cacheHit": "Cache hit",
	"th.input": "Input tok",
	"th.output": "Output tok",
	"th.cost": "Cost",
	"th.lastActive": "Last active",
	"w.turns": "turns",
	"w.steps": "steps",
	"w.tool": "Tool",
	"w.ttft": "First token",
	"w.cacheHit": "Cache hit",
	"w.input": "Input",
	"w.output": "Output",
	"w.subagentTag": "sub-agent",
	"w.archivedTag": "archived",
	"w.partialTag": "partial",
	"w.partialHint": "Log or cache validation failed; only confirmed data is shown",
	"w.costExcludedTag": "unpriced",
	"w.costExcludedHint": "Price could not be confirmed; this session is excluded from the primary spend total",
	"w.costPartialTag": "partially priced",
	"w.costPartialHint": "Only confirmed RMB is included in the primary total",
	"w.estimatedTag": "estimated",
	"w.estimatedHint": "Converted from public model prices and a fixed FX snapshot; not the provider bill",
	"w.staleTag": "stale",
	"w.staleHint": "Read failed; showing the last valid snapshot",
	"w.subagentGroup": "Sub-agent sessions",
	"w.untitled": " (untitled)",
	"w.duration": "Duration",
	"w.path": "Path",
	"w.sessionTotal": "Total sessions",
	"w.projects": "projects",
	"w.unnamed": "(unnamed)",
	"w.uncategorized": "(uncategorized)",
	"w.weekdays": "Sun,Mon,Tue,Wed,Thu,Fri,Sat",
	"w.dayPrefix": "",
	"hint.timeline.day": "Projects use separate lanes; block height = share of development time in that 30-min slot",
	"hint.timeline.all": "Overlapping projects are combined; hover to see each project duration",
	"hint.rangeEmpty": "No activity in this range",
	"hint.cost": "Estimated from public model prices and a fixed FX rate; for reference only",
	"trends.activeDays": "Active days",
	"trends.streak": "Current streak",
	"trends.longestStreak": "Longest streak",
	"trends.mostUsed": "Most used",
	"trends.totalSessions": "Total sessions",
	"trends.totalInput": "Total input",
	"trends.totalOutput": "Total output",
	"trends.totalReasoning": "Thinking tokens",
	"trends.totalTokens": "Total token usage", "trends.totalCost": "Total cost", "trends.activeDaysHint": "Calendar days with activity", "trends.streakHint": "Through the latest active day", "trends.longestStreakHint": "Best historical run", "trends.totalSessionsHint": "Main + sub-agent sessions",
	"trends.heatmap": "Activity heatmap",
	"trends.heatmapHint": "Calendar days this month · daily tokens for the last 7 days", "trends.dailyTrend": "Daily tokens (last 7 days)", "trends.modelHint": "Share of input + output tokens",
	"trends.activity": "Activity", "trends.futureDate": "Future date", "trends.none": "None", "trends.less": "Less", "trends.more": "More", "trends.today": "Today", "trends.cacheRead": "Cache read", "trends.outputIncludesReasoning": "Output (incl. reasoning)", "trends.inputOutput": "Input + output",
	"trends.modelDist": "Model distribution",
	"balance.title": "Accounts and quotas", "balance.hint": "Official account data; credentials stay on the host", "balance.loading": "Reading account data…", "balance.unavailable": "Account service unavailable", "balance.empty": "No account data", "balance.provider": "Provider", "balance.total": "Total available", "balance.toppedUp": "Top-up balance", "balance.granted": "Granted balance", "balance.used": "Used", "balance.limit": "Total limit", "balance.plan": "Current plan", "balance.subscription": "Subscription quota", "balance.remaining": "remaining", "balance.reset": "Resets", "balance.topUp": "Top up", "balance.manage": "Manage account", "balance.notConfigured": "Required credential is not configured", "balance.staleHint": "Refresh failed; showing the last successful result", "balance.status.ok": "OK", "balance.status.stale": "Stale", "balance.status.not-configured": "Not configured", "balance.status.unauthorized": "Unauthorized", "balance.status.rate-limited": "Rate limited", "balance.status.unavailable": "Unavailable", "balance.status.invalid-response": "Invalid response", "balance.status.blocked": "Blocked", "balance.status.unsupported": "Unsupported", "balance.message.unauthorized": "The credential is invalid or lacks account permissions", "balance.message.rate-limited": "The provider rate limit was reached; refresh later", "balance.message.unavailable": "The provider account service is temporarily unavailable", "balance.message.invalid-response": "The provider returned unrecognized account data", "balance.message.blocked": "The account endpoint is outside the safety allowlist", "balance.message.unsupported": "This provider has no supported official account endpoint", "balance.window.session": "Current window", "balance.window.weekly": "This week", "balance.window.billing": "Billing period", "balance.window.daily": "Today", "balance.window.monthly": "This month",
	"trends.days": "days",
	"trends.weekdays": "S,M,T,W,T,F,S"
};

function parseAggregateResult(value) {
	var object = function(input, path, keys) {
		if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError(path + ": expected object");
		Object.keys(input).forEach(function(key) { if (keys.indexOf(key) < 0) throw new TypeError(path + "." + key + ": unexpected field"); });
		return input;
	};
	var array = function(input, path) { if (!Array.isArray(input)) throw new TypeError(path + ": expected array"); return input; };
	var string = function(input, path) { if (typeof input !== "string") throw new TypeError(path + ": expected string"); };
	var nullableString = function(input, path) { if (input !== null && typeof input !== "string") throw new TypeError(path + ": expected string or null"); };
	var boolean = function(input, path) { if (typeof input !== "boolean") throw new TypeError(path + ": expected boolean"); };
	var number = function(input, path, integer) {
		if (!Number.isFinite(input) || input < 0 || (integer && !Number.isInteger(input))) throw new TypeError(path + ": expected non-negative " + (integer ? "integer" : "number"));
	};
	var nullableNumber = function(input, path) { if (input !== null && !Number.isFinite(input)) throw new TypeError(path + ": expected number or null"); };
	var numberFields = ["turns", "steps", "llmMs", "toolMs", "ttftMs", "ttftSteps", "decodeMs", "decodeTokens", "uncached", "output", "cacheRead", "cacheWrite", "reasoning"];
	var checkStats = function(stats, path) {
		object(stats, path, numberFields);
		numberFields.forEach(function(k) { number(stats[k], path + "." + k, false); });
	};
	var checkCostSummary = function(cost, path) {
		object(cost, path, ["status", "totals", "unpricedTokens", "unknownRows"]);
		if (["exact", "estimated", "free", "partial", "unsupported"].indexOf(cost.status) < 0) throw new TypeError(path + ".status: invalid value");
		array(cost.totals, path + ".totals").forEach(function(total, index) {
			var tp = path + ".totals[" + index + "]";
			object(total, tp, ["currency", "amount", "exactAmount", "estimatedAmount"]); string(total.currency, tp + ".currency");
			["amount", "exactAmount", "estimatedAmount"].forEach(function(key) { number(total[key], tp + "." + key, false); });
		});
		number(cost.unpricedTokens, path + ".unpricedTokens", false); number(cost.unknownRows, path + ".unknownRows", true);
	};
	var checkCost = function(cost, path) {
		object(cost, path, ["status", "amount", "currency", "exactAmount", "estimatedAmount", "unpricedTokens", "ruleId", "sourceUrl", "retrievedAt", "providerId", "providerFamily", "modelCanonical"]);
		if (["exact", "estimated", "free", "subscription", "unsupported", "ambiguous"].indexOf(cost.status) < 0) throw new TypeError(path + ".status: invalid value");
		nullableNumber(cost.amount, path + ".amount"); nullableString(cost.currency, path + ".currency");
		["exactAmount", "estimatedAmount", "unpricedTokens"].forEach(function(key) { number(cost[key], path + "." + key, false); });
		["ruleId", "sourceUrl", "retrievedAt"].forEach(function(key) { nullableString(cost[key], path + "." + key); });
		["providerId", "providerFamily", "modelCanonical"].forEach(function(key) { string(cost[key], path + "." + key); });
	};
	object(value, "stats/aggregate", ["projects", "cost", "timeline", "meta"]);
	var schemaVersion = value.meta?.schemaVersion || 1;
	if (schemaVersion >= 2) checkCostSummary(value.cost, "cost");
	array(value.projects, "projects");
	value.projects.forEach(function(p, pi) {
		var pp = "projects[" + pi + "]";
		object(p, pp, ["id", "name", "path", "sessionCount", "subagentCount", "lastActiveAt", "stats", "cost", "sessions"]);
		string(p.id, pp + ".id"); string(p.name, pp + ".name"); string(p.path, pp + ".path");
		number(p.sessionCount, pp + ".sessionCount", true); number(p.subagentCount, pp + ".subagentCount", true); nullableNumber(p.lastActiveAt, pp + ".lastActiveAt");
		checkStats(p.stats, pp + ".stats"); if (schemaVersion >= 2) checkCostSummary(p.cost, pp + ".cost"); array(p.sessions, pp + ".sessions");
		p.sessions.forEach(function(s, si) {
			var sp = pp + ".sessions[" + si + "]";
			object(s, sp, ["id", "title", "updatedAt", "createdAt", "model", "providerId", "providerFamily", "modelRaw", "modelCanonical", "accountType", "modelUsage", "cost", "archived", "blank", "subagent", "origin", "parentSession", "seedLength", "calls", "stats", "durMs", "slots", "slotStats", "slotUsage", "quality", "cwd"]);
			string(s.id, sp + ".id"); nullableString(s.title, sp + ".title"); nullableNumber(s.updatedAt, sp + ".updatedAt"); nullableNumber(s.createdAt, sp + ".createdAt"); nullableString(s.model, sp + ".model");
			if (schemaVersion >= 2) {
				["providerId", "providerFamily", "modelRaw", "modelCanonical", "accountType"].forEach(function(key) { string(s[key], sp + "." + key); });
				checkCostSummary(s.cost, sp + ".cost");
			}
			boolean(s.archived, sp + ".archived"); boolean(s.blank, sp + ".blank"); boolean(s.subagent, sp + ".subagent"); nullableString(s.origin, sp + ".origin"); nullableString(s.parentSession, sp + ".parentSession"); nullableNumber(s.seedLength, sp + ".seedLength");
			number(s.calls, sp + ".calls", true); checkStats(s.stats, sp + ".stats"); number(s.durMs, sp + ".durMs", false); nullableString(s.cwd, sp + ".cwd");
			if (["exact", "partial", "stale"].indexOf(s.quality) < 0) throw new TypeError(sp + ".quality: invalid value");
			array(s.modelUsage, sp + ".modelUsage").forEach(function(u, ui) {
				var up = sp + ".modelUsage[" + ui + "]";
				object(u, up, ["model", "providerId", "providerFamily", "modelRaw", "modelCanonical", "accountType", "uncached", "output", "cacheRead", "cacheWrite", "reasoning", "cost"]); string(u.model, up + ".model");
				if (schemaVersion >= 2) {
					["providerId", "providerFamily", "modelRaw", "modelCanonical", "accountType"].forEach(function(key) { string(u[key], up + "." + key); });
					checkCostSummary(u.cost, up + ".cost");
				}
				["uncached", "output", "cacheRead", "cacheWrite", "reasoning"].forEach(function(k) { number(u[k], up + "." + k, false); });
			});
			array(s.slots, sp + ".slots").forEach(function(row, ri) {
				var rp = sp + ".slots[" + ri + "]"; object(row, rp, ["slot", "ms"]); number(row.slot, rp + ".slot", true); number(row.ms, rp + ".ms", false);
			});
			array(s.slotStats, sp + ".slotStats").forEach(function(row, ri) {
				var rp = sp + ".slotStats[" + ri + "]"; object(row, rp, ["slot", "turns", "steps", "llmMs", "toolMs", "ttftMs", "ttftSteps", "decodeMs", "decodeTokens"]); number(row.slot, rp + ".slot", true);
				["turns", "steps", "llmMs", "toolMs", "ttftMs", "ttftSteps", "decodeMs", "decodeTokens"].forEach(function(k) { number(row[k], rp + "." + k, false); });
			});
			array(s.slotUsage, sp + ".slotUsage").forEach(function(row, ri) {
				var rp = sp + ".slotUsage[" + ri + "]"; object(row, rp, ["model", "providerId", "providerFamily", "modelRaw", "modelCanonical", "accountType", "serviceTier", "contextTokens", "contextOver512k", "slot", "uncached", "output", "cacheRead", "cacheWrite", "reasoning", "cost"]); string(row.model, rp + ".model");
				if (schemaVersion >= 2) {
					["providerId", "providerFamily", "modelRaw", "modelCanonical", "accountType"].forEach(function(key) { string(row[key], rp + "." + key); });
					number(row.contextTokens, rp + ".contextTokens", false); checkCost(row.cost, rp + ".cost");
				}
				if (["standard", "priority"].indexOf(row.serviceTier) < 0) throw new TypeError(rp + ".serviceTier: invalid value"); boolean(row.contextOver512k, rp + ".contextOver512k"); number(row.slot, rp + ".slot", true);
				["uncached", "output", "cacheRead", "cacheWrite", "reasoning"].forEach(function(k) { number(row[k], rp + "." + k, false); });
			});
		});
	});
	object(value.timeline, "timeline", ["slotMinutes", "days"]); number(value.timeline.slotMinutes, "timeline.slotMinutes", true); if (value.timeline.slotMinutes <= 0) throw new TypeError("timeline.slotMinutes: expected positive integer");
	array(value.timeline.days, "timeline.days").forEach(function(day, di) {
		var dp = "timeline.days[" + di + "]"; object(day, dp, ["date", "dayTotalMs", "slotBlocks"]); string(day.date, dp + ".date"); number(day.dayTotalMs, dp + ".dayTotalMs", false);
		array(day.slotBlocks, dp + ".slotBlocks").forEach(function(block, bi) {
			var bp = dp + ".slotBlocks[" + bi + "]"; object(block, bp, ["slot", "projectId", "name", "colorIndex", "ms"]); number(block.slot, bp + ".slot", true); string(block.projectId, bp + ".projectId"); string(block.name, bp + ".name"); number(block.colorIndex, bp + ".colorIndex", true); number(block.ms, bp + ".ms", false);
		});
	});
	object(value.meta, "meta", ["schemaVersion", "source", "generatedAt", "degraded", "warnings"]); if (value.meta.source !== "host") throw new TypeError("meta.source: expected host"); if (value.meta.schemaVersion !== undefined) number(value.meta.schemaVersion, "meta.schemaVersion", true); number(value.meta.generatedAt, "meta.generatedAt", false); boolean(value.meta.degraded, "meta.degraded");
	array(value.meta.warnings, "meta.warnings").forEach(function(warning, wi) {
		var wp = "meta.warnings[" + wi + "]"; object(warning, wp, ["code", "message", "sessionId"]); string(warning.code, wp + ".code"); string(warning.message, wp + ".message"); if (warning.sessionId !== undefined) string(warning.sessionId, wp + ".sessionId");
	});
	return value;
}

function parseBalanceResult(value) {
	var object = function(input, path, keys) {
		if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError(path + ": expected object");
		Object.keys(input).forEach(function(key) { if (keys.indexOf(key) < 0) throw new TypeError(path + "." + key + ": unexpected field"); });
		return input;
	};
	var array = function(input, path) { if (!Array.isArray(input)) throw new TypeError(path + ": expected array"); return input; };
	var string = function(input, path) { if (typeof input !== "string") throw new TypeError(path + ": expected string"); };
	var nullableString = function(input, path) { if (input !== null && typeof input !== "string") throw new TypeError(path + ": expected string or null"); };
	var nullableNumber = function(input, path) { if (input !== null && (!Number.isFinite(input) || input < 0)) throw new TypeError(path + ": expected non-negative number or null"); };
	object(value, "balance/current", ["generatedAt", "accounts", "warnings"]);
	if (!Number.isFinite(value.generatedAt) || value.generatedAt < 0) throw new TypeError("generatedAt: expected non-negative number");
	array(value.accounts, "accounts").forEach(function(account, index) {
		var path = "accounts[" + index + "]";
		object(account, path, ["provider", "name", "status", "currency", "total", "toppedUp", "granted", "fetchedAt", "topUpUrl", "errorCode"]);
		if (account.provider !== "deepseek") throw new TypeError(path + ".provider: expected deepseek");
		string(account.name, path + ".name");
		if (["ok", "stale", "unconfigured", "error"].indexOf(account.status) < 0) throw new TypeError(path + ".status: invalid value");
		string(account.currency, path + ".currency");
		nullableNumber(account.total, path + ".total"); nullableNumber(account.toppedUp, path + ".toppedUp"); nullableNumber(account.granted, path + ".granted"); nullableNumber(account.fetchedAt, path + ".fetchedAt");
		string(account.topUpUrl, path + ".topUpUrl"); nullableString(account.errorCode, path + ".errorCode");
	});
	array(value.warnings, "warnings").forEach(function(warning, index) {
		var path = "warnings[" + index + "]"; object(warning, path, ["code", "message"]); string(warning.code, path + ".code"); string(warning.message, path + ".message");
	});
	return value;
}

function parseAccountResult(value) {
	var object = function(input, path, keys) {
		if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError(path + ": expected object");
		Object.keys(input).forEach(function(key) { if (keys.indexOf(key) < 0) throw new TypeError(path + "." + key + ": unexpected field"); });
	};
	var string = function(input, path) { if (typeof input !== "string") throw new TypeError(path + ": expected string"); };
	var nullableString = function(input, path) { if (input !== null && typeof input !== "string") throw new TypeError(path + ": expected string or null"); };
	var number = function(input, path, nullable) { if (nullable && input === null) return; if (!Number.isFinite(input) || input < 0) throw new TypeError(path + ": expected non-negative number" + (nullable ? " or null" : "")); };
	var statuses = ["ok", "not-configured", "unauthorized", "rate-limited", "unavailable", "invalid-response", "blocked", "unsupported"];
	object(value, "stats/account", ["generatedAt", "accounts", "warnings"]); number(value.generatedAt, "generatedAt", false);
	if (!Array.isArray(value.accounts)) throw new TypeError("accounts: expected array");
	value.accounts.forEach(function(account, index) {
		var path = "accounts[" + index + "]";
		object(account, path, ["id", "displayName", "providerFamily", "mode", "adapter", "status", "stale", "fetchedAt", "lastSuccessAt", "errorCode", "missingCredential", "actionUrl", "balance", "plan", "windows"]);
		["id", "displayName", "providerFamily"].forEach(function(key) { string(account[key], path + "." + key); });
		if (["balance", "subscription", "unsupported"].indexOf(account.mode) < 0) throw new TypeError(path + ".mode: invalid value");
		if (statuses.indexOf(account.status) < 0) throw new TypeError(path + ".status: invalid value");
		nullableString(account.adapter, path + ".adapter"); nullableString(account.errorCode, path + ".errorCode"); nullableString(account.missingCredential, path + ".missingCredential"); nullableString(account.actionUrl, path + ".actionUrl"); nullableString(account.plan, path + ".plan");
		if (typeof account.stale !== "boolean") throw new TypeError(path + ".stale: expected boolean");
		number(account.fetchedAt, path + ".fetchedAt", false); number(account.lastSuccessAt, path + ".lastSuccessAt", true);
		if (account.balance !== null) {
			var bp = path + ".balance";
			object(account.balance, bp, ["currency", "remaining", "used", "total", "toppedUp", "granted", "unlimited"]); string(account.balance.currency, bp + ".currency");
			["remaining"].forEach(function(key) { number(account.balance[key], bp + "." + key, false); });
			["used", "total", "toppedUp", "granted"].forEach(function(key) { number(account.balance[key], bp + "." + key, true); });
			if (typeof account.balance.unlimited !== "boolean") throw new TypeError(bp + ".unlimited: expected boolean");
		}
		if (!Array.isArray(account.windows)) throw new TypeError(path + ".windows: expected array");
		account.windows.forEach(function(window, wi) {
			var wp = path + ".windows[" + wi + "]"; object(window, wp, ["kind", "usedPercent", "remainingPercent", "resetsAt"]); string(window.kind, wp + ".kind");
			number(window.usedPercent, wp + ".usedPercent", false); number(window.remainingPercent, wp + ".remainingPercent", false); number(window.resetsAt, wp + ".resetsAt", true);
			if (window.usedPercent > 100 || window.remainingPercent > 100) throw new TypeError(wp + ": percentage exceeds 100");
		});
	});
	if (!Array.isArray(value.warnings)) throw new TypeError("warnings: expected array");
	value.warnings.forEach(function(warning, index) { var path = "warnings[" + index + "]"; object(warning, path, ["providerId", "code", "message"]); ["providerId", "code", "message"].forEach(function(key) { string(warning[key], path + "." + key); }); });
	return value;
}

function parseProvidersResult(value) {
	var keys = ["id", "displayName", "providerFamily", "accountMode", "adapter", "configured", "status", "fetchedAt"];
	if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(function(key) { return ["generatedAt", "providers"].indexOf(key) < 0; })) throw new TypeError("stats/providers: expected strict object");
	if (!Number.isFinite(value.generatedAt) || value.generatedAt < 0 || !Array.isArray(value.providers)) throw new TypeError("stats/providers: invalid result");
	value.providers.forEach(function(provider, index) {
		var path = "providers[" + index + "]";
		if (!provider || typeof provider !== "object" || Array.isArray(provider) || Object.keys(provider).some(function(key) { return keys.indexOf(key) < 0; })) throw new TypeError(path + ": expected strict object");
		["id", "displayName", "providerFamily", "accountMode", "status"].forEach(function(key) { if (typeof provider[key] !== "string") throw new TypeError(path + "." + key + ": expected string"); });
		if (provider.adapter !== null && typeof provider.adapter !== "string") throw new TypeError(path + ".adapter: expected string or null");
		if (typeof provider.configured !== "boolean") throw new TypeError(path + ".configured: expected boolean");
		if (provider.fetchedAt !== null && (!Number.isFinite(provider.fetchedAt) || provider.fetchedAt < 0)) throw new TypeError(path + ".fetchedAt: invalid value");
	});
	return value;
}

function adaptLegacyBalance(value) {
	return {
		generatedAt: value.generatedAt,
		accounts: (value.accounts || []).map(function(account, index) {
			var stale = account.status === "stale";
			return {
				id: index ? "deepseek-official-" + account.currency.toLowerCase() : "deepseek-official",
				displayName: account.name,
				providerFamily: "deepseek",
				mode: "balance",
				adapter: "deepseek-balance",
				status: account.status === "ok" ? "ok" : account.status === "unconfigured" ? "not-configured" : "unavailable",
				stale,
				fetchedAt: account.fetchedAt || value.generatedAt,
				lastSuccessAt: account.fetchedAt,
				errorCode: account.errorCode,
				missingCredential: account.status === "unconfigured" ? "DEEPSEEK_API_KEY" : null,
				actionUrl: account.topUpUrl,
				balance: account.total == null ? null : { currency: account.currency, remaining: account.total, used: null, total: null, toppedUp: account.toppedUp, granted: account.granted, unlimited: false },
				plan: null,
				windows: []
			};
		}),
		warnings: (value.warnings || []).map(function(warning) { return { providerId: "deepseek-official", code: warning.code, message: warning.message }; })
	};
}

// 内联 Typert Remote 描述符：DSH 不自动挂载第三方 ./remote，
// 需在客户端手动 ctx.remote.$mount(contribution)。
const STATS_REMOTE_CONTRIBUTION = {
	package: "@rongyi7/dsh-stats",
	descriptors: [{
		id: "@rongyi7/dsh-stats#stats/aggregate",
		service: "stats",
		namespace: "stats",
		method: "aggregate",
			invocation: { kind: "direct" },
			parameters: [],
			result: {
				mode: "strict",
				typeSymbol: "@rongyi7/dsh-stats#stats/aggregate:result",
				schema: { parse: parseAggregateResult }
			},
			sourceLocation: { file: "packages/stats/src/index.ts", line: 1, column: 1 }
		}, {
			id: "@rongyi7/dsh-stats#stats/current",
			service: "stats",
			namespace: "stats",
			method: "current",
			invocation: { kind: "direct" },
			parameters: [],
			result: {
				mode: "strict",
				typeSymbol: "@rongyi7/dsh-stats#stats/current:result",
				schema: { parse: parseBalanceResult }
			},
				sourceLocation: { file: "packages/stats/src/index.ts", line: 1, column: 1 }
			}, {
				id: "@rongyi7/dsh-stats#stats/providers", service: "stats", namespace: "stats", method: "providers", invocation: { kind: "direct" }, parameters: [],
				result: { mode: "strict", typeSymbol: "@rongyi7/dsh-stats#stats/providers:result", schema: { parse: parseProvidersResult } },
				sourceLocation: { file: "packages/stats/src/index.ts", line: 1, column: 1 }
			}, {
				id: "@rongyi7/dsh-stats#stats/account", service: "stats", namespace: "stats", method: "account", invocation: { kind: "direct" }, parameters: [{
					name: "force", wire: "force", source: "json", codec: { mode: "strict", typeSymbol: "@rongyi7/dsh-stats#stats/account:force", schema: { parse: function(value) { if (value !== undefined && typeof value !== "boolean") throw new TypeError("force: expected boolean"); return value; } } }
				}],
				result: { mode: "strict", typeSymbol: "@rongyi7/dsh-stats#stats/account:result", schema: { parse: parseAccountResult } },
				sourceLocation: { file: "packages/stats/src/index.ts", line: 1, column: 1 }
			}]
};

function subagentAddressFor(sessions, session) {
	if (!sessions || !session?.subagent || typeof session.id !== "string") return null;
	try {
		var retained = typeof sessions.subagentAddress === "function" ? sessions.subagentAddress(session.id) : null;
		if (retained) return retained;
		if (typeof session.parentSession !== "string" || !session.parentSession) return null;
		var snapshot = sessions.list?.getSnapshot?.();
		var catalog = snapshot?.subagentsByParent?.[session.parentSession];
		var entry = catalog?.entries?.find(function(candidate) { return candidate.kind === "child" && candidate.id === session.id; });
		if (!entry || (entry.mode !== "one-shot" && entry.mode !== "continuable")) return null;
		return { parentSessionId: session.parentSession, childSessionId: session.id, mode: entry.mode };
	} catch {
		return null;
	}
}

async function openStatsSession(sessions, session) {
	if (!sessions || typeof sessions.open !== "function") throw new Error("sessions.open is unavailable");
	if (!session || typeof session.id !== "string" || !session.id) throw new Error("session id is unavailable");
	try {
		sessions.open(session.id);
		return;
	} catch (openError) {
		if (!session.subagent || typeof sessions.openSubagent !== "function") throw openError;
		var address = subagentAddressFor(sessions, session);
		if (!address && typeof session.parentSession === "string" && session.parentSession && typeof sessions.refreshSubagents === "function") {
			await sessions.refreshSubagents(session.parentSession);
			address = subagentAddressFor(sessions, session);
		}
		if (!address) throw openError;
		sessions.openSubagent(address);
	}
}

async function apply(ctx) {
	// 附加 CSS — 必须在 CSS 注入前定义
	var _phaseDCSS = "\n\t.dss-tc-val.dss-tc-cost{color:#ff922b}" +
		"\n\t.dss-ml-row .dss-ml-reasoning{color:#cc5de8}" +
		"\n\t.dss-balance{display:flex;flex-direction:column;gap:14px}" +
		".dss-balance-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}" +
		".dss-section-title{font-size:14px;font-weight:650;color:var(--dsw-alias-label-primary,#e7eaf0)}" +
		".dss-balance-head .dss-sec-hint{margin-top:4px}" +
		".dss-provider-picker{display:flex;align-items:center;gap:8px;color:var(--dsw-alias-label-secondary,#a6adbb);font-size:11px;white-space:nowrap}" +
		".dss-provider-picker select{width:128px;min-width:128px;height:30px;padding:0 28px 0 9px;border:1px solid var(--dsw-alias-border,#2a303c);border-radius:7px;background:var(--dsw-specific-menu,#1d222c);color:var(--dsw-alias-label-primary,#e7eaf0);font-size:12px;outline:none}" +
		".dss-provider-picker select:focus{border-color:#60a5fa}" +
		".dss-balance-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px}" +
		".dss-balance-account{--dss-balance-text:var(--dsw-alias-label-primary,#e7eaf0);--dss-balance-muted:var(--dsw-alias-label-secondary,#a6adbb);--dss-balance-metric-bg:rgba(255,255,255,.42);--dss-balance-metric-border:rgba(37,99,235,.28);background:var(--dsw-specific-menu,#1d222c);border:1px solid var(--dsw-alias-border,#2a303c);border-radius:10px;padding:18px;overflow:hidden}" +
		".dss-balance-account.provider-deepseek{--dss-balance-text:#0f172a;--dss-balance-muted:#1d4ed8;--dss-balance-metric-bg:rgba(255,255,255,.42);--dss-balance-metric-border:rgba(37,99,235,.28);background:linear-gradient(135deg,#dbeafe 0%,#e0f2fe 54%,#f8fafc 100%);border-color:#93c5fd;box-shadow:inset 0 1px 0 rgba(255,255,255,.7)}" +
		"body[data-ds-dark-theme] .dss-balance-account.provider-deepseek{--dss-balance-text:#f8fbff;--dss-balance-muted:#bfdbfe;--dss-balance-metric-bg:rgba(15,23,42,.22);--dss-balance-metric-border:rgba(147,197,253,.34);background:linear-gradient(135deg,rgba(37,99,235,.28) 0%,rgba(14,165,233,.13) 54%,rgba(15,23,42,.04) 100%),var(--dsw-specific-menu,#1d222c);border-color:rgba(96,165,250,.44);box-shadow:inset 0 1px 0 rgba(191,219,254,.08)}" +
		".dss-balance-account-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}" +
		".dss-balance-name{font-size:15px;font-weight:700;color:var(--dss-balance-text)}" +
		".dss-balance-currency{font-size:11px;color:var(--dss-balance-muted);margin-top:3px}" +
		".dss-balance-status{font-size:11px;font-weight:600;padding:3px 7px;border:1px solid transparent;border-radius:5px;background:rgba(96,165,250,.12);color:#60a5fa}" +
		".dss-balance-status.ok{color:#6ee7b7;background:rgba(16,185,129,.12);border-color:rgba(52,211,153,.18)}" +
		".dss-balance-status.stale{color:#fde68a;background:rgba(251,191,36,.12);border-color:rgba(251,191,36,.18)}" +
		".dss-balance-status.not-configured,.dss-balance-status.unauthorized,.dss-balance-status.invalid-response,.dss-balance-status.blocked{color:#fca5a5;background:rgba(248,113,113,.12);border-color:rgba(248,113,113,.18)}" +
		".dss-balance-status.rate-limited,.dss-balance-status.unavailable{color:#fde68a;background:rgba(251,191,36,.12);border-color:rgba(251,191,36,.18)}" +
		".dss-balance-status.unsupported{color:var(--dsw-alias-label-secondary,#a6adbb);background:rgba(148,163,184,.1);border-color:rgba(148,163,184,.18)}" +
		".dss-balance-total-label{margin-top:24px;font-size:11.5px;color:var(--dss-balance-muted)}" +
		".dss-balance-total{font-size:34px;font-weight:750;line-height:1.08;margin-top:5px;color:var(--dss-balance-text);font-variant-numeric:tabular-nums}" +
		".dss-balance-plan{font-size:24px;font-weight:720;line-height:1.2;margin-top:6px;color:var(--dss-balance-text)}" +
		".dss-balance-breakdown{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:20px;padding-top:14px;border-top:1px solid rgba(37,99,235,.18);font-variant-numeric:tabular-nums}" +
		".dss-balance-metric{display:flex;flex-direction:column;gap:4px;min-width:0;padding:9px 11px;border:1px solid var(--dss-balance-metric-border);border-radius:7px;background:var(--dss-balance-metric-bg);box-sizing:border-box}" +
		".dss-balance-metric+.dss-balance-metric{padding-left:11px;padding-right:11px;border-left:1px solid var(--dss-balance-metric-border)}" +
		".dss-balance-metric span{font-size:11px;color:var(--dss-balance-muted)}" +
		".dss-balance-metric b{font-size:14px;color:var(--dss-balance-text);white-space:nowrap}" +
		".dss-quota-list{display:flex;flex-direction:column;gap:14px;margin-top:20px;padding-top:16px;border-top:1px solid var(--dsw-alias-border,#2a303c)}" +
		".dss-quota-head{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12px;color:var(--dss-balance-muted)}" +
		".dss-quota-head b{color:var(--dss-balance-text);font-variant-numeric:tabular-nums}" +
		".dss-quota-track{height:7px;margin-top:7px;overflow:hidden;border-radius:4px;background:rgba(148,163,184,.2)}" +
		".dss-quota-track i{display:block;height:100%;border-radius:4px;background:#3b82f6}" +
		".dss-quota-reset{margin-top:5px;font-size:10.5px;color:var(--dss-balance-muted)}" +
		".dss-balance-stale{margin-top:10px;color:#fde68a;font-size:11.5px}" +
		".dss-balance-message{margin-top:24px;color:var(--dsw-alias-label-secondary,#a6adbb);font-size:12px;line-height:1.5}" +
		".dss-balance-topup{display:inline-flex;align-items:center;justify-content:center;margin-top:18px;min-height:30px;padding:0 12px;border:1px solid #2563eb;border-radius:7px;background:#2563eb;color:#fff;font-size:12px;font-weight:600;text-decoration:none}" +
		".dss-balance-topup:hover{background:#1d4ed8;border-color:#1d4ed8}" +
		".dss-balance-state{padding:42px 0;text-align:center;color:var(--dsw-alias-label-secondary,#a6adbb)}" +
		".dss-balance-state.error{color:#fbbf24}" +
		".dss-balance-warning{border:1px solid rgba(251,191,36,.22);background:rgba(251,191,36,.08);border-radius:8px;padding:9px 11px;color:#fbbf24;font-size:12px}" +
		"@media (max-width:640px){.dss-balance-head{flex-direction:column}.dss-provider-picker{width:100%;justify-content:space-between}.dss-provider-picker select{min-width:0;max-width:72%;flex:1}.dss-balance-account{padding:15px}.dss-balance-total{font-size:30px}.dss-balance-breakdown{gap:8px}}\n\t";

	var ownedStyle = null;
	if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(CSS_ID) + "]") === null) {
		var tag = document.createElement("style");
		tag.dataset.plugin = "@rongyi7/dsh-stats";
		tag.dataset.pluginCss = CSS_ID;
		tag.textContent = css + _phaseDCSS;
		document.head.appendChild(tag);
		ownedStyle = tag;
	}
	ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-stats: dictionaries");
	const openStore = createOpenStore();
	const onOpenSession = async (session) => {
		try {
			await openStatsSession(ctx.sessions, session);
			openStore.close();
		} catch (error) {
			console.warn("[dsh-stats] 无法打开会话 " + (session?.id || "(unknown)") + ":", error);
		}
	};

	let aggregateRemote = null;
	let balanceRemote = null;
	let remoteError = null;
	let disposeRemote = () => {};
	try {
		disposeRemote = await ctx.remote.$mount(STATS_REMOTE_CONTRIBUTION);
		// 不能直接 ctx.remote.stats 访问（本 fiber 未注入 remote.stats 会报 without inject，
		// 而注入它又会死锁：提供者正是本次 $mount）。用注入 remote.stats 的子 ctx 访问。
		await ctx.inject(["remote", "remote.stats"], function statsConsumer(childCtx) {
			aggregateRemote = async () => {
				const answered = await childCtx.remote.stats.aggregate();
				if (!answered.ok) throw new Error(answered.error?.message || "stats/aggregate failed");
				return answered.value;
			};
			balanceRemote = async (force) => {
				try {
					const answered = await childCtx.remote.stats.account(force === true);
					if (answered.ok) return answered.value;
					throw new Error(answered.error?.message || "stats/account failed");
				} catch (accountError) {
					const legacy = await childCtx.remote.stats.current();
					if (!legacy.ok) throw accountError;
					return adaptLegacyBalance(legacy.value);
				}
			};
		});
	} catch (err) {
		remoteError = err?.message || String(err);
		console.warn("[dsh-stats] remote.stats 挂载失败:", err);
	}

	ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
		name: "sidebar.footer.action",
		id: "stats",
		locale: NS,
		order: 20,
		inject: () => ({ onOpen: () => openStore.open() })
	}, StatsTrigger));
	ctx.slots.inject("shell.overlay", () => ctx.slots.register({
		name: "shell.overlay",
		id: "stats-panel",
		locale: NS,
		inject: () => ({ hooks: { statsOpen: openStore }, onClose: () => openStore.close(), onOpenSession, aggregate: aggregateRemote, balance: balanceRemote, remoteError })
	}, StatsPanel));

	return () => {
		disposeRemote();
		if (ownedStyle && ownedStyle.isConnected) ownedStyle.remove();
		var tooltip = typeof document !== "undefined" ? document.getElementById("dss-tooltip") : null;
		if (tooltip) tooltip.remove();
	};
}

module.exports = { apply, inject };
// 测试钩子：暴露纯函数供 vitest 直接验证真实实现（生产运行不读取）
module.exports.__test = {
	localDayKey, emptyBucket, addBucket, sessionDayTokens,
	monthlyFromDays, weeklyFromDays, modelAgg, streakAndActive,
	costOf, usageCost, sessionCost, identityForUsage, fmtN, fmtTokens, fmtCost, fmtDuration, fmtTps, fmtSharePct,
	applyDate, applyRange, activityDates, fmtDateCN, buildTimeline, aggregate, projectionIdentityOf, projectionSlotUsageOf, enrichSessionProjection, parseAggregateResult, parseBalanceResult, parseAccountResult, parseProvidersResult, hasTokenUsage, groupTimelineBlocks, timelineLayout, timelineDisplayDays,
	sessionCostSummary, projectCostSummary, compareProjectCost, fmtCostSummary, modelNameOnly, modelDisplayName, providerPickerLabel, modelListNeedsScroll, projectCsvTable,
	subagentAddressFor, openStatsSession, CalendarHeatmap, projectColorIndexes, projectColorIndex
};
