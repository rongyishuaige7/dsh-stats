// Formatting and CNY cost helpers shared by the panel views.
let pricing = require("./pricing.cjs");
var BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
var MAX_VISIBLE_PROJECTS = 7;
var MAX_VISIBLE_TIMELINE_DAYS = 3;
var MAX_VISIBLE_MODELS = 3;
// Stable placeholder while the panel is closed and no host data has arrived.
var EMPTY_VIEW = { projects: [], timeline: { days: [] }, remote: false };

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
function fmtCostSummary(summary, t) {
	if (!summary || !Array.isArray(summary.totals)) return "—";
	var display = convertCostSummaryToCny(summary);
	if (!display || !Array.isArray(display.totals)) return "—";
	if (display.totals.length === 0) return display.status === "free" ? "¥0" : t ? t("pricing.pending") : "待计价";
	// 主汇总只展示已纳入统计的 CNY 金额。未计价会话及其原因通过
	// meta.warnings/详情呈现，避免在金额旁混入“？”造成误导。
	return display.totals.map(function(total) { return fmtCurrencyAmount(total.amount, total.currency); }).join(" + ") + (display.status === "partial" ? "*" : "");
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
	return summarizeCosts(sessionExportUsages(s).map(function(usage) {
		return usageCostDetail(usage, s.modelRaw || s.model, s.providerId, s.accountType);
	}));
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
function sessionExportUsages(session) {
	if (Array.isArray(session?.slotUsage) && session.slotUsage.length) return session.slotUsage;
	var stats = session?.stats || {};
	var usage = {
		model: session?.modelRaw || session?.model || "(unknown)",
		slot: Math.floor((session?.updatedAt || session?.createdAt || Date.now()) / SLOT_MS),
		serviceTier: "standard",
		contextTokens: null,
		pricingIncomplete: true,
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

module.exports = { BEIJING_OFFSET_MS, EMPTY_VIEW, MAX_VISIBLE_MODELS, MAX_VISIBLE_PROJECTS, MAX_VISIBLE_TIMELINE_DAYS, SLOT_MS, addCounts, costOf, esc, fmtBalanceAmount, fmtClock, fmtCost, fmtCostSummary, fmtDuration, fmtN, fmtPct, fmtSessionCounts, fmtSharePct, fmtTokens, fmtTps, identityForUsage, mergeCostSummaries, pad, projectCostSummary, sessionCost, sessionCostSummary, sessionCounts, sessionExportUsages, summarizeCosts, usageCost, usageCostDetail };
