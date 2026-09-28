let react = require("react");
let primitives = require("@deepseek-ai/dsh-client-ui-primitives");
let pricing = require("./pricing.cjs");
let { PricingPanel } = require("./pricing-panel.cjs");
let { parsePricingResult, parseAggregateResult, parseBalanceResult, parseAccountResult, parseProvidersResult } = require("./rpc-client.js");
const { EMPTY_VIEW, MAX_VISIBLE_MODELS, MAX_VISIBLE_PROJECTS, MAX_VISIBLE_TIMELINE_DAYS, SLOT_MS, addCounts, costOf, esc, fmtBalanceAmount, fmtClock, fmtCost, fmtCostSummary, fmtDuration, fmtN, fmtPct, fmtSessionCounts, fmtSharePct, fmtTokens, fmtTps, identityForUsage, mergeCostSummaries, pad, projectCostSummary, sessionCost, sessionCostSummary, sessionCounts, sessionExportUsages, usageCost, usageCostDetail } = require("./client-format.cjs");
const { activityDates, addBucket, aggregate, applyDate, applyRange, buildGlobals, buildTimeline, createOpenStore, display, emptyBucket, enrichSessionProjection, fmtDateCN, hasTokenUsage, loadPref, localDayKey, modelAgg, modelDisplayName, modelNameOnly, monthlyFromDays, projectionIdentityOf, projectionSlotUsageOf, savePref, sessionDayTokens, streakAndActive, weeklyFromDays } = require("./client-data.cjs");
const { NS, STATS_REMOTE_CONTRIBUTION, inject, openStatsSession, readAccountRemote, subagentAddressFor } = require("./client-remote.cjs");

var e = react.createElement;
var useState = react.useState;
var useMemo = react.useMemo;
var useEffect = react.useEffect;
var Fragment = react.Fragment;
// Harness 0.1.7 primitives dropped the size-suffixed icons; Regular takes the same size prop.
var IconDataOutline16 = primitives.IconDataOutline16 || primitives.IconDataOutlineRegular;
var IconCloseOutline16 = primitives.IconCloseOutline16 || primitives.IconCloseOutlineRegular;
function CostValue({ summary, t }) {
	var [expanded, setExpanded] = useState(false);
	var hint = summary?.status === "partial" ? t("pricing.partial") : summary?.status === "unsupported" ? t("pricing.pending") : t("hint.cost");
	return e("span", null, e("span", { role: "button", tabIndex: 0, title: hint, "aria-label": fmtCostSummary(summary, t) + ": " + hint, "aria-expanded": expanded,
		onClick: function(ev) { ev.stopPropagation(); setExpanded(!expanded); },
		onKeyDown: function(ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); ev.stopPropagation(); setExpanded(!expanded); } }
	}, fmtCostSummary(summary, t)), expanded ? e("small", { style: { display: "block", fontSize: "12px", fontWeight: "normal" } }, hint) : null);
}
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
	return e("button", {
		type: "button",
		className: "dss-trigger " + (wide ? "wide" : "rail"),
		onClick: () => onOpen(),
		title: t("trigger"),
		"aria-label": t("trigger"),
		"aria-haspopup": "dialog"
	},
		e(IconDataOutline16, { size: 16 }),
		wide ? e("span", { className: "dss-trigger-label" }, t("trigger")) : null
	);
}

function SummaryCards(props) {
	var projects = props.projects;
	var t = props.t;
	var tot = { turns: 0, steps: 0, llmMs: 0, toolMs: 0, input: 0, output: 0, cacheRead: 0 };
	var totC = { main: 0, subagent: 0 };
	projects.forEach(function(p) {
		addCounts(totC, sessionCounts(p.sessions));
		tot.turns += p.stats.turns; tot.steps += p.stats.steps;
		tot.llmMs += p.stats.llmMs; tot.toolMs += p.stats.toolMs;
		tot.input += p.stats.inputTokens; tot.output += p.stats.outputTokens; tot.cacheRead += p.stats.cacheRead;
	});
	var cost = mergeCostSummaries(projects.map(projectCostSummary));
	var cards = [
		[t("card.projects"), fmtN(projects.length)],
		[t("card.sessions"), fmtSessionCounts(totC)],
		[t("card.turnsSteps"), `${fmtN(tot.turns)} / ${fmtN(tot.steps)}`],
		[t("card.llm"), fmtDuration(tot.llmMs)],
		[t("card.tool"), fmtDuration(tot.toolMs)],
		[t("card.input"), fmtTokens(tot.input)],
		[t("card.output"), fmtTokens(tot.output)],
		[t("card.cacheHit"), tot.input > 0 ? fmtPct(Math.round(tot.cacheRead / tot.input * 100)) : "—"],
		[t("card.cost"), e(CostValue, { summary: cost, t })]
	];
	return e("div", { className: "dss-cards" },
		cards.map((c, i) => e("div", { className: "dss-card", key: i },
			e("div", { className: "k" }, c[0]),
			e("div", { className: "v", ...c[0] === t("card.cost") ? { className: "v dss-cost" } : {} }, c[1])
		))
	);
}

function projectColorIndexes(projects) {
	var indexes = new Map();
	(projects || []).forEach(function(project, index) { indexes.set(project.id, index % 16); });
	return indexes;
}

function projectColorIndex(project, indexes, fallbackIndex) {
	var index = indexes && indexes.get(project.id);
	var value = Number.isInteger(index) ? index : Number.isInteger(fallbackIndex) ? fallbackIndex : 0;
	return ((value % 16) + 16) % 16;
}

