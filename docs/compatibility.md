# DSH compatibility matrix

| DSH | Node | Host boot | Bundle registration | Stats RPC | Projection source | Browser runtime |
| --- | --- | --- | --- | --- | --- | --- |
| `0.1.0-rc.6` | `>=22` | verified | verified | verified | official-first, fallback | pending |
| `0.1.1-rc.2` | `^22.19.0 || >=24.0.0` | verified | verified | verified | official-first, fallback | verified |

The rc2 row was verified with an isolated `@deepseek-ai/dsh@0.1.1-rc.2` process on 2026-08-27. `npm run smoke:rc2` launched a temporary Chrome 151 runtime, loaded `http://127.0.0.1:58538/`, confirmed the plugin entry and `.dss-panel`, captured desktop/mobile screenshots, and observed zero console errors, runtime exceptions, or failed network requests. The isolated process had no selectable workspace, so the panel rendered an explicit empty-data state; this does not validate populated-session rendering. The rc6 browser cell remains pending because no separate rc6 browser run was requested.
