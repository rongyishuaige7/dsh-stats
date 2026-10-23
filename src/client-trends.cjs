// 趋势页组件：工具栏、摘要条、每日柱图、26 周热力图和模型区（5g–5i）。
const react = require("react");
const { PendingChip, InfoTip, ProjectFilterMenu } = require("./client-overview.cjs");
const { fmtCostSummary, fmtDuration, fmtN, fmtSharePct, fmtTokens } = require("./client-format.cjs");
const { hasTokenUsage, modelAgg, modelDisplayName, modelNameOnly, sessionDayTokens } = require("./client-data.cjs");
const { costDelta, defaultSortDir, pendingFocus } = require("./client-overview-model.cjs");
const { dayCostSummaries } = require("./client-timeline-model.cjs");
const {
	HEAT_WEEKS, RANGES, amountOf, dayPoints, defaultModelSort, fmtAxisCost, heatCells, heatMonths, heatWindow,
	metricValue, modelColorIndexes, modelShares, niceMax, previousDates, rangeDates, rangeTotals,
	ringStops, sortModels, streaks, topModel, xLabels
} = require("./client-trends-model.cjs");
const { tipProps, tipRows } = require("./client-tip.cjs");

const e = react.createElement;
const { useEffect, useMemo, useRef, useState } = react;

function weekdayName(date, t) {
	const names = t("w.weekdays").split(",");
	return names[new Date(date + "T00:00:00Z").getUTCDay()];
}

function dayLabel(date, t, full) {
	return (full ? date : date.slice(5)) + " " + t("w.dayPrefix") + weekdayName(date, t);
}

function monthLabel(month, t) {
	const names = t("tr.months").split(",");
	return names[month - 1] || String(month);
}

function rangeText(dates, today, t) {
	if (!dates.length) return t("tl.rangeValue").replace("%s", "—").replace("%s", "—");
	const start = dates[0];
	const end = dates[dates.length - 1];
	const sameYear = start.slice(0, 4) === today.slice(0, 4) && end.slice(0, 4) === today.slice(0, 4);
	return t("tl.rangeValue").replace("%s", sameYear ? start.slice(5) : start).replace("%s", sameYear ? end.slice(5) : end);
}

// 摘要条日均：保留原摘要的 status，部分计价也带"*"。
function averageText(totals, activeDays, metric, t) {
	if (activeDays <= 0) return "—";
	if (metric === "token") return fmtTokens(totals.tokens / activeDays);
	const amount = amountOf(totals.cost);
	if (amount == null) return "—";
	return fmtCostSummary({ ...totals.cost, totals: [{ currency: "CNY", amount: amount / activeDays, exactAmount: 0, estimatedAmount: 0 }] }, t);
}

function TrendsTools(props) {
	const { prefs, setPrefs, today, rangeProjects, hidden, onToggle, onShowAll, colorIndexes, t } = props;
	const dates = rangeDates(today, prefs.range);
	const filterProjects = useMemo(function() {
		return (rangeProjects || []).filter(hasTokenUsage);
	}, [rangeProjects]);
	return e("div", { className: "dss-tools dss-tr-tools" },
		e("div", { className: "dss-seg", role: "group", "aria-label": t("tr.range") },
			RANGES.map(function(n) {
				const on = prefs.range === n;
				return e("button", {
					key: n,
					type: "button",
					className: on ? "on" : "",
					"aria-pressed": on,
					"data-action": "tr-range-" + n,
					onClick: function() { setPrefs({ range: n }); }
				}, t("tr.rangeDays").replace("%d", String(n)));
			})
		),
		e("span", { className: "dss-range-label dss-tr-range", "aria-live": "polite" }, rangeText(dates, today, t)),
		e("div", { className: "dss-tr-group" },
			e("span", { className: "dss-tr-ctl-k" }, t("tr.metric")),
			e("div", { className: "dss-seg", role: "group", "aria-label": t("tr.metric") },
				[["cost", "tl.metricCost"], ["token", "tl.metricToken"]].map(function(entry) {
					const on = prefs.metric === entry[0];
					return e("button", {
						key: entry[0],
						type: "button",
						className: on ? "on" : "",
						"aria-pressed": on,
						"data-action": "tr-metric-" + entry[0],
						onClick: function() { setPrefs({ metric: entry[0] }); }
					}, t(entry[1]));
				})
			)
		),
		e(ProjectFilterMenu, {
			projects: filterProjects,
			hidden,
			onToggle,
			onShowAll,
			colorIndexes,
			filterKey: "trends:" + prefs.range,
			t
		})
	);
}

