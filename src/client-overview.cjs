// Overview rework: tools, KPIs, strip, filter menu and the project table.
const react = require("react");
const { Popover } = require("./client-dialog.cjs");
const { costShares, cnyAmount, costDelta, pendingFocus, defaultSortDir, sortProjects } = require("./client-overview-model.cjs");
const { costIsPartial, fmtClock, fmtCostSummary, fmtDuration, fmtLatency, fmtN, fmtPct, fmtSessionCounts, fmtSharePct, fmtTokens, fmtTps, projectCostSummary, sessionCostSummary, sessionCounts } = require("./client-format.cjs");
const { localDayKey, modelNameOnly } = require("./client-data.cjs");
const { sessionActiveMs } = require("./client-timeline-model.cjs");
const { tipProps, tipRows } = require("./client-tip.cjs");
const { IconChevronDown, IconFilter, IconInfo } = require("./client-icons.cjs");

const e = react.createElement;
const { useState, useEffect, useMemo } = react;
const PROJECT_PAGE = 50;
const SESSION_PAGE = 100;
// Cache hit below this is flagged next to the project's tokens.
const LOW_HIT_PCT = 85;

function pageRows(rows, page, size) {
	rows = Array.isArray(rows) ? rows : [];
	size = Number.isSafeInteger(size) && size > 0 ? size : PROJECT_PAGE;
	var pageCount = Math.max(1, Math.ceil(rows.length / size));
	var currentPage = Math.min(Math.max(0, Math.floor(page) || 0), pageCount - 1);
	return { rows: rows.slice(currentPage * size, (currentPage + 1) * size), currentPage, pageCount, total: rows.length };
}

function PageControls({ window, onPage, t, name }) {
	if (window.pageCount <= 1) return null;
	return e("div", { className: "dss-pages", "data-pages": name },
		e("button", { type: "button", className: "dss-export", disabled: window.currentPage === 0, onClick: () => onPage(window.currentPage - 1) }, t("w.previousPage")),
		e("span", { "aria-live": "polite" }, t("w.page").replace("%d", String(window.currentPage + 1)).replace("%d", String(window.pageCount))),
		e("button", { type: "button", className: "dss-export", disabled: window.currentPage === window.pageCount - 1, onClick: () => onPage(window.currentPage + 1) }, t("w.nextPage"))
	);
}

function colorIndex(project, indexes) {
	var index = indexes && indexes.get(project.id);
	return Number.isInteger(index) ? ((index % 16) + 16) % 16 : 0;
}

function PendingChip({ focus, label, onOpen, compact }) {
	return e("button", {
		type: "button",
		className: "dss-pending-chip" + (compact ? " sm" : ""),
		"data-action": "pricing-pending",
		title: label,
		onClick: function(ev) { ev.stopPropagation(); onOpen(focus, ev.currentTarget); }
	}, label);
}

function InfoTip({ id, label, text }) {
	return e("span", { className: "dss-info-wrap" },
		e("button", { type: "button", className: "dss-info", "aria-label": label, "aria-describedby": id }, e(IconInfo, { size: 12 })),
		e("span", { className: "dss-info-tip", role: "tooltip", id }, text)
	);
}

// A cost amount whose partial "*" explains itself on hover and focus. Pass
// mark: false where a pending chip already says the same thing.
function CostText({ summary, t, mark, focusable }) {
	var text = fmtCostSummary(summary, t, { mark: false });
	if (mark === false || !costIsPartial(summary)) return text;
	var tip = t("cost.partialTip");
	return e(react.Fragment, null, text, e("span", {
		className: "dss-cost-mark",
		role: "img",
		"aria-label": tip,
		tabIndex: focusable === false ? undefined : 0,
		...tipProps(function() { return tipRows(tip, []); })
	}, "*"));
}

function formatDelta(delta, prevDate, t) {
	if (!delta) return null;
	var pct = Math.round(delta.ratio * 100 + Math.sign(delta.ratio) * 1e-9);
	if (pct === 0) return t("kpi.flat");
	return t("kpi.vs").replace("%s", String(prevDate).slice(5)) + " " + (pct > 0 ? "↑" : "↓") + Math.abs(pct) + "%";
}

