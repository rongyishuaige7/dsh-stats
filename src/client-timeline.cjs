// Day timeline view: shared axis, half-hour cost/token bars, project lanes,
// session rows and the half-hour detail popover.
const react = require("react");
const e = react.createElement;
const { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect } = react;
const { fmtCostSummary, fmtDuration, fmtTokens, pad } = require("./client-format.cjs");
const { dayStartMs, localDayKey } = require("./client-data.cjs");
const {
	TIMELINE_LANE_PAGE,
	TIMELINE_SESSION_PAGE,
	timelineWindow,
	timelineTicks,
	timelineGrid,
	timelineRuns,
	runSlotAt,
	timelineDayModel,
	timelinePeak,
	timelineSlotDetail,
	timelineRangeModel,
	timelineJumpSlot,
	dayCostSummaries
} = require("./client-timeline-model.cjs");
const { PageControls, pageRows } = require("./client-overview.cjs");
const { useLayer } = require("./client-dialog.cjs");
const { tipRows, tipProps, showTipRaw, hideTip } = require("./client-tip.cjs");
const { IconChevronDown } = require("./client-icons.cjs");

function clock(slot) {
	const minutes = slot * 30;
	return pad(Math.floor(minutes / 60)) + ":" + pad(minutes % 60);
}

function clockMin(minutes) {
	return pad(Math.floor(minutes / 60)) + ":" + pad(Math.round(minutes) % 60);
}

function costAmount(summary) {
	if (!summary || !Array.isArray(summary.totals)) return 0;
	return summary.totals.reduce(function(total, row) {
		return total + (row && row.currency === "CNY" && Number.isFinite(row.amount) ? row.amount : 0);
	}, 0);
}

function dayLabel(date, t) {
	const weekday = t("w.weekdays").split(",")[new Date(date + "T00:00:00Z").getUTCDay()];
	return date.slice(5) + " " + t("w.dayPrefix") + weekday;
}


function TimelineView(props) {
	const [jump, setJump] = useState(null);
	if (props.date == null) {
		return e(TimelineRange, Object.assign({}, props, { onJump: setJump }));
	}
	return e(TimelineDay, Object.assign({}, props, {
		jump: jump,
		onJumpConsumed: function() { setJump(null); }
	}));
}

