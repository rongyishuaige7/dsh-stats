let react = require("react");
let primitives = require("@deepseek-ai/dsh-client-ui-primitives");
let { parsePricingResult, parseAggregateResult, parseBalanceResult, parseAccountResult, parseProvidersResult } = require("./rpc-client.js");
const { EMPTY_VIEW, MAX_VISIBLE_MODELS, MAX_VISIBLE_PROJECTS, SLOT_MS, costOf, fmtBalanceAmount, fmtClock, fmtCost, fmtCostSummary, fmtDuration, fmtN, fmtSessionCounts, fmtSharePct, fmtTokens, fmtTps, identityForUsage, pad, projectCostSummary, sessionCost, sessionCostSummary, sessionCounts, sessionExportUsages, usageCost, usageCostDetail } = require("./client-format.cjs");
const { activityDates, addBucket, aggregate, applyDate, applyRange, buildGlobals, buildTimeline, createOpenStore, display, emptyBucket, enrichSessionProjection, fmtDateCN, hasTokenUsage, loadPref, localDayKey, modelAgg, modelDisplayName, modelNameOnly, monthlyFromDays, projectionIdentityOf, projectionSlotUsageOf, savePref, sessionDayTokens, streakAndActive, weeklyFromDays } = require("./client-data.cjs");
const { NS, STATS_REMOTE_CONTRIBUTION, inject, openStatsSession, readAccountRemote, subagentAddressFor } = require("./client-remote.cjs");
const { LayerContext, createLayerStack, escapeAction, trapTab, useDialogFocus } = require("./client-dialog.cjs");
const { StatusIndicator, StatusBanner, ExportMenu, PricingDrawer } = require("./client-header.cjs");
const { IconRefresh, IconGear } = require("./client-icons.cjs");
const { overviewTotals, previousActiveDate, cnyAmount, costDelta, costShares, projectDaySpans, activeDayCount, sortProjects, defaultSortDir, pendingFocus, compareProjectCost, missingModels, createSingleFlight } = require("./client-overview-model.cjs");
const { OverviewTools, OverviewKpis, OverviewStrip, ProjectTable, pageRows } = require("./client-overview.cjs");
const { TIMELINE_PREF_DEFAULTS, normalizeTimelinePrefs, projectDurations } = require("./client-timeline-model.cjs");
const { TimelineView } = require("./client-timeline.cjs");
const { tipRows, showTipRaw, hideTip } = require("./client-tip.cjs");

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
	var stale = account?.stale || state.kind === "stale";
	var visualStatus = stale ? "stale" : account?.status;
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
				stale ? e("div", { className: "dss-balance-stale" }, t("balance.staleHint")) : null,
				account.lastSuccessAt != null ? e("div", { className: "dss-quota-reset" }, t("balance.lastSuccess") + " " + fmtClock(account.lastSuccessAt)) : null,
				account.actionUrl ? e("a", { className: "dss-balance-topup", href: account.actionUrl, target: "_blank", rel: "noreferrer" }, account.mode === "balance" ? t("balance.topUp") : t("balance.manage")) : null
			)
		)
	);
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
	// 旧版本曾保存 7/30/90 模式；这些模式已从界面移除，统一回退到按日。
	var navMode = storedNav.mode === "all" ? "all" : "day";
	var nav = { mode: navMode, date: storedNav.date || null };
	var [sourceState, setSourceState] = useState({ kind: aggregateRemote ? "loading" : "fallback", error: remoteMountError || null, at: null });
	var [refreshTick, setRefreshTick] = useState(0);
	var [balanceData, setBalanceData] = useState(null);
	var [balanceState, setBalanceState] = useState({ kind: balanceRemote ? "loading" : "unavailable", error: null });
	var [balanceRefreshRequest, setBalanceRefreshRequest] = useState({ tick: 0, force: false });
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
			var first = result.accounts && result.accounts[0];
			var warning = result.warnings && result.warnings.length ? result.warnings[0].message : null;
			setBalanceState({ kind: first?.status || "error", error: warning });
		}).catch(function(error) {
			if (cancelled) return;
			setBalanceState({ kind: balanceData ? "stale" : "error", error: error?.message || String(error) });
		});
		return function() { cancelled = true; };
	}, [balanceActive, balanceRemote, balanceRefreshRequest.tick]);

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

	if (!open || !open.open) return null;

	var toggle = (id) => setHidden((h) => ({ ...(h && typeof h === "object" && !Array.isArray(h) ? h : {}), [id]: !(h && h[id]) }));
	var showAll = function() { setHidden({}); };
	var isRefreshing = tab === "balance"
		? balanceState.kind === "loading" || balanceState.kind === "refreshing"
		: sourceState.kind === "loading" || sourceState.kind === "refreshing";
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
						tab !== "balance" ? e(StatusIndicator, { state: sourceState, remote: data.remote, t }) : null,
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
								projects: dateProjects,
								t,
								onExportCSV: function() { exportCSV(dateProjects, t); },
								onExportJSON: function() { exportJSON(dateProjects); }
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
				tab !== "balance" ? e(StatusBanner, { state: sourceState, remote: data.remote, t, onRetry: refreshCurrent }) : null,
				e("div", {
					className: "dss-body",
					id: "dss-tabpanel",
					role: "tabpanel",
					"aria-labelledby": "dss-tab-" + tab
				},
					tab === "balance" ? e(BalanceView, { data: balanceData, state: balanceState, remote: balanceRemote, t }) : e(Fragment, null,
						e(OverviewTools, {
							nav, setNav, dates, effectiveDate, t,
							showMode: tab !== "trends",
							showFilter: tab !== "trends",
							projects: tab === "timeline" ? dateProjects : statProjects,
							valueOf: tab === "timeline" ? timelineValueOf : undefined,
							hidden, onToggle: toggle, onShowAll: showAll,
							colorIndexes, filterKey: effectiveDate
						}),
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
							globals,
							dateGlobals,
							selectedDate: effectiveDate,
							onSelectDate: function(date) { setNav({ mode: "day", date: date }); },
							t
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
				e("div", { className: "dss-hero-v dss-cost", title: props.t("w.estimatedHint") }, fmtCostSummary(dg.totalCost, props.t))
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
		[t("th.cost"), fmtCostSummary(model.costSummary, t)],
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
		inject: () => ({ hooks: { statsOpen: openStore }, onClose: () => openStore.close(), onOpenSession, aggregate: aggregateRemote, balance: balanceRemote, pricing: pricingRemote, remoteError })
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
	sessionCostSummary, projectCostSummary, compareProjectCost, fmtCostSummary, modelNameOnly, modelDisplayName, providerPickerLabel, modelListNeedsScroll, projectCsvTable, csvField, sessionExportUsages,
	subagentAddressFor, openStatsSession, CalendarHeatmap, projectColorIndexes, projectColorIndex, pageRows, escapeAction
};