function OverviewKpis(props) {
	var totals = props.totals, t = props.t;
	var input = totals.input, cache = totals.cacheRead, uncached = Math.max(0, input - cache), output = totals.output;
	var tokenTotal = input + output;
	var hitPct = input > 0 ? Math.round(cache / input * 100) : null;
	var sub = [];
	if (props.dayMode) {
		var deltaText = formatDelta(costDelta(totals.cost, props.previous), props.prevDate, t);
		if (deltaText) sub.push(e("span", { className: "dss-kpi-delta", key: "delta" }, deltaText));
	} else {
		sub.push(e("span", { key: "active" }, t("kpi.activeDays").replace("%d", String(props.activeDays))));
		var amount = cnyAmount(totals.cost);
		var perDay = amount != null && props.activeDays > 0 ? amount / props.activeDays : null;
		if (perDay != null) {
			// The card's main amount already carries the partial marker.
			var perDayText = fmtCostSummary({ ...totals.cost, totals: [{ currency: "CNY", amount: perDay }] }, t, { mark: false });
			sub.push(e("span", { key: "per-day" }, t("kpi.perDay").replace("%s", perDayText)));
		}
	}
	if (totals.cost.unpricedTokens > 0) {
		sub.push(e(PendingChip, {
			key: "pending",
			focus: props.pending,
			label: t("kpi.pending").replace("%s", fmtTokens(totals.cost.unpricedTokens)),
			onOpen: props.onPending
		}));
	}
	return e("section", { className: "dss-kpis", "aria-label": t("tab.overview") },
		e("div", { className: "dss-kpi cost" },
			e("div", { className: "dss-kpi-k" }, t("card.cost"), e(InfoTip, { id: "dss-cost-tip", label: t("kpi.costInfo"), text: t("w.estimatedHint") })),
			e("div", { className: "dss-kpi-v dss-cost" }, e(CostText, { summary: totals.cost, t: t, mark: !(totals.cost.unpricedTokens > 0) })),
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
			e("div", { className: "dss-kpi-k" }, t("card.sessions")),
			e("div", { className: "dss-kpi-v" }, fmtN(totals.main)),
			totals.subagent > 0 ? e("div", { className: "dss-kpi-s" }, e("span", null, t("kpi.subagents").replace("%d", String(totals.subagent)))) : null
		),
		e("div", { className: "dss-kpi" },
			e("div", { className: "dss-kpi-k" }, t("card.llm")),
			e("div", { className: "dss-kpi-v" }, fmtDuration(totals.llmMs)),
			e("div", { className: "dss-kpi-s" }, e("span", null, t("w.tool") + " " + fmtDuration(totals.toolMs)))
		)
	);
}

// Development time of the visible projects, the same total the timeline shows.
// Turns, first token and speed live in the project detail head.
function OverviewStrip(props) {
	var t = props.t, hidden = props.hidden || {}, total = 0;
	(props.durations || new Map()).forEach(function(ms, id) {
		if (!(Object.prototype.hasOwnProperty.call(hidden, id) && hidden[id])) total += ms;
	});
	return e("div", { className: "dss-strip" },
		e("span", null, t("w.duration") + t("strip.sep"), e("b", null, fmtDuration(total)))
	);
}