function Legend(props) {
	var projects = props.projects;
	var hidden = props.hidden;
	var onToggle = props.onToggle;
	return e("div", { className: "dss-legend" },
		projects.map(function(p, i) {
			return e("span", {
				key: p.id, className: "dss-chip" + (hidden[p.id] ? " off" : ""),
				"data-color": String(projectColorIndex(p, props.colorIndexes, i)), onClick: () => onToggle(p.id)
			},
				e("span", { className: "sw" }), p.name
			);
		})
	);
}

function sortValue(p, key) {
	switch (key) {
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

function projectCostSortData(project) {
	var totals = projectCostSummary(project).totals || [];
	var ordered = totals.slice().sort(function(a, b) { return a.currency.localeCompare(b.currency); });
	return { signature: ordered.map(function(total) { return total.currency; }).join("|") , amounts: ordered.map(function(total) { return total.amount; }) };
}

// 消费汇总已统一为 CNY，排序直接比较同一币种的金额向量。
function compareProjectCost(a, b) {
	var ca = projectCostSortData(a), cb = projectCostSortData(b);
	if (ca.signature !== cb.signature) return ca.signature.localeCompare(cb.signature);
	for (var i = 0; i < Math.max(ca.amounts.length, cb.amounts.length); i++) {
		var va = ca.amounts[i] ?? -1, vb = cb.amounts[i] ?? -1;
		if (va !== vb) return va > vb ? 1 : -1;
	}
	return 0;
}

function ProjectsTable(props) {
	var projects = props.projects;
	var hidden = props.hidden;
	var selected = props.selected;
	var onSelect = props.onSelect;
	var onOpenSession = props.onOpenSession;
	var t = props.t;
	var dayMode = props.dayMode === true; // 按日模式：隐藏"最近活跃"（项目级元数据与单日切片语义冲突）
	var sortPair = useState({ key: "cost", dir: -1 });
	var sort = sortPair[0], setSort = sortPair[1];

	var fallbackColorIndexes = projectColorIndexes(projects);
	var effSortKey = (dayMode && sort.key === "lastActive") ? "cost" : sort.key;
	var sorted = projects.filter((p) => !hidden[p.id]);
	sorted.sort((a, b) => {
		if (effSortKey === "cost") return compareProjectCost(a, b) * sort.dir;
		var va = sortValue(a, effSortKey), vb = sortValue(b, effSortKey);
		return (va > vb ? 1 : (va < vb ? -1 : 0)) * sort.dir;
	});

	var SORT_FIELDS = [
		{ key: "cost", label: t("th.cost") },
		{ key: "sessions", label: t("card.sessions") },
		{ key: "input", label: t("w.input") },
		{ key: "output", label: t("w.output") },
		{ key: "turns", label: t("w.turns") },
		{ key: "steps", label: t("w.steps") },
		{ key: "tool", label: t("w.tool") },
		{ key: "hit", label: t("w.cacheHit") }
	];
	if (!dayMode) SORT_FIELDS.push({ key: "lastActive", label: t("th.lastActive") });

	var toolbar = e("div", { className: "dss-sortbar" },
		e("span", { className: "dss-sortbar-label" }, t("sort.label")),
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
			title: t("sort.toggle")
		}, sort.dir > 0 ? t("sort.asc") + " ↑" : t("sort.desc") + " ↓")
	);

	var cards = sorted.map(function(p) {
		var i = projectColorIndex(p, props.colorIndexes, fallbackColorIndexes.get(p.id));
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
					var modelName = modelNameOnly(sd);
					var sessionTitle = sd.title || t("w.untitled");
					var costDetail = sessionCostSummary(sd);
					var sessionCost = e(CostValue, { summary: costDetail, t });
					var titleContent = [sessionTitle, sd.subagent ? e("span", { className: "dss-tag", key: "subagent" }, t("w.subagentTag")) : null, sd.archived ? e("span", { className: "dss-tag", key: "archived" }, t("w.archivedTag")) : null, sd.quality === "partial" ? e("span", { className: "dss-tag", key: "partial", title: t("w.partialHint") }, t("w.partialTag")) : sd.quality === "stale" ? e("span", { className: "dss-tag", key: "stale", title: t("w.staleHint") }, t("w.staleTag")) : null,];
				return e("div", { className: "dss-sess", key: sd.id },
					onOpenSession ? e("button", {
						type: "button",
						className: "ti dss-sess-title",
						title: t("openSession") + ": " + sessionTitle,
						"aria-label": t("openSession") + ": " + sessionTitle,
						onClick: function(ev) { ev.stopPropagation(); onOpenSession(sd); }
					}, titleContent) : e("span", { className: "ti", title: sessionTitle }, titleContent),
					e("span", { className: "me" }, fmtClock(sd.updatedAt)),
					e("span", { className: "st" }, fmtN(sd.stats.turns) + " " + t("w.turns") + " · " + fmtN(sd.stats.steps) + " " + t("w.steps")),
					e("span", { className: "st" }, "LLM " + fmtDuration(sd.stats.llmMs)),
					e("span", { className: "st" }, t("w.tool") + " " + fmtDuration(sd.stats.toolMs)),
					e("span", { className: "st" }, t("w.cacheHit") + " " + fmtPct(sd.stats.cacheHitPct)),
					e("span", { className: "st" }, t("w.input") + " " + fmtTokens(sd.stats.inputTokens) + " · " + t("w.output") + " " + fmtTokens(sd.stats.outputTokens)),
					e("span", { className: "st dss-sess-model", title: modelName }, modelName),
					e("span", { className: "st dss-cost dss-sess-cost", title: sessionCost }, sessionCost)
				);
			};
			var detailChildren = mainSessions.map(sessRow);
			if (subSessions.length) {
				detailChildren = detailChildren.concat([e("div", { className: "dss-group", key: "subgroup" }, t("w.subagentGroup") + " (" + subSessions.length + ")")]);
				detailChildren = detailChildren.concat(subSessions.map(sessRow));
			}
			detail = e("div", { className: "dss-pcard-detail" }, detailChildren);
		}

		var toggleProject = function() { onSelect(p.id); };
		return e("div", { key: p.id, className: "dss-pcard" + (isSel ? " sel" : ""), "data-color": String(i % 16) },
			e("div", {
				className: "dss-pcard-head",
				role: "button",
				tabIndex: 0,
				"aria-expanded": isSel,
				onClick: toggleProject,
				onKeyDown: function(ev) {
					if (ev.key !== "Enter" && ev.key !== " ") return;
					ev.preventDefault();
					toggleProject();
				}
			},
				e("div", { className: "dss-proj" },
					e("span", { className: "dot" }),
					e("span", { className: "dss-proj-txt" },
						e("div", { className: "nm" }, p.name),
						e("div", { className: "ph" }, p.path)
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
					pm(e(CostValue, { summary: projectCostSummary(p), t }), t("th.cost"), "cost"),
					dayMode ? null : pm(fmtClock(p.lastActiveAt), t("th.lastActive"))
				)
			),
			detail
		);
	});

	return e("div", { className: "dss-pcards-wrap" },
		toolbar,
		e("div", { className: "dss-pcards-viewport" + (cards.length > MAX_VISIBLE_PROJECTS ? " scrollable" : "") },
			e("div", { className: "dss-pcards" }, cards)
		)
	);
}

