const matrix = Object.freeze([
	Object.freeze({ dsh: "0.1.0-rc.6", node: ">=22", host: "verified", bundle: "verified", rpc: "verified", projection: "official-first, fallback", browser: "pending" }),
	Object.freeze({ dsh: "0.1.1-rc.2", node: "^22.19.0 || >=24.0.0", host: "verified", bundle: "verified", rpc: "verified", projection: "official-first, fallback", browser: "verified" })
]);

function compatibilityFor(version) {
	return matrix.find((row) => row.dsh === version) || null;
}

module.exports = { compatibilityMatrix: matrix, compatibilityFor };