function OverviewTools(props) {
	var nav = props.nav, setNav = props.setNav, dates = props.dates || [], date = props.effectiveDate, t = props.t;
	var mode = nav.mode || "day";
	var index = date ? dates.indexOf(date) : -1;
	var names = t("w.weekdays").split(",");
	var label = date ? date + " " + t("w.dayPrefix") + names[new Date(date + "T00:00:00Z").getUTCDay()] : "—";
	var isToday = date != null && date === localDayKey(Date.now());
	var move = function(delta) {
		if (index < 0) return;
		var next = index + delta;
		if (next < 0 || next >= dates.length) return;
		setNav({ mode: "day", date: dates[next] });
	};
	return e("div", { className: "dss-tools" },
		props.showMode ? e("div", { className: "dss-seg", role: "group", "aria-label": t("nav.day") },
			e("button", { type: "button", className: mode === "day" ? "on" : "", "aria-pressed": mode === "day", "data-action": "mode-day", onClick: function() { setNav({ mode: "day", date: nav.date }); } }, t("nav.day")),
			e("button", { type: "button", className: mode === "all" ? "on" : "", "aria-pressed": mode === "all", "data-action": "mode-all", onClick: function() { setNav({ mode: "all", date: date }); } }, t("nav.all"))
		) : null,
		mode === "day" ? e("div", { className: "dss-date-nav" },
			e("button", { type: "button", className: "dss-tool-btn", "data-action": "date-prev", disabled: index <= 0, "aria-label": t("nav.previous"), title: t("nav.previous"), onClick: function() { move(-1); } }, "‹"),
			e("span", { className: "dss-date-label", "aria-live": "polite" }, label, isToday ? e("span", { className: "dss-today" }, t("nav.today")) : null),
			e("button", { type: "button", className: "dss-tool-btn", "data-action": "date-next", disabled: index < 0 || index >= dates.length - 1, "aria-label": t("nav.next"), title: t("nav.next"), onClick: function() { move(1); } }, "›")
		) : e("span", { className: "dss-range-label" }, t("nav.rangeFrom").replace("%s", dates.length ? dates[0] : "—")),
		props.showFilter ? e(ProjectFilterMenu, {
			projects: props.projects,
			hidden: props.hidden,
			onToggle: props.onToggle,
			onShowAll: props.onShowAll,
			colorIndexes: props.colorIndexes,
			filterKey: props.filterKey,
			valueOf: Object.prototype.hasOwnProperty.call(props, "valueOf") && typeof props.valueOf === "function" ? props.valueOf : undefined,
			t: t
		}) : null
	);
}

function ProjectFilterMenu(props) {
	var t = props.t;
	var [page, setPage] = useState(0);
	var [search, setSearch] = useState("");
	// 只认显式传入的 valueOf；省略时 props.valueOf 会落到 Object.prototype 上。
	var valueOf = Object.prototype.hasOwnProperty.call(props, "valueOf") && typeof props.valueOf === "function" ? props.valueOf : null;
	useEffect(function() { setPage(0); }, [props.filterKey]);
	var query = search.trim().toLowerCase();
	var filtered = (props.projects || []).filter(function(project) {
		return !query || String(project.name || "").toLowerCase().indexOf(query) >= 0 || String(project.path || "").toLowerCase().indexOf(query) >= 0;
	});
	var window = pageRows(filtered, page, PROJECT_PAGE);
	var hiddenCount = (props.projects || []).filter(function(project) { return props.hidden && props.hidden[project.id]; }).length;
	var trigger = e(react.Fragment, null,
		e(IconFilter, { size: 14 }),
		e("span", null, t("filter.title")),
		hiddenCount > 0 ? e("span", { className: "dss-filter-badge" }, t("filter.hidden").replace("%d", String(hiddenCount))) : null
	);
	return e(Popover, { label: t("filter.title"), ariaLabel: false, action: "filter", buttonClassName: "dss-tool-btn dss-filter-btn", panelClassName: "dss-filter-popover", trigger: trigger },
		e("div", { className: "dss-filter-head" },
			e("span", null, t("filter.title")),
			e("button", { type: "button", className: "dss-link-btn", "data-action": "filter-show-all", onClick: props.onShowAll }, t("filter.showAll"))
		),
		e("input", {
			type: "search",
			className: "dss-filter-search",
			"data-popover-autofocus": true,
			value: search,
			placeholder: t("filter.search"),
			"aria-label": t("filter.search"),
			onChange: function(ev) { setSearch(ev.target.value); setPage(0); }
		}),
		e("div", { className: "dss-filter-list" },
			window.rows.length ? window.rows.map(function(project) {
				var isHidden = !!(props.hidden && props.hidden[project.id]);
				return e("label", { key: project.id, className: "dss-filter-item" + (isHidden ? " off" : ""), "data-project-id": project.id },
					e("input", { type: "checkbox", checked: !isHidden, onChange: function() { props.onToggle(project.id); } }),
					e("i", { className: "dss-pdot", "data-color": String(colorIndex(project, props.colorIndexes)) }),
					e("span", { className: "dss-filter-name" }, project.name),
					valueOf
						? e("span", { className: "dss-filter-val" }, valueOf(project))
						: e("span", { className: "dss-filter-cost" }, e(CostText, { summary: projectCostSummary(project), t: t, focusable: false }))
				);
			}) : e("div", { className: "dss-empty" }, t("empty"))
		),
		e(PageControls, { window: window, onPage: setPage, t: t, name: "legend" }),
		e("p", { className: "dss-filter-note" }, t("filter.note"))
	);
}