function TrendsKpis(props) {
	const { totals, previous, range, activeDays, models, metric, pending, onOpenPricing, t } = props;
	const input = totals.input;
	const cache = totals.cacheRead;
	const uncached = Math.max(0, input - cache);
	const output = totals.output;
	const tokenTotal = input + output;
	const hitPct = input > 0 ? Math.round(cache / input * 100) : null;
	const sub = [];
	const delta = costDelta(totals.cost, previous && previous.cost);
	if (delta) {
		const pct = Math.round(delta.ratio * 100 + Math.sign(delta.ratio) * 1e-9);
		sub.push(e("span", { key: "delta", className: "dss-kpi-delta" },
			pct === 0 ? t("kpi.flat") : t("tr.kpi.vs").replace("%d", String(range)) + " " + (pct > 0 ? "↑" : "↓") + Math.abs(pct) + "%"));
	}
	if (totals.cost.unpricedTokens > 0) {
		sub.push(e(PendingChip, {
			key: "pending",
			focus: pending,
			label: t("kpi.pending").replace("%s", fmtTokens(totals.cost.unpricedTokens)),
			onOpen: onOpenPricing
		}));
	}

	const top = topModel(models, metric);
	const shareMetric = top ? top.metric : metric;
	const shares = modelShares(models, shareMetric);
	const share = top ? shares.get(top.row.key) : null;
	const provider = top && top.row.providerId && top.row.providerId !== "unknown" ? top.row.providerId : null;
	const shareText = share == null ? null : t(shareMetric === "token" ? "tr.kpi.shareToken" : "tr.kpi.shareCost").replace("%s", fmtSharePct(share * 100));
	const topSub = [shareText, provider].filter(Boolean).join(" · ");

	return e("section", { className: "dss-tr-kpis", "aria-label": t("tr.kpiLabel") },
		e("div", { className: "dss-kpi cost" },
			e("div", { className: "dss-kpi-k" }, t("card.cost"), e(InfoTip, { id: "dss-tr-cost-tip", label: t("kpi.costInfo"), text: t("w.estimatedHint") })),
			e("div", { className: "dss-kpi-v dss-cost" }, fmtCostSummary(totals.cost, t)),
			sub.length ? e("div", { className: "dss-kpi-s" }, sub) : null
		),
		e("div", { className: "dss-kpi" },
			e("div", { className: "dss-kpi-k" }, t("kpi.tokens")),
			e("div", { className: "dss-kpi-v" }, fmtTokens(tokenTotal)),
			e("div", { className: "dss-tokbar", role: "img", "aria-label": t("kpi.tokAria").replace("%s", fmtTokens(cache)).replace("%s", fmtTokens(uncached)).replace("%s", fmtTokens(output)) },
				e("i", { className: "cache", style: { flexGrow: cache } }),
				e("i", { className: "unc", style: { flexGrow: uncached } }),
				e("i", { className: "out", style: { flexGrow: output } })
			),
			e("div", { className: "dss-tok-legend" },
				e("span", null, e("i", { className: "dot cache" }), t("kpi.hit") + " " + (hitPct == null ? "—" : hitPct + "%")),
				e("span", null, e("i", { className: "dot unc" }), t("kpi.uncached")),
				e("span", null, e("i", { className: "dot out" }), t("w.output") + " " + fmtTokens(output))
			)
		),
		e("div", { className: "dss-kpi" },
			e("div", { className: "dss-kpi-k" }, t("tr.kpi.perDay")),
			e("div", { className: "dss-kpi-v" }, averageText(totals, activeDays, metric, t)),
			e("div", { className: "dss-kpi-s" }, e("span", null, t("tr.kpi.active").replace("%d", String(activeDays)).replace("%d", String(totals.days))))
		),
		e("div", { className: "dss-kpi" },
			e("div", { className: "dss-kpi-k" }, t("tr.kpi.topModel")),
			e("div", { className: "dss-kpi-v is-model", title: top ? (top.row.displayName || modelDisplayName(top.row)) : "" }, top ? modelNameOnly(top.row) : "—"),
			top && topSub ? e("div", { className: "dss-kpi-s" }, e("span", { className: "dss-tr-ell" }, topSub)) : null
		)
	);
}

function barTip(point, t) {
	const rows = [
		[t("card.cost"), fmtCostSummary(point.cost, t)],
		[t("kpi.tokens"), fmtTokens(point.tokens)],
		[t("w.input"), fmtTokens(point.input)],
		[t("w.output"), fmtTokens(point.output)]
	];
	if (point.reasoning > 0) rows.push([t("tr.reasoning"), fmtTokens(point.reasoning)]);
	rows.push([t("w.cacheHit"), point.input > 0 ? Math.round(point.cacheRead / point.input * 100) + "%" : "—"]);
	if (point.partial) rows.push([t("tl.partial"), fmtTokens(point.cost.unpricedTokens) + " " + t("kpi.tokens")]);
	return rows;
}

// 柱区和热力格共用的 roving tabindex：方向键只在活跃日之间移动。
function focusDate(refs, date) {
	const node = refs.current.get(date);
	if (node && typeof node.focus === "function") node.focus();
}