function TimelineDay(props) {
	const t = props.t;
	const date = props.date;
	const prefs = props.prefs;
	const setPrefs = props.setPrefs;
	const hiddenKey = props.hiddenKey || "";
	const day = useMemo(function() {
		return (props.timeline.days || []).find(function(item) { return item.date === date; }) || { date: date, slotBlocks: [] };
	}, [props.timeline, date]);
	const model = useMemo(function() {
		return timelineDayModel({
			day: day,
			projects: props.projects,
			hidden: props.hidden,
			date: date,
			colorIndexes: props.colorIndexes
		});
	}, [day, props.projects, props.hidden, date, props.colorIndexes]);
	const win = useMemo(function() {
		return timelineWindow(model.first, model.last, prefs.axis);
	}, [model.first, model.last, prefs.axis]);
	const ticks = useMemo(function() { return timelineTicks(win); }, [win.start, win.end]);
	const grid = useMemo(function() { return timelineGrid(win); }, [win.start, win.end]);

	const [lanePage, setLanePage] = useState(0);
	const [expanded, setExpanded] = useState(function() {
		return new Set(model.lanes.length ? [model.lanes[0].projectId] : []);
	});
	const [sessionPages, setSessionPages] = useState({});
	const [pop, setPop] = useState(null);
	const [barFocus, setBarFocus] = useState(null);
	const dayRef = useRef(null);
	const barRefs = useRef(new Map());
	const popRef = useRef(pop);
	popRef.current = pop;

	const firstLaneId = model.lanes.length ? model.lanes[0].projectId : null;
	useEffect(function() {
		setExpanded(new Set(firstLaneId == null ? [] : [firstLaneId]));
		setLanePage(0);
		setSessionPages({});
		setPop(null);
	}, [date]);
	useEffect(function() {
		setExpanded(function(current) {
			const next = new Set();
			current.forEach(function(id) {
				if (model.lanes.some(function(lane) { return lane.projectId === id; })) next.add(id);
			});
			return next;
		});
		setLanePage(0);
		setSessionPages({});
		setPop(null);
	}, [hiddenKey]);

	useEffect(function() {
		if (!props.jump || props.jump.date !== date) return;
		if (firstLaneId != null) {
			setExpanded(function(current) {
				if (current.has(firstLaneId)) return current;
				const next = new Set(current);
				next.add(firstLaneId);
				return next;
			});
		}
		setPop({ slot: props.jump.slot, opener: null });
		if (props.onJumpConsumed) props.onJumpConsumed();
	}, [props.jump, date, firstLaneId]);

	const closeDetail = useCallback(function(restoreFocus) {
		const opener = popRef.current && popRef.current.opener;
		setPop(null);
		if (!restoreFocus) return;
		setTimeout(function() {
			if (opener && opener.isConnected && typeof opener.focus === "function") opener.focus();
			else if (dayRef.current) dayRef.current.focus();
		}, 0);
	}, []);

	const toggleLane = function(projectId) {
		setExpanded(function(current) {
			const next = new Set(current);
			if (next.has(projectId)) next.delete(projectId);
			else next.add(projectId);
			return next;
		});
	};

	const openDetail = function(slot, opener) {
		hideTip();
		setBarFocus(slot);
		setPop({ slot: slot, opener: opener || null });
	};

	const activeRange = model.first < 48 && model.last >= 0
		? clock(model.first) + "–" + clock(model.last + 1)
		: "—";
	const windowSlots = Math.max(1, win.end - win.start);
	const percent = function(slot) {
		return ((slot - win.start) / windowSlots * 100).toFixed(3) + "%";
	};
	const widthPercent = function(slots) {
		return (slots / windowSlots * 100).toFixed(3) + "%";
	};

	const isCost = prefs.metric !== "token";
	const values = useMemo(function() {
		if (isCost) return model.slotCost.map(costAmount);
		return model.slotTokens.slice();
	}, [isCost, model.slotCost, model.slotTokens]);
	const peak = useMemo(function() { return timelinePeak(values, win); }, [values, win.start, win.end]);
	const maxValue = peak ? peak.value : 0;
	const bars = [];
	if (maxValue > 0) {
		for (let slot = win.start; slot < win.end; slot++) {
			if (!(values[slot] > 0)) continue;
			bars.push({ slot: slot, value: values[slot] });
		}
	}
	const activeBar = bars.some(function(bar) { return bar.slot === barFocus; })
		? barFocus
		: peak && bars.some(function(bar) { return bar.slot === peak.slot; }) ? peak.slot : bars.length ? bars[0].slot : null;
	const barValueText = function(slot) {
		return isCost ? fmtCostSummary(model.slotCost[slot], t) : fmtTokens(values[slot]);
	};
	const moveBar = function(from, delta) {
		const index = bars.findIndex(function(bar) { return bar.slot === from; });
		const next = bars[Math.max(0, Math.min(bars.length - 1, index + delta))];
		if (!next) return;
		setBarFocus(next.slot);
		const node = barRefs.current.get(next.slot);
		if (node) node.focus();
	};
	const onBarKeyDown = function(ev, slot) {
		if (ev.key === "ArrowLeft") { ev.preventDefault(); ev.stopPropagation(); moveBar(slot, -1); }
		else if (ev.key === "ArrowRight") { ev.preventDefault(); ev.stopPropagation(); moveBar(slot, 1); }
		else if (ev.key === "Home") { ev.preventDefault(); ev.stopPropagation(); moveBar(slot, -bars.length); }
		else if (ev.key === "End") { ev.preventDefault(); ev.stopPropagation(); moveBar(slot, bars.length); }
		else if (ev.key === "Enter" || ev.key === " ") {
			ev.preventDefault();
			ev.stopPropagation();
			openDetail(slot, ev.currentTarget);
		}
	};

	const now = Date.now();
	const nowMinutes = (() => {
		const bj = new Date(now + 8 * 3600000);
		return bj.getUTCHours() * 60 + bj.getUTCMinutes();
	})();
	const showNow = localDayKey(now) === date && nowMinutes >= win.start * 30 && nowMinutes < win.end * 30;
	const nowRatio = (nowMinutes - win.start * 30) / (windowSlots * 30);
	const nowFlip = showNow && nowRatio >= 0.8;

	const dayWindow = pageRows(model.lanes, lanePage, TIMELINE_LANE_PAGE);
	const hiddenActivity = ((day && day.slotBlocks) || []).some(function(block) {
		return block && props.hidden && props.hidden[block.projectId];
	});

	const gridLines = e("div", { className: "dss-tl-lines", "aria-hidden": "true" },
		grid.map(function(row) {
			return e("i", {
				key: row.hour,
				"data-hour": row.hour,
				className: "dss-tl-grid-line" + (row.major ? " is-major" : ""),
				style: { left: percent(row.hour * 2) }
			});
		}),
		pop ? e("span", {
			className: "dss-tl-band",
			style: { left: percent(pop.slot), width: widthPercent(1) }
		}) : null,
		showNow ? e("b", { className: "dss-tl-now" + (nowFlip ? " is-flip" : ""), style: { left: percent(nowMinutes / 30) } },
			e("span", null, t("tl.now").replace("%s", clockMin(nowMinutes)))
		) : null
	);

	const nowSlot = nowMinutes / 30;
	const axisTicks = showNow ? ticks.filter(function(tick) { return Math.abs(tick.slot - nowSlot) >= 0.75; }) : ticks;
	const axis = e("div", { className: "dss-tl-row dss-tl-axis", "aria-hidden": "true" },
		e("div", null),
		e("div", { className: "dss-tl-track" },
			axisTicks.map(function(tick) {
				const classes = ["dss-tl-tick"];
				if (tick.edge === "first") classes.push("is-first");
				if (tick.edge === "last") classes.push("is-last");
				if (tick.odd) classes.push("is-odd");
				return e("span", {
					key: tick.slot,
					className: classes.join(" "),
					"data-slot": tick.slot,
					style: { left: percent(tick.slot) }
				}, tick.label);
			})
		),
		e("div", null)
	);

	const hist = e("div", { className: "dss-tl-row dss-tl-hist" + (isCost ? "" : " is-token") },
		e("div", { className: "dss-tl-hist-lab" },
			e("span", null, isCost ? t("tl.dayCost") : t("tl.dayToken")),
			e("b", { className: "dss-tl-hist-total" }, isCost ? fmtCostSummary(props.dayCost, t) : fmtTokens(props.dayTokens))
		),
		e("div", { className: "dss-tl-track", role: "group", "aria-label": isCost ? t("tl.metricCost") : t("tl.metricToken") },
			peak ? e("i", { className: "dss-tl-ref", "aria-hidden": "true" }) : null,
			bars.map(function(bar) {
				const valueText = barValueText(bar.slot);
				const partial = model.slotPartial[bar.slot];
				const height = Math.max(3, bar.value / maxValue * 100).toFixed(1) + "%";
				const range = clock(bar.slot) + "–" + clock(bar.slot + 1);
				const tip = tipProps(function() {
					const line = range + " · " + valueText + (isCost ? "" : " Token") + (!isCost && partial ? "*" : "");
					return tipRows(line, []);
				});
				return e("button", {
					key: bar.slot,
					ref: function(node) {
						if (node) barRefs.current.set(bar.slot, node);
						else barRefs.current.delete(bar.slot);
					},
					type: "button",
					className: "dss-tl-bar" + (isCost ? "" : " is-token") + (partial ? " is-partial" : ""),
					"data-action": "tl-bar",
					"data-slot": bar.slot,
					tabIndex: activeBar === bar.slot ? 0 : -1,
					style: {
						left: "calc(" + percent(bar.slot) + " + 1px)",
						width: "calc(" + widthPercent(1) + " - 2px)",
						height: height
					},
					"aria-label": t("tl.openDetail").replace("%s", range + " " + valueText),
					onClick: function(ev) { openDetail(bar.slot, ev.currentTarget); },
					onKeyDown: function(ev) { onBarKeyDown(ev, bar.slot); },
					...tip,
					onFocus: function(ev) { setBarFocus(bar.slot); tip.onFocus(ev); }
				});
			})
		),
		e("div", { className: "dss-tl-peak" },
			peak ? e("span", null, t("tl.peak").replace("%s", clock(peak.slot))) : null,
			peak ? e("b", null, isCost ? fmtCostSummary(model.slotCost[peak.slot], t) : fmtTokens(peak.value)) : null
		)
	);

	const lanes = dayWindow.rows.map(function(lane) {
		const isOpen = expanded.has(lane.projectId);
		const runs = timelineRuns(lane.ms, win);
		const laneTip = function(name) {
			return tipProps(function() {
				return tipRows(name, [[t("w.duration"), fmtDuration(lane.total)]]);
			});
		};
		const row = e("div", {
			key: lane.projectId,
			className: "dss-tl-row dss-tl-lane" + (isOpen ? " is-open" : ""),
			"data-project-id": lane.projectId
		},
			e("div", { className: "dss-tl-lab" },
				lane.hasSessions ? e("button", {
					type: "button",
					className: "dss-tl-chev",
					"data-action": "tl-lane",
					"aria-expanded": isOpen,
					"aria-label": t(isOpen ? "tl.collapse" : "tl.expand").replace("%s", lane.name),
					onClick: function() { toggleLane(lane.projectId); }
				}, e(IconChevronDown, { size: 12 })) : null,
				e("i", { className: "dss-pdot", "data-color": String(lane.colorIndex) }),
				e("span", { className: "dss-tl-name", title: lane.name }, lane.name),
				lane.mainCount > 0 ? e("span", { className: "dss-tl-count" }, t("tl.sessions").replace("%d", String(lane.mainCount))) : null
			),
			e("div", { className: "dss-tl-track" },
				runs.map(function(run) {
					const range = clock(run.from) + "–" + clock(run.to);
					const tip = laneTip(lane.name);
					return e("button", {
						key: run.from,
						type: "button",
						className: "dss-tl-run",
						"data-action": "tl-slot",
						"data-color": String(lane.colorIndex),
						"data-from": run.from,
						"data-to": run.to,
						style: { left: percent(run.from), width: widthPercent(run.to - run.from) },
						"aria-label": t("tl.openDetail").replace("%s", lane.name + " " + range + " " + fmtDuration(run.total)),
						onClick: function(ev) {
							const fraction = ev.detail === 0 || !ev.clientX ? 0 : (ev.clientX - ev.currentTarget.getBoundingClientRect().left) / ev.currentTarget.getBoundingClientRect().width;
							openDetail(runSlotAt(run, fraction), ev.currentTarget);
						},
						onKeyDown: function(ev) {
							if (ev.key !== "Enter" && ev.key !== " ") return;
							ev.preventDefault();
							ev.stopPropagation();
							openDetail(run.from, ev.currentTarget);
						},
						...tip
					}, run.segments.map(function(segment) {
						return e("i", { key: segment.slot, style: { "--o": segment.opacity } });
					}));
				})
			),
			e("div", { className: "dss-tl-tot" }, fmtDuration(lane.total))
		);
		if (!isOpen) return row;
		const sessionPage = sessionPages[lane.projectId] || 0;
		const sessionWindow = pageRows(lane.sessions, sessionPage, TIMELINE_SESSION_PAGE);
		const sessionRows = sessionWindow.rows.map(function(session, index) {
			const isLast = lane.sessions[lane.sessions.length - 1] === session;
			const sessionRuns = timelineRuns(session.ms, win);
			const title = session.title || t("w.untitled");
			const tip = tipProps(function() {
				return tipRows(title, [[t("w.duration"), fmtDuration(session.total)]]);
			});
			return e("div", {
				key: session.id == null ? "session-" + index : session.id,
				className: "dss-tl-row dss-tl-sess" + (session.subagent ? " is-sub" : "") + (isLast ? " is-last" : ""),
				"data-session-id": session.id == null ? undefined : session.id
			},
				e("div", { className: "dss-tl-lab" },
					e("button", {
						type: "button",
						className: "dss-tl-sess-link",
						"data-action": "tl-open-session",
						title: t("openSession") + ": " + title,
						"aria-label": t("openSession") + ": " + title,
						onClick: function() { props.onOpenSession(session.session); }
					},
						session.subagent ? e("span", { className: "dss-tag" }, t("w.subagentTag")) : null,
						session.archived === true ? e("span", { className: "dss-tag is-archived" }, t("w.archivedTag")) : null,
						e("span", { className: "dss-tl-name" }, title)
					)
				),
				e("div", { className: "dss-tl-track" },
					sessionRuns.map(function(run) {
						const range = clock(run.from) + "–" + clock(run.to);
						return e("button", {
							key: run.from,
							type: "button",
							className: "dss-tl-run is-thin",
							"data-action": "tl-slot",
							"data-color": String(lane.colorIndex),
							"data-from": run.from,
							"data-to": run.to,
							style: { left: percent(run.from), width: widthPercent(run.to - run.from) },
							"aria-label": t("tl.openDetail").replace("%s", title + " " + range + " " + fmtDuration(run.total)),
							onClick: function(ev) {
								const fraction = ev.detail === 0 || !ev.clientX ? 0 : (ev.clientX - ev.currentTarget.getBoundingClientRect().left) / ev.currentTarget.getBoundingClientRect().width;
								openDetail(runSlotAt(run, fraction), ev.currentTarget);
							},
							onKeyDown: function(ev) {
								if (ev.key !== "Enter" && ev.key !== " ") return;
								ev.preventDefault();
								ev.stopPropagation();
								openDetail(run.from, ev.currentTarget);
							},
							...tip
						}, run.segments.map(function(segment) {
							return e("i", { key: segment.slot, style: { "--o": segment.opacity } });
						}));
					})
				),
				e("div", { className: "dss-tl-tot" }, fmtDuration(session.total))
			);
		});
		return e(react.Fragment, { key: lane.projectId },
			row,
			sessionRows,
			sessionWindow.pageCount > 1 ? e(PageControls, {
				window: sessionWindow,
				onPage: function(page) { setSessionPages(function(current) { return Object.assign({}, current, { [lane.projectId]: page }); }); },
				t: t,
				name: "tl-sessions"
			}) : null
		);
	});

	const legend = e("div", { className: "dss-tl-legend" },
		e("span", { className: "dss-tl-scale", "aria-label": t("tl.legendShare") + " / " + t("tl.legendFull") },
			e("span", null, t("tl.legendShare")),
			[0.3, 0.53, 0.77, 1].map(function(opacity) {
				return e("i", { key: opacity, className: "dss-tl-sw", style: { "--o": opacity } });
			}),
			e("span", null, t("tl.legendFull"))
		),
		e("span", null, t("tl.legendUnit")),
		e("span", null, t("tl.legendClick"))
	);

	const top = e("div", { className: "dss-tl-top" },
		e("div", { className: "dss-tl-sum" },
			e("span", null, t("w.duration"), e("b", null, fmtDuration(model.total))),
			e("span", null, t("strip.span"), e("b", null, activeRange))
		),
		e("div", { className: "dss-tl-ctl" },
			e("div", { className: "dss-tl-ctl-inline" },
				e("span", { className: "dss-tl-ctl-k" }, t("tl.axis")),
				e("div", { className: "dss-seg", role: "group", "aria-label": t("tl.axis") },
					e("button", {
						type: "button",
						className: prefs.axis === "focus" ? "on" : "",
						"aria-pressed": prefs.axis === "focus",
						"data-action": "tl-axis-focus",
						onClick: function() { setPrefs({ axis: "focus" }); }
					}, t("tl.axisFocus")),
					e("button", {
						type: "button",
						className: prefs.axis === "full" ? "on" : "",
						"aria-pressed": prefs.axis === "full",
						"data-action": "tl-axis-full",
						onClick: function() { setPrefs({ axis: "full" }); }
					}, t("tl.axisFull"))
				)
			),
			e("div", { className: "dss-tl-ctl-inline" },
				e("span", { className: "dss-tl-ctl-k" }, t("tl.metric")),
				e("div", { className: "dss-seg", role: "group", "aria-label": t("tl.metric") },
					e("button", {
						type: "button",
						className: isCost ? "on" : "",
						"aria-pressed": isCost,
						"data-action": "tl-metric-cost",
						onClick: function() { setPrefs({ metric: "cost" }); }
					}, t("tl.metricCost")),
					e("button", {
						type: "button",
						className: isCost ? "" : "on",
						"aria-pressed": !isCost,
						"data-action": "tl-metric-token",
						onClick: function() { setPrefs({ metric: "token" }); }
					}, t("tl.metricToken"))
				)
			)
		)
	);

	if (!model.lanes.length) {
		return e("div", { className: "dss-tl", "data-mode": "day" },
			top,
			e("div", { className: "dss-empty" },
				t("tl.emptyVisible"),
				hiddenActivity ? e("button", {
					type: "button",
					className: "dss-link-btn",
					"data-action": "tl-show-all",
					onClick: props.onShowAll
				}, t("filter.showAll")) : null
			),
			legend
		);
	}

	return e("div", { className: "dss-tl", "data-mode": "day" },
		top,
		e("div", { className: "dss-tl-day", tabIndex: -1, ref: dayRef },
			gridLines,
			axis,
			hist,
			dayWindow.pageCount > 1 ? e(PageControls, {
				window: dayWindow,
				onPage: setLanePage,
				t: t,
				name: "lanes"
			}) : null,
			lanes,
			pop ? e(SlotPopover, {
				model: model,
				slot: pop.slot,
				opener: pop.opener,
				date: date,
				t: t,
				onClose: closeDetail,
				onOpenSession: props.onOpenSession
			}) : null
		),
		legend
	);
}

