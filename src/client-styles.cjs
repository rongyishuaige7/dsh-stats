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
  --dss-warn-fill: #f59e0b;
  --dss-skel: #232933;
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
  --dss-chart-cache: #2e4a7e;
  --dss-tl-grid: #1c212a;
  --dss-tl-grid-major: #272d38;
  --dss-tl-cell: #232933;
  --dss-tl-bar-cost: #f08a3c;
  --dss-tl-bar-token: #4f8cff;
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
  --dss-warn-fill: #d97706;
  --dss-skel: #eceff3;
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
  --dss-chart-cache: #bfd1f8;
  --dss-input: var(--dsw-alias-bg-layer-1, #ffffff);
  --dss-inset: rgba(0,0,0,.02);
  --dss-chip-bg: rgba(0,0,0,.06);
  --dss-badge-bg: rgba(0,0,0,.06);
  --dss-meta-line: rgba(0,0,0,.08);
}

.dss-overlay{position:fixed;inset:0;z-index:1000;background:var(--dss-mask);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:flex-start;justify-content:center;padding:6vh 3vw 4vh;overflow:auto}.dss-panel button,.dss-trigger{-webkit-user-select:none;-moz-user-select:none;user-select:none;-webkit-touch-callout:none}.dss-trigger{box-sizing:border-box;cursor:pointer;color:var(--dss-text);background:transparent;border:0;display:flex;align-items:center;flex:0 0 auto;font-family:inherit;overflow:hidden;transition:background-color 140ms ease,color 140ms ease}.dss-trigger.wide{width:calc(100% + 8px);height:34px;margin:4px -4px;padding:6px 2px 6px 10px;gap:8px;border-radius:12px;justify-content:flex-start;font-size:14px;line-height:22px}.dss-trigger.rail{width:36px;height:36px;margin:0;padding:0;gap:0;border-radius:50%;justify-content:center}.dss-trigger:hover{background:var(--dss-hover)}.dss-trigger:active{background:var(--dss-active)}.dss-trigger-label{white-space:nowrap;overflow:hidden}.dss-panel{width:min(1180px,100%);background:var(--dss-panel);border:1px solid var(--dss-line);border-radius:16px;box-shadow:var(--dss-shadow);color:var(--dss-text);display:flex;flex-direction:column;overflow:hidden}.dss-head{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--dss-line)}.dss-head h2{margin:0;font-size:var(--dss-fs-lg);font-weight:650;flex:1;min-width:0;white-space:nowrap}.dss-tabs{display:flex;gap:4px}.dss-tabs button{background:none;border:none;color:var(--dss-text-2);font-size:var(--dss-fs-md);padding:6px 12px;border-radius:8px;cursor:pointer}.dss-tabs button.on{background:var(--dss-accent-soft);color:var(--dss-text);font-weight:600}.dss-close{background:none;border:none;color:var(--dss-text-2);cursor:pointer;border-radius:8px;width:28px;height:28px;display:grid;place-items:center;flex-shrink:0}.dss-close:hover{background:var(--dss-hover)}.dss-head-actions{flex:none;display:flex;align-items:center;justify-content:flex-end;gap:6px;white-space:nowrap}.dss-export{background:none;border:1px solid var(--dss-line);color:var(--dss-text-2);cursor:pointer;border-radius:7px;padding:3px 8px;font-size:var(--dss-fs-sm);white-space:nowrap;flex-shrink:0}.dss-export:hover{background:var(--dss-hover);color:var(--dss-text)}.dss-export:disabled{opacity:.45;cursor:default}.dss-body{padding:16px 18px;overflow:auto}.dss-data-status{padding:0 0 12px;margin-bottom:12px;border-bottom:1px solid var(--dss-line);font-size:var(--dss-fs-xs);line-height:1.6;color:var(--dss-text-2);overflow-wrap:anywhere}.dss-data-status-line{display:flex;align-items:baseline;gap:4px 14px;flex-wrap:wrap}.dss-data-status strong{font-size:var(--dss-fs-xs);font-weight:600}.dss-data-status.stale strong,.dss-data-status.fallback strong,.dss-data-status.partial strong,.dss-data-cost{color:var(--dss-text)}.dss-data-diagnostics{margin-top:6px}.dss-data-diagnostics summary{cursor:pointer;width:fit-content}.dss-data-diagnostics>div{padding-top:4px;white-space:pre-wrap}.dss-sess{--dss-data-shift:20px;display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1.08fr) minmax(0,.75fr) minmax(0,.9fr) minmax(0,.85fr) minmax(0,1.3fr) minmax(0,1.25fr) clamp(8px,1.7vw,20px) minmax(0,.65fr);gap:6px;align-items:center;width:100%;box-sizing:border-box;min-width:0;padding:7px 8px;border-bottom:1px solid var(--dss-line);font-size:var(--dss-fs-md);transition:background .12s}.dss-sess:last-child{border-bottom:none}.dss-sess:hover{background:var(--dss-hover-row)}.dss-sess .ti{font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:16px;box-sizing:border-box}.dss-sess-title{display:block;width:100%;border:0;background:none;color:inherit;font:inherit;line-height:inherit;text-align:left;cursor:pointer;padding:0 16px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dss-sess>:nth-child(n+2){transform:translateX(var(--dss-data-shift))}.dss-sess .me{color:var(--dss-text-3);font-size:var(--dss-fs-sm);text-align:right;font-variant-numeric:tabular-nums;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dss-sess .st{color:var(--dss-text-2);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap;min-width:0;overflow:hidden;text-overflow:ellipsis}.dss-sess-model{text-align:right!important;transform:translateX(var(--dss-data-shift))!important}.dss-sess-cost{grid-column:10;text-align:left!important}.dss-pages{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin:8px 0 12px;font-size:var(--dss-fs-sm);color:var(--dss-text-2)}.dss-tag{font-size:var(--dss-fs-xs);font-weight:600;color:var(--dss-accent);background:var(--dss-accent-soft);border-radius:4px;padding:1px 5px;margin-left:6px;vertical-align:middle;white-space:nowrap}.dss-tag.is-archived{color:var(--dss-text-2);background:var(--dss-hover)}.dss-group{font-size:var(--dss-fs-xs);font-weight:600;color:var(--dss-text-3);padding:9px 12px 3px}.dss-empty{color:var(--dss-text-3);text-align:center;padding:32px 0}.dss-activity-only{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;padding:12px 14px;border:1px solid var(--dss-line-soft);border-radius:10px;background:var(--dss-layer);color:var(--dss-text-2);font-size:var(--dss-fs-sm)}.dss-tt{background:var(--dss-tip-bg);border:1px solid var(--dss-line);border-radius:9px;padding:8px 11px;box-shadow:var(--dss-shadow-pop);font-size:var(--dss-fs-md);position:fixed;z-index:2000;pointer-events:none;display:none;max-width:320px}.dss-tt.show{display:block}.dss-cost{font-variant-numeric:tabular-nums;font-weight:600;color:var(--dss-text)}[data-color='0']{--c:var(--dss-p0)}[data-color='1']{--c:var(--dss-p1)}[data-color='2']{--c:var(--dss-p2)}[data-color='3']{--c:var(--dss-p3)}[data-color='4']{--c:var(--dss-p4)}[data-color='5']{--c:var(--dss-p5)}[data-color='6']{--c:var(--dss-p6)}[data-color='7']{--c:var(--dss-p7)}[data-color='8']{--c:var(--dss-p8)}[data-color='9']{--c:var(--dss-p9)}[data-color='10']{--c:var(--dss-p10)}[data-color='11']{--c:var(--dss-p11)}[data-color='12']{--c:var(--dss-p12)}[data-color='13']{--c:var(--dss-p13)}[data-color='14']{--c:var(--dss-p14)}[data-color='15']{--c:var(--dss-p15)}.dss-tip-title{font-weight:650;margin-bottom:5px;color:var(--dss-text)}.dss-tip-title:only-child{margin-bottom:0}.dss-tip-row{display:flex;justify-content:space-between;gap:14px;line-height:1.6;color:var(--dss-text-2)}.dss-tip-row b{font-variant-numeric:tabular-nums;color:var(--dss-text)}@container dss-panel (max-width:860px){.dss-head{flex-wrap:wrap}.dss-head h2{min-width:0}.dss-head>.dss-tabs{order:3;flex-basis:100%}.dss-head-actions{margin-left:auto}}@media (min-width:768px){.dss-sess-cost{width:calc(100% - 8px)}}@media (max-width:767px){.dss-sess{--dss-data-shift:10px}}@media (max-width:640px){.dss-overlay{padding:0}.dss-panel{border-radius:0;min-height:100%;width:100%}.dss-body{padding:12px}.dss-sess{width:calc(100% - 2px);gap:3px;padding:6px 4px;font-size:var(--dss-fs-xs)}.dss-sess .ti{padding-right:4px}.dss-sess .me,.dss-sess .st{font-size:var(--dss-fs-xs)}.dss-tabs button{padding:6px 8px}}
	.dss-tc-val.dss-tc-cost{color:var(--dss-cost)}
	.dss-pricing{font-size:var(--dss-fs-md);padding:16px;border:1px solid var(--dss-line);border-radius:12px;background:var(--dss-layer);margin-bottom:16px}
	.dss-pricing h3{margin:0 0 12px;font-size:var(--dss-fs-md);font-weight:650;color:var(--dss-text)}
	.dss-pricing h4{margin:0 0 8px;font-size:var(--dss-fs-md);font-weight:650;color:var(--dss-text)}
	.dss-pricing h5{margin:0 0 6px;font-size:var(--dss-fs-sm);font-weight:650;color:var(--dss-text)}
	.dss-price-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:10px 0}
	.dss-price-field{display:flex;flex-direction:column;gap:5px;font-size:var(--dss-fs-sm);color:var(--dss-text-2);min-width:0}
	.dss-pricing input:not([type=checkbox]),.dss-pricing select{box-sizing:border-box;width:100%;min-width:0;padding:6px 9px;border:1px solid var(--dss-line);border-radius:7px;background:var(--dss-input);color:var(--dss-text);font-size:var(--dss-fs-sm);outline:none;transition:border-color .15s}
	.dss-pricing input:not([type=checkbox]):focus,.dss-pricing select:focus{border-color:var(--dss-accent)}
	.dss-pricing input:disabled,.dss-pricing select:disabled{opacity:.55;cursor:default}
	.dss-price-actions,.dss-price-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0}
	.dss-price-row>span{flex:1 1 160px;min-width:140px;overflow-wrap:anywhere;font-size:var(--dss-fs-md)}
	.dss-pricing details{margin:8px 0}
	.dss-pricing summary{cursor:pointer;font-size:var(--dss-fs-sm);color:var(--dss-text-2)}
	.dss-pricing summary:hover{color:var(--dss-text)}
	.dss-price-muted{font-size:var(--dss-fs-sm);color:var(--dss-text-3);line-height:1.45;margin:4px 0;overflow-wrap:anywhere}
	.dss-price-preview{font-size:var(--dss-fs-sm);color:var(--dss-info);margin:0 0 6px;overflow-wrap:anywhere}
	.dss-pricing [role=alert]{color:var(--dss-danger);font-size:var(--dss-fs-sm);overflow-wrap:anywhere}
	.dss-pricing [role=status]{font-size:var(--dss-fs-sm)}
	.dss-price-nav{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;padding:10px 16px;border-bottom:1px solid var(--dss-line);background:var(--dss-panel);flex:none}
	.dss-price-nav-btn{min-width:0;height:32px;padding:0 8px;border:1px solid transparent;border-radius:8px;background:none;color:var(--dss-text-2);font-size:var(--dss-fs-sm);font-family:inherit;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
	.dss-price-nav-btn:hover{background:var(--dss-hover);color:var(--dss-text)}
	.dss-price-nav-btn.is-on{background:var(--dss-accent-soft);border-color:var(--dss-accent-line);color:var(--dss-text);font-weight:600}
	.dss-price-sync{display:flex;flex-direction:column;gap:2px;padding:0 0 10px;margin-bottom:10px;border-bottom:1px solid var(--dss-line-soft);min-width:0}
	.dss-price-sync-line{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;min-width:0}
	.dss-price-sync-line strong{font-size:var(--dss-fs-md);font-weight:650;color:var(--dss-text);overflow-wrap:anywhere}
	.dss-price-sync-last{font-size:var(--dss-fs-xs);color:var(--dss-text-3);overflow-wrap:anywhere}
	.dss-price-pending{border:1px solid var(--dss-warn-line);background:var(--dss-warn-soft);border-radius:8px;padding:8px 10px;margin:0 0 12px;min-width:0}
	.dss-price-pending-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap}
	.dss-price-pending-head h5{margin:0;color:var(--dss-text)}
	.dss-price-pending-head span{font-size:var(--dss-fs-xs);color:var(--dss-text-2)}
	.dss-price-pending-list{display:flex;flex-direction:column;gap:4px;margin-top:6px}
	.dss-price-pending-row{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0}
	.dss-price-pending-id{font-size:var(--dss-fs-sm);color:var(--dss-text);overflow-wrap:anywhere;min-width:0;flex:1}
	.dss-price-search-input{box-sizing:border-box;width:100%;padding:7px 11px;border:1px solid var(--dss-line);border-radius:7px;background:var(--dss-input);color:var(--dss-text);font-size:var(--dss-fs-md);outline:none;transition:border-color .15s}
	.dss-price-search-input:focus{border-color:var(--dss-accent)}
	.dss-price-search-input::placeholder{color:var(--dss-text-3)}
	.dss-price-scope{display:inline-flex;background:var(--dss-layer);border:1px solid var(--dss-line);border-radius:8px;padding:2px;margin:10px 0 6px;max-width:100%}
	.dss-price-scope-btn{border:0;background:none;color:var(--dss-text-2);font-size:var(--dss-fs-sm);font-family:inherit;padding:4px 10px;border-radius:6px;white-space:nowrap;cursor:pointer;min-width:0}
	.dss-price-scope-btn:hover{background:var(--dss-hover);color:var(--dss-text)}
	.dss-price-scope-btn.is-on{background:var(--dss-accent-soft);color:var(--dss-text);font-weight:600}
	.dss-price-count{font-size:var(--dss-fs-xs);color:var(--dss-text-2);font-variant-numeric:tabular-nums;margin:0 0 6px;overflow-wrap:anywhere;outline:none;scroll-margin-top:8px}
	.dss-price-count:focus-visible{outline:2px solid var(--dss-accent);outline-offset:2px}
	.dss-pricing .dss-price-detail-title:focus-visible{outline:2px solid var(--dss-accent);outline-offset:2px}
	.dss-price-model-list{display:flex;flex-direction:column;border-top:1px solid var(--dss-line-soft);min-width:0}
	.dss-price-model-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:4px 12px;width:100%;min-height:48px;padding:8px 2px;border:0;border-bottom:1px solid var(--dss-line-soft);background:none;color:inherit;font:inherit;text-align:left;cursor:pointer;min-width:0}
	.dss-price-model-row:hover{background:var(--dss-hover-row)}
	.dss-price-model-row:focus-visible{outline:2px solid var(--dss-accent);outline-offset:-2px}
	.dss-price-model-identity{display:flex;flex-direction:column;gap:3px;min-width:0}
	.dss-price-model-line{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}
	.dss-price-model-name{font-size:var(--dss-fs-md);font-weight:600;color:var(--dss-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1 1 auto}
	.dss-price-used-tag{font-size:var(--dss-fs-xs);font-weight:500;color:var(--dss-info);background:var(--dss-info-soft);border:1px solid var(--dss-info-line);padding:1px 5px;border-radius:4px;white-space:nowrap;flex-shrink:0}
	.dss-price-provisional{font-size:var(--dss-fs-xs);font-weight:500;color:var(--dss-warn);background:var(--dss-warn-soft);border:1px solid var(--dss-warn-line);padding:1px 5px;border-radius:4px;white-space:nowrap;flex-shrink:0}
	.dss-price-model-provider{font-size:var(--dss-fs-xs);color:var(--dss-text-3);overflow-wrap:anywhere}
	.dss-price-model-summary{display:flex;flex-direction:column;align-items:flex-end;gap:2px;min-width:0;text-align:right}
	.dss-price-model-price{font-size:var(--dss-fs-sm);color:var(--dss-text-2);font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
	.dss-price-model-meta{font-size:var(--dss-fs-xs);color:var(--dss-text-3);overflow-wrap:anywhere}
	.dss-price-pagination{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:12px;font-size:var(--dss-fs-sm);font-variant-numeric:tabular-nums;flex-wrap:wrap}
	.dss-price-empty-state{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:18px 0;font-size:var(--dss-fs-md);color:var(--dss-text-3)}
	.dss-price-empty-state p{margin:0}
	.dss-price-empty{text-align:center;padding:18px 0;font-size:var(--dss-fs-md);color:var(--dss-text-3)}
	.dss-price-notice{font-size:var(--dss-fs-sm);color:var(--dss-text-2);background:var(--dss-info-soft);border:1px solid var(--dss-info-line);border-radius:7px;padding:6px 9px;margin:0 0 8px;overflow-wrap:anywhere}
	.dss-price-state{padding:12px 0;font-size:var(--dss-fs-md);color:var(--dss-text-2)}
	.dss-price-state p{margin:0 0 8px}
	.dss-price-status-error{font-size:var(--dss-fs-sm);color:var(--dss-text-2);background:var(--dss-warn-soft);border:1px solid var(--dss-warn-line);border-radius:7px;padding:7px 9px;margin:0 0 10px;overflow-wrap:anywhere}
	.dss-price-status-error details{margin:4px 0 0}
	.dss-price-detail-head{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding-bottom:10px;border-bottom:1px solid var(--dss-line-soft);margin-bottom:10px;min-width:0}
	.dss-price-back{border:0;background:none;color:var(--dss-info);font-size:var(--dss-fs-sm);font-family:inherit;padding:0;cursor:pointer;white-space:nowrap}
	.dss-price-back:hover{text-decoration:underline}
	.dss-pricing .dss-price-detail-title{font-size:var(--dss-fs-lg);font-weight:650;color:var(--dss-text);margin:0;overflow-wrap:anywhere;min-width:0;outline:none}
	.dss-price-detail-head .dss-price-muted{margin:0}
	.dss-price-rule-detail{border-bottom:1px solid var(--dss-line-soft);padding:10px 0;display:flex;flex-direction:column;gap:7px;min-width:0}
	.dss-price-rule-detail:last-child{border-bottom:0}
	.dss-price-rule-detail-head{display:flex;align-items:flex-start;justify-content:space-between;gap:6px 10px;flex-wrap:wrap}
	.dss-price-rule-tags{display:flex;align-items:center;gap:5px;flex-wrap:wrap;min-width:0}
	.dss-price-phase,.dss-price-account,.dss-price-currency{font-size:var(--dss-fs-xs);color:var(--dss-text-2);background:var(--dss-chip-bg);border-radius:4px;padding:1px 5px;white-space:nowrap}
	.dss-price-phase{font-weight:600}
	.dss-price-rule-id{font-size:var(--dss-fs-xs);color:var(--dss-text-3);overflow-wrap:anywhere;word-break:break-word;user-select:text}
	.dss-price-tier-block{display:flex;flex-direction:column;gap:4px}
	.dss-price-tier-name{font-size:var(--dss-fs-xs);font-weight:600;color:var(--dss-text-2)}
	.dss-price-rate-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
	.dss-price-rate-cell{background:var(--dss-layer);border:1px solid var(--dss-line);border-radius:6px;padding:6px 8px;display:flex;flex-direction:column;gap:2px;min-width:0}
	.dss-price-rate-k{font-size:var(--dss-fs-xs);color:var(--dss-text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
	.dss-price-rate-v{font-size:var(--dss-fs-md);font-weight:650;color:var(--dss-text);font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
	.dss-price-note{margin:0;font-size:var(--dss-fs-xs);line-height:1.45;color:var(--dss-text-2);overflow-wrap:anywhere}
	.dss-price-rule-meta{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px;font-size:var(--dss-fs-xs);color:var(--dss-text-3);padding-top:5px;border-top:1px dashed var(--dss-meta-line)}
	.dss-price-source-link{color:var(--dss-info);text-decoration:none;font-size:var(--dss-fs-xs);white-space:nowrap}
	.dss-price-source-link:hover{text-decoration:underline}
	.dss-price-other-periods{margin-top:10px;border-top:1px solid var(--dss-line-soft);padding-top:8px}
	.dss-price-other-periods>summary{font-weight:600;color:var(--dss-text)}
	.dss-price-detail-actions{margin-top:12px}
	.dss-price-saved{margin-top:12px;padding-top:8px;border-top:1px solid var(--dss-line-soft)}
	.dss-price-saved-row{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;border:0;border-bottom:1px solid var(--dss-line-soft);background:none;color:var(--dss-info);font:inherit;font-size:var(--dss-fs-sm);text-align:left;padding:6px 0;cursor:pointer;min-width:0}
	.dss-price-saved-row:hover{text-decoration:underline}
	.dss-price-saved-row:disabled{opacity:.45;cursor:default;text-decoration:none}
	.dss-price-custom-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px}
	.dss-price-custom-head h4{margin:0}
	.dss-price-custom-list{display:flex;flex-direction:column;min-width:0}
	.dss-price-custom-row{display:flex;flex-direction:column;gap:4px;padding:8px 0;border-bottom:1px solid var(--dss-line-soft);min-width:0}
	.dss-price-custom-main{display:flex;align-items:flex-start;justify-content:space-between;gap:6px 10px;flex-wrap:wrap;min-width:0}
	.dss-price-custom-id{display:flex;flex-direction:column;gap:2px;flex:1 1 200px;min-width:0}
	.dss-price-custom-id strong{font-size:var(--dss-fs-md);font-weight:600;overflow-wrap:anywhere}
	.dss-price-custom-meta{display:flex;align-items:center;gap:5px;flex-wrap:wrap;font-size:var(--dss-fs-xs);color:var(--dss-text-3)}
	.dss-price-custom-actions{display:flex;gap:6px;flex-wrap:wrap}
	.dss-price-unsaved{font-size:var(--dss-fs-xs);font-weight:500;color:var(--dss-warn);background:var(--dss-warn-soft);border:1px solid var(--dss-warn-line);border-radius:4px;padding:1px 5px;white-space:nowrap}
	.dss-price-pending-remove{font-size:var(--dss-fs-xs);font-weight:500;color:var(--dss-danger);background:var(--dss-danger-soft);border:1px solid var(--dss-danger-line);border-radius:4px;padding:1px 5px;white-space:nowrap}
	.dss-price-condition-summary{margin:0;font-size:var(--dss-fs-sm);color:var(--dss-text-2);overflow-wrap:anywhere}
	.dss-price-custom-row details{margin:2px 0 0}
	.dss-price-editor-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}
	.dss-price-editor-head h4{margin:0}
	.dss-price-editor-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
	.dss-price-editor-notice{display:flex;align-items:center;gap:6px 10px;flex-wrap:wrap;font-size:var(--dss-fs-sm);color:var(--dss-text-2);background:var(--dss-warn-soft);border:1px solid var(--dss-warn-line);border-radius:7px;padding:6px 9px;margin:0 0 8px;overflow-wrap:anywhere}
	.dss-price-editor-notice .dss-link-btn{flex:none}
	.dss-price-conditions-set{font-size:var(--dss-fs-xs);font-weight:500;color:var(--dss-info);background:var(--dss-info-soft);border:1px solid var(--dss-info-line);border-radius:4px;padding:1px 5px;margin-left:6px;white-space:nowrap}
	.dss-price-commit-note{margin:0;font-size:var(--dss-fs-xs);color:var(--dss-text-3);overflow-wrap:anywhere}
	.dss-price-editor-block{display:flex;align-items:center;gap:6px 10px;flex-wrap:wrap;font-size:var(--dss-fs-sm);color:var(--dss-text-2);overflow-wrap:anywhere}
	.dss-price-editor-block .dss-link-btn{flex:none}
	.dss-pricing .dss-link-btn:disabled{opacity:.45;cursor:default;text-decoration:none}
	.dss-price-form{border-top:1px solid var(--dss-line);padding-top:10px;margin-top:10px;min-width:0}
	.dss-price-form>.dss-export{margin-top:2px}
	.dss-price-auto{display:flex;align-items:center;gap:6px;font-size:var(--dss-fs-sm);color:var(--dss-text);margin:8px 0}
	.dss-price-updates-current{display:flex;flex-direction:column;gap:2px;padding-bottom:8px;margin-bottom:6px;border-bottom:1px solid var(--dss-line-soft)}
	.dss-price-updates-current strong{font-size:var(--dss-fs-md);font-weight:650;overflow-wrap:anywhere}
	.dss-price-updates-current span{font-size:var(--dss-fs-xs);color:var(--dss-text-3)}
	.dss-price-history-section{margin-top:10px}
	.dss-price-snapshot-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--dss-line-soft);font-size:var(--dss-fs-sm);font-variant-numeric:tabular-nums;min-width:0}
	.dss-price-commit{flex:none;border-top:1px solid var(--dss-line);background:var(--dss-panel);padding:8px 16px 12px;display:flex;flex-direction:column;gap:4px;min-width:0}
	.dss-price-commit .dss-price-actions{margin:0}
	.dss-price-commit .dss-price-preview{margin:0}
	.dss-price-commit .dss-export{min-height:28px}
	@container dss-drawer (max-width:420px){
	  .dss-price-model-row{grid-template-columns:minmax(0,1fr)}
	  .dss-price-model-summary{align-items:flex-start;text-align:left}
	  .dss-price-rate-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
	  .dss-price-grid{grid-template-columns:minmax(0,1fr)}
	}


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
.dss-data-status.error .dss-status-dot{background:var(--dss-danger)}
.dss-data-status.unavailable .dss-status-dot{background:var(--dss-text-3)}
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
.dss-drawer{position:absolute;top:0;right:0;bottom:0;z-index:31;width:min(560px,100%);box-sizing:border-box;display:flex;flex-direction:column;background:var(--dss-panel);border-left:1px solid var(--dss-line);box-shadow:var(--dss-shadow);container:dss-drawer / inline-size}
.dss-drawer-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px 12px 16px;border-bottom:1px solid var(--dss-line);flex:none}
.dss-drawer-head h3{margin:0;font-size:var(--dss-fs-lg);font-weight:650;color:var(--dss-text);white-space:nowrap}
.dss-drawer-body{flex:1;min-height:0;overflow-y:auto;padding:14px 16px 18px;overscroll-behavior:contain;scrollbar-gutter:stable}
.dss-drawer .dss-pricing{border:0;border-radius:0;margin:0;padding:0;background:transparent;flex:1;min-height:0;display:flex;flex-direction:column;min-width:0}
.dss-drawer .dss-pricing:not(.dss-pricing-error) > h3{display:none}
.dss-drawer > .dss-pricing-error{flex:1;min-height:0;overflow-y:auto;padding:16px}
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
.dss-body{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:0 20px 20px;scrollbar-gutter:stable;scrollbar-color:var(--dss-scroll) transparent;overscroll-behavior:contain;--dss-body-pad-top:16px}
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
.dss-kpis,.dss-tr-kpis{display:grid;grid-template-columns:1.45fr repeat(3,minmax(0,1fr));border:1px solid var(--dss-line);border-radius:14px;margin-bottom:10px;font-variant-numeric:tabular-nums}
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
.dss-tokbar .cache,.dss-tok-legend .dot.cache{background:var(--dss-chart-cache)}
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
.dss-ptable,.dss-tr-mtable{width:100%;border-collapse:separate;border-spacing:0;font-size:var(--dss-fs-md);font-variant-numeric:tabular-nums}
.dss-ptable th,.dss-tr-mtable th{position:sticky;top:0;z-index:3;background:var(--dss-panel);font-size:var(--dss-fs-xs);color:var(--dss-text-3);font-weight:500;text-align:right;padding:7px 10px;border-bottom:1px solid var(--dss-line);white-space:nowrap}
.dss-ptable th.c-proj,.dss-tr-mtable th.c-model{text-align:left;padding-left:4px}
.dss-ptable th.c-meta{display:none}
.dss-sort-btn{border:0;background:none;padding:2px 0;color:inherit;font-size:inherit;display:inline-flex;align-items:center;gap:3px;border-radius:4px;cursor:pointer}
.dss-sort-btn:hover,.dss-sort-btn.on{color:var(--dss-text)}
.dss-sort-arr{width:8px;text-align:left}
.dss-prow{cursor:pointer}
.dss-prow:hover,.dss-tr-mrow:hover{background:var(--dss-hover-row)}
.dss-prow.open,.dss-pdetail{background:var(--dss-layer)}
.dss-prow.open td{border-bottom-color:transparent}
.dss-prow td,.dss-tr-mrow td{padding:10px;border-bottom:1px solid var(--dss-line-soft);text-align:right;vertical-align:middle;white-space:nowrap}
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
  .dss-kpis,.dss-tr-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
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
.dss-tl-bar:hover,.dss-tl-bar:focus-visible,.dss-tr-cell:hover,.dss-tr-cell:focus-visible{filter:brightness(1.12);outline:2px solid var(--dss-text);outline-offset:1px;z-index:2}
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
.dss-tl-sess-link .dss-tag,.dss-tl-pop-s .dss-tag{flex:none;margin-left:0}
.dss-tl-sess .dss-tl-tot{font-size:var(--dss-fs-xs);color:var(--dss-text-3)}
.dss-tl-legend{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;font-size:var(--dss-fs-xs);color:var(--dss-text-3);padding-top:12px;position:relative}
.dss-tl-scale{display:inline-flex;align-items:center;gap:3px}
.dss-tl-scale .dss-tl-sw{width:16px;height:10px;border-radius:2px;background:var(--dss-text-2);opacity:var(--o)}
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

