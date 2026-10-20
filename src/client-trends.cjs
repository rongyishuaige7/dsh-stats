// 趋势页组件：工具栏、摘要条、每日柱图和 26 周热力图（5g、5h）。
// 过渡期仍然渲染旧的模型区；5i 删除 ModelRing/ModelList。
const react = require("react");
const { PendingChip, InfoTip, ProjectFilterMenu } = require("./client-overview.cjs");
const { MAX_VISIBLE_MODELS, fmtCostSummary, fmtDuration, fmtN, fmtSharePct, fmtTokens } = require("./client-format.cjs");
const { hasTokenUsage, modelAgg, modelDisplayName, modelNameOnly, sessionDayTokens } = require("./client-data.cjs");
const { costDelta, pendingFocus } = require("./client-overview-model.cjs");
const { dayCostSummaries } = require("./client-timeline-model.cjs");
const {
	HEAT_WEEKS, RANGES, amountOf, dayPoints, fmtAxisCost, heatCells, heatMonths, heatWindow,
	metricValue, niceMax, previousDates, rangeDates, rangeTotals, streaks, topModel, modelShares, xLabels
} = require("./client-trends-model.cjs");
const { hideTip, showTipRaw, tipProps, tipRows } = require("./client-tip.cjs");

const e = react.createElement;
const { useMemo, useRef, useState } = react;

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
function averageText(totals, activeDays, t) {
	const amount = amountOf(totals.cost);
	if (activeDays <= 0 || amount <= 0) return "—";
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
		const pct = Math.round(delta.ratio * 100);
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
			e("div", { className: "dss-kpi-v" }, averageText(totals, activeDays, t)),
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
			e("span", { key: "avg", className: "dss-tr-legend-grp" }, e("i", { className: "dss-tr-sw is-dash" }), t("tr.avgLine")),
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
							? e("span", { className: "dss-tr-stat-sub" }, t("tl.rangeValue").replace("%s", stats.longestStart.slice(5)).replace("%s", stats.longestEnd.slice(5)))
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

function TrendsView(props) {
	const t = props.t;
	const today = props.today;
	const prefs = props.prefs;
	const range = prefs.range;
	const metric = prefs.metric;
	const projects = props.projects || [];
	const rangeProjects = props.rangeProjects || [];
	const hidden = props.hidden || {};
	const hiddenKey = props.hiddenKey || "";
	const legacy = props.legacy || {};
	const [barDate, setBarDate] = useState(null);
	const [cellDate, setCellDate] = useState(null);

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

	const modelsSection = legacy.globals ? e(Section, { title: t("trends.modelDist"), hint: t("trends.modelHint") },
		e("div", { className: "dss-model-split" },
			e(ModelRing, { models: (legacy.dateGlobals || legacy.globals).models || [], t }),
			e(ModelList, { models: (legacy.dateGlobals || legacy.globals).models || [], t })
		)
	) : null;

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
		modelsSection
	);
}

// ------------------------------------------------------------------
// 以下为过渡期沿用的旧组件，行为不变；5i 删除。
// ------------------------------------------------------------------
function Section(props) {
	return e("div", { className: "dss-section" },
		e("div", { className: "dss-sec-head" },
			e("div", { className: "dss-sec-title" }, props.title),
			props.hint ? e("div", { className: "dss-sec-hint" }, props.hint) : null
		),
		props.children
	);
}

// 5i 删除：旧模型环。
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

// 5i 删除：旧模型 tooltip。
function showModelTip(model, t, ev) {
	showTipRaw(tipRows(model.displayName || modelDisplayName(model), [
		[t("th.cost"), fmtCostSummary(model.costSummary, t)],
		[t("w.input"), fmtTokens(model.input || 0)],
		[t("w.output"), fmtTokens(model.output || 0)]
	]), ev);
}

// 5i 删除：旧模型列表的滚动判断。
function modelListNeedsScroll(models) {
	return Array.isArray(models) && models.length > MAX_VISIBLE_MODELS;
}

// 5i 删除：旧模型列表。
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

// 5i 删除：旧模型配色。
var _modelColorCache = new Map();
var _modelFallbackIdx = 0;
var MODEL_COLOR_MAP = {
	"deepseek-v4-pro": "#4f8cff",
	"deepseek-v4-flash": "#74c0fc",
	"deepseek-chat": "#5c7cfa",
	"deepseek-reasoner": "#a78bfa"
};
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

module.exports = { TrendsView, TrendsTools, TrendsKpis, DailyChart, Heatmap, modelListNeedsScroll };
