let react = require("react");
let primitives = require("@deepseek-ai/dsh-client-ui-primitives");
let { parsePricingResult, parseAggregateResult, parseBalanceResult, parseAccountResult, parseProvidersResult } = require("./rpc-client.js");
const { EMPTY_VIEW, MAX_VISIBLE_PROJECTS, SLOT_MS, costOf, fmtClock, fmtCost, fmtCostSummary, fmtDuration, fmtN, fmtSessionCounts, fmtSharePct, fmtTokens, fmtTps, identityForUsage, projectCostSummary, sessionCost, sessionCostSummary, sessionCounts, sessionExportUsages, usageCost, usageCostDetail } = require("./client-format.cjs");
const { activityDates, addBucket, aggregate, applyDate, applyRange, buildGlobals, buildTimeline, createOpenStore, display, emptyBucket, enrichSessionProjection, fmtDateCN, hasTokenUsage, loadPref, localDayKey, modelAgg, modelDisplayName, modelNameOnly, monthlyFromDays, projectionIdentityOf, projectionSlotUsageOf, savePref, sessionDayTokens, streakAndActive, weeklyFromDays } = require("./client-data.cjs");
const { NS, STATS_REMOTE_CONTRIBUTION, inject, openStatsSession, readAccountRemote, readProvidersRemote, subagentAddressFor } = require("./client-remote.cjs");
const { LayerContext, createLayerStack, escapeAction, trapTab, useDialogFocus } = require("./client-dialog.cjs");
const { StatusIndicator, StatusBanner, ExportMenu, PricingDrawer } = require("./client-header.cjs");
const { BalanceView } = require("./client-balance.cjs");
const { balanceHeaderState, normalizeBalanceAlerts } = require("./client-balance-model.cjs");
const { IconRefresh, IconGear } = require("./client-icons.cjs");
const { overviewTotals, previousActiveDate, cnyAmount, costDelta, costShares, projectDaySpans, activeDayCount, sortProjects, defaultSortDir, pendingFocus, compareProjectCost, missingModels, createSingleFlight } = require("./client-overview-model.cjs");
const { OverviewTools, OverviewKpis, OverviewStrip, ProjectTable, pageRows } = require("./client-overview.cjs");
const { TIMELINE_PREF_DEFAULTS, normalizeTimelinePrefs, projectDurations } = require("./client-timeline-model.cjs");
const { TRENDS_PREF_DEFAULTS, normalizeTrendsPrefs } = require("./client-trends-model.cjs");
const { TimelineView } = require("./client-timeline.cjs");
const { TrendsView, modelListNeedsScroll } = require("./client-trends.cjs");
const { hideTip } = require("./client-tip.cjs");

var e = react.createElement;
var useState = react.useState;
var useMemo = react.useMemo;
var useEffect = react.useEffect;
var useRef = react.useRef;
var useCallback = react.useCallback;
var Fragment = react.Fragment;
var TAB_NAMES = ["overview", "timeline", "trends", "balance"];
// Harness 0.1.7 primitives dropped the size-suffixed icons; Regular takes the same size prop.
var IconDataOutline16 = primitives.IconDataOutline16 || primitives.IconDataOutlineRegular;
var IconCloseOutline16 = primitives.IconCloseOutline16 || primitives.IconCloseOutlineRegular;
function usePref(key, def) {
	var pair = useState(() => loadPref(key, def));
	var val = pair[0], setVal = pair[1];
	useEffect(() => { savePref(key, val); }, [key, val]);
	return [val, setVal];
}

// ------------------------------------------------------------------
// CSS
// ------------------------------------------------------------------
const CSS_ID = "@rongyi7/dsh-stats/styles.css";
const { css } = require("./client-styles.cjs");

// ------------------------------------------------------------------
// 组件
// ------------------------------------------------------------------
function StatsTrigger(props) {
	var wide = props.wide;
	var t = props.t;
	var onOpen = props.onOpen;
	var useStatsOpen = props.useStatsOpen || function() { return null; };
	var open = useStatsOpen((o) => o);
	return e("button", {
		type: "button",
		className: "dss-trigger " + (wide ? "wide" : "rail"),
		onClick: () => onOpen(),
		title: t("trigger"),
		"aria-label": t("trigger"),
		"aria-haspopup": "dialog",
		"aria-expanded": !!(open && open.open)
	},
		e(IconDataOutline16, { size: 16 }),
		wide ? e("span", { className: "dss-trigger-label" }, t("trigger")) : null
	);
}