.dss-tl-sum-cost{color:var(--dss-cost)}
.dss-tl-check{display:inline-flex;align-items:center;gap:6px;font-size:var(--dss-fs-sm);color:var(--dss-text-2);cursor:pointer;white-space:nowrap}
.dss-tl-check input{accent-color:var(--dss-accent);margin:0;width:14px;height:14px}
.dss-tl-check:hover{color:var(--dss-text)}
.dss-tl-pager{margin-left:auto;display:inline-flex;align-items:center;gap:6px;font-size:var(--dss-fs-sm);color:var(--dss-text-3);font-variant-numeric:tabular-nums}
.dss-mx{--dw:78px;--rw:176px;display:flex;flex-direction:column;position:relative}
.dss-mx-row{display:grid;grid-template-columns:var(--dw) minmax(0,1fr) var(--rw);column-gap:12px;align-items:center;min-height:18px}
.dss-mx-k{font-size:var(--dss-fs-xs);color:var(--dss-text-3);align-self:end;padding-bottom:3px;position:relative;white-space:nowrap}
.dss-mx-side{font-size:var(--dss-fs-xs);color:var(--dss-text-3);align-self:end;padding-bottom:3px;position:relative;white-space:nowrap;font-variant-numeric:tabular-nums}
.dss-mx-prof{height:48px;position:relative}
.dss-mx-prof i{position:absolute;bottom:0;background:var(--dss-accent);opacity:.5;border-radius:2px 2px 0 0;min-height:1px}
.dss-mx-prof .dss-mx-prof-bar.is-peak{opacity:.95}
.dss-mx-axis{position:relative;height:18px;border-top:1px solid var(--dss-line-soft);margin-top:2px}
.dss-mx-axis .dss-tl-tick{top:2px}
.dss-mx-row.is-day{min-height:14px;height:14px}
.dss-mx-row.is-week{margin-top:8px}
.dss-mx-cells{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:2px;height:12px}
.dss-mx-cells i,.dss-tr-cell{position:relative;border-radius:2px;background:var(--dss-tl-cell)}
.dss-mx-cells i::after,.dss-tr-cell::after{content:"";position:absolute;inset:0;border-radius:inherit;background:var(--c,var(--dss-accent));opacity:0}
.dss-mx-cells i[data-level="1"]::after,.dss-tr-cell[data-level="1"]::after{opacity:.26}
.dss-mx-cells i[data-level="2"]::after,.dss-tr-cell[data-level="2"]::after{opacity:.48}
.dss-mx-cells i[data-level="3"]::after,.dss-tr-cell[data-level="3"]::after{opacity:.72}
.dss-mx-cells i[data-level="4"]::after,.dss-tr-cell[data-level="4"]::after{opacity:1}
.dss-mx-cells .dss-mx-cell.is-now::before,.dss-tr-cell.is-today::before{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1.5px var(--dss-text);z-index:1}
.dss-mx-date{border:0;background:none;padding:0 4px;margin-left:-4px;border-radius:4px;font-size:var(--dss-fs-xs);color:var(--dss-text-2);text-align:left;white-space:nowrap;font-variant-numeric:tabular-nums;line-height:14px;position:relative;justify-self:start;cursor:pointer}
.dss-mx-date:hover:not(:disabled){background:var(--dss-hover);color:var(--dss-text)}
.dss-mx-date.is-weekend{color:var(--dss-text-3)}
.dss-mx-date.is-today{color:var(--dss-accent);font-weight:600}
.dss-mx-date:disabled{cursor:default;color:var(--dss-text-3);opacity:.6}
.dss-mx-tot{display:flex;align-items:center;gap:8px;min-width:0}
.dss-mx-bar{flex:1;min-width:0;height:8px}
.dss-mx-bar>span{display:flex;height:100%;gap:1px;border-radius:2px;overflow:hidden}
.dss-mx-bar i{background:var(--c);min-width:2px}
.dss-mx-dur{width:52px;flex:none;text-align:right;font-size:var(--dss-fs-xs);color:var(--dss-text-2);font-variant-numeric:tabular-nums}
.dss-mx-row.is-idle .dss-mx-dur{color:var(--dss-text-3)}
.dss-mx-lg{width:10px;height:10px;border-radius:2px;display:inline-block;position:relative;background:var(--dss-tl-cell)}
.dss-mx-lg::after{content:"";position:absolute;inset:0;border-radius:inherit;background:var(--dss-accent);opacity:0}
.dss-mx-lg[data-level="1"]::after{opacity:.26}
.dss-mx-lg[data-level="2"]::after{opacity:.48}
.dss-mx-lg[data-level="3"]::after{opacity:.72}
.dss-mx-lg[data-level="4"]::after{opacity:1}
.dss-mx-proj{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
@container dss-panel (max-width:860px){
  .dss-mx{--rw:120px}
}
@container dss-panel (max-width:640px){
  .dss-mx{--dw:40px;--rw:44px}
  .dss-mx-row{column-gap:8px}
  .dss-mx-date .dss-mx-wd{display:none}
  .dss-mx-bar{display:none}
  .dss-mx-dur{width:auto}
  .dss-tl-pager{margin-left:0}
}

/* 0.5.0 slice 5b: account balance */
.dss-bal{--dss-bal-mk:8em;display:flex;flex-direction:column;gap:14px}
.dss-bal-loading{padding:42px 0;text-align:center;color:var(--dss-text-2);margin:0}
.dss-bal-failed{padding:32px 0;display:flex;flex-direction:column;align-items:flex-start;gap:10px;color:var(--dss-text-2)}
.dss-bal-failed p{margin:0}
.dss-bal-failed[role=status]{align-items:center;text-align:center}
.dss-bal-retry{height:28px;padding:0 11px;border:1px solid var(--dss-line);border-radius:7px;background:var(--dss-panel);color:var(--dss-text);font-size:var(--dss-fs-sm);cursor:pointer}
.dss-bal-retry:hover{border-color:var(--dss-text-3)}
.dss-bal-note{margin:0;color:var(--dss-text-2);font-size:var(--dss-fs-sm)}
.dss-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.dss-bal-kpis{display:grid;grid-template-columns:1.45fr repeat(2,minmax(0,1fr));border:1px solid var(--dss-line);border-radius:14px;font-variant-numeric:tabular-nums}
.dss-bal-kpis.is-two{grid-template-columns:1.45fr minmax(0,1fr)}
.dss-bal-kpi{padding:10px 16px 11px;display:flex;flex-direction:column;gap:4px;min-width:0}
.dss-bal-kpi+.dss-bal-kpi{border-left:1px solid var(--dss-line-soft)}
.dss-bal-kpi.is-lead{background:var(--dss-layer);border-radius:13px 0 0 13px}
.dss-bal-kpi-k{font-size:var(--dss-fs-sm);color:var(--dss-text-2);white-space:nowrap}
.dss-bal-kpi-v{font-size:var(--dss-fs-xl);font-weight:650;line-height:1.2;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dss-bal-kpi.is-lead .dss-bal-kpi-v{font-size:var(--dss-fs-2xl)}
.dss-bal-kpi-v.is-warn{color:var(--dss-warn)}
.dss-bal-kpi-v.is-danger{color:var(--dss-danger)}
.dss-bal-kpi-s{font-size:var(--dss-fs-xs);color:var(--dss-text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dss-bal-kpi-s.dss-bal-kpi-names{white-space:normal;overflow:visible}
.dss-bal-nw{white-space:nowrap}
.dss-bal-list{display:flex;flex-direction:column}
.dss-bal-cols,.dss-bal-row{display:grid;grid-template-columns:minmax(170px,1.15fr) minmax(0,3.4fr) 92px;grid-template-areas:"id main act";column-gap:20px}
.dss-bal-cols{font-size:var(--dss-fs-xs);color:var(--dss-text-3);padding:0 4px 6px;border-bottom:1px solid var(--dss-line)}
.dss-bal-rows{list-style:none;margin:0;padding:0}
.dss-bal-row{padding:12px 4px;border-bottom:1px solid var(--dss-line-soft);align-items:start}
.dss-bal-row:hover{background:var(--dss-hover-row)}
.dss-bal-id{grid-area:id;display:flex;gap:9px;min-width:0}
.dss-bal-dot{width:8px;height:8px;border-radius:50%;margin-top:6px;flex:none;background:var(--dss-ok)}
.dss-bal-dot.is-warn{background:var(--dss-warn-fill)}
.dss-bal-dot.is-danger{background:var(--dss-danger)}
.dss-bal-nm{display:flex;flex-direction:column;gap:2px;min-width:0}
.dss-bal-name{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dss-bal-meta{font-size:var(--dss-fs-xs);color:var(--dss-text-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dss-bal-chip{align-self:flex-start;margin-top:3px;font-size:var(--dss-fs-xs);font-weight:600;padding:0 6px;border-radius:5px;line-height:18px;border:1px solid transparent;white-space:nowrap}
.dss-bal-chip.is-warn{color:var(--dss-warn);background:var(--dss-warn-soft);border-color:var(--dss-warn-line)}
.dss-bal-chip.is-danger{color:var(--dss-danger);background:var(--dss-danger-soft);border-color:var(--dss-danger-line)}
.dss-bal-main{grid-area:main;min-width:0;display:flex;flex-direction:column;gap:5px}
.dss-bal-amt-line{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 14px;min-width:0}
.dss-bal-amt{font-size:var(--dss-fs-xl);font-weight:650;line-height:1.2;letter-spacing:-.01em;font-variant-numeric:tabular-nums;white-space:nowrap}
.dss-bal-amt.is-stale{color:var(--dss-text-2)}
.dss-bal-amt.is-zero{color:var(--dss-danger)}
.dss-bal-amt.is-none{color:var(--dss-text-3);font-weight:500}
.dss-bal-amt.is-unlimited{color:var(--dss-text-2);font-weight:500}
.dss-bal-amt-sub{font-size:var(--dss-fs-sm);color:var(--dss-text-3);font-variant-numeric:tabular-nums}
.dss-bal-alert-line.is-warn{color:var(--dss-warn)}
.dss-bal-meter{display:grid;grid-template-columns:var(--dss-bal-mk) minmax(80px,300px) 4.2em minmax(9.5em,auto);align-items:center;column-gap:10px;font-size:var(--dss-fs-sm);font-variant-numeric:tabular-nums}
.dss-bal-meter-k{color:var(--dss-text-2);white-space:nowrap}
.dss-bal-bar{display:block;height:6px;border-radius:3px;background:var(--dss-track);overflow:hidden}
.dss-bal-bar>i{display:block;height:100%;border-radius:3px;background:var(--dss-accent)}
.dss-bal-bar.is-warn>i{background:var(--dss-warn-fill)}
.dss-bal-bar.is-danger>i{background:var(--dss-danger)}
.dss-bal-bar.is-empty{background:var(--dss-danger-soft);box-shadow:inset 0 0 0 1px var(--dss-danger-line)}
.dss-bal-meter-v{font-weight:600;text-align:right;white-space:nowrap}
.dss-bal-meter-v.is-warn{color:var(--dss-warn)}
.dss-bal-meter-v.is-danger{color:var(--dss-danger)}
.dss-bal-reset{color:var(--dss-text-3);white-space:nowrap;border-radius:4px}
.dss-bal-reset[tabindex]{cursor:help}
.dss-bal-reason{font-size:var(--dss-fs-sm);color:var(--dss-text-2);line-height:1.45}
.dss-bal-reason code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:var(--dss-fs-xs);background:var(--dss-hover);padding:0 4px;border-radius:4px;color:var(--dss-text)}
.dss-bal-act{grid-area:act;display:grid;grid-template-columns:26px 52px;justify-content:end;align-items:start;column-gap:4px}
.dss-bal-act > .dss-bal-link{grid-column:2;justify-self:end}
.dss-bal-link{display:inline-flex;align-items:center;gap:3px;color:var(--dss-accent);font-size:var(--dss-fs-sm);text-decoration:none;white-space:nowrap;padding:1px 2px;border-radius:5px}
.dss-bal-link:hover{text-decoration:underline}
.dss-bal-idle{border:1px solid var(--dss-line-soft);border-radius:10px}
.dss-bal-idle-sum{list-style:none;cursor:pointer;padding:9px 12px;font-size:var(--dss-fs-sm);color:var(--dss-text-2);border-radius:10px}
.dss-bal-idle-sum::-webkit-details-marker{display:none}
.dss-bal-idle-sum:hover{background:var(--dss-hover)}
.dss-bal-idle-row{display:flex;align-items:baseline;gap:10px;padding:7px 12px 7px 34px;border-top:1px solid var(--dss-line-soft);font-size:var(--dss-fs-sm)}
.dss-bal-idle-row b{font-weight:600;white-space:nowrap}
.dss-bal-idle-row .dss-bal-reason{flex:1;min-width:0;color:var(--dss-text-3)}
.dss-bal-foot{font-size:var(--dss-fs-xs);color:var(--dss-text-3);padding:0 4px;margin:0}
@container dss-panel (max-width:860px){
  .dss-bal-cols,.dss-bal-row{grid-template-columns:minmax(140px,1fr) minmax(0,3.2fr) 84px}
  .dss-bal-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
  .dss-bal-kpi.is-lead{grid-column:1 / -1;border-radius:13px 13px 0 0;border-bottom:1px solid var(--dss-line-soft)}
  .dss-bal-kpi+.dss-bal-kpi{border-left:0}
  .dss-bal-kpi:nth-child(3){border-left:1px solid var(--dss-line-soft)}
  .dss-bal-kpis.is-two .dss-bal-kpi:nth-child(2){grid-column:1 / -1}
  .dss-bal-kpi-s{white-space:normal}
  .dss-bal-meta{white-space:normal;overflow-wrap:anywhere}
  .dss-bal-meter{grid-template-columns:var(--dss-bal-mk) minmax(0,1fr) 4.2em}
  .dss-bal-meter .dss-bal-reset{grid-column:2 / -1;font-size:var(--dss-fs-xs)}
}
@container dss-panel (max-width:640px){
  .dss-bal-cols{display:none}
  .dss-bal-row{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"id act" "main main";row-gap:10px;padding:12px 2px}
  .dss-bal-kpi{padding:10px 12px}
  .dss-bal-kpi.is-lead .dss-bal-kpi-v{font-size:var(--dss-fs-xl)}
  .dss-bal-idle-row{flex-direction:column;gap:2px;padding-left:30px}
}

.dss-bal-bell{width:26px;height:26px;border:0;border-radius:7px;background:none;color:var(--dss-text-3);display:inline-grid;place-items:center;position:relative;margin-top:-3px;cursor:pointer;flex:none}
.dss-bal-bell:hover{background:var(--dss-hover);color:var(--dss-text)}
.dss-bal-bell.is-on{color:var(--dss-accent)}
.dss-bal-bell.is-on svg path:first-child{fill:currentColor;fill-opacity:.18}
.dss-popover.is-up{top:auto;bottom:calc(100% + 6px)}
.dss-popover.dss-bal-alert{width:270px;padding:12px;display:flex;flex-direction:column;gap:9px;font-size:var(--dss-fs-sm)}
.dss-bal-alert-form{display:flex;flex-direction:column;gap:9px;margin:0}
.dss-bal-alert-title{margin:0;font-size:var(--dss-fs-md);font-weight:600;color:var(--dss-text)}
.dss-bal-alert-field{display:flex;align-items:center;gap:6px;height:32px;padding:0 10px;border:1px solid var(--dss-line);border-radius:8px;background:var(--dss-layer)}
.dss-bal-alert-field:focus-within{border-color:var(--dss-accent)}
.dss-bal-alert-prefix,.dss-bal-alert-symbol{color:var(--dss-text-3);font-variant-numeric:tabular-nums;white-space:nowrap}
.dss-bal-alert-field input{flex:1;min-width:0;border:0;background:none;outline:none;color:var(--dss-text);font-size:var(--dss-fs-md);font-variant-numeric:tabular-nums;font-family:inherit}
.dss-bal-alert-hint{margin:0;color:var(--dss-text-3);font-size:var(--dss-fs-xs);line-height:1.5}
.dss-bal-alert-error{color:var(--dss-danger);font-size:var(--dss-fs-xs)}
.dss-bal-alert-btns{display:flex;justify-content:flex-end;gap:6px}
.dss-bal-alert-btn{height:28px;padding:0 11px;border:1px solid var(--dss-line);border-radius:7px;background:var(--dss-panel);color:var(--dss-text);font-size:var(--dss-fs-sm);white-space:nowrap;cursor:pointer;font-family:inherit}
.dss-bal-alert-btn:hover{border-color:var(--dss-text-3)}
.dss-bal-alert-primary{background:var(--dss-accent);border-color:var(--dss-accent);color:var(--dss-on-accent);font-weight:600}
.dss-bal-alert-primary:hover{background:var(--dss-accent-strong);border-color:var(--dss-accent-strong)}
.dss-bal-alert-clear{margin-right:auto;border-color:transparent;background:none;color:var(--dss-text-2);padding:0 4px}
.dss-bal-alert-clear:hover{color:var(--dss-danger);border-color:transparent}

.dss-bal-row.is-skeleton{pointer-events:none}
.dss-bal-row.is-skeleton:hover{background:none}
.dss-bal-dot.is-idle{background:var(--dss-line)}
.dss-bal-sk{display:inline-block;height:10px;border-radius:4px;background:var(--dss-skel);animation:dss-pulse 1.4s ease-in-out infinite;vertical-align:middle}
.dss-bal-sk.is-lg{height:20px}
.dss-bal-sk.is-xl{height:26px}
@media (prefers-reduced-motion: reduce){
  .dss-bal-sk{animation:none}
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

/* 0.5.0 slice 5g: trends toolbar, summary strip and daily chart (U2, U4, U5) */
.dss-tr{display:flex;flex-direction:column;gap:14px;min-width:0}
.dss-tr-tools{margin-bottom:0}
.dss-tr-group{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap}
.dss-tr-ctl-k{font-size:var(--dss-fs-sm);color:var(--dss-text-3);white-space:nowrap}
.dss-tr-range{font-variant-numeric:tabular-nums;white-space:nowrap}
.dss-tr-kpis{margin-bottom:0}
.dss-kpi-v.is-model{font-size:var(--dss-fs-lg);font-weight:650;line-height:24px;letter-spacing:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dss-kpi-s .dss-tr-ell{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.dss-tr-sec{border-top:1px solid var(--dss-line-soft);padding-top:14px;margin-top:8px;min-width:0}
.dss-tr-sec-head{display:flex;align-items:baseline;gap:4px 10px;flex-wrap:wrap;margin-bottom:12px}
.dss-tr-sec-head h3{margin:0;font-size:var(--dss-fs-lg);font-weight:650}
.dss-tr-sec-note{font-size:var(--dss-fs-sm);color:var(--dss-text-3);font-variant-numeric:tabular-nums}
.dss-tr-chart{display:grid;grid-template-columns:44px minmax(0,1fr);grid-template-rows:168px 18px;column-gap:8px}
.dss-tr-y{grid-column:1;grid-row:1;position:relative;font-size:var(--dss-fs-xs);color:var(--dss-text-3);font-variant-numeric:tabular-nums}
.dss-tr-y .dss-tr-ytick{position:absolute;right:0;transform:translateY(50%);line-height:1;white-space:nowrap}
.dss-tr-y .dss-tr-ytick.is-top{transform:translateY(40%)}
.dss-tr-y .dss-tr-ytick.is-zero{transform:none;bottom:0}
.dss-tr-plot{grid-column:2;grid-row:1;position:relative;min-width:0}
.dss-tr-grid{position:absolute;inset:0;pointer-events:none}
.dss-tr-gline{position:absolute;left:0;right:0;height:0;border-top:1px dashed var(--dss-line);display:block}
.dss-tr-gline.is-base{border-top-style:solid}
.dss-tr-avg{position:absolute;left:0;right:0;height:0;border-top:1px dashed var(--dss-text-3);pointer-events:none;z-index:2}
.dss-tr-bars{position:absolute;inset:0;display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));column-gap:2px}
.dss-tr-bars.is-dense,.dss-tr-x.is-dense{column-gap:1px}
.dss-tr-col{display:flex;align-items:flex-end;justify-content:center;min-width:0}
.dss-tr-bar{width:100%;max-width:40px;min-height:2px;border:0;padding:0;border-radius:2px 2px 0 0;background:var(--dss-tl-bar-cost);display:flex;flex-direction:column-reverse;overflow:hidden;position:relative;z-index:1;cursor:pointer}
.dss-tr-bar.is-partial{background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.35) 0 3px,transparent 3px 6px)}
.dss-tr-bar.is-token{background:none}
.dss-tr-bar.is-token i{display:block;flex-basis:0;min-height:0}
.dss-tr-bar.is-token i.cache{background:var(--dss-chart-cache)}
.dss-tr-bar.is-token i.unc{background:var(--dss-chart-input)}
.dss-tr-bar.is-token i.out{background:var(--dss-chart-output)}
.dss-tr-bar:hover,.dss-tr-bar:focus-visible{filter:brightness(1.12);outline:2px solid var(--dss-text);outline-offset:1px;z-index:3}
.dss-tr-bar[aria-disabled="true"]{cursor:default}
.dss-tr-x{grid-column:2;grid-row:2;display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));column-gap:2px;font-size:var(--dss-fs-xs);color:var(--dss-text-3);align-items:end;font-variant-numeric:tabular-nums;min-width:0}
.dss-tr-x .dss-tr-xlabel{grid-row:1;justify-self:center;white-space:nowrap;line-height:1}
.dss-tr-x .dss-tr-xlabel.is-start{justify-self:start}
.dss-tr-x .dss-tr-xlabel.is-today{justify-self:end;color:var(--dss-text);font-weight:600}
.dss-tr-legend{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;font-size:var(--dss-fs-xs);color:var(--dss-text-3);margin-top:10px}
.dss-tr-legend-grp{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.dss-tr-legend-grp.is-hint{margin-left:auto}
.dss-tr-sw{width:10px;height:10px;border-radius:2px;display:inline-block;flex:none}
.dss-tr-sw.is-dash{width:16px;height:0;border-top:1.5px dashed var(--dss-text-3);border-radius:0}
.dss-tr-sw.is-cache{background:var(--dss-chart-cache)}
.dss-tr-sw.is-unc{background:var(--dss-chart-input)}
.dss-tr-sw.is-out{background:var(--dss-chart-output)}
.dss-tr-sw.is-part{background:var(--dss-tl-bar-cost);background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.4) 0 2px,transparent 2px 4px)}
.dss-tr-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:28px 0;color:var(--dss-text-3);font-size:var(--dss-fs-md)}
.dss-tr-empty p{margin:0}
/* 0.5.0 slice 5h: 26-week heatmap (U7, U8) */
.dss-tr-heat-body{display:grid;grid-template-columns:minmax(0,640px) minmax(180px,1fr);column-gap:28px;row-gap:14px;align-items:start}
.dss-tr-heat-map{display:grid;grid-template-columns:2.4em repeat(26,minmax(0,1fr));grid-template-rows:16px auto;column-gap:3px;row-gap:3px;min-width:0;max-width:640px}
.dss-tr-heat-months{grid-column:2/-1;grid-row:1;display:grid;grid-template-columns:repeat(26,minmax(0,1fr));column-gap:3px;font-size:var(--dss-fs-xs);color:var(--dss-text-3);line-height:16px;min-width:0}
.dss-tr-month{justify-self:start;white-space:nowrap;overflow:visible}
.dss-tr-month.is-end{justify-self:end}
.dss-tr-heat-dow{grid-column:1;grid-row:2;display:grid;grid-template-rows:repeat(7,1fr);row-gap:3px;font-size:var(--dss-fs-xs);color:var(--dss-text-3);line-height:1}
.dss-tr-heat-dow span{align-self:center;white-space:nowrap}
.dss-tr-heat-grid{grid-column:2/-1;grid-row:2;display:grid;grid-template-columns:repeat(26,minmax(0,1fr));grid-template-rows:repeat(7,auto);gap:3px;min-width:0}
.dss-tr-cell{aspect-ratio:1;width:100%;min-width:0;border:0;padding:0;border-radius:3px;display:block;cursor:default}
button.dss-tr-cell{cursor:pointer}
.dss-tr-heat-stats{margin:0;display:flex;flex-direction:column;gap:14px;font-variant-numeric:tabular-nums;min-width:0}
.dss-tr-stat{min-width:0}
.dss-tr-stat dt{font-size:var(--dss-fs-sm);color:var(--dss-text-2)}
.dss-tr-stat dd{margin:0;font-size:var(--dss-fs-xl);font-weight:650;line-height:1.25;font-variant-numeric:tabular-nums}
.dss-tr-stat-sub{display:block;font-size:var(--dss-fs-xs);color:var(--dss-text-3);font-weight:400;line-height:1.5}
@container dss-panel (max-width:860px){
  .dss-tr-heat-body{grid-template-columns:minmax(0,1fr)}
  .dss-tr-heat-stats{flex-direction:row}
  .dss-tr-stat{flex:1;border-left:1px solid var(--dss-line-soft);padding-left:14px}
  .dss-tr-stat:first-child{border-left:0;padding-left:0}
}
@container dss-panel (max-width:640px){
  .dss-tr-chart{grid-template-columns:38px minmax(0,1fr);grid-template-rows:132px 18px}
  .dss-tr-sec{margin-top:4px}
  .dss-tr-heat-map{column-gap:2px;row-gap:2px}
  .dss-tr-heat-months{column-gap:2px}
  .dss-tr-heat-dow{row-gap:2px}
  .dss-tr-heat-grid{gap:2px}
  .dss-tr-cell{border-radius:2px}
  .dss-tr-stat dd{font-size:var(--dss-fs-lg)}
}
/* 0.5.0 slice 5i: model ring and sortable table (U9–U11) */
.dss-tr-models-body{display:grid;grid-template-columns:160px minmax(0,1fr);column-gap:24px;align-items:start}
.dss-tr-ring-wrap{display:flex;flex-direction:column;align-items:center;gap:8px;padding-top:4px;min-width:0}
.dss-tr-ring{width:132px;height:132px;border-radius:50%;position:relative;flex:none}
.dss-tr-ring-hole{position:absolute;inset:18px;border-radius:50%;background:var(--dss-panel);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;line-height:1.25}
.dss-tr-ring-hole b{font-size:var(--dss-fs-lg);font-weight:650;font-variant-numeric:tabular-nums}
.dss-tr-ring-hole span{font-size:var(--dss-fs-xs);color:var(--dss-text-3)}
.dss-tr-ring-note{margin:0;font-size:var(--dss-fs-xs);color:var(--dss-text-3);display:inline-flex;align-items:center;gap:5px;text-align:center}
.dss-tr-mtable-wrap{min-width:0}
.dss-tr-mtable th{position:static;top:auto}
.dss-tr-mtable td.c-model{text-align:left;white-space:normal;width:100%;max-width:0;padding-left:4px}
.dss-tr-mtable .c-sessions{width:64px}
.dss-tr-mtable .c-tokens{width:128px}
.dss-tr-mtable .c-hit{width:72px}
.dss-tr-mtable .c-llm{width:76px}
.dss-tr-mtable .c-cost{width:116px}
.dss-tr-mtable .c-share{width:120px}
.dss-tr-mtable td.c-meta{display:none}
.dss-tr-mrow{cursor:default}
.dss-tr-mname{display:flex;align-items:center;gap:6px;min-width:0}
.dss-tr-mname span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dss-share-bar.dss-tr-share i{background:var(--c);opacity:1}
.dss-share-bar.dss-tr-share.is-other i{background:var(--dss-text-3)}
.dss-pdot.is-other{--c:var(--dss-text-3)}
.dss-tr-foot{margin:8px 0 0;font-size:var(--dss-fs-xs);color:var(--dss-text-3)}
.dss-tr-mtable-wrap select.dss-sort-narrow{display:none;width:100%;margin-bottom:6px;height:28px;border:1px solid var(--dss-line);border-radius:7px;background:var(--dss-panel);color:var(--dss-text);font-size:var(--dss-fs-sm);padding:0 6px}
@container dss-panel (max-width:860px){
  .dss-tr-mtable .c-llm{display:none}
}
@container dss-panel (max-width:640px){
  .dss-tr-models-body{grid-template-columns:minmax(0,1fr)}
  .dss-tr-ring-wrap{padding-top:0}
  .dss-tr-ring{width:112px;height:112px}
  .dss-tr-ring-hole{inset:16px}
  .dss-tr-mtable-wrap select.dss-sort-narrow{display:block}
  .dss-tr-mtable thead{display:none}
  .dss-tr-mtable,.dss-tr-mtable tbody{display:block}
  .dss-tr-mtable tr.dss-tr-mrow{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:12px;row-gap:4px;padding:9px 2px;border-bottom:1px solid var(--dss-line-soft)}
  .dss-tr-mtable tr.dss-tr-mrow:hover{background:none}
  .dss-tr-mtable tr.dss-tr-mrow td{display:none;padding:0;border:0;width:auto;text-align:left}
  .dss-tr-mtable tr.dss-tr-mrow td.c-model{display:block;grid-column:1;grid-row:1;max-width:none}
  .dss-tr-mtable tr.dss-tr-mrow td.c-model .dss-cell-sub{display:none}
  .dss-tr-mtable tr.dss-tr-mrow td.c-cost{display:block;grid-column:2;grid-row:1;text-align:right}
  .dss-tr-mtable tr.dss-tr-mrow td.c-meta{display:block;grid-column:1;grid-row:2;text-align:left;font-size:var(--dss-fs-xs);color:var(--dss-text-3);white-space:normal;padding-left:16px}
  .dss-tr-mtable tr.dss-tr-mrow td.c-share{display:block;grid-column:2;grid-row:2;align-self:center}
  .dss-tr-mtable .dss-share{justify-content:flex-end}
}
`;

module.exports = { css };