function SlotPopover(props) {
	const t = props.t;
	const rootRef = useRef(null);
	const [pos, setPos] = useState({ left: 0, top: 0, maxHeight: 420, ready: false });
	useLayer(true, function() { props.onClose(true); });

	useEffect(function() {
		if (pos.ready && rootRef.current) rootRef.current.focus();
	}, [pos.ready]);

	useEffect(function() {
		const root = rootRef.current;
		const panel = root && root.closest(".dss-panel");
		if (!panel) return undefined;
		const onPointerDown = function(event) {
			if (root && !root.contains(event.target)) props.onClose(false);
		};
		panel.addEventListener("pointerdown", onPointerDown, true);
		return function() { panel.removeEventListener("pointerdown", onPointerDown, true); };
	}, [props.onClose]);

	useLayoutEffect(function() {
		const root = rootRef.current;
		if (!root) return;
		const day = root.closest(".dss-tl-day");
		const body = root.closest(".dss-body");
		if (!day || !body) return;
		const dayRect = day.getBoundingClientRect();
		const bodyRect = body.getBoundingClientRect();
		const band = day.querySelector(".dss-tl-band");
		const anchor = props.opener && props.opener.isConnected
			? props.opener.getBoundingClientRect()
			: band ? band.getBoundingClientRect() : null;
		const maxHeight = Math.max(120, Math.min(420, bodyRect.height - 24));
		const width = root.offsetWidth;
		const height = Math.min(root.offsetHeight, maxHeight);
		const x = anchor ? anchor.left + anchor.width / 2 - dayRect.left : dayRect.width / 2;
		const left = Math.min(Math.max(8, x - width / 2), Math.max(8, dayRect.width - width - 8));
		let top = anchor ? anchor.bottom - dayRect.top + 12 : 12;
		const bodyBottom = bodyRect.bottom - dayRect.top;
		if (top + height > bodyBottom - 8 && anchor) {
			const above = anchor.top - dayRect.top - height - 12;
			if (above >= 8) top = above;
		}
		top = Math.max(8, Math.min(top, Math.max(8, bodyBottom - height - 8)));
		setPos({ left: left, top: top, maxHeight: maxHeight, ready: true });
	}, [props.slot, props.model, props.opener]);

	const detail = timelineSlotDetail(props.model, props.slot);
	const title = clock(props.slot) + "–" + clock(props.slot + 1);
	const footer = [
		t("tl.total"),
		fmtDuration(detail.total.ms),
		fmtTokens(detail.total.tokens) + " Token",
		fmtCostSummary(detail.total.cost, t)
	];
	if (detail.parallel > 1) footer.push(t("tl.parallel").replace("%d", String(detail.parallel)));

	return e("div", {
		ref: rootRef,
		className: "dss-tl-pop",
		role: "dialog",
		tabIndex: -1,
		"aria-label": t("tl.detail").replace("%s", title),
		style: { left: pos.left + "px", top: pos.top + "px", maxHeight: pos.maxHeight + "px", visibility: pos.ready ? "visible" : "hidden" }
	},
		e("div", { className: "dss-tl-pop-h" },
			e("b", null, title),
			e("span", { className: "dss-tl-pop-date" }, dayLabel(props.date, t)),
			e("button", {
				type: "button",
				className: "dss-tl-pop-close",
				"data-action": "tl-pop-close",
				"aria-label": t("tl.closeDetail"),
				onClick: function() { props.onClose(true); }
			}, e("span", { "aria-hidden": "true" }, "×"))
		),
		detail.projects.map(function(group) {
			return e("div", { key: group.projectId, className: "dss-tl-pop-p" },
				e("div", { className: "dss-tl-pop-pr" },
					e("i", { className: "dss-pdot", "data-color": String(group.colorIndex) }),
					e("span", { className: "dss-tl-name", title: group.name }, group.name),
					e("span", { className: "dss-tl-v" }, fmtDuration(group.ms)),
					e("span", { className: "dss-tl-v is-cost" }, fmtCostSummary(group.cost, t))
				),
				group.sessions.map(function(row) {
					const name = row.title || t("w.untitled");
					return e("button", {
						key: row.id == null ? name : row.id,
						type: "button",
						className: "dss-tl-pop-s",
						"data-action": "tl-pop-session",
						"data-session-id": row.id == null ? undefined : row.id,
						title: t("openSession") + ": " + name,
						"aria-label": t("openSession") + ": " + name,
						onClick: function() { props.onClose(false); props.onOpenSession(row.session); }
					},
						e("span", { className: "dss-tl-name" },
							row.subagent ? e("span", { className: "dss-tag" }, t("w.subagentTag")) : null,
							e("span", null, name)
						),
						e("span", { className: "dss-tl-v" }, fmtDuration(row.ms)),
						e("span", { className: "dss-tl-v" }, fmtTokens(row.tokens)),
						e("span", { className: "dss-tl-v is-cost" }, fmtCostSummary(row.cost, t))
					);
				}),
				group.moreSessions > 0 ? e("div", { className: "dss-tl-more" }, t("tl.moreSessions").replace("%d", String(group.moreSessions))) : null
			);
		}),
		detail.moreProjects > 0 ? e("div", { className: "dss-tl-more" }, t("tl.moreProjects").replace("%d", String(detail.moreProjects))) : null,
		e("div", { className: "dss-tl-pop-f" }, footer.join(" · "))
	);
}

