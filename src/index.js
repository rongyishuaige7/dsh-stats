// 宿主半体 — StatsService：读 DSH 落盘数据（workspace.json + session_projcache.json
// + session.jsonl.zstd），聚合项目级统计 + 精确 30 分钟时间线 + 每会话模型 + 每槽 token。
// 通过 Typert Remote 暴露 stats/aggregate 给浏览器端。
//
// 宿主优先使用 workspace/session persistence、projection 和 query 服务；
// 只有旧 rc6 宿主未注入这些能力时，才回退到本地 JSONL 解码器。

import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { join } from "node:path";
import pricing from "./pricing.cjs";
import { pricingStore } from "./pricing-store.js";
import { collectAccounts, providerViews } from "./accounts.js";
const { summarizeCostsCny, mergeCostSummariesCny } = pricing;
import { SESSION_PROJECTION_DOMAIN_VERSION, SLOT_MINUTES, SLOT_MS, STATS_SCHEMA_VERSION, activityIntervals, basename, credentialsService, dshHome, firstString, identityFields, localDayKey, minutesOfDay, nonNegativeNumber, objectRecord, rawIdentity, readJson } from "./host-util.js";
import { BALANCE_CACHE_MS, balanceErrorCode, balanceState, fetchDeepSeekBalance, normalizeBalanceInfo, staleBalancePayload, unavailableBalancePayload } from "./host-balance.js";
import { STATS_ROUTE_PROJECTION, contextService, deriveSessionInfoFromEvents, forgetOfficialRead, infoFromProjectionValues, normalizeProjectionUsage, officialProjectionValues, officialReadCache, officialReadRevision, officialSessionSource, projectionCheckpoint, rememberOfficialRead, routeProjectionValueFromEntry, sessionInfo } from "./host-sessions.js";
import { addRaw, emptyRaw, modelUsages, projectionSlotUsage, repriceSnapshot, slotDurations, slotUsages } from "./host-usage.js";
// ES decorators 运行时（与官方编译产物一致）
var __runInitializers = function (thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function (f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
		else descriptor[key] = _;
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
let StatsService = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _aggregate_decorators;
	let _current_decorators;
	let _providers_decorators;
	let _account_decorators;
	let _pricing_decorators;
	return class StatsService extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_aggregate_decorators = [Remote("aggregate")];
			_current_decorators = [Remote("current")];
			_providers_decorators = [Remote("providers")];
			_account_decorators = [Remote("account")];
			_pricing_decorators = [Remote("pricing")];
			__esDecorate(this, null, _aggregate_decorators, {
				kind: "method",
				name: "aggregate",
				static: false,
				private: false,
				access: { has: (obj) => "aggregate" in obj, get: (obj) => obj.aggregate },
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _current_decorators, {
				kind: "method",
				name: "current",
				static: false,
				private: false,
				access: { has: (obj) => "current" in obj, get: (obj) => obj.current },
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _providers_decorators, {
				kind: "method",
				name: "providers",
				static: false,
				private: false,
				access: { has: (obj) => "providers" in obj, get: (obj) => obj.providers },
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _account_decorators, {
				kind: "method",
				name: "account",
				static: false,
				private: false,
				access: { has: (obj) => "account" in obj, get: (obj) => obj.account },
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _pricing_decorators, {
				kind: "method", name: "pricing", static: false, private: false,
				access: { has: obj => "pricing" in obj, get: obj => obj.pricing }, metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
		}
		constructor(ctx) {
			super(ctx, "stats");
			// 触发 @Remote 装饰器 initializer，把 aggregate 标记注册到 Typert（mark 幂等）。
			__runInitializers(this, _instanceExtraInitializers);
			if (typeof ctx?.effect === "function") ctx.effect(() => {
				const store = pricingStore(this, dshHome());
				this._pricingAuto = true;
				void store.refresh();
				const timer = setInterval(() => { void store.refresh(); }, 3600000); timer.unref?.();
				return () => { this._pricingAuto = false; clearInterval(timer); store.close(); };
			}, "dsh-stats: pricing updates");
			// Register the route projection only when the host exposes the official
			// registry. The registration is scoped to this service's Cordis fiber and
			// is therefore removed automatically when the plugin unloads.
			if (ctx && typeof ctx.inject === "function") {
				ctx.inject(["sessionProjections"], (projectionCtx) => {
					const registry = projectionCtx?.sessionProjections;
					if (registry && typeof registry.register === "function") registry.register(STATS_ROUTE_PROJECTION);
				});
			}
		}

		async aggregate(overridePricing) {
			const home = dshHome();
			const priceStore = pricingStore(this, home);
			const priceEngine = overridePricing || priceStore.snapshot();
			const warnings = [];
			const hostCtx = this.ctx || {};
			const workspaceRegistry = contextService(hostCtx, "workspaceRegistry");
			const persistence = contextService(hostCtx, "sessionPersistence");
			const sessionQuery = contextService(hostCtx, "sessionQuery");
			const sessionProjections = contextService(hostCtx, "sessionProjections");
			const projectionCache = contextService(hostCtx, "sessionProjectionCache");
			const readCache = officialReadCache(this);
			const readServices = [persistence, sessionQuery, sessionProjections, projectionCache];
			const officialWorkspaceAvailable = typeof workspaceRegistry?.list === "function";
			const officialProjectionAvailable = typeof projectionCache?.coldSnapshot === "function"
				|| typeof sessionProjections?.restoreFloor === "function" && typeof persistence?.readFrom === "function";

			// Official registries own storage-domain consistency and incremental reads.
			// Only use the JSON files when the host does not expose those services (rc6
			// compatibility and older installations).
			let wsRead = { ok: false, value: null, error: null };
			let sessionsRead = { ok: false, value: null, error: null };
			let wsJson = null;
			if (!officialWorkspaceAvailable) {
				wsRead = readJson(join(home, "storages", "workspace.json"));
				if (!wsRead.ok) warnings.push({ code: "WORKSPACE_READ_FAILED", message: wsRead.error?.message || "workspace storage read failed" });
				wsJson = wsRead.value;
			}
			if (!officialProjectionAvailable) {
				sessionsRead = readJson(join(home, "storages", "session_projcache.json"));
				if (!sessionsRead.ok) warnings.push({ code: "SESSION_CACHE_READ_FAILED", message: sessionsRead.error?.message || "session projection cache read failed" });
			}
			if (officialWorkspaceAvailable) {
				try {
					const records = {};
					for (const entity of workspaceRegistry.list()) {
						if (!entity || typeof entity.id !== "string") continue;
						records[entity.id] = { title: typeof entity.title === "string" ? entity.title : "", path: typeof entity.path === "string" ? entity.path : "", sessionIds: Array.isArray(entity.sessionIds) ? [...entity.sessionIds] : [] };
					}
					wsJson = { tables: { workspaces: records }, global: { archivedSessionIds: Array.isArray(workspaceRegistry.archivedSessionIds) ? [...workspaceRegistry.archivedSessionIds] : [] } };
				} catch (error) {
					warnings.push({ code: "OFFICIAL_WORKSPACE_FAILED", message: error?.message || String(error) });
				}
			}
			if (!wsJson) {
				wsRead = readJson(join(home, "storages", "workspace.json"));
				if (!wsRead.ok) warnings.push({ code: "WORKSPACE_READ_FAILED", message: wsRead.error?.message || "workspace storage read failed" });
				wsJson = wsRead.value;
			}
			const rawWorkspaces = wsJson?.tables?.workspaces;
			const workspaces = objectRecord(rawWorkspaces) || {};
			if (wsRead.ok && !objectRecord(rawWorkspaces)) warnings.push({ code: "WORKSPACE_SHAPE_INVALID", message: "workspace table was missing or not an object; invalid entries were ignored" });
			const rawArchivedIds = wsJson?.global?.archivedSessionIds;
			if (wsRead.ok && rawArchivedIds !== undefined && !Array.isArray(rawArchivedIds)) warnings.push({ code: "ARCHIVED_IDS_SHAPE_INVALID", message: "archivedSessionIds was not an array; the value was ignored" });
			const archivedSet = new Set((Array.isArray(rawArchivedIds) ? rawArchivedIds : []).filter((id) => typeof id === "string" && id));
			const rawSessionsTable = sessionsRead.value?.tables?.sessions;
			const sessionsTable = objectRecord(rawSessionsTable) || {};
			const projectionDomainVersion = sessionsRead.value?.unit?.version;
			if (projectionDomainVersion !== undefined && projectionDomainVersion !== SESSION_PROJECTION_DOMAIN_VERSION) warnings.push({ code: "SESSION_CACHE_DOMAIN_VERSION_UNSUPPORTED", message: `projection cache domain version ${String(projectionDomainVersion)} is not supported` });
			if (sessionsRead.ok && !objectRecord(rawSessionsTable)) warnings.push({ code: "SESSION_TABLE_SHAPE_INVALID", message: "session projection table was missing or not an object; the value was ignored" });
			let persistedHeaders = [];
			let sessionListResolved = false;
			// session-query owns the live-preferred logical corpus and delegates the
			// persisted listing to the official persistence seam. Prefer it so a
			// transient backend error cannot be mistaken for an empty workspace.
			if (sessionQuery && typeof sessionQuery.listSessions === "function") {
				try {
					const records = await sessionQuery.listSessions();
					persistedHeaders = records.map((record) => record?.header).filter((header) => header && typeof header.id === "string");
					sessionListResolved = true;
				} catch (error) {
					warnings.push({ code: "OFFICIAL_SESSION_LIST_FAILED", message: error?.message || String(error) });
				}
			}
			if (!sessionListResolved && persistence && typeof persistence.list === "function") {
				try {
					const records = await persistence.list();
					persistedHeaders = records.map((record) => record?.header || record).filter((header) => header && typeof header.id === "string");
				} catch (error) {
					warnings.push({ code: "OFFICIAL_SESSION_LIST_FAILED", message: error?.message || String(error) });
				}
			}
			for (const header of persistedHeaders) if (header?.id && !sessionsTable[header.id]) {
				sessionsTable[header.id] = { identity: { id: header.id, createdAt: header.createdAt, cwd: header.cwd, parentSession: header.parentSession, seedLength: header.seedLength } };
			}
			const seen = new Set();

			const workspaceEntries = [];
			for (const [wsId, ws] of Object.entries(workspaces)) {
				if (!objectRecord(ws)) {
					warnings.push({ code: "WORKSPACE_ENTRY_INVALID", message: `workspace ${wsId} was not an object and was ignored` });
					continue;
				}
				const rawSessionIds = ws.sessionIds;
				if (rawSessionIds !== undefined && !Array.isArray(rawSessionIds)) warnings.push({ code: "SESSION_IDS_SHAPE_INVALID", message: `workspace ${wsId} sessionIds was not an array; the value was ignored` });
				const sessionIds = [];
				const localIds = new Set();
				for (const id of Array.isArray(rawSessionIds) ? rawSessionIds : []) {
					if (typeof id !== "string" || !id) {
						warnings.push({ code: "SESSION_ID_INVALID", message: `workspace ${wsId} contained an invalid session id` });
						continue;
					}
					if (localIds.has(id)) {
						warnings.push({ code: "SESSION_ID_DUPLICATE", sessionId: id, message: `session ${id} appeared more than once in workspace ${wsId}` });
						continue;
					}
					localIds.add(id);
					sessionIds.push(id);
				}
				const title = typeof ws.title === "string" ? ws.title : "";
				const path = typeof ws.path === "string" ? ws.path : "";
				if (ws.title !== undefined && typeof ws.title !== "string") warnings.push({ code: "WORKSPACE_METADATA_INVALID", message: `workspace ${wsId} title was not a string` });
				if (ws.path !== undefined && typeof ws.path !== "string") warnings.push({ code: "WORKSPACE_METADATA_INVALID", message: `workspace ${wsId} path was not a string` });
				workspaceEntries.push({ wsId, ws: { title, path }, sessionIds });
			}

			const memberships = new Map();
			for (const entry of workspaceEntries) for (const sessionId of entry.sessionIds) {
				const owners = memberships.get(sessionId) || [];
				owners.push(entry);
				memberships.set(sessionId, owners);
			}
			const ownerBySession = new Map();
			for (const [sessionId, owners] of memberships) {
				const cwd = sessionsTable[sessionId]?.identity?.cwd;
				const owner = owners.find((entry) => typeof cwd === "string" && cwd && entry.ws.path === cwd) || owners[0];
				ownerBySession.set(sessionId, owner.wsId);
				if (owners.length > 1) warnings.push({ code: "SESSION_MULTIPLE_WORKSPACES", sessionId, message: `session ${sessionId} belonged to multiple workspaces and was counted only in ${owner.wsId}` });
			}

			// 处理一个会话：容错（坏日志不拖垮整体），返回会话记录或 null
			const processSession = async (sessionId, cwdFallback) => {
				seen.add(sessionId);
				const entry = sessionsTable[sessionId];
				let statsRow = objectRecord(entry?.rows?.sessionStats?.val);
				let usageTotals = objectRecord(entry?.rows?.tokenUsage?.val?.totals);
				const rawTitle = entry?.rows?.title?.val;
				let title = typeof rawTitle === "string" ? rawTitle : null;
				let meta = objectRecord(entry?.rows?.sessionListMetadata?.val) || {};
				const rawCreatedAt = entry?.identity?.createdAt;
				const rawLastPromptAt = meta.lastPromptAt;
				let createdAt = Number.isFinite(rawCreatedAt) && rawCreatedAt >= 0 ? rawCreatedAt : null;
				let lastPromptAt = Number.isFinite(rawLastPromptAt) && rawLastPromptAt >= 0 ? rawLastPromptAt : null;
				let info;
				let officialSource = null;
				let officialValues = null;
				let cacheOnly = false;
				const liveSession = contextService(hostCtx, "sessions")?.get?.(sessionId);
				const revision = await officialReadRevision(hostCtx, sessionId, warnings);
				const metadataKey = JSON.stringify([projectionDomainVersion, entry?.identity]);
				const cachedRead = readCache.entries.get(sessionId);
				const reuseRead = revision !== null && cachedRead?.revision === revision && cachedRead.metadataKey === metadataKey &&
					readServices.every((service, index) => service === cachedRead.services[index]);
				if (reuseRead) {
					({ info, officialSource, officialValues } = structuredClone(cachedRead.value));
					warnings.push(...cachedRead.warnings.map(row => ({ ...row })));
				} else {
					forgetOfficialRead(readCache, sessionId);
					const warningStart = warnings.length;
					// Let the official cache service answer first. Its cold ladder uses the
					// stored watermark and only replays the log suffix when necessary.
					if (!liveSession && officialProjectionAvailable) {
						try {
							officialValues = await officialProjectionValues(hostCtx, null, entry, warnings, sessionId, projectionDomainVersion);
						} catch (error) {
							warnings.push({ code: "OFFICIAL_PROJECTION_FAILED", sessionId, message: error?.message || String(error) });
						}
					}
					const routeProjectionAvailable = objectRecord(officialValues?.statsRoute) !== null;
					const projectionValuesAvailable = objectRecord(officialValues) !== null && (
						objectRecord(officialValues?.sessionStats) !== null
						|| objectRecord(officialValues?.tokenUsage) !== null
						|| routeProjectionAvailable
					);
					if (!liveSession && projectionValuesAvailable) {
						// Official projection values are already cut at one validated
						// watermark. Use them directly for cold sessions, including hosts
						// where the optional route projection is not mounted.
						info = infoFromProjectionValues(officialValues, entry);
						if (objectRecord(officialValues?.sessionStats)) statsRow = officialValues.sessionStats;
						const officialUsage = normalizeProjectionUsage(officialValues?.tokenUsage);
						if (officialUsage) usageTotals = {
							uncachedInputTokens: officialUsage.uncached, outputTokens: officialUsage.output,
							cacheReadTokens: officialUsage.cacheRead, cacheWriteTokens: officialUsage.cacheWrite
						};
						cacheOnly = true;
						warnings.push({ code: routeProjectionAvailable ? "OFFICIAL_ROUTE_PROJECTION_USED" : "OFFICIAL_PROJECTION_VALUES_USED", sessionId, message: routeProjectionAvailable ? "model route and token buckets came from the official projection cache" : "session statistics and token usage came from the official projection cache" });
					} else try {
						officialSource = await officialSessionSource(hostCtx, sessionId);
						if (officialSource) {
							info = deriveSessionInfoFromEvents(officialSource.events, officialSource.header, { inheritedEventCount: officialSource.inheritedEventCount });
							if (!officialValues) officialValues = await officialProjectionValues(hostCtx, officialSource, entry, warnings, sessionId, projectionDomainVersion);
							if (objectRecord(officialValues?.sessionStats)) statsRow = officialValues.sessionStats;
							const officialUsage = normalizeProjectionUsage(officialValues?.tokenUsage);
							if (officialUsage) usageTotals = {
								uncachedInputTokens: officialUsage.uncached, outputTokens: officialUsage.output,
								cacheReadTokens: officialUsage.cacheRead, cacheWriteTokens: officialUsage.cacheWrite
							};
						}
					} catch (error) {
						warnings.push({ code: "OFFICIAL_PERSISTENCE_FAILED", sessionId, message: error?.message || String(error) });
					}
					if (revision !== null && officialSource && info && !info.partial && !info.stale &&
						warnings.slice(warningStart).every(row => row.code.startsWith("OFFICIAL_") && row.code.endsWith("_USED"))) {
						const afterRevision = await officialReadRevision(hostCtx, sessionId, warnings);
						if (afterRevision === revision) rememberOfficialRead(readCache, sessionId, {
							revision, metadataKey, services: readServices,
							weight: 1 + info.usages.length * 2 + info.times.length + info.slotStats.length,
							warnings: warnings.slice(warningStart).map(row => ({ ...row })),
							value: structuredClone({ info, officialValues, officialSource: {
								header: officialSource.header, source: officialSource.source, inheritedEventCount: officialSource.inheritedEventCount
							} })
						});
					}
				}
				if (!info && !officialSource && officialValues) {
					info = infoFromProjectionValues(officialValues, entry);
					if (objectRecord(officialValues.sessionStats)) statsRow = officialValues.sessionStats;
					const officialUsage = normalizeProjectionUsage(officialValues.tokenUsage);
					if (officialUsage) usageTotals = {
						uncachedInputTokens: officialUsage.uncached, outputTokens: officialUsage.output,
						cacheReadTokens: officialUsage.cacheRead, cacheWriteTokens: officialUsage.cacheWrite
					};
				}
				if (!officialSource && !officialValues) try {
					// The legacy decoder is synchronous for compatibility with rc6. Yield
					// between sessions so a large fallback scan does not monopolize the
					// host event loop while official services are unavailable.
					await new Promise((resolve) => setImmediate(resolve));
					info = sessionInfo(home, sessionId);
				} catch (err) {
					const message = err?.message || String(err);
					console.warn(`[dsh-stats] 会话 ${sessionId} 日志解码失败（使用 projection cache）:`, message);
					warnings.push({ code: "SESSION_DECODE_FAILED", sessionId, message });
					info = { times: [], lastTime: null, model: null, providerId: "unknown", accountType: "api", usages: [], slotStats: [], stats: null, partial: false, stale: false, missing: false, unavailable: true };
				}
				if (officialValues) {
					if (objectRecord(officialValues.sessionStats)) statsRow = officialValues.sessionStats;
					const officialUsage = normalizeProjectionUsage(officialValues.tokenUsage);
					if (officialUsage) usageTotals = { uncachedInputTokens: officialUsage.uncached, outputTokens: officialUsage.output,
						cacheReadTokens: officialUsage.cacheRead, cacheWriteTokens: officialUsage.cacheWrite };
					if (officialValues.title === null || typeof officialValues.title === "string") title = officialValues.title;
					meta = objectRecord(officialValues.sessionListMetadata) || meta;
					if (Number.isFinite(meta.lastPromptAt) && meta.lastPromptAt >= 0) lastPromptAt = meta.lastPromptAt;
				}
				const sourceHeader = officialSource?.header || info?.header || null;
				// On rc6/older hosts the official projection service may be absent,
				// leaving only the persisted cache row. Recover its route buckets for
				// missing logs, but retain the missing/partial markers and never treat
				// an archived fork as attributable without its own log.
				if (!officialSource && !officialValues && info?.missing && entry && info.usages.length === 0) {
					const routeValue = routeProjectionValueFromEntry(entry, sessionId, sourceHeader, warnings, projectionDomainVersion);
					if (routeValue) {
						const routeInfo = infoFromProjectionValues({ statsRoute: routeValue }, entry);
						info = {
							...routeInfo,
							missing: true,
							stale: info.stale,
							unavailable: info.unavailable,
							seqGap: info.seqGap,
							futureVersion: info.futureVersion,
							lastSeq: info.lastSeq,
							header: info.header
						};
						warnings.push({ code: "SESSION_ROUTE_PROJECTION_FALLBACK", sessionId, message: "model routes came from the persisted projection cache because the session log was missing" });
					}
				}
				if (createdAt === null && Number.isFinite(sourceHeader?.createdAt) && sourceHeader.createdAt >= 0) createdAt = sourceHeader.createdAt;
				if (lastPromptAt === null && Number.isFinite(sourceHeader?.lastPromptAt) && sourceHeader.lastPromptAt >= 0) lastPromptAt = sourceHeader.lastPromptAt;
				const cwd = firstString(entry?.identity?.cwd, sourceHeader?.cwd, cwdFallback);
				const projectionInvalid = (rawTitle !== undefined && rawTitle !== null && typeof rawTitle !== "string")
					|| (rawCreatedAt !== undefined && rawCreatedAt !== null && createdAt === null)
					|| (rawLastPromptAt !== undefined && rawLastPromptAt !== null && lastPromptAt === null)
					|| (entry?.identity?.cwd !== undefined && entry?.identity?.cwd !== null && typeof entry.identity.cwd !== "string");
				const archived = archivedSet.has(sessionId);
				if (officialSource?.source === "sessionPersistence" || officialSource?.source === "sessionQuery") warnings.push({ code: "OFFICIAL_SOURCE_USED", sessionId, message: `session events loaded through ${officialSource.source}` });
				if (!officialSource && entry && !cacheOnly) {
					const checkpoint = projectionCheckpoint(entry, sessionId, sourceHeader, warnings, projectionDomainVersion);
					const rawRows = objectRecord(entry.rows);
					const hasVersionedRows = rawRows && Object.values(rawRows).some((row) => objectRecord(row) && (Object.prototype.hasOwnProperty.call(row, "ver") || Object.prototype.hasOwnProperty.call(row, "seq")));
					if (Object.keys(checkpoint).length > 0) {
						// A versioned cache is authoritative only at the exact observed log
						// watermark. Never combine a stale row with a newer log prefix.
						statsRow = null;
						usageTotals = null;
						for (const row of Object.values(checkpoint)) if (info.lastSeq >= 0 && row.seq > info.lastSeq) {
							warnings.push({ code: "SESSION_CACHE_AHEAD_OF_LOG", sessionId, message: "projection cache watermark was ahead of the session log and was ignored" });
							break;
						}
						for (const [key, row] of Object.entries(checkpoint)) if (info.lastSeq >= 0 && row.seq !== info.lastSeq) {
							warnings.push({ code: "SESSION_CACHE_STALE", sessionId, message: `projection row ${key} was at seq ${row.seq}, log ended at seq ${info.lastSeq}` });
						}
						const checkedStats = checkpoint.sessionStats;
						const checkedUsage = checkpoint.tokenUsage;
						if (checkedStats && (info.lastSeq < 0 || checkedStats.seq === info.lastSeq)) statsRow = objectRecord(checkedStats.val) || statsRow;
						if (checkedUsage && (info.lastSeq < 0 || checkedUsage.seq === info.lastSeq)) usageTotals = objectRecord(checkedUsage.val?.totals) || usageTotals;
					} else if (hasVersionedRows) {
						// A versioned cache that failed validation must never fall back to
						// its unvalidated value. Legacy rows without ver/seq remain readable
						// for rc6 fixtures and are handled by the compatibility path above.
						statsRow = null;
						usageTotals = null;
					}
				}
				if (info.seqGap || info.futureVersion || info.unknownSeed) {
					// A discontinuous or unknown-format log cannot establish a safe
					// watermark. Keep the session visible as partial, but exclude all
					// untrusted cache-derived usage from the primary totals.
					statsRow = null;
					usageTotals = null;
				}
				if (info.seqGap) warnings.push({ code: "SESSION_SEQ_GAP", sessionId, message: "session log sequence had a gap; cache values were not trusted" });
				if (info.unknownSeed) warnings.push({ code: "SESSION_SEED_BOUNDARY_UNKNOWN", sessionId, message: "inherited event boundary could not be recovered; unattributable usage was excluded" });
				if (info.futureVersion) warnings.push({ code: "SESSION_FORMAT_VERSION_UNSUPPORTED", sessionId, message: `session log format version ${String(info.formatVersion ?? sourceHeader?.version ?? "unknown")} is newer than this plugin` });
				// token 口径统一走日志 usages（已按 seedLength 过滤 fork 继承、按 turn:step 去重），
				// 与 slotUsage / 趋势页 / 成本完全一致。不用 projcache usageTotals：它把 fork
				// 子代理继承的父上下文 cacheRead 也计入了，导致总览页与趋势页不一致。
				let totalUncached = 0, totalOutput = 0, totalCacheRead = 0, totalCacheWrite = 0, totalReasoning = 0;
				for (const u of info.usages) {
					totalUncached += u.uncached || 0;
					totalOutput += u.output || 0;
					totalCacheRead += u.cacheRead || 0;
					totalCacheWrite += u.cacheWrite || 0;
					totalReasoning += u.reasoning || 0;
				}
				const projectionUsage = {
					uncached: nonNegativeNumber(usageTotals?.uncachedInputTokens),
					output: nonNegativeNumber(usageTotals?.outputTokens),
					cacheRead: nonNegativeNumber(usageTotals?.cacheReadTokens),
					cacheWrite: nonNegativeNumber(usageTotals?.cacheWriteTokens),
					reasoning: 0
				};
				const projectionTokens = projectionUsage.uncached + projectionUsage.output + projectionUsage.cacheRead + projectionUsage.cacheWrite;
				const effectiveParentSession = info.parentSession ?? firstString(entry?.identity?.parentSession, meta?.parentSession);
				const inheritedUsage = effectiveParentSession !== null || info.inheritedEventCount > 0 || info.seedLength > 0;
				// A complete log establishes an authoritative zero. Missing fork logs
				// cannot establish ownership of the official seed-inclusive totals.
				const usedProjectionUsage = info.usages.length === 0 && projectionTokens > 0 && !inheritedUsage &&
					(info.missing || info.unavailable || info.partial || info.cacheOnly);
				// 已归档且没有自身 usage 的 fork，其 projection token 只是父会话继承快照。
				// 这通常是已删除/不可恢复的 fork，无法可靠归属，整条记录从统计中舍弃。
				const cacheOnlyArchived = archived && info.missing && info.usages.length === 0 && usedProjectionUsage;
				const cacheOnlyFork = archived && effectiveParentSession !== null && info.missing && info.cacheOnly;
				if (cacheOnlyFork || (archived && effectiveParentSession !== null && info.usages.length === 0 && projectionTokens > 0) || cacheOnlyArchived) {
					warnings.push({ code: "SESSION_ORPHAN_FORK_DISCARDED", sessionId, message: "archived fork had no own usage; inherited projection tokens were excluded from statistics" });
					return null;
				}
				if (info.missing) warnings.push({ code: "SESSION_LOG_MISSING", sessionId, message: "session log was not found; projection cache was used where available" });
				if (info.partial) warnings.push({ code: "SESSION_LOG_PARTIAL", sessionId, message: "session log was incomplete or malformed; only valid committed records were used" });
				if (info.stale) warnings.push({ code: "SESSION_LOG_STALE", sessionId, message: info.readError || "cached session snapshot was used" });
				if (projectionInvalid) warnings.push({ code: "SESSION_METADATA_INVALID", sessionId, message: "invalid projection metadata was ignored" });
				if (usedProjectionUsage) {
					totalUncached = projectionUsage.uncached; totalOutput = projectionUsage.output;
					totalCacheRead = projectionUsage.cacheRead; totalCacheWrite = projectionUsage.cacheWrite;
					warnings.push({ code: "SESSION_USAGE_FALLBACK", sessionId, message: "token usage came from the projection cache and may include inherited fork context" });
				}
				const eventStats = info.stats || statsRow || {};
				const raw = {
					turns: nonNegativeNumber(eventStats.turns), steps: nonNegativeNumber(eventStats.steps),
					llmMs: nonNegativeNumber(eventStats.llmMs), toolMs: nonNegativeNumber(eventStats.toolMs),
					ttftMs: nonNegativeNumber(eventStats.ttftMs), ttftSteps: nonNegativeNumber(eventStats.ttftSteps),
					decodeMs: nonNegativeNumber(eventStats.decodeMs), decodeTokens: nonNegativeNumber(eventStats.decodeTokens),
					uncached: totalUncached, output: totalOutput,
					cacheRead: totalCacheRead, cacheWrite: totalCacheWrite,
					reasoning: totalReasoning
				};
				const updatedAt = Math.max(info.lastTime ?? 0, lastPromptAt ?? 0, createdAt ?? 0) || null;
				let perSlotUsage = slotUsages(info.usages, priceEngine);
				if (usedProjectionUsage && updatedAt !== null) perSlotUsage = [projectionSlotUsage(info, projectionUsage, updatedAt, priceEngine)];
				const modelUsage = modelUsages(perSlotUsage);
				const primaryIdentity = rawIdentity(info.providerId, info.model, info.accountType, updatedAt);
				const sessionCost = summarizeCostsCny(perSlotUsage.map((row) => row.cost));
				const session = {
					id: sessionId,
					title: title ?? null,
					updatedAt,
					createdAt,
					model: info.model ?? null,
					...identityFields(primaryIdentity),
					modelUsage,
					cost: sessionCost,
					archived,
					blank: meta?.blank === true,
					subagent: info.origin === "subagent",
					origin: info.origin ?? null,
						parentSession: effectiveParentSession ?? null,
					seedLength: info.seedLength ?? null,
					calls: info.usages.reduce((sum, usage) => sum + (usage.count ?? 1), 0),
					stats: raw,
					durMs: raw.llmMs + raw.toolMs,
					slots: slotDurations(info.times),
					slotStats: info.slotStats || [],
					slotUsage: perSlotUsage,
						quality: info.stale ? "stale" : (info.partial || info.missing || info.unavailable || info.cacheOnly || cacheOnly || usedProjectionUsage || projectionInvalid) ? "partial" : "exact",
					cwd
				};
				Object.defineProperty(session, "_intervals", { value: activityIntervals(info.times), enumerable: false });
				return session;
			};
				const processSessions = async (sessionIds, cwdFallback, limit = 4) => {
					const ids = Array.isArray(sessionIds) ? sessionIds : [];
					const results = new Array(ids.length);
					let cursor = 0;
					const worker = async () => {
						for (;;) {
							const index = cursor++;
							if (index >= ids.length) return;
							results[index] = await processSession(ids[index], cwdFallback);
						}
					};
					const workers = Math.min(Math.max(1, limit), ids.length);
					await Promise.all(Array.from({ length: workers }, () => worker()));
					return results;
				};

				const projects = [];
				for (const { wsId, ws, sessionIds } of workspaceEntries) {
				const sessions = [];
				const agg = emptyRaw();
				let lastActiveAt = null;
				let subagentCount = 0;

					const ownedIds = sessionIds.filter((sessionId) => ownerBySession.get(sessionId) === wsId);
					for (const s of await processSessions(ownedIds, ws.path)) {
						if (!s || s.blank) continue;
					addRaw(agg, s.stats);
					sessions.push(s);
					if (s.subagent) subagentCount++;
					if (s.updatedAt != null && (lastActiveAt == null || s.updatedAt > lastActiveAt)) lastActiveAt = s.updatedAt;
				}

				sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
				projects.push({
					id: wsId,
					name: ws.title || basename(ws.path) || "?",
					path: ws.path || "",
					sessionCount: sessions.length,
					subagentCount,
					lastActiveAt,
					stats: agg,
					cost: mergeCostSummariesCny(sessions.map((session) => session.cost)),
					sessions
				});
			}

			// 未归入任何工作区的会话：按 cwd 分组兜底（与客户端近似模式一致）；
				// cwd 与已有项目路径相同时合并进去，避免出现两个同名项目。
				const strayByCwd = new Map();
				const strayIds = Object.keys(sessionsTable).filter((sessionId) => !seen.has(sessionId));
				for (const s of await processSessions(strayIds, null)) {
					if (!s || s.blank) continue;
				const cwd = s.cwd || "(uncategorized)";
				if (!strayByCwd.has(cwd)) strayByCwd.set(cwd, []);
				strayByCwd.get(cwd).push(s);
			}
			strayByCwd.forEach((sessions, cwd) => {
				const existing = projects.find((p) => p.path === cwd);
				const target = existing ?? {
					id: "cwd-" + cwd,
					name: cwd === "(uncategorized)" ? cwd : basename(cwd),
					path: cwd,
					sessionCount: 0,
					subagentCount: 0,
					lastActiveAt: null,
					stats: emptyRaw(),
					sessions: []
				};
				if (!existing) projects.push(target);
				sessions.forEach((s) => {
					target.sessions.push(s);
					if (s.subagent) target.subagentCount++;
					addRaw(target.stats, s.stats);
					if (s.updatedAt != null && (target.lastActiveAt == null || s.updatedAt > target.lastActiveAt)) target.lastActiveAt = s.updatedAt;
				});
				target.sessionCount = target.sessions.length;
				target.sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
				target.cost = mergeCostSummariesCny(target.sessions.map((session) => session.cost));
			});
			projects.sort((a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0));
			const cost = mergeCostSummariesCny(projects.map((project) => project.cost));
			if (!overridePricing && cost.unpricedTokens > 0 && this._pricingAuto) void priceStore.refresh({ unknown: true });

			const projectIndex = new Map();
			projects.forEach((p, i) => projectIndex.set(p.id, i));

			// 时间线：先合并同项目并发会话区间，再按槽切分，避免父/子代理重叠计时。
			const daysMap = new Map();
			for (const p of projects) {
				const intervals = p.sessions.flatMap((s) => s._intervals || []).sort((a, b) => a[0] - b[0]);
				const merged = [];
				for (const interval of intervals) {
					const last = merged[merged.length - 1];
					if (last && interval[0] <= last[1]) last[1] = Math.max(last[1], interval[1]);
					else merged.push([...interval]);
				}
				const projectSlots = new Map();
				for (const [start, end] of merged) {
					const first = Math.floor(start / SLOT_MS), last = Math.floor((end - 1) / SLOT_MS);
					for (let slot = first; slot <= last; slot++) {
						const overlap = Math.min(end, (slot + 1) * SLOT_MS) - Math.max(start, slot * SLOT_MS);
						if (overlap > 0) projectSlots.set(slot, (projectSlots.get(slot) || 0) + overlap);
					}
				}
				for (const [slot, ms] of projectSlots) {
					const slotStartMs = slot * SLOT_MS;
					const date = localDayKey(slotStartMs);
					const slotOfDay = Math.floor(minutesOfDay(slotStartMs) / SLOT_MINUTES);
					let day = daysMap.get(date);
					if (!day) { day = { date, dayTotalMs: 0, slotBlocks: [] }; daysMap.set(date, day); }
					day.dayTotalMs += ms;
					day.slotBlocks.push({ slot: slotOfDay, projectId: p.id, name: p.name, colorIndex: projectIndex.get(p.id), ms });
				}
			}
			const days = [...daysMap.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
			days.forEach((d) => d.slotBlocks.sort((a, b) => a.slot - b.slot));

			return {
				projects,
				cost,
				timeline: { slotMinutes: SLOT_MINUTES, days },
				meta: { schemaVersion: STATS_SCHEMA_VERSION, source: "host", generatedAt: Date.now(), pricingVersion: priceEngine.catalog.version, pricingFingerprint: priceStore.fingerprint, degraded: warnings.some((warning) => !/^OFFICIAL_.*_USED$/.test(warning.code)), warnings }
			};
		}

		async pricing(request = { action: "status" }) {
			const store = pricingStore(this, dshHome());
			if (request.action === "refresh") return store.refresh({ force: true });
			if (request.action === "rollback") return store.rollback(request.version, request.revision);
			if (request.action === "preview" || request.action === "save") {
				const overrides = JSON.parse(request.overridesJson);
				if (request.action === "save") return store.save({ revision: request.revision, autoUpdate: request.autoUpdate, overrides, fingerprint: request.fingerprint });
				const engine = store.snapshot(), fingerprint = store.fingerprint;
				const before = await this.aggregate(engine);
				const after = repriceSnapshot(before, pricing.createPricing(engine.catalog, overrides));
				if (store.status().fingerprint !== fingerprint) throw new Error("pricing-settings-conflict");
				const changed = [];
				const old = new Map(before.projects.flatMap(p => p.sessions).map(s => [s.id, s]));
				for (const session of after.projects.flatMap(p => p.sessions)) {
					const previous = old.get(session.id);
					if (previous && JSON.stringify(previous.cost) !== JSON.stringify(session.cost)) changed.push({ sessionId: session.id, updatedAt: session.updatedAt, before: previous.cost, after: session.cost });
				}
				return { ...store.status(), previewJson: JSON.stringify({ changed, before: before.cost, after: after.cost }) };
			}
			if (request.action !== "status") throw new Error("pricing-action-invalid");
			return store.status();
		}

		async providers() {
			return providerViews(this, this.ctx || {});
		}

		async account(force = false) {
			return collectAccounts(this, this.ctx || {}, { force: force === true });
		}

		async current() {
			const state = balanceState(this);
			const now = Date.now();
			if (state.cache && now - state.cache.at < BALANCE_CACHE_MS) return state.cache.payload;
			if (state.inflight) return state.inflight;
			state.inflight = (async () => {
				try {
					const payload = await fetchDeepSeekBalance(credentialsService(this.ctx), globalThis.fetch, Date.now());
					state.cache = { at: Date.now(), payload };
					return payload;
				} catch (error) {
					const code = balanceErrorCode(error);
					if (code === "no-api-key") return unavailableBalancePayload(Date.now(), "unconfigured", code);
					if (state.cache?.payload) return staleBalancePayload(state.cache.payload, Date.now(), error);
					return unavailableBalancePayload(Date.now(), "error", code);
				} finally {
					state.inflight = null;
				}
			})();
			return state.inflight;
		}
	};
})();
export { StatsService, StatsService as default, fetchDeepSeekBalance, normalizeBalanceInfo };
