const matrix = Object.freeze([
	Object.freeze({ dsh: "0.1.0-rc.6", node: ">=22", host: "verified", bundle: "verified", rpc: "verified", projection: "official-first, fallback", browser: "pending" }),
	Object.freeze({ dsh: "0.1.1-rc.2", node: "^22.19.0 || >=24.0.0", host: "verified", bundle: "verified", rpc: "verified", projection: "official-first, fallback", browser: "verified" }),
	Object.freeze({ dsh: "0.1.2-rc.1", node: "tested on 22.22.0", host: "module boot verified", bundle: "not rerun", rpc: "service + schema verified", projection: "real persistence/cache/restore/live", browser: "fixture verified" }),
	Object.freeze({ dsh: "0.1.3-alpha.2", node: "tested on 22.22.0", host: "module boot verified", bundle: "not rerun", rpc: "service + schema verified", projection: "real persistence/cache/restore/live", browser: "fixture verified" }),
	Object.freeze({ dsh: "0.1.5-rc.1", node: "tested on 22.22.0", host: "full Web boot verified", bundle: "official plugin install verified", rpc: "full Web + schema verified", projection: "real cache/restore/v3 handles/live Session", browser: "full Web verified" }),
	Object.freeze({ dsh: "0.1.5-rc.2", node: "tested on 22.22.0", host: "module boot verified", bundle: "not rerun", rpc: "service + schema verified", projection: "real cache/restore/v3 handles/live Session", browser: "fixture verified" }),
	Object.freeze({ dsh: "0.1.5-rc.3", node: "tested on 22.22.0", host: "full Web boot verified", bundle: "official plugin install verified", rpc: "full Web + schema verified", projection: "real cache/restore/v3 handles/live Session", browser: "full Web verified" }),
	Object.freeze({ dsh: "0.1.6-alpha.1", node: "tested on 22.22.0", host: "module boot verified", bundle: "not rerun", rpc: "service + schema verified", projection: "real cache/restore/v3 handles/live Session", browser: "fixture verified" }),
	Object.freeze({ dsh: "0.1.7-rc.2", node: "tested on 22.22.0", host: "full Web boot verified", bundle: "official plugin install verified", rpc: "full Web + schema verified", projection: "real cache/restore/v4 handles/live Session", browser: "full Web verified" }),
	Object.freeze({ dsh: "0.2.0-rc.2", node: "tested on 22.22.0", host: "module boot verified", bundle: "not rerun", rpc: "service + schema verified", projection: "real cache/restore/v4 handles/per-record/live Session", browser: "fixture verified" })
]);

function compatibilityFor(version) {
	return matrix.find((row) => row.dsh === version) || null;
}

module.exports = { compatibilityMatrix: matrix, compatibilityFor };