function rovingKeyDown(ev, options) {
	const { dates, date, moveTo, onOpen, vertical } = options;
	const index = dates.indexOf(date);
	let next = null;
	if (ev.key === "ArrowLeft" || (vertical && ev.key === "ArrowUp")) next = dates[Math.max(0, index - 1)];
	else if (ev.key === "ArrowRight" || (vertical && ev.key === "ArrowDown")) next = dates[Math.min(dates.length - 1, index + 1)];
	else if (ev.key === "Home") next = dates[0];
	else if (ev.key === "End") next = dates[dates.length - 1];
	else if (ev.key === "Enter" || ev.key === " ") {
		ev.preventDefault();
		ev.stopPropagation();
		onOpen();
		return;
	} else return;
	ev.preventDefault();
	ev.stopPropagation();
	if (next && next !== date) moveTo(next);
}

function DailyChart(props) {
	const { points, totals, metric, today, barDate, setBarDate, onOpenDay, canOpen, t } = props;
	const isToken = metric === "token";
	const count = points.length;
	const active = points.filter(function(point) { return point.active; });
	const peak = active.reduce(function(best, point) {
		return !best || metricValue(point, metric) >= metricValue(best, metric) ? point : best;
	}, null);
	const top = niceMax(peak ? metricValue(peak, metric) : 0);
	const selected = active.some(function(point) { return point.date === barDate; }) ? barDate : peak ? peak.date : null;
	const activeDates = active.map(function(point) { return point.date; });
	const barRefs = useRef(new Map());

	const valueText = function(point) {
		return isToken ? fmtTokens(metricValue(point, "token")) : fmtCostSummary(point.cost, t);
	};
	const average = totals.activeDays > 0 ? (isToken ? totals.tokens : amountOf(totals.cost)) / totals.activeDays : 0;
	const averageLabel = isToken
		? fmtTokens(average)
		: fmtCostSummary({ ...totals.cost, totals: [{ currency: "CNY", amount: average, exactAmount: 0, estimatedAmount: 0 }] }, t);
	const title = isToken ? t("tr.daily.token") : t("tr.daily.cost");
	const note = t("tr.recent").replace("%d", String(count)) + (peak
		? " · " + t("tl.peak").replace("%s", peak.date.slice(5) + " " + valueText(peak)) + " · " + t("kpi.perDay").replace("%s", averageLabel)
		: "");

	const moveTo = function(date) {
		setBarDate(date);
		focusDate(barRefs, date);
	};
	const onBarKeyDown = function(ev, date) {
		rovingKeyDown(ev, {
			dates: activeDates,
			date,
			moveTo,
			onOpen: function() { if (canOpen(date)) onOpenDay(date); },
			vertical: false
		});
	};

	const anyPartial = !isToken && points.some(function(point) { return point.active && point.partial; });
	const columns = points.map(function(point) {
		if (!point.active) return e("div", { key: point.date, className: "dss-tr-col" });
		const value = metricValue(point, metric);
		const height = top > 0 ? Math.max(0, value / top * 100) : 0;
		const label = dayLabel(point.date, t, false) + " " + valueText(point);
		const openable = canOpen(point.date);
		const segments = isToken ? [
			e("i", { key: "cache", className: "cache", style: { flexGrow: point.cacheRead } }),
			e("i", { key: "unc", className: "unc", style: { flexGrow: point.uncached } }),
			e("i", { key: "out", className: "out", style: { flexGrow: point.output } })
		] : null;
		return e("div", { key: point.date, className: "dss-tr-col" },
			e("button", {
				type: "button",
				className: "dss-tr-bar" + (isToken ? " is-token" : "") + (!isToken && point.partial ? " is-partial" : ""),
				"data-date": point.date,
				"data-action": "tr-day",
				"aria-label": openable ? t("tr.openDay").replace("%s", label) : label,
				"aria-disabled": openable ? undefined : "true",
				tabIndex: point.date === selected ? 0 : -1,
				style: { height: height + "%" },
				ref: function(node) { if (node) barRefs.current.set(point.date, node); else barRefs.current.delete(point.date); },
				onClick: openable ? function() { onOpenDay(point.date); } : undefined,
				onKeyDown: function(ev) { onBarKeyDown(ev, point.date); },
				...tipProps(function() { return tipRows(dayLabel(point.date, t, false), barTip(point, t)); })
			}, segments)
		);
	});

	const labels = xLabels(points.map(function(point) { return point.date; }), today).map(function(label) {
		const text = label.kind === "today" ? t("nav.today") : label.kind === "month" ? monthLabel(Number(label.date.slice(5, 7)), t) : label.date.slice(5);
		const classes = ["dss-tr-xlabel"];
		if (label.index === 0) classes.push("is-start");
		if (label.kind === "today") classes.push("is-today");
		return e("span", { key: label.date, className: classes.join(" "), style: { gridColumn: label.index + 1 } }, text);
	});

	const legend = isToken
		? [
			e("span", { key: "cache", className: "dss-tr-legend-grp" }, e("i", { className: "dss-tr-sw is-cache" }), t("w.cacheHit")),
			e("span", { key: "unc", className: "dss-tr-legend-grp" }, e("i", { className: "dss-tr-sw is-unc" }), t("kpi.uncached")),
			e("span", { key: "out", className: "dss-tr-legend-grp" }, e("i", { className: "dss-tr-sw is-out" }), t("w.output"))
		]
		: [
			totals.activeDays >= 2 && top > 0 ? e("span", { key: "avg", className: "dss-tr-legend-grp" }, e("i", { className: "dss-tr-sw is-dash" }), t("tr.avgLine")) : null,
			anyPartial ? e("span", { key: "partial", className: "dss-tr-legend-grp" }, e("i", { className: "dss-tr-sw is-part" }), t("tl.partial")) : null
		];

	return e("section", { className: "dss-tr-sec dss-tr-daily" },
		e("div", { className: "dss-tr-sec-head" },
			e("h3", null, title),
			e("span", { className: "dss-tr-sec-note" }, note)
		),
		e("div", { className: "dss-tr-chart" },
			e("div", { className: "dss-tr-y", "aria-hidden": "true" },
				e("span", { className: "dss-tr-ytick is-top", style: { bottom: "100%" } }, isToken ? fmtTokens(top) : fmtAxisCost(top)),
				e("span", { className: "dss-tr-ytick", style: { bottom: "50%" } }, isToken ? fmtTokens(top / 2) : fmtAxisCost(top / 2)),
				e("span", { className: "dss-tr-ytick is-zero" }, isToken ? fmtTokens(0) : fmtAxisCost(0))
			),
			e("div", { className: "dss-tr-plot" },
				e("div", { className: "dss-tr-grid", "aria-hidden": "true" },
					e("i", { className: "dss-tr-gline", style: { bottom: "100%" } }),
					e("i", { className: "dss-tr-gline", style: { bottom: "50%" } }),
					e("i", { className: "dss-tr-gline is-base", style: { bottom: "0" } })
				),
				totals.activeDays >= 2 && top > 0 ? e("div", { className: "dss-tr-avg", "aria-hidden": "true", style: { bottom: (average / top * 100) + "%" } }) : null,
				e("div", {
					className: "dss-tr-bars" + (count >= 90 ? " is-dense" : ""),
					role: "group",
					"aria-label": t("tr.groupAria").replace("%s", title).replace("%s", t("tr.recent").replace("%d", String(count))),
					style: { "--n": count }
				}, columns)
			),
			e("div", { className: "dss-tr-x" + (count >= 90 ? " is-dense" : ""), "aria-hidden": "true", style: { "--n": count } }, labels)
		),
		e("div", { className: "dss-tr-legend" },
			legend,
			e("span", { className: "dss-tr-legend-grp is-hint" }, t("tr.clickBar"))
		)
	);
}