function useTimelineColumns(ref) {
	const [columns, setColumns] = useState(48);
	useEffect(function() {
		if (typeof ResizeObserver === "undefined") return undefined;
		const root = ref.current;
		const panel = root && typeof root.closest === "function" ? root.closest(".dss-panel") : null;
		if (!panel) return undefined;
		const update = function() {
			const width = panel.getBoundingClientRect().width;
			if (width > 0) setColumns(width <= 640 ? 24 : 48);
		};
		update();
		const observer = new ResizeObserver(update);
		observer.observe(panel);
		window.addEventListener("resize", update);
		return function() {
			observer.disconnect();
			window.removeEventListener("resize", update);
		};
	}, []);
	return columns;
}

function rangeText(summary, t) {
	const from = summary.from || "";
	const to = summary.to || "";
	const full = from.slice(0, 4) !== to.slice(0, 4);
	const fromText = from ? (full ? from : from.slice(5)) : "—";
	const toText = to ? (full ? to : to.slice(5)) : "—";
	return t("tl.rangeValue").replace("%s", fromText).replace("%s", toText);
}

function TimelineRange(props) {
	const t = props.t;
	const prefs = props.prefs;
	const setPrefs = props.setPrefs;
	const rootRef = useRef(null);
	const columns = useTimelineColumns(rootRef);
	const [page, setPage] = useState(0);
	const jumpNonce = useRef(0);
	const today = localDayKey(Date.now());
	const dayCosts = useMemo(function() {
		return dayCostSummaries(props.allProjects || [], props.hidden);
	}, [props.allProjects, props.hidden]);
	const model = useMemo(function() {
		return timelineRangeModel({
			days: props.timeline.days || [],
			hidden: props.hidden,
			today: today,
			page: page,
			activeOnly: prefs.activeOnly,
			columns: columns,
			dayCosts: dayCosts,
			colorIndexes: props.colorIndexes
		});
	}, [props.timeline, props.hidden, today, page, prefs.activeOnly, columns, dayCosts, props.colorIndexes]);
	useEffect(function() { setPage(0); }, [prefs.activeOnly]);
	useEffect(function() {
		setPage(function(current) { return Math.min(current, model.pageCount - 1); });
	}, [props.hiddenKey, model.pageCount]);

	const per = 48 / columns;
	const now = new Date(Date.now() + 8 * 3600000);
	const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
	const nowColumn = Math.floor(nowMinutes / (per * 30));
	const profileMax = Math.max(1, Math.max.apply(null, model.profile));
	const peakStart = model.peak == null ? null : clock(model.peak * per);
	const profileAria = peakStart == null
		? t("tl.profile")
		: t("tl.profile") + " · " + t("tl.profilePeak").replace("%s", peakStart);
	const profileBars = model.profile.map(function(value, index) {
		if (!(value > 0)) return null;
		return e("i", {
			key: index,
			className: "dss-mx-prof-bar" + (model.peak === index ? " is-peak" : ""),
			style: {
				left: "calc(" + index + " * (100% + 2px) / " + columns + ")",
				width: "calc((100% + 2px) / " + columns + " - 2px)",
				height: Math.max(2, value / profileMax * 100).toFixed(1) + "%"
			}
		});
	});
	const weekdayOf = function(date) {
		return t("w.weekdays").split(",")[new Date(date + "T00:00:00Z").getUTCDay()];
	};
	const dailyTip = function(row) {
		const projects = row.projects.slice().sort(function(a, b) {
			return (b.ms - a.ms) || String(a.projectId).localeCompare(String(b.projectId));
		});
		const rows = [
			[t("w.duration"), fmtDuration(row.total)],
			[t("tl.cost"), fmtCostSummary(row.cost, t)]
		];
		projects.slice(0, 8).forEach(function(project) { rows.push([project.name, fmtDuration(project.ms)]); });
		if (projects.length > 8) {
			const rest = projects.slice(8).reduce(function(total, project) { return total + project.ms; }, 0);
			rows.push([t("tl.moreProjects").replace("%d", String(projects.length - 8)), fmtDuration(rest)]);
		}
		return tipRows(row.date + " " + t("w.dayPrefix") + weekdayOf(row.date), rows);
	};
	const cellTip = function(row, cell, index) {
		const start = index * per;
		const end = start + per;
		const title = row.date.slice(5) + " " + t("w.dayPrefix") + weekdayOf(row.date) + " " + clock(start) + "–" + clock(end);
		if (!cell.level) return tipRows(title, [[t("tl.noActivity"), ""]]);
		const by = Object.entries(cell.by || {}).sort(function(a, b) {
			return (b[1] - a[1]) || String(a[0]).localeCompare(String(b[0]));
		});
		const names = new Map(row.projects.map(function(project) { return [project.projectId, project.name]; }));
		const rows = by.slice(0, 8).map(function(entry) { return [names.get(entry[0]) || entry[0], fmtDuration(entry[1])]; });
		if (by.length > 8) {
			const rest = by.slice(8).reduce(function(total, entry) { return total + entry[1]; }, 0);
			rows.push([t("tl.moreProjects").replace("%d", String(by.length - 8)), fmtDuration(rest)]);
		}
		return tipRows(title, rows);
	};
	const onCellsMove = function(ev, row) {
		const target = ev.target && typeof ev.target.closest === "function" ? ev.target.closest("i.dss-mx-cell") : null;
		if (!target) { hideTip(); return; }
		const index = Number(target.dataset.col);
		const cell = row.cells[index];
		if (!cell) return;
		showTipRaw(cellTip(row, cell, index), ev);
	};
	const onCellsClick = function(ev, row) {
		const target = ev.target && typeof ev.target.closest === "function" ? ev.target.closest("i.dss-mx-cell") : null;
		if (!target || target.dataset.level === "0") return;
		const day = (props.timeline.days || []).find(function(item) { return item.date === row.date; });
		const slot = timelineJumpSlot(day, props.hidden, Number(target.dataset.col), per);
		jumpNonce.current += 1;
		if (props.onJump) props.onJump({ date: row.date, slot: slot, nonce: jumpNonce.current });
		props.onSelectDate(row.date);
	};

	const rows = model.rows.map(function(row) {
		const weekday = weekdayOf(row.date);
		const dateText = row.date + " " + t("w.dayPrefix") + weekday;
		const aria = row.idle
			? dateText + " " + t("tl.noActivity")
			: dateText + " " + t("tl.openDay").replace("%s", fmtDuration(row.total));
		const colors = new Map(row.projects.map(function(project) { return [project.projectId, project.colorIndex]; }));
		const tip = tipProps(function() { return dailyTip(row); });
		const barWidth = row.idle ? "0" : "max(3px, " + (model.maxDay ? (row.total / model.maxDay * 100).toFixed(1) : "0") + "%)";
		return e("div", {
			key: row.date,
			className: "dss-mx-row is-day" + (row.idle ? " is-idle" : "") + (row.newWeek ? " is-week" : ""),
			"data-date": row.date
		},
			e("button", {
				type: "button",
				className: "dss-mx-date" + (row.weekend ? " is-weekend" : "") + (row.today ? " is-today" : ""),
				"data-action": "tl-goto-day",
				"data-date": row.date,
				disabled: row.idle,
				"aria-label": aria,
				onClick: function() { props.onSelectDate(row.date); },
				...tip
			}, row.date.slice(5), e("span", { className: "dss-mx-wd" }, " " + weekday)),
			e("div", {
				className: "dss-mx-cells",
				"aria-hidden": "true",
				onClick: function(ev) { onCellsClick(ev, row); },
				onMouseMove: function(ev) { onCellsMove(ev, row); },
				onMouseLeave: hideTip
			},
				row.cells.map(function(cell, index) {
					const isNow = row.today && index === nowColumn;
					const color = prefs.color === "project" && cell.dominant ? colors.get(cell.dominant) : null;
					return e("i", {
						key: index,
						className: "dss-mx-cell" + (isNow ? " is-now" : ""),
						"data-level": cell.level,
						"data-col": index,
						"data-color": color == null ? undefined : String(color)
					});
				})
			),
			e("div", { className: "dss-mx-tot", ...tip },
				e("span", { className: "dss-mx-bar" },
					e("span", { style: { width: barWidth } },
						row.projects.map(function(project) {
							return e("i", { key: project.projectId, "data-color": String(project.colorIndex), style: { flexGrow: Math.max(1, project.ms) } });
						})
					)
				),
				e("span", { className: "dss-mx-dur" }, row.idle ? "—" : fmtDuration(row.total))
			)
		);
	});

	const summary = model.summary;
	const summaryNode = e("div", { className: "dss-tl-sum" },
		e("span", null, t("tl.range"), e("b", null, rangeText(summary, t))),
		e("span", null, t("tl.activeOf"), e("b", null, t("tl.activeValue").replace("%d", String(summary.activeDays)).replace("%d", String(summary.spanDays)))),
		e("span", null, t("w.duration"), e("b", null, fmtDuration(summary.total))),
		e("span", null, t("tl.avg"), e("b", null, fmtDuration(summary.avg))),
		e("span", null, t("tl.cost"), e("b", { className: "dss-tl-sum-cost" }, fmtCostSummary(summary.cost, t))),
		e("span", null, t("tl.streak"), e("b", null, t("tl.days").replace("%d", String(summary.streak))))
	);
	const pager = e("div", { className: "dss-tl-pager" },
		e("span", { "aria-live": "polite" }, t("hint.timeline.page").replace("%d", String(model.currentPage + 1)).replace("%d", String(model.pageCount))),
		e("button", {
			type: "button",
			className: "dss-tool-btn",
			"data-action": "tl-newer",
			disabled: model.currentPage === 0,
			onClick: function() { setPage(Math.max(0, model.currentPage - 1)); }
		}, t("hint.timeline.newer")),
		e("button", {
			type: "button",
			className: "dss-tool-btn",
			"data-action": "tl-older",
			disabled: model.currentPage >= model.pageCount - 1,
			onClick: function() { setPage(Math.min(model.pageCount - 1, model.currentPage + 1)); }
		}, t("hint.timeline.older")),
		e("button", {
			type: "button",
			className: "dss-tool-btn",
			"data-action": "tl-latest",
			disabled: model.currentPage === 0,
			onClick: function() { setPage(0); }
		}, t("hint.timeline.showRecent"))
	);
	const controls = e("div", { className: "dss-tl-ctl" },
		e("div", { className: "dss-tl-ctl-inline" },
			e("span", { className: "dss-tl-ctl-k" }, t("tl.color")),
			e("div", { className: "dss-seg", role: "group", "aria-label": t("tl.color") },
				e("button", {
					type: "button",
					className: prefs.color === "level" ? "on" : "",
					"aria-pressed": prefs.color === "level",
					"data-action": "tl-color-level",
					onClick: function() { setPrefs({ color: "level" }); }
				}, t("tl.colorLevel")),
				e("button", {
					type: "button",
					className: prefs.color === "project" ? "on" : "",
					"aria-pressed": prefs.color === "project",
					"data-action": "tl-color-project",
					onClick: function() { setPrefs({ color: "project" }); }
				}, t("tl.colorProject"))
			)
		),
		e("label", { className: "dss-tl-check" },
			e("input", {
				id: "dss-tl-active-only",
				type: "checkbox",
				checked: prefs.activeOnly,
				onChange: function(ev) { setPrefs({ activeOnly: ev.target.checked }); }
			}),
			t("tl.activeOnly")
		),
		pager
	);
	const projectTotals = new Map();
	model.rows.forEach(function(row) {
		row.projects.forEach(function(project) {
			const current = projectTotals.get(project.projectId);
			if (current) current.ms += project.ms;
			else projectTotals.set(project.projectId, { projectId: project.projectId, name: project.name, colorIndex: project.colorIndex, ms: project.ms });
		});
	});
	const legendProjects = Array.from(projectTotals.values()).sort(function(a, b) {
		return (b.ms - a.ms) || String(a.projectId).localeCompare(String(b.projectId));
	});
	const legend = prefs.color === "level"
		? e("div", { className: "dss-tl-legend" },
			e("span", { className: "dss-tl-scale" },
				e("span", null, t("trends.less")),
				[1, 2, 3, 4].map(function(level) { return e("i", { key: level, className: "dss-mx-lg", "data-level": level }); }),
				e("span", null, t("trends.more"))
			),
			e("span", null, t("tl.cellUnit").replace("%s", columns === 24 ? t("tl.hour") : t("tl.halfHour"))),
			e("span", null, t("tl.clickDate"))
		)
		: e("div", { className: "dss-tl-legend" },
			legendProjects.slice(0, 8).map(function(project) {
				return e("span", { key: project.projectId, className: "dss-mx-proj" },
					e("i", { className: "dss-pdot", "data-color": String(project.colorIndex) }),
					project.name
				);
			}),
			legendProjects.length > 8 ? e("span", null, t("tl.moreProjects").replace("%d", String(legendProjects.length - 8))) : null,
			e("span", null, t("tl.cellDominant")),
			e("span", null, t("tl.clickDate"))
		);

	const head = e("div", { className: "dss-mx-row is-head" },
		e("div", { className: "dss-mx-k" }, t("tl.profile")),
		e("div", { className: "dss-mx-prof", role: "img", "aria-label": profileAria }, profileBars),
		e("div", { className: "dss-mx-side" }, peakStart == null ? null : t("tl.profilePeak").replace("%s", peakStart))
	);
	const axis = e("div", { className: "dss-mx-row is-axis", "aria-hidden": "true" },
		e("div", null),
		e("div", { className: "dss-mx-axis" },
			[0, 3, 6, 9, 12, 15, 18, 21, 24].map(function(hour, index) {
				const classes = ["dss-tl-tick"];
				if (hour === 0) classes.push("is-first");
				if (hour === 24) classes.push("is-last");
				if (index % 2 === 1) classes.push("is-odd");
				return e("span", {
					key: hour,
					className: classes.join(" "),
					style: { left: hour === 24 ? "100%" : "calc(" + (hour * columns / 24) + " * (100% + 2px) / " + columns + ")" }
				}, pad(hour));
			})
		),
		e("div", { className: "dss-mx-side" }, t("tl.dayTotal"))
	);

	return e("div", { className: "dss-tl", "data-mode": "all", ref: rootRef },
		summaryNode,
		controls,
		e("div", { className: "dss-mx", style: { "--n": String(columns) } }, head, axis, rows),
		legend
	);
}

module.exports = { TimelineView, TimelineDay, TimelineRange, SlotPopover };