function sessionStamp(value, dayMode) {
	var full = fmtClock(value);
	if (full === "—") return { short: "—", full: "—" };
	return { short: dayMode ? full.slice(11) : full.slice(5), full: full };
}

// Session rows show title, time, development time, tokens and cost. The other
// metrics move to the row's tooltip; the model gets a column only when the
// project used more than one.
function sessionTip(session, model, t) {
	var stats = session.stats || {};
	var lines = [
		t("sess.turnsSteps") + " " + fmtN(stats.turns || 0) + " · " + fmtN(stats.steps || 0),
		t("th.llm") + " " + fmtDuration(stats.llmMs || 0) + " · " + t("w.tool") + " " + fmtDuration(stats.toolMs || 0),
		t("kpi.hit") + " " + (stats.cacheHitPct == null ? "—" : fmtPct(stats.cacheHitPct)),
		t("w.input") + " " + fmtTokens(stats.inputTokens || 0) + " · " + t("w.output") + " " + fmtTokens(stats.outputTokens || 0)
	];
	if (model) lines.push(t("sess.model") + " " + model);
	// The row title is the only tooltip here, so it also explains the cost "*".
	if (costIsPartial(sessionCostSummary(session))) lines.push("* " + t("cost.partialTip"));
	return lines.join("\n");
}

function sessionMeta(stamp, dev, tokens, model) {
	return [stamp.short, dev, tokens].concat(model ? [model] : []).join(" · ");
}

function projectModels(project) {
	var names = new Set();
	(project.sessions || []).forEach(function(session) { names.add(modelNameOnly(session)); });
	return Array.from(names);
}

function ProjectSessions(props) {
	var project = props.project, t = props.t;
	var dayMode = !!props.dayMode;
	var all = project.sessions || [];
	var main = all.filter(function(session) { return !session.subagent; });
	var sub = all.filter(function(session) { return session.subagent; });
	var window = pageRows(main.concat(sub), props.page || 0, SESSION_PAGE);
	var multi = projectModels(project).length > 1;
	var rowClass = "dss-sess" + (multi ? " has-model" : "");
	var header = e("div", { className: rowClass + " dss-sess-h", "aria-hidden": "true" },
		e("span", null, t("th.sessions")),
		e("span", { className: "dss-sess-time" }, dayMode ? t("sess.time") : t("sess.updated")),
		e("span", { className: "dss-sess-dur" }, t("sess.duration")),
		e("span", { className: "dss-sess-token" }, t("kpi.tokens")),
		multi ? e("span", { className: "dss-sess-model" }, t("sess.model")) : null,
		e("span", { className: "dss-sess-cost" }, t("sess.cost"))
	);
	var rows = [];
	var grouped = false;
	window.rows.forEach(function(session) {
		if (session.subagent && !grouped) {
			grouped = true;
			// 分组标题显示项目内全部子对话数，不随分页变化：这是 0.5.0 起的既有行为，
			// 由 browser fixture 基线断言（scripts/browser-fixture-smoke.mjs）。
			rows.push(e("div", { className: "dss-group", key: "subgroup" }, t("w.subagentGroup") + " (" + sub.length + ")"));
		}
		var title = session.title || t("w.untitled");
		var model = modelNameOnly(session);
		var stats = session.stats || {};
		var stamp = sessionStamp(session.updatedAt, dayMode);
		var cost = fmtCostSummary(sessionCostSummary(session), t);
		var dev = fmtDuration(sessionActiveMs(session));
		var tokens = fmtTokens((stats.inputTokens || 0) + (stats.outputTokens || 0));
		var tags = [
			session.subagent ? e("span", { className: "dss-tag", key: "subagent" }, t("w.subagentTag")) : null,
			session.archived ? e("span", { className: "dss-tag", key: "archived" }, t("w.archivedTag")) : null,
			session.quality === "partial" ? e("span", { className: "dss-tag", key: "partial", title: t("w.partialHint") }, t("w.partialTag")) : session.quality === "stale" ? e("span", { className: "dss-tag", key: "stale", title: t("w.staleHint") }, t("w.staleTag")) : null
		];
		var titleNode = props.onOpenSession ? e("button", {
			type: "button",
			className: "ti dss-sess-title",
			title: t("openSession") + ": " + title,
			"aria-label": t("openSession") + ": " + title,
			onClick: function(ev) { ev.stopPropagation(); props.onOpenSession(session); }
		}, title, tags) : e("span", { className: "ti dss-sess-title", title: title }, title, tags);
		rows.push(e("div", { className: rowClass + (session.subagent ? " sub" : ""), key: session.id, "data-session-id": session.id, title: sessionTip(session, multi ? null : model, t) },
			titleNode,
			e("span", { className: "st dss-sess-time", title: stamp.full }, stamp.short),
			e("span", { className: "st dss-sess-dur" }, dev),
			e("span", { className: "st dss-sess-token" }, tokens),
			multi ? e("span", { className: "st dss-sess-model", title: model }, model) : null,
			e("span", { className: "st dss-cost dss-sess-cost", title: cost }, cost),
			e("span", { className: "dss-sess-meta" }, sessionMeta(stamp, dev, tokens, multi ? model : null))
		));
	});
	return e("div", { className: "dss-sessions" },
		e(PageControls, { window: window, onPage: props.onPage, t: t, name: "sessions" }),
		header,
		rows.length ? rows : e("div", { className: "dss-empty" }, t("empty"))
	);
}

