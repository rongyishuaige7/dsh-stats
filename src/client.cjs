let react = require("react");
let primitives = require("@deepseek-ai/dsh-client-ui-primitives");

var e = react.createElement;
var useState = react.useState;
var useMemo = react.useMemo;
var useEffect = react.useEffect;
var Fragment = react.Fragment;
var IconDataOutline16 = primitives.IconDataOutline16;
var IconCloseOutline16 = primitives.IconCloseOutline16;

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
	var d = new Date(ms);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function pad(n) { return String(n).padStart(2, "0"); }
function fmtTps(tps) { return tps == null || !Number.isFinite(tps) ? "—" : `${tps >= 100 ? Math.round(tps) : tps.toFixed(1)} tok/s`; }
function fmtPct(p) { return p == null || !Number.isFinite(p) ? "—" : `${p}%`; }
function fmtN(n) { return n == null || !Number.isFinite(n) ? "—" : n.toLocaleString("en-US"); }
function sessionCounts(sessions) {
	var c = { main: 0, subagent: 0 };
	(sessions || []).forEach(function (s) {
		if (s.archived) return; // 归档会话不显示（宿主已排除，双保险）
		if (s.subagent) c.subagent++;
		else c.main++;
	});
	return c;
}
function addCounts(a, b) { a.main += b.main; a.subagent += b.subagent; return a; }
// 紧凑格式：仅主对话 → "3"；有子对话 → "1+9"（表头标明 主+子）
function fmtSessionCounts(c) {
	if (c.subagent > 0) return `${fmtN(c.main)}+${fmtN(c.subagent)}`;
	return fmtN(c.main);
}
function esc(s) {
	return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ------------------------------------------------------------------
// 定价与成本（元/百万 tokens；来源 api-docs.deepseek.com/zh-cn/quick_start/pricing）
// ------------------------------------------------------------------
var PRICING = {
	"deepseek-v4-pro": {
		label: "DeepSeek V4 Pro",
		legacy: { hit: 0.025, miss: 3.0, out: 6.0 },
		v0817: {
			offPeak: { hit: 0.15, miss: 4.5, out: 13.5 },
			peak: { hit: 0.30, miss: 9.0, out: 27.0 }
		}
	},
	"deepseek-v4-flash": {
		label: "DeepSeek V4 Flash",
		legacy: { hit: 0.02, miss: 1.0, out: 2.0 },
		v0817: {
			offPeak: { hit: 0.05, miss: 1.5, out: 4.5 },
			peak: { hit: 0.10, miss: 3.0, out: 9.0 }
		}
	}
};
function costOf(stats, price) {
	var miss = (stats.uncached + stats.cacheWrite) * price.miss / 1e6;
	var hit = stats.cacheRead * price.hit / 1e6;
	var out = stats.output * price.out / 1e6;
	return miss + hit + out;
}
function fmtCost(rmb) {
	if (rmb == null || isNaN(rmb) || rmb <= 0) return "¥0";
	if (rmb >= 1000) return "¥" + rmb.toFixed(0);
	if (rmb >= 0.01) return "¥" + rmb.toFixed(2);
	return "¥" + rmb.toFixed(4);
}

// 峰谷时段（北京 9:00–12:00 / 14:00–18:00 为高峰）
function isPeakMinutes(minOfDay) {
	return (minOfDay >= 9 * 60 && minOfDay < 12 * 60) || (minOfDay >= 14 * 60 && minOfDay < 18 * 60);
}
// 8.17 峰谷调价生效时间（北京 00:00）
var PRICE_CHANGE_AT = Date.parse("2026-08-17T00:00:00+08:00");
var SLOT_MS = 30 * 60 * 1000;
// 单个 30 分钟槽的实际价格：8.17 前按平价，之后按该槽实际时段选峰/谷价。
// 时段判定用北京时间（UTC+8 无夏令时），与宿主机时区无关。
function priceForSlot(slotIdx, m) {
	var t = slotIdx * SLOT_MS;
	if (t < PRICE_CHANGE_AT) return m.legacy;
	var bj = new Date(t + 8 * 3600 * 1000);
	var min = bj.getUTCHours() * 60 + bj.getUTCMinutes();
	return isPeakMinutes(min) ? m.v0817.peak : m.v0817.offPeak;
}
// 单个会话成本：按逐槽逐模型精确计价（slotUsage 已带 model 字段，宿主端按模型分槽聚合）。
function sessionCost(s) {
	if (s.slotUsage && s.slotUsage.length) {
		var total = 0;
		for (var i = 0; i < s.slotUsage.length; i++) {
			var su = s.slotUsage[i];
			var m = PRICING[su.model || s.model || "deepseek-v4-pro"] || PRICING["deepseek-v4-pro"];
			var price = priceForSlot(su.slot, m);
			total += (su.uncached + su.cacheWrite) * price.miss / 1e6 + su.cacheRead * price.hit / 1e6 + su.output * price.out / 1e6;
		}
		return total;
	}
	// 无逐槽数据（客户端近似）：按会话模型 + 更新时间判定（8.17 前平价，否则保守按空闲价）
	var m = PRICING[s.model || "deepseek-v4-pro"] || PRICING["deepseek-v4-pro"];
	var price = s.updatedAt != null && s.updatedAt < PRICE_CHANGE_AT ? m.legacy : m.v0817.offPeak;
	return costOf(s.stats, price);
}
// 项目成本 = 各会话成本之和
function projectCost(p) {
	var total = 0;
	for (var i = 0; i < p.sessions.length; i++) total += sessionCost(p.sessions[i]);
	return total;
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
// 按日期过滤项目会话并重建聚合（updatedAt 落在当天 [00:00, 次日 00:00)）。
// 同时把每个会话的 slotUsage 裁剪到当天，并按裁剪后的槽重算 token 统计：
// 否则跨天会话的完整成本/token 会被整段算进某一天（如今天 ¥31 偏高、昨天 ¥1 偏低）。
function applyDate(projects, dateKey) {
	if (!dateKey) return projects;
	var dayStart = new Date(dateKey + "T00:00:00").getTime();
	var dayEnd = dayStart + 86400000;
	return projects.map((p) => {
		var sessions = p.sessions.filter(function(s) {
			// 有逐槽数据：按 slot 是否落在当天判断（跨日会话保留，后续 clip 精确切分）
			if (s.slotUsage && s.slotUsage.length) {
				return s.slotUsage.some(function(u) {
					var t = u.slot * 1800000;
					return t >= dayStart && t < dayEnd;
				});
			}
			// 无逐槽数据（客户端近似）：退回按 updatedAt 判断
			return s.updatedAt != null && s.updatedAt >= dayStart && s.updatedAt < dayEnd;
		});
		if (!sessions.length) return { ...p, sessions: [], sessionCount: 0, subagentCount: 0, lastActiveAt: null, stats: display({ turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 }) };
		// 裁剪每个会话到当天
		var clipped = sessions.map(function(s) {
			var hasSlots = s.slotUsage && s.slotUsage.length > 0;
			if (!hasSlots) return s; // 无逐槽数据（客户端近似），无法按天拆分，保留
			var su = s.slotUsage.filter(function(u) {
				var t = u.slot * 1800000;
				return t >= dayStart && t < dayEnd;
			});
			var tok = { uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 };
			su.forEach(function(u) {
				tok.uncached += u.uncached || 0;
				tok.output += u.output || 0;
				tok.cacheRead += u.cacheRead || 0;
				tok.cacheWrite += u.cacheWrite || 0;
				tok.reasoning += u.reasoning || 0;
			});
			// 有逐槽数据时：token 字段按当天槽重算；turns/steps/时长等会话粒度指标
			// 没有逐日分布，保留会话完整值（仅作参考）。无逐槽数据（客户端近似）时
			// 无法拆分，保留原 stats。
			var st = s.stats || {};
			var newStats = display({
				turns: st.turns || 0, steps: st.steps || 0,
				llmMs: st.llmMs || 0, toolMs: st.toolMs || 0,
				ttftMs: st.ttftMs || 0, ttftSteps: st.ttftSteps || 0,
				decodeMs: st.decodeMs || 0, decodeTokens: st.decodeTokens || 0,
				uncached: tok.uncached, output: tok.output,
				cacheRead: tok.cacheRead, cacheWrite: tok.cacheWrite,
				reasoning: tok.reasoning
			});
			return { ...s, slotUsage: su, stats: newStats };
		});
		return { ...p, sessions: clipped, sessionCount: clipped.length, subagentCount: clipped.filter((s) => s.subagent).length, stats: sumSessionStats(clipped) };
	});
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
	var d = new Date(dateKey + "T00:00:00");
	var DOW = ["日","一","二","三","四","五","六"];
	return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日 周" + DOW[d.getDay()];
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
function rawOf(s) {
	var pv = s.projectionValues || {};
	var b = pv.tokenUsage ? (pv.tokenUsage.totals || pv.tokenUsage) : {};
	var st = pv.sessionStats || {};
	return {
		turns: st.turns || 0, steps: st.steps || 0,
		llmMs: st.llmMs || 0, toolMs: st.toolMs || 0,
		ttftMs: st.ttftMs || 0, ttftSteps: st.ttftSteps || 0,
		decodeMs: st.decodeMs || 0, decodeTokens: st.decodeTokens || 0,
		uncached: b.uncachedInputTokens || 0, output: b.outputTokens || 0,
		cacheRead: b.cacheReadTokens || 0, cacheWrite: b.cacheWriteTokens || 0
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

function aggregate(sessionSummaries, workspaceItems, t) {
	var byId = new Map();
	sessionSummaries.forEach((s) => byId.set(s.id, s));
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
			if (s.projectionValues && s.projectionValues.sessionListMetadata && s.projectionValues.sessionListMetadata.blank) return;
			if (s.archived === true) return; // 归档会话与宿主口径一致：不计入列表与聚合
			var raw = rawOf(s);
			addRaw(agg, raw);
			if (s.origin === "subagent") subagentCount++;
			sessions.push({
				id: s.id,
				title: s.title || s.displayTitle || null,
				updatedAt: s.updatedAt || null,
				model: s.model || null,
				subagent: s.origin === "subagent",
				archived: s.archived === true,
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
			if (s.projectionValues && s.projectionValues.sessionListMetadata && s.projectionValues.sessionListMetadata.blank) return;
			if (s.archived === true) return; // 归档会话与宿主口径一致：不计入列表与聚合
			var raw = rawOf(s);
			addRaw(agg, raw);
			sessions.push({ id: s.id, title: s.title || s.displayTitle || null, updatedAt: s.updatedAt || null, model: s.model || null, subagent: s.origin === "subagent", archived: s.archived === true, stats: display(raw), durMs: raw.llmMs + raw.toolMs });
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
	var d = new Date(ms);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function dayStartMs(key) {
	return new Date(key + "T00:00:00+08:00").getTime();
}
function buildTimeline(projects, slotMinutes) {
	var slotMs = slotMinutes * 60000;
	var daysMap = new Map();
	var projectIndex = new Map();
	projects.forEach((p, i) => projectIndex.set(p.id, i));

	projects.forEach((p) => {
		p.sessions.forEach((s) => {
			if (!s.durMs || !s.updatedAt) return;
			var end = s.updatedAt;
			var start = end - s.durMs;
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
	".dss-panel{width:min(1180px,100%);background:var(--dsw-specific-menu,#161a21);border:1px solid var(--dsw-alias-border-inverted,#2a303c);border-radius:16px;box-shadow:var(--dsw-shadow-lv3,0 20px 60px rgba(0,0,0,.5));color:var(--dsw-alias-label-primary,#e7eaf0);display:flex;flex-direction:column;overflow:hidden}" +
	".dss-head{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--dsw-alias-border,#2a303c)}" +
	".dss-head h2{margin:0;font-size:15px;font-weight:650;flex:1}" +
	".dss-tabs{display:flex;gap:4px}" +
	".dss-tabs button{background:none;border:none;color:var(--dsw-alias-label-secondary,#a6adbb);font-size:13px;padding:6px 12px;border-radius:8px;cursor:pointer}" +
	".dss-tabs button.on{background:rgba(79,140,255,.14);color:var(--dsw-alias-label-primary,#e7eaf0);font-weight:600}" +
	".dss-close{background:none;border:none;color:var(--dsw-alias-label-secondary,#a6adbb);cursor:pointer;border-radius:8px;width:28px;height:28px;display:grid;place-items:center}" +
	".dss-close:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))}" +
	".dss-export{background:none;border:1px solid var(--dsw-alias-border,#2a303c);color:var(--dsw-alias-label-secondary,#a6adbb);cursor:pointer;border-radius:7px;padding:3px 8px;font-size:11.5px}" +
	".dss-export:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#e7eaf0)}" +
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
	".dss-pcards{display:flex;flex-direction:column;gap:10px}" +
	".dss-pcard{border:1px solid var(--dsw-alias-border,#2a303c);border-radius:12px;background:var(--dsw-specific-menu,#1d222c);overflow:hidden;cursor:pointer;transition:border-color .15s}" +
	".dss-pcard:hover{border-color:var(--dsw-alias-label-tertiary,#6b7280)}" +
	".dss-pcard.sel{border-color:rgba(79,140,255,.55)}" +
	".dss-pcard-head{display:flex;align-items:center;gap:18px;padding:13px 16px}" +
	".dss-pcard-metrics{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;margin-left:auto}" +
	".dss-pm{min-width:58px;text-align:right}" +
	".dss-pm-l{font-size:10px;color:var(--dsw-alias-label-tertiary,#6b7280);margin-bottom:3px}" +
	".dss-pm-v{font-size:13px;font-weight:650;color:var(--dsw-alias-label-primary,#e7eaf0);font-variant-numeric:tabular-nums;line-height:1.15}" +
	".dss-pm.cost .dss-pm-v{color:#ff922b}" +
	".dss-pcard-detail{border-top:1px solid var(--dsw-alias-border,#2a303c);background:rgba(255,255,255,.015);padding:6px 4px;overflow-x:auto}" +
	".dss-statline{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:11.5px;font-variant-numeric:tabular-nums}" +
	".dss-proj{display:flex;align-items:center;gap:9px;min-width:0;flex:none}" +
	".dss-proj-txt{display:flex;flex-direction:column;min-width:0}" +
	".dss-proj .dot{width:10px;height:10px;border-radius:3px;background:var(--c);flex:none;box-shadow:0 0 0 2px color-mix(in srgb,var(--c) 22%,transparent)}" +
	".dss-proj .nm{font-weight:650;color:var(--dsw-alias-label-primary,#e7eaf0);font-size:13px}" +
	".dss-proj .ph{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:11px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
	// 会话详情：grid 固定列宽，让不同会话的同类字段对齐
	".dss-sess{display:grid;grid-template-columns:minmax(160px,1fr) 104px 112px 78px 92px 88px 148px 104px 64px;gap:10px;align-items:center;padding:7px 12px;border-bottom:1px solid var(--dsw-alias-border,#2a303c);font-size:12.5px;transition:background .12s;min-width:920px}" +
	".dss-sess:last-child{border-bottom:none}" +
	".dss-sess:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.04))}" +
	".dss-sess .ti{font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
	".dss-sess .me{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:11.5px;text-align:right;font-variant-numeric:tabular-nums}" +
	".dss-sess .st{color:var(--dsw-alias-label-secondary,#a6adbb);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}" +
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
	".dss-day{display:grid;grid-template-columns:150px 1fr 104px;align-items:stretch;border-bottom:1px solid var(--dsw-alias-border,#2a303c);min-height:56px}" +
	// 左侧：项目颜色块列表（总览同款色点）+ 多天模式附加日期
	".dss-day-projs{display:flex;flex-direction:column;justify-content:center;gap:9px;padding:10px 8px 10px 0;min-width:0}" +
	".dss-day-date{font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-secondary,#a6adbb);margin-bottom:3px;font-variant-numeric:tabular-nums}" +
	".dss-day-proj{display:flex;align-items:center;gap:8px;min-width:0;transition:opacity .12s}" +
	".dss-day-proj:hover{opacity:.8}" +
	".dss-day-dot{width:10px;height:10px;border-radius:3px;flex:none;background:var(--c);box-shadow:0 0 0 2px color-mix(in srgb,var(--c) 22%,transparent)}" +
	".dss-day-pname{font-size:12.5px;color:var(--dsw-alias-label-primary,#e7eaf0);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
	".dss-day-more{font-size:10.5px;color:var(--dsw-alias-label-tertiary,#6b7280);padding-left:18px}" +
	".dss-track{display:grid;grid-template-columns:repeat(48,1fr);margin:4px 0}" +
	".dss-cell{position:relative;min-width:0;border-right:1px solid var(--dsw-alias-border,#2a303c);display:flex;flex-direction:column;justify-content:flex-end;gap:1px}" +
	".dss-cell:last-child{border-right:none}" +
	".dss-blk{width:100%;border-radius:3px;background:var(--c);cursor:pointer;transition:filter .12s}" +
	".dss-blk:hover{filter:brightness(1.25)}" +
		// 右侧信息列：总时长 + 活动时段 + 项目数
	".dss-day-info{display:flex;flex-direction:column;justify-content:center;align-items:flex-end;gap:4px;padding:8px 0 8px 12px;min-width:0}" +
	".dss-day-info .dur{font-size:13.5px;font-weight:650;color:var(--dsw-alias-label-primary,#e7eaf0);font-variant-numeric:tabular-nums}" +
	".dss-day-info .span{font-size:10.5px;color:var(--dsw-alias-label-secondary,#a6adbb);font-variant-numeric:tabular-nums;white-space:nowrap}" +
	".dss-day-info .cnt{font-size:10.5px;color:var(--dsw-alias-label-tertiary,#6b7280);white-space:nowrap}" +
	".dss-empty{color:var(--dsw-alias-label-tertiary,#6b7280);text-align:center;padding:32px 0}" +
	".dss-tt{background:var(--dsw-specific-menu,#1d222c);border:1px solid var(--dsw-alias-border,#2a303c);border-radius:9px;padding:8px 11px;box-shadow:0 8px 24px rgba(0,0,0,.45);font-size:12.5px;position:fixed;z-index:2000;pointer-events:none;display:none;max-width:320px}" +
	".dss-tt.show{display:block}" +
	// 日期导航器
	".dss-nav{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;font-size:12.5px;color:var(--dsw-alias-label-secondary,#a6adbb)}" +
	".dss-nav-btn{background:var(--dsw-specific-menu,#1d222c);border:1px solid var(--dsw-alias-border,#2a303c);color:var(--dsw-alias-label-secondary,#a6adbb);border-radius:7px;padding:4px 10px;cursor:pointer;font-size:12.5px;line-height:1.2}" +
	".dss-nav-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#e7eaf0)}" +
	".dss-nav-btn:disabled{opacity:.35;cursor:default}" +
	".dss-nav-date{font-weight:650;color:var(--dsw-alias-label-primary,#e7eaf0);font-variant-numeric:tabular-nums;min-width:160px;text-align:center}" +
	".dss-nav-note{margin-left:auto;color:var(--dsw-alias-label-tertiary,#6b7280);font-size:11.5px}" +
	".dss-cost{font-variant-numeric:tabular-nums;font-weight:600;color:var(--dsw-alias-label-primary,#e7eaf0)}" +
	"[data-color='0']{--c:#4f8cff}[data-color='1']{--c:#34d399}[data-color='2']{--c:#fbbf24}[data-color='3']{--c:#f472b6}[data-color='4']{--c:#a78bfa}[data-color='5']{--c:#22d3ee}[data-color='6']{--c:#fb923c}[data-color='7']{--c:#e879f9}[data-color='8']{--c:#a3e635}" +
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
	".dss-cal-cell{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));border:1px solid var(--dsw-alias-border,#2a303c);cursor:default}" +
	// 4 档分位色阶（lvl0 = 无活动底色；对比拉大，最低档也清晰可见）
	".dss-cal-cell.lvl1.has{background:rgba(79,140,255,.35);border-color:transparent}" +
	".dss-cal-cell.lvl2.has{background:rgba(79,140,255,.58);border-color:transparent}" +
	".dss-cal-cell.lvl3.has{background:rgba(79,140,255,.8);border-color:transparent}" +
	".dss-cal-cell.lvl4.has{background:rgba(79,140,255,1);border-color:transparent;box-shadow:0 0 0 1px rgba(79,140,255,.4)}" +
	".dss-cal-cell.today{outline:1.5px solid var(--dsw-alias-label-primary,#e7eaf0);outline-offset:1px}" +
	".dss-cal-cell.selected{outline:2px solid #ff922b;outline-offset:1px;z-index:1}" +
	".dss-cal-cell.future{opacity:.35;border-style:dashed}" +
	".dss-cal-cell.has:hover{outline:1.5px solid var(--dsw-alias-label-primary,#e7eaf0);outline-offset:1px}" +
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
	".dss-mchart-seg.reasoning{background:#cc5de8}" +
	// 日期行：独立于柱区，位于 X 轴基线下方（margin-top 4 + 高 18 = grid 底部 22px，与 Y 轴 padding 对齐）
	".dss-mchart-xlabels{display:flex;gap:6px;margin-top:4px}" +
	".dss-mchart-label{flex:1;min-width:26px;max-width:64px;text-align:center;font-size:10px;color:var(--dsw-alias-label-tertiary,#6b7280);height:18px;line-height:18px;overflow:hidden;white-space:nowrap}" +
	".dss-mchart-label.today{color:var(--dsw-alias-label-primary,#e7eaf0);font-weight:600}" +
	".dss-mchart-label.selected{color:#ff922b;font-weight:700}" +
	".dss-mchart-legend{grid-column:1 / -1;display:flex;gap:14px;font-size:11.5px;color:var(--dsw-alias-label-secondary,#a6adbb);align-items:center}" +
	".dss-mchart-lg{width:9px;height:9px;border-radius:2px;display:inline-block;margin-right:5px;vertical-align:-1px}" +
	".dss-mchart-lg.input{background:#4f8cff}" +
	".dss-mchart-lg.output{background:#ffd43b}" +
	".dss-mchart-lg.reasoning{background:#cc5de8}" +
	// 模型分布（紧凑：环 112px、列表行更矮）
	".dss-model-split{display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:start}" +
	".dss-ring-wrap{display:flex;gap:12px;align-items:center;flex-direction:column}" +
	".dss-ring{width:112px;height:112px;border-radius:50%;display:grid;place-items:center;flex:none;position:relative}" +
	".dss-ring::after{content:\"\";position:absolute;inset:19px;background:var(--dsw-specific-menu,#1d222c);border-radius:50%}" +
	".dss-ring-center{position:relative;text-align:center;z-index:1}" +
	".dss-ring-total{font-size:15px;font-weight:700;color:var(--dsw-alias-label-primary,#e7eaf0);font-variant-numeric:tabular-nums}" +
	".dss-ring-label{font-size:9.5px;color:var(--dsw-alias-label-tertiary,#6b7280);margin-top:2px}" +
	".dss-ring-legend{display:flex;flex-direction:column;gap:5px;width:100%;min-width:130px}" +
	".dss-ring-item{display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--dsw-alias-label-secondary,#a6adbb)}" +
	".dss-ring-swatch{width:10px;height:10px;border-radius:3px;flex:none}" +
	".dss-ring-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
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
	// tooltip 结构化样式
	".dss-tip-title{font-weight:650;margin-bottom:5px;color:var(--dsw-alias-label-primary,#e7eaf0)}" +
	".dss-tip-row{display:flex;justify-content:space-between;gap:14px;line-height:1.6;color:var(--dsw-alias-label-secondary,#a6adbb)}" +
	".dss-tip-row b{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#e7eaf0)}";

// ------------------------------------------------------------------
// 组件
// ------------------------------------------------------------------
function StatsTrigger(props) {
	var wide = props.wide;
	var t = props.t;
	var onOpen = props.onOpen;
	return e("button", {
		className: "dss-trigger",
		onClick: () => onOpen(),
		title: t("trigger"),
		style: {
			background: "none", border: "none", cursor: "pointer",
			color: "var(--dsw-alias-label-secondary,#a6adbb)", borderRadius: "999px",
			display: "inline-flex", alignItems: "center", gap: "6px",
			padding: "6px 10px", fontSize: "13px"
		}
	},
		e(IconDataOutline16, { size: wide ? 16 : 18 }),
		wide ? e("span", null, t("trigger")) : null
	);
}

function SummaryCards(props) {
	var projects = props.projects;
	var t = props.t;
	var tot = { turns: 0, steps: 0, llmMs: 0, toolMs: 0, input: 0, output: 0, cacheRead: 0, cost: 0 };
	var totC = { main: 0, subagent: 0 };
	projects.forEach(function(p) {
		addCounts(totC, sessionCounts(p.sessions));
		tot.turns += p.stats.turns; tot.steps += p.stats.steps;
		tot.llmMs += p.stats.llmMs; tot.toolMs += p.stats.toolMs;
		tot.input += p.stats.inputTokens; tot.output += p.stats.outputTokens; tot.cacheRead += p.stats.cacheRead;
		tot.cost += projectCost(p);
	});
	var cards = [
		[t("card.projects"), fmtN(projects.length)],
		[t("card.sessions"), fmtSessionCounts(totC)],
		[t("card.turnsSteps"), `${fmtN(tot.turns)} / ${fmtN(tot.steps)}`],
		[t("card.llm"), fmtDuration(tot.llmMs)],
		[t("card.tool"), fmtDuration(tot.toolMs)],
		[t("card.input"), fmtTokens(tot.input)],
		[t("card.output"), fmtTokens(tot.output)],
		[t("card.cacheHit"), tot.input > 0 ? fmtPct(Math.round(tot.cacheRead / tot.input * 100)) : "—"],
		[t("card.cost"), fmtCost(tot.cost)]
	];
	return e("div", { className: "dss-cards" },
		cards.map((c, i) => e("div", { className: "dss-card", key: i },
			e("div", { className: "k" }, c[0]),
			e("div", { className: "v", ...c[0] === t("card.cost") ? { className: "v dss-cost" } : {} }, c[1])
		))
	);
}

function Legend(props) {
	var projects = props.projects;
	var hidden = props.hidden;
	var onToggle = props.onToggle;
	return e("div", { className: "dss-legend" },
		projects.map((p, i) =>
			e("span", {
				key: p.id, className: "dss-chip" + (hidden[p.id] ? " off" : ""),
				"data-color": String(i), onClick: () => onToggle(p.id)
			},
				e("span", { className: "sw" }), p.name
			)
		)
	);
}

function sortValue(p, key) {
	switch (key) {
		case "cost": return projectCost(p);
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

function ProjectsTable(props) {
	var projects = props.projects;
	var hidden = props.hidden;
	var selected = props.selected;
	var onSelect = props.onSelect;
	var t = props.t;
	var dayMode = props.dayMode === true; // 按日模式：隐藏"最近活跃"（项目级元数据与单日切片语义冲突）
	var sortPair = useState({ key: "cost", dir: -1 });
	var sort = sortPair[0], setSort = sortPair[1];

	var idxOf = new Map(projects.map((p, i) => [p.id, i]));
	var sorted = projects.filter((p) => !hidden[p.id]);
	sorted.sort((a, b) => {
		var va = sortValue(a, sort.key), vb = sortValue(b, sort.key);
		return (va > vb ? 1 : (va < vb ? -1 : 0)) * sort.dir;
	});

	var SORT_FIELDS = [
		{ key: "cost", label: "消费" },
		{ key: "sessions", label: "会话" },
		{ key: "input", label: "输入" },
		{ key: "output", label: "输出" },
		{ key: "turns", label: "轮" },
		{ key: "steps", label: "步" },
		{ key: "tool", label: "工具" },
		{ key: "hit", label: "缓存命中" }
	];
	if (!dayMode) SORT_FIELDS.push({ key: "lastActive", label: "最近活跃" });

	var effSortKey = (dayMode && sort.key === "lastActive") ? "cost" : sort.key;
	var toolbar = e("div", { className: "dss-sortbar" },
		e("span", { className: "dss-sortbar-label" }, "排序"),
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
			title: "切换升降序"
		}, sort.dir > 0 ? "升序 ↑" : "降序 ↓")
	);

	var cards = sorted.map(function(p) {
		var i = idxOf.get(p.id);
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
				return e("div", { className: "dss-sess", key: sd.id },
					e("span", { className: "ti" }, sd.title || t("w.untitled"), sd.subagent ? e("span", { className: "dss-tag" }, t("w.subagentTag")) : null),
					e("span", { className: "me" }, fmtClock(sd.updatedAt)),
					e("span", { className: "st" }, fmtN(sd.stats.turns) + " " + t("w.turns") + " · " + fmtN(sd.stats.steps) + " " + t("w.steps")),
					e("span", { className: "st" }, "LLM " + fmtDuration(sd.stats.llmMs)),
					e("span", { className: "st" }, t("w.tool") + " " + fmtDuration(sd.stats.toolMs)),
					e("span", { className: "st" }, t("w.cacheHit") + " " + fmtPct(sd.stats.cacheHitPct)),
					e("span", { className: "st" }, t("w.input") + " " + fmtTokens(sd.stats.inputTokens) + " · " + t("w.output") + " " + fmtTokens(sd.stats.outputTokens)),
					e("span", { className: "st" }, sd.model || "?"),
					e("span", { className: "st dss-cost" }, fmtCost(sessionCost(sd)))
				);
			};
			var detailChildren = mainSessions.map(sessRow);
			if (subSessions.length) {
				detailChildren = detailChildren.concat([e("div", { className: "dss-group", key: "subgroup" }, t("w.subagentGroup") + " (" + subSessions.length + ")")]);
				detailChildren = detailChildren.concat(subSessions.map(sessRow));
			}
			detail = e("div", { className: "dss-pcard-detail" }, detailChildren);
		}

		return e("div", { key: p.id, className: "dss-pcard" + (isSel ? " sel" : ""), "data-color": String(i), onClick: function() { onSelect(p.id); } },
			e("div", { className: "dss-pcard-head" },
				e("div", { className: "dss-proj" },
					e("span", { className: "dot" }),
					e("span", { className: "dss-proj-txt" },
						e("div", { className: "nm" }, p.name),
						e("div", { className: "ph" }, esc(p.path))
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
					pm(fmtCost(projectCost(p)), t("th.cost"), "cost"),
					dayMode ? null : pm(fmtClock(p.lastActiveAt), t("th.lastActive"))
				)
			),
			detail
		);
	});

	return e("div", { className: "dss-pcards-wrap" },
		toolbar,
		e("div", { className: "dss-pcards" }, cards)
	);
}

// 槽索引（0-47，每槽 30 分钟）→ HH:MM
function slotToClock(s) {
	var m = s * 30;
	return pad(Math.floor(m / 60)) + ":" + pad(m % 60);
}

function TimelineView(props) {
	var projects = props.projects;
	var timeline = props.timeline;
	var hidden = props.hidden;
	var slotMinutes = 30;
	var slotMs = slotMinutes * 60000;
	var tt = props.tt;

	var days = timeline.days;
	var maxDay = days.reduce((m, d) => Math.max(m, d.dayTotalMs), 1);
	// 块高随可见天数自适应：单天（按日模式）拉高到 160px 与其它页面高度协调；
	// 少量天（≤7）96px；多天保持 56px 避免列表过长。
	var maxBlockH = days.length <= 1 ? 160 : days.length <= 7 ? 96 : 56;
	var rowMinH = maxBlockH + 14;

	return e("div", null,
		e("div", { className: "dss-hint" }, tt("hint.timeline")),
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
			days.map((d) => {
				var cells = new Array(48).fill(null);
				// 当天参与的项目（去重保序，隐藏项目跳过）→ 左侧颜色块列表
				var seenP = new Map();
				var minSlot = 47, maxSlot = -1;
				(d.slotBlocks || []).forEach((b) => {
					if (hidden[b.projectId]) return;
					if (!seenP.has(b.projectId)) seenP.set(b.projectId, { name: b.name, colorIndex: b.colorIndex });
					if (b.slot < minSlot) minSlot = b.slot;
					if (b.slot > maxSlot) maxSlot = b.slot;
					var h = Math.min(maxBlockH, Math.max(2, Math.round((b.ms / slotMs) * maxBlockH)));
					cells[b.slot] = e("div", {
						key: b.projectId + "-" + b.slot,
						className: "dss-blk",
						"data-color": String(b.colorIndex),
						style: { height: h + "px" },
						onMouseEnter: (ev) => showTip(tt, `${b.name} · ${d.date}`, b.ms, ev),
						onMouseLeave: () => hideTip(tt)
					});
				});
				var projList = Array.from(seenP.values());
				var MAXL = 4;
				var wd = tt("w.weekdays").split(",")[new Date(d.date + "T00:00:00+08:00").getUTCDay()];
				var leftCol = e("div", { className: "dss-day-projs" },
					// 多天模式需要日期区分各行；单天（按日）日期已在顶部导航显示，不重复
					days.length > 1 ? e("div", { className: "dss-day-date" }, d.date + " " + tt("w.dayPrefix") + wd) : null,
					projList.slice(0, MAXL).map(function(pj, pi) {
						return e("div", { className: "dss-day-proj", key: pi },
							e("span", { className: "dss-day-dot", "data-color": String(pj.colorIndex) }),
							e("span", { className: "dss-day-pname", title: pj.name }, pj.name)
						);
					}),
					projList.length > MAXL ? e("div", { className: "dss-day-more" }, "+" + (projList.length - MAXL) + " 项") : null
				);
				// 右侧信息列：总时长 + 活动时段 + 项目数，填充右侧空白
				var spanText = maxSlot >= 0 ? slotToClock(minSlot) + "–" + slotToClock(maxSlot + 1) : "—";
				// 总时长按可见项目重算（隐藏的项目不计入）
				var visibleMs = (d.slotBlocks || []).reduce(function(sum, b) { return hidden[b.projectId] ? sum : sum + b.ms; }, 0);
				var rightCol = e("div", { className: "dss-day-info" },
					e("div", { className: "dur" }, fmtDuration(visibleMs)),
					e("div", { className: "span" }, spanText),
					e("div", { className: "cnt" }, projList.length + " 项目")
				);
				return e("div", { className: "dss-day", id: "dss-day-" + d.date, key: d.date, style: { minHeight: rowMinH + "px" } },
					leftCol,
					e("div", { className: "dss-track" },
						cells.map((c, i) => e("div", { className: "dss-cell", key: i }, c))
					),
					rightCol
				);
			})
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
			e("button", { className: mode === "day" ? "on" : "", onClick: () => setMode("day") }, "按日"),
			e("button", { className: mode === "all" ? "on" : "", onClick: () => setMode("all") }, "全部")
		),
		mode === "day" ? e(Fragment, null,
			e("button", { className: "dss-nav-btn", onClick: () => move(-1), disabled: idx <= 0, title: "前一天" }, "‹"),
			e("span", { className: "dss-nav-date" }, fmtDateCN(effectiveDate)),
			e("button", { className: "dss-nav-btn", onClick: () => move(1), disabled: idx < 0 || idx >= dates.length - 1, title: "后一天" }, "›")
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
function exportCSV(projects, t) {
	var lines = [[t("th.project"), t("w.path"), t("th.sessions"), t("th.turns"), t("th.steps"), t("th.llm"), t("th.tool"), t("th.input"), t("th.output"), t("th.cacheHit"), t("th.cost")].join(",")];
	projects.forEach(function (p) {
		var s = p.stats;
		lines.push([
			JSON.stringify(p.name), JSON.stringify(p.path), p.sessionCount, JSON.stringify(fmtSessionCounts(sessionCounts(p.sessions))),
			s.turns, s.steps, Math.round(s.llmMs), Math.round(s.toolMs),
			s.inputTokens, s.outputTokens, s.cacheHitPct == null ? "" : s.cacheHitPct, projectCost(p).toFixed(4)
		].join(","));
	});
	download("dsh-stats.csv", "\uFEFF" + lines.join("\n"), "text/csv;charset=utf-8");
}

function StatsPanel(props) {
	var open = props.useStatsOpen((o) => o);
	var sessionsSnap = props.useSessions((s) => s);
	var workspacesSnap = props.useWorkspaces((w) => w);
	var onClose = props.onClose;
	var t = props.t;
	var aggregateRemote = props.aggregate;
	var tabPair = usePref("tab", "overview"); var tab = tabPair[0], setTab = tabPair[1];
	var hiddenPair = usePref("hidden", {}); var hidden = hiddenPair[0], setHidden = hiddenPair[1];
	var navPair = usePref("nav", { mode: "day", date: null }); var nav = navPair[0], setNav = navPair[1];
	var [selected, setSelected] = useState(null);
	var [remoteData, setRemoteData] = useState(null);
	var [refreshTick, setRefreshTick] = useState(0);

	useEffect(() => {
		if (!open || !open.open || !aggregateRemote) return;
		var cancelled = false;
		aggregateRemote().then((r) => { if (!cancelled) setRemoteData(r); })
			.catch((err) => {
				// 偶发失败（连接抖动/宿主繁忙）时保留上次的准确数据，仅记录日志，不降级。
				if (!cancelled) console.warn("[dsh-stats] aggregate 调用失败（保留上次数据）:", err);
			});
		return () => { cancelled = true; };
	}, [open, aggregateRemote, refreshTick]);

	// 面板打开期间每 60 秒自动刷新一次
	useEffect(() => {
		if (!open || !open.open || !aggregateRemote) return;
		var id = setInterval(() => setRefreshTick((x) => x + 1), 60000);
		return () => clearInterval(id);
	}, [open, aggregateRemote]);

	var data = useMemo(() => {
		if (remoteData && remoteData.projects) {
			var projects = remoteData.projects.map((p) => ({
				id: p.id, name: p.name, path: p.path, sessionCount: p.sessionCount, subagentCount: p.subagentCount || 0, lastActiveAt: p.lastActiveAt,
				stats: display(p.stats),
				sessions: (p.sessions || []).map((s) => ({ id: s.id, title: s.title, updatedAt: s.updatedAt, createdAt: s.createdAt, model: s.model, modelUsage: s.modelUsage, archived: s.archived, subagent: s.subagent === true, stats: display(s.stats), durMs: s.durMs, slotUsage: s.slotUsage }))
			}));
			return { projects, timeline: remoteData.timeline || { days: [] }, remote: true };
		}
		var summaries = sessionsSnap && sessionsSnap.byId ? Object.values(sessionsSnap.byId) : [];
		var projects = aggregate(summaries, workspacesSnap && workspacesSnap.items, t);
		var timeline = buildTimeline(projects, 30);
		return { projects, timeline, remote: false };
	}, [remoteData, sessionsSnap, workspacesSnap]);

	// hooks 必须在早退之前调用（React 规则：每次渲染 hooks 数量一致）
	// 活动日列表（timeline 中有活动的日期）
	var dates = useMemo(() => activityDates(data.timeline), [data.timeline]);

	// 按日模式的有效日期：nav.date 无效或不在活动日列表时，回退最近活动日
	var effectiveDate = useMemo(() => {
		if (!nav || nav.mode !== "day") return null;
		if (nav.date && dates.indexOf(nav.date) >= 0) return nav.date;
		return dates.length ? dates[dates.length - 1] : null;
	}, [nav, dates]);

	// 按日过滤后的项目（全部模式 = 全量）
	var dateProjects = useMemo(() => applyDate(data.projects, effectiveDate), [data.projects, effectiveDate]);

	// 时间线视图：按日模式只保留选中日
	var viewTimeline = useMemo(() => {
		if (!effectiveDate) return data.timeline;
		return { days: (data.timeline.days || []).filter(function(d) { return d.date === effectiveDate; }) };
	}, [data.timeline, effectiveDate]);

	// 全局聚合：全量（热力图 / 7 天趋势 / 连续天数指标卡始终用全量）
	var globals = useMemo(() => buildGlobals(data.projects), [data.projects]);

	// 按日聚合：hero 总览 / 模型分布随选中日期变化（全部模式复用 globals，避免重复计算）
	var dateGlobals = useMemo(() => (effectiveDate ? buildGlobals(dateProjects) : globals), [effectiveDate, dateProjects, globals]);

	if (!open || !open.open) return null;

	var toggle = (id) => setHidden((h) => ({ ...h, [id]: !h[id] }));
	var visibleProjects = dateProjects.filter((p) => !hidden[p.id]);

	return e("div", { className: "dss-overlay", onClick: (ev) => { if (ev.target === ev.currentTarget) onClose(); } },
		e("div", { className: "dss-panel" },
			e("div", { className: "dss-head" },
				e("h2", null, t("title")),
				e("div", { className: "dss-tabs" },
					e("button", { className: tab === "overview" ? "on" : "", onClick: () => setTab("overview") }, t("tab.overview")),
					e("button", { className: tab === "timeline" ? "on" : "", onClick: () => setTab("timeline") }, t("tab.timeline")),
					e("button", { className: tab === "trends" ? "on" : "", onClick: () => setTab("trends") }, t("tab.trends"))
				),
				e("button", { className: "dss-export", onClick: () => setRefreshTick((x) => x + 1) }, t("refresh")),
				e("button", { className: "dss-export", onClick: () => exportCSV(dateProjects, t) }, "CSV"),
				e("button", { className: "dss-export", onClick: () => exportJSON(dateProjects) }, "JSON"),
				e("button", { className: "dss-close", onClick: onClose, title: t("close") },
					e(IconCloseOutline16, { size: 16 })
				)
			),
			e("div", { className: "dss-body" },
				e(DateNavigator, { nav, setNav, dates, effectiveDate, t }),
				tab === "overview" ? e(Fragment, null,
					e(SummaryCards, { projects: visibleProjects, t }),
					e(Legend, { projects: data.projects, hidden, onToggle: toggle }),
					visibleProjects.length === 0 ? e("div", { className: "dss-empty" }, t("empty")) :
					e(ProjectsTable, { projects: dateProjects, hidden, selected, t, dayMode: effectiveDate != null, onSelect: (id) => setSelected((s) => s === id ? null : id) })
				) : tab === "timeline" ? e(TimelineView, { projects: dateProjects, timeline: viewTimeline, hidden, tt: t })
				: e(TrendsView, { globals, dateGlobals, selectedDate: effectiveDate })
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
			e("div", { className: "dss-hero-k" }, "总 Token 消耗"),
			e("div", { className: "dss-hero-v" }, fmtTokens(totalTok)),
			e("div", { className: "dss-hero-chips" },
				e("span", { className: "dss-hero-chip" }, "输入 " + fmtTokens(totals.input || 0)),
				e("span", { className: "dss-hero-chip" }, "输出 " + fmtTokens(totals.output || 0)),
				e("span", { className: "dss-hero-chip" }, "思考 " + fmtTokens(totals.reasoning || 0)),
				hitPct != null ? e("span", { className: "dss-hero-chip" }, "缓存命中 " + hitPct + "%") : null
			)
		),
		e("div", { className: "dss-hero-side" },
			e("div", { className: "dss-hero-cell" },
				e("div", { className: "dss-hero-k" }, "总消费"),
				e("div", { className: "dss-hero-v dss-cost" }, fmtCost(dg.totalCost || 0))
			),
			e("div", { className: "dss-hero-cell" },
				e("div", { className: "dss-hero-k" }, "最常用模型"),
				e("div", { className: "dss-hero-v model" }, topModel ? topModel.model : "—")
			)
		)
	);

	var metrics = [
		{ v: fmtN(g.activeDays || 0), l: "活跃天数", s: "有活动的自然日" },
		{ v: fmtN(g.streak || 0), l: "当前连续", s: "截至最近活动日" },
		{ v: fmtN(g.longestStreak || 0), l: "最长连续", s: "历史最佳纪录" },
		{ v: fmtN(g.sessions ? g.sessions.length : 0), l: "会话总数", s: "主会话 + 子会话" }
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
		e(Section, { title: "活动热力图", hint: "左侧：当月按实际天数 · 右侧：近 7 天每日 Token" },
			e("div", { className: "dss-trend-duo" },
				e("div", { className: "dss-duo-cell" },
					e(CalendarHeatmap, { byDay: g.byDay || new Map(), selectedDate: props.selectedDate })
				),
				e("div", { className: "dss-duo-cell grow" },
					e("div", { className: "dss-duo-title" }, "每日 Token（近 7 天）"),
					e(DailyTrendChart, { byDay: g.byDay || new Map(), selectedDate: props.selectedDate })
				)
			)
		),
		e(Section, { title: "模型分布", hint: "按输入 + 输出 token 占比" },
			e("div", { className: "dss-model-split" },
				e(ModelRing, { models: dg.models || [] }),
				e(ModelList, { models: dg.models || [] })
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
	var today = new Date();
	var todayKey = localDayKey(today.getTime());

	var mo = { y: today.getFullYear(), m: today.getMonth() };
	var first = new Date(mo.y, mo.m, 1);
	var offset = (first.getDay() + 6) % 7; // 周一 = 0
	var daysInMonth = new Date(mo.y, mo.m + 1, 0).getDate();

	var DOW = ["一","二","三","四","五","六","日"];

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
		cells.push(e("div", {
			key: dk,
			className: "dss-cal-cell lvl" + lvl + (tot > 0 ? " has" : "") + (isToday ? " today" : "") + (isFuture ? " future" : "") + (isSel ? " selected" : ""),
			title: dk,
			onMouseEnter: function(ev) {
				var bbb = byDay.get(dk);
				if (!bbb) { showTipRaw(tipRows(dk, [["活动", isFuture ? "未来日期" : "无"]]), ev); return; }
				showTipRaw(tipRows(dk, [
					["总输入", fmtTokens(bbb.input || 0)],
					["总输出", fmtTokens(bbb.output || 0)],
					["思考", fmtTokens(bbb.reasoning || 0)],
					["开发时长", fmtDuration((bbb.llmMs || 0) + (bbb.toolMs || 0))]
				]), ev);
			},
			onMouseLeave: hideTip
		}));
	}

	return e("div", { className: "dss-cal-wrap" },
		e("div", { className: "dss-cal" },
			e("div", { className: "dss-cal-month" },
				e("div", { className: "dss-cal-title" }, mo.y + "年" + (mo.m + 1) + "月"),
				e("div", { className: "dss-cal-dow" }, DOW.map(function(dw, i) { return e("span", { key: i }, dw); })),
				e("div", { className: "dss-cal-grid" }, cells)
			)
		),
		e("div", { className: "dss-cal-legend" },
			e("span", null, "少"),
			[0,1,2,3,4].map(function(i) { return e("i", { key: i, className: "dss-hm-lg lvl" + i }); }),
			e("span", null, "多")
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

// 每日 Token 趋势：最近 7 天（含今天），每天堆叠柱 = 输入 / 输出 / 思考
function DailyTrendChart(props) {
	var byDay = props.byDay;
	var today = new Date();
	var todayKey = localDayKey(today.getTime());

	var DOW = ["一","二","三","四","五","六","日"];
	// 近 7 天窗口：today-6 … today
	var days = [];
	var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
	for (var i = 0; i < 7; i++) {
		days.push({ key: localDayKey(d.getTime()), mon: d.getMonth() + 1, day: d.getDate(), dow: (d.getDay() + 6) % 7 });
		d.setDate(d.getDate() + 1);
	}

	var maxTot = 0;
	days.forEach(function(dd) {
		var b = byDay.get(dd.key);
		if (b) maxTot = Math.max(maxTot, (b.input || 0) + (b.output || 0) + (b.reasoning || 0));
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
					var pRs = Math.max(0, (b.reasoning || 0)) / yMax * 100;
					return e("div", { key: dd.key, className: "dss-mchart-col" },
						e("div", {
							className: "dss-mchart-bar",
							onMouseEnter: function(ev) {
								showTipRaw(tipRows(dd.mon + "月" + dd.day + "日 周" + DOW[dd.dow] + (dd.key === todayKey ? "（今天）" : ""), [
									["总输入", fmtTokens(b.input || 0)],
									["总输出", fmtTokens(b.output || 0)],
									["思考", fmtTokens(b.reasoning || 0)],
									["缓存读取", fmtTokens(b.cacheRead || 0)],
									["开发时长", fmtDuration((b.llmMs || 0) + (b.toolMs || 0))]
								]), ev);
							},
							onMouseLeave: hideTip
						},
							e("div", { className: "dss-mchart-seg input", style: { height: pIn + "%" } }),
							e("div", { className: "dss-mchart-seg output", style: { height: pOut + "%" } }),
							e("div", { className: "dss-mchart-seg reasoning", style: { height: pRs + "%" } })
						)
					);
				})
			),
			// 日期行独立于柱区，位于 X 轴基线下方
			e("div", { className: "dss-mchart-xlabels" },
				days.map(function(dd) {
					return e("div", { key: dd.key, className: "dss-mchart-label" + (dd.key === todayKey ? " today" : "") + (props.selectedDate != null && dd.key === props.selectedDate ? " selected" : "") },
						dd.key === todayKey ? "今天" : (dd.mon + "/" + dd.day)
					);
				})
			)
		),
		e("div", { className: "dss-mchart-legend" },
			e("span", null, e("i", { className: "dss-mchart-lg input" }), "输入"),
			e("span", null, e("i", { className: "dss-mchart-lg output" }), "输出"),
			e("span", null, e("i", { className: "dss-mchart-lg reasoning" }), "思考")
		)
	);
}

function ModelRing(props) {
	var models = props.models;
	if (!models || !models.length) return e("div", { className: "dss-empty" }, "暂无数据");

	var total = models.reduce(function(s, m) { return s + ((m.input || 0) + (m.output || 0)); }, 0);
	if (!total) return e("div", { className: "dss-empty" }, "暂无数据");

	var cum = 0;
	var stops = models.map(function(m) {
		var v = ((m.input || 0) + (m.output || 0)) / total;
		var from = (cum * 360).toFixed(1);
		cum += v;
		var to = (cum * 360).toFixed(1);
		return { color: modelColor(m.model || "(unknown)"), from: from, to: to, label: m.model, pct: (v * 100).toFixed(1), v: v };
	});

	var gradient = stops.map(function(s) { return s.color + " " + s.from + "deg " + s.to + "deg"; }).join(", ");

	return e("div", { className: "dss-ring-wrap" },
		e("div", { className: "dss-ring", style: { background: "conic-gradient(" + gradient + ")" } },
			e("div", { className: "dss-ring-center" },
				e("div", { className: "dss-ring-total" }, fmtTokens(total)),
				e("div", { className: "dss-ring-label" }, "输入 + 输出")
			)
		),
		e("div", { className: "dss-ring-legend" },
			stops.map(function(s, i) {
				return e("div", { key: i, className: "dss-ring-item" },
					e("span", { className: "dss-ring-swatch", style: { background: s.color } }),
					e("span", { className: "dss-ring-name", title: s.label }, s.label),
					e("span", { className: "dss-ring-pct" }, s.pct + "%")
				);
			})
		)
	);
}

function ModelList(props) {
	var models = props.models;
	if (!models || !models.length) return e("div", { className: "dss-empty" }, "暂无数据");

	var total = models.reduce(function(s, m) { return s + ((m.input || 0) + (m.output || 0)); }, 0);

	return e("div", { className: "dss-model-list" },
		models.map(function(m, i) {
			var share = total > 0 ? ((m.input || 0) + (m.output || 0)) / total : 0;
			var pct = share * 100;
			var color = modelColor(m.model || "(unknown)");
			return e("div", { key: i, className: "dss-model-item" },
				e("div", { className: "dss-model-head" },
					e("span", { className: "dss-model-dot", style: { background: color } }),
					e("span", { className: "dss-model-name", title: m.model || "(unknown)" }, m.model || "(unknown)"),
					e("span", { className: "dss-model-pct" }, pct.toFixed(1) + "%")
				),
				e("div", { className: "dss-model-track" },
					e("div", { className: "dss-model-fill", style: { width: Math.max(1.5, pct) + "%", background: color } })
				),
				e("div", { className: "dss-model-meta" },
					"输入 " + fmtTokens(m.input || 0) +
					" · 输出 " + fmtTokens(m.output || 0) +
					" · 思考 " + fmtTokens(m.reasoning || 0) +
					" · 会话 " + fmtN(m.sessions || 0) +
					" · LLM " + fmtDuration(m.llmMs || 0) +
					" · 工具 " + fmtDuration(m.toolMs || 0)
				)
			);
		})
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
	var d = new Date(ts);
	var y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
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
		if (s.slotUsage && s.slotUsage.length) {
			// 逐槽分布：slot * 30min → 本地日期
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
			// turns/steps/时长只有会话粒度，按 updatedAt 落一天（避免重复计）
			var ts = s.updatedAt || s.createdAt;
			if (ts) {
				var b2 = getDay(localDayKey(ts));
				b2.turns += st.turns || 0;
				b2.steps += st.steps || 0;
				b2.llmMs += st.llmMs || 0;
				b2.toolMs += st.toolMs || 0;
			}
			return;
		}
		var ts = s.updatedAt || s.createdAt;
		if (!ts) return;
		var b = getDay(localDayKey(ts));
		b.turns += st.turns || 0; b.steps += st.steps || 0;
		b.llmMs += st.llmMs || 0; b.toolMs += st.toolMs || 0;
		b.output += st.outputTokens || 0;
		b.uncached += st.uncached || 0;
		b.cacheRead += st.cacheRead || 0;
		b.cacheWrite += st.cacheWrite || 0;
		b.reasoning += st.reasoning || 0;
		b.input += st.inputTokens || 0;
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
		var d = new Date(day + "T00:00:00");
		var dow = d.getDay(); // 0..6, Sun=0
		d.setDate(d.getDate() - dow); // back to Sunday
		var wk = localDayKey(d.getTime());
		var w = byWeek.get(wk) || emptyBucket();
		addBucket(w, b);
		byWeek.set(wk, w);
	});
	return byWeek;
}

// 模型分布：session.model -> { sessions, input, output, reasoning, llmMs }
function modelAgg(sessions) {
	var byModel = new Map();
	sessions.forEach((s) => {
		var st = s.stats || {};
		// 逐槽逐模型分布（宿主提供）：slotUsage 已带 model，各模型 token 各归其位；
		// 无逐槽数据（客户端近似）时退化为会话主要模型单条目。
		var modelTok = new Map();
		if (s.slotUsage && s.slotUsage.length) {
			s.slotUsage.forEach((su) => {
				var mk = su.model || s.model || "(unknown)";
				var t = modelTok.get(mk) || { uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 };
				t.uncached += su.uncached || 0;
				t.output += su.output || 0;
				t.cacheRead += su.cacheRead || 0;
				t.cacheWrite += su.cacheWrite || 0;
				t.reasoning += su.reasoning || 0;
				modelTok.set(mk, t);
			});
		}
		var entries = modelTok.size
			? Array.from(modelTok.entries()).map(([m, t]) => ({ model: m, uncached: t.uncached, output: t.output, cacheRead: t.cacheRead, cacheWrite: t.cacheWrite, reasoning: t.reasoning }))
			: [{
				model: s.model || "(unknown)",
				uncached: st.uncached != null ? st.uncached : Math.max(0, (st.inputTokens || 0) - (st.cacheRead || 0) - (st.cacheWrite || 0)),
				output: st.output != null ? st.output : (st.outputTokens || 0),
				cacheRead: st.cacheRead || 0, cacheWrite: st.cacheWrite || 0, reasoning: st.reasoning || 0
			}];
		// 会话总 token（用于 LLM/工具时长按占比分摊到各模型）
		var sessTok = 0;
		entries.forEach((e) => { sessTok += (e.uncached || 0) + (e.cacheRead || 0) + (e.cacheWrite || 0) + (e.output || 0); });
		entries.forEach((e) => {
			var m = e.model || "(unknown)";
			var cur = byModel.get(m) || { model: m, sessions: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, llmMs: 0, toolMs: 0 };
			cur.sessions += 1;
			cur.input += (e.uncached || 0) + (e.cacheRead || 0) + (e.cacheWrite || 0);
			cur.output += e.output || 0;
			cur.cacheRead += e.cacheRead || 0;
			cur.cacheWrite += e.cacheWrite || 0;
			cur.reasoning += e.reasoning || 0;
			// DSH 无逐模型时长数据：按 token 占比分摊会话 LLM/工具时长（近似合理）
			var share = sessTok > 0 ? ((e.uncached || 0) + (e.cacheRead || 0) + (e.cacheWrite || 0) + (e.output || 0)) / sessTok : 0;
			cur.llmMs += Math.round((st.llmMs || 0) * share);
			cur.toolMs += Math.round((st.toolMs || 0) * share);
			byModel.set(m, cur);
		});
	});
	return Array.from(byModel.values()).sort((a, b) => b.input + b.output - (a.input + a.output));
}

// 连续天数与活跃天数：以 byDay 为输入（key 为 YYYY-MM-DD）。
function streakAndActive(byDay) {
	var dates = Array.from(byDay.keys()).sort();
	var activeDays = dates.length;
	if (!activeDays) return { activeDays: 0, currentStreak: 0, longestStreak: 0, firstDay: null, lastDay: null };
	var longest = 1, run = 1;
	for (var i = 1; i < dates.length; i++) {
		var prev = new Date(dates[i - 1] + "T00:00:00").getTime();
		var cur = new Date(dates[i] + "T00:00:00").getTime();
		if (cur - prev === 86400000) { run++; if (run > longest) longest = run; } else run = 1;
	}
	// 当前连续：以 lastDay 为起点往前回溯
	var last = dates[dates.length - 1];
	var cursor = new Date(last + "T00:00:00").getTime();
	var set = new Set(dates);
	var current = 0;
	while (set.has(localDayKey(cursor))) { current++; cursor -= 86400000; }
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
	// 全局总费用（按会话逐个计算，用 slotUsage 或 stats 兜底）
	var totalCost = 0;
	for (var k = 0; k < all.length; k++) totalCost += sessionCost(all[k]);
	return {
		sessions: all,
		byDay, models, totals,
		streak: sa.currentStreak, longestStreak: sa.longestStreak, activeDays: sa.activeDays,
		firstDay: sa.firstDay, lastDay: sa.lastDay,
		totalCost: totalCost
	};
}
const inject = ["slots", "locale", "remote"];
const NS = "stats";
const zh = {
	"trigger": "统计",
	"title": "项目统计",
	"tab.overview": "项目总览",
	"tab.timeline": "开发时间线",
	"tab.trends": "用量趋势",
	"close": "关闭",
	"empty": "暂无数据",
	"refresh": "刷新",
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
	"th.sessions": "会话（主+子）",
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
	"w.subagentGroup": "子对话",
	"w.untitled": "（未命名会话）",
	"w.duration": "开发时长",
	"w.path": "路径",
	"w.unnamed": "（未命名）",
	"w.uncategorized": "（未分类）",
	"w.weekdays": "日,一,二,三,四,五,六",
	"w.dayPrefix": "周",
	"hint.timeline": "块高 = 该 30 分钟时段开发时长占比",
	"hint.rangeEmpty": "该范围内暂无开发活动",
	"hint.cost": "成本按实际模型与时段自动计价",
	"trends.activeDays": "活跃天数",
	"trends.streak": "当前连续",
	"trends.longestStreak": "最长连续",
	"trends.mostUsed": "最常用模型",
	"trends.totalSessions": "总会话",
	"trends.totalInput": "总输入",
	"trends.totalOutput": "总输出",
	"trends.totalReasoning": "思考 token",
	"trends.heatmap": "活动热力图",
	"trends.dailyTrend": "每月 token 趋势",
	"trends.modelDist": "模型分布",
	"trends.days": "天",
	"trends.weekdays": "日,一,二,三,四,五,六"
};
const en = {
	"trigger": "Stats",
	"title": "Project Stats",
	"tab.overview": "Overview",
	"tab.timeline": "Timeline",
	"tab.trends": "Usage Trends",
	"close": "Close",
	"empty": "No data",
	"refresh": "Refresh",
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
	"th.sessions": "Sessions (main+sub)",
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
	"w.subagentGroup": "Sub-agent sessions",
	"w.untitled": " (untitled)",
	"w.duration": "Duration",
	"w.path": "Path",
	"w.unnamed": "(unnamed)",
	"w.uncategorized": "(uncategorized)",
	"w.weekdays": "Sun,Mon,Tue,Wed,Thu,Fri,Sat",
	"w.dayPrefix": "",
	"hint.timeline": "Block height = share of development time in that 30-min slot",
	"hint.rangeEmpty": "No activity in this range",
	"hint.cost": "Cost auto-priced by actual model & time slot",
	"trends.activeDays": "Active days",
	"trends.streak": "Current streak",
	"trends.longestStreak": "Longest streak",
	"trends.mostUsed": "Most used",
	"trends.totalSessions": "Total sessions",
	"trends.totalInput": "Total input",
	"trends.totalOutput": "Total output",
	"trends.totalReasoning": "Thinking tokens",
	"trends.heatmap": "Activity heatmap",
	"trends.dailyTrend": "Daily tokens",
	"trends.modelDist": "Model distribution",
	"trends.days": "days",
	"trends.weekdays": "S,M,T,W,T,F,S"
};

// 内联 Typert Remote 描述符：DSH 不自动挂载第三方 ./remote，
// 需在客户端手动 ctx.remote.$mount(contribution)。
// result 用透传 schema（客户端解码仅要求 schema.parse 函数）。
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
			schema: { parse: (v) => v }
		},
		sourceLocation: { file: "packages/stats/src/index.ts", line: 1, column: 1 }
	}]
};

async function apply(ctx) {
	// 附加 CSS — 必须在 CSS 注入前定义
	var _phaseDCSS = "\n\t.dss-tc-val.dss-tc-cost{color:#ff922b}\n\t.dss-ml-row .dss-ml-reasoning{color:#cc5de8}\n\t";

	if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(CSS_ID) + "]") === null) {
		var tag = document.createElement("style");
		tag.dataset.plugin = "@rongyi7/dsh-stats";
		tag.dataset.pluginCss = CSS_ID;
		tag.textContent = css + _phaseDCSS;
		document.head.appendChild(tag);
	}
	ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-stats: dictionaries");
	const openStore = createOpenStore();

	let aggregateRemote = null;
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
		});
	} catch (err) {
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
		inject: () => ({ hooks: { statsOpen: openStore }, onClose: () => openStore.close(), aggregate: aggregateRemote })
	}, StatsPanel));

	return () => { disposeRemote(); };
}

module.exports = { apply, inject };
// 测试钩子：暴露纯函数供 vitest 直接验证真实实现（生产运行不读取）
module.exports.__test = {
	localDayKey, emptyBucket, addBucket, sessionDayTokens,
	monthlyFromDays, weeklyFromDays, modelAgg, streakAndActive,
	costOf, sessionCost, fmtN, fmtTokens, fmtCost, fmtDuration,
	applyDate, activityDates, fmtDateCN
};
