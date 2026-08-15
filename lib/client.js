window.__ModuleLoader__.load({
	id: "@rongyi7/dsh-stats",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		// src/client.cjs
		var react = require("react");
		var primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		var e = react.createElement;
		var useState = react.useState;
		var useMemo = react.useMemo;
		var useEffect = react.useEffect;
		var Fragment = react.Fragment;
		var Tooltip = primitives.Tooltip;
		var IconDataOutline16 = primitives.IconDataOutline16;
		var IconCloseOutline16 = primitives.IconCloseOutline16;
		function fmtTokens(n) {
		  if (n == null) return "\u2014";
		  var scaled = (v) => v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
		  if (n < 1e3) return String(Math.round(n));
		  if (n < 1e6) return `${scaled(n / 1e3)}K`;
		  return `${scaled(n / 1e6)}M`;
		}
		function fmtDuration(ms) {
		  if (ms == null || ms <= 0) return "\u2014";
		  var s = ms / 1e3;
		  if (s < 60) return `${Math.round(s * 10) / 10}s`;
		  var whole = Math.round(s);
		  var h = Math.floor(whole / 3600);
		  var m = Math.floor(whole % 3600 / 60);
		  var sec = whole % 60;
		  if (h > 0) return `${h}h${m}m`;
		  return `${m}m${sec}s`;
		}
		function fmtClock(ms) {
		  if (ms == null) return "\u2014";
		  var d = new Date(ms);
		  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
		}
		function pad(n) {
		  return String(n).padStart(2, "0");
		}
		function fmtTps(tps) {
		  return tps == null ? "\u2014" : `${tps >= 100 ? Math.round(tps) : tps.toFixed(1)} tok/s`;
		}
		function fmtPct(p) {
		  return p == null ? "\u2014" : `${p}%`;
		}
		function fmtN(n) {
		  return n == null ? "\u2014" : n.toLocaleString("en-US");
		}
		function esc(s) {
		  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
		}
		function statLine(st, t) {
		  var parts = [];
		  parts.push(`${fmtN(st.turns)} ${t("w.turns")} \xB7 ${fmtN(st.steps)} ${t("w.steps")}`);
		  var dur = [];
		  if (st.llmMs > 0) dur.push(`LLM ${fmtDuration(st.llmMs)}`);
		  if (st.toolMs > 0) dur.push(`${t("w.tool")} ${fmtDuration(st.toolMs)}`);
		  if (dur.length) parts.push(dur.join(" \xB7 "));
		  var spd = [];
		  if (st.ttftAvgMs != null) spd.push(`${t("w.ttft")} ${fmtDuration(st.ttftAvgMs)}`);
		  if (st.tps != null) spd.push(fmtTps(st.tps));
		  if (spd.length) parts.push(spd.join(" \xB7 "));
		  if (st.cacheHitPct != null) parts.push(`${t("w.cacheHit")} ${fmtPct(st.cacheHitPct)}`);
		  parts.push(`${t("w.input")} ${fmtTokens(st.inputTokens)} tok \xB7 ${t("w.output")} ${fmtTokens(st.outputTokens)} tok`);
		  return parts.join(" | ");
		}
		var PRICING = {
		  "deepseek-v4-pro": {
		    label: "DeepSeek V4 Pro",
		    legacy: { hit: 0.025, miss: 3, out: 6 },
		    v0817: {
		      offPeak: { hit: 0.15, miss: 4.5, out: 13.5 },
		      peak: { hit: 0.3, miss: 9, out: 27 }
		    }
		  },
		  "deepseek-v4-flash": {
		    label: "DeepSeek V4 Flash",
		    legacy: { hit: 0.02, miss: 1, out: 2 },
		    v0817: {
		      offPeak: { hit: 0.05, miss: 1.5, out: 4.5 },
		      peak: { hit: 0.1, miss: 3, out: 9 }
		    }
		  }
		};
		function costOf(stats, price) {
		  var miss = (stats.uncached + stats.cacheWrite) * price.miss / 1e6;
		  var hit = stats.cacheRead * price.hit / 1e6;
		  var out = stats.output * price.out / 1e6;
		  return miss + hit + out;
		}
		function fmtCost(rmb) {
		  if (rmb == null || isNaN(rmb) || rmb <= 0) return "\xA50";
		  if (rmb >= 1e3) return "\xA5" + rmb.toFixed(0);
		  if (rmb >= 0.01) return "\xA5" + rmb.toFixed(2);
		  return "\xA5" + rmb.toFixed(4);
		}
		function isPeakMinutes(minOfDay) {
		  return minOfDay >= 9 * 60 && minOfDay < 12 * 60 || minOfDay >= 14 * 60 && minOfDay < 18 * 60;
		}
		var PRICE_CHANGE_AT = Date.parse("2026-08-17T00:00:00+08:00");
		var SLOT_MS = 30 * 60 * 1e3;
		function priceForSlot(slotIdx, m) {
		  var t = slotIdx * SLOT_MS;
		  if (t < PRICE_CHANGE_AT) return m.legacy;
		  var bj = new Date(t + 8 * 3600 * 1e3);
		  var min = bj.getUTCHours() * 60 + bj.getUTCMinutes();
		  return isPeakMinutes(min) ? m.v0817.peak : m.v0817.offPeak;
		}
		function sessionCost(s) {
		  var m = PRICING[s.model || "deepseek-v4-pro"] || PRICING["deepseek-v4-pro"];
		  if (s.slotUsage && s.slotUsage.length) {
		    var total = 0;
		    for (var i = 0; i < s.slotUsage.length; i++) {
		      var su = s.slotUsage[i];
		      var price = priceForSlot(su.slot, m);
		      total += (su.uncached + su.cacheWrite) * price.miss / 1e6 + su.cacheRead * price.hit / 1e6 + su.output * price.out / 1e6;
		    }
		    return total;
		  }
		  var price = s.updatedAt != null && s.updatedAt < PRICE_CHANGE_AT ? m.legacy : m.v0817.offPeak;
		  return costOf(s.stats, price);
		}
		function projectCost(p) {
		  var total = 0;
		  for (var i = 0; i < p.sessions.length; i++) total += sessionCost(p.sessions[i]);
		  return total;
		}
		function sumSessionStats(sessions) {
		  var raw = { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
		  sessions.forEach((s) => {
		    var st = s.stats;
		    raw.turns += st.turns;
		    raw.steps += st.steps;
		    raw.llmMs += st.llmMs;
		    raw.toolMs += st.toolMs;
		    raw.ttftMs += st.ttftMs;
		    raw.ttftSteps += st.ttftSteps;
		    raw.decodeMs += st.decodeMs;
		    raw.decodeTokens += st.decodeTokens;
		    raw.uncached += st.uncached;
		    raw.output += st.output;
		    raw.cacheRead += st.cacheRead;
		    raw.cacheWrite += st.cacheWrite;
		  });
		  return display(raw);
		}
		function applyRange(projects, range) {
		  if (range === "all") return projects;
		  var maxUpdated = 0;
		  projects.forEach((p) => p.sessions.forEach((s) => {
		    if (s.updatedAt != null && s.updatedAt > maxUpdated) maxUpdated = s.updatedAt;
		  }));
		  if (!maxUpdated) return projects;
		  var cutoff = maxUpdated - (range - 1) * 864e5;
		  return projects.map((p) => {
		    var sessions = p.sessions.filter((s) => s.updatedAt != null && s.updatedAt >= cutoff);
		    if (!sessions.length) return { ...p, sessions: [], sessionCount: 0, lastActiveAt: null, stats: display({ turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0 }) };
		    return { ...p, sessions, sessionCount: sessions.length, stats: sumSessionStats(sessions) };
		  });
		}
		function loadPref(key, def) {
		  try {
		    var v = localStorage.getItem("dsh-stats." + key);
		    return v == null ? def : JSON.parse(v);
		  } catch (err) {
		    return def;
		  }
		}
		function savePref(key, val) {
		  try {
		    localStorage.setItem("dsh-stats." + key, JSON.stringify(val));
		  } catch (err) {
		  }
		}
		function usePref(key, def) {
		  var pair = useState(() => loadPref(key, def));
		  var val = pair[0], setVal = pair[1];
		  useEffect(() => {
		    savePref(key, val);
		  }, [key, val]);
		  return [val, setVal];
		}
		function rawOf(s) {
		  var pv = s.projectionValues || {};
		  var b = pv.tokenUsage ? pv.tokenUsage.totals || pv.tokenUsage : {};
		  var st = pv.sessionStats || {};
		  return {
		    turns: st.turns || 0,
		    steps: st.steps || 0,
		    llmMs: st.llmMs || 0,
		    toolMs: st.toolMs || 0,
		    ttftMs: st.ttftMs || 0,
		    ttftSteps: st.ttftSteps || 0,
		    decodeMs: st.decodeMs || 0,
		    decodeTokens: st.decodeTokens || 0,
		    uncached: b.uncachedInputTokens || 0,
		    output: b.outputTokens || 0,
		    cacheRead: b.cacheReadTokens || 0,
		    cacheWrite: b.cacheWriteTokens || 0
		  };
		}
		function display(raw) {
		  var input = raw.uncached + raw.cacheRead + raw.cacheWrite;
		  return {
		    turns: raw.turns,
		    steps: raw.steps,
		    llmMs: raw.llmMs,
		    toolMs: raw.toolMs,
		    ttftMs: raw.ttftMs,
		    ttftSteps: raw.ttftSteps,
		    decodeMs: raw.decodeMs,
		    decodeTokens: raw.decodeTokens,
		    uncached: raw.uncached,
		    output: raw.output,
		    cacheRead: raw.cacheRead,
		    cacheWrite: raw.cacheWrite,
		    inputTokens: input,
		    outputTokens: raw.output,
		    cacheHitPct: input > 0 ? Math.round(raw.cacheRead / input * 100) : null,
		    tps: raw.decodeMs > 0 ? raw.decodeTokens / (raw.decodeMs / 1e3) : null,
		    ttftAvgMs: raw.ttftSteps > 0 ? raw.ttftMs / raw.ttftSteps : null
		  };
		}
		function emptyRaw() {
		  return { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
		}
		function addRaw(a, b) {
		  a.turns += b.turns;
		  a.steps += b.steps;
		  a.llmMs += b.llmMs;
		  a.toolMs += b.toolMs;
		  a.ttftMs += b.ttftMs;
		  a.ttftSteps += b.ttftSteps;
		  a.decodeMs += b.decodeMs;
		  a.decodeTokens += b.decodeTokens;
		  a.uncached += b.uncached;
		  a.output += b.output;
		  a.cacheRead += b.cacheRead;
		  a.cacheWrite += b.cacheWrite;
		}
		function basename(p) {
		  return (p || "").replace(/[/\\]+$/, "").split(/[/\\]/).pop() || "";
		}
		function aggregate(sessionSummaries, workspaceItems, t) {
		  var byId = /* @__PURE__ */ new Map();
		  sessionSummaries.forEach((s) => byId.set(s.id, s));
		  var projects = [];
		  var accounted = /* @__PURE__ */ new Set();
		  (workspaceItems || []).forEach((ws) => {
		    var members = [];
		    (ws.sessionIds || []).forEach((id) => {
		      var s = byId.get(id);
		      if (s) {
		        accounted.add(id);
		        members.push(s);
		      }
		    });
		    var agg = emptyRaw();
		    var sessions = [];
		    var lastActiveAt = null;
		    members.forEach((s) => {
		      var raw = rawOf(s);
		      addRaw(agg, raw);
		      sessions.push({
		        id: s.id,
		        title: s.title || s.displayTitle || null,
		        updatedAt: s.updatedAt || null,
		        stats: display(raw),
		        durMs: raw.llmMs + raw.toolMs
		      });
		      if (s.updatedAt != null && (lastActiveAt == null || s.updatedAt > lastActiveAt)) lastActiveAt = s.updatedAt;
		    });
		    sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
		    projects.push({
		      id: ws.workspaceId || "ws-" + (ws.path || ""),
		      name: ws.title || basename(ws.path) || t("w.unnamed"),
		      path: ws.path || "",
		      sessionCount: sessions.length,
		      lastActiveAt,
		      stats: display(agg),
		      sessions
		    });
		  });
		  var strayByCwd = /* @__PURE__ */ new Map();
		  sessionSummaries.forEach((s) => {
		    if (accounted.has(s.id)) return;
		    var cwd = s.cwd || t("w.uncategorized");
		    if (!strayByCwd.has(cwd)) strayByCwd.set(cwd, []);
		    strayByCwd.get(cwd).push(s);
		  });
		  strayByCwd.forEach((members, cwd) => {
		    var agg = emptyRaw();
		    var sessions = [];
		    var lastActiveAt = null;
		    members.forEach((s) => {
		      var raw = rawOf(s);
		      addRaw(agg, raw);
		      sessions.push({ id: s.id, title: s.title || s.displayTitle || null, updatedAt: s.updatedAt || null, stats: display(raw), durMs: raw.llmMs + raw.toolMs });
		      if (s.updatedAt != null && (lastActiveAt == null || s.updatedAt > lastActiveAt)) lastActiveAt = s.updatedAt;
		    });
		    sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
		    projects.push({ id: "cwd-" + cwd, name: cwd === t("w.uncategorized") ? cwd : basename(cwd), path: cwd, sessionCount: sessions.length, lastActiveAt, stats: display(agg), sessions });
		  });
		  projects.sort((a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0));
		  return projects;
		}
		function dayKey(ms) {
		  var d = new Date(ms);
		  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
		}
		function dayStartMs(key) {
		  return (/* @__PURE__ */ new Date(key + "T00:00:00+08:00")).getTime();
		}
		function buildTimeline(projects, slotMinutes) {
		  var slotMs = slotMinutes * 6e4;
		  var daysMap = /* @__PURE__ */ new Map();
		  var projectIndex = /* @__PURE__ */ new Map();
		  projects.forEach((p, i) => projectIndex.set(p.id, i));
		  projects.forEach((p) => {
		    p.sessions.forEach((s) => {
		      if (!s.durMs || !s.updatedAt) return;
		      var end = s.updatedAt;
		      var start = end - s.durMs;
		      var startSlot = Math.floor(start / slotMs);
		      var endSlot = Math.floor(end / slotMs);
		      for (var k = startSlot; k <= endSlot; k++) {
		        var overlap = Math.min(end, (k + 1) * slotMs) - Math.max(start, k * slotMs);
		        if (overlap <= 0) continue;
		        var date = dayKey(k * slotMs);
		        var day = daysMap.get(date);
		        if (!day) {
		          day = { date, dayTotalMs: 0, slotBlocks: [] };
		          daysMap.set(date, day);
		        }
		        day.dayTotalMs += overlap;
		        day.slotBlocks.push({
		          slot: Math.floor((k * slotMs - dayStartMs(date)) / slotMs),
		          projectId: p.id,
		          name: p.name,
		          colorIndex: projectIndex.get(p.id),
		          ms: overlap
		        });
		      }
		    });
		  });
		  var days = [...daysMap.values()].sort((a, b) => a.date < b.date ? -1 : 1);
		  days.forEach((d) => d.slotBlocks.sort((a, b) => a.slot - b.slot));
		  return { days };
		}
		function createOpenStore() {
		  var state = { open: false };
		  var listeners = /* @__PURE__ */ new Set();
		  return {
		    getSnapshot: () => state,
		    subscribe: (fn) => {
		      listeners.add(fn);
		      return () => listeners.delete(fn);
		    },
		    open: () => {
		      state = { open: true };
		      listeners.forEach((fn) => fn());
		    },
		    close: () => {
		      state = { open: false };
		      listeners.forEach((fn) => fn());
		    }
		  };
		}
		var CSS_ID = "@rongyi7/dsh-stats/styles.css";
		var css = ".dss-overlay{position:fixed;inset:0;z-index:1000;background:rgba(10,12,16,.55);display:flex;align-items:flex-start;justify-content:center;padding:4vh 3vw;overflow:auto}.dss-panel{width:min(1180px,100%);background:var(--dsw-specific-menu,#161a21);border:1px solid var(--dsw-alias-border-inverted,#2a303c);border-radius:16px;box-shadow:var(--dsw-shadow-lv3,0 20px 60px rgba(0,0,0,.5));color:var(--dsw-alias-label-primary,#e7eaf0);display:flex;flex-direction:column;overflow:hidden}.dss-head{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--dsw-alias-border,#2a303c)}.dss-head h2{margin:0;font-size:15px;font-weight:650;flex:1}.dss-tabs{display:flex;gap:4px}.dss-tabs button{background:none;border:none;color:var(--dsw-alias-label-secondary,#a6adbb);font-size:13px;padding:6px 12px;border-radius:8px;cursor:pointer}.dss-tabs button.on{background:rgba(79,140,255,.14);color:var(--dsw-alias-label-primary,#e7eaf0);font-weight:600}.dss-close{background:none;border:none;color:var(--dsw-alias-label-secondary,#a6adbb);cursor:pointer;border-radius:8px;width:28px;height:28px;display:grid;place-items:center}.dss-close:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))}.dss-export{background:none;border:1px solid var(--dsw-alias-border,#2a303c);color:var(--dsw-alias-label-secondary,#a6adbb);cursor:pointer;border-radius:7px;padding:3px 8px;font-size:11.5px}.dss-export:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#e7eaf0)}.dss-table th.sortable{cursor:pointer;user-select:none}.dss-table th.sortable:hover{color:var(--dsw-alias-label-primary,#e7eaf0)}.dss-body{padding:16px 18px;overflow:auto}.dss-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:14px}.dss-card{background:var(--dsw-specific-menu,#1d222c);border:1px solid var(--dsw-alias-border,#2a303c);border-radius:11px;padding:11px 13px}.dss-card .k{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:12px}.dss-card .v{font-size:18px;font-weight:650;font-variant-numeric:tabular-nums}.dss-legend{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px}.dss-chip{display:inline-flex;align-items:center;gap:7px;background:var(--dsw-specific-menu,#1d222c);border:1px solid var(--dsw-alias-border,#2a303c);border-radius:999px;padding:4px 11px;cursor:pointer;font-size:12.5px;color:var(--dsw-alias-label-secondary,#a6adbb);user-select:none}.dss-chip .sw{width:10px;height:10px;border-radius:3px;background:var(--c)}.dss-chip.off{opacity:.4}.dss-table{width:100%;border-collapse:collapse;font-size:12.5px}.dss-table th{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.3px;text-align:right;padding:7px 10px;border-bottom:1px solid var(--dsw-alias-border,#2a303c);white-space:nowrap}.dss-table th:first-child{text-align:left}.dss-table td{padding:8px 10px;text-align:right;border-bottom:1px solid var(--dsw-alias-border,#2a303c);font-variant-numeric:tabular-nums;white-space:nowrap}.dss-table td:first-child{text-align:left}.dss-table tr.prow{cursor:pointer}.dss-table tr.prow:hover td{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.04))}.dss-table tr.sel td{background:rgba(79,140,255,.12)}.dss-statline{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:11.5px;font-variant-numeric:tabular-nums}.dss-proj{display:flex;align-items:center;gap:8px}.dss-proj .dot{width:9px;height:9px;border-radius:3px;background:var(--c);flex:none}.dss-proj .nm{font-weight:600;color:var(--dsw-alias-label-primary,#e7eaf0)}.dss-proj .ph{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:11px}.dss-detail{margin-top:12px;border-top:1px solid var(--dsw-alias-border,#2a303c);padding-top:10px}.dss-sess{display:flex;align-items:center;gap:12px;padding:8px 10px;border-bottom:1px solid var(--dsw-alias-border,#2a303c);font-size:12.5px}.dss-sess .ti{font-weight:600;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dss-sess .me{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:11.5px}.dss-sess .st{color:var(--dsw-alias-label-secondary,#a6adbb);font-variant-numeric:tabular-nums}.dss-hint{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:11.5px;margin-bottom:10px}.dss-heat{display:flex;align-items:center;gap:3px;overflow-x:auto;padding-bottom:8px;margin-bottom:4px}.dss-hm{width:14px;height:14px;border-radius:4px;flex:none;background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));border:1px solid var(--dsw-alias-border,#2a303c)}.dss-hm.has{cursor:pointer}.dss-hm.has:hover{outline:1.5px solid #4f8cff;outline-offset:1px}.dss-axis{display:grid;grid-template-columns:120px 1fr 70px;margin-bottom:4px}.dss-hours{display:grid;grid-template-columns:repeat(8,1fr);color:var(--dsw-alias-label-tertiary,#6b7280);font-size:10.5px}.dss-day{display:grid;grid-template-columns:120px 1fr 70px;align-items:stretch;border-bottom:1px solid var(--dsw-alias-border,#2a303c);min-height:56px}.dss-day .date{font-size:12px;color:var(--dsw-alias-label-secondary,#a6adbb);padding:8px 8px 8px 0;font-variant-numeric:tabular-nums}.dss-track{display:grid;grid-template-columns:repeat(48,1fr);margin:4px 0}.dss-cell{position:relative;min-width:0;border-right:1px solid var(--dsw-alias-border,#2a303c);display:flex;flex-direction:column;justify-content:flex-end;gap:1px}.dss-cell:last-child{border-right:none}.dss-blk{width:100%;border-radius:2px;background:var(--c);cursor:pointer}.dss-blk:hover{filter:brightness(1.25)}.dss-day .total{font-size:11px;color:var(--dsw-alias-label-tertiary,#6b7280);text-align:right;align-self:center;padding:8px 0 8px 8px;font-variant-numeric:tabular-nums}.dss-empty{color:var(--dsw-alias-label-tertiary,#6b7280);text-align:center;padding:32px 0}.dss-tt{background:var(--dsw-specific-menu,#1d222c);border:1px solid var(--dsw-alias-border,#2a303c);border-radius:9px;padding:8px 11px;box-shadow:0 8px 24px rgba(0,0,0,.45);font-size:12.5px;position:fixed;z-index:2000;pointer-events:none;display:none;max-width:320px}.dss-tt.show{display:block}.dss-pricing{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px;font-size:12.5px;color:var(--dsw-alias-label-secondary,#a6adbb)}.dss-pricing select{background:var(--dsw-specific-menu,#1d222c);border:1px solid var(--dsw-alias-border,#2a303c);color:var(--dsw-alias-label-primary,#e7eaf0);border-radius:7px;padding:4px 8px;font-size:12.5px}.dss-pricing .note{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:11.5px}.dss-cost{font-variant-numeric:tabular-nums;font-weight:600;color:var(--dsw-alias-label-primary,#e7eaf0)}[data-color='0']{--c:#4f8cff}[data-color='1']{--c:#34d399}[data-color='2']{--c:#fbbf24}[data-color='3']{--c:#f472b6}[data-color='4']{--c:#a78bfa}[data-color='5']{--c:#22d3ee}[data-color='6']{--c:#fb923c}[data-color='7']{--c:#e879f9}[data-color='8']{--c:#a3e635}";
		function StatsTrigger(props) {
		  var wide = props.wide;
		  var t = props.t;
		  var onOpen = props.onOpen;
		  return e(
		    "button",
		    {
		      className: "dss-trigger",
		      onClick: () => onOpen(),
		      title: t("trigger"),
		      style: {
		        background: "none",
		        border: "none",
		        cursor: "pointer",
		        color: "var(--dsw-alias-label-secondary,#a6adbb)",
		        borderRadius: "999px",
		        display: "inline-flex",
		        alignItems: "center",
		        gap: "6px",
		        padding: "6px 10px",
		        fontSize: "13px"
		      }
		    },
		    e(IconDataOutline16, { size: wide ? 16 : 18 }),
		    wide ? e("span", null, t("trigger")) : null
		  );
		}
		function SummaryCards(props) {
		  var projects = props.projects;
		  var t = props.t;
		  var tot = { sessions: 0, turns: 0, steps: 0, llmMs: 0, toolMs: 0, input: 0, output: 0, cacheRead: 0, cost: 0 };
		  projects.forEach((p) => {
		    tot.sessions += p.sessionCount;
		    tot.turns += p.stats.turns;
		    tot.steps += p.stats.steps;
		    tot.llmMs += p.stats.llmMs;
		    tot.toolMs += p.stats.toolMs;
		    tot.input += p.stats.inputTokens;
		    tot.output += p.stats.outputTokens;
		    tot.cacheRead += p.stats.cacheRead;
		    tot.cost += projectCost(p);
		  });
		  var cards = [
		    [t("card.projects"), fmtN(projects.length)],
		    [t("card.sessions"), fmtN(tot.sessions)],
		    [t("card.turnsSteps"), `${fmtN(tot.turns)} / ${fmtN(tot.steps)}`],
		    [t("card.llm"), fmtDuration(tot.llmMs)],
		    [t("card.tool"), fmtDuration(tot.toolMs)],
		    [t("card.input"), fmtTokens(tot.input)],
		    [t("card.output"), fmtTokens(tot.output)],
		    [t("card.cacheHit"), tot.input > 0 ? fmtPct(Math.round(tot.cacheRead / tot.input * 100)) : "\u2014"],
		    [t("card.cost"), fmtCost(tot.cost)]
		  ];
		  return e(
		    "div",
		    { className: "dss-cards" },
		    cards.map((c, i) => e(
		      "div",
		      { className: "dss-card", key: i },
		      e("div", { className: "k" }, c[0]),
		      e("div", { className: "v", ...c[0] === t("card.cost") ? { className: "v dss-cost" } : {} }, c[1])
		    ))
		  );
		}
		function Legend(props) {
		  var projects = props.projects;
		  var hidden = props.hidden;
		  var onToggle = props.onToggle;
		  return e(
		    "div",
		    { className: "dss-legend" },
		    projects.map(
		      (p, i) => e(
		        "span",
		        {
		          key: p.id,
		          className: "dss-chip" + (hidden[p.id] ? " off" : ""),
		          "data-color": String(i),
		          onClick: () => onToggle(p.id)
		        },
		        e("span", { className: "sw" }),
		        p.name
		      )
		    )
		  );
		}
		function sortValue(p, key) {
		  switch (key) {
		    case "cost":
		      return projectCost(p);
		    case "input":
		      return p.stats.inputTokens;
		    case "output":
		      return p.stats.outputTokens;
		    case "turns":
		      return p.stats.turns;
		    case "steps":
		      return p.stats.steps;
		    case "llm":
		      return p.stats.llmMs;
		    case "tool":
		      return p.stats.toolMs;
		    case "sessions":
		      return p.sessionCount;
		    case "hit":
		      return p.stats.cacheHitPct == null ? -1 : p.stats.cacheHitPct;
		    default:
		      return 0;
		  }
		}
		function ProjectsTable(props) {
		  var projects = props.projects;
		  var hidden = props.hidden;
		  var selected = props.selected;
		  var onSelect = props.onSelect;
		  var t = props.t;
		  var sortPair = useState({ key: "cost", dir: -1 });
		  var sort = sortPair[0], setSort = sortPair[1];
		  var idxOf = new Map(projects.map((p, i) => [p.id, i]));
		  var sorted = projects.filter((p) => !hidden[p.id]);
		  sorted.sort((a, b) => {
		    var va = sortValue(a, sort.key), vb = sortValue(b, sort.key);
		    return (va > vb ? 1 : va < vb ? -1 : 0) * sort.dir;
		  });
		  var th = (label, key) => e("th", {
		    className: "sortable",
		    onClick: () => setSort((s) => s.key === key ? { key, dir: -s.dir } : { key, dir: -1 })
		  }, label + (sort.key === key ? sort.dir > 0 ? " \u2191" : " \u2193" : ""));
		  var rows = [];
		  sorted.forEach((p) => {
		    var i = idxOf.get(p.id);
		    var s = p.stats;
		    rows.push(e(
		      Fragment,
		      { key: p.id },
		      e(
		        "tr",
		        { className: "prow" + (selected === p.id ? " sel" : ""), "data-color": String(i), onClick: () => onSelect(p.id) },
		        e("td", null, e(
		          "div",
		          { className: "dss-proj" },
		          e("span", { className: "dot" }),
		          e(
		            "span",
		            null,
		            e("div", { className: "nm" }, p.name),
		            e("div", { className: "ph" }, esc(p.path))
		          )
		        )),
		        e("td", null, fmtN(p.sessionCount)),
		        e("td", null, fmtN(s.turns)),
		        e("td", null, fmtN(s.steps)),
		        e("td", null, fmtDuration(s.llmMs)),
		        e("td", null, fmtDuration(s.toolMs)),
		        e("td", null, fmtDuration(s.ttftAvgMs)),
		        e("td", null, fmtTps(s.tps)),
		        e("td", null, fmtPct(s.cacheHitPct)),
		        e("td", null, fmtTokens(s.inputTokens)),
		        e("td", null, fmtTokens(s.outputTokens)),
		        e("td", { className: "dss-cost" }, fmtCost(projectCost(p))),
		        e("td", { className: "dss-statline" }, fmtClock(p.lastActiveAt))
		      ),
		      e(
		        "tr",
		        { key: p.id + "-line", "data-color": String(i) },
		        e("td", { colSpan: 13, className: "dss-statline" }, statLine(s, t))
		      )
		    ));
		    if (selected === p.id) {
		      rows.push(e(
		        "tr",
		        { key: p.id + "-detail" },
		        e(
		          "td",
		          { colSpan: 13, style: { padding: 0 } },
		          e(
		            "div",
		            { className: "dss-detail" },
		            p.sessions.map(
		              (sd) => e(
		                "div",
		                { className: "dss-sess", key: sd.id },
		                e("span", { className: "ti" }, sd.title || t("w.untitled"), sd.archived ? t("w.archived") : ""),
		                e("span", { className: "me" }, fmtClock(sd.updatedAt)),
		                e("span", { className: "st" }, `${fmtN(sd.stats.turns)} ${t("w.turns")} \xB7 ${fmtN(sd.stats.steps)} ${t("w.steps")}`),
		                e("span", { className: "st" }, `LLM ${fmtDuration(sd.stats.llmMs)}`),
		                e("span", { className: "st" }, `${t("w.tool")} ${fmtDuration(sd.stats.toolMs)}`),
		                e("span", { className: "st" }, `${t("w.cacheHit")} ${fmtPct(sd.stats.cacheHitPct)}`),
		                e("span", { className: "st" }, `${t("w.input")} ${fmtTokens(sd.stats.inputTokens)} \xB7 ${t("w.output")} ${fmtTokens(sd.stats.outputTokens)}`),
		                e("span", { className: "st" }, `${sd.model || "?"}`),
		                e("span", { className: "st dss-cost" }, fmtCost(sessionCost(sd)))
		              )
		            )
		          )
		        )
		      ));
		    }
		  });
		  return e(
		    "table",
		    { className: "dss-table" },
		    e("thead", null, e(
		      "tr",
		      null,
		      e("th", null, t("th.project")),
		      th(t("th.sessions"), "sessions"),
		      th(t("th.turns"), "turns"),
		      th(t("th.steps"), "steps"),
		      th(t("th.llm"), "llm"),
		      th(t("th.tool"), "tool"),
		      e("th", null, t("th.ttft")),
		      e("th", null, t("th.tps")),
		      th(t("th.cacheHit"), "hit"),
		      th(t("th.input"), "input"),
		      th(t("th.output"), "output"),
		      th(t("th.cost"), "cost"),
		      e("th", null, t("th.lastActive"))
		    )),
		    e("tbody", null, rows)
		  );
		}
		function TimelineView(props) {
		  var projects = props.projects;
		  var timeline = props.timeline;
		  var hidden = props.hidden;
		  var range = props.range;
		  var slotMinutes = 30;
		  var slotMs = slotMinutes * 6e4;
		  var tt = props.tt;
		  var days = timeline.days;
		  if (range !== "all") {
		    var maxKey = days.length ? days[days.length - 1].date : null;
		    if (maxKey) {
		      var cutoff = (/* @__PURE__ */ new Date(maxKey + "T00:00:00+08:00")).getTime() - (range - 1) * 864e5;
		      days = days.filter((d) => (/* @__PURE__ */ new Date(d.date + "T00:00:00+08:00")).getTime() >= cutoff);
		    }
		  }
		  var maxDay = days.reduce((m, d) => Math.max(m, d.dayTotalMs), 1);
		  return e(
		    "div",
		    null,
		    e("div", { className: "dss-hint" }, tt("hint.timeline")),
		    e(
		      "div",
		      { className: "dss-heat" },
		      days.map((d) => {
		        var lvl = d.dayTotalMs / maxDay;
		        return e("div", {
		          key: d.date,
		          className: "dss-hm" + (d.dayTotalMs > 0 ? " has" : ""),
		          style: d.dayTotalMs > 0 ? { background: `rgba(79,140,255,${(0.18 + 0.82 * lvl).toFixed(2)})` } : null,
		          onMouseEnter: (ev) => showTip(tt, d.date, d.dayTotalMs, ev),
		          onMouseLeave: () => hideTip(tt),
		          onClick: () => {
		            var el = document.getElementById("dss-day-" + d.date);
		            if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
		          }
		        });
		      })
		    ),
		    days.length === 0 ? e("div", { className: "dss-empty" }, tt("hint.rangeEmpty")) : e(
		      "div",
		      null,
		      e(
		        "div",
		        { className: "dss-axis" },
		        e("div", null),
		        e("div", { className: "dss-hours" }, [0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => e("span", { key: h }, h + "h"))),
		        e("div", null)
		      ),
		      days.map((d) => {
		        var cells = new Array(48).fill(null);
		        (d.slotBlocks || []).forEach((b) => {
		          if (hidden[b.projectId]) return;
		          var h = Math.min(52, Math.max(2, Math.round(b.ms / slotMs * 52)));
		          cells[b.slot] = e("div", {
		            key: b.projectId + "-" + b.slot,
		            className: "dss-blk",
		            "data-color": String(b.colorIndex),
		            style: { height: h + "px" },
		            onMouseEnter: (ev) => showTip(tt, `${b.name} \xB7 ${d.date}`, b.ms, ev),
		            onMouseLeave: () => hideTip(tt)
		          });
		        });
		        var wd = tt("w.weekdays").split(",")[(/* @__PURE__ */ new Date(d.date + "T00:00:00+08:00")).getUTCDay()];
		        return e(
		          "div",
		          { className: "dss-day", id: "dss-day-" + d.date, key: d.date },
		          e("div", { className: "date" }, d.date + " " + tt("w.dayPrefix") + wd),
		          e(
		            "div",
		            { className: "dss-track" },
		            cells.map((c, i) => e("div", { className: "dss-cell", key: i }, c))
		          ),
		          e("div", { className: "total" }, fmtDuration(d.dayTotalMs))
		        );
		      })
		    )
		  );
		}
		function DateRangeBar(props) {
		  var range = props.range, setRange = props.setRange, t = props.t;
		  var btn = (label, val) => e("button", { className: range === val ? "on" : "", onClick: () => setRange(val) }, label);
		  return e(
		    "div",
		    { className: "dss-pricing" },
		    e("label", null, t("range.label")),
		    e(
		      "div",
		      { className: "dss-tabs", style: { marginBottom: 0 } },
		      btn(t("range.7d"), 7),
		      btn(t("range.30d"), 30),
		      btn(t("range.90d"), 90),
		      btn(t("range.all"), "all")
		    ),
		    e("span", { className: "note" }, t("hint.cost"))
		  );
		}
		function download(filename, content, mime) {
		  var blob = new Blob([content], { type: mime || "application/octet-stream" });
		  var url = URL.createObjectURL(blob);
		  var a = document.createElement("a");
		  a.href = url;
		  a.download = filename;
		  document.body.appendChild(a);
		  a.click();
		  setTimeout(function() {
		    document.body.removeChild(a);
		    URL.revokeObjectURL(url);
		  }, 0);
		}
		function exportJSON(projects) {
		  download("dsh-stats.json", JSON.stringify(projects, null, 2), "application/json");
		}
		function exportCSV(projects, t) {
		  var lines = [[t("th.project"), t("w.path"), t("th.sessions"), t("th.turns"), t("th.steps"), t("th.llm"), t("th.tool"), t("th.input"), t("th.output"), t("th.cacheHit"), t("th.cost")].join(",")];
		  projects.forEach(function(p) {
		    var s = p.stats;
		    lines.push([
		      JSON.stringify(p.name),
		      JSON.stringify(p.path),
		      p.sessionCount,
		      s.turns,
		      s.steps,
		      Math.round(s.llmMs),
		      Math.round(s.toolMs),
		      s.inputTokens,
		      s.outputTokens,
		      s.cacheRead,
		      projectCost(p).toFixed(4)
		    ].join(","));
		  });
		  download("dsh-stats.csv", lines.join("\n"), "text/csv;charset=utf-8");
		}
		function StatsPanel(props) {
		  var open = props.useStatsOpen((o) => o);
		  var sessionsSnap = props.useSessions((s) => s);
		  var workspacesSnap = props.useWorkspaces((w) => w);
		  var onClose = props.onClose;
		  var t = props.t;
		  var aggregateRemote = props.aggregate;
		  var mountError = props.mountError;
		  var tabPair = usePref("tab", "overview");
		  var tab = tabPair[0], setTab = tabPair[1];
		  var hiddenPair = usePref("hidden", {});
		  var hidden = hiddenPair[0], setHidden = hiddenPair[1];
		  var rangePair = usePref("range", 30);
		  var range = rangePair[0], setRange = rangePair[1];
		  var [selected, setSelected] = useState(null);
		  var [remoteData, setRemoteData] = useState(null);
		  var [remoteError, setRemoteError] = useState(null);
		  var [refreshTick, setRefreshTick] = useState(0);
		  useEffect(() => {
		    if (!open || !open.open || !aggregateRemote) return;
		    var cancelled = false;
		    aggregateRemote().then((r) => {
		      if (!cancelled) {
		        setRemoteData(r);
		        setRemoteError(null);
		      }
		    }).catch((err) => {
		      if (cancelled) return;
		      setRemoteData(null);
		      setRemoteError(String(err?.message || err));
		      console.warn("[dsh-stats] aggregate \u8C03\u7528\u5931\u8D25:", err);
		    });
		    return () => {
		      cancelled = true;
		    };
		  }, [open, aggregateRemote, refreshTick]);
		  useEffect(() => {
		    if (!open || !open.open || !aggregateRemote) return;
		    var id = setInterval(() => setRefreshTick((x) => x + 1), 6e4);
		    return () => clearInterval(id);
		  }, [open, aggregateRemote]);
		  var data = useMemo(() => {
		    if (remoteData && remoteData.projects) {
		      var projects = remoteData.projects.map((p) => ({
		        id: p.id,
		        name: p.name,
		        path: p.path,
		        sessionCount: p.sessionCount,
		        lastActiveAt: p.lastActiveAt,
		        stats: display(p.stats),
		        sessions: (p.sessions || []).map((s) => ({ id: s.id, title: s.title, updatedAt: s.updatedAt, model: s.model, archived: s.archived, stats: display(s.stats), durMs: s.durMs, slotUsage: s.slotUsage }))
		      }));
		      return { projects, timeline: remoteData.timeline || { days: [] }, remote: true };
		    }
		    var summaries = sessionsSnap && sessionsSnap.byId ? Object.values(sessionsSnap.byId) : [];
		    var projects = aggregate(summaries, workspacesSnap && workspacesSnap.items, t);
		    var timeline = buildTimeline(projects, 30);
		    return { projects, timeline, remote: false };
		  }, [remoteData, sessionsSnap, workspacesSnap]);
		  var rangeProjects = useMemo(() => applyRange(data.projects, range), [data.projects, range]);
		  if (!open || !open.open) return null;
		  var toggle = (id) => setHidden((h) => ({ ...h, [id]: !h[id] }));
		  var visibleProjects = rangeProjects.filter((p) => !hidden[p.id]);
		  return e(
		    "div",
		    { className: "dss-overlay", onClick: (ev) => {
		      if (ev.target === ev.currentTarget) onClose();
		    } },
		    e(
		      "div",
		      { className: "dss-panel" },
		      e(
		        "div",
		        { className: "dss-head" },
		        e("h2", null, t("title")),
		        e("span", {
		          className: "note",
		          style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary,#6b7280)" },
		          title: (mountError ? "mount: " + mountError : "") + (remoteError ? " rpc: " + remoteError : "")
		        }, data.remote ? t("mode.host") : t("mode.client") + (mountError ? t("mode.mountFailed") : "") + (remoteError ? t("mode.callFailed") : "")),
		        e(
		          "div",
		          { className: "dss-tabs" },
		          e("button", { className: tab === "overview" ? "on" : "", onClick: () => setTab("overview") }, t("tab.overview")),
		          e("button", { className: tab === "timeline" ? "on" : "", onClick: () => setTab("timeline") }, t("tab.timeline"))
		        ),
		        e("button", { className: "dss-export", onClick: () => setRefreshTick((x) => x + 1) }, t("refresh")),
		        e("button", { className: "dss-export", onClick: () => exportCSV(rangeProjects, t) }, "CSV"),
		        e("button", { className: "dss-export", onClick: () => exportJSON(rangeProjects) }, "JSON"),
		        e(
		          "button",
		          { className: "dss-close", onClick: onClose, title: t("close") },
		          e(IconCloseOutline16, { size: 16 })
		        )
		      ),
		      e(
		        "div",
		        { className: "dss-body" },
		        e(DateRangeBar, { range, setRange, t }),
		        tab === "overview" ? e(
		          Fragment,
		          null,
		          e(SummaryCards, { projects: visibleProjects, t }),
		          e(Legend, { projects: data.projects, hidden, onToggle: toggle }),
		          visibleProjects.length === 0 ? e("div", { className: "dss-empty" }, t("empty")) : e(ProjectsTable, { projects: rangeProjects, hidden, selected, t, onSelect: (id) => setSelected((s) => s === id ? null : id) })
		        ) : e(TimelineView, { projects: rangeProjects, timeline: data.timeline, hidden, tt: t, range })
		      )
		    )
		  );
		}
		function showTip(t, label, ms, ev) {
		  var el = document.getElementById("dss-tooltip");
		  if (!el) {
		    el = document.createElement("div");
		    el.id = "dss-tooltip";
		    el.className = "dss-tt";
		    document.body.appendChild(el);
		  }
		  el.innerHTML = `<div style="font-weight:650">${esc(label)}</div><div style="color:var(--dsw-alias-label-secondary,#a6adbb)">${t("w.duration")} <b>${fmtDuration(ms)}</b></div>`;
		  el.classList.add("show");
		  var pad2 = 14, x = ev.clientX + pad2, y = ev.clientY + pad2;
		  var r = el.getBoundingClientRect();
		  if (x + r.width > window.innerWidth) x = ev.clientX - r.width - pad2;
		  if (y + r.height > window.innerHeight) y = ev.clientY - r.height - pad2;
		  el.style.left = x + "px";
		  el.style.top = y + "px";
		}
		function hideTip() {
		  var el = document.getElementById("dss-tooltip");
		  if (el) el.classList.remove("show");
		}
		var inject = ["slots", "locale", "remote"];
		var NS = "stats";
		var zh = {
		  "trigger": "\u7EDF\u8BA1",
		  "title": "\u9879\u76EE\u7EDF\u8BA1",
		  "tab.overview": "\u9879\u76EE\u603B\u89C8",
		  "tab.timeline": "\u5F00\u53D1\u65F6\u95F4\u7EBF",
		  "close": "\u5173\u95ED",
		  "empty": "\u6682\u65E0\u6570\u636E",
		  "refresh": "\u5237\u65B0",
		  "card.projects": "\u9879\u76EE",
		  "card.sessions": "\u4F1A\u8BDD",
		  "card.turnsSteps": "\u8F6E / \u6B65",
		  "card.llm": "LLM \u65F6\u957F",
		  "card.tool": "\u5DE5\u5177\u65F6\u957F",
		  "card.input": "\u8F93\u5165 tok",
		  "card.output": "\u8F93\u51FA tok",
		  "card.cacheHit": "\u5E73\u5747\u7F13\u5B58\u547D\u4E2D",
		  "card.cost": "\u6D88\u8D39\u91D1\u989D",
		  "th.project": "\u9879\u76EE",
		  "th.sessions": "\u4F1A\u8BDD",
		  "th.turns": "\u8F6E",
		  "th.steps": "\u6B65",
		  "th.llm": "LLM",
		  "th.tool": "\u5DE5\u5177",
		  "th.ttft": "\u9996 token",
		  "th.tps": "tok/s",
		  "th.cacheHit": "\u7F13\u5B58\u547D\u4E2D",
		  "th.input": "\u8F93\u5165 tok",
		  "th.output": "\u8F93\u51FA tok",
		  "th.cost": "\u6D88\u8D39",
		  "th.lastActive": "\u6700\u8FD1\u6D3B\u8DC3",
		  "w.turns": "\u8F6E",
		  "w.steps": "\u6B65",
		  "w.tool": "\u5DE5\u5177",
		  "w.ttft": "\u9996 token",
		  "w.cacheHit": "\u7F13\u5B58\u547D\u4E2D",
		  "w.input": "\u8F93\u5165",
		  "w.output": "\u8F93\u51FA",
		  "w.archived": "\uFF08\u5DF2\u5F52\u6863\uFF09",
		  "w.untitled": "\uFF08\u672A\u547D\u540D\u4F1A\u8BDD\uFF09",
		  "w.duration": "\u5F00\u53D1\u65F6\u957F",
		  "w.path": "\u8DEF\u5F84",
		  "w.unnamed": "\uFF08\u672A\u547D\u540D\uFF09",
		  "w.uncategorized": "\uFF08\u672A\u5206\u7C7B\uFF09",
		  "w.weekdays": "\u65E5,\u4E00,\u4E8C,\u4E09,\u56DB,\u4E94,\u516D",
		  "w.dayPrefix": "\u5468",
		  "hint.timeline": "\u5757\u9AD8 = \u8BE5 30 \u5206\u949F\u65F6\u6BB5\u5F00\u53D1\u65F6\u957F\u5360\u6BD4",
		  "hint.rangeEmpty": "\u8BE5\u8303\u56F4\u5185\u6682\u65E0\u5F00\u53D1\u6D3B\u52A8",
		  "hint.cost": "\u6210\u672C\u81EA\u52A8\u6309\u4F1A\u8BDD\u5B9E\u9645\u6A21\u578B\u4E0E\u65F6\u6BB5\u8BA1\u4EF7\uFF088.17 \u524D\u5E73\u4EF7\uFF1B8.17 \u540E\u5CF0\u8C37\uFF1A\u9AD8\u5CF0 9:00\u201312:00 / 14:00\u201318:00 \u5317\u4EAC\uFF09",
		  "range.label": "\u8303\u56F4",
		  "range.7d": "\u8FD1 7 \u5929",
		  "range.30d": "\u8FD1 30 \u5929",
		  "range.90d": "\u8FD1 90 \u5929",
		  "range.all": "\u5168\u90E8",
		  "mode.host": "\u7CBE\u786E\uFF08\u5BBF\u4E3B\uFF09",
		  "mode.client": "\u8FD1\u4F3C\uFF08\u5BA2\u6237\u7AEF\uFF09",
		  "mode.mountFailed": " [\u6302\u8F7D\u5931\u8D25]",
		  "mode.callFailed": " [\u8C03\u7528\u5931\u8D25]"
		};
		var en = {
		  "trigger": "Stats",
		  "title": "Project Stats",
		  "tab.overview": "Overview",
		  "tab.timeline": "Timeline",
		  "close": "Close",
		  "empty": "No data",
		  "refresh": "Refresh",
		  "card.projects": "Projects",
		  "card.sessions": "Sessions",
		  "card.turnsSteps": "Turns / Steps",
		  "card.llm": "LLM time",
		  "card.tool": "Tool time",
		  "card.input": "Input tok",
		  "card.output": "Output tok",
		  "card.cacheHit": "Avg cache hit",
		  "card.cost": "Cost",
		  "th.project": "Project",
		  "th.sessions": "Sessions",
		  "th.turns": "Turns",
		  "th.steps": "Steps",
		  "th.llm": "LLM",
		  "th.tool": "Tool",
		  "th.ttft": "First token",
		  "th.tps": "tok/s",
		  "th.cacheHit": "Cache hit",
		  "th.input": "Input tok",
		  "th.output": "Output tok",
		  "th.cost": "Cost",
		  "th.lastActive": "Last active",
		  "w.turns": "turns",
		  "w.steps": "steps",
		  "w.tool": "Tool",
		  "w.ttft": "First token",
		  "w.cacheHit": "Cache hit",
		  "w.input": "Input",
		  "w.output": "Output",
		  "w.archived": " (archived)",
		  "w.untitled": " (untitled)",
		  "w.duration": "Duration",
		  "w.path": "Path",
		  "w.unnamed": "(unnamed)",
		  "w.uncategorized": "(uncategorized)",
		  "w.weekdays": "Sun,Mon,Tue,Wed,Thu,Fri,Sat",
		  "w.dayPrefix": "",
		  "hint.timeline": "Block height = share of development time in that 30-min slot",
		  "hint.rangeEmpty": "No activity in this range",
		  "hint.cost": "Cost is auto-priced per session model & slot time (flat before 08-17; peak/off-peak after: peak 9:00\u201312:00 / 14:00\u201318:00 Beijing)",
		  "range.label": "Range",
		  "range.7d": "7d",
		  "range.30d": "30d",
		  "range.90d": "90d",
		  "range.all": "All",
		  "mode.host": "Host-accurate",
		  "mode.client": "Client approx.",
		  "mode.mountFailed": " [mount failed]",
		  "mode.callFailed": " [call failed]"
		};
		var STATS_REMOTE_CONTRIBUTION = {
		  package: "@rongyi7/dsh-stats",
		  descriptors: [{
		    id: "@rongyi7/dsh-stats#stats/aggregate",
		    service: "stats",
		    namespace: "stats",
		    method: "aggregate",
		    invocation: { kind: "direct" },
		    parameters: [],
		    result: {
		      mode: "strict",
		      typeSymbol: "@rongyi7/dsh-stats#stats/aggregate:result",
		      schema: { parse: (v) => v }
		    },
		    sourceLocation: { file: "packages/stats/src/index.ts", line: 1, column: 1 }
		  }]
		};
		async function apply(ctx) {
		  if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(CSS_ID) + "]") === null) {
		    var tag = document.createElement("style");
		    tag.dataset.plugin = "@rongyi7/dsh-stats";
		    tag.dataset.pluginCss = CSS_ID;
		    tag.textContent = css;
		    document.head.appendChild(tag);
		  }
		  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-stats: dictionaries");
		  const openStore = createOpenStore();
		  let aggregateRemote = null;
		  let mountError = null;
		  let disposeRemote = () => {
		  };
		  try {
		    disposeRemote = await ctx.remote.$mount(STATS_REMOTE_CONTRIBUTION);
		    await ctx.inject(["remote", "remote.stats"], function statsConsumer(childCtx) {
		      aggregateRemote = async () => {
		        const answered = await childCtx.remote.stats.aggregate();
		        if (!answered.ok) throw new Error(answered.error?.message || "stats/aggregate failed");
		        return answered.value;
		      };
		    });
		  } catch (err) {
		    mountError = String(err?.message || err);
		    console.warn("[dsh-stats] remote.stats \u6302\u8F7D\u5931\u8D25:", err);
		  }
		  ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
		    name: "sidebar.footer.action",
		    id: "stats",
		    locale: NS,
		    inject: () => ({ onOpen: () => openStore.open() })
		  }, StatsTrigger));
		  ctx.slots.inject("shell.overlay", () => ctx.slots.register({
		    name: "shell.overlay",
		    id: "stats-panel",
		    locale: NS,
		    inject: () => ({ hooks: { statsOpen: openStore }, onClose: () => openStore.close(), aggregate: aggregateRemote, mountError })
		  }, StatsPanel));
		  return () => {
		    disposeRemote();
		  };
		}
		module.exports = { apply, inject };

		return module.exports;
	}
});
