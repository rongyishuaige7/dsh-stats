// Panel styles injected once by apply().
//
// Design tokens live on the three roots that can sit outside the panel:
// .dss-overlay (panel), .dss-trigger (sidebar slot) and .dss-tt (the body-level
// tooltip created by showTipRaw). Light theme only redefines tokens; component
// rules never carry their own light-theme overrides.
//
// Font sizes use the six --dss-fs-* steps (11/12/13/15/20/28px). The one
// exception is the sidebar trigger, which stays at 14px to match the host.
const css = `
:where(.dss-overlay, .dss-trigger, .dss-tt) {
  --dss-text: var(--dsw-alias-label-primary, #e7eaf0);
  --dss-text-2: var(--dsw-alias-label-secondary, #a6adbb);
  --dss-text-3: var(--dsw-alias-label-tertiary, #6b7280);
  --dss-line: var(--dsw-alias-border, #2a303c);
  --dss-line-soft: rgba(148,163,184,.15);
  --dss-panel: var(--dsw-alias-bg-layer-1, #161a21);
  --dss-layer: var(--dsw-alias-bg-layer-2, #1d222c);
  --dss-hover: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,.08));
  --dss-hover-soft: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,.06));
  --dss-hover-row: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,.04));
  --dss-active: var(--dsw-alias-interactive-bg-active, rgba(255,255,255,.12));
  --dss-accent: var(--dsw-alias-state-business-primary, #4f8cff);
  --dss-accent-soft: rgba(79,140,255,.14);
  --dss-accent-line: rgba(79,140,255,.45);
  --dss-accent-strong: #2563eb;
  --dss-accent-strong-hover: #1d4ed8;
  --dss-on-accent: #fff;
  --dss-cost: #ff922b;
  --dss-warn: #fbbf24;
  --dss-warn-soft: rgba(251,191,36,.12);
  --dss-warn-line: rgba(251,191,36,.22);
  --dss-ok: #34d399;
  --dss-ok-soft: rgba(52,211,153,.12);
  --dss-ok-line: rgba(52,211,153,.18);
  --dss-danger: #f87171;
  --dss-danger-soft: rgba(248,113,113,.12);
  --dss-danger-line: rgba(248,113,113,.18);
  --dss-info: #60a5fa;
  --dss-info-soft: rgba(96,165,250,.12);
  --dss-info-line: rgba(96,165,250,.24);
  --dss-neutral-soft: rgba(148,163,184,.1);
  --dss-neutral-line: rgba(148,163,184,.18);
  --dss-shadow: var(--dsw-shadow-lv3, 0 20px 60px rgba(0,0,0,.5));
  --dss-shadow-pop: 0 8px 24px rgba(0,0,0,.45);
  --dss-mask: var(--dsw-alias-bg-mask-1, rgba(10,12,16,.65));
  --dss-tip-bg: var(--dsw-alias-tooltip-bg, #1d222c);
  --dss-input: var(--dsw-alias-bg-layer-1, #161a21);
  --dss-surface: rgba(255,255,255,.015);
  --dss-inset: rgba(0,0,0,.08);
  --dss-chip-bg: rgba(255,255,255,.06);
  --dss-badge-bg: rgba(255,255,255,.07);
  --dss-meta-line: rgba(255,255,255,.08);
  --dss-track: rgba(148,163,184,.2);
  --dss-scroll: rgba(166,173,187,.28);
  --dss-scroll-hover: rgba(166,173,187,.5);
  --dss-chart-input: #4f8cff;
  --dss-chart-output: #ffd43b;
  --dss-chart-reasoning: #cc5de8;
  --dss-tl-grid: #1c212a;
  --dss-tl-grid-major: #272d38;
  --dss-tl-cell: #232933;
  --dss-tl-bar-cost: #f08a3c;
  --dss-tl-bar-token: #4f8cff;
  --dss-heat-1: rgba(79,140,255,.35);
  --dss-heat-2: rgba(79,140,255,.58);
  --dss-heat-3: rgba(79,140,255,.80);
  --dss-heat-ring: rgba(79,140,255,.4);
  --dss-hero-bg: linear-gradient(135deg, rgba(79,140,255,.16), rgba(79,140,255,.04) 55%), var(--dss-layer);
  --dss-hero-border: rgba(79,140,255,.28);
  --dss-hero-chip-bg: rgba(79,140,255,.12);
  --dss-hero-card-bg: linear-gradient(135deg, rgba(37,99,235,.28) 0%, rgba(14,165,233,.13) 54%, rgba(15,23,42,.04) 100%), var(--dss-layer);
  --dss-hero-card-border: rgba(96,165,250,.44);
  --dss-hero-card-text: #f8fbff;
  --dss-hero-card-muted: #bfdbfe;
  --dss-hero-metric-bg: rgba(15,23,42,.22);
  --dss-hero-metric-border: rgba(147,197,253,.34);
  --dss-hero-card-shadow: inset 0 1px 0 rgba(191,219,254,.08);
  --dss-balance-text: var(--dss-text);
  --dss-balance-muted: var(--dss-text-2);
  --dss-balance-metric-bg: rgba(255,255,255,.42);
  --dss-balance-metric-border: rgba(37,99,235,.28);
  --dss-balance-rule: rgba(37,99,235,.18);
  --dss-p0: #4f8cff;
  --dss-p1: #34d399;
  --dss-p2: #fbbf24;
  --dss-p3: #f472b6;
  --dss-p4: #a78bfa;
  --dss-p5: #22d3ee;
  --dss-p6: #fb923c;
  --dss-p7: #e879f9;
  --dss-p8: #a3e635;
  --dss-p9: #f87171;
  --dss-p10: #2dd4bf;
  --dss-p11: #facc15;
  --dss-p12: #60a5fa;
  --dss-p13: #c084fc;
  --dss-p14: #fb7185;
  --dss-p15: #38bdf8;
  --dss-fs-xs: 11px;
  --dss-fs-sm: 12px;
  --dss-fs-md: 13px;
  --dss-fs-lg: 15px;
  --dss-fs-xl: 20px;
  --dss-fs-2xl: 28px;
  /* Runtime layout variables are written by the client; these defaults keep
     the CSS self-contained when the JS values are absent. */
  --dss-overview-max-height: initial;
  --dss-timeline-max-height: initial;
}

body:not([data-ds-dark-theme]) :is(.dss-overlay, .dss-trigger, .dss-tt) {
  --dss-text: var(--dsw-alias-label-primary, #111827);
  --dss-text-2: var(--dsw-alias-label-secondary, #4b5563);
  --dss-text-3: var(--dsw-alias-label-tertiary, #6b7280);
  --dss-line: var(--dsw-alias-border, #e5e7eb);
  --dss-panel: var(--dsw-alias-bg-layer-1, #ffffff);
  --dss-layer: var(--dsw-alias-bg-layer-2, #f8f9fa);
  --dss-accent: var(--dsw-alias-state-business-primary, #2563eb);
  --dss-accent-soft: rgba(37,99,235,.08);
  --dss-accent-line: rgba(37,99,235,.35);
  --dss-accent-strong: #2563eb;
  --dss-accent-strong-hover: #1d4ed8;
  --dss-on-accent: #ffffff;
  --dss-cost: #c2510f;
  --dss-warn: #92400e;
  --dss-warn-soft: #fdf4e3;
  --dss-warn-line: #efd3a0;
  --dss-ok: #047857;
  --dss-ok-soft: rgba(4,120,87,.08);
  --dss-ok-line: rgba(4,120,87,.18);
  --dss-danger: #dc2626;
  --dss-danger-soft: rgba(220,38,38,.08);
  --dss-danger-line: rgba(220,38,38,.18);
  --dss-info: #2563eb;
  --dss-info-soft: rgba(37,99,235,.08);
  --dss-info-line: rgba(37,99,235,.2);
  --dss-tl-grid: #f0f2f5;
  --dss-tl-grid-major: #dfe3e8;
  --dss-tl-cell: #e8ebf0;
  --dss-tl-bar-cost: #e07b39;
  --dss-tl-bar-token: #5b8def;
  --dss-heat-1: rgba(37,99,235,.35);
  --dss-heat-2: rgba(37,99,235,.58);
  --dss-heat-3: rgba(37,99,235,.80);
  --dss-heat-ring: rgba(37,99,235,.4);
  --dss-input: var(--dsw-alias-bg-layer-1, #ffffff);
  --dss-inset: rgba(0,0,0,.02);
  --dss-chip-bg: rgba(0,0,0,.06);
  --dss-badge-bg: rgba(0,0,0,.06);
  --dss-meta-line: rgba(0,0,0,.08);
  --dss-hero-card-bg: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 54%, #f8fafc 100%);
  --dss-hero-card-border: #93c5fd;
  --dss-hero-card-text: #0f172a;
  --dss-hero-card-muted: #1d4ed8;
  --dss-hero-metric-bg: rgba(255,255,255,.42);
  --dss-hero-metric-border: rgba(37,99,235,.28);
  --dss-hero-card-shadow: inset 0 1px 0 rgba(255,255,255,.7);
}

.dss-overlay{position:fixed;inset:0;z-index:1000;background:var(--dss-mask);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:flex-start;justify-content:center;padding:6vh 3vw 4vh;overflow:auto}.dss-panel button,.dss-trigger{-webkit-user-select:none;-moz-user-select:none;user-select:none;-webkit-touch-callout:none}.dss-trigger{box-sizing:border-box;cursor:pointer;color:var(--dss-text);background:transparent;border:0;display:flex;align-items:center;flex:0 0 auto;font-family:inherit;overflow:hidden;transition:background-color 140ms ease,color 140ms ease}.dss-trigger.wide{width:calc(100% + 8px);height:34px;margin:4px -4px;padding:6px 2px 6px 10px;gap:8px;border-radius:12px;justify-content:flex-start;font-size:14px;line-height:22px}.dss-trigger.rail{width:36px;height:36px;margin:0;padding:0;gap:0;border-radius:50%;justify-content:center}.dss-trigger:hover{background:var(--dss-hover)}.dss-trigger:active{background:var(--dss-active)}.dss-trigger-label{white-space:nowrap;overflow:hidden}.dss-panel{width:min(1180px,100%);background:var(--dss-panel);border:1px solid var(--dss-line);border-radius:16px;box-shadow:var(--dss-shadow);color:var(--dss-text);display:flex;flex-direction:column;overflow:hidden}.dss-head{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--dss-line)}.dss-head h2{margin:0;font-size:var(--dss-fs-lg);font-weight:650;flex:1;min-width:0;white-space:nowrap}.dss-tabs{display:flex;gap:4px}.dss-tabs button{background:none;border:none;color:var(--dss-text-2);font-size:var(--dss-fs-md);padding:6px 12px;border-radius:8px;cursor:pointer}.dss-tabs button.on{background:var(--dss-accent-soft);color:var(--dss-text);font-weight:600}.dss-close{background:none;border:none;color:var(--dss-text-2);cursor:pointer;border-radius:8px;width:28px;height:28px;display:grid;place-items:center;flex-shrink:0}.dss-close:hover{background:var(--dss-hover)}.dss-head-actions{flex:none;display:flex;align-items:center;justify-content:flex-end;gap:6px;white-space:nowrap}.dss-export{background:none;border:1px solid var(--dss-line);color:var(--dss-text-2);cursor:pointer;border-radius:7px;padding:3px 8px;font-size:var(--dss-fs-sm);white-space:nowrap;flex-shrink:0}.dss-export:hover{background:var(--dss-hover);color:var(--dss-text)}.dss-export:disabled{opacity:.45;cursor:default}.dss-body{padding:16px 18px;overflow:auto}.dss-data-status{padding:0 0 12px;margin-bottom:12px;border-bottom:1px solid var(--dss-line);font-size:var(--dss-fs-xs);line-height:1.6;color:var(--dss-text-2);overflow-wrap:anywhere}.dss-data-status-line{display:flex;align-items:baseline;gap:4px 14px;flex-wrap:wrap}.dss-data-status strong{font-size:var(--dss-fs-xs);font-weight:600}.dss-data-status.stale strong,.dss-data-status.fallback strong,.dss-data-status.partial strong,.dss-data-cost{color:var(--dss-text)}.dss-data-diagnostics{margin-top:6px}.dss-data-diagnostics summary{cursor:pointer;width:fit-content}.dss-data-diagnostics>div{padding-top:4px;white-space:pre-wrap}.dss-timeline-viewport,.dss-model-list-viewport{min-height:0}.dss-timeline-viewport.scrollable{max-height:var(--dss-timeline-max-height);overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;padding-right:5px}.dss-model-list-viewport.scrollable{max-height:204px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;padding-right:5px}.dss-timeline-viewport.scrollable,.dss-model-list-viewport.scrollable{scrollbar-width:thin;scrollbar-color:var(--dss-scroll) transparent}.dss-timeline-viewport.scrollable:hover,.dss-model-list-viewport.scrollable:hover{scrollbar-color:var(--dss-scroll-hover) transparent}.dss-sess{--dss-data-shift:20px;display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1.08fr) minmax(0,.75fr) minmax(0,.9fr) minmax(0,.85fr) minmax(0,1.3fr) minmax(0,1.25fr) clamp(8px,1.7vw,20px) minmax(0,.65fr);gap:6px;align-items:center;width:100%;box-sizing:border-box;min-width:0;padding:7px 8px;border-bottom:1px solid var(--dss-line);font-size:var(--dss-fs-md);transition:background .12s}.dss-sess:last-child{border-bottom:none}.dss-sess:hover{background:var(--dss-hover-row)}.dss-sess .ti{font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:16px;box-sizing:border-box}.dss-sess-title{display:block;width:100%;border:0;background:none;color:inherit;font:inherit;line-height:inherit;text-align:left;cursor:pointer;padding:0 16px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dss-sess>:nth-child(n+2){transform:translateX(var(--dss-data-shift))}.dss-sess .me{color:var(--dss-text-3);font-size:var(--dss-fs-sm);text-align:right;font-variant-numeric:tabular-nums;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dss-sess .st{color:var(--dss-text-2);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap;min-width:0;overflow:hidden;text-overflow:ellipsis}.dss-sess-model{text-align:right!important;transform:translateX(var(--dss-data-shift))!important}.dss-sess-cost{grid-column:10;text-align:left!important}.dss-pages{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin:8px 0 12px;font-size:var(--dss-fs-sm);color:var(--dss-text-2)}.dss-tag{font-size:var(--dss-fs-xs);font-weight:600;color:var(--dss-accent);background:var(--dss-accent-soft);border-radius:4px;padding:1px 5px;margin-left:6px;vertical-align:middle}.dss-group{font-size:var(--dss-fs-xs);font-weight:600;color:var(--dss-text-3);padding:9px 12px 3px}.dss-hint{color:var(--dss-text-3);font-size:var(--dss-fs-sm);margin-bottom:10px}.dss-timeline-limit{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:-4px 0 10px;color:var(--dss-text-3);font-size:var(--dss-fs-sm)}.dss-heat{display:flex;align-items:center;gap:3px;overflow-x:auto;padding-bottom:8px;margin-bottom:4px}.dss-hm{width:14px;height:14px;border-radius:4px;flex:none;background:var(--dss-hover-soft);border:1px solid var(--dss-line)}.dss-hm.has{cursor:pointer}.dss-hm.has:hover{outline:1.5px solid var(--dss-accent);outline-offset:1px}.dss-axis{display:grid;grid-template-columns:150px 1fr 104px;margin-bottom:4px}.dss-hours{display:grid;grid-template-columns:repeat(9,1fr);color:var(--dss-text-3);font-size:var(--dss-fs-xs)}.dss-hours span{text-align:center}.dss-hours span:first-child{text-align:left}.dss-hours span:last-child{text-align:right}.dss-day{display:grid;grid-template-columns:150px 1fr 104px;align-items:stretch;border-bottom:1px solid var(--dss-line);min-height:56px;box-sizing:border-box}.dss-day-projs{display:flex;flex-direction:column;justify-content:center;gap:9px;padding:10px 8px 10px 0;min-width:0}.dss-day-date{font-size:var(--dss-fs-sm);font-weight:600;color:var(--dss-text-2);margin-bottom:3px;font-variant-numeric:tabular-nums}.dss-day-proj{display:flex;align-items:center;gap:8px;min-width:0;transition:opacity .12s}.dss-day-proj:hover{opacity:.8}.dss-day-dot{width:10px;height:10px;border-radius:3px;flex:none;background:var(--c);box-shadow:0 0 0 2px var(--dss-panel)}.dss-day-pname{font-size:var(--dss-fs-md);color:var(--dss-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dss-day-more{font-size:var(--dss-fs-xs);color:var(--dss-text-3);padding-left:18px}.dss-track{display:grid;grid-template-columns:repeat(48,1fr);margin:4px 0}.dss-cell{position:relative;min-width:0;border-right:1px solid var(--dss-line);display:flex;flex-direction:row;align-items:flex-end;gap:1px}.dss-cell:last-child{border-right:none}.dss-blk{flex:1;min-width:2px;border-radius:3px;background:var(--c);cursor:pointer;transition:filter .12s}.dss-blk:hover{filter:brightness(1.25)}.dss-blk-composite{width:100%;min-width:0;border-radius:3px;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;cursor:pointer;transition:filter .12s}.dss-blk-composite:hover{filter:brightness(1.25)}.dss-blk-segment{display:block;flex:1;min-height:1px;background:var(--c)}.dss-day-info{display:flex;flex-direction:column;justify-content:center;align-items:flex-end;gap:4px;padding:8px 0 8px 12px;min-width:0}.dss-day-info .dur{font-size:var(--dss-fs-md);font-weight:650;color:var(--dss-text);font-variant-numeric:tabular-nums}.dss-day-info .span{font-size:var(--dss-fs-xs);color:var(--dss-text-2);font-variant-numeric:tabular-nums;white-space:nowrap}.dss-day-info .cnt{font-size:var(--dss-fs-xs);color:var(--dss-text-3);white-space:nowrap}.dss-empty{color:var(--dss-text-3);text-align:center;padding:32px 0}.dss-tt{background:var(--dss-tip-bg);border:1px solid var(--dss-line);border-radius:9px;padding:8px 11px;box-shadow:var(--dss-shadow-pop);font-size:var(--dss-fs-md);position:fixed;z-index:2000;pointer-events:none;display:none;max-width:320px}.dss-tt.show{display:block}.dss-cost{font-variant-numeric:tabular-nums;font-weight:600;color:var(--dss-text)}[data-color='0']{--c:var(--dss-p0)}[data-color='1']{--c:var(--dss-p1)}[data-color='2']{--c:var(--dss-p2)}[data-color='3']{--c:var(--dss-p3)}[data-color='4']{--c:var(--dss-p4)}[data-color='5']{--c:var(--dss-p5)}[data-color='6']{--c:var(--dss-p6)}[data-color='7']{--c:var(--dss-p7)}[data-color='8']{--c:var(--dss-p8)}[data-color='9']{--c:var(--dss-p9)}[data-color='10']{--c:var(--dss-p10)}[data-color='11']{--c:var(--dss-p11)}[data-color='12']{--c:var(--dss-p12)}[data-color='13']{--c:var(--dss-p13)}[data-color='14']{--c:var(--dss-p14)}[data-color='15']{--c:var(--dss-p15)}.dss-trends{display:flex;flex-direction:column;gap:14px}.dss-hero{display:grid;grid-template-columns:1.6fr 1fr;gap:10px}.dss-hero-main{background:var(--dss-hero-bg);border:1px solid var(--dss-hero-border);border-radius:13px;padding:18px 20px;display:flex;flex-direction:column;gap:8px;min-width:0}.dss-hero-k{color:var(--dss-text-2);font-size:var(--dss-fs-sm);font-weight:600}.dss-hero-v{font-size:var(--dss-fs-2xl);font-weight:750;color:var(--dss-text);font-variant-numeric:tabular-nums;line-height:1.05;letter-spacing:-.5px}.dss-hero-v.model{font-size:var(--dss-fs-xl);letter-spacing:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:650}.dss-hero-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}.dss-hero-chip{background:var(--dss-hero-chip-bg);color:var(--dss-text-2);border-radius:999px;padding:3px 10px;font-size:var(--dss-fs-sm);font-variant-numeric:tabular-nums}.dss-hero-side{display:grid;grid-template-rows:1fr 1fr;gap:10px}.dss-hero-cell{background:var(--dss-layer);border:1px solid var(--dss-line);border-radius:13px;padding:13px 16px;display:flex;flex-direction:column;justify-content:center;gap:5px;min-width:0}.dss-hero-cell .dss-hero-v{font-size:var(--dss-fs-xl)}.dss-hero-cell .dss-cost{color:var(--dss-cost)}.dss-metric-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.dss-metric{background:var(--dss-layer);border:1px solid var(--dss-line);border-radius:11px;padding:12px 14px;display:flex;flex-direction:column;gap:2px;min-width:0}.dss-metric-v{font-size:var(--dss-fs-xl);font-weight:700;color:var(--dss-text);font-variant-numeric:tabular-nums;line-height:1.1}.dss-metric-l{color:var(--dss-text-2);font-size:var(--dss-fs-sm);margin-top:2px}.dss-metric-s{color:var(--dss-text-3);font-size:var(--dss-fs-xs)}.dss-section{background:var(--dss-layer);border:1px solid var(--dss-line);border-radius:13px;padding:12px 14px}.dss-sec-head{display:flex;align-items:baseline;gap:10px;margin-bottom:10px}.dss-sec-title{color:var(--dss-text);font-size:var(--dss-fs-md);font-weight:650}.dss-sec-hint{color:var(--dss-text-3);font-size:var(--dss-fs-xs);flex:1;text-align:right}.dss-trend-duo{display:grid;grid-template-columns:minmax(280px,360px) 1fr;gap:30px;align-items:start}.dss-duo-cell{min-width:0}.dss-duo-cell.grow{flex:1}.dss-duo-title{font-size:var(--dss-fs-sm);font-weight:600;color:var(--dss-text-2);margin-bottom:10px}@media (max-width:860px){.dss-trend-duo{grid-template-columns:1fr}}.dss-cal-wrap{display:flex;flex-direction:column;gap:8px}.dss-cal{width:100%;max-width:360px}.dss-cal-month{min-width:0}.dss-cal-title{font-size:var(--dss-fs-sm);font-weight:600;color:var(--dss-text-2);margin-bottom:6px;text-align:center}.dss-cal-dow{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;font-size:var(--dss-fs-xs);color:var(--dss-text-3);margin-bottom:4px}.dss-cal-dow span{text-align:center}.dss-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}.dss-cal-cell,.dss-cal-pad{aspect-ratio:1;width:min(100%,22px);justify-self:center;border-radius:3px}.dss-cal-cell{display:block;padding:0;appearance:none;background:var(--dss-hover-soft);border:1px solid var(--dss-line);cursor:default}.dss-cal-cell.interactive{cursor:pointer}.dss-cal-cell.lvl1.has{background:var(--dss-heat-1);border-color:transparent}.dss-cal-cell.lvl2.has{background:var(--dss-heat-2);border-color:transparent}.dss-cal-cell.lvl3.has{background:var(--dss-heat-3);border-color:transparent}.dss-cal-cell.lvl4.has{background:var(--dss-accent);border-color:transparent;box-shadow:0 0 0 1px var(--dss-heat-ring)}.dss-cal-cell.today{outline:1.5px solid var(--dss-text);outline-offset:1px}.dss-cal-cell.selected{outline:2px solid var(--dss-cost);outline-offset:1px;z-index:1}.dss-cal-cell.future{opacity:.35;border-style:dashed}.dss-cal-cell.interactive:hover{outline:1.5px solid var(--dss-text);outline-offset:1px}.dss-cal-legend{display:flex;align-items:center;gap:3px;font-size:var(--dss-fs-xs);color:var(--dss-text-3);justify-content:center}.dss-hm-lg{width:10px;height:10px;border-radius:2px;display:inline-block;background:var(--dss-hover-soft);border:1px solid var(--dss-line)}.dss-hm-lg.lvl1{background:var(--dss-heat-1);border-color:transparent}.dss-hm-lg.lvl2{background:var(--dss-heat-2);border-color:transparent}.dss-hm-lg.lvl3{background:var(--dss-heat-3);border-color:transparent}.dss-hm-lg.lvl4{background:var(--dss-accent);border-color:transparent}.dss-mchart{display:grid;grid-template-columns:auto 1fr;gap:6px 10px;align-items:stretch}.dss-mchart-y{display:flex;flex-direction:column;justify-content:space-between;font-size:var(--dss-fs-xs);color:var(--dss-text-3);text-align:right;padding:0 0 22px;font-variant-numeric:tabular-nums;position:relative}.dss-mchart-tick{height:0;line-height:1;transform:translateY(-50%)}.dss-mchart-tick:first-child{transform:none}.dss-mchart-tick:last-child{transform:translateY(-100%)}.dss-mchart-plot{position:relative}.dss-mchart-grid{position:absolute;inset:0 0 22px;pointer-events:none}.dss-mchart-grid i{position:absolute;left:0;right:0;border-top:1px dashed var(--dss-line);height:0;display:block}.dss-mchart-grid i:nth-child(1){top:25%}.dss-mchart-grid i:nth-child(2){top:50%}.dss-mchart-grid i:nth-child(3){top:75%}.dss-mchart-grid i:nth-child(4){top:100%;border-top-style:solid}.dss-mchart-bars{display:flex;align-items:flex-end;gap:6px;height:126px}.dss-mchart-col{flex:1;min-width:26px;max-width:64px;height:126px;display:flex;flex-direction:column;justify-content:flex-end}.dss-mchart-bar{width:100%;height:100%;display:flex;flex-direction:column;justify-content:flex-end;border-radius:4px 4px 0 0;overflow:hidden;cursor:default;transition:filter .15s}.dss-mchart-bar:hover{filter:brightness(1.15)}.dss-mchart-seg{width:100%}.dss-mchart-seg.input{background:var(--dss-chart-input)}.dss-mchart-seg.output{background:var(--dss-chart-output)}.dss-mchart-seg.output.has-value{min-height:2px}.dss-mchart-seg.reasoning{background:var(--dss-chart-reasoning)}.dss-mchart-xlabels{display:flex;gap:6px;margin-top:4px}.dss-mchart-label{flex:1;min-width:26px;max-width:64px;text-align:center;font-size:var(--dss-fs-xs);color:var(--dss-text-3);height:18px;line-height:18px;overflow:hidden;white-space:nowrap}.dss-mchart-label.today{color:var(--dss-text);font-weight:600}.dss-mchart-label.selected{color:var(--dss-cost);font-weight:700}.dss-mchart-legend{grid-column:2;display:flex;justify-content:center;flex-wrap:wrap;gap:14px;font-size:var(--dss-fs-sm);color:var(--dss-text-2);align-items:center}.dss-mchart-lg{width:9px;height:9px;border-radius:2px;display:inline-block;margin-right:5px;vertical-align:-1px}.dss-mchart-lg.input{background:var(--dss-chart-input)}.dss-mchart-lg.output{background:var(--dss-chart-output)}.dss-mchart-lg.reasoning{background:var(--dss-chart-reasoning)}.dss-model-split{display:grid;grid-template-columns:160px minmax(0,1fr);gap:18px;align-items:start}.dss-ring-wrap{display:flex;width:160px;gap:12px;align-items:center;flex-direction:column}.dss-ring{width:112px;height:112px;border-radius:50%;display:grid;place-items:center;flex:none;position:relative}.dss-ring::after{content:"";position:absolute;inset:19px;background:var(--dss-layer);border-radius:50%}.dss-ring-center{position:relative;text-align:center;z-index:1}.dss-ring-total{font-size:var(--dss-fs-lg);font-weight:700;color:var(--dss-text);font-variant-numeric:tabular-nums}.dss-ring-label{font-size:var(--dss-fs-xs);color:var(--dss-text-3);margin-top:2px}.dss-ring-legend{display:flex;flex-direction:column;gap:5px;width:100%;min-width:0}.dss-ring-legend.scrollable{max-height:58px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;padding-right:4px;scrollbar-width:thin;scrollbar-color:var(--dss-scroll) transparent}.dss-ring-legend.scrollable:hover{scrollbar-color:var(--dss-scroll-hover) transparent}.dss-ring-item{display:flex;align-items:center;gap:7px;height:16px;line-height:16px;flex:none;font-size:var(--dss-fs-sm);color:var(--dss-text-2)}.dss-ring-swatch{width:10px;height:10px;border-radius:3px;flex:none}.dss-ring-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dss-ring-pct{font-variant-numeric:tabular-nums;color:var(--dss-text);font-weight:600}.dss-model-list{display:flex;flex-direction:column;gap:8px;min-width:0}.dss-model-item{padding:8px 10px;border:1px solid var(--dss-line);border-radius:9px;background:var(--dss-surface);min-width:0;transition:border-color .15s}.dss-model-item:hover{border-color:var(--dss-text-3)}.dss-model-head{display:flex;align-items:center;gap:8px;margin-bottom:5px;min-width:0}.dss-model-dot{width:9px;height:9px;border-radius:3px;flex:none}.dss-model-name{flex:1;font-size:var(--dss-fs-sm);font-weight:600;color:var(--dss-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dss-model-pct{font-size:var(--dss-fs-sm);font-weight:650;color:var(--dss-text);font-variant-numeric:tabular-nums}.dss-model-track{height:5px;border-radius:3px;background:var(--dss-hover-soft);overflow:hidden;margin-bottom:5px}.dss-model-fill{height:100%;border-radius:3px;transition:width .2s}.dss-model-meta{font-size:var(--dss-fs-xs);color:var(--dss-text-3);font-variant-numeric:tabular-nums;line-height:1.4}.dss-model-list-viewport.scrollable .dss-model-meta{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dss-tip-title{font-weight:650;margin-bottom:5px;color:var(--dss-text)}.dss-tip-row{display:flex;justify-content:space-between;gap:14px;line-height:1.6;color:var(--dss-text-2)}.dss-tip-row b{font-variant-numeric:tabular-nums;color:var(--dss-text)}@container dss-panel (max-width:860px){.dss-head{flex-wrap:wrap}.dss-head h2{min-width:0}.dss-head>.dss-tabs{order:3;flex-basis:100%}.dss-head-actions{margin-left:auto}}@media (min-width:768px){.dss-sess-cost{width:calc(100% - 8px)}}@media (max-width:767px){.dss-sess{--dss-data-shift:10px}}@media (max-width:640px){.dss-trends .dss-model-split{grid-template-columns:minmax(0,1fr)}.dss-model-split>.dss-ring-wrap{min-width:0;max-width:100%}.dss-ring-wrap>.dss-ring-legend{width:auto;flex:1;min-width:0}.dss-model-split>.dss-model-list-viewport{min-width:0;max-width:100%}}@media (max-width:640px){.dss-overlay{padding:0}.dss-panel{border-radius:0;min-height:100%;width:100%}.dss-body{padding:12px}.dss-sess{width:calc(100% - 2px);gap:3px;padding:6px 4px;font-size:var(--dss-fs-xs)}.dss-sess .ti{padding-right:4px}.dss-sess .me,.dss-sess .st{font-size:var(--dss-fs-xs)}.dss-axis,.dss-day{grid-template-columns:94px 1fr 70px}.dss-day-projs{gap:6px}.dss-day-pname{font-size:var(--dss-fs-xs)}.dss-day-info{padding-left:5px}.dss-metric-row{grid-template-columns:repeat(2,minmax(0,1fr))}.dss-hero{grid-template-columns:1fr}.dss-model-split{grid-template-columns:1fr}.dss-ring-wrap{width:100%;flex-direction:row}.dss-sec-head{align-items:flex-start;flex-direction:column;gap:4px}.dss-sec-hint{text-align:left}.dss-tabs button{padding:6px 8px}.dss-track{min-width:480px}.dss-day{overflow-x:auto}.dss-day .dss-track{overflow:hidden}}
	.dss-tc-val.dss-tc-cost{color:var(--dss-cost)}
	.dss-ml-row .dss-ml-reasoning{color:var(--dss-chart-reasoning)}
	.dss-balance{display:flex;flex-direction:column;gap:14px}.dss-balance-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.dss-section-title{font-size:var(--dss-fs-md);font-weight:650;color:var(--dss-text)}.dss-balance-head .dss-sec-hint{margin-top:4px}.dss-provider-picker{display:flex;align-items:center;gap:8px;color:var(--dss-text-2);font-size:var(--dss-fs-xs);white-space:nowrap}.dss-provider-picker select{width:128px;min-width:128px;height:30px;padding:0 28px 0 9px;border:1px solid var(--dss-line);border-radius:7px;background:var(--dss-layer);color:var(--dss-text);font-size:var(--dss-fs-sm);outline:none}.dss-provider-picker select:focus{border-color:var(--dss-accent)}.dss-balance-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px}.dss-balance-account{background:var(--dss-layer);border:1px solid var(--dss-line);border-radius:10px;padding:18px;overflow:hidden}.dss-balance-account.provider-deepseek{--dss-balance-text:var(--dss-hero-card-text);--dss-balance-muted:var(--dss-hero-card-muted);--dss-balance-metric-bg:var(--dss-hero-metric-bg);--dss-balance-metric-border:var(--dss-hero-metric-border);--dss-balance-rule:var(--dss-hero-metric-border);background:var(--dss-hero-card-bg);border-color:var(--dss-hero-card-border);box-shadow:var(--dss-hero-card-shadow)}.dss-balance-account-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.dss-balance-name{font-size:var(--dss-fs-lg);font-weight:700;color:var(--dss-balance-text)}.dss-balance-currency{font-size:var(--dss-fs-xs);color:var(--dss-balance-muted);margin-top:3px}.dss-balance-status{font-size:var(--dss-fs-xs);font-weight:600;padding:3px 7px;border:1px solid transparent;border-radius:5px;background:var(--dss-info-soft);color:var(--dss-info)}.dss-balance-status.ok{color:var(--dss-ok);background:var(--dss-ok-soft);border-color:var(--dss-ok-line)}.dss-balance-status.stale{color:var(--dss-warn);background:var(--dss-warn-soft);border-color:var(--dss-warn-line)}.dss-balance-status.not-configured,.dss-balance-status.unauthorized,.dss-balance-status.invalid-response,.dss-balance-status.blocked{color:var(--dss-danger);background:var(--dss-danger-soft);border-color:var(--dss-danger-line)}.dss-balance-status.rate-limited,.dss-balance-status.unavailable{color:var(--dss-warn);background:var(--dss-warn-soft);border-color:var(--dss-warn-line)}.dss-balance-status.unsupported{color:var(--dss-text-2);background:var(--dss-neutral-soft);border-color:var(--dss-neutral-line)}.dss-balance-total-label{margin-top:24px;font-size:var(--dss-fs-sm);color:var(--dss-balance-muted)}.dss-balance-total{font-size:var(--dss-fs-2xl);font-weight:750;line-height:1.08;margin-top:5px;color:var(--dss-balance-text);font-variant-numeric:tabular-nums}.dss-balance-plan{font-size:var(--dss-fs-2xl);font-weight:720;line-height:1.2;margin-top:6px;color:var(--dss-balance-text)}.dss-balance-breakdown{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:20px;padding-top:14px;border-top:1px solid var(--dss-balance-rule);font-variant-numeric:tabular-nums}.dss-balance-metric{display:flex;flex-direction:column;gap:4px;min-width:0;padding:9px 11px;border:1px solid var(--dss-balance-metric-border);border-radius:7px;background:var(--dss-balance-metric-bg);box-sizing:border-box}.dss-balance-metric+.dss-balance-metric{padding-left:11px;padding-right:11px;border-left:1px solid var(--dss-balance-metric-border)}.dss-balance-metric span{font-size:var(--dss-fs-xs);color:var(--dss-balance-muted)}.dss-balance-metric b{font-size:var(--dss-fs-md);color:var(--dss-balance-text);white-space:nowrap}.dss-quota-list{display:flex;flex-direction:column;gap:14px;margin-top:20px;padding-top:16px;border-top:1px solid var(--dss-line)}.dss-quota-head{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:var(--dss-fs-sm);color:var(--dss-balance-muted)}.dss-quota-head b{color:var(--dss-balance-text);font-variant-numeric:tabular-nums}.dss-quota-track{height:7px;margin-top:7px;overflow:hidden;border-radius:4px;background:var(--dss-track)}.dss-quota-track i{display:block;height:100%;border-radius:4px;background:var(--dss-accent)}.dss-quota-reset{margin-top:5px;font-size:var(--dss-fs-xs);color:var(--dss-balance-muted)}.dss-balance-stale{margin-top:10px;color:var(--dss-warn);font-size:var(--dss-fs-sm)}.dss-balance-message{margin-top:24px;color:var(--dss-text-2);font-size:var(--dss-fs-sm);line-height:1.5}.dss-balance-topup{display:inline-flex;align-items:center;justify-content:center;margin-top:18px;min-height:30px;padding:0 12px;border:1px solid var(--dss-accent-strong);border-radius:7px;background:var(--dss-accent-strong);color:var(--dss-on-accent);font-size:var(--dss-fs-sm);font-weight:600;text-decoration:none}.dss-balance-topup:hover{background:var(--dss-accent-strong-hover);border-color:var(--dss-accent-strong-hover)}.dss-balance-state{padding:42px 0;text-align:center;color:var(--dss-text-2)}.dss-balance-state.error{color:var(--dss-warn)}.dss-balance-warning{border:1px solid var(--dss-warn-line);background:var(--dss-warn-soft);border-radius:8px;padding:9px 11px;color:var(--dss-warn);font-size:var(--dss-fs-sm)}@media (max-width:640px){.dss-balance-head{flex-direction:column}.dss-provider-picker{width:100%;justify-content:space-between}.dss-provider-picker select{min-width:0;max-width:72%;flex:1}.dss-balance-account{padding:15px}.dss-balance-total{font-size:var(--dss-fs-2xl)}.dss-balance-breakdown{gap:8px}}
	.dss-pricing{font-size:var(--dss-fs-md);padding:16px;border:1px solid var(--dss-line);border-radius:12px;background:var(--dss-layer);margin-bottom:16px}.dss-pricing h3{margin:0 0 12px;font-size:var(--dss-fs-md);font-weight:650;color:var(--dss-text)}.dss-pricing h4{margin:10px 0 6px;font-size:var(--dss-fs-md);color:var(--dss-text-2)}.dss-price-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:12px 0}.dss-price-field{display:flex;flex-direction:column;gap:5px;font-size:var(--dss-fs-sm);color:var(--dss-text-2)}.dss-pricing input:not([type=checkbox]),.dss-pricing select{box-sizing:border-box;width:100%;min-width:0;padding:6px 9px;border:1px solid var(--dss-line);border-radius:7px;background:var(--dss-input);color:var(--dss-text);font-size:var(--dss-fs-sm);outline:none;transition:border-color .15s}.dss-pricing input:not([type=checkbox]):focus,.dss-pricing select:focus{border-color:var(--dss-accent)}.dss-price-actions,.dss-price-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:10px 0}.dss-price-row>span{flex:1 1 160px;min-width:140px;overflow-wrap:anywhere;font-size:var(--dss-fs-md)}.dss-pricing details{margin:10px 0}.dss-pricing summary{cursor:pointer;font-size:var(--dss-fs-md);color:var(--dss-text-2)}.dss-pricing summary:hover{color:var(--dss-text)}.dss-price-muted{font-size:var(--dss-fs-sm);color:var(--dss-text-3);line-height:1.4}.dss-pricing pre{font-size:var(--dss-fs-sm);white-space:pre-wrap;overflow-wrap:anywhere;max-height:240px;overflow:auto}.dss-price-preview{font-size:var(--dss-fs-md);color:var(--dss-info);margin:8px 0}.dss-pricing [role=alert]{color:var(--dss-danger);font-size:var(--dss-fs-sm)}.dss-pricing [role=status]{font-size:var(--dss-fs-sm)}.dss-price-catalog-section{margin:14px 0 4px;border-top:1px solid var(--dss-line);padding-top:12px}.dss-price-section-summary{font-size:var(--dss-fs-md);font-weight:600;color:var(--dss-text);cursor:pointer;user-select:none;padding:3px 0}.dss-price-catalog-toolbar{margin:10px 0 10px;display:flex;flex-direction:column;gap:7px}.dss-price-search-input{box-sizing:border-box;width:100%;padding:7px 11px;border:1px solid var(--dss-line);border-radius:7px;background:var(--dss-input);color:var(--dss-text);font-size:var(--dss-fs-md);outline:none;transition:border-color .15s}.dss-price-search-input:focus{border-color:var(--dss-accent)}.dss-price-search-input::placeholder{color:var(--dss-text-3)}.dss-price-catalog-info{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;font-size:var(--dss-fs-sm);color:var(--dss-text-2);padding:0 2px}.dss-price-history-filter{font-size:var(--dss-fs-sm);display:flex;align-items:center;gap:6px}.dss-price-pagination{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:12px;font-size:var(--dss-fs-sm);font-variant-numeric:tabular-nums}.dss-price-phase{font-size:var(--dss-fs-xs);color:var(--dss-text-2)}.dss-price-badge{display:inline-flex;align-items:center;padding:1px 7px;border-radius:999px;background:var(--dss-badge-bg);color:var(--dss-text-2);font-size:var(--dss-fs-xs);font-variant-numeric:tabular-nums;white-space:nowrap}.dss-price-catalog-list{display:flex;flex-direction:column;gap:7px;max-height:420px;overflow-y:auto;overflow-x:hidden;scrollbar-gutter:stable;scrollbar-width:thin;scrollbar-color:var(--dss-scroll) transparent;padding-right:3px}.dss-price-catalog-list:hover{scrollbar-color:var(--dss-scroll-hover) transparent}.dss-price-rule-card{flex:none;box-sizing:border-box;width:100%;min-height:38px;border:1px solid var(--dss-line);border-radius:8px;background:var(--dss-input);overflow:hidden;transition:border-color .15s;margin:0}.dss-price-rule-card:hover{border-color:var(--dss-text-3)}.dss-price-rule-card[open]{border-color:var(--dss-accent-line)}.dss-price-rule-summary{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;min-height:36px;box-sizing:border-box;cursor:pointer;user-select:none;list-style:none}.dss-price-rule-summary::-webkit-details-marker{display:none}.dss-price-rule-summary::marker{display:none}.dss-price-rule-lead{display:flex;align-items:center;gap:7px;min-width:0;flex:1 1 auto}.dss-price-provider-tag{font-size:var(--dss-fs-xs);font-weight:600;text-transform:uppercase;letter-spacing:.3px;color:var(--dss-text-2);background:var(--dss-chip-bg);padding:2px 6px;border-radius:4px;white-space:nowrap;flex-shrink:0}.dss-price-canonical-name{font-size:var(--dss-fs-md);font-weight:600;color:var(--dss-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1}.dss-price-used-tag{font-size:var(--dss-fs-xs);font-weight:500;color:var(--dss-info);background:var(--dss-info-soft);border:1px solid var(--dss-info-line);padding:1px 5px;border-radius:4px;white-space:nowrap;flex-shrink:0}.dss-price-provisional{font-size:var(--dss-fs-xs);font-weight:500;color:var(--dss-warn);background:var(--dss-warn-soft);border:1px solid var(--dss-warn-line);padding:1px 5px;border-radius:4px;white-space:nowrap;flex-shrink:0}.dss-price-rule-trail{display:flex;align-items:center;gap:8px;flex-shrink:0;min-width:0}.dss-price-summary-rate{font-size:var(--dss-fs-sm);color:var(--dss-text-2);font-variant-numeric:tabular-nums;white-space:nowrap}.dss-price-chevron{width:5px;height:5px;flex:none;border-right:1.5px solid var(--dss-text-3);border-bottom:1.5px solid var(--dss-text-3);transform:rotate(-45deg);transition:transform .15s;margin-left:2px}.dss-price-rule-card[open] .dss-price-chevron{transform:rotate(45deg)}.dss-price-rule-body{padding:10px 12px 11px;border-top:1px solid var(--dss-line);display:flex;flex-direction:column;gap:8px;background:var(--dss-inset)}.dss-price-tier-block{display:flex;flex-direction:column;gap:4px}.dss-price-tier-name{font-size:var(--dss-fs-xs);font-weight:600;color:var(--dss-text-2)}.dss-price-rate-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.dss-price-rate-cell{background:var(--dss-layer);border:1px solid var(--dss-line);border-radius:6px;padding:6px 8px;display:flex;flex-direction:column;gap:2px;min-width:0}.dss-price-rate-k{font-size:var(--dss-fs-xs);color:var(--dss-text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dss-price-rate-v{font-size:var(--dss-fs-md);font-weight:650;color:var(--dss-text);font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.dss-price-note{margin:0;font-size:var(--dss-fs-xs);line-height:1.4;color:var(--dss-text-2);overflow-wrap:anywhere}.dss-price-rule-meta{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;font-size:var(--dss-fs-xs);color:var(--dss-text-3);padding-top:6px;margin-top:2px;border-top:1px dashed var(--dss-meta-line)}.dss-price-source-link{color:var(--dss-info);text-decoration:none;font-size:var(--dss-fs-xs);white-space:nowrap}.dss-price-source-link:hover{text-decoration:underline}.dss-price-history-section{margin-top:10px}.dss-price-empty{text-align:center;padding:24px 0;font-size:var(--dss-fs-md);color:var(--dss-text-3)}@container dss-drawer (max-width:1000px){.dss-price-rule-summary{flex-direction:column;align-items:stretch;gap:7px}.dss-price-rule-trail{display:grid;grid-template-columns:auto minmax(0,1fr) auto}.dss-price-summary-rate{text-align:right;white-space:normal;overflow-wrap:anywhere}}@container dss-drawer (max-width:640px){.dss-price-rate-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dss-price-summary-rate{font-size:var(--dss-fs-xs)}.dss-price-rule-lead{flex-wrap:wrap}.dss-price-canonical-name{flex-basis:60px}}

/* 0.5.0 slice 2: header, status, export menu and pricing drawer */
.dss-panel{position:relative;container:dss-panel / inline-size}
.dss-head{flex:none;flex-wrap:nowrap;gap:16px;padding:12px 16px 12px 20px}
.dss-head h2{flex:0 0 auto;min-width:0}
.dss-head-actions{margin-left:auto}
.dss-tabs{gap:2px;min-width:0;overflow-x:auto;scrollbar-width:none}
.dss-tabs::-webkit-scrollbar{display:none}
.dss-tabs button{white-space:nowrap}
.dss-data-status{display:inline-flex;align-items:center;gap:7px;padding:0 6px;margin:0;border:0;font-size:var(--dss-fs-sm);line-height:1.6;color:var(--dss-text-3);white-space:nowrap;overflow-wrap:normal}
.dss-status-dot{width:7px;height:7px;border-radius:50%;background:var(--dss-ok);flex:none}
.dss-data-status.partial .dss-status-dot,.dss-data-status.stale .dss-status-dot{background:var(--dss-warn)}
.dss-data-status.fallback .dss-status-dot{background:var(--dss-text-3)}
.dss-data-status.loading .dss-status-dot,.dss-data-status.refreshing .dss-status-dot{background:var(--dss-accent);animation:dss-pulse 1s ease-in-out infinite}
.dss-status-text{overflow:hidden;text-overflow:ellipsis}
@keyframes dss-pulse{50%{opacity:.25}}
.dss-act-group{display:inline-flex;align-items:center;gap:2px;padding-left:6px;border-left:1px solid var(--dss-line-soft)}
.dss-icon-btn{width:32px;height:32px;border-radius:8px;border:0;background:none;color:var(--dss-text-2);display:inline-grid;place-items:center;flex:none;cursor:pointer}
.dss-icon-btn:hover:not(:disabled){background:var(--dss-hover);color:var(--dss-text)}
.dss-icon-btn:disabled{opacity:.35;cursor:default;background:none}
.dss-icon-btn[aria-expanded="true"]{background:var(--dss-accent-soft);color:var(--dss-text)}
.dss-export-btn{height:32px;padding:0 8px 0 9px;border-radius:8px;border:0;background:none;color:var(--dss-text-2);display:inline-flex;align-items:center;gap:5px;font-size:var(--dss-fs-md);cursor:pointer}
.dss-export-btn:hover:not(:disabled),.dss-export-btn[aria-expanded="true"]{background:var(--dss-hover);color:var(--dss-text)}
.dss-export-caret{color:var(--dss-text-3)}
.dss-menu-wrap{position:relative;display:inline-flex}
.dss-menu{position:absolute;top:calc(100% + 6px);right:0;z-index:40;min-width:200px;padding:4px;background:var(--dss-panel);border:1px solid var(--dss-line);border-radius:10px;box-shadow:var(--dss-shadow-pop)}
.dss-menu-item{display:flex;flex-direction:column;align-items:flex-start;width:100%;padding:8px 10px;border:0;border-radius:7px;background:none;color:var(--dss-text);font-size:var(--dss-fs-md);text-align:left;cursor:pointer}
.dss-menu-item:hover,.dss-menu-item:focus-visible{background:var(--dss-hover)}
.dss-menu-item-title{font-weight:600}
.dss-menu-item-hint{color:var(--dss-text-3);font-size:var(--dss-fs-xs)}
.dss-status-banner{display:flex;align-items:flex-start;gap:10px;padding:10px 20px;border-bottom:1px solid var(--dss-warn-line);background:var(--dss-warn-soft);font-size:var(--dss-fs-sm);color:var(--dss-text);flex:none}
.dss-status-banner.info{border-bottom-color:var(--dss-line);background:var(--dss-info-soft)}
.dss-status-banner-icon{margin-top:2px;color:var(--dss-warn);flex:none}
.dss-status-banner.info .dss-status-banner-icon{color:var(--dss-text-2)}
.dss-status-banner-txt{flex:1;min-width:0;overflow-wrap:anywhere}
.dss-status-banner-txt > strong{font-weight:650}
.dss-status-banner .dss-data-diagnostics{margin-top:4px}
.dss-status-banner .dss-data-diagnostics summary{cursor:pointer;color:var(--dss-text-2);width:fit-content}
.dss-banner-retry{height:26px;padding:0 8px;border:1px solid var(--dss-line);border-radius:7px;background:var(--dss-panel);color:var(--dss-text-2);font-size:var(--dss-fs-sm);cursor:pointer;flex:none}
.dss-banner-retry:hover{background:var(--dss-hover);color:var(--dss-text)}
.dss-drawer-scrim{position:absolute;inset:0;z-index:30;background:var(--dss-mask)}
.dss-drawer{position:absolute;top:0;right:0;bottom:0;z-index:31;width:min(460px,100%);box-sizing:border-box;display:flex;flex-direction:column;background:var(--dss-panel);border-left:1px solid var(--dss-line);box-shadow:var(--dss-shadow);container:dss-drawer / inline-size}
.dss-drawer-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px 12px 16px;border-bottom:1px solid var(--dss-line);flex:none}
.dss-drawer-head h3{margin:0;font-size:var(--dss-fs-lg);font-weight:650;color:var(--dss-text);white-space:nowrap}
.dss-drawer-body{flex:1;min-height:0;overflow-y:auto;padding:14px 16px 18px;overscroll-behavior:contain;scrollbar-gutter:stable}
.dss-drawer .dss-pricing{border:0;border-radius:0;margin:0;padding:0;background:transparent}
.dss-drawer .dss-pricing:not(.dss-pricing-error) > h3{display:none}
@container dss-panel (max-width:860px){
  .dss-head{flex-wrap:wrap;row-gap:6px;padding:10px 12px 8px 16px}
  .dss-head h2{flex-basis:auto}
  .dss-head>.dss-tabs{order:3;flex-basis:100%;margin-left:-4px}
  .dss-head-actions{margin-left:auto}
}
@container dss-panel (max-width:420px){
  .dss-head{gap:8px}
  .dss-head-actions{gap:4px}
  .dss-act-group{padding-left:2px}
  .dss-status-text,.dss-export-label{display:none}
}
@media (max-width:640px){
  .dss-drawer{width:100%}
}

/* 0.5.0 slice 3: single-scroll overview, KPIs, filter menu and project table */
.dss-overlay{overflow:hidden;font-size:var(--dss-fs-md)}
.dss-panel{height:min(1000px,calc(100vh - 10vh));height:min(1000px,calc(100dvh - 10vh))}
.dss-body{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:0 20px 20px;scrollbar-gutter:stable;overscroll-behavior:contain;--dss-body-pad-top:16px}
.dss-body::before{content:"";display:block;height:var(--dss-body-pad-top);flex:none}
.dss-tools{display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-height:30px;margin-bottom:12px}
.dss-seg{display:inline-flex;background:var(--dss-layer);border:1px solid var(--dss-line);border-radius:8px;padding:2px}
.dss-seg button{border:0;background:none;color:var(--dss-text-2);font-size:var(--dss-fs-md);padding:4px 11px;border-radius:7px;white-space:nowrap;cursor:pointer}
.dss-seg button.on{background:var(--dss-panel);color:var(--dss-text);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.06)}
.dss-date-nav{display:flex;align-items:center;gap:4px;min-width:0}
.dss-tool-btn{height:30px;padding:0 10px;border:1px solid var(--dss-line);border-radius:8px;background:var(--dss-panel);color:var(--dss-text-2);font-size:var(--dss-fs-md);display:inline-flex;align-items:center;gap:6px;white-space:nowrap;cursor:pointer}
.dss-tool-btn:hover{background:var(--dss-hover);color:var(--dss-text)}
.dss-tool-btn:disabled{opacity:.4;cursor:default}
.dss-date-label{font-weight:600;font-size:var(--dss-fs-md);min-width:150px;text-align:center;font-variant-numeric:tabular-nums;display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap}
.dss-today{font-size:var(--dss-fs-xs);font-weight:600;color:var(--dss-accent);background:var(--dss-accent-soft);border-radius:5px;padding:1px 6px}
.dss-range-label{font-size:var(--dss-fs-md);color:var(--dss-text-2)}
.dss-popover-wrap{position:relative;display:inline-flex}
.dss-tools>.dss-popover-wrap{margin-left:auto}
.dss-filter-badge{font-size:var(--dss-fs-xs);color:var(--dss-warn);background:var(--dss-warn-soft);border-radius:999px;padding:1px 6px}
.dss-kpis{display:grid;grid-template-columns:1.45fr repeat(3,minmax(0,1fr));border:1px solid var(--dss-line);border-radius:14px;margin-bottom:10px;font-variant-numeric:tabular-nums}
.dss-kpi{padding:10px 16px 11px;display:flex;flex-direction:column;gap:4px;min-width:0;position:relative}
.dss-kpi+.dss-kpi{border-left:1px solid var(--dss-line-soft)}
.dss-kpi.cost{background:var(--dss-layer);border-radius:13px 0 0 13px}
.dss-kpi-k{font-size:var(--dss-fs-sm);color:var(--dss-text-2);display:flex;align-items:center;gap:4px}
.dss-kpi-v{font-size:var(--dss-fs-xl);font-weight:650;line-height:1.2;letter-spacing:-.01em;white-space:nowrap}
.dss-kpi.cost .dss-kpi-v{font-size:var(--dss-fs-2xl);color:var(--dss-cost)}
.dss-kpi-s{font-size:var(--dss-fs-sm);color:var(--dss-text-3);display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.dss-kpi-delta{background:var(--dss-hover);color:var(--dss-text-2);border-radius:6px;padding:1px 7px;font-size:var(--dss-fs-xs);white-space:nowrap}
.dss-info-wrap{position:relative;display:inline-flex}
.dss-info{border:0;background:none;padding:2px;border-radius:5px;color:var(--dss-text-3);display:inline-grid;cursor:pointer}
.dss-info:hover{color:var(--dss-text)}
.dss-info-tip{display:none;position:absolute;top:calc(100% + 6px);left:-10px;width:270px;z-index:20;background:var(--dss-panel);border:1px solid var(--dss-line);border-radius:10px;box-shadow:var(--dss-shadow-pop);padding:9px 11px;font-size:var(--dss-fs-sm);color:var(--dss-text-2);line-height:1.55}
.dss-info:hover+.dss-info-tip,.dss-info:focus+.dss-info-tip,.dss-info:focus-visible+.dss-info-tip{display:block}
.dss-info-wrap:focus-within .dss-info-tip{display:block}
.dss-tokbar{display:flex;height:6px;border-radius:3px;overflow:hidden;gap:2px;background:var(--dss-line-soft)}
.dss-tokbar i{flex-basis:0;min-width:2px}
.dss-tokbar .cache,.dss-tok-legend .dot.cache{background:var(--dss-accent)}
.dss-tokbar .unc,.dss-tok-legend .dot.unc{background:var(--dss-chart-input)}
.dss-tokbar .out,.dss-tok-legend .dot.out{background:var(--dss-chart-output)}
.dss-tok-legend{display:flex;flex-wrap:wrap;gap:2px 10px;font-size:var(--dss-fs-xs);color:var(--dss-text-3)}
.dss-tok-legend span{display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
.dss-tok-legend .dot{width:7px;height:7px;border-radius:2px;display:inline-block}
.dss-pending-chip{display:inline-flex;align-items:center;gap:4px;border:1px dashed var(--dss-warn-line);background:var(--dss-warn-soft);color:var(--dss-warn);border-radius:6px;padding:1px 7px;font-size:var(--dss-fs-sm);white-space:nowrap;line-height:1.6;cursor:pointer}
.dss-pending-chip.sm{font-size:var(--dss-fs-xs);padding:0 6px}
.dss-pending-chip:hover{border-style:solid}
.dss-strip{display:flex;flex-wrap:wrap;gap:4px 22px;font-size:var(--dss-fs-sm);color:var(--dss-text-3);padding:0 4px;margin-bottom:10px;font-variant-numeric:tabular-nums}
.dss-strip b{color:var(--dss-text);font-weight:600}
.dss-projects{display:flex;flex-direction:column;gap:6px;margin-top:4px}
.dss-proj-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.dss-proj-head h3{margin:0;font-size:var(--dss-fs-lg);font-weight:650;display:inline-flex;align-items:center}
.dss-muted{font-size:var(--dss-fs-sm);color:var(--dss-text-3)}
.dss-sort-narrow{display:none;margin-left:auto;align-items:center;gap:6px;font-size:var(--dss-fs-sm);color:var(--dss-text-3)}
.dss-sort-narrow select{height:26px;border:1px solid var(--dss-line);border-radius:7px;background:var(--dss-panel);color:var(--dss-text);font-size:var(--dss-fs-sm);padding:0 6px}
.dss-ptable{width:100%;border-collapse:separate;border-spacing:0;font-size:var(--dss-fs-md);font-variant-numeric:tabular-nums}
.dss-ptable th{position:sticky;top:0;z-index:3;background:var(--dss-panel);font-size:var(--dss-fs-xs);color:var(--dss-text-3);font-weight:500;text-align:right;padding:7px 10px;border-bottom:1px solid var(--dss-line);white-space:nowrap}
.dss-ptable th.c-proj{text-align:left;padding-left:4px}
.dss-ptable th.c-meta{display:none}
.dss-sort-btn{border:0;background:none;padding:2px 0;color:inherit;font-size:inherit;display:inline-flex;align-items:center;gap:3px;border-radius:4px;cursor:pointer}
.dss-sort-btn:hover,.dss-sort-btn.on{color:var(--dss-text)}
.dss-sort-arr{width:8px;text-align:left}
.dss-prow{cursor:pointer}
.dss-prow:hover{background:var(--dss-hover-row)}
.dss-prow.open,.dss-pdetail{background:var(--dss-layer)}
.dss-prow.open td{border-bottom-color:transparent}
.dss-prow td{padding:10px;border-bottom:1px solid var(--dss-line-soft);text-align:right;vertical-align:middle;white-space:nowrap}
.dss-prow td.c-proj{text-align:left;white-space:normal;width:32%;padding-left:4px}
.dss-proj{display:flex;align-items:center;gap:8px;min-width:0}
.dss-chev{width:22px;height:22px;border:0;background:none;border-radius:6px;color:var(--dss-text-3);display:inline-grid;place-items:center;flex:none;cursor:pointer}
.dss-chev:hover{background:var(--dss-hover);color:var(--dss-text)}
.dss-chev svg{transition:transform .15s;transform:rotate(-90deg)}
.dss-chev[aria-expanded="true"] svg{transform:rotate(0)}
.dss-pdot{width:9px;height:9px;border-radius:3px;background:var(--c);flex:none;display:inline-block}
.dss-ptxt{display:flex;flex-direction:column;min-width:0}
.dss-pname{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dss-ppath{font-size:var(--dss-fs-xs);color:var(--dss-text-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dss-cell-sub{font-size:var(--dss-fs-xs);color:var(--dss-text-3)}
.dss-cost-line{display:flex;align-items:center;justify-content:flex-end;gap:6px}
.dss-cost-amt{color:var(--dss-cost);font-weight:650}
.dss-share{display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-top:3px}
.dss-share-bar{width:64px;height:4px;border-radius:2px;background:var(--dss-line-soft);overflow:hidden;display:block}
.dss-share-bar i{display:block;height:100%;background:var(--dss-cost);opacity:.75;border-radius:2px}
.dss-share-pct{font-size:var(--dss-fs-xs);color:var(--dss-text-3);min-width:28px}
.dss-prow td.c-last{color:var(--dss-text-2)}
.dss-prow td.c-meta{display:none}
.dss-pdetail td{padding:0 10px 14px 34px;text-align:left;white-space:normal;border-bottom:1px solid var(--dss-line)}
.dss-pdetail-meta{display:flex;flex-wrap:wrap;gap:4px 16px;padding:8px 0 2px 10px;border-bottom:1px dashed var(--dss-line);margin-bottom:4px;font-size:var(--dss-fs-xs);color:var(--dss-text-3);font-variant-numeric:tabular-nums}
.dss-pdetail-meta b{color:var(--dss-text-2);font-weight:600}
.dss-ppath-full{flex:1 1 220px;min-width:0;color:var(--dss-text-3);overflow-wrap:anywhere}
.dss-sessions{display:flex;flex-direction:column;min-width:0}
.dss-ptable .dss-sess{--dss-data-shift:0;grid-template-columns:minmax(0,1fr) 74px 62px 104px 36px 92px minmax(110px,150px) 68px;gap:6px;padding:6px 8px;border-top:1px solid var(--dss-line-soft);border-bottom:0;font-size:var(--dss-fs-sm);align-items:center;width:100%;box-sizing:border-box;min-width:0}
.dss-ptable .dss-sess>:nth-child(n+2){transform:none}
.dss-ptable .dss-sess .dss-sess-model{transform:none!important;text-align:left!important}
.dss-ptable .dss-sess>.dss-sess-title{display:flex;align-items:center;flex-wrap:wrap;gap:4px;min-width:0;width:100%;border:0;background:none;color:var(--dss-text);font:inherit;font-size:var(--dss-fs-sm);font-weight:600;line-height:1.4;text-align:left;cursor:pointer;padding:0;white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere}
.dss-ptable .dss-sess>.dss-sess-title .dss-tag{margin-left:0}
.dss-ptable .dss-sess>.st{min-width:0;white-space:nowrap;overflow:visible;text-overflow:clip;font-variant-numeric:tabular-nums}
.dss-ptable .dss-sess>.dss-sess-model{white-space:normal;overflow-wrap:anywhere}
.dss-ptable .dss-sess>.dss-sess-cost{grid-column:auto;width:auto;text-align:right!important;transform:none!important;color:var(--dss-cost);font-weight:600}
.dss-ptable .dss-sess-h>.dss-sess-cost{color:var(--dss-text-3);font-weight:500}
.dss-ptable .dss-sess>.dss-sess-meta{display:none;grid-column:1/-1;text-align:left;color:var(--dss-text-3);font-size:var(--dss-fs-xs);white-space:normal;overflow-wrap:anywhere}
.dss-ptable .dss-sess.sub>.dss-sess-title{padding-left:16px}
.dss-ptable .dss-sess.sub>.dss-sess-meta{padding-left:16px}
.dss-ptable .dss-sess-h{font-size:var(--dss-fs-xs);color:var(--dss-text-3);padding-top:2px;border-top:1px dashed var(--dss-line);border-bottom:0;white-space:nowrap}
.dss-ptable .dss-sess-h>span{text-align:right;white-space:nowrap;overflow:visible}
.dss-ptable .dss-sess-h>span:first-child{text-align:left}
.dss-ptable .dss-sess-h>.dss-sess-model{text-align:left}
.dss-ptable .dss-sess .dss-sess-cost{grid-column:auto;width:auto;text-align:right!important}
.dss-popover{position:absolute;top:calc(100% + 6px);right:0;z-index:30;background:var(--dss-panel);border:1px solid var(--dss-line);border-radius:12px;box-shadow:var(--dss-shadow-pop);padding:10px;width:min(290px,calc(100vw - 32px));max-height:min(360px,70vh);overflow-y:auto;overscroll-behavior:contain}
.dss-filter-head{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:var(--dss-fs-sm);color:var(--dss-text-3)}
.dss-link-btn{border:0;background:none;color:var(--dss-accent);padding:0;font-size:var(--dss-fs-sm);cursor:pointer}
.dss-filter-search{box-sizing:border-box;width:100%;margin:8px 0;padding:6px 9px;border:1px solid var(--dss-line);border-radius:7px;background:var(--dss-input);color:var(--dss-text);font-size:var(--dss-fs-sm);outline:none}
.dss-filter-search:focus{border-color:var(--dss-accent)}
.dss-filter-list{display:flex;flex-direction:column;gap:2px;max-height:210px;overflow-y:auto;margin:0 -2px;padding:0 2px}
.dss-filter-item{display:flex;align-items:center;gap:8px;padding:6px 7px;border-radius:7px;font-size:var(--dss-fs-md);color:var(--dss-text);cursor:pointer}
.dss-filter-item:hover{background:var(--dss-hover)}
.dss-filter-item.off{opacity:.55}
.dss-filter-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dss-filter-cost,.dss-filter-val{font-size:var(--dss-fs-xs);color:var(--dss-text-3);white-space:nowrap}
.dss-filter-note{margin:8px 2px 0;font-size:var(--dss-fs-xs);color:var(--dss-text-3);line-height:1.4}
.dss-filter-popover .dss-pages{margin:6px 0 0;font-size:var(--dss-fs-xs)}
@container dss-panel (max-width:860px){
  .dss-date-label{min-width:0}
  .dss-strip{gap:4px 14px}
}
@media (max-width:640px){
  .dss-body{padding:0 14px 16px;--dss-body-pad-top:12px}
}
@container dss-panel (max-width:640px){
  .dss-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
  .dss-kpi.cost{grid-column:1/-1;border-radius:13px 13px 0 0;border-bottom:1px solid var(--dss-line-soft)}
  .dss-kpi+.dss-kpi{border-left:0}
  .dss-kpi:nth-child(3),.dss-kpi:nth-child(4){border-top:1px solid var(--dss-line-soft)}
  .dss-kpi:nth-child(3){border-left:1px solid var(--dss-line-soft)}
  .dss-kpi:nth-child(4){border-left:0;grid-column:1/-1}
  .dss-sort-narrow{display:flex}
  .dss-tools>.dss-popover-wrap{margin-left:0}
  .dss-ptable,.dss-ptable tbody{display:block}
  .dss-ptable thead{display:none}
  .dss-ptable tr.dss-prow{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"proj cost" "meta meta";gap:4px 12px;padding:11px 4px;border-bottom:1px solid var(--dss-line-soft)}
  .dss-ptable tr.dss-prow.open{border-bottom-color:transparent}
  .dss-ptable tr.dss-prow td{display:none;border:0;padding:0}
  .dss-ptable tr.dss-prow td.c-proj{display:block;grid-area:proj;width:auto}
  .dss-ptable tr.dss-prow td.c-cost{display:block;grid-area:cost;min-width:0}
  .dss-ptable tr.dss-prow td.c-meta{display:block;grid-area:meta;text-align:left;white-space:normal;color:var(--dss-text-3);font-size:var(--dss-fs-sm);padding-left:47px}
  .dss-ptable tr.dss-pdetail{display:block}
  .dss-ptable tr.dss-pdetail td{display:block;padding:0 6px 12px 12px}
  .dss-ptable .dss-sess{grid-template-columns:minmax(0,1fr) auto;gap:2px 10px;padding:6px 6px;font-size:var(--dss-fs-xs)}
  .dss-ptable .dss-sess>span{display:none}
  .dss-ptable .dss-sess>.dss-sess-title{display:flex;grid-column:1;grid-row:1;min-width:0;font-size:var(--dss-fs-sm)}
  .dss-ptable .dss-sess>.dss-sess-cost{display:block;grid-column:2;grid-row:1;text-align:right!important;white-space:nowrap;color:var(--dss-cost);font-size:var(--dss-fs-xs)}
  .dss-ptable .dss-sess>.dss-sess-meta{display:block;grid-column:1/-1;grid-row:2;text-align:left;color:var(--dss-text-3);font-size:var(--dss-fs-xs);white-space:normal;overflow-wrap:anywhere}
  .dss-ptable .dss-sess.sub>.dss-sess-title,.dss-ptable .dss-sess.sub>.dss-sess-meta{padding-left:16px}
  .dss-ptable .dss-sess-h{display:none}
  .dss-pdetail-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 12px;align-items:start;padding-left:8px}
  .dss-ppath-full{grid-column:1/-1;flex:none}
  .dss-kpi.cost .dss-info-wrap{position:static}
  .dss-kpi.cost .dss-info-tip{left:14px;right:14px;width:auto;top:calc(100% + 6px);z-index:25}
}
@container dss-panel (max-width:420px){
  .dss-tools{gap:6px}
  .dss-date-label{font-size:var(--dss-fs-sm)}
  .dss-kpi{padding:10px 12px}
  .dss-kpi.cost .dss-kpi-v{font-size:var(--dss-fs-xl)}
}


/* 0.5.x slice 4b: day timeline */
.dss-tl{position:relative;display:flex;flex-direction:column;font-variant-numeric:tabular-nums}
.dss-tl-top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 24px;margin-bottom:6px}
.dss-tl-sum{display:flex;flex-wrap:wrap;gap:4px 22px;font-size:var(--dss-fs-sm);color:var(--dss-text-3);padding:0 2px}
.dss-tl-sum b{color:var(--dss-text);font-weight:600;margin-left:5px}
.dss-tl-ctl{display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px}
.dss-tl-ctl-inline{display:inline-flex;align-items:center;gap:8px}
.dss-tl-ctl-k{font-size:var(--dss-fs-sm);color:var(--dss-text-3);white-space:nowrap}
.dss-tl-day{position:relative;--lw:212px;--tw:72px}
.dss-tl-lines{position:absolute;top:22px;bottom:0;left:var(--lw);right:var(--tw);pointer-events:none}
.dss-tl-lines i{position:absolute;top:0;bottom:0;width:1px;background:var(--dss-tl-grid)}
.dss-tl-lines .dss-tl-grid-line.is-major{background:var(--dss-tl-grid-major)}
.dss-tl-band{position:absolute;top:0;bottom:0;background:var(--dss-accent-soft);box-shadow:inset 1px 0 var(--dss-accent-line),inset -1px 0 var(--dss-accent-line)}
.dss-tl-now{position:absolute;top:-22px;bottom:0;width:0;border-left:1.5px solid var(--dss-accent);z-index:3}
.dss-tl-now span{position:absolute;top:3px;left:5px;font-size:var(--dss-fs-xs);color:var(--dss-accent);white-space:nowrap;font-weight:600;background:var(--dss-panel);padding:0 3px;border-radius:3px;line-height:16px}
.dss-tl-now.is-flip span{left:auto;right:5px}
.dss-tl-row{display:grid;grid-template-columns:var(--lw) minmax(0,1fr) var(--tw);align-items:stretch;position:relative}
.dss-tl-track{position:relative;min-width:0}
.dss-tl-axis{height:22px}
.dss-tl-tick{position:absolute;top:2px;transform:translateX(-50%);font-size:var(--dss-fs-xs);color:var(--dss-text-3);white-space:nowrap;font-variant-numeric:tabular-nums}
.dss-tl-tick.is-first{transform:none}
.dss-tl-tick.is-last{transform:translateX(-100%)}
.dss-tl-hist{height:70px;border-bottom:1px solid var(--dss-line)}
.dss-tl-hist .dss-tl-track{margin-top:10px}
.dss-tl-hist-lab{display:flex;flex-direction:column;justify-content:center;gap:1px;padding-right:12px;font-size:var(--dss-fs-xs);color:var(--dss-text-3);position:relative}
.dss-tl-hist-total{font-size:var(--dss-fs-lg);font-weight:650;color:var(--dss-cost);font-variant-numeric:tabular-nums;line-height:1.3}
.dss-tl-hist.is-token .dss-tl-hist-total{color:var(--dss-text)}
.dss-tl-peak{display:flex;flex-direction:column;align-items:flex-end;font-size:var(--dss-fs-xs);line-height:1.4;color:var(--dss-text-3);padding-top:4px;font-variant-numeric:tabular-nums;white-space:nowrap}
.dss-tl-peak b{color:var(--dss-text-2);font-weight:600}
.dss-tl-ref{position:absolute;left:0;right:0;top:0;border-top:1px dashed var(--dss-tl-grid-major);pointer-events:none}
.dss-tl-bar{position:absolute;bottom:0;border:0;padding:0;border-radius:2px 2px 0 0;background:var(--dss-tl-bar-cost);min-height:2px;cursor:pointer}
.dss-tl-bar.is-token{background:var(--dss-tl-bar-token)}
.dss-tl-bar.is-partial{background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.3) 0 3px,transparent 3px 6px)}
.dss-tl-bar:hover,.dss-tl-bar:focus-visible{filter:brightness(1.12);outline:2px solid var(--dss-text);outline-offset:1px;z-index:2}
.dss-tl-lane{min-height:36px;border-bottom:1px solid var(--dss-line-soft)}
.dss-tl-lane.is-open{border-bottom-color:transparent}
.dss-tl-lab{display:flex;align-items:center;gap:7px;min-width:0;padding-right:12px;position:relative}
.dss-tl-chev{width:22px;height:22px;border:0;background:none;border-radius:6px;color:var(--dss-text-3);display:inline-grid;place-items:center;flex:none;margin-left:-4px;cursor:pointer}
.dss-tl-chev:hover{background:var(--dss-hover);color:var(--dss-text)}
.dss-tl-chev svg{transition:transform .15s;transform:rotate(-90deg)}
.dss-tl-chev[aria-expanded="true"] svg{transform:rotate(0)}
.dss-tl-name{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.dss-tl-count{font-size:var(--dss-fs-xs);color:var(--dss-text-3);flex:none;font-variant-numeric:tabular-nums}
.dss-tl-tot{display:flex;align-items:center;justify-content:flex-end;font-size:var(--dss-fs-sm);color:var(--dss-text-2);font-variant-numeric:tabular-nums;white-space:nowrap}
.dss-tl-run{position:absolute;top:50%;height:18px;transform:translateY(-50%);display:flex;border:0;padding:0;margin:0;border-radius:4px;overflow:hidden;min-width:4px;background:var(--dss-panel);z-index:1;cursor:pointer}
.dss-tl-run i{flex:1 1 0;background:var(--c);opacity:var(--o)}
.dss-tl-run:hover,.dss-tl-run:focus-visible{outline:2px solid var(--dss-text);outline-offset:1px;z-index:2}
.dss-tl-run.is-thin{height:8px;border-radius:3px}
.dss-tl-sess{min-height:26px}
.dss-tl-sess .dss-tl-lab{padding-left:26px}
.dss-tl-sess.is-sub .dss-tl-lab{padding-left:40px}
.dss-tl-sess.is-last{border-bottom:1px solid var(--dss-line-soft);min-height:32px;padding-bottom:6px}
.dss-tl-sess .dss-tl-run{height:8px;border-radius:3px}
.dss-tl-sess-link{border:0;background:none;padding:2px 5px;margin-left:-5px;border-radius:5px;display:flex;align-items:center;gap:6px;min-width:0;color:var(--dss-text-2);font-size:var(--dss-fs-sm);text-align:left;cursor:pointer}
.dss-tl-sess-link:hover{color:var(--dss-text);background:var(--dss-hover)}
.dss-tl-sess-link .dss-tl-name{font-weight:400}
.dss-tl-sess .dss-tl-tot{font-size:var(--dss-fs-xs);color:var(--dss-text-3)}
.dss-tl-legend{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;font-size:var(--dss-fs-xs);color:var(--dss-text-3);padding-top:12px;position:relative}
.dss-tl-scale{display:inline-flex;align-items:center;gap:3px}
.dss-tl-scale i{width:16px;height:10px;border-radius:2px;background:var(--dss-text-2);opacity:var(--o)}
.dss-tl-scale span{margin:0 3px}
.dss-tl-pop{position:absolute;z-index:40;width:min(360px,calc(100% - 16px));background:var(--dss-panel);border:1px solid var(--dss-line);border-radius:12px;box-shadow:var(--dss-shadow-pop);padding:10px 12px;font-size:var(--dss-fs-sm);left:0;top:0;overflow-y:auto;overscroll-behavior:contain}
.dss-tl-pop-h{display:flex;align-items:center;gap:8px;margin-bottom:4px}
.dss-tl-pop-h b{font-size:var(--dss-fs-md);font-variant-numeric:tabular-nums}
.dss-tl-pop-date{color:var(--dss-text-3);font-size:var(--dss-fs-xs)}
.dss-tl-pop-close{width:26px;height:26px;border:0;border-radius:7px;background:none;color:var(--dss-text-2);display:inline-grid;place-items:center;margin-left:auto;font-size:var(--dss-fs-lg);line-height:1;cursor:pointer}
.dss-tl-pop-close:hover{background:var(--dss-hover);color:var(--dss-text)}
.dss-tl-pop-p{padding:6px 0 4px;border-top:1px solid var(--dss-line-soft)}
.dss-tl-pop-pr{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:8px;align-items:center;padding:0 4px}
.dss-tl-pop-pr .dss-tl-name{font-weight:600}
.dss-tl-pop-s{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:10px;align-items:center;width:100%;border:0;background:none;padding:3px 4px 3px 21px;border-radius:6px;text-align:left;color:var(--dss-text-2);font-size:var(--dss-fs-xs);cursor:pointer}
.dss-tl-pop-s:hover{background:var(--dss-hover);color:var(--dss-text)}
.dss-tl-pop-s .dss-tl-name{display:flex;align-items:center;gap:5px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dss-tl-v{font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
.dss-tl-v.is-cost{color:var(--dss-cost)}
.dss-tl-pop-f{border-top:1px solid var(--dss-line);padding-top:7px;margin-top:2px;color:var(--dss-text-3);font-size:var(--dss-fs-xs);font-variant-numeric:tabular-nums}
.dss-tl-more{color:var(--dss-text-3);font-size:var(--dss-fs-xs);padding:2px 4px}
@container dss-panel (max-width:860px){
  .dss-tl-day{--lw:172px;--tw:60px}
  .dss-tl-count{display:none}
}
@container dss-panel (max-width:640px){
  .dss-tl-day{--lw:0px;--tw:0px}
  .dss-tl-row{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"lab tot" "trk trk"}
  .dss-tl-row>:first-child{grid-area:lab}
  .dss-tl-row>.dss-tl-track{grid-area:trk}
  .dss-tl-row>:last-child{grid-area:tot}
  .dss-tl-lab,.dss-tl-tot,.dss-tl-hist-lab,.dss-tl-peak{background:var(--dss-panel);position:relative;z-index:4}
  .dss-tl-axis{height:auto}
  .dss-tl-axis .dss-tl-track{height:20px}
  .dss-tl-hist{height:auto;padding-bottom:2px}
  .dss-tl-hist .dss-tl-track{height:48px;margin-top:2px}
  .dss-tl-hist-lab{flex-direction:row;align-items:baseline;justify-content:flex-start;gap:8px}
  .dss-tl-hist-total{font-size:var(--dss-fs-md)}
  .dss-tl-peak{flex-direction:row;align-items:baseline;gap:6px;padding-top:2px}
  .dss-tl-lane{min-height:0;padding-top:6px}
  .dss-tl-lane .dss-tl-track{height:24px}
  .dss-tl-lab{padding-right:8px;min-height:24px}
  .dss-tl-sess{min-height:0}
  .dss-tl-sess .dss-tl-lab{padding-left:22px;min-height:22px}
  .dss-tl-sess .dss-tl-track{height:14px}
  .dss-tl-sess.is-last{min-height:0}
  .dss-tl-sess .dss-tl-tot{min-height:22px}
  .dss-tl-tick.is-odd{display:none}
  .dss-tl-lines{top:20px;left:0;right:0}
}
:is(.dss-overlay, .dss-trigger, .dss-tt):focus-visible,
:is(.dss-overlay, .dss-trigger, .dss-tt) :focus-visible {
  outline: 2px solid var(--dss-accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  :is(.dss-overlay, .dss-trigger, .dss-tt),
  :is(.dss-overlay, .dss-trigger, .dss-tt) * {
    transition: none !important;
    animation: none !important;
  }
}
`;

module.exports = { css };