// 槽索引（0-47，每槽 30 分钟）→ HH:MM
function slotToClock(s) {
	var m = s * 30;
	return pad(Math.floor(m / 60)) + ":" + pad(m % 60);
}

function groupTimelineBlocks(day, hidden) {
	var projects = new Map();
	var slots = Array.from({ length: 48 }, function() { return []; });
	(day && day.slotBlocks || []).forEach(function(b) {
		if (hidden && hidden[b.projectId]) return;
		if (b.slot < 0 || b.slot >= slots.length) return;
		var project = projects.get(b.projectId);
		if (!project) {
			project = { projectId: b.projectId, name: b.name, colorIndex: b.colorIndex, slots: new Map() };
			projects.set(b.projectId, project);
		}
		project.slots.set(b.slot, (project.slots.get(b.slot) || 0) + Math.max(0, b.ms || 0));
	});
	projects.forEach(function(project) {
		project.slots.forEach(function(ms, slot) {
			slots[slot].push({ projectId: project.projectId, name: project.name, colorIndex: project.colorIndex, ms: ms });
		});
	});
	return { projects: Array.from(projects.values()), slots: slots };
}

function timelineLayout(dayCount, dayMode) {
	// 保留单日默认值供旧调用方使用；全部模式即使只有一天也走紧凑布局。
	var isDayMode = dayMode == null ? dayCount <= 1 : dayMode;
	if (isDayMode) {
		var dayMaxBlockH = 200;
		var dayMaxProjects = 6;
		var dayProjectListH = dayMaxProjects * 15 + Math.max(0, dayMaxProjects - 1) * 9 + 20;
		return {
			maxBlockH: dayMaxBlockH,
			maxProjects: dayMaxProjects,
			laneHeight: 72,
			laneGap: 6,
			laneViewportH: 306,
			rowMinH: Math.max(dayMaxBlockH + 14, dayProjectListH)
		};
	}
	var maxBlockH = dayCount <= 7 ? 112 : 56;
	var maxProjects = dayCount <= 7 ? 5 : 4;
	// 日期行自身、列表首个间距与字体行高需要额外空间，确保三日视口不裁掉第三行。
	var projectListH = maxProjects * 15 + Math.max(0, maxProjects - 1) * 9 + 51 + (dayCount > 1 ? 22 : 0);
	return { maxBlockH: maxBlockH, maxProjects: maxProjects, rowMinH: Math.max(maxBlockH + 14, projectListH) };
}

function timelineDisplayDays(days, dayMode) {
	var ordered = Array.isArray(days) ? days.slice() : [];
	if (!dayMode) ordered.sort(function(a, b) { return String(b.date).localeCompare(String(a.date)); });
	return ordered;
}

function timelineTipRows(blocks) {
	return blocks.map(function(b) { return [b.name, fmtDuration(b.ms)]; });
}

function showTimelineBlocksTip(date, slot, blocks, ev) {
	showTipRaw(tipRows(date + " " + slotToClock(slot) + "–" + slotToClock(slot + 1), timelineTipRows(blocks)), ev);
}