function projectColorIndexes(projects) {
	var indexes = new Map();
	// Match the host timeline: color slots follow project id order so an
	// activity-order change cannot recolor unrelated projects.
	(projects || []).slice().sort(function(a, b) { return String(a.id).localeCompare(String(b.id)); }).forEach(function(project, index) { indexes.set(project.id, index % 16); });
	return indexes;
}

function projectColorIndex(project, indexes, fallbackIndex) {
	var index = indexes && indexes.get(project.id);
	var value = Number.isInteger(index) ? index : Number.isInteger(fallbackIndex) ? fallbackIndex : 0;
	return ((value % 16) + 16) % 16;
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
	if (typeof value === "string" && (/^\s*[=+@-]/.test(text) || /^[\t\r\n]/.test(text))) text = "'" + text;
	return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
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
			stats.inputTokens, stats.outputTokens, stats.cacheHitPct == null ? "" : stats.cacheHitPct, fmtCostSummary(summary, t)
		];
		if (!project.sessions || !project.sessions.length) {
			rows.push(projectFields.concat(new Array(19).fill(""), summary.status, "", "", summary.unpricedTokens || 0, "", "", ""));
			return;
		}
		project.sessions.forEach(function (session) {
			sessionExportUsages(session).forEach(function (usage) {
				var identity = identityForUsage(usage, session.modelRaw || session.model, session.providerId, session.accountType);
				var cost = usageCostDetail(usage, session.modelRaw || session.model, session.providerId, session.accountType);
				rows.push(projectFields.concat([
					session.id, session.title, session.updatedAt == null ? "" : new Date(session.updatedAt).toISOString(), session.quality || "",
					Number.isFinite(usage.slot) ? new Date(usage.slot * SLOT_MS).toISOString() : "",
					identity.providerId, identity.providerFamily, identity.modelRaw, usage.modelCanonical || cost.modelCanonical || identity.modelCanonical, identity.accountType,
					usage.serviceTier || "standard", Number.isFinite(usage.contextTokens) ? usage.contextTokens : "",
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

function StatsPanel(props) {
	var open = props.useStatsOpen((o) => o);
	var isOpen = !!(open && open.open);
	var panelRef = useRef(null);
	var layerStackRef = useRef(null);
	if (!layerStackRef.current) layerStackRef.current = createLayerStack();
	var layerStack = layerStackRef.current;
	var [remoteData, setRemoteData] = useState(null);
	var remoteDataRef = useRef(remoteData);
	remoteDataRef.current = remoteData;
	var aggregateFlightRef = useRef(null);
	if (!aggregateFlightRef.current) aggregateFlightRef.current = createSingleFlight();
	// Browser snapshots are only inputs to the local fallback. Once host data
	// arrives, streaming session events must not wake the entire statistics UI.
	var needsFallback = isOpen && !remoteData;
	var sessionsSnap = props.useSessions((s) => needsFallback ? s : null);
	var workspacesSnap = props.useWorkspaces((w) => needsFallback ? w : null);
	var onClose = props.onClose;
	var onOpenSession = props.onOpenSession;
	var t = props.t;
	var aggregateRemote = props.aggregate;
	var gearRef = useRef(null);
	var drawerRef = useRef(null);
	var drawerOpenerRef = useRef(null);
	var pendingNonceRef = useRef(0);
	var [drawer, setDrawer] = useState({ open: false, focusModel: null });
	var balanceRemote = props.balance;
	var providersRemote = props.providers;
	var remoteMountError = props.remoteError;
	var tabPair = usePref("tab", "overview");
	var tabValue = tabPair[0];
	var tab = TAB_NAMES.indexOf(tabValue) >= 0 ? tabValue : "overview";
	var setTab = tabPair[1];
	var [focusedTab, setFocusedTab] = useState(tab);
	var hiddenPair = usePref("hidden", {});
	var hiddenValue = hiddenPair[0];
	var hidden = hiddenValue && typeof hiddenValue === "object" && !Array.isArray(hiddenValue) ? hiddenValue : {};
	var setHidden = hiddenPair[1];
	var navPair = usePref("nav", { mode: "day", date: null });
	var storedNav = navPair[0] && typeof navPair[0] === "object" && !Array.isArray(navPair[0]) ? navPair[0] : {};
	var setNav = navPair[1];
	var timelinePair = usePref("timeline", TIMELINE_PREF_DEFAULTS);
	var timelinePrefs = normalizeTimelinePrefs(timelinePair[0]);
	var setTimelinePrefs = useCallback(function(patch) {
		timelinePair[1](function(current) {
			return normalizeTimelinePrefs(Object.assign({}, normalizeTimelinePrefs(current), patch));
		});
	}, [timelinePair[1]]);
	var alertsPair = usePref("balanceAlerts", {});
	var balanceAlerts = normalizeBalanceAlerts(alertsPair[0]);
	var setBalanceAlert = useCallback(function(id, value) {
		alertsPair[1](function(current) {
			var next = Object.assign({}, normalizeBalanceAlerts(current));
			if (value) next[id] = value; else delete next[id];
			return next;
		});
	}, [alertsPair[1]]);
	// 旧版本曾保存 7/30/90 模式；这些模式已从界面移除，统一回退到按日。
	var navMode = storedNav.mode === "all" ? "all" : "day";
	var nav = { mode: navMode, date: storedNav.date || null };
	var [sourceState, setSourceState] = useState({ kind: aggregateRemote ? "loading" : "fallback", error: remoteMountError || null, at: null });
	var [refreshTick, setRefreshTick] = useState(0);
	var [balanceData, setBalanceData] = useState(null);
	var [balanceState, setBalanceState] = useState({ kind: balanceRemote ? "loading" : "unavailable", error: null });
	var [balanceRefreshRequest, setBalanceRefreshRequest] = useState({ tick: 0, force: false });
	var [balanceProviders, setBalanceProviders] = useState(null);
	var providersAskedRef = useRef(false);
	var markDismiss = useDialogFocus(panelRef, isOpen);
	var dismiss = useCallback(function() { markDismiss(); onClose("dismiss"); }, [markDismiss, onClose]);
	var closeDrawer = useCallback(function() { setDrawer({ open: false, focusModel: null }); }, []);
	var openDrawer = function(focusModel, opener) {
		drawerOpenerRef.current = opener || gearRef.current;
		setDrawer({ open: true, focusModel: focusModel || null });
	};
	var openPricing = function(focus, opener) {
		if (!focus) { openDrawer(null, opener || gearRef.current); return; }
		pendingNonceRef.current += 1;
		openDrawer({ provider: focus.provider, model: focus.model, nonce: pendingNonceRef.current }, opener || gearRef.current);
	};
	useEffect(function() { if (isOpen) setFocusedTab(tab); }, [isOpen, tab]);
	useEffect(function() {
		if (isOpen) return;
		drawerOpenerRef.current = null;
		setDrawer(function(current) {
			return current.open || current.focusModel ? { open: false, focusModel: null } : current;
		});
	}, [isOpen]);

	var requestAggregate = useCallback(function() {
		if (!aggregateRemote) {
			setSourceState({ kind: "fallback", error: remoteMountError || null, at: null });
			return null;
		}
		return aggregateFlightRef.current(function() {
			setSourceState(function(prev) { return { kind: remoteDataRef.current ? "refreshing" : "loading", error: null, at: prev.at }; });
			return aggregateRemote().then((r) => {
				setRemoteData(r);
				setSourceState({ kind: r.meta?.degraded ? "partial" : "exact", error: r.meta?.warnings?.filter(function(w) { return !/^OFFICIAL_.*_USED$/.test(w.code) && w.code !== "OFFICIAL_LEGACY_DESCRIPTOR" && w.code !== "SESSION_CACHE_STALE" && w.code !== "SESSION_ORPHAN_FORK_DISCARDED"; }).map(function(w) { return w.message; }).join("; ") || null, at: r.meta?.generatedAt ?? Date.now() });
			}).catch((err) => {
				console.warn("[dsh-stats] aggregate 调用失败:", err);
				setSourceState({ kind: remoteDataRef.current ? "stale" : "fallback", error: err?.message || String(err), at: remoteDataRef.current?.meta?.generatedAt || null });
			});
		});
	}, [aggregateRemote, remoteMountError]);

	useEffect(() => {
		if (!open || !open.open) return;
		if (!aggregateRemote) { setSourceState({ kind: "fallback", error: remoteMountError || null, at: null }); return; }
		requestAggregate();
	}, [open, aggregateRemote, remoteMountError, requestAggregate]);

	// A manual refresh or pricing change advances refreshTick; the single-flight
	// guard coalesces it with an already running aggregate instead of cancelling
	// the pending result.
	useEffect(() => {
		if (!open || !open.open || !refreshTick) return;
		requestAggregate();
	}, [refreshTick, open, requestAggregate]);

	// 面板打开期间每 60 秒自动刷新一次
	useEffect(() => {
		if (!open || !open.open || !aggregateRemote) return;
		var id = setInterval(() => {
			requestAggregate();
			setBalanceRefreshRequest((request) => ({ tick: request.tick + 1, force: false }));
		}, 60000);
		return () => clearInterval(id);
	}, [open, aggregateRemote, requestAggregate]);

	// Balance is a live snapshot shown only on its tab; other tabs do not query providers.
	var balanceActive = isOpen && tab === "balance";
	useEffect(() => {
		if (!balanceActive) return;
		if (!balanceRemote) { setBalanceState({ kind: "unavailable", error: null }); return; }
		var cancelled = false;
		var force = balanceRefreshRequest.force;
		// A manual refresh bypasses the host cache once; re-entering the tab uses it again.
		if (force) setBalanceRefreshRequest(function(request) { return { tick: request.tick, force: false }; });
		setBalanceState(function(prev) { return { kind: balanceData ? "refreshing" : "loading", error: null }; });
		balanceRemote(force).then(function(result) {
			if (cancelled) return;
			setBalanceData(result);
			setBalanceState({ kind: "exact", error: null });
		}).catch(function(error) {
			if (cancelled) return;
			setBalanceState({ kind: balanceData ? "stale" : "error", error: error?.message || String(error) });
		});
		return function() { cancelled = true; };
	}, [balanceActive, balanceRemote, balanceRefreshRequest.tick]);

	// The first-load skeleton asks the host for its configured providers once per
	// mount. It is decoration only: account data stays authoritative.
	useEffect(function() {
		if (!balanceActive || !providersRemote || balanceData || providersAskedRef.current) return;
		providersAskedRef.current = true;
		providersRemote().then(function(result) {
			if (result && Array.isArray(result.providers)) setBalanceProviders(result.providers);
		}).catch(function() {});
	}, [balanceActive, providersRemote, balanceData]);

	// Host data does not depend on browser session snapshots; keep it stable across session events.
	var remoteView = useMemo(() => {
		if (!remoteData || !remoteData.projects) return null;
		var projects = remoteData.projects.map((p) => ({
			...p, stats: display(p.stats),
			sessions: (p.sessions || []).map((s) => ({ ...s, subagent: s.subagent === true, stats: display(s.stats) }))
		}));
		return { projects, timeline: remoteData.timeline || { days: [] }, remote: true, meta: remoteData.meta };
	}, [remoteData]);
	// Client aggregation runs only while the panel is open and host data is absent.
	var fallbackView = useMemo(() => {
		if (remoteView || !isOpen) return null;
		var summaries = sessionsSnap && sessionsSnap.byId ? Object.values(sessionsSnap.byId) : [];
		var archivedIds = workspacesSnap?.archivedSessionIds || workspacesSnap?.global?.archivedSessionIds || [];
		var projects = aggregate(summaries, workspacesSnap && workspacesSnap.items, t, archivedIds);
		return { projects, timeline: buildTimeline(projects, 30), remote: false };
	}, [remoteView, isOpen, sessionsSnap, workspacesSnap]);
	var data = remoteView || fallbackView || EMPTY_VIEW;

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

	// 全局聚合：全量（热力图 / 7 天趋势 / 连续天数指标卡始终用全量）
	var globals = useMemo(() => buildGlobals(data.projects), [data.projects]);

	// 按日时，项目卡片与趋势只统计有 token 消耗的项目；时间线仍使用完整活动项目。
	var statProjects = useMemo(() => effectiveDate ? dateProjects.filter(hasTokenUsage) : dateProjects, [effectiveDate, dateProjects]);

	// 按日聚合：hero 总览 / 模型分布随选中日期变化（全部模式复用 globals，避免重复计算）
	var dateGlobals = useMemo(() => (effectiveDate ? buildGlobals(statProjects) : globals), [effectiveDate, statProjects, globals]);

	// 这些 memo 必须放在早退之前，保证面板关闭时 hooks 数量不变。
	var hiddenKey = Object.keys(hidden && typeof hidden === "object" ? hidden : {}).filter(function(id) { return hidden[id]; }).sort().join("\u0000");
	var visibleProjects = useMemo(function() { return statProjects.filter(function(project) { return !hidden[project.id]; }); }, [statProjects, hiddenKey]);
	var activityOnly = !!effectiveDate && statProjects.length === 0 && dateProjects.length > 0;
	var prevDate = previousActiveDate(dates, effectiveDate);
	var previousSummary = useMemo(function() {
		if (!prevDate) return null;
		var previousProjects = applyDate(data.projects, prevDate).filter(function(project) { return hasTokenUsage(project) && !hidden[project.id]; });
		return overviewTotals(previousProjects).cost;
	}, [data.projects, prevDate, hiddenKey]);
	var spans = useMemo(function() {
		if (!effectiveDate) return null;
		var day = (data.timeline.days || []).find(function(item) { return item.date === effectiveDate; });
		return day ? projectDaySpans(day) : new Map();
	}, [data.timeline, effectiveDate]);
	var activeDays = useMemo(function() { return activeDayCount(data.timeline, hidden); }, [data.timeline, hiddenKey]);
	var totals = useMemo(function() { return overviewTotals(visibleProjects); }, [visibleProjects]);
	var timelineDurations = useMemo(function() {
		if (tab !== "timeline") return null;
		if (effectiveDate) {
			var day = (data.timeline.days || []).find(function(item) { return item.date === effectiveDate; });
			return projectDurations(day ? [day] : []);
		}
		return projectDurations(data.timeline.days || []);
	}, [tab, effectiveDate, data.timeline]);
	var timelineValueOf = function(project) {
		return fmtDuration(timelineDurations ? timelineDurations.get(project.id) || 0 : 0);
	};
	var shares = useMemo(function() { return costShares(visibleProjects); }, [visibleProjects]);
	var pending = useMemo(function() { return pendingFocus(visibleProjects); }, [visibleProjects]);

	// 趋势页偏好与范围（§7.3 第 2 条）。这些 hooks 必须在早退之前，
	// 保证面板关闭时 hooks 数量不变。
	var trendsPair = usePref("trends", TRENDS_PREF_DEFAULTS);
	var trendsPrefs = normalizeTrendsPrefs(trendsPair[0]);
	var setTrendsPrefs = useCallback(function(patch) {
		trendsPair[1](function(current) {
			return normalizeTrendsPrefs(Object.assign({}, normalizeTrendsPrefs(current), patch));
		});
	}, [trendsPair[1]]);
	var todayKey = localDayKey(Date.now());
	var trendsRangeProjects = useMemo(function() {
		return tab === "trends" ? applyRange(data.projects, todayKey, trendsPrefs.range) : null;
	}, [tab, data.projects, todayKey, trendsPrefs.range]);
	var pendingTabFocusRef = useRef(null);
	// U6：跳到总览后把焦点交给总览标签，避免焦点掉到 body。
	useEffect(function() {
		if (pendingTabFocusRef.current !== tab) return;
		pendingTabFocusRef.current = null;
		var node = document.getElementById("dss-tab-" + tab);
		if (node && typeof node.focus === "function") node.focus();
	}, [tab]);
	var openDay = function(date) {
		if (!date || dates.indexOf(date) < 0) return;
		hideTip();
		setNav({ mode: "day", date: date });
		setTab("overview");
		setFocusedTab("overview");
		pendingTabFocusRef.current = "overview";
	};

	if (!open || !open.open) return null;

	var toggle = (id) => setHidden((h) => ({ ...(h && typeof h === "object" && !Array.isArray(h) ? h : {}), [id]: !(h && h[id]) }));
	var showAll = function() { setHidden({}); };
	var exportProjects = tab === "trends" ? (trendsRangeProjects || []) : dateProjects;
	var isRefreshing = tab === "balance"
		? balanceState.kind === "loading" || balanceState.kind === "refreshing"
		: sourceState.kind === "loading" || sourceState.kind === "refreshing";
	var balanceHeader = balanceHeaderState(balanceState, balanceData, !!balanceRemote);
	var refreshCurrent = function() {
		if (tab === "balance") setBalanceRefreshRequest((request) => ({ tick: request.tick + 1, force: true }));
		else setRefreshTick((x) => x + 1);
	};

	var onPanelKeyDown = function(ev) {
		if (ev.key === "Tab") {
			trapTab(ev, drawer.open && drawerRef.current ? drawerRef.current : panelRef.current);
			return;
		}
		var action = escapeAction(ev, layerStack.size);
		if (action === "ignore") return;
		ev.preventDefault();
		ev.stopPropagation();
		if (action === "pop") layerStack.pop();
		else dismiss();
	};
	var onTabListKeyDown = function(ev) {
		var index = TAB_NAMES.indexOf(focusedTab);
		if (index < 0) index = TAB_NAMES.indexOf(tab);
		var next;
		if (ev.key === "ArrowRight") next = (index + 1) % TAB_NAMES.length;
		else if (ev.key === "ArrowLeft") next = (index - 1 + TAB_NAMES.length) % TAB_NAMES.length;
		else if (ev.key === "Home") next = 0;
		else if (ev.key === "End") next = TAB_NAMES.length - 1;
		else return;
		ev.preventDefault();
		ev.stopPropagation();
		var name = TAB_NAMES[next];
		setFocusedTab(name);
		var node = document.getElementById("dss-tab-" + name);
		if (node) node.focus();
	};
	var activateTab = function(name) {
		setTab(name);
		setFocusedTab(name);
	};

	return e(LayerContext.Provider, { value: layerStack },
		e("div", { className: "dss-overlay", onClick: (ev) => { if (ev.target === ev.currentTarget) dismiss(); } },
			e("div", {
				className: "dss-panel",
				ref: panelRef,
				role: "dialog",
				"aria-modal": "true",
				"aria-labelledby": "dss-title",
				tabIndex: -1,
				onKeyDown: onPanelKeyDown
			},
				e("div", { className: "dss-head" },
					e("h2", { id: "dss-title" }, t("title")),
					e("div", {
						className: "dss-tabs",
						role: "tablist",
						"aria-label": t("title"),
						onKeyDown: onTabListKeyDown
					},
						TAB_NAMES.map(function(name) {
							var selected = tab === name;
							return e("button", {
								key: name,
								type: "button",
								role: "tab",
								id: "dss-tab-" + name,
								"aria-selected": selected,
								"aria-controls": "dss-tabpanel",
								tabIndex: focusedTab === name ? 0 : -1,
								className: selected ? "on" : "",
								onClick: function(ev) {
									activateTab(name);
									if (ev && ev.currentTarget && typeof ev.currentTarget.focus === "function") ev.currentTarget.focus();
								},
								onKeyDown: function(ev) {
									if (ev.key !== "Enter" && ev.key !== " ") return;
									ev.preventDefault();
									ev.stopPropagation();
									activateTab(name);
									if (ev.currentTarget && typeof ev.currentTarget.focus === "function") ev.currentTarget.focus();
								}
							}, t("tab." + name));
						})
					),
					e("div", { className: "dss-head-actions" },
						tab === "balance"
							? e(StatusIndicator, { state: balanceHeader, remote: !!balanceRemote, source: t("balance.source"), t })
							: e(StatusIndicator, { state: sourceState, remote: data.remote, t }),
						e("div", { className: "dss-act-group" },
							e("button", {
								type: "button",
								className: "dss-icon-btn",
								"data-action": "refresh",
								"aria-label": t("refresh"),
								title: t("refresh"),
								disabled: isRefreshing,
								onClick: refreshCurrent
							}, e(IconRefresh, { size: 16 })),
							tab !== "balance" ? e(ExportMenu, {
								projects: exportProjects,
								t,
								onExportCSV: function() { exportCSV(exportProjects, t); },
								onExportJSON: function() { exportJSON(exportProjects); }
							}) : null,
							e("button", {
								type: "button",
								className: "dss-icon-btn",
								ref: gearRef,
								"data-action": "pricing",
								"aria-label": t("price.title"),
								title: t("price.title"),
								"aria-haspopup": "dialog",
								"aria-expanded": drawer.open,
								onClick: function() { openDrawer(null, gearRef.current); }
							}, e(IconGear, { size: 16 }))
						),
						e("button", {
							type: "button",
							className: "dss-close",
							"data-action": "close",
							onClick: dismiss,
							title: t("close"),
							"aria-label": t("close")
						}, e(IconCloseOutline16, { size: 16 }))
					)
				),
				tab === "balance"
					? e(StatusBanner, { state: balanceHeader, remote: !!balanceRemote, t, onRetry: refreshCurrent })
					: e(StatusBanner, { state: sourceState, remote: data.remote, t, onRetry: refreshCurrent }),
				e("div", {
					className: "dss-body",
					id: "dss-tabpanel",
					role: "tabpanel",
					"aria-labelledby": "dss-tab-" + tab
				},
					tab === "balance" ? e(BalanceView, {
						data: balanceData,
						state: balanceState,
						remote: !!balanceRemote,
						providers: balanceProviders,
						alerts: balanceAlerts,
						onAlertChange: setBalanceAlert,
						onRetry: refreshCurrent,
						t
					}) : e(Fragment, null,
						tab !== "trends" ? e(OverviewTools, {
							nav, setNav, dates, effectiveDate, t,
							showMode: true,
							showFilter: true,
							projects: tab === "timeline" ? dateProjects : statProjects,
							valueOf: tab === "timeline" ? timelineValueOf : undefined,
							hidden, onToggle: toggle, onShowAll: showAll,
							colorIndexes, filterKey: effectiveDate
						}) : null,
						tab === "overview" ? e(Fragment, null,
							visibleProjects.length ? e(OverviewKpis, {
								totals,
								previous: previousSummary,
								prevDate,
								activeDays,
								dayMode: effectiveDate != null,
								pending,
								onPending: openPricing,
								t
							}) : null,
							visibleProjects.length ? e(OverviewStrip, { totals, activeDays, spans, projects: visibleProjects, dayMode: effectiveDate != null, t }) : null,
							activityOnly ? e("div", { className: "dss-activity-only", role: "status" },
								e("span", null, t("overview.activityOnly")),
								e("button", {
									type: "button",
									className: "dss-link-btn",
									"data-action": "overview-timeline",
									onClick: function() { setTab("timeline"); }
								}, t("overview.viewTimeline"))
							) : e(ProjectTable, {
								projects: visibleProjects,
								totalCount: statProjects.length,
								hiddenKey,
								shares,
								colorIndexes,
								dayMode: effectiveDate != null,
								spans,
								filterKey: effectiveDate,
								onOpenSession,
								onOpenPricing: openPricing,
								onShowAll: showAll,
								t
							})
						) : tab === "timeline" ? e(TimelineView, {
							timeline: data.timeline,
							date: effectiveDate,
							projects: dateProjects,
							allProjects: data.projects,
							hidden,
							hiddenKey,
							colorIndexes,
							dayCost: totals.cost,
							dayTokens: totals.input + totals.output,
							prefs: timelinePrefs,
							setPrefs: setTimelinePrefs,
							onSelectDate: function(date) { setNav({ mode: "day", date: date }); },
							onOpenSession,
							onShowAll: showAll,
							remote: data.remote,
							t
						})
						: e(TrendsView, {
							projects: data.projects,
							rangeProjects: trendsRangeProjects || [],
							hidden,
							hiddenKey,
							dates,
							today: todayKey,
							prefs: trendsPrefs,
							setPrefs: setTrendsPrefs,
							colorIndexes,
							onToggle: toggle,
							onShowAll: showAll,
							onOpenDay: openDay,
							onOpenPricing: openPricing,
							t,
							legacy: {
								globals,
								dateGlobals
							}
						})
					)
				),
				e(PricingDrawer, {
					open: drawer.open,
					focusModel: drawer.focusModel,
					opener: drawerOpenerRef.current,
					gear: gearRef.current,
					rootRef: drawerRef,
					onClose: closeDrawer,
					remote: props.pricing,
					projects: data.projects,
					t,
					onChanged: function() { setRefreshTick(x => x + 1); }
				})
			)
		)
	);
}

const { zh, en } = require("./client-locale.cjs");

async function apply(ctx) {
	var ownedStyle = null;
	if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(CSS_ID) + "]") === null) {
		var tag = document.createElement("style");
		tag.dataset.plugin = "@rongyi7/dsh-stats";
		tag.dataset.pluginCss = CSS_ID;
		tag.textContent = css;
		document.head.appendChild(tag);
		ownedStyle = tag;
	}
	ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-stats: dictionaries");
	const openStore = createOpenStore();
	let workspaceNavigation = null;
	// Do not await: older hosts have no uiWorkspace. Cordis owns this optional
	// child lifetime and reloads it if the navigation service is replaced.
	ctx.inject(["uiWorkspace"], (childCtx) => {
		const navigation = childCtx.uiWorkspace;
		workspaceNavigation = navigation;
		return () => { if (workspaceNavigation === navigation) workspaceNavigation = null; };
	});
	const onOpenSession = async (session) => {
		try {
			await openStatsSession(ctx.sessions, session, workspaceNavigation);
			openStore.close();
		} catch (error) {
			console.warn("[dsh-stats] 无法打开会话 " + (session?.id || "(unknown)") + ":", error);
		}
	};

	let aggregateRemote = null;
	let balanceRemote = null;
	let providersRemote = null;
	let pricingRemote = null;
	let remoteError = null;
	let disposeRemote = () => {};
	try {
		disposeRemote = await ctx.remote.$mount(STATS_REMOTE_CONTRIBUTION);
		// 不能直接 ctx.remote.stats 访问（本 fiber 未注入 remote.stats 会报 without inject，
		// 而注入它又会死锁：提供者正是本次 $mount）。用注入 remote.stats 的子 ctx 访问。
		await ctx.inject(["remote", "remote.stats"], function statsConsumer(childCtx) {
			aggregateRemote = async () => {
				const answered = await childCtx.remote.stats.aggregate();
				if (!answered.ok) throw answered.error || new Error("stats/aggregate failed");
				return parseAggregateResult(answered.value);
			};
			balanceRemote = (force) => readAccountRemote(childCtx.remote.stats, force);
			providersRemote = () => readProvidersRemote(childCtx.remote.stats);
			pricingRemote = async (request) => { const result = await childCtx.remote.stats.pricing(request); if (!result.ok) throw result.error || new Error("Price settings unavailable"); return parsePricingResult(result.value); };
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
		inject: () => ({ onOpen: () => openStore.open(), hooks: { statsOpen: openStore } })
	}, StatsTrigger));
	ctx.slots.inject("shell.overlay", () => ctx.slots.register({
		name: "shell.overlay",
		id: "stats-panel",
		locale: NS,
		inject: () => ({ hooks: { statsOpen: openStore }, onClose: () => openStore.close(), onOpenSession, aggregate: aggregateRemote, balance: balanceRemote, providers: providersRemote, pricing: pricingRemote, remoteError })
	}, StatsPanel));

	return () => {
		if (typeof disposeRemote === "function") disposeRemote();
		if (ownedStyle && ownedStyle.isConnected) ownedStyle.remove();
		var tooltip = typeof document !== "undefined" ? document.getElementById("dss-tooltip") : null;
		if (tooltip) tooltip.remove();
	};
}

module.exports = { apply, inject };
// 测试钩子：暴露纯函数供 vitest 直接验证真实实现（生产运行不读取）
module.exports.__test = {
	StatusIndicator, StatusBanner, BalanceView, readAccountRemote, STATS_REMOTE_CONTRIBUTION, IconDataOutline16, IconCloseOutline16,
	overviewTotals, previousActiveDate, cnyAmount, costDelta, costShares, projectDaySpans, activeDayCount, sortProjects, defaultSortDir, pendingFocus, missingModels,
	localDayKey, emptyBucket, addBucket, sessionDayTokens,
	monthlyFromDays, weeklyFromDays, modelAgg, streakAndActive,
	costOf, usageCost, sessionCost, identityForUsage, fmtN, fmtTokens, fmtCost, fmtDuration, fmtTps, fmtSharePct,
	applyDate, applyRange, activityDates, fmtDateCN, buildTimeline, aggregate, projectionIdentityOf, projectionSlotUsageOf, enrichSessionProjection, parseAggregateResult, parseBalanceResult, parseAccountResult, parseProvidersResult, hasTokenUsage,
	sessionCostSummary, projectCostSummary, compareProjectCost, fmtCostSummary, modelNameOnly, modelDisplayName, modelListNeedsScroll, projectCsvTable, csvField, sessionExportUsages,
	subagentAddressFor, openStatsSession, projectColorIndexes, projectColorIndex, pageRows, escapeAction
};
