// Panel styles injected once by apply().
const css = ".dss-overlay{position:fixed;inset:0;z-index:1000;background:rgba(10,12,16,.55);display:flex;align-items:flex-start;justify-content:center;padding:4vh 3vw;overflow:auto}" +
	".dss-panel button,.dss-trigger{-webkit-user-select:none;-moz-user-select:none;user-select:none;-webkit-touch-callout:none}" +
	".dss-trigger{box-sizing:border-box;cursor:pointer;color:var(--dsw-alias-label-primary,#f9fafb);background:transparent;border:0;display:flex;align-items:center;flex:0 0 auto;font-family:inherit;overflow:hidden;transition:background-color 140ms ease,color 140ms ease}" +
	".dss-trigger.wide{width:calc(100% + 8px);height:34px;margin:4px -4px;padding:6px 2px 6px 10px;gap:8px;border-radius:12px;justify-content:flex-start;font-size:14px;line-height:22px}" +
	".dss-trigger.rail{width:36px;height:36px;margin:0;padding:0;gap:0;border-radius:50%;justify-content:center}" +
	".dss-trigger:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))}" +
	".dss-trigger:active{background:var(--dsw-alias-interactive-bg-active,rgba(255,255,255,.12))}" +
	".dss-trigger:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#60a5fa);outline-offset:2px}" +
	".dss-trigger-label{white-space:nowrap;overflow:hidden}" +
	".dss-panel{width:min(1180px,100%);background:var(--dsw-specific-menu,#161a21);border:1px solid var(--dsw-alias-border-inverted,#2a303c);border-radius:16px;box-shadow:var(--dsw-shadow-lv3,0 20px 60px rgba(0,0,0,.5));color:var(--dsw-alias-label-primary,#e7eaf0);display:flex;flex-direction:column;overflow:hidden}" +
	".dss-head{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--dsw-alias-border,#2a303c)}" +
	".dss-head h2{margin:0;font-size:15px;font-weight:650;flex:1;min-width:0}" +
	".dss-tabs{display:flex;gap:4px}" +
	".dss-tabs button{background:none;border:none;color:var(--dsw-alias-label-secondary,#a6adbb);font-size:13px;padding:6px 12px;border-radius:8px;cursor:pointer}" +
	".dss-tabs button.on{background:rgba(79,140,255,.14);color:var(--dsw-alias-label-primary,#e7eaf0);font-weight:600}" +
	".dss-close{background:none;border:none;color:var(--dsw-alias-label-secondary,#a6adbb);cursor:pointer;border-radius:8px;width:28px;height:28px;display:grid;place-items:center}" +
	".dss-close:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))}" +
	".dss-head-actions{width:180px;flex:none;display:flex;align-items:center;justify-content:flex-end;gap:6px}" +
	".dss-export{background:none;border:1px solid var(--dsw-alias-border,#2a303c);color:var(--dsw-alias-label-secondary,#a6adbb);cursor:pointer;border-radius:7px;padding:3px 8px;font-size:11.5px}" +
	".dss-export:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#e7eaf0)}" +
	".dss-export:disabled{opacity:.45;cursor:default}" +
	".dss-body{padding:16px 18px;overflow:auto}" +
	".dss-data-status{padding:0 0 12px;margin-bottom:12px;border-bottom:1px solid var(--dsw-alias-border,#d1d5db);font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary,#6b7280);overflow-wrap:anywhere}" +
	".dss-data-status-line{display:flex;align-items:baseline;gap:4px 14px;flex-wrap:wrap}.dss-data-status strong{font-size:11px;font-weight:600}.dss-data-status.stale strong,.dss-data-status.fallback strong,.dss-data-status.partial strong,.dss-data-cost{color:var(--dsw-alias-label-primary,#555)}" +
	".dss-data-diagnostics{margin-top:6px}.dss-data-diagnostics summary{cursor:pointer;width:fit-content}.dss-data-diagnostics>div{padding-top:4px;white-space:pre-wrap}" +
	".dss-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:14px}" +
	".dss-card{background:var(--dsw-specific-menu,#1d222c);border:1px solid var(--dsw-alias-border,#2a303c);border-radius:11px;padding:11px 13px}" +
	".dss-card .k{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:12px}" +
	".dss-card .v{font-size:18px;font-weight:650;font-variant-numeric:tabular-nums}" +
	".dss-legend{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px}" +
	".dss-chip{display:inline-flex;align-items:center;gap:7px;background:var(--dsw-specific-menu,#1d222c);border:1px solid var(--dsw-alias-border,#2a303c);border-radius:999px;padding:4px 11px;cursor:pointer;font-size:12.5px;color:var(--dsw-alias-label-secondary,#a6adbb);user-select:none}" +
	".dss-chip .sw{width:10px;height:10px;border-radius:3px;background:var(--c)}" +
	".dss-chip.off{opacity:.4}" +
	// 项目卡片列表（每项目一个圆角框）
	".dss-pcards-wrap{display:flex;flex-direction:column;gap:10px}" +
	".dss-sortbar{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--dsw-alias-label-secondary,#a6adbb)}" +
	".dss-sortbar-label{font-size:12px}" +
	".dss-sortbar-select{background:var(--dsw-specific-menu,#1d222c);border:1px solid var(--dsw-alias-border,#2a303c);color:var(--dsw-alias-label-primary,#e7eaf0);border-radius:7px;padding:4px 8px;font-size:12px}" +
	".dss-sortbar-dir{background:none;border:1px solid var(--dsw-alias-border,#2a303c);color:var(--dsw-alias-label-secondary,#a6adbb);border-radius:7px;padding:4px 10px;cursor:pointer;font-size:11.5px}" +
	".dss-sortbar-dir:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#e7eaf0)}" +
	".dss-pcards-viewport,.dss-timeline-viewport,.dss-model-list-viewport{min-height:0}" +
	".dss-pcards-viewport.scrollable{max-height:501px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;padding-right:5px}" +
	".dss-timeline-viewport.scrollable{max-height:var(--dss-timeline-max-height);overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;padding-right:5px}" +
	".dss-model-list-viewport.scrollable{max-height:204px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;padding-right:5px}" +
	".dss-pcards-viewport.scrollable,.dss-timeline-viewport.scrollable,.dss-model-list-viewport.scrollable,.dss-day-lanes{scrollbar-width:thin;scrollbar-color:rgba(166,173,187,.28) transparent}" +
	".dss-pcards-viewport.scrollable:hover,.dss-timeline-viewport.scrollable:hover,.dss-model-list-viewport.scrollable:hover,.dss-day-lanes:hover{scrollbar-color:rgba(166,173,187,.5) transparent}" +
	".dss-pcards{display:flex;flex-direction:column;gap:10px}" +
	".dss-pcard{border:1px solid var(--dsw-alias-border,#2a303c);border-radius:12px;background:var(--dsw-specific-menu,#1d222c);overflow:hidden;transition:border-color .15s}" +
	".dss-pcard:hover{border-color:var(--dsw-alias-label-tertiary,#6b7280)}" +
	".dss-pcard.sel{border-color:rgba(79,140,255,.55)}" +
	".dss-pcard-head{display:flex;align-items:center;gap:18px;padding:13px 16px;min-height:61px;box-sizing:border-box;cursor:pointer}" +
	".dss-pcard-head:focus-visible{outline:2px solid rgba(79,140,255,.8);outline-offset:-2px}" +
	".dss-pcard-metrics{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;margin-left:auto}" +
	".dss-pm{min-width:58px;text-align:right}" +
	".dss-pm-l{height:15px;font-size:10px;line-height:15px;white-space:nowrap;color:var(--dsw-alias-label-tertiary,#6b7280);margin-bottom:3px}" +
	".dss-pm-v{font-size:13px;font-weight:650;color:var(--dsw-alias-label-primary,#e7eaf0);font-variant-numeric:tabular-nums;line-height:1.15}" +
	".dss-pm.cost .dss-pm-v{color:#ff922b}" +
	".dss-pcard-detail{border-top:1px solid var(--dsw-alias-border,#2a303c);background:rgba(255,255,255,.015);padding:6px 4px;overflow-x:hidden}" +
	".dss-statline{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:11.5px;font-variant-numeric:tabular-nums}" +
	".dss-proj{display:flex;align-items:center;gap:9px;min-width:0;flex:none}" +
	".dss-proj-txt{display:flex;flex-direction:column;min-width:0}" +
	".dss-proj .dot{width:10px;height:10px;border-radius:3px;background:var(--c);flex:none;box-shadow:0 0 0 2px color-mix(in srgb,var(--c) 22%,transparent)}" +
	".dss-proj .nm{font-weight:650;color:var(--dsw-alias-label-primary,#e7eaf0);font-size:13px}" +
	".dss-proj .ph{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:11px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
	// 会话详情：数据列自适应收缩；模型与金额之间保留独立间隔列。
	".dss-sess{--dss-data-shift:20px;display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1.08fr) minmax(0,.75fr) minmax(0,.9fr) minmax(0,.85fr) minmax(0,1.3fr) minmax(0,1.25fr) clamp(8px,1.7vw,20px) minmax(0,.65fr);gap:6px;align-items:center;width:100%;box-sizing:border-box;min-width:0;padding:7px 8px;border-bottom:1px solid var(--dsw-alias-border,#2a303c);font-size:12.5px;transition:background .12s}" +
	".dss-sess:last-child{border-bottom:none}" +
	".dss-sess:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.04))}" +
	".dss-sess .ti{font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:16px;box-sizing:border-box}" +
	".dss-sess-title{display:block;width:100%;border:0;background:none;color:inherit;font:inherit;line-height:inherit;text-align:left;cursor:pointer;padding:0 16px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
	".dss-sess-title:focus-visible{outline:2px solid rgba(79,140,255,.8);outline-offset:2px;border-radius:3px}" +
	".dss-sess>:nth-child(n+2){transform:translateX(var(--dss-data-shift))}" +
	".dss-sess .me{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:11.5px;text-align:right;font-variant-numeric:tabular-nums;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
	".dss-sess .st{color:var(--dsw-alias-label-secondary,#a6adbb);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap;min-width:0;overflow:hidden;text-overflow:ellipsis}" +
	".dss-sess-model{text-align:right!important;transform:translateX(var(--dss-data-shift))!important}" +
	".dss-sess-cost{grid-column:10;text-align:left!important}" +
	".dss-tag{font-size:10px;font-weight:600;color:#4f8cff;background:rgba(79,140,255,.14);border-radius:4px;padding:1px 5px;margin-left:6px;vertical-align:middle}" +
	".dss-group{font-size:11px;font-weight:600;color:var(--dsw-alias-label-tertiary,#6b7280);padding:9px 12px 3px}" +
	".dss-hint{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:11.5px;margin-bottom:10px}" +
	".dss-heat{display:flex;align-items:center;gap:3px;overflow-x:auto;padding-bottom:8px;margin-bottom:4px}" +
	".dss-hm{width:14px;height:14px;border-radius:4px;flex:none;background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));border:1px solid var(--dsw-alias-border,#2a303c)}" +
	".dss-hm.has{cursor:pointer}" +
	".dss-hm.has:hover{outline:1.5px solid #4f8cff;outline-offset:1px}" +
	".dss-axis{display:grid;grid-template-columns:150px 1fr 104px;margin-bottom:4px}" +
	".dss-hours{display:grid;grid-template-columns:repeat(9,1fr);color:var(--dsw-alias-label-tertiary,#6b7280);font-size:10.5px}" +
	".dss-hours span{text-align:center}" +
	".dss-hours span:first-child{text-align:left}" +
	".dss-hours span:last-child{text-align:right}" +
	".dss-day{display:grid;grid-template-columns:150px 1fr 104px;align-items:stretch;border-bottom:1px solid var(--dsw-alias-border,#2a303c);min-height:56px;box-sizing:border-box}" +
	// 左侧：项目颜色块列表（总览同款色点）+ 多天模式附加日期
	".dss-day-projs{display:flex;flex-direction:column;justify-content:center;gap:9px;padding:10px 8px 10px 0;min-width:0}" +
	".dss-day-date{font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-secondary,#a6adbb);margin-bottom:3px;font-variant-numeric:tabular-nums}" +
	".dss-day-proj{display:flex;align-items:center;gap:8px;min-width:0;transition:opacity .12s}" +
	".dss-day-proj:hover{opacity:.8}" +
	".dss-day-dot{width:10px;height:10px;border-radius:3px;flex:none;background:var(--c);box-shadow:0 0 0 2px color-mix(in srgb,var(--c) 22%,transparent)}" +
	".dss-day-pname{font-size:12.5px;color:var(--dsw-alias-label-primary,#e7eaf0);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
	".dss-day-more{font-size:10.5px;color:var(--dsw-alias-label-tertiary,#6b7280);padding-left:18px}" +
	".dss-track{display:grid;grid-template-columns:repeat(48,1fr);margin:4px 0}" +
	".dss-cell{position:relative;min-width:0;border-right:1px solid var(--dsw-alias-border,#2a303c);display:flex;flex-direction:row;align-items:flex-end;gap:1px}" +
	".dss-cell:last-child{border-right:none}" +
	".dss-blk{flex:1;min-width:2px;border-radius:3px;background:var(--c);cursor:pointer;transition:filter .12s}" +
	".dss-blk:hover{filter:brightness(1.25)}" +
	// 按日模式：项目独立泳道，标签和轨道在同一个滚动容器内保持对齐。
	".dss-day.day-mode{grid-template-columns:minmax(0,1fr) 104px}" +
	".dss-day-lanes{grid-column:1;display:flex;flex-direction:column;gap:6px;align-self:start;max-height:306px;overflow-y:auto;overflow-x:hidden;margin:8px 0;min-width:0;scrollbar-gutter:stable}" +
	".dss-day-lane{display:grid;grid-template-columns:150px minmax(0,1fr);gap:0;align-items:stretch;min-height:72px;flex:none}" +
	".dss-day-lane-label{display:flex;align-items:center;gap:8px;min-width:0;padding-right:8px}" +
	".dss-day-lane-track{display:grid;grid-template-columns:repeat(48,minmax(0,1fr));min-width:0;min-height:72px}" +
	".dss-day-lane-cell{position:relative;min-width:0;border-right:1px solid var(--dsw-alias-border,#2a303c);display:flex;align-items:flex-end}" +
	".dss-day-lane-cell:last-child{border-right:none}" +
	".dss-day-lane-cell .dss-blk{width:100%;min-width:0;flex:none}" +
	// 全部模式：同槽项目合并成全宽色块，颜色沿垂直方向切分，避免并排后变窄。
	".dss-blk-composite{width:100%;min-width:0;border-radius:3px;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;cursor:pointer;transition:filter .12s}" +
	".dss-blk-composite:hover{filter:brightness(1.25)}" +
	".dss-blk-segment{display:block;flex:1;min-height:1px;background:var(--c)}" +
		// 右侧信息列：总时长 + 活动时段 + 项目数
	".dss-day-info{display:flex;flex-direction:column;justify-content:center;align-items:flex-end;gap:4px;padding:8px 0 8px 12px;min-width:0}" +
	".dss-day-info .dur{font-size:13.5px;font-weight:650;color:var(--dsw-alias-label-primary,#e7eaf0);font-variant-numeric:tabular-nums}" +
	".dss-day-info .span{font-size:10.5px;color:var(--dsw-alias-label-secondary,#a6adbb);font-variant-numeric:tabular-nums;white-space:nowrap}" +
	".dss-day-info .cnt{font-size:10.5px;color:var(--dsw-alias-label-tertiary,#6b7280);white-space:nowrap}" +
	".dss-empty{color:var(--dsw-alias-label-tertiary,#6b7280);text-align:center;padding:32px 0}" +
	".dss-tt{background:var(--dsw-specific-menu,#1d222c);border:1px solid var(--dsw-alias-border,#2a303c);border-radius:9px;padding:8px 11px;box-shadow:0 8px 24px rgba(0,0,0,.45);font-size:12.5px;position:fixed;z-index:2000;pointer-events:none;display:none;max-width:320px}" +
	".dss-tt.show{display:block}" +
	// 日期导航器
	".dss-nav{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:14px;font-size:12.5px;color:var(--dsw-alias-label-secondary,#a6adbb)}" +
	".dss-nav > .dss-tabs{gap:2px}" +
	".dss-nav > .dss-tabs button{padding:5px 9px}" +
	".dss-nav-btn{background:var(--dsw-specific-menu,#1d222c);border:1px solid var(--dsw-alias-border,#2a303c);color:var(--dsw-alias-label-secondary,#a6adbb);border-radius:7px;min-width:28px;min-height:28px;padding:3px 7px;cursor:pointer;font-size:12.5px;line-height:1.2}" +
	".dss-nav-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#e7eaf0)}" +
	".dss-nav-btn:disabled{opacity:.35;cursor:default}" +
	".dss-nav-date{font-weight:650;color:var(--dsw-alias-label-primary,#e7eaf0);font-variant-numeric:tabular-nums;min-width:160px;text-align:center}" +
	".dss-nav-note{margin-left:auto;color:var(--dsw-alias-label-tertiary,#6b7280);font-size:11.5px}" +
	".dss-cost{font-variant-numeric:tabular-nums;font-weight:600;color:var(--dsw-alias-label-primary,#e7eaf0)}" +
	"[data-color='0']{--c:#4f8cff}[data-color='1']{--c:#34d399}[data-color='2']{--c:#fbbf24}[data-color='3']{--c:#f472b6}[data-color='4']{--c:#a78bfa}[data-color='5']{--c:#22d3ee}[data-color='6']{--c:#fb923c}[data-color='7']{--c:#e879f9}[data-color='8']{--c:#a3e635}[data-color='9']{--c:#f87171}[data-color='10']{--c:#2dd4bf}[data-color='11']{--c:#facc15}[data-color='12']{--c:#60a5fa}[data-color='13']{--c:#c084fc}[data-color='14']{--c:#fb7185}[data-color='15']{--c:#38bdf8}" +
	// 用量趋势（重构版）
	".dss-trends{display:flex;flex-direction:column;gap:14px}" +
	// hero：总 token + 消费 + 最常用模型
	".dss-hero{display:grid;grid-template-columns:1.6fr 1fr;gap:10px}" +
	".dss-hero-main{background:linear-gradient(135deg,rgba(79,140,255,.16),rgba(79,140,255,.04) 55%),var(--dsw-specific-menu,#1d222c);border:1px solid rgba(79,140,255,.28);border-radius:13px;padding:18px 20px;display:flex;flex-direction:column;gap:8px;min-width:0}" +
	".dss-hero-k{color:var(--dsw-alias-label-secondary,#a6adbb);font-size:12px;font-weight:600}" +
	".dss-hero-v{font-size:34px;font-weight:750;color:var(--dsw-alias-label-primary,#e7eaf0);font-variant-numeric:tabular-nums;line-height:1.05;letter-spacing:-.5px}" +
	".dss-hero-v.model{font-size:17px;letter-spacing:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:650}" +
	".dss-hero-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}" +
	".dss-hero-chip{background:rgba(79,140,255,.12);color:var(--dsw-alias-label-secondary,#a6adbb);border-radius:999px;padding:3px 10px;font-size:11.5px;font-variant-numeric:tabular-nums}" +
	".dss-hero-side{display:grid;grid-template-rows:1fr 1fr;gap:10px}" +
	".dss-hero-cell{background:var(--dsw-specific-menu,#1d222c);border:1px solid var(--dsw-alias-border,#2a303c);border-radius:13px;padding:13px 16px;display:flex;flex-direction:column;justify-content:center;gap:5px;min-width:0}" +
	".dss-hero-cell .dss-hero-v{font-size:22px}" +
	".dss-hero-cell .dss-cost{color:#ff922b}" +
	// 指标卡
	".dss-metric-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}" +
	".dss-metric{background:var(--dsw-specific-menu,#1d222c);border:1px solid var(--dsw-alias-border,#2a303c);border-radius:11px;padding:12px 14px;display:flex;flex-direction:column;gap:2px;min-width:0}" +
	".dss-metric-v{font-size:21px;font-weight:700;color:var(--dsw-alias-label-primary,#e7eaf0);font-variant-numeric:tabular-nums;line-height:1.1}" +
	".dss-metric-l{color:var(--dsw-alias-label-secondary,#a6adbb);font-size:12px;margin-top:2px}" +
	".dss-metric-s{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:10.5px}" +
	// section 容器（紧凑：高度由内容决定，无强制拉伸、无底部空白）
	".dss-section{background:var(--dsw-specific-menu,#1d222c);border:1px solid var(--dsw-alias-border,#2a303c);border-radius:13px;padding:12px 14px}" +
	".dss-sec-head{display:flex;align-items:baseline;gap:10px;margin-bottom:10px}" +
	".dss-sec-title{color:var(--dsw-alias-label-primary,#e7eaf0);font-size:13px;font-weight:650}" +
	".dss-sec-hint{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:11px;flex:1;text-align:right}" +
	// 热力图 + 每日趋势并排
	".dss-trend-duo{display:grid;grid-template-columns:minmax(280px,360px) 1fr;gap:30px;align-items:start}" +
	".dss-duo-cell{min-width:0}" +
	".dss-duo-cell.grow{flex:1}" +
	".dss-duo-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#a6adbb);margin-bottom:10px}" +
	"@media (max-width:860px){.dss-trend-duo{grid-template-columns:1fr}}" +
	// 当月日历热力图（紧凑：格子 22px、间距 3px）
	".dss-cal-wrap{display:flex;flex-direction:column;gap:8px}" +
	".dss-cal{width:100%;max-width:360px}" +
	".dss-cal-month{min-width:0}" +
	".dss-cal-title{font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-secondary,#a6adbb);margin-bottom:6px;text-align:center}" +
	".dss-cal-dow{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;font-size:9.5px;color:var(--dsw-alias-label-tertiary,#6b7280);margin-bottom:4px}" +
	".dss-cal-dow span{text-align:center}" +
	".dss-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}" +
	".dss-cal-cell,.dss-cal-pad{aspect-ratio:1;width:min(100%,22px);justify-self:center;border-radius:3px}" +
	".dss-cal-cell{display:block;padding:0;appearance:none;background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));border:1px solid var(--dsw-alias-border,#2a303c);cursor:default}" +
	".dss-cal-cell.interactive{cursor:pointer}" +
	// 4 档分位色阶（lvl0 = 无活动底色；对比拉大，最低档也清晰可见）
	".dss-cal-cell.lvl1.has{background:rgba(79,140,255,.35);border-color:transparent}" +
	".dss-cal-cell.lvl2.has{background:rgba(79,140,255,.58);border-color:transparent}" +
	".dss-cal-cell.lvl3.has{background:rgba(79,140,255,.8);border-color:transparent}" +
	".dss-cal-cell.lvl4.has{background:rgba(79,140,255,1);border-color:transparent;box-shadow:0 0 0 1px rgba(79,140,255,.4)}" +
	".dss-cal-cell.today{outline:1.5px solid var(--dsw-alias-label-primary,#e7eaf0);outline-offset:1px}" +
	".dss-cal-cell.selected{outline:2px solid #ff922b;outline-offset:1px;z-index:1}" +
	".dss-cal-cell.future{opacity:.35;border-style:dashed}" +
	".dss-cal-cell.interactive:hover{outline:1.5px solid var(--dsw-alias-label-primary,#e7eaf0);outline-offset:1px}" +
	".dss-cal-cell.interactive:focus-visible{outline:2px solid var(--dsw-alias-label-primary,#e7eaf0);outline-offset:2px}" +
	".dss-cal-cell.interactive.selected:focus-visible{outline-color:#ff922b}" +
	".dss-cal-legend{display:flex;align-items:center;gap:3px;font-size:10px;color:var(--dsw-alias-label-tertiary,#6b7280);justify-content:center}" +
	".dss-hm-lg{width:10px;height:10px;border-radius:2px;display:inline-block;background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));border:1px solid var(--dsw-alias-border,#2a303c)}" +
	".dss-hm-lg.lvl1{background:rgba(79,140,255,.35);border-color:transparent}" +
	".dss-hm-lg.lvl2{background:rgba(79,140,255,.58);border-color:transparent}" +
	".dss-hm-lg.lvl3{background:rgba(79,140,255,.8);border-color:transparent}" +
	".dss-hm-lg.lvl4{background:rgba(79,140,255,1);border-color:transparent}" +
	// 月度堆叠柱
	".dss-mchart{display:grid;grid-template-columns:auto 1fr;gap:6px 10px;align-items:stretch}" +
	// Y 轴刻度：5 个值均匀分布（0/25/50/75/100%），与横向网格线一一对齐
	".dss-mchart-y{display:flex;flex-direction:column;justify-content:space-between;font-size:10px;color:var(--dsw-alias-label-tertiary,#6b7280);text-align:right;padding:0 0 22px;font-variant-numeric:tabular-nums;position:relative}" +
	".dss-mchart-tick{height:0;line-height:1;transform:translateY(-50%)}" +
	".dss-mchart-tick:first-child{transform:none}" +
	".dss-mchart-tick:last-child{transform:translateY(-100%)}" +
	".dss-mchart-plot{position:relative}" +
	// 网格线：25%/50%/75% 虚线 + 100% 实线 X 轴基线（刻度与线同位置）
	".dss-mchart-grid{position:absolute;inset:0 0 22px;pointer-events:none}" +
	".dss-mchart-grid i{position:absolute;left:0;right:0;border-top:1px dashed var(--dsw-alias-border,#2a303c);height:0;display:block}" +
	".dss-mchart-grid i:nth-child(1){top:25%}" +
	".dss-mchart-grid i:nth-child(2){top:50%}" +
	".dss-mchart-grid i:nth-child(3){top:75%}" +
	".dss-mchart-grid i:nth-child(4){top:100%;border-top-style:solid}" +
	".dss-mchart-bars{display:flex;align-items:flex-end;gap:6px;height:126px}" +
	".dss-mchart-col{flex:1;min-width:26px;max-width:64px;height:126px;display:flex;flex-direction:column;justify-content:flex-end}" +
	".dss-mchart-bar{width:100%;height:100%;display:flex;flex-direction:column;justify-content:flex-end;border-radius:4px 4px 0 0;overflow:hidden;cursor:default;transition:filter .15s}" +
	".dss-mchart-bar:hover{filter:brightness(1.15)}" +
	".dss-mchart-seg{width:100%}" +
	".dss-mchart-seg.input{background:#4f8cff}" +
	".dss-mchart-seg.output{background:#ffd43b}" +