function heatTip(point, t) {
	const rows = [
		[t("card.cost"), fmtCostSummary(point.cost, t)],
		[t("kpi.tokens"), fmtTokens(point.tokens)],
		[t("w.cacheHit"), point.input > 0 ? Math.round(point.cacheRead / point.input * 100) + "%" : "—"]
	];
	if (point.partial) rows.push([t("tl.partial"), fmtTokens(point.cost.unpricedTokens) + " " + t("kpi.tokens")]);
	return rows;
}

function Heatmap(props) {
	const { heat, today, metric, canOpen, onOpenDay, cellDate, setCellDate, t } = props;
	const isToken = metric === "token";
	const activeDates = heat.cells.filter(function(cell) { return cell.active; }).map(function(cell) { return cell.date; });
	// 默认停在今天；今天不活跃时停在最近的活跃日。切换指标或筛选后仍然活跃就保留。
	const fallback = activeDates.indexOf(today) >= 0 ? today : activeDates.length ? activeDates[activeDates.length - 1] : null;
	const selected = cellDate && activeDates.indexOf(cellDate) >= 0 ? cellDate : fallback;
	const cellRefs = useRef(new Map());
	const moveTo = function(date) {
		setCellDate(date);
		focusDate(cellRefs, date);
	};

	const months = heatMonths(heat.window).map(function(mark) {
		return e("span", {
			key: "m" + mark.column,
			className: "dss-tr-month" + (mark.column >= HEAT_WEEKS ? " is-end" : ""),
			style: { gridColumn: mark.column }
		}, monthLabel(mark.month, t));
	});

	const weekdayNames = t("w.weekdays").split(",");
	const dow = [1, 2, 3, 4, 5, 6, 7].map(function(row) {
		return e("span", { key: row }, row === 1 || row === 3 || row === 5 ? weekdayNames[row] : "");
	});

	const cells = heat.cells.map(function(cell) {
		const style = { gridColumn: cell.column, gridRow: cell.row };
		const classes = "dss-tr-cell" + (cell.today ? " is-today" : "");
		if (!cell.active) {
			return e("i", { key: cell.date, className: classes, "data-date": cell.date, "data-level": 0, "aria-hidden": "true", style });
		}
		const point = heat.points.get(cell.date);
		if (!point) {
			return e("i", { key: cell.date, className: classes, "data-date": cell.date, "data-level": 0, "aria-hidden": "true", style });
		}
		const openable = canOpen(cell.date);
		const label = dayLabel(cell.date, t, true);
		const amount = isToken ? fmtTokens(point.tokens) : fmtCostSummary(point.cost, t);
		return e("button", {
			key: cell.date,
			type: "button",
			className: classes,
			"data-date": cell.date,
			"data-level": cell.level,
			"data-action": "tr-heat-day",
			"aria-label": openable ? t("tr.openDay").replace("%s", label + " " + amount) : label + " " + amount,
			"aria-disabled": openable ? undefined : "true",
			tabIndex: cell.date === selected ? 0 : -1,
			style,
			ref: function(node) { if (node) cellRefs.current.set(cell.date, node); else cellRefs.current.delete(cell.date); },
			onClick: openable ? function() { onOpenDay(cell.date); } : undefined,
			onKeyDown: function(ev) {
				rovingKeyDown(ev, {
					dates: activeDates,
					date: cell.date,
					moveTo,
					onOpen: function() { if (openable) onOpenDay(cell.date); },
					vertical: true
				});
			},
			...tipProps(function() { return tipRows(label, heatTip(point, t)); })
		});
	});

	const stats = heat.stats;
	const note = t("tr.heatNote").replace("%s", t(isToken ? "tr.byToken" : "tr.byCost"));
	const currentEnd = stats.currentEnd === "today" ? t("tr.stat.today") : stats.currentEnd === "yesterday" ? t("tr.stat.yesterday") : null;

	return e("section", { className: "dss-tr-sec dss-tr-heat" },
		e("div", { className: "dss-tr-sec-head" },
			e("h3", null, t("tr.heat")),
			e("span", { className: "dss-tr-sec-note" }, note)
		),
		e("div", { className: "dss-tr-heat-body" },
			e("div", { className: "dss-tr-heat-map" },
				e("div", { className: "dss-tr-heat-months", "aria-hidden": "true" }, months),
				e("div", { className: "dss-tr-heat-dow", "aria-hidden": "true" }, dow),
				e("div", { className: "dss-tr-heat-grid", role: "group", "aria-label": t("tr.groupAria").replace("%s", t("tr.heat")).replace("%s", note) }, cells)
			),
			e("dl", { className: "dss-tr-heat-stats" },
				e("div", { className: "dss-tr-stat" },
					e("dt", null, t("tr.stat.active")),
					e("dd", null, t("tl.activeValue").replace("%d", String(stats.active)).replace("%d", String(stats.total)))
				),
				e("div", { className: "dss-tr-stat" },
					e("dt", null, t("tr.stat.current")),
					e("dd", null, t("tl.days").replace("%d", String(stats.current)),
						currentEnd ? e("span", { className: "dss-tr-stat-sub" }, currentEnd) : null)
				),
				e("div", { className: "dss-tr-stat" },
					e("dt", null, t("tr.stat.longest")),
					e("dd", null, t("tl.days").replace("%d", String(stats.longest)),
						stats.longest > 0 && stats.longestStart && stats.longestEnd
							? e("span", { className: "dss-tr-stat-sub" }, rangeText([stats.longestStart, stats.longestEnd], today, t))
							: null)
				)
			)
		),
		e("div", { className: "dss-tr-legend" },
			e("span", { className: "dss-tr-legend-grp" },
				t("trends.less"),
				[0, 1, 2, 3, 4].map(function(level) { return e("i", { key: level, className: "dss-mx-lg", "data-level": level }); }),
				t("trends.more")
			),
			e("span", { className: "dss-tr-legend-grp" }, t("tr.heatUnit")),
			e("span", { className: "dss-tr-legend-grp is-hint" }, t("tr.clickCell"))
		)
	);
}

