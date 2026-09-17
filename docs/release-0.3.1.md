# 0.3.1 release

Scope: publish the September reliability and performance fixes, and verify the
package in a complete Web profile of the current npm `latest` Harness
(`0.1.5-rc.1` as of 2026-09-17). Existing user profiles, credentials and processes
remain outside the release setup. The isolated profile uses synthetic session
usage and no provider credentials.

Release gates: build and syntax-check all four bundles; pass the tests in the
default timezone and UTC; install the packed plugin through `dsh plugin`; boot
the actual Web profile; verify host statistics, populated projects and the four
plugin views in Chrome; pass repository CI before pushing `v0.3.1` to trigger the
existing npm publication workflow. Then check the public registry version and
install the published package back into the isolated profile.

`npm run smoke:web` reuses the maintained Web browser probe. It accepts
`DSH_WEB_URL_FILE` for a private file containing the authenticated launch URL,
`DSH_SMOKE_EXPECT_HOST=1` to require exact host statistics, and
`DSH_SMOKE_EXPECT_PROJECT` to require populated project data. Reports remove URL
queries and fragments. `smoke:rc2` and `DSH_RC2_URL` remain supported.

Pre-publication verification passed on Node 22.22.0 and Chrome 152.0.7977.83:

- All 216 tests pass in the default timezone and UTC; the four bundles build
  and pass syntax checks. The package contains the 16 intended entries.
- All 231 installed Harness modules resolve to `0.1.5-rc.1`. The packed plugin
  installs and registers through `dsh plugin --profile web add -w <tarball>`.
- The real Web host reads an official zstd v3 session: one project, one session,
  12345 input tokens (displayed as 12.3K), and 678 output tokens. Host data is exact.
- Overview, timeline, trends and account views pass. Five desktop/mobile
  screenshots are captured with zero console/runtime/network failures. The
  account state is explicitly unconfigured because no credentials are provided.

The first synthetic session was written uncompressed, which the default zstd
backend correctly rejected. The preserved plain fixture was moved aside and the
official persistence writer generated a matching zstd session before verification.