// 输出通常远少于输入；有真实输出时保留 2px 可见高度，避免被压成不可见的亚像素线。
	".dss-mchart-seg.output.has-value{min-height:2px}" +
	".dss-mchart-seg.reasoning{background:#cc5de8}" +
	// 日期行：独立于柱区，位于 X 轴基线下方（margin-top 4 + 高 18 = grid 底部 22px，与 Y 轴 padding 对齐）
	".dss-mchart-xlabels{display:flex;gap:6px;margin-top:4px}" +
	".dss-mchart-label{flex:1;min-width:26px;max-width:64px;text-align:center;font-size:10px;color:var(--dsw-alias-label-tertiary,#6b7280);height:18px;line-height:18px;overflow:hidden;white-space:nowrap}" +
	".dss-mchart-label.today{color:var(--dsw-alias-label-primary,#e7eaf0);font-weight:600}" +
	".dss-mchart-label.selected{color:#ff922b;font-weight:700}" +
	".dss-mchart-legend{grid-column:2;display:flex;justify-content:center;flex-wrap:wrap;gap:14px;font-size:11.5px;color:var(--dsw-alias-label-secondary,#a6adbb);align-items:center}" +
	".dss-mchart-lg{width:9px;height:9px;border-radius:2px;display:inline-block;margin-right:5px;vertical-align:-1px}" +
	".dss-mchart-lg.input{background:#4f8cff}" +
	".dss-mchart-lg.output{background:#ffd43b}" +
	".dss-mchart-lg.reasoning{background:#cc5de8}" +
	// 模型分布（紧凑：环 112px、列表行更矮）
	".dss-model-split{display:grid;grid-template-columns:160px minmax(0,1fr);gap:18px;align-items:start}" +
	".dss-ring-wrap{display:flex;width:160px;gap:12px;align-items:center;flex-direction:column}" +
	".dss-ring{width:112px;height:112px;border-radius:50%;display:grid;place-items:center;flex:none;position:relative}" +
	".dss-ring::after{content:\"\";position:absolute;inset:19px;background:var(--dsw-specific-menu,#1d222c);border-radius:50%}" +
	".dss-ring-center{position:relative;text-align:center;z-index:1}" +
	".dss-ring-total{font-size:15px;font-weight:700;color:var(--dsw-alias-label-primary,#e7eaf0);font-variant-numeric:tabular-nums}" +
	".dss-ring-label{font-size:9.5px;color:var(--dsw-alias-label-tertiary,#6b7280);margin-top:2px}" +
	".dss-ring-legend{display:flex;flex-direction:column;gap:5px;width:100%;min-width:0}" +
	".dss-ring-legend.scrollable{max-height:58px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;padding-right:4px;scrollbar-width:thin;scrollbar-color:rgba(166,173,187,.28) transparent}" +
	".dss-ring-legend.scrollable:hover{scrollbar-color:rgba(166,173,187,.5) transparent}" +
	".dss-ring-item{display:flex;align-items:center;gap:7px;height:16px;line-height:16px;flex:none;font-size:11.5px;color:var(--dsw-alias-label-secondary,#a6adbb)}" +
	".dss-ring-swatch{width:10px;height:10px;border-radius:3px;flex:none}" +
	".dss-ring-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
	".dss-ring-pct{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#e7eaf0);font-weight:600}" +
	".dss-model-list{display:flex;flex-direction:column;gap:8px;min-width:0}" +
	".dss-model-item{padding:8px 10px;border:1px solid var(--dsw-alias-border,#2a303c);border-radius:9px;background:rgba(255,255,255,.015);min-width:0;transition:border-color .15s}" +
	".dss-model-item:hover{border-color:var(--dsw-alias-label-tertiary,#6b7280)}" +
	".dss-model-head{display:flex;align-items:center;gap:8px;margin-bottom:5px;min-width:0}" +
	".dss-model-dot{width:9px;height:9px;border-radius:3px;flex:none}" +
	".dss-model-name{flex:1;font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary,#e7eaf0);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
	".dss-model-pct{font-size:12px;font-weight:650;color:var(--dsw-alias-label-primary,#e7eaf0);font-variant-numeric:tabular-nums}" +
	".dss-model-track{height:5px;border-radius:3px;background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));overflow:hidden;margin-bottom:5px}" +
	".dss-model-fill{height:100%;border-radius:3px;transition:width .2s}" +
	".dss-model-meta{font-size:10.5px;color:var(--dsw-alias-label-tertiary,#6b7280);font-variant-numeric:tabular-nums;line-height:1.4}" +
	".dss-model-list-viewport.scrollable .dss-model-meta{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
	// tooltip 结构化样式
	".dss-tip-title{font-weight:650;margin-bottom:5px;color:var(--dsw-alias-label-primary,#e7eaf0)}" +
	".dss-tip-row{display:flex;justify-content:space-between;gap:14px;line-height:1.6;color:var(--dsw-alias-label-secondary,#a6adbb)}" +
	".dss-tip-row b{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#e7eaf0)}" +
	"@media (min-width:768px){.dss-sess-cost{width:calc(100% - 8px)}}" +
	"@media (max-width:767px){.dss-sess{--dss-data-shift:10px}}" +
	"@media (max-width:640px){.dss-trends .dss-model-split{grid-template-columns:minmax(0,1fr)}.dss-model-split>.dss-ring-wrap{min-width:0;max-width:100%}.dss-ring-wrap>.dss-ring-legend{width:auto;flex:1;min-width:0}.dss-model-split>.dss-model-list-viewport{min-width:0;max-width:100%}}" +
	"@media (max-width:640px){.dss-overlay{padding:0}.dss-panel{border-radius:0;min-height:100%;width:100%}.dss-head{flex-wrap:wrap;gap:7px;padding:11px 12px}.dss-head h2{flex-basis:100%}.dss-head-actions{width:auto;margin-left:auto}.dss-head .dss-tabs{order:3;width:100%;overflow-x:auto}.dss-head .dss-export{padding:4px 7px}.dss-body{padding:12px}.dss-cards{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.dss-card{padding:9px}.dss-card .v{font-size:16px}.dss-pcards-viewport.scrollable{max-height:70vh;padding-right:3px}.dss-pcard-head{align-items:flex-start;flex-direction:column;gap:10px;padding:11px}.dss-pcard-metrics{width:100%;justify-content:flex-start;margin-left:0}.dss-pm{text-align:left;min-width:52px}.dss-sess{width:calc(100% - 2px);gap:3px;padding:6px 4px;font-size:10px}.dss-sess .ti{padding-right:4px}.dss-sess .me,.dss-sess .st{font-size:10px}.dss-axis,.dss-day{grid-template-columns:94px 1fr 70px}.dss-day.day-mode{grid-template-columns:minmax(0,1fr) 70px}.dss-day-projs{gap:6px}.dss-day-pname{font-size:11px}.dss-day-info{padding-left:5px}.dss-day-lane{grid-template-columns:94px minmax(0,1fr)}.dss-metric-row{grid-template-columns:repeat(2,minmax(0,1fr))}.dss-hero{grid-template-columns:1fr}.dss-model-split{grid-template-columns:1fr}.dss-ring-wrap{width:100%;flex-direction:row}.dss-sec-head{align-items:flex-start;flex-direction:column;gap:4px}.dss-sec-hint{text-align:left}.dss-nav{gap:6px}.dss-nav-note{flex-basis:100%;margin-left:0}.dss-tabs button{padding:6px 8px}.dss-track{min-width:480px}.dss-day{overflow-x:auto}.dss-day .dss-track{overflow:hidden}.dss-sortbar{flex-wrap:wrap}}";

module.exports = { css };
