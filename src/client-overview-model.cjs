// Pure overview calculations shared by the React view and unit tests.
// No React, DOM or browser storage belongs in this module.
const { mergeCostSummaries, projectCostSummary, sessionCounts, usageCostDetail } = require("./client-format.cjs");

function overviewTotals(projects) {
	var list = Array.isArray(projects) ? projects : [];
	var totals = { projects: list.length, main: 0, subagent: 0, turns: 0, steps: 0, llmMs: 0, toolMs: 0, input: 0, output: 0, cacheRead: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, cost: mergeCostSummaries(list.map(function(project) { return projectCostSummary(project || {}); })) };
	list.forEach(function(project) {
		var stats = project && project.stats ? project.stats : {};
		var counts = sessionCounts(project && project.sessions);
		totals.main += counts.main; totals.subagent += counts.subagent;
		totals.turns += stats.turns || 0; totals.steps += stats.steps || 0;
		totals.llmMs += stats.llmMs || 0; totals.toolMs += stats.toolMs || 0;
		totals.input += stats.inputTokens || 0; totals.output += stats.outputTokens || 0;
		totals.cacheRead += stats.cacheRead || 0;
		totals.ttftMs += stats.ttftMs || 0; totals.ttftSteps += stats.ttftSteps || 0;
		totals.decodeMs += stats.decodeMs || 0; totals.decodeTokens += stats.decodeTokens || 0;
	});
	totals.cacheHitPct = totals.input > 0 ? Math.round(totals.cacheRead / totals.input * 100) : null;
	totals.ttftAvgMs = totals.ttftSteps > 0 ? totals.ttftMs / totals.ttftSteps : null;
	totals.tps = totals.decodeMs > 0 ? totals.decodeTokens / (totals.decodeMs / 1000) : null;
	return totals;
}

// Coalesce overlapping refresh requests into one in-flight promise. A slow
// aggregate must not be cancelled and restarted by the next timer tick.
function createSingleFlight() {
	var active = null;
	return function(run) {
		if (active) return active;
		var current;
		current = Promise.resolve().then(run).finally(function() {
			if (active === current) active = null;
		});
		active = current;
		return current;
	};
}

function previousActiveDate(dates, date) {
	if (!Array.isArray(dates) || !date) return null;
	var index = dates.indexOf(date);
	return index > 0 ? dates[index - 1] : null;
}

function cnyAmount(summary) {
	if (!summary) return null;
	if (summary.status === "free") return 0;
	if (summary.status !== "exact" && summary.status !== "estimated") return null;
	var totals = Array.isArray(summary.totals) ? summary.totals : [];
	if (totals.length !== 1) return null;
	var total = totals[0];
	return total && total.currency === "CNY" && Number.isFinite(total.amount) ? total.amount : null;
}

function costDelta(current, previous) {
	var currentAmount = cnyAmount(current);
	var previousAmount = cnyAmount(previous);
	if (currentAmount == null || previousAmount == null || previousAmount <= 0) return null;
	var ratio = (currentAmount - previousAmount) / previousAmount;
	if (Math.abs(ratio) < 1e-9) ratio = 0;
	return { ratio, direction: ratio > 0 ? "up" : ratio < 0 ? "down" : "flat" };
}

function costShares(projects) {
	var list = Array.isArray(projects) ? projects : [];
	var amounts = list.map(function(project) { return project ? cnyAmount(projectCostSummary(project)) : null; });
	var total = amounts.reduce(function(sum, amount) { return amount == null ? sum : sum + amount; }, 0);
	var shares = new Map();
	list.forEach(function(project, index) {
		if (!project || project.id == null) return;
		shares.set(project.id, total > 0 && amounts[index] != null ? amounts[index] / total : null);
	});
	return shares;
}

function projectDaySpans(timelineDay) {
	var spans = new Map();
	((timelineDay && timelineDay.slotBlocks) || []).forEach(function(block) {
		if (!block || !Number.isFinite(block.slot)) return;
		var span = spans.get(block.projectId);
		var start = block.slot, end = block.slot + 1;
		if (!span) spans.set(block.projectId, { startSlot: start, endSlot: end });
		else { span.startSlot = Math.min(span.startSlot, start); span.endSlot = Math.max(span.endSlot, end); }
	});
	return spans;
}

function activeDayCount(timeline, hidden) {
	var days = (timeline && Array.isArray(timeline.days)) ? timeline.days : [];
	var flags = hidden && typeof hidden === "object" ? hidden : {};
	return days.filter(function(day) {
		return ((day && day.slotBlocks) || []).some(function(block) { return block && !(Object.prototype.hasOwnProperty.call(flags, block.projectId) && flags[block.projectId]); });
	}).length;
}

