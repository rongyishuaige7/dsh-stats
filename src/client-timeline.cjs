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
	timelineSlotDetail
} = require("./client-timeline-model.cjs");
const { PageControls, pageRows } = require("./client-overview.cjs");
const { useLayer } = require("./client-dialog.cjs");
const { tipRows, showTipRaw, hideTip } = require("./client-tip.cjs");
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

function tipProps(getHtml) {
	const show = function(ev) {
		if (!ev) return;
		let x = ev.clientX;
		let y = ev.clientY;
		if ((ev.type === "focus" || ev.type === "focusin") && ev.currentTarget && typeof ev.currentTarget.getBoundingClientRect === "function") {
			const rect = ev.currentTarget.getBoundingClientRect();
			x = rect.left + rect.width / 2;
			y = rect.bottom;
		}
		showTipRaw(getHtml(), { clientX: x, clientY: y });
	};
	return {
		onMouseEnter: show,
		onMouseMove: show,
		onMouseLeave: hideTip,
		onFocus: show,
		onBlur: hideTip
	};
}

function TimelineView(props) {
	const [jump, setJump] = useState(null);
	if (props.date == null) {
		const Legacy = props.legacyAll;
		return Legacy ? e(Legacy, {
			timeline: props.timeline,
			hidden: props.hidden,
			filterKey: props.date,
			tt: props.t
		}) : null;
	}
	return e(TimelineDay, Object.assign({}, props, {
		jump: jump,
		onJump: setJump,
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
		setPop({ slot: props.jump.slot, opener: null });
		if (props.onJumpConsumed) props.onJumpConsumed();
	}, [props.jump, date]);

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
					return tipRows(range + " · " + t("tl.halfHour"), [
						[isCost ? t("tl.metricCost") : t("tl.metricToken"), valueText],
						partial ? ["*", t("tl.partial")] : null
					].filter(Boolean));
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
				return e("i", { key: opacity, style: { "--o": opacity } });
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

module.exports = { TimelineView, TimelineDay, SlotPopover, tipProps };