function ModelSection(props) {
	const { models, modelColors, metric, range, totals, sort, onSort, onSortNarrow, onOpenPricing, t } = props;
	const isToken = metric === "token";
	const list = useMemo(function() { return models || []; }, [models]);
	const shares = useMemo(function() { return modelShares(list, metric); }, [list, metric]);
	const rows = useMemo(function() { return sortModels(list, sort.key, sort.dir, metric); }, [list, sort.key, sort.dir, metric]);
	const stops = useMemo(function() { return ringStops(list, shares, modelColors); }, [list, shares, modelColors]);
	const byKey = useMemo(function() {
		const map = new Map();
		list.forEach(function(row) { map.set(row.key, row); });
		return map;
	}, [list]);
	// 提前返回放在所有 hooks 之后：挂载期间 models 变成空时 hooks 数量不变。
	if (!list.length) return null;

	const total = isToken ? totals.tokens : amountOf(totals.cost);
	const center = total > 0 ? (isToken ? fmtTokens(totals.tokens) : fmtCostSummary(totals.cost, t)) : "—";
	const gradient = total > 0 && stops.length
		? "conic-gradient(" + stops.map(function(stop) {
			const color = stop.colorIndex == null ? "var(--dss-text-3)" : "var(--dss-p" + stop.colorIndex + ")";
			return color + " " + stop.from + "deg " + stop.to + "deg";
		}).join(", ") + ")"
		: "var(--dss-track)";
	const ringParts = stops.map(function(stop) {
		if (stop.colorIndex == null) return t("tr.other") + " " + fmtSharePct(stop.share * 100);
		const row = byKey.get(stop.keys[0]);
		return modelNameOnly(row) + " " + fmtSharePct(stop.share * 100);
	});
	const ringAria = t("tr.ringAria").replace("%s", t(isToken ? "tr.ringToken" : "tr.ringCost")).replace("%s", ringParts.join(t("tr.listSep")));
	const others = stops.filter(function(stop) { return stop.colorIndex == null; });
	const rangeText = t("tr.recent").replace("%d", String(range));

	const columns = [
		{ key: "name", label: t("tr.col.model"), cls: "c-model" },
		{ key: "sessions", label: t("th.sessions"), cls: "c-sessions" },
		{ key: "tokens", label: t("kpi.tokens"), cls: "c-tokens" },
		{ key: "hit", label: t("th.cacheHit"), cls: "c-hit" },
		{ key: "llm", label: t("th.llm"), cls: "c-llm" },
		{ key: "cost", label: t("th.cost"), cls: "c-cost" },
		{ key: "share", label: t("tr.col.share"), cls: "c-share", sortable: false }
	];
	const head = e("thead", null, e("tr", null, columns.map(function(column) {
		const active = column.sortable !== false && sort.key === column.key;
		return e("th", {
			key: column.key,
			scope: "col",
			className: column.cls || "",
			"aria-sort": active ? (sort.dir < 0 ? "descending" : "ascending") : undefined
		}, column.sortable === false ? column.label : e("button", {
			type: "button",
			className: "dss-sort-btn" + (active ? " on" : ""),
			"data-action": "tr-sort",
			"data-key": column.key,
			onClick: function() { onSort(column.key); }
		}, column.label, active ? e("span", { className: "dss-sort-arr", "aria-hidden": "true" }, sort.dir < 0 ? "↓" : "↑") : null));
	})));

	const body = e("tbody", null, rows.map(function(row) {
		const color = modelColors.get(row.key);
		const dotColor = Number.isInteger(color) ? color : null;
		const tokens = (row.input || 0) + (row.output || 0);
		const hit = row.input > 0 ? Math.round((row.cacheRead || 0) / row.input * 100) + "%" : "—";
		const share = shares.get(row.key) || 0;
		const providerText = row.providerId && row.providerId !== "unknown" ? row.providerId : t("tr.providerUnknown");
		const accountSuffix = row.accountType && row.accountType !== "api" ? " · " + row.accountType : "";
		const unpriced = row.costSummary && row.costSummary.unpricedTokens > 0 ? row.costSummary.unpricedTokens : 0;
		const meta = providerText + " · " + t("th.sessions") + " " + fmtN(row.sessions || 0) + " · " + fmtTokens(tokens) + " · " + t("kpi.hit") + " " + hit;
		const costText = fmtCostSummary(row.costSummary, t);
		// 完全未计价：只留 chip，不再重复写"待计价"。
		const chipOnly = unpriced > 0 && costText === t("pricing.pending");
		const dot = dotColor == null
			? e("i", { className: "dss-pdot is-other" })
			: e("i", { className: "dss-pdot", "data-color": String(dotColor) });
		return e("tr", {
			key: row.key,
			className: "dss-tr-mrow",
			"data-model-key": String(row.key).replace(/\u0000/g, "|")
		},
			e("td", { className: "c-model" },
				e("div", { className: "dss-tr-mname" }, dot, e("span", { title: row.displayName || modelDisplayName(row) }, modelNameOnly(row))),
				e("div", { className: "dss-cell-sub" }, providerText + accountSuffix)
			),
			e("td", { className: "c-meta" }, meta),
			e("td", { className: "c-sessions" }, fmtN(row.sessions || 0)),
			e("td", { className: "c-tokens" },
				fmtTokens(tokens),
				e("div", { className: "dss-cell-sub" }, t("w.input") + " " + fmtTokens(row.input || 0) + " · " + t("w.output") + " " + fmtTokens(row.output || 0))
			),
			e("td", { className: "c-hit" }, hit),
			e("td", { className: "c-llm" }, fmtDuration(row.llmMs || 0)),
			e("td", { className: "c-cost" },
				e("div", { className: "dss-cost-line" },
					unpriced > 0 ? e(PendingChip, {
						key: "pending",
						compact: true,
						label: t("tr.pendingShort"),
						focus: { provider: row.providerId, model: row.modelRaw, tokens: unpriced },
						onOpen: onOpenPricing
					}) : null,
					chipOnly ? null : e("span", { className: "dss-cost-amt" }, costText)
				)
			),
			e("td", { className: "c-share" },
				e("div", { className: "dss-share" },
					e("span", {
						className: "dss-share-bar dss-tr-share" + (dotColor == null ? " is-other" : ""),
						"data-color": dotColor == null ? undefined : String(dotColor)
					}, e("i", { style: { width: (share * 100) + "%" } })),
					e("span", { className: "dss-share-pct" }, fmtSharePct(share * 100))
				)
			)
		);
	}));

	return e("section", { className: "dss-tr-sec dss-tr-models" },
		e("div", { className: "dss-tr-sec-head" },
			e("h3", null, t("tr.models")),
			e("span", { className: "dss-tr-sec-note" },
				rangeText + " · " + t("tr.modelCount").replace("%d", String(list.length)) + " · " + t(isToken ? "tr.shareByToken" : "tr.shareByCost"))
		),
		e("div", { className: "dss-tr-models-body" },
			e("div", { className: "dss-tr-ring-wrap" },
				e("div", { className: "dss-tr-ring", role: "img", "aria-label": ringAria, style: { background: gradient } },
					e("div", { className: "dss-tr-ring-hole" },
						e("b", null, center),
						e("span", null, rangeText)
					)
				),
				others.length ? e("p", { className: "dss-tr-ring-note" },
					e("i", { className: "dss-pdot is-other" }),
					t("tr.ringOther").replace("%d", String(others[0].keys.length))
				) : null
			),
			e("div", { className: "dss-tr-mtable-wrap" },
				e("select", {
					className: "dss-sort-narrow",
					"data-action": "tr-sort-narrow",
					"aria-label": t("table.sort"),
					value: sort.key,
					onChange: function(ev) { onSortNarrow(ev.target.value); }
				}, columns.filter(function(column) { return column.sortable !== false; }).map(function(column) {
					return e("option", { key: column.key, value: column.key }, column.label);
				})),
				e("table", { className: "dss-tr-mtable" },
					e("caption", { className: "dss-sr" }, t("tr.tableLabel").replace("%s", rangeText)),
					head,
					body
				),
				e("p", { className: "dss-tr-foot" }, t("tr.llmNote"))
			)
		)
	);
}