function projectCostSortData(project) {
	var totals = projectCostSummary(project).totals || [];
	var ordered = totals.slice().sort(function(a, b) { return String(a.currency).localeCompare(String(b.currency)); });
	return { signature: ordered.map(function(total) { return total.currency; }).join("|"), amounts: ordered.map(function(total) { return total.amount; }) };
}

// Costs are already normalized to CNY; compare the same-currency amount vector.
function compareProjectCost(a, b) {
	var ca = projectCostSortData(a), cb = projectCostSortData(b);
	if (ca.signature !== cb.signature) return ca.signature.localeCompare(cb.signature);
	for (var i = 0; i < Math.max(ca.amounts.length, cb.amounts.length); i++) {
		var va = ca.amounts[i] == null ? -1 : ca.amounts[i];
		var vb = cb.amounts[i] == null ? -1 : cb.amounts[i];
		if (va !== vb) return va > vb ? 1 : -1;
	}
	return 0;
}

function defaultSortDir(key) {
	return key === "name" ? 1 : -1;
}

function nameOf(project) {
	return String((project && project.name) || "");
}

function sortProjects(projects, key, dir, ctx) {
	var list = (Array.isArray(projects) ? projects : []).slice();
	var context = ctx && typeof ctx === "object" ? ctx : {};
	var direction = dir == null ? defaultSortDir(key) : (dir > 0 ? 1 : -1);
	function primary(a, b) {
		a = a || {};
		b = b || {};
		if (key === "cost") return compareProjectCost(a, b);
		if (key === "name") return nameOf(a).localeCompare(nameOf(b), undefined, { numeric: true });
		var va, vb;
		// 宿主下发的 project.sessionCount 与 sessions 等长；本地拼装的项目对象
		// 可能没有这个字段，回退到会话数组长度，避免整列排序恒为 0。
		if (key === "sessions") {
			va = a.sessionCount != null ? a.sessionCount : (Array.isArray(a.sessions) ? a.sessions.length : 0);
			vb = b.sessionCount != null ? b.sessionCount : (Array.isArray(b.sessions) ? b.sessions.length : 0);
		}
		else if (key === "tokens") { va = (a.stats && a.stats.inputTokens || 0) + (a.stats && a.stats.outputTokens || 0); vb = (b.stats && b.stats.inputTokens || 0) + (b.stats && b.stats.outputTokens || 0); }
		else if (key === "hit") { va = a.stats && a.stats.cacheHitPct != null ? a.stats.cacheHitPct : -1; vb = b.stats && b.stats.cacheHitPct != null ? b.stats.cacheHitPct : -1; }
		else if (key === "llm") { va = a.stats && a.stats.llmMs || 0; vb = b.stats && b.stats.llmMs || 0; }
		else if (key === "last") {
			var spans = context.spans;
			va = context.dayMode ? (spans && spans.get(a.id) ? spans.get(a.id).endSlot : 0) : (a.lastActiveAt || 0);
			vb = context.dayMode ? (spans && spans.get(b.id) ? spans.get(b.id).endSlot : 0) : (b.lastActiveAt || 0);
		} else { va = 0; vb = 0; }
		return va > vb ? 1 : va < vb ? -1 : 0;
	}
	list.sort(function(a, b) {
		var compared = primary(a, b) * direction;
		return compared || nameOf(a).localeCompare(nameOf(b), undefined, { numeric: true });
	});
	return list;
}

function missingModels(projects) {
	var rows = new Map();
	(Array.isArray(projects) ? projects : []).forEach(function(project) {
		((project && project.sessions) || []).forEach(function(session) {
			((session && session.slotUsage) || []).forEach(function(usage) {
				if (!usage) return;
				var model = usage.modelRaw || usage.model || (session && (session.modelRaw || session.model));
				var cost = usageCostDetail(usage, {
					providerId: usage.providerId || (session && session.providerId),
					model: model,
					serviceTier: usage.serviceTier || (session && session.serviceTier),
					contextTokens: usage.contextTokens != null ? usage.contextTokens : (session && session.contextTokens)
				});
				if (!cost || !(cost.unpricedTokens > 0) || cost.status === "subscription") return;
				var key = JSON.stringify([usage.providerId, model]);
				var row = rows.get(key) || { provider: usage.providerId, model: model, tokens: 0 };
				row.tokens += cost.unpricedTokens;
				rows.set(key, row);
			});
		});
	});
	return Array.from(rows.values()).sort(function(a, b) { return b.tokens - a.tokens; });
}

function pendingFocus(projects) {
	var rows = missingModels(projects);
	return rows.length ? rows[0] : null;
}

module.exports = {
	overviewTotals, previousActiveDate, cnyAmount, costDelta, costShares,
	projectDaySpans, activeDayCount, sortProjects, defaultSortDir, pendingFocus,
	compareProjectCost, missingModels, createSingleFlight
};
