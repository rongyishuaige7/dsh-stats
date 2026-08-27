# DSH compatibility matrix

| DSH | Node | Host boot | Bundle registration | Stats RPC | Projection source | Browser runtime |
| --- | --- | --- | --- | --- | --- | --- |
| `0.1.0-rc.6` | `>=22` | verified | verified | verified | official-first, fallback | pending |
| `0.1.1-rc.2` | `^22.19.0 || >=24.0.0` | verified | verified | verified | official-first, fallback | verified |

The rc2 row was verified with a fresh `@deepseek-ai/dsh@0.1.1-rc.2` process on 2026-08-27. `npm run smoke:rc2` launched a temporary Chrome 151 runtime, loaded the Web profile, confirmed the plugin entry and `.dss-panel`, rendered populated project/session data, selected `yi-api` and verified its USD balance card, and observed zero console errors, runtime exceptions, or failed network requests. A separate isolated run also covered the explicit empty-workspace state. The rc6 browser cell remains pending because no separate rc6 browser run was requested.
