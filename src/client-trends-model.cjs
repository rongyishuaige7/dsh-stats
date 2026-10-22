// 趋势页的纯计算：范围、每日点、热力图、模型分布与排序。
// No React, DOM or browser storage belongs in this module, and it never reads
// the clock: every function that needs "today" takes it as a Beijing date key.
const { mergeCostSummaries, summarizeCosts } = require("./client-format.cjs");
const { addDays, weekOf } = require("./client-timeline-model.cjs");
const { modelNameOnly } = require("./client-data.cjs");

const RANGES = Object.freeze([7, 30, 90]);
const HEAT_WEEKS = 26;
const MODEL_COLORS = 8;
const TRENDS_PREF_DEFAULTS = Object.freeze({ range: 30, metric: "cost" });

const DAY_MS = 864e5;
// 纵轴取整档位：U5 要求 12.3 → 15，而不是 niceCeil 的 20。
const NICE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

function isDateKey(value) {
	return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function dayMs(date) {
	return isDateKey(date) ? Date.parse(date + "T00:00:00Z") : NaN;
}

function epochDate(epochDay) {
	return new Date(epochDay * DAY_MS).toISOString().slice(0, 10);
}

function num(value) {
	return Number.isFinite(value) ? value : 0;
}

// 星期几只用 UTC 取值，避免浏览器时区影响（§3.2）。
function weekdayOf(date) {
	const time = dayMs(date);
	return Number.isFinite(time) ? new Date(time).getUTCDay() : -1;
}

// 周一是第 1 行，周日是第 7 行。
function rowOf(date) {
	const weekday = weekdayOf(date);
	if (weekday < 0) return 0;
	return weekday === 0 ? 7 : weekday;
}

function lookup(source, date) {
	if (!source) return null;
	if (source instanceof Map) return source.get(date) || null;
	return source[date] || null;
}

function compareText(a, b) {
	const left = a == null ? "" : String(a);
	const right = b == null ? "" : String(b);
	return left < right ? -1 : left > right ? 1 : 0;
}

function compareName(a, b) {
	return compareText(modelNameOnly(a), modelNameOnly(b));
}

// ------------------------------------------------------------------
// 偏好（U3）
// ------------------------------------------------------------------
function normalizeTrendsPrefs(value) {
	const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
	const range = RANGES.indexOf(input.range) >= 0 ? input.range : TRENDS_PREF_DEFAULTS.range;
	const metric = input.metric === "cost" || input.metric === "token" ? input.metric : TRENDS_PREF_DEFAULTS.metric;
	return { range, metric };
}

// ------------------------------------------------------------------
// 成本摘要（U12）
// ------------------------------------------------------------------
// 只取 CNY 那一项的金额；partial 也照取，这与总览的 cnyAmount 不同：
// cnyAmount 遇到不完整金额返回 null，趋势页要拿它画柱子和算占比。
function amountOf(summary) {
	if (!summary || !Array.isArray(summary.totals)) return 0;
	let amount = 0;
	for (const total of summary.totals) {
		if (total && total.currency === "CNY" && Number.isFinite(total.amount)) amount += total.amount;
	}
	return amount;
}

function isPartial(summary) {
	if (!summary) return false;
	return summary.status === "partial" || num(summary.unpricedTokens) > 0;
}

// ------------------------------------------------------------------
// 范围（U1）
// ------------------------------------------------------------------
function rangeDates(today, n) {
	if (!isDateKey(today) || !Number.isInteger(n) || n <= 0) return [];
	const dates = [];
	for (let i = n - 1; i >= 0; i--) dates.push(addDays(today, -i));
	return dates;
}

function previousDates(today, n) {
	if (!isDateKey(today) || !Number.isInteger(n) || n <= 0) return [];
	const dates = [];
	for (let i = 2 * n - 1; i >= n; i--) dates.push(addDays(today, -i));
	return dates;
}

function dayPoints(dates, byDay, dayCosts) {
	const list = Array.isArray(dates) ? dates.filter(isDateKey) : [];
	return list.map(function(date) {
		const bucket = lookup(byDay, date) || {};
		const input = num(bucket.input);
		const cacheRead = num(bucket.cacheRead);
		const output = num(bucket.output);
		const cost = lookup(dayCosts, date) || summarizeCosts([]);
		const tokens = input + output;
		return {
			date,
			input,
			output,
			cacheRead,
			uncached: Math.max(0, input - cacheRead),
			reasoning: num(bucket.reasoning),
			tokens,
			cost,
			amount: amountOf(cost),
			partial: isPartial(cost),
			active: tokens > 0
		};
	});
}

function metricValue(point, metric) {
	if (!point) return 0;
	return metric === "token" ? num(point.tokens) : num(point.amount);
}

function rangeTotals(points) {
	const list = Array.isArray(points) ? points : [];
	const totals = {
		input: 0,
		output: 0,
		cacheRead: 0,
		uncached: 0,
		reasoning: 0,
		tokens: 0,
		cost: mergeCostSummaries(list.map(function(point) { return point && point.cost; })),
		activeDays: 0,
		days: list.length
	};
	for (const point of list) {
		if (!point) continue;
		totals.input += num(point.input);
		totals.output += num(point.output);
		totals.cacheRead += num(point.cacheRead);
		totals.uncached += num(point.uncached);
		totals.reasoning += num(point.reasoning);
		totals.tokens += num(point.tokens);
		if (point.active) totals.activeDays++;
	}
	return totals;
}

// ------------------------------------------------------------------
// 纵轴与 x 轴（U5）
// ------------------------------------------------------------------
function niceMax(peak) {
	if (!Number.isFinite(peak) || peak <= 0) return 1;
	const exponent = Math.floor(Math.log10(peak));
	for (const step of NICE_STEPS) {
		// 先按 10 的整数幂放大再乘系数，最后按 12 位有效数字收尾，
		// 避免 0.30000000000000004 这类浮点尾巴进入刻度文字。
		const value = Number((step * Math.pow(10, exponent)).toPrecision(12));
		if (value >= peak) return value;
	}
	return Number((10 * Math.pow(10, exponent)).toPrecision(12));
}

function trimFixed(value, digits) {
	const text = value.toFixed(digits);
	if (text.indexOf(".") < 0) return text;
	return text.replace(/0+$/, "").replace(/\.$/, "");
}

function fmtAxisCost(value) {
	const amount = Number.isFinite(value) ? value : 0;
	if (amount <= 0) return "¥0";
	if (amount < 1) return "¥" + trimFixed(amount, 2);
	if (amount < 100) return "¥" + trimFixed(amount, 1);
	if (amount < 1000) return "¥" + String(Math.round(amount));
	return "¥" + trimFixed(amount / 1000, 1) + "k";
}

function xLabels(dates, today) {
	const list = Array.isArray(dates) ? dates.filter(isDateKey) : [];
	const n = list.length;
	if (!n) return [];
	const gap = Math.ceil(n / 12);
	const todayIndex = isDateKey(today) && list.indexOf(today) >= 0 ? list.indexOf(today) : n - 1;
	const out = [];
	list.forEach(function(date, index) {
		if (index === todayIndex) {
			out.push({ index, kind: "today", date });
			return;
		}
		// 今天之后的列不画标签；离今天不到 gap 列的标签也省掉，避免和"今天"挤在一起。
		if (index > todayIndex) return;
		if (todayIndex - index < gap) return;
		if (n === 7) out.push({ index, kind: "date", date });
		else if (n === 30) {
			if (weekdayOf(date) === 1) out.push({ index, kind: "date", date });
		} else if (date.slice(8) === "01") out.push({ index, kind: "month", date });
	});
	return out;
}

// ------------------------------------------------------------------
// 热力图（U7、U8）
// ------------------------------------------------------------------
function heatWindow(today) {
	if (!isDateKey(today)) return { start: null, dates: [] };
	// 今天所在那一周的周一往前 25 周，共 26 列。
	const startEpoch = (weekOf(today) - (HEAT_WEEKS - 1)) * 7 - 3;
	const start = epochDate(startEpoch);
	const span = Math.round((dayMs(today) - dayMs(start)) / DAY_MS);
	const dates = [];
	for (let i = 0; i <= span; i++) dates.push(addDays(start, i));
	return { start, dates };
}

function ratioLevel(value, max) {
	if (!(max > 0)) return 1;
	return Math.max(1, Math.ceil(4 * value / max));
}

function heatLevel(value, sortedActiveValues) {
	const amount = num(value);
	// 活跃日但当前指标为 0（费用模式下完全待计价）固定 1 级。
	if (amount <= 0) return 1;
	const sorted = Array.isArray(sortedActiveValues)
		? sortedActiveValues.filter(Number.isFinite).slice().sort(function(a, b) { return a - b; })
		: [];
	const count = sorted.length;
	if (!count) return 1;
	const max = sorted[count - 1];
	if (!(max > 0)) return 1;
	const quantile = function(fraction) { return sorted[Math.min(count - 1, Math.floor(fraction * count))]; };
	if (count < 4) return ratioLevel(amount, max);
	if (amount >= max) return 4;
	const low = quantile(0.25);
	const middle = quantile(0.5);
	const high = quantile(0.75);
	if (!(high > low)) return ratioLevel(amount, max);
	if (amount > high) return 4;
	if (amount > middle) return 3;
	if (amount > low) return 2;
	return 1;
}

function heatCells(window, values, today) {
	const dates = window && Array.isArray(window.dates) ? window.dates.filter(isDateKey) : [];
	const end = isDateKey(today) ? today : dates.length ? dates[dates.length - 1] : null;
	const activeValues = [];
	for (const date of dates) {
		const entry = lookup(values, date);
		if (entry && entry.active) activeValues.push(num(entry.value));
	}
	activeValues.sort(function(a, b) { return a - b; });
	const cells = [];
	dates.forEach(function(date, index) {
		// 今天之后的格子不渲染。
		if (end && date > end) return;
		const entry = lookup(values, date);
		const active = !!(entry && entry.active);
		cells.push({
			date,
			column: Math.floor(index / 7) + 1,
			row: rowOf(date),
			level: active ? heatLevel(num(entry.value), activeValues) : 0,
			active,
			today: !!end && date === end
		});
	});
	return cells;
}

function heatMonths(window) {
	const dates = window && Array.isArray(window.dates) ? window.dates.filter(isDateKey) : [];
	const start = window && isDateKey(window.start) ? window.start : dates.length ? dates[0] : null;
	if (!start) return [];
	// 只看已经画出来的日期（截止到今天）：某月 1 日晚于今天时那一格还不存在。
	const marks = [];
	dates.forEach(function(date, index) {
		if (date.slice(8) !== "01") return;
		marks.push({ column: Math.floor(index / 7) + 1, month: Number(date.slice(5, 7)) });
	});
	// 第一列总是写它所在的月份；下一个标签离它不到 3 列时让位。
	const next = marks.length ? marks[0].column : Infinity;
	if (next !== 1 && next >= 4) marks.unshift({ column: 1, month: Number(start.slice(5, 7)) });
	return marks;
}

function activeDaysOf(activeSet) {
	if (!activeSet) return function() { return false; };
	if (typeof activeSet.has === "function") return function(date) { return activeSet.has(date); };
	if (Array.isArray(activeSet)) return function(date) { return activeSet.indexOf(date) >= 0; };
	return function() { return false; };
}

function streaks(activeSet, window, today) {
	const dates = window && Array.isArray(window.dates) ? window.dates.filter(isDateKey) : [];
	const isActive = activeDaysOf(activeSet);
	let active = 0;
	for (const date of dates) if (isActive(date)) active++;

	let current = 0;
	let currentEnd = null;
	if (dates.length && isDateKey(today)) {
		// 今天不活跃时从昨天开始数；昨天也不活跃就是 0。只数到窗口起点为止。
		const yesterday = addDays(today, -1);
		let cursor = isActive(today) ? today : isActive(yesterday) ? yesterday : null;
		if (cursor) {
			currentEnd = cursor === today ? "today" : "yesterday";
			while (isActive(cursor) && cursor >= dates[0]) {
				current++;
				cursor = addDays(cursor, -1);
			}
		}
	}

	let longest = 0;
	let longestStart = null;
	let longestEnd = null;
	let run = 0;
	let runStart = null;
	for (const date of dates) {
		if (!isActive(date)) {
			run = 0;
			continue;
		}
		if (!run) runStart = date;
		run++;
		// 并列时取较晚的一段。
		if (run >= longest) {
			longest = run;
			longestStart = runStart;
			longestEnd = date;
		}
	}

	return { active, total: dates.length, current, currentEnd, longest, longestStart, longestEnd };
}

// ------------------------------------------------------------------
// 模型（U9–U11）
// ------------------------------------------------------------------
function tokenTotal(row) {
	return row ? num(row.input) + num(row.output) : 0;
}

function modelValue(row, metric) {
	if (!row) return 0;
	return metric === "token" ? tokenTotal(row) : amountOf(row.costSummary);
}

function modelColorIndexes(models) {
	const list = (Array.isArray(models) ? models : []).filter(Boolean).slice();
	// 全部历史按 Token 降序，并列比 key：同一个模型换范围、指标或筛选都不换颜色。
	list.sort(function(a, b) {
		return tokenTotal(b) - tokenTotal(a) || compareText(a.key, b.key);
	});
	const indexes = new Map();
	list.slice(0, MODEL_COLORS).forEach(function(row, index) {
		indexes.set(row.key, index);
	});
	return indexes;
}

function modelShares(rows, metric) {
	const list = (Array.isArray(rows) ? rows : []).filter(Boolean);
	const total = list.reduce(function(sum, row) { return sum + modelValue(row, metric); }, 0);
	const shares = new Map();
	for (const row of list) shares.set(row.key, total > 0 ? modelValue(row, metric) / total : 0);
	return shares;
}

// 返回正数表示 a 排在 b 前面：先比指标值，再比 Token 降序，最后比名字升序。
function compareModelRank(metric) {
	return function(a, b) {
		const left = modelValue(a, metric);
		const right = modelValue(b, metric);
		if (left !== right) return left > right ? 1 : -1;
		const leftTokens = tokenTotal(a);
		const rightTokens = tokenTotal(b);
		if (leftTokens !== rightTokens) return leftTokens > rightTokens ? 1 : -1;
		return -compareName(a, b);
	};
}

function topModel(rows, metric) {
	const list = (Array.isArray(rows) ? rows : []).filter(Boolean);
	if (!list.length) return null;
	let effective = metric === "token" ? "token" : "cost";
	if (effective === "cost") {
		// 费用模式下计价金额为 0 时改按 Token 取，副行也随之写 Token 占比。
		const total = list.reduce(function(sum, row) { return sum + modelValue(row, "cost"); }, 0);
		if (!(total > 0)) effective = "token";
	}
	const compare = compareModelRank(effective);
	const best = list.reduce(function(winner, row) {
		return !winner || compare(row, winner) > 0 ? row : winner;
	}, null);
	return best ? { row: best, metric: effective } : null;
}

function shareOf(shares, key) {
	const value = shares instanceof Map ? shares.get(key) : shares ? shares[key] : undefined;
	return Number.isFinite(value) && value > 0 ? value : 0;
}

function colorIndexOf(colorIndexes, key) {
	const value = colorIndexes instanceof Map ? colorIndexes.get(key) : colorIndexes ? colorIndexes[key] : undefined;
	return Number.isInteger(value) ? value : null;
}

function roundAngle(value) {
	return Number(value.toFixed(1));
}

function ringStops(rows, shares, colorIndexes) {
	const list = (Array.isArray(rows) ? rows : []).filter(Boolean);
	const colored = [];
	const others = [];
	for (const row of list) {
		if (!(shareOf(shares, row.key) > 0)) continue;
		if (colorIndexOf(colorIndexes, row.key) == null) others.push(row);
		else colored.push(row);
	}
	colored.sort(function(a, b) {
		return shareOf(shares, b.key) - shareOf(shares, a.key) || compareText(a.key, b.key);
	});

	const stops = [];
	let at = 0;
	for (const row of colored) {
		const share = shareOf(shares, row.key);
		const from = roundAngle(at);
		at += share * 360;
		stops.push({ colorIndex: colorIndexOf(colorIndexes, row.key), from, to: roundAngle(at), share, keys: [row.key] });
	}
	const otherShare = others.reduce(function(sum, row) { return sum + shareOf(shares, row.key); }, 0);
	if (otherShare > 0) {
		// 没有颜色的模型合成一段灰色"其他"，永远放在最后，并收口到 360。
		stops.push({ colorIndex: null, from: roundAngle(at), to: 360, share: otherShare, keys: others.map(function(row) { return row.key; }) });
	} else if (stops.length) {
		stops[stops.length - 1].to = 360;
	}
	return stops;
}

function defaultSortDir(key) {
	return key === "name" ? 1 : -1;
}

function defaultModelSort(metric) {
	return { key: metric === "token" ? "tokens" : "cost", dir: -1 };
}

function modelSortValue(row, key) {
	if (key === "name") return modelNameOnly(row);
	if (key === "sessions") return num(row && row.sessions);
	if (key === "tokens") return tokenTotal(row);
	if (key === "hit") return row && num(row.input) > 0 ? num(row.cacheRead) / num(row.input) : -1;
	if (key === "llm") return num(row && row.llmMs);
	if (key === "cost") return amountOf(row && row.costSummary);
	return 0;
}

function sortModels(rows, key, dir, metric) {
	const list = (Array.isArray(rows) ? rows : []).slice();
	const direction = dir == null ? defaultSortDir(key) : dir > 0 ? 1 : -1;
	const nameKey = key === "name";
	list.sort(function(a, b) {
		const left = modelSortValue(a, key);
		const right = modelSortValue(b, key);
		const primary = nameKey ? compareText(left, right) : left > right ? 1 : left < right ? -1 : 0;
		if (primary) return primary * direction;
		// 并列时先比 Token 降序，再比名字升序。
		const leftTokens = tokenTotal(a);
		const rightTokens = tokenTotal(b);
		if (leftTokens !== rightTokens) return rightTokens - leftTokens;
		return compareName(a, b);
	});
	return list;
}

module.exports = {
	RANGES,
	HEAT_WEEKS,
	MODEL_COLORS,
	TRENDS_PREF_DEFAULTS,
	normalizeTrendsPrefs,
	amountOf,
	isPartial,
	rangeDates,
	previousDates,
	dayPoints,
	metricValue,
	rangeTotals,
	niceMax,
	fmtAxisCost,
	xLabels,
	heatWindow,
	heatCells,
	heatLevel,
	heatMonths,
	streaks,
	modelColorIndexes,
	modelValue,
	modelShares,
	topModel,
	ringStops,
	defaultModelSort,
	sortModels
};