// Project detail head: cache hit first (it left the table), the per-project
// performance metrics, and the model when every session used the same one.
function ProjectDetailMeta({ project, t }) {
	var stats = project.stats || {};
	var models = projectModels(project);
	return e("div", { className: "dss-pdetail-meta" },
		e("span", null, t("th.cacheHit") + " ", e("b", null, fmtPct(stats.cacheHitPct))),
		e("span", null, t("card.turnsSteps") + " ", e("b", null, fmtN(stats.turns || 0) + " / " + fmtN(stats.steps || 0))),
		e("span", null, t("w.tool") + " ", e("b", null, fmtDuration(stats.toolMs || 0))),
		e("span", null, t("th.ttft") + " ", e("b", null, stats.ttftAvgMs != null ? fmtLatency(stats.ttftAvgMs) : "—")),
		e("span", null, t("th.tps") + " ", e("b", null, stats.tps != null ? fmtTps(stats.tps) : "—")),
		models.length === 1 ? e("span", { className: "dss-pdetail-model" }, t("sess.model") + " ", e("b", null, models[0])) : null
	);
}

function ProjectTable(props) {
	var t = props.t, projects = props.projects || [], hiddenCount = Math.max(0, (props.totalCount || projects.length) - projects.length);
	var sortPair = useState({ key: "cost", dir: -1 });
	var sort = sortPair[0], setSort = sortPair[1];
	var projectPagePair = useState(0);
	var projectPage = projectPagePair[0], setProjectPage = projectPagePair[1];
	var expandedPair = useState(null);
	var expandedId = expandedPair[0], setExpandedId = expandedPair[1];
	var sessionPagePair = useState({ id: null, page: 0 });
	var sessionPage = sessionPagePair[0], setSessionPage = sessionPagePair[1];
	var hiddenKey = props.hiddenKey || "";
	useEffect(function() {
		setProjectPage(0);
		setExpandedId(null);
		setSessionPage({ id: null, page: 0 });
	}, [props.filterKey, hiddenKey, sort.key, sort.dir]);
	useEffect(function() {
		if (expandedId && !projects.some(function(project) { return project.id === expandedId; })) setExpandedId(null);
	}, [projects, expandedId]);
	var shares = props.shares || costShares(projects);
	var sorted = useMemo(function() {
		return sortProjects(projects, sort.key, sort.dir, { dayMode: props.dayMode, durations: props.durations });
	}, [projects, sort.key, sort.dir, props.dayMode, props.durations]);
	var window = pageRows(sorted, projectPage, PROJECT_PAGE);
	var changeSort = function(key) {
		setSort(function(current) { return current.key === key ? { key: key, dir: -current.dir } : { key: key, dir: defaultSortDir(key) }; });
		setProjectPage(0);
	};
	var toggle = function(id) {
		setExpandedId(function(current) {
			if (current === id) { setSessionPage({ id: null, page: 0 }); return null; }
			setSessionPage({ id: id, page: 0 });
			return id;
		});
	};
	var columns = [
		{ key: "name", label: t("th.project"), cls: "c-proj" },
		{ key: "sessions", label: t("th.sessions") },
		{ key: "tokens", label: t("kpi.tokens") },
		{ key: "llm", label: t("th.llm") },
		{ key: "cost", label: t("th.cost"), cls: "c-cost" },
		{ key: "last", label: props.dayMode ? t("w.duration") : t("th.lastActive"), cls: "c-last" }
	];
	var head = e("div", { className: "dss-proj-head" },
		e("h3", { id: "dss-proj-title" }, t("th.project")),
		e("span", { className: "dss-muted" }, fmtN(projects.length) + (hiddenCount > 0 ? " · " + t("table.hiddenCount").replace("%d", String(hiddenCount)) : "")),
		e("div", { className: "dss-sort-narrow" },
			e("label", { htmlFor: "dss-sort" }, t("table.sort")),
			e("select", {
				id: "dss-sort",
				value: sort.key,
				onChange: function(ev) { setSort({ key: ev.target.value, dir: defaultSortDir(ev.target.value) }); setProjectPage(0); }
			}, columns.map(function(column) { return e("option", { key: column.key, value: column.key }, column.label); })),
			e("button", { type: "button", className: "dss-tool-btn", "data-action": "sort-dir", onClick: function() { setSort(function(current) { return { key: current.key, dir: -current.dir }; }); setProjectPage(0); } }, sort.dir < 0 ? t("table.desc") + " ↓" : t("table.asc") + " ↑")
		)
	);
	if (!projects.length) {
		return e("section", { className: "dss-projects", "aria-labelledby": "dss-proj-title" }, head,
			e("div", { className: "dss-empty" },
				hiddenCount > 0 ? t("filter.allHidden") : t("empty"),
				hiddenCount > 0 ? e("button", { type: "button", className: "dss-link-btn", "data-action": "filter-show-all", onClick: props.onShowAll }, t("filter.showAll")) : null
			)
		);
	}
	var body = [];
	window.rows.forEach(function(project) {
		var isOpen = expandedId === project.id;
		var stats = project.stats || {};
		var summary = projectCostSummary(project);
		var share = shares.get(project.id);
		var lastText = props.dayMode ? fmtDuration(props.durations ? props.durations.get(project.id) || 0 : 0) : fmtClock(project.lastActiveAt);
		var totalTokens = (stats.inputTokens || 0) + (stats.outputTokens || 0);
		var pending = pendingFocus([project]);
		// Cache hit stays out of the table unless it is unusually low.
		var lowHit = stats.cacheHitPct != null && stats.cacheHitPct < LOW_HIT_PCT;
		var hitText = t("kpi.hit") + " " + Math.round(stats.cacheHitPct) + "%";
		var costText = fmtCostSummary(summary, t);
		var chipOnly = summary.unpricedTokens > 0 && costText === t("pricing.pending");
		var meta = e("span", null,
			t("th.sessions") + " " + fmtSessionCounts(sessionCounts(project.sessions)),
			" · ", t("kpi.tokens") + " " + fmtTokens(totalTokens),
			lowHit ? " · " + hitText : null,
			" · ", t("th.llm") + " " + fmtDuration(stats.llmMs),
			" · ", (props.dayMode ? t("w.duration") : t("th.lastActive")) + " " + lastText
		);
		body.push(e("tr", {
			key: project.id,
			className: "dss-prow" + (isOpen ? " open" : ""),
			"data-project-id": project.id,
			"aria-expanded": isOpen,
			onClick: function() { toggle(project.id); }
		},
			e("td", { className: "c-proj" },
				e("div", { className: "dss-proj" },
					e("button", {
						type: "button",
						className: "dss-chev",
						"data-action": "expand",
						"aria-expanded": isOpen,
						"aria-label": (isOpen ? t("table.collapse") : t("table.expand")) + " " + project.name,
						onClick: function(ev) { ev.stopPropagation(); toggle(project.id); },
						onKeyDown: function(ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); ev.stopPropagation(); toggle(project.id); } }
					}, e(IconChevronDown, { size: 14 })),
					e("i", { className: "dss-pdot", "data-color": String(colorIndex(project, props.colorIndexes)) }),
					e("span", { className: "dss-ptxt" },
						e("span", { className: "dss-pname" }, project.name),
						e("span", { className: "dss-ppath", title: project.path }, project.path)
					)
				)
			),
			e("td", null, e("span", { title: t("th.sessions") + " " + fmtSessionCounts(sessionCounts(project.sessions)) }, fmtSessionCounts(sessionCounts(project.sessions)))),
			e("td", null,
				e("span", { title: t("w.input") + " " + fmtTokens(stats.inputTokens) + " · " + t("w.output") + " " + fmtTokens(stats.outputTokens) }, fmtTokens(totalTokens)),
				lowHit ? e("span", { className: "dss-hit-flag" }, hitText) : null
			),
			e("td", null, fmtDuration(stats.llmMs)),
			e("td", { className: "c-cost" },
				e("div", { className: "dss-cost-line" },
					summary.unpricedTokens > 0 ? e(PendingChip, {
						focus: pending,
						label: t("pricing.pending") + " " + fmtTokens(summary.unpricedTokens),
						onOpen: props.onOpenPricing,
						compact: true
					}) : null,
					chipOnly ? null : e("span", { className: "dss-cost-amt" }, e(CostText, { summary: summary, t: t, mark: !(summary.unpricedTokens > 0) }))
				),
				e("div", { className: "dss-share", title: t("table.share").replace("%s", share == null ? "—" : fmtSharePct(share * 100)) },
					e("span", { className: "dss-share-bar" }, e("i", { style: { width: (share == null ? 0 : share * 100) + "%" } })),
					e("span", { className: "dss-share-pct" }, share == null ? "—" : fmtSharePct(share * 100))
				)
			),
			e("td", { className: "c-last" }, lastText),
			e("td", { className: "c-meta" }, meta)
		));
		if (isOpen) {
			body.push(e("tr", { key: project.id + "-detail", className: "dss-pdetail" },
				e("td", { colSpan: 7 },
					e(ProjectDetailMeta, { project: project, t: t }),
					e(ProjectSessions, {
						project: project,
						page: sessionPage.id === project.id ? sessionPage.page : 0,
						onPage: function(page) { setSessionPage({ id: project.id, page: page }); },
						onOpenSession: props.onOpenSession,
						dayMode: props.dayMode,
						t: t
					})
				)
			));
		}
	});
	return e("section", { className: "dss-projects", "aria-labelledby": "dss-proj-title" },
		head,
		e("table", { className: "dss-ptable" },
			e("thead", null, e("tr", null,
				columns.map(function(column) {
					var active = sort.key === column.key;
					return e("th", {
						key: column.key,
						scope: "col",
						className: column.cls || "",
						"data-sort-key": column.key,
						"aria-sort": active ? (sort.dir < 0 ? "descending" : "ascending") : undefined
					}, e("button", {
						type: "button",
						className: "dss-sort-btn" + (active ? " on" : ""),
						"data-action": "sort",
						"data-key": column.key,
						onClick: function() { changeSort(column.key); },
						onKeyDown: function(ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); ev.stopPropagation(); changeSort(column.key); } }
					}, column.label, active ? e("span", { className: "dss-sort-arr", "aria-hidden": "true" }, sort.dir < 0 ? "↓" : "↑") : null));
				}),
				e("th", { className: "c-meta", "aria-hidden": "true" })
			)),
			e("tbody", null, body)
		),
		e(PageControls, { window: window, onPage: setProjectPage, t: t, name: "projects" })
	);
}

module.exports = { OverviewTools, OverviewKpis, OverviewStrip, ProjectFilterMenu, ProjectTable, ProjectSessions, ProjectDetailMeta, pageRows, PageControls, PendingChip, InfoTip, CostText };