function TrendsView(props) {
	const t = props.t;
	const today = props.today;
	const prefs = Object.assign({ range: 30, metric: "cost" }, props.prefs);
	const range = prefs.range;
	const metric = prefs.metric;
	const projects = props.projects || [];
	const rangeProjects = props.rangeProjects || [];
	const hidden = Object.assign(Object.create(null), props.hidden || {});
	const hiddenKey = props.hiddenKey || "";
	const [barDate, setBarDate] = useState(null);
	const [cellDate, setCellDate] = useState(null);
	const [sortState, setSortState] = useState(function() {
		const initial = defaultModelSort(metric);
		return { key: initial.key, dir: initial.dir };
	});
	// 指标一变就回到新指标的默认排序。渲染时调整状态，既不用 effect 补一帧，
	// 也不会把上一次停留在同一指标时选的排序又捡回来。
	const [sortMetric, setSortMetric] = useState(metric);
	if (sortMetric !== metric) {
		setSortMetric(metric);
		const next = defaultModelSort(metric);
		setSortState({ key: next.key, dir: next.dir });
	}
	const sort = sortState;
	const changeSort = function(key) {
		setSortState(function(current) {
			return { key: key, dir: current.key === key ? -current.dir : defaultSortDir(key) };
		});
	};
	const changeSortNarrow = function(key) {
		setSortState({ key: key, dir: defaultSortDir(key) });
	};

	const visibleSessions = useMemo(function() {
		const sessions = [];
		projects.forEach(function(project) {
			if (!project || hidden[project.id]) return;
			(project.sessions || []).forEach(function(session) { sessions.push(session); });
		});
		return sessions;
	}, [projects, hiddenKey]);
	const byDay = useMemo(function() { return sessionDayTokens(visibleSessions); }, [visibleSessions]);
	const dayCosts = useMemo(function() { return dayCostSummaries(projects, hidden); }, [projects, hiddenKey]);
	const points = useMemo(function() { return dayPoints(rangeDates(today, range), byDay, dayCosts); }, [today, range, byDay, dayCosts]);
	const previousPoints = useMemo(function() { return dayPoints(previousDates(today, range), byDay, dayCosts); }, [today, range, byDay, dayCosts]);
	const totals = useMemo(function() { return rangeTotals(points); }, [points]);
	const previous = useMemo(function() { return rangeTotals(previousPoints); }, [previousPoints]);
	const rangeSessions = useMemo(function() {
		const sessions = [];
		rangeProjects.forEach(function(project) {
			if (!project || hidden[project.id]) return;
			(project.sessions || []).forEach(function(session) { sessions.push(session); });
		});
		return sessions;
	}, [rangeProjects, hiddenKey]);
	const models = useMemo(function() { return modelAgg(rangeSessions); }, [rangeSessions]);
	// 颜色只按全部历史排序，不看筛选和范围：同一个模型换视图不换色。
	const allModels = useMemo(function() {
		const sessions = [];
		projects.forEach(function(project) {
			if (!project) return;
			(project.sessions || []).forEach(function(session) { sessions.push(session); });
		});
		return modelAgg(sessions);
	}, [projects]);
	const modelColors = useMemo(function() { return modelColorIndexes(allModels); }, [allModels]);
	const rangeWithToken = useMemo(function() { return rangeProjects.filter(hasTokenUsage); }, [rangeProjects]);
	const visibleRange = useMemo(function() { return rangeWithToken.filter(function(project) { return !hidden[project.id]; }); }, [rangeWithToken, hiddenKey]);
	const pending = useMemo(function() { return pendingFocus(visibleRange); }, [visibleRange]);
	const anyHistory = useMemo(function() { return projects.some(hasTokenUsage); }, [projects]);
	const canOpen = function(date) { return (props.dates || []).indexOf(date) >= 0; };

	// 热力图固定近 26 周，只跟随筛选和指标，不跟随范围。
	const heat = useMemo(function() {
		const win = heatWindow(today);
		const windowPoints = dayPoints(win.dates, byDay, dayCosts);
		const values = new Map();
		const pointsByDate = new Map();
		const activeSet = new Set();
		windowPoints.forEach(function(point) {
			values.set(point.date, { value: metricValue(point, metric), active: point.active });
			pointsByDate.set(point.date, point);
			if (point.active) activeSet.add(point.date);
		});
		return {
			window: win,
			points: pointsByDate,
			cells: heatCells(win, values, today),
			stats: streaks(activeSet, win, today)
		};
	}, [byDay, dayCosts, today, metric]);

	if (!anyHistory) return e("div", { className: "dss-tr" }, e("p", { className: "dss-empty" }, t("empty")));

	const tools = e(TrendsTools, {
		prefs, setPrefs: props.setPrefs, today, rangeProjects, hidden,
		onToggle: props.onToggle, onShowAll: props.onShowAll, colorIndexes: props.colorIndexes, t
	});

	if (rangeWithToken.length && !visibleRange.length) {
		return e("div", { className: "dss-tr" }, tools,
			e("div", { className: "dss-tr-empty", role: "status" },
				e("p", null, t("filter.allHidden")),
				e("button", { type: "button", className: "dss-tool-btn", "data-action": "tr-show-all", onClick: props.onShowAll }, t("filter.showAll"))
			)
		);
	}

	if (totals.activeDays === 0) {
		// 存在更大的、有 Token 的范围时，给一个直接切换的入口。
		const nextRange = RANGES.filter(function(n) { return n > range; }).find(function(n) {
			return rangeTotals(dayPoints(rangeDates(today, n), byDay, dayCosts)).activeDays > 0;
		});
		return e("div", { className: "dss-tr" }, tools,
			e("div", { className: "dss-tr-empty", role: "status" },
				e("p", null, t("tr.emptyRange").replace("%d", String(range))),
				nextRange ? e("button", {
					type: "button",
					className: "dss-tool-btn",
					"data-action": "tr-empty-range",
					onClick: function() { props.setPrefs({ range: nextRange }); }
				}, t("tr.viewRange").replace("%d", String(nextRange))) : null
			),
			e(Heatmap, { heat, today, metric, canOpen, onOpenDay: props.onOpenDay, cellDate, setCellDate, t })
		);
	}

	return e("div", { className: "dss-tr" },
		tools,
		e(TrendsKpis, {
			totals, previous, range, activeDays: totals.activeDays, models, metric,
			pending, onOpenPricing: props.onOpenPricing, t
		}),
		e(DailyChart, {
			points, totals, metric, today, barDate, setBarDate,
			onOpenDay: props.onOpenDay, canOpen, t
		}),
		e(Heatmap, { heat, today, metric, canOpen, onOpenDay: props.onOpenDay, cellDate, setCellDate, t }),
		// 没有模型时整节不挂载，ModelSection 的 hooks 也就不会从有到无。
		models.length ? e(ModelSection, {
			models, modelColors, metric, range, totals, sort,
			onSort: changeSort, onSortNarrow: changeSortNarrow,
			onOpenPricing: props.onOpenPricing, t
		}) : null
	);
}

module.exports = { TrendsView, TrendsTools, TrendsKpis, DailyChart, Heatmap, ModelSection };