function TimelineView(props) {
	var timeline = props.timeline;
	var hidden = props.hidden;
	var slotMinutes = 30;
	var slotMs = slotMinutes * 60000;
	var tt = props.tt;
	var dayMode = props.dayMode === true;

	var days = timeline.days || [];
	var displayDays = timelineDisplayDays(days, dayMode);
	var maxDay = days.reduce((m, d) => Math.max(m, d.dayTotalMs), 1);
	// 按日使用项目泳道；全部模式保持一天一行，避免长周期高度失控。
	var layout = timelineLayout(days.length, dayMode);
	var maxBlockH = layout.maxBlockH;
	var maxProjects = layout.maxProjects;
	var rowMinH = layout.rowMinH;

	return e("div", null,
		e("div", { className: "dss-hint" }, tt(dayMode ? "hint.timeline.day" : "hint.timeline.all")),
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
			e("div", {
				className: "dss-timeline-viewport" + (!dayMode && displayDays.length > MAX_VISIBLE_TIMELINE_DAYS ? " scrollable" : ""),
				style: !dayMode && displayDays.length > MAX_VISIBLE_TIMELINE_DAYS ? { "--dss-timeline-max-height": rowMinH * MAX_VISIBLE_TIMELINE_DAYS + "px" } : null
			}, displayDays.map((d) => {
				var grouped = groupTimelineBlocks(d, hidden);
				var projList = grouped.projects;
				var minSlot = 47, maxSlot = -1;
				grouped.slots.forEach(function(blocks, slot) {
					if (!blocks.length) return;
					minSlot = Math.min(minSlot, slot);
					maxSlot = Math.max(maxSlot, slot);
				});
				var wd = tt("w.weekdays").split(",")[new Date(d.date + "T00:00:00Z").getUTCDay()];
				// 右侧信息列：总时长 + 活动时段 + 项目数，填充右侧空白
				var spanText = maxSlot >= 0 ? slotToClock(minSlot) + "–" + slotToClock(maxSlot + 1) : "—";
				// 总时长按可见项目重算（隐藏的项目不计入）
				var visibleMs = grouped.slots.reduce(function(sum, blocks) {
					return sum + blocks.reduce(function(slotSum, b) { return slotSum + b.ms; }, 0);
				}, 0);
				var dayLaneContentH = projList.length ? projList.length * layout.laneHeight + Math.max(0, projList.length - 1) * layout.laneGap + 16 : 56;
				var dayRowMinH = dayMode ? Math.max(56, Math.min(rowMinH, dayLaneContentH)) : rowMinH;
				var rightCol = e("div", { className: "dss-day-info" },
					e("div", { className: "dur" }, fmtDuration(visibleMs)),
					e("div", { className: "span" }, spanText),
					e("div", { className: "cnt" }, projList.length + " " + tt("w.projects"))
				);

				if (dayMode) {
					var lanes = projList.map(function(project) {
						var laneCells = Array.from({ length: 48 }, function(_, slot) {
							var ms = project.slots.get(slot) || 0;
							var block = ms > 0 ? { projectId: project.projectId, name: project.name, colorIndex: project.colorIndex, ms: ms } : null;
							var h = ms > 0 ? Math.min(layout.laneHeight, Math.max(2, Math.round((ms / slotMs) * layout.laneHeight))) : 0;
							return e("div", { className: "dss-day-lane-cell", key: slot }, block ? e("div", {
								className: "dss-blk",
								"data-color": String((project.colorIndex || 0) % 16),
								style: { height: h + "px" },
								onMouseEnter: function(ev) { showTimelineBlocksTip(d.date, slot, [block], ev); },
								onMouseLeave: hideTip
							}) : null);
						});
						return e("div", { className: "dss-day-lane", key: project.projectId },
							e("div", { className: "dss-day-lane-label" },
								e("span", { className: "dss-day-dot", "data-color": String((project.colorIndex || 0) % 16) }),
								e("span", { className: "dss-day-pname", title: project.name }, project.name)
							),
							e("div", { className: "dss-day-lane-track" }, laneCells)
						);
					});
					return e("div", { className: "dss-day day-mode", id: "dss-day-" + d.date, key: d.date, style: { minHeight: dayRowMinH + "px" } },
						e("div", { className: "dss-day-lanes", style: { maxHeight: layout.laneViewportH + "px" } }, lanes),
						rightCol
					);
				}

				var leftCol = e("div", { className: "dss-day-projs" },
					e("div", { className: "dss-day-date" }, d.date + " " + tt("w.dayPrefix") + wd),
					projList.slice(0, maxProjects).map(function(project) {
						return e("div", { className: "dss-day-proj", key: project.projectId },
							e("span", { className: "dss-day-dot", "data-color": String((project.colorIndex || 0) % 16) }),
							e("span", { className: "dss-day-pname", title: project.name }, project.name)
						);
					}),
					projList.length > maxProjects ? e("div", { className: "dss-day-more" }, "+" + (projList.length - maxProjects) + " " + tt("w.projects")) : null
				);
				var cells = grouped.slots.map(function(blocks, slot) {
					if (!blocks.length) return e("div", { className: "dss-cell", key: slot });
					var maxMs = blocks.reduce(function(max, b) { return Math.max(max, b.ms); }, 0);
					var h = Math.min(maxBlockH, Math.max(2, Math.round((maxMs / slotMs) * maxBlockH)));
					return e("div", { className: "dss-cell", key: slot },
						e("div", {
							className: "dss-blk-composite",
							style: { height: h + "px" },
							onMouseEnter: function(ev) { showTimelineBlocksTip(d.date, slot, blocks, ev); },
							onMouseLeave: hideTip
						}, blocks.map(function(block, i) {
							return e("i", { key: block.projectId + "-" + i, className: "dss-blk-segment", "data-color": String((block.colorIndex || 0) % 16), style: { flexGrow: Math.max(1, block.ms) } });
						}))
					);
				});
				return e("div", { className: "dss-day", id: "dss-day-" + d.date, key: d.date, style: { minHeight: rowMinH + "px" } },
					leftCol,
					e("div", { className: "dss-track" }, cells),
					rightCol
				);
			}))
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
			e("button", { className: mode === "day" ? "on" : "", onClick: () => setMode("day") }, t("nav.day")),
			e("button", { className: mode === "all" ? "on" : "", onClick: () => setMode("all") }, t("nav.all"))
		),
		mode === "day" ? e(Fragment, null,
			e("button", { className: "dss-nav-btn", onClick: () => move(-1), disabled: idx <= 0, title: t("nav.previous") }, "‹"),
			e("span", { className: "dss-nav-date" }, effectiveDate ? effectiveDate + " " + t("w.dayPrefix") + t("w.weekdays").split(",")[new Date(effectiveDate + "T00:00:00Z").getUTCDay()] : "—"),
			e("button", { className: "dss-nav-btn", onClick: () => move(1), disabled: idx < 0 || idx >= dates.length - 1, title: t("nav.next") }, "›")
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

function exportAccountJSON(data) {
	download("dsh-accounts.json", JSON.stringify(data || { generatedAt: Date.now(), accounts: [], warnings: [] }, null, 2), "application/json");
}
function exportAccountCSV(data) {
	var lines = [["providerId", "providerFamily", "mode", "status", "stale", "currency", "remaining", "used", "total", "toppedUp", "granted", "plan", "window", "usedPercent", "remainingPercent", "resetsAt", "fetchedAt", "errorCode"].join(",")];
	(data?.accounts || []).forEach(function(account) {
		var windows = account.windows && account.windows.length ? account.windows : [null];
		windows.forEach(function(window) {
			lines.push([
				account.id, account.providerFamily, account.mode, account.status, account.stale,
				account.balance?.currency, account.balance?.remaining, account.balance?.used, account.balance?.total,
				account.balance?.toppedUp, account.balance?.granted, account.plan, window?.kind,
				window?.usedPercent, window?.remainingPercent, window?.resetsAt, account.fetchedAt, account.errorCode
			].map(csvField).join(","));
		});
	});
	download("dsh-accounts.csv", "\uFEFF" + lines.join("\n"), "text/csv;charset=utf-8");
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

function StatsDataStatus({ state, remote, projects, t }) {
	const cost = pricing.mergeCostSummariesCny((projects || []).map(projectCostSummary));
	return e("section", { className: "dss-data-status " + state.kind, "aria-live": "polite" },
		e("div", { className: "dss-data-status-line" },
			e("span", null, t(remote ? "source.host" : "source.local")),
			e("strong", null, t("source." + state.kind)),
			state.at != null ? e("span", null, t("source.updated") + " " + fmtClock(state.at)) : null
		),
		state.error ? e("details", { className: "dss-data-diagnostics" }, e("summary", null, t("source.details")), e("div", null, state.error)) : null
	);
}

function StatsPanel(props) {
	var open = props.useStatsOpen((o) => o);
	var isOpen = !!(open && open.open);
	var sessionsSnap = props.useSessions((s) => s);
	var workspacesSnap = props.useWorkspaces((w) => w);
	var onClose = props.onClose;
	var onOpenSession = props.onOpenSession;
	var t = props.t;
	var aggregateRemote = props.aggregate;
	var [showPrices, setShowPrices] = useState(false);
	var balanceRemote = props.balance;
	var remoteMountError = props.remoteError;
	var tabPair = usePref("tab", "overview"); var tab = tabPair[0], setTab = tabPair[1];
	var hiddenPair = usePref("hidden", {}); var hidden = hiddenPair[0], setHidden = hiddenPair[1];
	var navPair = usePref("nav", { mode: "day", date: null });
	var storedNav = navPair[0] || {};
	var setNav = navPair[1];
	// 旧版本曾保存 7/30/90 模式；这些模式已从界面移除，统一回退到按日。
	var navMode = storedNav.mode === "all" ? "all" : "day";
	var nav = { mode: navMode, date: storedNav.date || null };
	var [selected, setSelected] = useState(null);
	var [remoteData, setRemoteData] = useState(null);
	var [sourceState, setSourceState] = useState({ kind: aggregateRemote ? "loading" : "fallback", error: remoteMountError || null, at: null });
	var [refreshTick, setRefreshTick] = useState(0);
	var [balanceData, setBalanceData] = useState(null);
	var [balanceState, setBalanceState] = useState({ kind: balanceRemote ? "loading" : "unavailable", error: null });
	var [balanceRefreshRequest, setBalanceRefreshRequest] = useState({ tick: 0, force: false });

	useEffect(() => {
		if (!open || !open.open) return;
		if (!aggregateRemote) { setSourceState({ kind: "fallback", error: remoteMountError || null, at: null }); return; }
		var cancelled = false;
		setSourceState(function(prev) { return { kind: remoteData ? "refreshing" : "loading", error: null, at: prev.at }; });
		aggregateRemote().then((r) => {
			if (cancelled) return;
			setRemoteData(r);
			setSourceState({ kind: r.meta?.degraded ? "partial" : "exact", error: r.meta?.warnings?.filter(function(w) { return !/^OFFICIAL_.*_USED$/.test(w.code); }).map(function(w) { return w.message; }).join("; ") || null, at: r.meta?.generatedAt ?? Date.now() });
		})
			.catch((err) => {
				if (cancelled) return;
				console.warn("[dsh-stats] aggregate 调用失败:", err);
				setSourceState({ kind: remoteData ? "stale" : "fallback", error: err?.message || String(err), at: remoteData?.meta?.generatedAt || null });
			});
		return () => { cancelled = true; };
	}, [open, aggregateRemote, remoteMountError, refreshTick]);

	// 面板打开期间每 60 秒自动刷新一次
	useEffect(() => {
		if (!open || !open.open || !aggregateRemote) return;
		var id = setInterval(() => {
			setRefreshTick((x) => x + 1);
			setBalanceRefreshRequest((request) => ({ tick: request.tick + 1, force: false }));
		}, 60000);
		return () => clearInterval(id);
	}, [open, aggregateRemote]);

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

	// 时间线视图：按日模式只保留选中日
	var viewTimeline = useMemo(() => {
		if (effectiveDate) return { days: (data.timeline.days || []).filter(function(d) { return d.date === effectiveDate; }) };
		return data.timeline;
	}, [data.timeline, effectiveDate]);

	// 全局聚合：全量（热力图 / 7 天趋势 / 连续天数指标卡始终用全量）
	var globals = useMemo(() => buildGlobals(data.projects), [data.projects]);

	// 按日时，项目卡片与趋势只统计有 token 消耗的项目；时间线仍使用完整活动项目。
	var statProjects = useMemo(() => effectiveDate ? dateProjects.filter(hasTokenUsage) : dateProjects, [effectiveDate, dateProjects]);

	// 按日聚合：hero 总览 / 模型分布随选中日期变化（全部模式复用 globals，避免重复计算）
	var dateGlobals = useMemo(() => (effectiveDate ? buildGlobals(statProjects) : globals), [effectiveDate, statProjects, globals]);

	if (!open || !open.open) return null;

	var toggle = (id) => setHidden((h) => ({ ...h, [id]: !h[id] }));
	var visibleProjects = statProjects.filter((p) => !hidden[p.id]);
	var isRefreshing = tab === "balance"
		? balanceState.kind === "loading" || balanceState.kind === "refreshing"
		: sourceState.kind === "loading" || sourceState.kind === "refreshing";
	var refreshCurrent = function() {
		if (tab === "balance") setBalanceRefreshRequest((request) => ({ tick: request.tick + 1, force: true }));
		else setRefreshTick((x) => x + 1);
	};

	return e("div", { className: "dss-overlay", onClick: (ev) => { if (ev.target === ev.currentTarget) onClose(); } },
		e("div", { className: "dss-panel" },
			e("div", { className: "dss-head" },
				e("h2", null, t("title")),
				e("div", { className: "dss-tabs" },
					e("button", { className: tab === "overview" ? "on" : "", onClick: () => setTab("overview") }, t("tab.overview")),
					e("button", { className: tab === "timeline" ? "on" : "", onClick: () => setTab("timeline") }, t("tab.timeline")),
					e("button", { className: tab === "trends" ? "on" : "", onClick: () => setTab("trends") }, t("tab.trends")),
					e("button", { className: tab === "balance" ? "on" : "", onClick: () => setTab("balance") }, t("tab.balance"))
				),
				e("div", { className: "dss-head-actions" },
					e("button", { className: "dss-export", onClick: () => setShowPrices(!showPrices), "aria-expanded": showPrices }, t("price.title")),
					e("button", { className: "dss-export", onClick: refreshCurrent, disabled: isRefreshing }, t("refresh")),
					tab !== "balance" ? e(Fragment, null,
						e("button", { className: "dss-export", onClick: () => exportCSV(dateProjects, t) }, "CSV"),
						e("button", { className: "dss-export", onClick: () => exportJSON(dateProjects) }, "JSON")
					) : null,
					e("button", { className: "dss-close", onClick: onClose, title: t("close") },
						e(IconCloseOutline16, { size: 16 })
					)
				)
			),
			e("div", { className: "dss-body" },
				showPrices ? e(PricingPanel, { remote: props.pricing, projects: data.projects, t, onChanged: () => setRefreshTick(x => x + 1) }) : null,
				tab === "balance" ? e(BalanceView, { data: balanceData, state: balanceState, remote: balanceRemote, t }) : e(Fragment, null,
					e(StatsDataStatus, { state: sourceState, remote: data.remote, projects: visibleProjects, t }),
					e(DateNavigator, { nav, setNav, dates, effectiveDate, t }),
				tab === "overview" ? e(Fragment, null,
					e(SummaryCards, { projects: visibleProjects, t }),
					e(Legend, { projects: statProjects, colorIndexes, hidden, onToggle: toggle }),
					visibleProjects.length === 0 ? e("div", { className: "dss-empty" }, t("empty")) :
						 e(ProjectsTable, { projects: statProjects, colorIndexes, hidden, selected, t, dayMode: effectiveDate != null, onOpenSession, onSelect: (id) => setSelected((s) => s === id ? null : id) })
				) : tab === "timeline" ? e(TimelineView, { projects: dateProjects, timeline: viewTimeline, hidden, dayMode: effectiveDate != null, tt: t })
				: e(TrendsView, {
					globals,
					dateGlobals,
					selectedDate: effectiveDate,
					onSelectDate: function(date) { setNav({ mode: "day", date: date }); },
					t
				})
				)
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
				e("div", { className: "dss-hero-v dss-cost" }, e(CostValue, { summary: dg.totalCost, t: props.t }))
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
	// 附加 CSS — 必须在 CSS 注入前定义
	var _phaseDCSS = "\n\t.dss-tc-val.dss-tc-cost{color:#ff922b}" +
		"\n\t.dss-ml-row .dss-ml-reasoning{color:#cc5de8}" +
		"\n\t.dss-balance{display:flex;flex-direction:column;gap:14px}" +
		".dss-balance-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}" +
		".dss-section-title{font-size:14px;font-weight:650;color:var(--dsw-alias-label-primary,#e7eaf0)}" +
		".dss-balance-head .dss-sec-hint{margin-top:4px}" +
		".dss-provider-picker{display:flex;align-items:center;gap:8px;color:var(--dsw-alias-label-secondary,#a6adbb);font-size:11px;white-space:nowrap}" +
		".dss-provider-picker select{width:128px;min-width:128px;height:30px;padding:0 28px 0 9px;border:1px solid var(--dsw-alias-border,#2a303c);border-radius:7px;background:var(--dsw-specific-menu,#1d222c);color:var(--dsw-alias-label-primary,#e7eaf0);font-size:12px;outline:none}" +
		".dss-provider-picker select:focus{border-color:#60a5fa}" +
		".dss-balance-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px}" +
		".dss-balance-account{--dss-balance-text:var(--dsw-alias-label-primary,#e7eaf0);--dss-balance-muted:var(--dsw-alias-label-secondary,#a6adbb);--dss-balance-metric-bg:rgba(255,255,255,.42);--dss-balance-metric-border:rgba(37,99,235,.28);background:var(--dsw-specific-menu,#1d222c);border:1px solid var(--dsw-alias-border,#2a303c);border-radius:10px;padding:18px;overflow:hidden}" +
		".dss-balance-account.provider-deepseek{--dss-balance-text:#0f172a;--dss-balance-muted:#1d4ed8;--dss-balance-metric-bg:rgba(255,255,255,.42);--dss-balance-metric-border:rgba(37,99,235,.28);background:linear-gradient(135deg,#dbeafe 0%,#e0f2fe 54%,#f8fafc 100%);border-color:#93c5fd;box-shadow:inset 0 1px 0 rgba(255,255,255,.7)}" +
		"body[data-ds-dark-theme] .dss-balance-account.provider-deepseek{--dss-balance-text:#f8fbff;--dss-balance-muted:#bfdbfe;--dss-balance-metric-bg:rgba(15,23,42,.22);--dss-balance-metric-border:rgba(147,197,253,.34);background:linear-gradient(135deg,rgba(37,99,235,.28) 0%,rgba(14,165,233,.13) 54%,rgba(15,23,42,.04) 100%),var(--dsw-specific-menu,#1d222c);border-color:rgba(96,165,250,.44);box-shadow:inset 0 1px 0 rgba(191,219,254,.08)}" +
		".dss-balance-account-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}" +
		".dss-balance-name{font-size:15px;font-weight:700;color:var(--dss-balance-text)}" +
		".dss-balance-currency{font-size:11px;color:var(--dss-balance-muted);margin-top:3px}" +
		".dss-balance-status{font-size:11px;font-weight:600;padding:3px 7px;border:1px solid transparent;border-radius:5px;background:rgba(96,165,250,.12);color:#60a5fa}" +
		".dss-balance-status.ok{color:#6ee7b7;background:rgba(16,185,129,.12);border-color:rgba(52,211,153,.18)}" +
		".dss-balance-status.stale{color:#fde68a;background:rgba(251,191,36,.12);border-color:rgba(251,191,36,.18)}" +
		".dss-balance-status.not-configured,.dss-balance-status.unauthorized,.dss-balance-status.invalid-response,.dss-balance-status.blocked{color:#fca5a5;background:rgba(248,113,113,.12);border-color:rgba(248,113,113,.18)}" +
		".dss-balance-status.rate-limited,.dss-balance-status.unavailable{color:#fde68a;background:rgba(251,191,36,.12);border-color:rgba(251,191,36,.18)}" +
		".dss-balance-status.unsupported{color:var(--dsw-alias-label-secondary,#a6adbb);background:rgba(148,163,184,.1);border-color:rgba(148,163,184,.18)}" +
		".dss-balance-total-label{margin-top:24px;font-size:11.5px;color:var(--dss-balance-muted)}" +
		".dss-balance-total{font-size:34px;font-weight:750;line-height:1.08;margin-top:5px;color:var(--dss-balance-text);font-variant-numeric:tabular-nums}" +
		".dss-balance-plan{font-size:24px;font-weight:720;line-height:1.2;margin-top:6px;color:var(--dss-balance-text)}" +
		".dss-balance-breakdown{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:20px;padding-top:14px;border-top:1px solid rgba(37,99,235,.18);font-variant-numeric:tabular-nums}" +
		".dss-balance-metric{display:flex;flex-direction:column;gap:4px;min-width:0;padding:9px 11px;border:1px solid var(--dss-balance-metric-border);border-radius:7px;background:var(--dss-balance-metric-bg);box-sizing:border-box}" +
		".dss-balance-metric+.dss-balance-metric{padding-left:11px;padding-right:11px;border-left:1px solid var(--dss-balance-metric-border)}" +
		".dss-balance-metric span{font-size:11px;color:var(--dss-balance-muted)}" +
		".dss-balance-metric b{font-size:14px;color:var(--dss-balance-text);white-space:nowrap}" +
		".dss-quota-list{display:flex;flex-direction:column;gap:14px;margin-top:20px;padding-top:16px;border-top:1px solid var(--dsw-alias-border,#2a303c)}" +
		".dss-quota-head{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12px;color:var(--dss-balance-muted)}" +
		".dss-quota-head b{color:var(--dss-balance-text);font-variant-numeric:tabular-nums}" +
		".dss-quota-track{height:7px;margin-top:7px;overflow:hidden;border-radius:4px;background:rgba(148,163,184,.2)}" +
		".dss-quota-track i{display:block;height:100%;border-radius:4px;background:#3b82f6}" +
		".dss-quota-reset{margin-top:5px;font-size:10.5px;color:var(--dss-balance-muted)}" +
		".dss-balance-stale{margin-top:10px;color:#fde68a;font-size:11.5px}" +
		".dss-balance-message{margin-top:24px;color:var(--dsw-alias-label-secondary,#a6adbb);font-size:12px;line-height:1.5}" +
		".dss-balance-topup{display:inline-flex;align-items:center;justify-content:center;margin-top:18px;min-height:30px;padding:0 12px;border:1px solid #2563eb;border-radius:7px;background:#2563eb;color:#fff;font-size:12px;font-weight:600;text-decoration:none}" +
		".dss-balance-topup:hover{background:#1d4ed8;border-color:#1d4ed8}" +
		".dss-balance-state{padding:42px 0;text-align:center;color:var(--dsw-alias-label-secondary,#a6adbb)}" +
		".dss-balance-state.error{color:#fbbf24}" +
		".dss-balance-warning{border:1px solid rgba(251,191,36,.22);background:rgba(251,191,36,.08);border-radius:8px;padding:9px 11px;color:#fbbf24;font-size:12px}" +
		"body:not([data-ds-dark-theme]) .dss-balance-status.ok{color:#047857}" +
		"body:not([data-ds-dark-theme]) .dss-balance-status.stale,body:not([data-ds-dark-theme]) .dss-balance-status.rate-limited,body:not([data-ds-dark-theme]) .dss-balance-status.unavailable,body:not([data-ds-dark-theme]) .dss-balance-stale,body:not([data-ds-dark-theme]) .dss-balance-warning,body:not([data-ds-dark-theme]) .dss-balance-state.error{color:#92400e}" +
		"body:not([data-ds-dark-theme]) .dss-balance-status.not-configured,body:not([data-ds-dark-theme]) .dss-balance-status.unauthorized,body:not([data-ds-dark-theme]) .dss-balance-status.invalid-response,body:not([data-ds-dark-theme]) .dss-balance-status.blocked{color:#b91c1c}" +
		"@media (max-width:640px){.dss-balance-head{flex-direction:column}.dss-provider-picker{width:100%;justify-content:space-between}.dss-provider-picker select{min-width:0;max-width:72%;flex:1}.dss-balance-account{padding:15px}.dss-balance-total{font-size:30px}.dss-balance-breakdown{gap:8px}}\n\t";

	const pricingCSS = ".dss-pricing{padding:16px;border:1px solid var(--dsw-alias-border-main,#8884);border-radius:10px;margin-bottom:16px}.dss-pricing h3{margin:0 0 12px}.dss-price-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:12px 0}.dss-price-field{display:flex;flex-direction:column;gap:5px;font-size:12px}.dss-pricing input:not([type=checkbox]),.dss-pricing select{box-sizing:border-box;width:100%;min-width:0;padding:7px;border:1px solid #8885;border-radius:5px;background:transparent;color:inherit}.dss-price-actions,.dss-price-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:10px 0}.dss-price-row>span{flex:1 1 160px;min-width:140px;overflow-wrap:anywhere}.dss-pricing details{margin:10px 0}.dss-pricing summary{cursor:pointer;font-size:13px}.dss-price-muted{opacity:.7;font-size:12px}.dss-pricing pre{font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere;max-height:240px;overflow:auto}.dss-price-rule{padding:8px;border-bottom:1px solid #8883}.dss-price-rates{display:flex;flex-wrap:wrap;gap:16px;font-size:12px}.dss-price-rates dt{opacity:.7}.dss-price-rates dd{margin:4px 0}.dss-price-preview{font-size:13px}.dss-pricing [role=alert]{color:#dc2626}.dss-pricing [role=status]{font-size:12px}";

	var ownedStyle = null;
	if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(CSS_ID) + "]") === null) {
		var tag = document.createElement("style");
		tag.dataset.plugin = "@rongyi7/dsh-stats";
		tag.dataset.pluginCss = CSS_ID;
		tag.textContent = css + _phaseDCSS + pricingCSS;
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
		inject: () => ({ onOpen: () => openStore.open() })
	}, StatsTrigger));
	ctx.slots.inject("shell.overlay", () => ctx.slots.register({
		name: "shell.overlay",
		id: "stats-panel",
		locale: NS,
		inject: () => ({ hooks: { statsOpen: openStore }, onClose: () => openStore.close(), onOpenSession, aggregate: aggregateRemote, balance: balanceRemote, pricing: pricingRemote, remoteError })
	}, StatsPanel));

	return () => {
		disposeRemote();
		if (ownedStyle && ownedStyle.isConnected) ownedStyle.remove();
		var tooltip = typeof document !== "undefined" ? document.getElementById("dss-tooltip") : null;
		if (tooltip) tooltip.remove();
	};
}

module.exports = { apply, inject };
// 测试钩子：暴露纯函数供 vitest 直接验证真实实现（生产运行不读取）
module.exports.__test = {
	StatsDataStatus, BalanceView, readAccountRemote, STATS_REMOTE_CONTRIBUTION, IconDataOutline16, IconCloseOutline16,
	localDayKey, emptyBucket, addBucket, sessionDayTokens,
	monthlyFromDays, weeklyFromDays, modelAgg, streakAndActive,
	costOf, usageCost, sessionCost, identityForUsage, fmtN, fmtTokens, fmtCost, fmtDuration, fmtTps, fmtSharePct,
	applyDate, applyRange, activityDates, fmtDateCN, buildTimeline, aggregate, projectionIdentityOf, projectionSlotUsageOf, enrichSessionProjection, parseAggregateResult, parseBalanceResult, parseAccountResult, parseProvidersResult, hasTokenUsage, groupTimelineBlocks, timelineLayout, timelineDisplayDays,
	sessionCostSummary, projectCostSummary, compareProjectCost, fmtCostSummary, modelNameOnly, modelDisplayName, providerPickerLabel, modelListNeedsScroll, projectCsvTable, csvField, sessionExportUsages,
	subagentAddressFor, openStatsSession, CalendarHeatmap, projectColorIndexes, projectColorIndex
};
