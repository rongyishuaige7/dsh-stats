// 趋势页组件：工具栏、摘要条和每日柱图（5g）。
// 过渡期仍然渲染旧的热力图和模型区；5h 删除 CalendarHeatmap，5i 删除 ModelRing/ModelList。
const react = require("react");
const { PendingChip, InfoTip, ProjectFilterMenu } = require("./client-overview.cjs");
const { MAX_VISIBLE_MODELS, fmtCostSummary, fmtDuration, fmtN, fmtSharePct, fmtTokens, pad } = require("./client-format.cjs");
const { hasTokenUsage, localDayKey, modelAgg, modelDisplayName, modelNameOnly, sessionDayTokens } = require("./client-data.cjs");
const { costDelta, pendingFocus } = require("./client-overview-model.cjs");
const { dayCostSummaries } = require("./client-timeline-model.cjs");
const {
	RANGES, amountOf, dayPoints, fmtAxisCost, metricValue, niceMax, previousDates,
	rangeDates, rangeTotals, topModel, modelShares, xLabels
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
		const node = barRefs.current.get(date);
		if (node) node.focus();
	};
	const onBarKeyDown = function(ev, date) {
		const index = activeDates.indexOf(date);
		if (ev.key === "ArrowLeft") { ev.preventDefault(); ev.stopPropagation(); const next = activeDates[Math.max(0, index - 1)]; if (next) moveTo(next); }
		else if (ev.key === "ArrowRight") { ev.preventDefault(); ev.stopPropagation(); const next = activeDates[Math.min(activeDates.length - 1, index + 1)]; if (next) moveTo(next); }
		else if (ev.key === "Home") { ev.preventDefault(); ev.stopPropagation(); if (activeDates.length) moveTo(activeDates[0]); }
		else if (ev.key === "End") { ev.preventDefault(); ev.stopPropagation(); if (activeDates.length) moveTo(activeDates[activeDates.length - 1]); }
		else if (ev.key === "Enter" || ev.key === " ") {
			ev.preventDefault();
			ev.stopPropagation();
			if (canOpen(date)) onOpenDay(date);
		}
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

	const heat = legacy.globals ? e(Section, { title: t("trends.heatmap") },
		e(CalendarHeatmap, { byDay: legacy.globals.byDay || new Map(), selectedDate: legacy.selectedDate, onSelectDate: legacy.onSelectDate, t })
	) : null;
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
			heat
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
		heat,
		modelsSection
	);
}

// ------------------------------------------------------------------
// 以下为过渡期沿用的旧组件，行为不变；5h/5i 删除。
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

// 5h 删除：当月日历热力图。
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

module.exports = { TrendsView, TrendsTools, TrendsKpis, DailyChart, CalendarHeatmap, modelListNeedsScroll };
