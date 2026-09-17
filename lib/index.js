var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// data/pricing/catalog.json
var require_catalog = __commonJS({
  "data/pricing/catalog.json"(exports, module) {
    module.exports = {
      schemaVersion: 1,
      version: 2026091704,
      publishedAt: "2026-09-17T21:20:40.511Z",
      rules: [
        {
          id: "openai/gpt-6-astra@2026-09-17",
          family: "openai",
          canonical: "gpt-6-astra",
          aliases: [
            "gpt-6-astra",
            "openai/gpt-6-astra"
          ],
          currency: "USD",
          sourceUrl: "https://developers.openai.com/api/docs/pricing",
          retrievedAt: "2026-09-17",
          rates: null,
          reasoningIncludedInOutput: true,
          confidence: "exact",
          observedFrom: "2026-09-17T00:00:00Z",
          contextTiers: {
            short: {
              cacheRead: 1,
              uncached: 10,
              cacheWrite: 12.5,
              output: 50
            },
            long: {
              cacheRead: 2,
              uncached: 20,
              cacheWrite: 25,
              output: 75
            }
          },
          contextThreshold: 272e3,
          tierMultipliers: {
            standard: 1,
            priority: 2,
            batch: 0.5,
            flex: 0.5
          }
        },
        {
          id: "deepseek/deepseek-v4-pro@2026-08-18",
          family: "deepseek",
          canonical: "deepseek-v4-pro",
          aliases: [
            "deepseek-v4-pro"
          ],
          currency: "CNY",
          sourceUrl: "https://api-docs.deepseek.com/zh-cn/quick_start/pricing",
          retrievedAt: "2026-08-18",
          rates: null,
          reasoningIncludedInOutput: true,
          confidence: "exact",
          legacy: {
            cacheRead: 0.025,
            uncached: 3,
            cacheWrite: 3,
            output: 6
          },
          offPeak: {
            cacheRead: 0.15,
            uncached: 4.5,
            cacheWrite: 4.5,
            output: 13.5
          },
          peak: {
            cacheRead: 0.3,
            uncached: 9,
            cacheWrite: 9,
            output: 27
          }
        },
        {
          id: "deepseek/deepseek-v4-flash@2026-08-18",
          family: "deepseek",
          canonical: "deepseek-v4-flash",
          aliases: [
            "deepseek-v4-flash"
          ],
          currency: "CNY",
          sourceUrl: "https://api-docs.deepseek.com/zh-cn/quick_start/pricing",
          retrievedAt: "2026-08-18",
          rates: null,
          reasoningIncludedInOutput: true,
          confidence: "exact",
          legacy: {
            cacheRead: 0.02,
            uncached: 1,
            cacheWrite: 1,
            output: 2
          },
          offPeak: {
            cacheRead: 0.05,
            uncached: 1.5,
            cacheWrite: 1.5,
            output: 4.5
          },
          peak: {
            cacheRead: 0.1,
            uncached: 3,
            cacheWrite: 3,
            output: 9
          }
        },
        {
          id: "minimax/MiniMax-M3@2026-08-18",
          family: "minimax",
          canonical: "MiniMax-M3",
          aliases: [
            "minimax-m3"
          ],
          currency: "CNY",
          sourceUrl: "https://platform.minimaxi.com/docs/guides/pricing-paygo",
          retrievedAt: "2026-08-18",
          rates: null,
          reasoningIncludedInOutput: true,
          confidence: "exact",
          serviceTiers: {
            standard: {
              short: {
                cacheRead: 0.42,
                uncached: 2.1,
                cacheWrite: 2.1,
                output: 8.4
              },
              long: {
                cacheRead: 0.84,
                uncached: 4.2,
                cacheWrite: 4.2,
                output: 16.8
              }
            },
            priority: {
              short: {
                cacheRead: 0.63,
                uncached: 3.15,
                cacheWrite: 3.15,
                output: 12.6
              },
              long: {
                cacheRead: 1.26,
                uncached: 6.3,
                cacheWrite: 6.3,
                output: 25.2
              }
            }
          }
        },
        {
          id: "minimax/MiniMax-M2.7@2026-08-18",
          family: "minimax",
          canonical: "MiniMax-M2.7",
          aliases: [
            "minimax-m2.7"
          ],
          currency: "CNY",
          sourceUrl: "https://platform.minimaxi.com/docs/guides/pricing-paygo",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 0.42,
            uncached: 2.1,
            cacheWrite: 2.625,
            output: 8.4
          },
          reasoningIncludedInOutput: true,
          confidence: "exact"
        },
        {
          id: "minimax/MiniMax-M2.7-highspeed@2026-08-18",
          family: "minimax",
          canonical: "MiniMax-M2.7-highspeed",
          aliases: [
            "minimax-m2.7-highspeed"
          ],
          currency: "CNY",
          sourceUrl: "https://platform.minimaxi.com/docs/guides/pricing-paygo",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 0.42,
            uncached: 4.2,
            cacheWrite: 2.625,
            output: 16.8
          },
          reasoningIncludedInOutput: true,
          confidence: "exact"
        },
        {
          id: "openai/gpt-5.6-sol@2026-08-26",
          family: "openai",
          canonical: "gpt-5.6-sol",
          aliases: [
            "gpt-5.6-sol",
            "openai/gpt-5.6-sol",
            "daybreak-blue-latest"
          ],
          currency: "USD",
          sourceUrl: "https://developers.openai.com/api/docs/pricing",
          retrievedAt: "2026-08-26",
          rates: null,
          reasoningIncludedInOutput: true,
          confidence: "exact",
          contextTiers: {
            short: {
              cacheRead: 0.4,
              uncached: 4,
              cacheWrite: 5,
              output: 20
            },
            long: {
              cacheRead: 0.8,
              uncached: 8,
              cacheWrite: 10,
              output: 30
            }
          },
          contextThreshold: 272e3
        },
        {
          id: "openai/gpt-5.6-terra@2026-08-26",
          family: "openai",
          canonical: "gpt-5.6-terra",
          aliases: [
            "gpt-5.6-terra",
            "openai/gpt-5.6-terra"
          ],
          currency: "USD",
          sourceUrl: "https://developers.openai.com/api/docs/pricing",
          retrievedAt: "2026-08-26",
          rates: null,
          reasoningIncludedInOutput: true,
          confidence: "exact",
          contextTiers: {
            short: {
              cacheRead: 0.2,
              uncached: 2,
              cacheWrite: 2.5,
              output: 12
            },
            long: {
              cacheRead: 0.4,
              uncached: 4,
              cacheWrite: 5,
              output: 18
            }
          },
          contextThreshold: 272e3
        },
        {
          id: "openai/gpt-5.6-luna@2026-08-26",
          family: "openai",
          canonical: "gpt-5.6-luna",
          aliases: [
            "gpt-5.6-luna",
            "openai/gpt-5.6-luna"
          ],
          currency: "USD",
          sourceUrl: "https://developers.openai.com/api/docs/pricing",
          retrievedAt: "2026-08-26",
          rates: null,
          reasoningIncludedInOutput: true,
          confidence: "exact",
          contextTiers: {
            short: {
              cacheRead: 0.02,
              uncached: 0.2,
              cacheWrite: 0.25,
              output: 1.2
            },
            long: {
              cacheRead: 0.04,
              uncached: 0.4,
              cacheWrite: 0.5,
              output: 1.8
            }
          },
          contextThreshold: 272e3
        },
        {
          id: "openai/gpt-5.4@2026-08-26",
          family: "openai",
          canonical: "gpt-5.4",
          aliases: [
            "gpt-5.4",
            "openai/gpt-5.4"
          ],
          currency: "USD",
          sourceUrl: "https://developers.openai.com/api/docs/pricing",
          retrievedAt: "2026-08-26",
          rates: null,
          reasoningIncludedInOutput: true,
          confidence: "exact",
          contextTiers: {
            short: {
              cacheRead: 0.25,
              uncached: 2.5,
              cacheWrite: 2.5,
              output: 15
            },
            long: {
              cacheRead: 0.5,
              uncached: 5,
              cacheWrite: 5,
              output: 30
            }
          },
          contextThreshold: 272e3,
          cacheWritePriceUnknown: true
        },
        {
          id: "openai/gpt-5.4-mini@2026-08-26",
          family: "openai",
          canonical: "gpt-5.4-mini",
          aliases: [
            "gpt-5.4-mini",
            "openai/gpt-5.4-mini"
          ],
          currency: "USD",
          sourceUrl: "https://developers.openai.com/api/docs/pricing",
          retrievedAt: "2026-08-26",
          rates: null,
          reasoningIncludedInOutput: true,
          confidence: "exact",
          contextTiers: {
            short: {
              cacheRead: 0.075,
              uncached: 0.75,
              cacheWrite: 0.75,
              output: 4.5
            },
            long: {
              cacheRead: 0.15,
              uncached: 1.5,
              cacheWrite: 1.5,
              output: 9
            }
          },
          contextThreshold: 272e3,
          cacheWritePriceUnknown: true
        },
        {
          id: "openai/gpt-5.6-cyber@2026-08-26",
          family: "openai",
          canonical: "gpt-5.6-cyber",
          aliases: [
            "gpt-5.6-cyber",
            "openai/gpt-5.6-cyber",
            "daybreak-red-latest"
          ],
          currency: "USD",
          sourceUrl: "https://developers.openai.com/api/docs/pricing",
          retrievedAt: "2026-08-26",
          rates: {
            cacheRead: 1.25,
            uncached: 12.5,
            cacheWrite: 15.625,
            output: 75
          },
          reasoningIncludedInOutput: true,
          confidence: "exact"
        },
        {
          id: "anthropic/claude-opus-5@2026-08-18",
          family: "anthropic",
          canonical: "claude-opus-5",
          aliases: [
            "claude-opus-5",
            "anthropic/claude-opus-5"
          ],
          currency: "USD",
          sourceUrl: "https://docs.anthropic.com/en/docs/about-claude/pricing",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 0.5,
            uncached: 5,
            cacheWrite: 6.25,
            output: 25
          },
          reasoningIncludedInOutput: true,
          confidence: "exact",
          cacheWriteDurationUnknown: true
        },
        {
          id: "anthropic/claude-sonnet-5@2026-08-18",
          family: "anthropic",
          canonical: "claude-sonnet-5",
          aliases: [
            "claude-sonnet-5",
            "anthropic/claude-sonnet-5"
          ],
          currency: "USD",
          sourceUrl: "https://docs.anthropic.com/en/docs/about-claude/pricing",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 0.2,
            uncached: 2,
            cacheWrite: 2.5,
            output: 10
          },
          reasoningIncludedInOutput: true,
          confidence: "exact",
          cacheWriteDurationUnknown: true
        },
        {
          id: "anthropic/claude-sonnet-4-6@2026-08-18",
          family: "anthropic",
          canonical: "claude-sonnet-4-6",
          aliases: [
            "claude-sonnet-4-6",
            "claude-sonnet-4.6",
            "anthropic/claude-sonnet-4.6",
            "anthropic/claude-sonnet-4-6"
          ],
          currency: "USD",
          sourceUrl: "https://docs.anthropic.com/en/docs/about-claude/pricing",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 0.3,
            uncached: 3,
            cacheWrite: 3.75,
            output: 15
          },
          reasoningIncludedInOutput: true,
          confidence: "exact",
          cacheWriteDurationUnknown: true
        },
        {
          id: "anthropic/claude-haiku-4-5@2026-08-18",
          family: "anthropic",
          canonical: "claude-haiku-4-5",
          aliases: [
            "claude-haiku-4-5",
            "claude-haiku-4.5",
            "anthropic/claude-haiku-4.5",
            "anthropic/claude-haiku-4-5"
          ],
          currency: "USD",
          sourceUrl: "https://docs.anthropic.com/en/docs/about-claude/pricing",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 0.1,
            uncached: 1,
            cacheWrite: 1.25,
            output: 5
          },
          reasoningIncludedInOutput: true,
          confidence: "exact",
          cacheWriteDurationUnknown: true
        },
        {
          id: "google/gemini-3.7-flash@2026-08-18",
          family: "google",
          canonical: "gemini-3.7-flash",
          aliases: [
            "gemini-3.7-flash",
            "google/gemini-3.7-flash"
          ],
          currency: "USD",
          sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 0.075,
            uncached: 0.75,
            cacheWrite: 0.75,
            output: 3.75
          },
          reasoningIncludedInOutput: true,
          confidence: "exact",
          effectiveTo: "2026-12-31T23:59:59.999Z",
          cacheStorageUnknown: true
        },
        {
          id: "google/gemini-3.1-pro-preview@2026-08-18",
          family: "google",
          canonical: "gemini-3.1-pro-preview",
          aliases: [
            "gemini-3.1-pro-preview",
            "gemini-3.1-pro-preview-customtools",
            "google/gemini-3.1-pro-preview"
          ],
          currency: "USD",
          sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
          retrievedAt: "2026-08-18",
          rates: null,
          reasoningIncludedInOutput: true,
          confidence: "exact",
          contextTiers: {
            short: {
              cacheRead: 0.2,
              uncached: 2,
              cacheWrite: 2,
              output: 12
            },
            long: {
              cacheRead: 0.4,
              uncached: 4,
              cacheWrite: 4,
              output: 18
            }
          },
          contextThreshold: 2e5,
          cacheStorageUnknown: true
        },
        {
          id: "google/gemini-2.5-pro@2026-08-18",
          family: "google",
          canonical: "gemini-2.5-pro",
          aliases: [
            "gemini-2.5-pro",
            "google/gemini-2.5-pro"
          ],
          currency: "USD",
          sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
          retrievedAt: "2026-08-18",
          rates: null,
          reasoningIncludedInOutput: true,
          confidence: "exact",
          contextTiers: {
            short: {
              cacheRead: 0.125,
              uncached: 1.25,
              cacheWrite: 1.25,
              output: 10
            },
            long: {
              cacheRead: 0.25,
              uncached: 2.5,
              cacheWrite: 2.5,
              output: 15
            }
          },
          contextThreshold: 2e5,
          cacheStorageUnknown: true
        },
        {
          id: "google/gemini-2.5-flash@2026-08-18",
          family: "google",
          canonical: "gemini-2.5-flash",
          aliases: [
            "gemini-2.5-flash",
            "google/gemini-2.5-flash"
          ],
          currency: "USD",
          sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 0.03,
            uncached: 0.3,
            cacheWrite: 0.3,
            output: 2.5
          },
          reasoningIncludedInOutput: true,
          confidence: "exact",
          cacheStorageUnknown: true
        },
        {
          id: "moonshot/kimi-k3@2026-08-18",
          family: "moonshot",
          canonical: "kimi-k3",
          aliases: [
            "kimi-k3",
            "moonshotai/kimi-k3"
          ],
          currency: "CNY",
          sourceUrl: "https://platform.kimi.com/docs/pricing/chat.md",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 2,
            uncached: 20,
            cacheWrite: 20,
            output: 100
          },
          reasoningIncludedInOutput: true,
          confidence: "exact"
        },
        {
          id: "moonshot/kimi-k2.7-code@2026-08-18",
          family: "moonshot",
          canonical: "kimi-k2.7-code",
          aliases: [
            "kimi-k2.7-code",
            "moonshotai/kimi-k2.7-code"
          ],
          currency: "CNY",
          sourceUrl: "https://platform.kimi.com/docs/pricing/chat.md",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 1.3,
            uncached: 6.5,
            cacheWrite: 6.5,
            output: 27
          },
          reasoningIncludedInOutput: true,
          confidence: "exact"
        },
        {
          id: "moonshot/kimi-k2.7-code-highspeed@2026-08-18",
          family: "moonshot",
          canonical: "kimi-k2.7-code-highspeed",
          aliases: [
            "kimi-k2.7-code-highspeed",
            "moonshotai/kimi-k2.7-code-highspeed"
          ],
          currency: "CNY",
          sourceUrl: "https://platform.kimi.com/docs/pricing/chat.md",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 2.6,
            uncached: 13,
            cacheWrite: 13,
            output: 54
          },
          reasoningIncludedInOutput: true,
          confidence: "exact"
        },
        {
          id: "moonshot/kimi-k2.6@2026-08-18",
          family: "moonshot",
          canonical: "kimi-k2.6",
          aliases: [
            "kimi-k2.6",
            "moonshotai/kimi-k2.6"
          ],
          currency: "CNY",
          sourceUrl: "https://platform.kimi.com/docs/pricing/chat.md",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 1.1,
            uncached: 6.5,
            cacheWrite: 6.5,
            output: 27
          },
          reasoningIncludedInOutput: true,
          confidence: "exact"
        },
        {
          id: "zai/glm-5.2@2026-08-18",
          family: "zai",
          canonical: "glm-5.2",
          aliases: [
            "glm-5.2",
            "z-ai/glm-5.2"
          ],
          currency: "USD",
          sourceUrl: "https://docs.z.ai/guides/overview/pricing",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 0.26,
            uncached: 1.4,
            cacheWrite: 1.4,
            output: 4.4
          },
          reasoningIncludedInOutput: true,
          confidence: "exact"
        },
        {
          id: "zai/glm-5.1@2026-08-18",
          family: "zai",
          canonical: "glm-5.1",
          aliases: [
            "glm-5.1",
            "z-ai/glm-5.1"
          ],
          currency: "USD",
          sourceUrl: "https://docs.z.ai/guides/overview/pricing",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 0.26,
            uncached: 1.4,
            cacheWrite: 1.4,
            output: 4.4
          },
          reasoningIncludedInOutput: true,
          confidence: "exact"
        },
        {
          id: "zai/glm-5@2026-08-18",
          family: "zai",
          canonical: "glm-5",
          aliases: [
            "glm-5",
            "z-ai/glm-5"
          ],
          currency: "USD",
          sourceUrl: "https://docs.z.ai/guides/overview/pricing",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 0.2,
            uncached: 1,
            cacheWrite: 1,
            output: 3.2
          },
          reasoningIncludedInOutput: true,
          confidence: "exact"
        },
        {
          id: "zai/glm-5-turbo@2026-08-18",
          family: "zai",
          canonical: "glm-5-turbo",
          aliases: [
            "glm-5-turbo",
            "z-ai/glm-5-turbo"
          ],
          currency: "USD",
          sourceUrl: "https://docs.z.ai/guides/overview/pricing",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 0.24,
            uncached: 1.2,
            cacheWrite: 1.2,
            output: 4
          },
          reasoningIncludedInOutput: true,
          confidence: "exact"
        },
        {
          id: "zai/glm-4.7@2026-08-18",
          family: "zai",
          canonical: "glm-4.7",
          aliases: [
            "glm-4.7",
            "z-ai/glm-4.7"
          ],
          currency: "USD",
          sourceUrl: "https://docs.z.ai/guides/overview/pricing",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 0.11,
            uncached: 0.6,
            cacheWrite: 0.6,
            output: 2.2
          },
          reasoningIncludedInOutput: true,
          confidence: "exact"
        },
        {
          id: "zai/glm-4.7-flashx@2026-08-18",
          family: "zai",
          canonical: "glm-4.7-flashx",
          aliases: [
            "glm-4.7-flashx",
            "z-ai/glm-4.7-flashx"
          ],
          currency: "USD",
          sourceUrl: "https://docs.z.ai/guides/overview/pricing",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 0.01,
            uncached: 0.07,
            cacheWrite: 0.07,
            output: 0.4
          },
          reasoningIncludedInOutput: true,
          confidence: "exact"
        },
        {
          id: "zai/glm-4.7-flash@2026-08-18",
          family: "zai",
          canonical: "glm-4.7-flash",
          aliases: [
            "glm-4.7-flash",
            "z-ai/glm-4.7-flash"
          ],
          currency: "USD",
          sourceUrl: "https://docs.z.ai/guides/overview/pricing",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 0,
            uncached: 0,
            cacheWrite: 0,
            output: 0
          },
          reasoningIncludedInOutput: true,
          confidence: "exact"
        },
        {
          id: "openrouter/openai/gpt-5.6-sol@2026-08-18",
          family: "openrouter",
          canonical: "openai/gpt-5.6-sol",
          aliases: [
            "openai/gpt-5.6-sol"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 0.25,
            uncached: 2.5,
            cacheWrite: 3.125,
            output: 15
          },
          reasoningIncludedInOutput: true,
          confidence: "estimated"
        },
        {
          id: "openrouter/openai/gpt-5.6-terra@2026-08-18",
          family: "openrouter",
          canonical: "openai/gpt-5.6-terra",
          aliases: [
            "openai/gpt-5.6-terra"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 0.2,
            uncached: 2,
            cacheWrite: 2.5,
            output: 12
          },
          reasoningIncludedInOutput: true,
          confidence: "estimated"
        },
        {
          id: "openrouter/openai/gpt-5.6-luna@2026-08-18",
          family: "openrouter",
          canonical: "openai/gpt-5.6-luna",
          aliases: [
            "openai/gpt-5.6-luna"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 0.02,
            uncached: 0.2,
            cacheWrite: 0.25,
            output: 1.2
          },
          reasoningIncludedInOutput: true,
          confidence: "estimated"
        },
        {
          id: "openrouter/anthropic/claude-opus-5@2026-08-18",
          family: "openrouter",
          canonical: "anthropic/claude-opus-5",
          aliases: [
            "anthropic/claude-opus-5"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 0.5,
            uncached: 5,
            cacheWrite: 6.25,
            output: 25
          },
          reasoningIncludedInOutput: true,
          confidence: "estimated"
        },
        {
          id: "openrouter/anthropic/claude-sonnet-5@2026-08-18",
          family: "openrouter",
          canonical: "anthropic/claude-sonnet-5",
          aliases: [
            "anthropic/claude-sonnet-5"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 0.2,
            uncached: 2,
            cacheWrite: 2.5,
            output: 10
          },
          reasoningIncludedInOutput: true,
          confidence: "estimated"
        },
        {
          id: "openrouter/google/gemini-3.7-flash@2026-08-18",
          family: "openrouter",
          canonical: "google/gemini-3.7-flash",
          aliases: [
            "google/gemini-3.7-flash"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 0.0375,
            uncached: 0.375,
            cacheWrite: 0.0208333333333333,
            output: 1.875
          },
          reasoningIncludedInOutput: true,
          confidence: "estimated"
        },
        {
          id: "openrouter/moonshotai/kimi-k3@2026-08-18",
          family: "openrouter",
          canonical: "moonshotai/kimi-k3",
          aliases: [
            "moonshotai/kimi-k3"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 0.3,
            uncached: 3,
            cacheWrite: 3,
            output: 15
          },
          reasoningIncludedInOutput: true,
          confidence: "estimated"
        },
        {
          id: "openrouter/z-ai/glm-5.2@2026-08-18",
          family: "openrouter",
          canonical: "z-ai/glm-5.2",
          aliases: [
            "z-ai/glm-5.2"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-08-18",
          rates: {
            cacheRead: 0.115,
            uncached: 0.5,
            cacheWrite: 0.5,
            output: 3.15
          },
          reasoningIncludedInOutput: true,
          confidence: "estimated"
        },
        {
          id: "openrouter/stealth/union-alpha@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "stealth/union-alpha",
          aliases: [
            "stealth/union-alpha"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0,
            output: 0,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/~deepseek/deepseek-pro-latest@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "~deepseek/deepseek-pro-latest",
          aliases: [
            "~deepseek/deepseek-pro-latest"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.7,
            output: 2.96,
            cacheRead: 0.032999999999999995,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true,
          effectiveTo: "2026-09-17T16:58:48.650Z"
        },
        {
          id: "openrouter/~deepseek/deepseek-flash-latest@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "~deepseek/deepseek-flash-latest",
          aliases: [
            "~deepseek/deepseek-flash-latest"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.15,
            output: 0.6,
            cacheRead: 0.015,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/inference-net/schematron-v2-turbo@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "inference-net/schematron-v2-turbo",
          aliases: [
            "inference-net/schematron-v2-turbo"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.03,
            output: 0.15,
            cacheRead: 0.03,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/inference-net/schematron-v2-small@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "inference-net/schematron-v2-small",
          aliases: [
            "inference-net/schematron-v2-small"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.049999999999999996,
            output: 0.22999999999999998,
            cacheRead: 0.049999999999999996,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/inclusionai/ling-3.0-flash-vl@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "inclusionai/ling-3.0-flash-vl",
          aliases: [
            "inclusionai/ling-3.0-flash-vl"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.06,
            output: 0.18,
            cacheRead: 0.012,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/inclusionai/ling-3.0-flash-vl:free@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "inclusionai/ling-3.0-flash-vl:free",
          aliases: [
            "inclusionai/ling-3.0-flash-vl:free"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0,
            output: 0,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/inception/mercury-2.5@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "inception/mercury-2.5",
          aliases: [
            "inception/mercury-2.5"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.04,
            output: 0.15,
            cacheRead: 4e-3,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/nex-agi/nex-n2.5-mini:free@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "nex-agi/nex-n2.5-mini:free",
          aliases: [
            "nex-agi/nex-n2.5-mini:free"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0,
            output: 0,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/nex-agi/nex-n2.5-pro:free@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "nex-agi/nex-n2.5-pro:free",
          aliases: [
            "nex-agi/nex-n2.5-pro:free"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0,
            output: 0,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/inclusionai/ling-3.0-flash-sante:free@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "inclusionai/ling-3.0-flash-sante:free",
          aliases: [
            "inclusionai/ling-3.0-flash-sante:free"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0,
            output: 0,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3.8-max-0902@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3.8-max-0902",
          aliases: [
            "qwen/qwen3.8-max-0902"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 2,
            output: 6,
            cacheRead: 0.25,
            cacheWrite: 2.5
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/ibm-granite/granite-4.2-8b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "ibm-granite/granite-4.2-8b",
          aliases: [
            "ibm-granite/granite-4.2-8b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.06,
            output: 0.25,
            cacheRead: 0.015,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/tencent/hy4-preview@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "tencent/hy4-preview",
          aliases: [
            "tencent/hy4-preview"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.834,
            output: 2.501,
            cacheRead: 0.041999999999999996,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/inclusionai/ling-3.0-flash-fin@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "inclusionai/ling-3.0-flash-fin",
          aliases: [
            "inclusionai/ling-3.0-flash-fin"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.06,
            output: 0.18,
            cacheRead: 0.012,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/inclusionai/ling-3.0-flash-fin:free@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "inclusionai/ling-3.0-flash-fin:free",
          aliases: [
            "inclusionai/ling-3.0-flash-fin:free"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0,
            output: 0,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/~z-ai/glm-flash-latest@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "~z-ai/glm-flash-latest",
          aliases: [
            "~z-ai/glm-flash-latest"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.075,
            output: 0.25,
            cacheRead: 0.015,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3.8-flash@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3.8-flash",
          aliases: [
            "qwen/qwen3.8-flash"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.15,
            output: 0.47,
            cacheRead: 0.016,
            cacheWrite: 0.19999999999999998
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/z-ai/glm-5.3-flash@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "z-ai/glm-5.3-flash",
          aliases: [
            "z-ai/glm-5.3-flash"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.09,
            output: 0.3,
            cacheRead: 0.018,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/z-ai/glm-5.3-flash:batch@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "z-ai/glm-5.3-flash:batch",
          aliases: [
            "z-ai/glm-5.3-flash:batch"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.075,
            output: 0.25,
            cacheRead: 0.015,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/deepseek/deepseek-v4-flash-vision-exp@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "deepseek/deepseek-v4-flash-vision-exp",
          aliases: [
            "deepseek/deepseek-v4-flash-vision-exp"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.22,
            output: 0.66,
            cacheRead: 7e-3,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/deepseek/deepseek-v4-flash-vision-exp:batch@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "deepseek/deepseek-v4-flash-vision-exp:batch",
          aliases: [
            "deepseek/deepseek-v4-flash-vision-exp:batch"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.11,
            output: 0.33,
            cacheRead: 35e-4,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/tencent/hy-mt2-1.8b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "tencent/hy-mt2-1.8b",
          aliases: [
            "tencent/hy-mt2-1.8b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.044,
            output: 0.17700000000000002,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/tencent/hy-mt2-30b-a3b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "tencent/hy-mt2-30b-a3b",
          aliases: [
            "tencent/hy-mt2-30b-a3b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.074,
            output: 0.295,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/~z-ai/glm-latest@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "~z-ai/glm-latest",
          aliases: [
            "~z-ai/glm-latest"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.8775,
            output: 2.9699999999999998,
            cacheRead: 0.1755,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/tencent/hy-mt2-7b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "tencent/hy-mt2-7b",
          aliases: [
            "tencent/hy-mt2-7b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.074,
            output: 0.295,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/z-ai/glm-5.3@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "z-ai/glm-5.3",
          aliases: [
            "z-ai/glm-5.3"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 1.4,
            output: 4.4,
            cacheRead: 0.26,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/z-ai/glm-5.3:batch@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "z-ai/glm-5.3:batch",
          aliases: [
            "z-ai/glm-5.3:batch"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.7,
            output: 2.2,
            cacheRead: 0.13,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3.8-27b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3.8-27b",
          aliases: [
            "qwen/qwen3.8-27b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.21400000000000002,
            output: 2.5500000000000003,
            cacheRead: 0.15,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/dots-studio/dots-3-note-preview:free@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "dots-studio/dots-3-note-preview:free",
          aliases: [
            "dots-studio/dots-3-note-preview:free"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0,
            output: 0,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/bytedance-seed/seed-2-1-turbo@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "bytedance-seed/seed-2-1-turbo",
          aliases: [
            "bytedance-seed/seed-2-1-turbo"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.5,
            output: 2.5,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3.8-2.4t-a95b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3.8-2.4t-a95b",
          aliases: [
            "qwen/qwen3.8-2.4t-a95b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 2,
            output: 6,
            cacheRead: 0.25,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3.8-2.4t-a95b:batch@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3.8-2.4t-a95b:batch",
          aliases: [
            "qwen/qwen3.8-2.4t-a95b:batch"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 2,
            output: 6,
            cacheRead: 0.25,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/deepseek/deepseek-v4-pro-0813:batch@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "deepseek/deepseek-v4-pro-0813:batch",
          aliases: [
            "deepseek/deepseek-v4-pro-0813:batch"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.66,
            output: 1.9800000000000002,
            cacheRead: 0.022,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/liquid/lfm-2.5-2.6b:free@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "liquid/lfm-2.5-2.6b:free",
          aliases: [
            "liquid/lfm-2.5-2.6b:free"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0,
            output: 0,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/nvidia/nemotron-3.5-lightning@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "nvidia/nemotron-3.5-lightning",
          aliases: [
            "nvidia/nemotron-3.5-lightning"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.08,
            output: 0.19999999999999998,
            cacheRead: 0.04,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/nvidia/nemotron-3.5-lightning:free@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "nvidia/nemotron-3.5-lightning:free",
          aliases: [
            "nvidia/nemotron-3.5-lightning:free"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0,
            output: 0,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/upstage/solar-pro4@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "upstage/solar-pro4",
          aliases: [
            "upstage/solar-pro4"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.09,
            output: 0.36,
            cacheRead: 0.018,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/meta/muse-glimmer-30b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "meta/muse-glimmer-30b",
          aliases: [
            "meta/muse-glimmer-30b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.35,
            output: 1.5,
            cacheRead: 0.04,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true,
          effectiveTo: "2026-09-17T16:58:48.650Z"
        },
        {
          id: "openrouter/meta/muse-glimmer-30b:batch@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "meta/muse-glimmer-30b:batch",
          aliases: [
            "meta/muse-glimmer-30b:batch"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.175,
            output: 0.75,
            cacheRead: 0.02,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/~deepseek/deepseek-v4-flash-latest@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "~deepseek/deepseek-v4-flash-latest",
          aliases: [
            "~deepseek/deepseek-v4-flash-latest"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.03,
            output: 0.13,
            cacheRead: 0.01,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/deepseek/deepseek-v4-flash-0731@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "deepseek/deepseek-v4-flash-0731",
          aliases: [
            "deepseek/deepseek-v4-flash-0731"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.06,
            output: 0.12,
            cacheRead: 0.012,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/deepseek/deepseek-v4-flash-0731:batch@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "deepseek/deepseek-v4-flash-0731:batch",
          aliases: [
            "deepseek/deepseek-v4-flash-0731:batch"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.11,
            output: 0.33,
            cacheRead: 35e-4,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/thinkingmachines/inkling-small@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "thinkingmachines/inkling-small",
          aliases: [
            "thinkingmachines/inkling-small"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.44999999999999996,
            output: 1.2,
            cacheRead: 0.09999999999999999,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/thinkingmachines/inkling-small:free@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "thinkingmachines/inkling-small:free",
          aliases: [
            "thinkingmachines/inkling-small:free"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0,
            output: 0,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/inclusionai/ling-3.0-flash@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "inclusionai/ling-3.0-flash",
          aliases: [
            "inclusionai/ling-3.0-flash"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.020999999999999998,
            output: 0.063,
            cacheRead: 0.004200000000000001,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/poolside/laguna-s-2.1@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "poolside/laguna-s-2.1",
          aliases: [
            "poolside/laguna-s-2.1"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.09,
            output: 0.18,
            cacheRead: 9e-3,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/poolside/laguna-s-2.1:free@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "poolside/laguna-s-2.1:free",
          aliases: [
            "poolside/laguna-s-2.1:free"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0,
            output: 0,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/meituan/longcat-2.0@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "meituan/longcat-2.0",
          aliases: [
            "meituan/longcat-2.0"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.3,
            output: 1.2,
            cacheRead: 6e-3,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/thinkingmachines/inkling@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "thinkingmachines/inkling",
          aliases: [
            "thinkingmachines/inkling"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 1,
            output: 4.05,
            cacheRead: 0.16999999999999998,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/thinkingmachines/inkling:batch@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "thinkingmachines/inkling:batch",
          aliases: [
            "thinkingmachines/inkling:batch"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 1,
            output: 4.05,
            cacheRead: 0.16999999999999998,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/thinkingmachines/inkling:free@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "thinkingmachines/inkling:free",
          aliases: [
            "thinkingmachines/inkling:free"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0,
            output: 0,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/moonshotai/kimi-k3:batch@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "moonshotai/kimi-k3:batch",
          aliases: [
            "moonshotai/kimi-k3:batch"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 3,
            output: 15,
            cacheRead: 0.3,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/kwaipilot/kat-coder-pro-v2.5@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "kwaipilot/kat-coder-pro-v2.5",
          aliases: [
            "kwaipilot/kat-coder-pro-v2.5"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.74,
            output: 2.96,
            cacheRead: 0.15,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/aion-labs/aion-3.0-mini@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "aion-labs/aion-3.0-mini",
          aliases: [
            "aion-labs/aion-3.0-mini"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.7,
            output: 1.4,
            cacheRead: 0.18,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/aion-labs/aion-3.0@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "aion-labs/aion-3.0",
          aliases: [
            "aion-labs/aion-3.0"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 3,
            output: 6,
            cacheRead: 0.75,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/poolside/laguna-xs-2.1@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "poolside/laguna-xs-2.1",
          aliases: [
            "poolside/laguna-xs-2.1"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.06,
            output: 0.12,
            cacheRead: 0.03,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/poolside/laguna-xs-2.1:free@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "poolside/laguna-xs-2.1:free",
          aliases: [
            "poolside/laguna-xs-2.1:free"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0,
            output: 0,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/cohere/north-mini-code:free@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "cohere/north-mini-code:free",
          aliases: [
            "cohere/north-mini-code:free"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0,
            output: 0,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/z-ai/glm-5.2:batch@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "z-ai/glm-5.2:batch",
          aliases: [
            "z-ai/glm-5.2:batch"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.7,
            output: 2.2,
            cacheRead: 0.07,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/z-ai/glm-5.2:free@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "z-ai/glm-5.2:free",
          aliases: [
            "z-ai/glm-5.2:free"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0,
            output: 0,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/moonshotai/kimi-k2.7-code@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "moonshotai/kimi-k2.7-code",
          aliases: [
            "moonshotai/kimi-k2.7-code"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.7062,
            output: 3.21,
            cacheRead: 0.18,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/nvidia/nemotron-3.5-content-safety@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "nvidia/nemotron-3.5-content-safety",
          aliases: [
            "nvidia/nemotron-3.5-content-safety"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.19999999999999998,
            output: 0.19999999999999998,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/nvidia/nemotron-3.5-content-safety:free@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "nvidia/nemotron-3.5-content-safety:free",
          aliases: [
            "nvidia/nemotron-3.5-content-safety:free"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0,
            output: 0,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/nvidia/nemotron-3-ultra-550b-a55b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "nvidia/nemotron-3-ultra-550b-a55b",
          aliases: [
            "nvidia/nemotron-3-ultra-550b-a55b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.625,
            output: 3.125,
            cacheRead: 0.1875,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "nvidia/nemotron-3-ultra-550b-a55b:free",
          aliases: [
            "nvidia/nemotron-3-ultra-550b-a55b:free"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0,
            output: 0,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/minimax/minimax-m3@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "minimax/minimax-m3",
          aliases: [
            "minimax/minimax-m3"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.3,
            output: 1.2,
            cacheRead: 0.06,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/minimax/minimax-m3:batch@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "minimax/minimax-m3:batch",
          aliases: [
            "minimax/minimax-m3:batch"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.3,
            output: 1.2,
            cacheRead: 0.06,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/stepfun/step-3.7-flash@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "stepfun/step-3.7-flash",
          aliases: [
            "stepfun/step-3.7-flash"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.19999999999999998,
            output: 1.15,
            cacheRead: 0.04,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3.7-max@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3.7-max",
          aliases: [
            "qwen/qwen3.7-max"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 1.475,
            output: 4.425,
            cacheRead: 0.295,
            cacheWrite: 1.84375
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/perceptron/perceptron-mk1@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "perceptron/perceptron-mk1",
          aliases: [
            "perceptron/perceptron-mk1"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.15,
            output: 1.5,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mistralai/mistral-medium-3-5@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mistralai/mistral-medium-3-5",
          aliases: [
            "mistralai/mistral-medium-3-5"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 1.5,
            output: 7.5,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mistralai/mistral-medium-3-5:batch@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mistralai/mistral-medium-3-5:batch",
          aliases: [
            "mistralai/mistral-medium-3-5:batch"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.75,
            output: 3.75,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
          aliases: [
            "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0,
            output: 0,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/~moonshotai/kimi-latest@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "~moonshotai/kimi-latest",
          aliases: [
            "~moonshotai/kimi-latest"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 2.0999999999999996,
            output: 10.950000000000001,
            cacheRead: 0.22999999999999998,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true,
          effectiveTo: "2026-09-17T16:58:48.650Z"
        },
        {
          id: "openrouter/qwen/qwen3.6-35b-a3b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3.6-35b-a3b",
          aliases: [
            "qwen/qwen3.6-35b-a3b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.09999999999999999,
            output: 0.8999999999999999,
            cacheRead: 0.049999999999999996,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3.6-27b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3.6-27b",
          aliases: [
            "qwen/qwen3.6-27b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.3,
            output: 2,
            cacheRead: 0.03,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/deepseek/deepseek-v4-pro@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "deepseek/deepseek-v4-pro",
          aliases: [
            "deepseek/deepseek-v4-pro"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 1.5999999999999999,
            output: 3.1999999999999997,
            cacheRead: 0.135,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/deepseek/deepseek-v4-flash@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "deepseek/deepseek-v4-flash",
          aliases: [
            "deepseek/deepseek-v4-flash"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.088606,
            output: 0.177212,
            cacheRead: 0.017721200000000003,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true,
          effectiveTo: "2026-09-17T16:58:48.650Z"
        },
        {
          id: "openrouter/tencent/hy3-preview@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "tencent/hy3-preview",
          aliases: [
            "tencent/hy3-preview"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.18,
            output: 0.6,
            cacheRead: 0.06,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/xiaomi/mimo-v2.5-pro@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "xiaomi/mimo-v2.5-pro",
          aliases: [
            "xiaomi/mimo-v2.5-pro"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.435,
            output: 0.87,
            cacheRead: 36e-4,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/xiaomi/mimo-v2.5@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "xiaomi/mimo-v2.5",
          aliases: [
            "xiaomi/mimo-v2.5"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.14,
            output: 0.28,
            cacheRead: 28e-4,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/moonshotai/kimi-k2.6@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "moonshotai/kimi-k2.6",
          aliases: [
            "moonshotai/kimi-k2.6"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.95,
            output: 4,
            cacheRead: 0.16,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/z-ai/glm-5.1@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "z-ai/glm-5.1",
          aliases: [
            "z-ai/glm-5.1"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.966,
            output: 3.036,
            cacheRead: 0.1794,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/google/gemma-4-26b-a4b-it@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "google/gemma-4-26b-a4b-it",
          aliases: [
            "google/gemma-4-26b-a4b-it"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.09,
            output: 0.3,
            cacheRead: 0.049999999999999996,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/google/gemma-4-26b-a4b-it:free@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "google/gemma-4-26b-a4b-it:free",
          aliases: [
            "google/gemma-4-26b-a4b-it:free"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0,
            output: 0,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/google/gemma-4-31b-it@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "google/gemma-4-31b-it",
          aliases: [
            "google/gemma-4-31b-it"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.09,
            output: 0.33999999999999997,
            cacheRead: 0.049999999999999996,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/google/gemma-4-31b-it:free@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "google/gemma-4-31b-it:free",
          aliases: [
            "google/gemma-4-31b-it:free"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0,
            output: 0,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/z-ai/glm-5v-turbo@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "z-ai/glm-5v-turbo",
          aliases: [
            "z-ai/glm-5v-turbo"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 1.2,
            output: 4,
            cacheRead: 0.24,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/arcee-ai/trinity-large-thinking@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "arcee-ai/trinity-large-thinking",
          aliases: [
            "arcee-ai/trinity-large-thinking"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.25,
            output: 0.7999999999999999,
            cacheRead: 0.06,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/kwaipilot/kat-coder-pro-v2@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "kwaipilot/kat-coder-pro-v2",
          aliases: [
            "kwaipilot/kat-coder-pro-v2"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.3,
            output: 1.2,
            cacheRead: 0.06,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/rekaai/reka-edge@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "rekaai/reka-edge",
          aliases: [
            "rekaai/reka-edge"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.09999999999999999,
            output: 0.09999999999999999,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/minimax/minimax-m2.7@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "minimax/minimax-m2.7",
          aliases: [
            "minimax/minimax-m2.7"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.3,
            output: 1.2,
            cacheRead: 0.06,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mistralai/mistral-small-2603@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mistralai/mistral-small-2603",
          aliases: [
            "mistralai/mistral-small-2603"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.15,
            output: 0.6,
            cacheRead: 0.015,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mistralai/mistral-small-2603:batch@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mistralai/mistral-small-2603:batch",
          aliases: [
            "mistralai/mistral-small-2603:batch"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.075,
            output: 0.3,
            cacheRead: 75e-4,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/z-ai/glm-5-turbo@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "z-ai/glm-5-turbo",
          aliases: [
            "z-ai/glm-5-turbo"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 1.2,
            output: 4,
            cacheRead: 0.24,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/nvidia/nemotron-3-super-120b-a12b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "nvidia/nemotron-3-super-120b-a12b",
          aliases: [
            "nvidia/nemotron-3-super-120b-a12b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.08,
            output: 0.44999999999999996,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/nvidia/nemotron-3-super-120b-a12b:free@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "nvidia/nemotron-3-super-120b-a12b:free",
          aliases: [
            "nvidia/nemotron-3-super-120b-a12b:free"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0,
            output: 0,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3.5-9b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3.5-9b",
          aliases: [
            "qwen/qwen3.5-9b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.09999999999999999,
            output: 0.15,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3.5-9b:batch@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3.5-9b:batch",
          aliases: [
            "qwen/qwen3.5-9b:batch"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.16999999999999998,
            output: 0.25,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/inception/mercury-2@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "inception/mercury-2",
          aliases: [
            "inception/mercury-2"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.25,
            output: 0.75,
            cacheRead: 0.024999999999999998,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3.5-35b-a3b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3.5-35b-a3b",
          aliases: [
            "qwen/qwen3.5-35b-a3b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.1625,
            output: 1.3,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3.5-27b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3.5-27b",
          aliases: [
            "qwen/qwen3.5-27b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.195,
            output: 1.56,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3.5-122b-a10b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3.5-122b-a10b",
          aliases: [
            "qwen/qwen3.5-122b-a10b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.26,
            output: 2.08,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3.5-flash-02-23@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3.5-flash-02-23",
          aliases: [
            "qwen/qwen3.5-flash-02-23"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.065,
            output: 0.26,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/aion-labs/aion-2.0@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "aion-labs/aion-2.0",
          aliases: [
            "aion-labs/aion-2.0"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.7999999999999999,
            output: 1.5999999999999999,
            cacheRead: 0.19999999999999998,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3.5-397b-a17b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3.5-397b-a17b",
          aliases: [
            "qwen/qwen3.5-397b-a17b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.55,
            output: 3.5,
            cacheRead: 0.22499999999999998,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/minimax/minimax-m2.5@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "minimax/minimax-m2.5",
          aliases: [
            "minimax/minimax-m2.5"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.27,
            output: 1.08,
            cacheRead: 0.027,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/z-ai/glm-5@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "z-ai/glm-5",
          aliases: [
            "z-ai/glm-5"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.6,
            output: 1.92,
            cacheRead: 0.12,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3-coder-next@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3-coder-next",
          aliases: [
            "qwen/qwen3-coder-next"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.12,
            output: 0.7999999999999999,
            cacheRead: 0.07,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/openrouter/free@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "openrouter/free",
          aliases: [
            "openrouter/free"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0,
            output: 0,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/stepfun/step-3.5-flash@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "stepfun/step-3.5-flash",
          aliases: [
            "stepfun/step-3.5-flash"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.09999999999999999,
            output: 0.3,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/moonshotai/kimi-k2.5@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "moonshotai/kimi-k2.5",
          aliases: [
            "moonshotai/kimi-k2.5"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.44999999999999996,
            output: 2.25,
            cacheRead: 0.07,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/upstage/solar-pro-3@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "upstage/solar-pro-3",
          aliases: [
            "upstage/solar-pro-3"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.15,
            output: 0.6,
            cacheRead: 0.015,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/minimax/minimax-m2-her@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "minimax/minimax-m2-her",
          aliases: [
            "minimax/minimax-m2-her"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.3,
            output: 1.2,
            cacheRead: 0.03,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/writer/palmyra-x5@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "writer/palmyra-x5",
          aliases: [
            "writer/palmyra-x5"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.6,
            output: 6,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/z-ai/glm-4.7-flash@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "z-ai/glm-4.7-flash",
          aliases: [
            "z-ai/glm-4.7-flash"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.060500000000000005,
            output: 0.39999999999999997,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/minimax/minimax-m2.1@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "minimax/minimax-m2.1",
          aliases: [
            "minimax/minimax-m2.1"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.3,
            output: 1.2,
            cacheRead: 0.03,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/z-ai/glm-4.7@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "z-ai/glm-4.7",
          aliases: [
            "z-ai/glm-4.7"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.39999999999999997,
            output: 1.75,
            cacheRead: 0.08,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/nvidia/nemotron-3-nano-30b-a3b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "nvidia/nemotron-3-nano-30b-a3b",
          aliases: [
            "nvidia/nemotron-3-nano-30b-a3b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.06,
            output: 0.24,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mistralai/devstral-2512@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mistralai/devstral-2512",
          aliases: [
            "mistralai/devstral-2512"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.39999999999999997,
            output: 2,
            cacheRead: 0.04,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/relace/relace-search@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "relace/relace-search",
          aliases: [
            "relace/relace-search"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 1,
            output: 3,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/z-ai/glm-4.6v@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "z-ai/glm-4.6v",
          aliases: [
            "z-ai/glm-4.6v"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.3,
            output: 0.8999999999999999,
            cacheRead: 0.055,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/amazon/nova-2-lite-v1@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "amazon/nova-2-lite-v1",
          aliases: [
            "amazon/nova-2-lite-v1"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.3,
            output: 2.5,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mistralai/ministral-14b-2512@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mistralai/ministral-14b-2512",
          aliases: [
            "mistralai/ministral-14b-2512"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.19999999999999998,
            output: 0.19999999999999998,
            cacheRead: 0.02,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mistralai/ministral-8b-2512@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mistralai/ministral-8b-2512",
          aliases: [
            "mistralai/ministral-8b-2512"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.15,
            output: 0.15,
            cacheRead: 0.015,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mistralai/ministral-8b-2512:batch@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mistralai/ministral-8b-2512:batch",
          aliases: [
            "mistralai/ministral-8b-2512:batch"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.075,
            output: 0.075,
            cacheRead: 75e-4,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mistralai/ministral-3b-2512@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mistralai/ministral-3b-2512",
          aliases: [
            "mistralai/ministral-3b-2512"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.09999999999999999,
            output: 0.09999999999999999,
            cacheRead: 0.01,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mistralai/mistral-large-2512@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mistralai/mistral-large-2512",
          aliases: [
            "mistralai/mistral-large-2512"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.5,
            output: 1.5,
            cacheRead: 0.049999999999999996,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mistralai/mistral-large-2512:batch@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mistralai/mistral-large-2512:batch",
          aliases: [
            "mistralai/mistral-large-2512:batch"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.25,
            output: 0.75,
            cacheRead: 0.024999999999999998,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/deepseek/deepseek-v3.2@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "deepseek/deepseek-v3.2",
          aliases: [
            "deepseek/deepseek-v3.2"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.26899999999999996,
            output: 0.39999999999999997,
            cacheRead: 0.13449999999999998,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/moonshotai/kimi-k2-thinking@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "moonshotai/kimi-k2-thinking",
          aliases: [
            "moonshotai/kimi-k2-thinking"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.6,
            output: 2.5,
            cacheRead: 0.15,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/amazon/nova-premier-v1@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "amazon/nova-premier-v1",
          aliases: [
            "amazon/nova-premier-v1"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 2.5,
            output: 12.5,
            cacheRead: 0.625,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/openai/gpt-oss-safeguard-20b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "openai/gpt-oss-safeguard-20b",
          aliases: [
            "openai/gpt-oss-safeguard-20b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.075,
            output: 0.3,
            cacheRead: 0.0375,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/minimax/minimax-m2@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "minimax/minimax-m2",
          aliases: [
            "minimax/minimax-m2"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.255,
            output: 1.02,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3-vl-32b-instruct@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3-vl-32b-instruct",
          aliases: [
            "qwen/qwen3-vl-32b-instruct"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.10400000000000001,
            output: 0.41600000000000004,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/ibm-granite/granite-4.0-h-micro@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "ibm-granite/granite-4.0-h-micro",
          aliases: [
            "ibm-granite/granite-4.0-h-micro"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.017,
            output: 0.112,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3-vl-8b-thinking@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3-vl-8b-thinking",
          aliases: [
            "qwen/qwen3-vl-8b-thinking"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.18,
            output: 2.0999999999999996,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3-vl-8b-instruct@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3-vl-8b-instruct",
          aliases: [
            "qwen/qwen3-vl-8b-instruct"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.117,
            output: 0.45499999999999996,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3-vl-30b-a3b-thinking@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3-vl-30b-a3b-thinking",
          aliases: [
            "qwen/qwen3-vl-30b-a3b-thinking"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.19999999999999998,
            output: 2.4,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3-vl-30b-a3b-instruct@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3-vl-30b-a3b-instruct",
          aliases: [
            "qwen/qwen3-vl-30b-a3b-instruct"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.13,
            output: 0.52,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/z-ai/glm-4.6@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "z-ai/glm-4.6",
          aliases: [
            "z-ai/glm-4.6"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.5,
            output: 2,
            cacheRead: 0.09999999999999999,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true,
          effectiveTo: "2026-09-17T16:58:48.650Z"
        },
        {
          id: "openrouter/deepseek/deepseek-v3.2-exp@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "deepseek/deepseek-v3.2-exp",
          aliases: [
            "deepseek/deepseek-v3.2-exp"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.27,
            output: 0.41,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/thedrummer/cydonia-24b-v4.1@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "thedrummer/cydonia-24b-v4.1",
          aliases: [
            "thedrummer/cydonia-24b-v4.1"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.3,
            output: 0.5,
            cacheRead: 0.15,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/relace/relace-apply-3@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "relace/relace-apply-3",
          aliases: [
            "relace/relace-apply-3"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.85,
            output: 1.25,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3-vl-235b-a22b-thinking@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3-vl-235b-a22b-thinking",
          aliases: [
            "qwen/qwen3-vl-235b-a22b-thinking"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.39999999999999997,
            output: 4,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3-vl-235b-a22b-instruct@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3-vl-235b-a22b-instruct",
          aliases: [
            "qwen/qwen3-vl-235b-a22b-instruct"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.21,
            output: 1.9,
            cacheRead: 0.09999999999999999,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/deepseek/deepseek-v3.1-terminus@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "deepseek/deepseek-v3.1-terminus",
          aliases: [
            "deepseek/deepseek-v3.1-terminus"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.27,
            output: 1,
            cacheRead: 0.135,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3-next-80b-a3b-thinking@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3-next-80b-a3b-thinking",
          aliases: [
            "qwen/qwen3-next-80b-a3b-thinking"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.15,
            output: 1.2,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3-next-80b-a3b-instruct@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3-next-80b-a3b-instruct",
          aliases: [
            "qwen/qwen3-next-80b-a3b-instruct"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.09,
            output: 1.1,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/moonshotai/kimi-k2-0905@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "moonshotai/kimi-k2-0905",
          aliases: [
            "moonshotai/kimi-k2-0905"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.6,
            output: 2.5,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3-30b-a3b-thinking-2507@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3-30b-a3b-thinking-2507",
          aliases: [
            "qwen/qwen3-30b-a3b-thinking-2507"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.19999999999999998,
            output: 2.4,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/nousresearch/hermes-4-405b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "nousresearch/hermes-4-405b",
          aliases: [
            "nousresearch/hermes-4-405b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 1,
            output: 3,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/deepseek/deepseek-chat-v3.1@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "deepseek/deepseek-chat-v3.1",
          aliases: [
            "deepseek/deepseek-chat-v3.1"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.25,
            output: 0.95,
            cacheRead: 0.13,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mistralai/mistral-medium-3.1@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mistralai/mistral-medium-3.1",
          aliases: [
            "mistralai/mistral-medium-3.1"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.39999999999999997,
            output: 2,
            cacheRead: 0.04,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mistralai/mistral-medium-3.1:batch@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mistralai/mistral-medium-3.1:batch",
          aliases: [
            "mistralai/mistral-medium-3.1:batch"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.19999999999999998,
            output: 1,
            cacheRead: 0.02,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/z-ai/glm-4.5v@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "z-ai/glm-4.5v",
          aliases: [
            "z-ai/glm-4.5v"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.6,
            output: 1.7999999999999998,
            cacheRead: 0.11,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/openai/gpt-oss-120b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "openai/gpt-oss-120b",
          aliases: [
            "openai/gpt-oss-120b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.037,
            output: 0.16999999999999998,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/openai/gpt-oss-120b:batch@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "openai/gpt-oss-120b:batch",
          aliases: [
            "openai/gpt-oss-120b:batch"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.15,
            output: 0.6,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/openai/gpt-oss-20b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "openai/gpt-oss-20b",
          aliases: [
            "openai/gpt-oss-20b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.03,
            output: 0.13,
            cacheRead: 0.03,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mistralai/codestral-2508@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mistralai/codestral-2508",
          aliases: [
            "mistralai/codestral-2508"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.3,
            output: 0.8999999999999999,
            cacheRead: 0.03,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mistralai/codestral-2508:batch@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mistralai/codestral-2508:batch",
          aliases: [
            "mistralai/codestral-2508:batch"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.15,
            output: 0.44999999999999996,
            cacheRead: 0.015,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3-coder-30b-a3b-instruct@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3-coder-30b-a3b-instruct",
          aliases: [
            "qwen/qwen3-coder-30b-a3b-instruct"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.07,
            output: 0.28,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3-30b-a3b-instruct-2507@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3-30b-a3b-instruct-2507",
          aliases: [
            "qwen/qwen3-30b-a3b-instruct-2507"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.04815,
            output: 0.19305,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/z-ai/glm-4.5@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "z-ai/glm-4.5",
          aliases: [
            "z-ai/glm-4.5"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.6,
            output: 2.2,
            cacheRead: 0.11,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/z-ai/glm-4.5-air@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "z-ai/glm-4.5-air",
          aliases: [
            "z-ai/glm-4.5-air"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.13,
            output: 0.85,
            cacheRead: 0.024999999999999998,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3-235b-a22b-thinking-2507@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3-235b-a22b-thinking-2507",
          aliases: [
            "qwen/qwen3-235b-a22b-thinking-2507"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.22999999999999998,
            output: 2.3,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3-coder@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3-coder",
          aliases: [
            "qwen/qwen3-coder"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.3,
            output: 1,
            cacheRead: 0.09999999999999999,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/bytedance/ui-tars-1.5-7b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "bytedance/ui-tars-1.5-7b",
          aliases: [
            "bytedance/ui-tars-1.5-7b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.09999999999999999,
            output: 0.19999999999999998,
            cacheRead: 0.09999999999999999,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3-235b-a22b-2507@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3-235b-a22b-2507",
          aliases: [
            "qwen/qwen3-235b-a22b-2507"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.0875,
            output: 0.35,
            cacheRead: 0.0175,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/moonshotai/kimi-k2@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "moonshotai/kimi-k2",
          aliases: [
            "moonshotai/kimi-k2"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.5700000000000001,
            output: 2.3,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/cognitivecomputations/dolphin-mistral-24b-venice-edition@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "cognitivecomputations/dolphin-mistral-24b-venice-edition",
          aliases: [
            "cognitivecomputations/dolphin-mistral-24b-venice-edition"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.19999999999999998,
            output: 0.8999999999999999,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/tencent/hunyuan-a13b-instruct@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "tencent/hunyuan-a13b-instruct",
          aliases: [
            "tencent/hunyuan-a13b-instruct"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.14,
            output: 0.5700000000000001,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/morph/morph-v3-large@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "morph/morph-v3-large",
          aliases: [
            "morph/morph-v3-large"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.8999999999999999,
            output: 1.9,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/morph/morph-v3-fast@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "morph/morph-v3-fast",
          aliases: [
            "morph/morph-v3-fast"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.7999999999999999,
            output: 1.2,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/baidu/ernie-4.5-vl-424b-a47b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "baidu/ernie-4.5-vl-424b-a47b",
          aliases: [
            "baidu/ernie-4.5-vl-424b-a47b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.42,
            output: 1.25,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mistralai/mistral-small-3.2-24b-instruct@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mistralai/mistral-small-3.2-24b-instruct",
          aliases: [
            "mistralai/mistral-small-3.2-24b-instruct"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.09375,
            output: 0.25,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/minimax/minimax-m1@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "minimax/minimax-m1",
          aliases: [
            "minimax/minimax-m1"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.39999999999999997,
            output: 2.2,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/deepseek/deepseek-r1-0528@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "deepseek/deepseek-r1-0528",
          aliases: [
            "deepseek/deepseek-r1-0528"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.5,
            output: 2.1500000000000004,
            cacheRead: 0.35,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mistralai/mistral-medium-3@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mistralai/mistral-medium-3",
          aliases: [
            "mistralai/mistral-medium-3"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.39999999999999997,
            output: 2,
            cacheRead: 0.04,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/meta-llama/llama-guard-4-12b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "meta-llama/llama-guard-4-12b",
          aliases: [
            "meta-llama/llama-guard-4-12b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.18,
            output: 0.18,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3-30b-a3b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3-30b-a3b",
          aliases: [
            "qwen/qwen3-30b-a3b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.12,
            output: 0.5,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3-8b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3-8b",
          aliases: [
            "qwen/qwen3-8b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.117,
            output: 0.45499999999999996,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3-14b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3-14b",
          aliases: [
            "qwen/qwen3-14b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.12,
            output: 0.24,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3-32b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3-32b",
          aliases: [
            "qwen/qwen3-32b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.08,
            output: 0.28,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen3-235b-a22b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen3-235b-a22b",
          aliases: [
            "qwen/qwen3-235b-a22b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.45499999999999996,
            output: 1.8199999999999998,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/meta-llama/llama-4-maverick@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "meta-llama/llama-4-maverick",
          aliases: [
            "meta-llama/llama-4-maverick"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.1875,
            output: 0.6525,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/meta-llama/llama-4-scout@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "meta-llama/llama-4-scout",
          aliases: [
            "meta-llama/llama-4-scout"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.09999999999999999,
            output: 0.3,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/deepseek/deepseek-chat-v3-0324@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "deepseek/deepseek-chat-v3-0324",
          aliases: [
            "deepseek/deepseek-chat-v3-0324"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.25,
            output: 1,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mistralai/mistral-small-3.1-24b-instruct@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mistralai/mistral-small-3.1-24b-instruct",
          aliases: [
            "mistralai/mistral-small-3.1-24b-instruct"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.351,
            output: 0.5549999999999999,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/google/gemma-3-4b-it@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "google/gemma-3-4b-it",
          aliases: [
            "google/gemma-3-4b-it"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.049999999999999996,
            output: 0.09999999999999999,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/google/gemma-3-12b-it@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "google/gemma-3-12b-it",
          aliases: [
            "google/gemma-3-12b-it"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.049999999999999996,
            output: 0.15,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/cohere/command-a@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "cohere/command-a",
          aliases: [
            "cohere/command-a"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 2.5,
            output: 10,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/rekaai/reka-flash-3@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "rekaai/reka-flash-3",
          aliases: [
            "rekaai/reka-flash-3"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.09999999999999999,
            output: 0.19999999999999998,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/google/gemma-3-27b-it@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "google/gemma-3-27b-it",
          aliases: [
            "google/gemma-3-27b-it"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.08,
            output: 0.44999999999999996,
            cacheRead: 0.04,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/thedrummer/skyfall-36b-v2@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "thedrummer/skyfall-36b-v2",
          aliases: [
            "thedrummer/skyfall-36b-v2"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.55,
            output: 0.7999999999999999,
            cacheRead: 0.25,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mistralai/mistral-saba@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mistralai/mistral-saba",
          aliases: [
            "mistralai/mistral-saba"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.19999999999999998,
            output: 0.6,
            cacheRead: 0.02,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/aion-labs/aion-rp-llama-3.1-8b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "aion-labs/aion-rp-llama-3.1-8b",
          aliases: [
            "aion-labs/aion-rp-llama-3.1-8b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.7999999999999999,
            output: 1.5999999999999999,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen2.5-vl-72b-instruct@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen2.5-vl-72b-instruct",
          aliases: [
            "qwen/qwen2.5-vl-72b-instruct"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.7999999999999999,
            output: 1,
            cacheRead: 0.39999999999999997,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mistralai/mistral-small-24b-instruct-2501@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mistralai/mistral-small-24b-instruct-2501",
          aliases: [
            "mistralai/mistral-small-24b-instruct-2501"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.049999999999999996,
            output: 0.08,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/deepseek/deepseek-r1-distill-llama-70b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "deepseek/deepseek-r1-distill-llama-70b",
          aliases: [
            "deepseek/deepseek-r1-distill-llama-70b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.7999999999999999,
            output: 0.7999999999999999,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/deepseek/deepseek-r1@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "deepseek/deepseek-r1",
          aliases: [
            "deepseek/deepseek-r1"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.7,
            output: 2.5,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/minimax/minimax-01@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "minimax/minimax-01",
          aliases: [
            "minimax/minimax-01"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.19999999999999998,
            output: 1.1,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/microsoft/phi-4@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "microsoft/phi-4",
          aliases: [
            "microsoft/phi-4"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.07,
            output: 0.14,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/deepseek/deepseek-chat@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "deepseek/deepseek-chat",
          aliases: [
            "deepseek/deepseek-chat"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.2574,
            output: 1.0287,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true,
          effectiveTo: "2026-09-17T21:20:40.511Z"
        },
        {
          id: "openrouter/sao10k/l3.3-euryale-70b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "sao10k/l3.3-euryale-70b",
          aliases: [
            "sao10k/l3.3-euryale-70b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.65,
            output: 0.75,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/cohere/command-r7b-12-2024@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "cohere/command-r7b-12-2024",
          aliases: [
            "cohere/command-r7b-12-2024"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.0375,
            output: 0.15,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/meta-llama/llama-3.3-70b-instruct@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "meta-llama/llama-3.3-70b-instruct",
          aliases: [
            "meta-llama/llama-3.3-70b-instruct"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.09999999999999999,
            output: 0.32,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/amazon/nova-lite-v1@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "amazon/nova-lite-v1",
          aliases: [
            "amazon/nova-lite-v1"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.06,
            output: 0.24,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/amazon/nova-micro-v1@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "amazon/nova-micro-v1",
          aliases: [
            "amazon/nova-micro-v1"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.035,
            output: 0.14,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/amazon/nova-pro-v1@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "amazon/nova-pro-v1",
          aliases: [
            "amazon/nova-pro-v1"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.7999999999999999,
            output: 3.1999999999999997,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/openai/gpt-4o-2024-11-20@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "openai/gpt-4o-2024-11-20",
          aliases: [
            "openai/gpt-4o-2024-11-20"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 2.5,
            output: 10,
            cacheRead: 1.25,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mistralai/mistral-large-2407@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mistralai/mistral-large-2407",
          aliases: [
            "mistralai/mistral-large-2407"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 2,
            output: 6,
            cacheRead: 0.19999999999999998,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen-2.5-coder-32b-instruct@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen-2.5-coder-32b-instruct",
          aliases: [
            "qwen/qwen-2.5-coder-32b-instruct"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.66,
            output: 1,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/thedrummer/unslopnemo-12b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "thedrummer/unslopnemo-12b",
          aliases: [
            "thedrummer/unslopnemo-12b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.39999999999999997,
            output: 0.39999999999999997,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/anthracite-org/magnum-v4-72b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "anthracite-org/magnum-v4-72b",
          aliases: [
            "anthracite-org/magnum-v4-72b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 2.5,
            output: 5,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen-2.5-7b-instruct@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen-2.5-7b-instruct",
          aliases: [
            "qwen/qwen-2.5-7b-instruct"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.09999999999999999,
            output: 0.19999999999999998,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/meta-llama/llama-3.2-1b-instruct@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "meta-llama/llama-3.2-1b-instruct",
          aliases: [
            "meta-llama/llama-3.2-1b-instruct"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.027,
            output: 0.201,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/meta-llama/llama-3.2-3b-instruct@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "meta-llama/llama-3.2-3b-instruct",
          aliases: [
            "meta-llama/llama-3.2-3b-instruct"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.049999999999999996,
            output: 0.33,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/qwen/qwen-2.5-72b-instruct@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "qwen/qwen-2.5-72b-instruct",
          aliases: [
            "qwen/qwen-2.5-72b-instruct"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.36,
            output: 0.39999999999999997,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/cohere/command-r-08-2024@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "cohere/command-r-08-2024",
          aliases: [
            "cohere/command-r-08-2024"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.15,
            output: 0.6,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/cohere/command-r-plus-08-2024@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "cohere/command-r-plus-08-2024",
          aliases: [
            "cohere/command-r-plus-08-2024"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 2.5,
            output: 10,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/sao10k/l3.1-euryale-70b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "sao10k/l3.1-euryale-70b",
          aliases: [
            "sao10k/l3.1-euryale-70b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.85,
            output: 0.85,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/nousresearch/hermes-3-llama-3.1-70b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "nousresearch/hermes-3-llama-3.1-70b",
          aliases: [
            "nousresearch/hermes-3-llama-3.1-70b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.7,
            output: 0.7,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/nousresearch/hermes-3-llama-3.1-405b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "nousresearch/hermes-3-llama-3.1-405b",
          aliases: [
            "nousresearch/hermes-3-llama-3.1-405b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 1,
            output: 1,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/sao10k/l3-lunaris-8b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "sao10k/l3-lunaris-8b",
          aliases: [
            "sao10k/l3-lunaris-8b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.04,
            output: 0.049999999999999996,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/openai/gpt-4o-2024-08-06@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "openai/gpt-4o-2024-08-06",
          aliases: [
            "openai/gpt-4o-2024-08-06"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 2.5,
            output: 10,
            cacheRead: 1.25,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/meta-llama/llama-3.1-70b-instruct@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "meta-llama/llama-3.1-70b-instruct",
          aliases: [
            "meta-llama/llama-3.1-70b-instruct"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.39999999999999997,
            output: 0.39999999999999997,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/meta-llama/llama-3.1-8b-instruct@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "meta-llama/llama-3.1-8b-instruct",
          aliases: [
            "meta-llama/llama-3.1-8b-instruct"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.049999999999999996,
            output: 0.08,
            cacheRead: 0.024999999999999998,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mistralai/mistral-nemo@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mistralai/mistral-nemo",
          aliases: [
            "mistralai/mistral-nemo"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.019000000000000003,
            output: 0.03,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/openai/gpt-4o-mini@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "openai/gpt-4o-mini",
          aliases: [
            "openai/gpt-4o-mini"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.15,
            output: 0.6,
            cacheRead: 0.075,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/openai/gpt-4o-mini-2024-07-18@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "openai/gpt-4o-mini-2024-07-18",
          aliases: [
            "openai/gpt-4o-mini-2024-07-18"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.15,
            output: 0.6,
            cacheRead: 0.075,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/google/gemma-2-27b-it@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "google/gemma-2-27b-it",
          aliases: [
            "google/gemma-2-27b-it"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.65,
            output: 0.65,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/openai/gpt-4o@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "openai/gpt-4o",
          aliases: [
            "openai/gpt-4o"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 2.5,
            output: 10,
            cacheRead: 1.25,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/openai/gpt-4o-2024-05-13@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "openai/gpt-4o-2024-05-13",
          aliases: [
            "openai/gpt-4o-2024-05-13"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 5,
            output: 15,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mistralai/mixtral-8x22b-instruct@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mistralai/mixtral-8x22b-instruct",
          aliases: [
            "mistralai/mixtral-8x22b-instruct"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 2,
            output: 6,
            cacheRead: 0.19999999999999998,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/microsoft/wizardlm-2-8x22b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "microsoft/wizardlm-2-8x22b",
          aliases: [
            "microsoft/wizardlm-2-8x22b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.62,
            output: 0.62,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/openai/gpt-4-turbo@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "openai/gpt-4-turbo",
          aliases: [
            "openai/gpt-4-turbo"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 10,
            output: 30,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mistralai/mistral-large@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mistralai/mistral-large",
          aliases: [
            "mistralai/mistral-large"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 2,
            output: 6,
            cacheRead: 0.19999999999999998,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/openai/gpt-3.5-turbo-0613@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "openai/gpt-3.5-turbo-0613",
          aliases: [
            "openai/gpt-3.5-turbo-0613"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 1,
            output: 2,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/openai/gpt-3.5-turbo-instruct@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "openai/gpt-3.5-turbo-instruct",
          aliases: [
            "openai/gpt-3.5-turbo-instruct"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 1.5,
            output: 2,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/openai/gpt-3.5-turbo-16k@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "openai/gpt-3.5-turbo-16k",
          aliases: [
            "openai/gpt-3.5-turbo-16k"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 3,
            output: 4,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/mancer/weaver@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "mancer/weaver",
          aliases: [
            "mancer/weaver"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.39999999999999997,
            output: 0.75,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/undi95/remm-slerp-l2-13b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "undi95/remm-slerp-l2-13b",
          aliases: [
            "undi95/remm-slerp-l2-13b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.35,
            output: 0.65,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/gryphe/mythomax-l2-13b@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "gryphe/mythomax-l2-13b",
          aliases: [
            "gryphe/mythomax-l2-13b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.08,
            output: 0.11,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/openai/gpt-3.5-turbo@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "openai/gpt-3.5-turbo",
          aliases: [
            "openai/gpt-3.5-turbo"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 0.5,
            output: 1.5,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/openai/gpt-4@2026-09-17T08:46:53.180Z",
          family: "openrouter",
          canonical: "openai/gpt-4",
          aliases: [
            "openai/gpt-4"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T08:46:53.180Z",
          rates: {
            uncached: 30,
            output: 60,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/~deepseek/deepseek-pro-latest@2026-09-17T16:58:48.650Z",
          family: "openrouter",
          canonical: "~deepseek/deepseek-pro-latest",
          aliases: [
            "~deepseek/deepseek-pro-latest"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T16:58:48.650Z",
          rates: {
            uncached: 0.57948,
            output: 1.73844,
            cacheRead: 0.018438,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true,
          effectiveFrom: "2026-09-17T16:58:48.650Z"
        },
        {
          id: "openrouter/deepseek/deepseek-v4-pro-0813@2026-09-17T16:58:48.650Z",
          family: "openrouter",
          canonical: "deepseek/deepseek-v4-pro-0813",
          aliases: [
            "deepseek/deepseek-v4-pro-0813"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T16:58:48.650Z",
          rates: {
            uncached: 0.57948,
            output: 1.73844,
            cacheRead: 0.018438,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/meta/muse-glimmer-30b@2026-09-17T16:58:48.650Z",
          family: "openrouter",
          canonical: "meta/muse-glimmer-30b",
          aliases: [
            "meta/muse-glimmer-30b"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T16:58:48.650Z",
          rates: {
            uncached: 0.3,
            output: 1.1,
            cacheRead: 0.04,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true,
          effectiveFrom: "2026-09-17T16:58:48.650Z"
        },
        {
          id: "openrouter/~moonshotai/kimi-latest@2026-09-17T16:58:48.650Z",
          family: "openrouter",
          canonical: "~moonshotai/kimi-latest",
          aliases: [
            "~moonshotai/kimi-latest"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T16:58:48.650Z",
          rates: {
            uncached: 1.875,
            output: 10.5,
            cacheRead: 0.2175,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true,
          effectiveFrom: "2026-09-17T16:58:48.650Z",
          effectiveTo: "2026-09-17T21:20:40.511Z"
        },
        {
          id: "openrouter/deepseek/deepseek-v4-flash@2026-09-17T16:58:48.650Z",
          family: "openrouter",
          canonical: "deepseek/deepseek-v4-flash",
          aliases: [
            "deepseek/deepseek-v4-flash"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T16:58:48.650Z",
          rates: {
            uncached: 0.07,
            output: 0.14,
            cacheRead: 0.014,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true,
          effectiveFrom: "2026-09-17T16:58:48.650Z"
        },
        {
          id: "openrouter/z-ai/glm-4.6@2026-09-17T16:58:48.650Z",
          family: "openrouter",
          canonical: "z-ai/glm-4.6",
          aliases: [
            "z-ai/glm-4.6"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T16:58:48.650Z",
          rates: {
            uncached: 0.43,
            output: 1.75,
            cacheRead: 0.08,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true,
          effectiveFrom: "2026-09-17T16:58:48.650Z"
        },
        {
          id: "openrouter/qwen/qwen3.8-27b:free@2026-09-17T21:20:40.511Z",
          family: "openrouter",
          canonical: "qwen/qwen3.8-27b:free",
          aliases: [
            "qwen/qwen3.8-27b:free"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T21:20:40.511Z",
          rates: {
            uncached: 0,
            output: 0,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true
        },
        {
          id: "openrouter/~moonshotai/kimi-latest@2026-09-17T21:20:40.511Z",
          family: "openrouter",
          canonical: "~moonshotai/kimi-latest",
          aliases: [
            "~moonshotai/kimi-latest"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T21:20:40.511Z",
          rates: {
            uncached: 2.0999999999999996,
            output: 10.950000000000001,
            cacheRead: 0.22999999999999998,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true,
          effectiveFrom: "2026-09-17T21:20:40.511Z"
        },
        {
          id: "openrouter/deepseek/deepseek-chat@2026-09-17T21:20:40.511Z",
          family: "openrouter",
          canonical: "deepseek/deepseek-chat",
          aliases: [
            "deepseek/deepseek-chat"
          ],
          currency: "USD",
          sourceUrl: "https://openrouter.ai/api/v1/models",
          retrievedAt: "2026-09-17",
          observedFrom: "2026-09-17T21:20:40.511Z",
          rates: {
            uncached: 0.32,
            output: 0.8899999999999999,
            cacheRead: null,
            cacheWrite: null
          },
          confidence: "estimated",
          reasoningIncludedInOutput: true,
          effectiveFrom: "2026-09-17T21:20:40.511Z"
        }
      ],
      fx: [
        {
          date: "2026-08-26",
          usdCny: 6.7205,
          sourceUrl: "https://api.frankfurter.app/2026-08-26?from=USD&to=CNY"
        }
      ]
    };
  }
});

// src/pricing-validation.cjs
var require_pricing_validation = __commonJS({
  "src/pricing-validation.cjs"(exports, module) {
    var FIELDS = ["uncached", "cacheRead", "cacheWrite", "output"];
    var TIERS = ["standard", "priority", "batch", "flex"];
    var RULE_KEYS = /* @__PURE__ */ new Set(["id", "family", "canonical", "aliases", "currency", "sourceUrl", "retrievedAt", "rates", "reasoningIncludedInOutput", "confidence", "legacy", "offPeak", "peak", "contextTiers", "contextThreshold", "serviceTiers", "tierMultipliers", "effectiveFrom", "effectiveTo", "observedFrom", "providerId", "accountType", "cacheWriteDurationUnknown", "cacheStorageUnknown", "cacheWritePriceUnknown", "note"]);
    function check(ok, label) {
      if (!ok) throw new TypeError("Invalid pricing: " + label);
    }
    function record(value) {
      return value !== null && typeof value === "object" && !Array.isArray(value);
    }
    function text(value, limit = 250) {
      return typeof value === "string" && value.length > 0 && value.length <= limit && !/[\x00-\x1f]/.test(value);
    }
    function timestamp(value) {
      return typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
    }
    function source(value) {
      try {
        const u = new URL(value);
        return u.protocol === "https:" && !u.username && !u.password && !u.search && !u.hash;
      } catch {
        return false;
      }
    }
    function rates(value) {
      check(record(value) && Object.keys(value).length === 4, "rates");
      for (const k of FIELDS) check(value[k] === null || Number.isFinite(value[k]) && value[k] >= 0 && value[k] <= 1e7, k);
    }
    function tiers(value) {
      check(record(value) && Object.keys(value).length === 2, "context tiers");
      rates(value.short);
      rates(value.long);
    }
    function rule(value, custom) {
      check(record(value) && Object.keys(value).every((k) => RULE_KEYS.has(k)), "rule fields");
      for (const k of ["id", "family", "canonical"]) check(text(value[k]), k);
      check(["CNY", "USD"].includes(value.currency), "currency");
      check(["exact", "estimated"].includes(value.confidence), "confidence");
      check(value.sourceUrl === null && custom || source(value.sourceUrl), "source URL");
      check(/^\d{4}-\d\d-\d\d$/.test(value.retrievedAt) && Number.isFinite(Date.parse(value.retrievedAt)), "retrieved date");
      check(Array.isArray(value.aliases) && value.aliases.length > 0 && value.aliases.length <= 30 && value.aliases.every((a) => text(a) && a === a.toLowerCase()) && value.aliases.includes(value.canonical.toLowerCase()), "aliases");
      check(value.reasoningIncludedInOutput === true, "reasoning billing semantics");
      if (custom || value.providerId !== void 0) check(text(value.providerId), "provider ID");
      if (value.accountType !== void 0) check(["api", "relay", "local"].includes(value.accountType), "account type");
      for (const k of ["effectiveFrom", "effectiveTo", "observedFrom"]) if (value[k] !== void 0) check(timestamp(value[k]), k);
      if (value.effectiveFrom && value.effectiveTo) check(Date.parse(value.effectiveFrom) < Date.parse(value.effectiveTo), "effective interval");
      for (const k of ["cacheWriteDurationUnknown", "cacheStorageUnknown", "cacheWritePriceUnknown"]) if (value[k] !== void 0) check(typeof value[k] === "boolean", k);
      if (value.note !== void 0) check(text(value.note, 1e3), "note");
      const modes = [value.rates != null, value.legacy != null, value.contextTiers != null, value.serviceTiers != null].filter(Boolean).length;
      check(modes === 1, "one rate mode required");
      if (value.rates != null) rates(value.rates);
      if (value.legacy) {
        check(value.family === "deepseek", "legacy family");
        rates(value.legacy);
        rates(value.peak);
        rates(value.offPeak);
      }
      if (value.contextTiers) {
        tiers(value.contextTiers);
        check(Number.isSafeInteger(value.contextThreshold) && value.contextThreshold > 0, "context threshold");
      }
      if (value.serviceTiers) {
        check(record(value.serviceTiers) && Object.keys(value.serviceTiers).every((k) => TIERS.includes(k)), "service tiers");
        for (const v of Object.values(value.serviceTiers)) tiers(v);
      }
      if (value.tierMultipliers) {
        check(record(value.tierMultipliers) && Object.keys(value.tierMultipliers).every((k) => TIERS.includes(k)), "multipliers");
        for (const v of Object.values(value.tierMultipliers)) check(Number.isFinite(v) && v > 0 && v <= 100, "multiplier");
      }
    }
    function freeze(value) {
      if (value && typeof value === "object" && !Object.isFrozen(value)) {
        Object.values(value).forEach(freeze);
        Object.freeze(value);
      }
      return value;
    }
    function rules(values, custom) {
      check(Array.isArray(values) && values.length <= (custom ? 500 : 2e4), "rule count");
      const ids = /* @__PURE__ */ new Set(), aliases = /* @__PURE__ */ new Map();
      for (const value of values) {
        rule(value, custom);
        check(!ids.has(value.id), "duplicate rule ID");
        ids.add(value.id);
        for (const alias of value.aliases) {
          const key = JSON.stringify([value.providerId || "family:" + value.family, alias]);
          const spans = aliases.get(key) || [];
          const from = value.effectiveFrom ? Date.parse(value.effectiveFrom) : -Infinity, to = value.effectiveTo ? Date.parse(value.effectiveTo) : Infinity;
          check(!spans.some(([a, b, account]) => from < b && a < to && (!account || !value.accountType || account === value.accountType)), "overlapping rules: " + alias);
          spans.push([from, to, value.accountType]);
          aliases.set(key, spans);
        }
      }
    }
    var validated = /* @__PURE__ */ new WeakSet();
    function validateCatalog(input) {
      if (validated.has(input)) return input;
      check(record(input) && Object.keys(input).every((k) => ["schemaVersion", "version", "publishedAt", "rules", "fx"].includes(k)), "catalog fields");
      check(input.schemaVersion === 1 && Number.isSafeInteger(input.version) && input.version > 0 && timestamp(input.publishedAt), "catalog version");
      rules(input.rules, false);
      check(Array.isArray(input.fx) && input.fx.length > 0 && input.fx.length <= 1e4, "FX entries");
      let previous = "";
      for (const fx of input.fx) {
        check(record(fx) && Object.keys(fx).every((k) => ["date", "usdCny", "sourceUrl"].includes(k)), "FX fields");
        check(/^\d{4}-\d\d-\d\d$/.test(fx.date) && Number.isFinite(Date.parse(fx.date)) && fx.date > previous, "FX date order");
        check(Number.isFinite(fx.usdCny) && fx.usdCny > 0 && fx.usdCny <= 100 && typeof fx.sourceUrl === "string" && (() => {
          try {
            const url = new URL(fx.sourceUrl);
            return url.protocol === "https:" && !url.username && !url.password && !url.hash;
          } catch {
            return false;
          }
        })(), "FX rate");
        previous = fx.date;
      }
      const result = freeze(JSON.parse(JSON.stringify(input)));
      validated.add(result);
      return result;
    }
    function validateOverrides(input) {
      rules(input, true);
      return freeze(JSON.parse(JSON.stringify(input)));
    }
    module.exports = { validateCatalog, validateOverrides };
  }
});

// src/pricing.cjs
var require_pricing = __commonJS({
  "src/pricing.cjs"(exports, module) {
    var BUILTIN = require_catalog();
    var { validateCatalog, validateOverrides } = require_pricing_validation();
    function createPricing(input = BUILTIN, customRules = []) {
      const catalog = validateCatalog(input);
      const overrides = validateOverrides(customRules);
      var MILLION = 1e6;
      var BEIJING_OFFSET_MS = 8 * 60 * 60 * 1e3;
      var DEEPSEEK_CHANGE_AT = Date.parse("2026-08-17T00:00:00+08:00");
      var OPENAI_LONG_CONTEXT = 272e3;
      var GEMINI_LONG_CONTEXT = 2e5;
      var RETRIEVED_AT = "2026-08-18";
      var OPENAI_RETRIEVED_AT = "2026-08-26";
      var DISPLAY_CURRENCY = "CNY";
      var USD_CNY_RATE = catalog.fx.at(-1).usdCny;
      var FX_RETRIEVED_AT = catalog.fx.at(-1).date;
      var FX_SOURCE = catalog.fx.at(-1).sourceUrl;
      var MODEL_FALLBACK_EXCLUDED_FAMILIES = /* @__PURE__ */ new Set(["openrouter"]);
      var SOURCES = {
        deepseek: "https://api-docs.deepseek.com/zh-cn/quick_start/pricing",
        minimax: "https://platform.minimaxi.com/docs/guides/pricing-paygo",
        openai: "https://developers.openai.com/api/docs/pricing",
        anthropic: "https://docs.anthropic.com/en/docs/about-claude/pricing",
        google: "https://ai.google.dev/gemini-api/docs/pricing",
        moonshot: "https://platform.kimi.com/docs/pricing/chat.md",
        zai: "https://docs.z.ai/guides/overview/pricing",
        openrouter: "https://openrouter.ai/api/v1/models"
      };
      var OFFICIAL_PROVIDER_IDS = {
        // These routes preserve DeepSeek's official API billing while exposing a
        // distinct provider id in DSH. Keep the allowlist explicit: model names alone
        // are insufficient for exact billing on an arbitrary relay.
        deepseek: /* @__PURE__ */ new Set(["deepseek", "deepseek-official", "deepseek-modlens", "nbdeepseek"]),
        minimax: /* @__PURE__ */ new Set(["minimax", "minimax-cn", "minimaxi", "minimax-global", "minimax-coding"]),
        openai: /* @__PURE__ */ new Set(["openai", "openai-official", "openai-codex"]),
        anthropic: /* @__PURE__ */ new Set(["anthropic", "anthropic-official", "claude"]),
        google: /* @__PURE__ */ new Set(["google", "google-gemini", "gemini", "google-ai"]),
        moonshot: /* @__PURE__ */ new Set(["moonshot", "moonshotai", "moonshotai-cn", "kimi", "kimi-api", "kimi-coding", "kimi-for-coding"]),
        zai: /* @__PURE__ */ new Set(["zai", "z-ai", "zai-coding", "zai-coding-cn", "zhipu", "bigmodel-cn"]),
        qwen: /* @__PURE__ */ new Set(["qwen", "dashscope", "aliyun-bailian"]),
        mistral: /* @__PURE__ */ new Set(["mistral", "mistral-official"]),
        openrouter: /* @__PURE__ */ new Set(["openrouter"])
      };
      function providerFamilyOf2(providerId) {
        var id = String(providerId || "unknown").trim().toLowerCase();
        for (var family of Object.keys(OFFICIAL_PROVIDER_IDS)) {
          if (OFFICIAL_PROVIDER_IDS[family].has(id)) return family;
        }
        return "unknown";
      }
      var RULES = catalog.rules;
      function ruleMatchesModel(rule, raw) {
        var model = String(raw || "").trim().toLowerCase();
        if (rule.aliases.indexOf(model) >= 0) return true;
        if (rule.family === "anthropic" && model.startsWith(rule.canonical.toLowerCase() + "-") && /^20[0-9]{6}$/.test(model.slice(rule.canonical.length + 1))) return true;
        return false;
      }
      function matchingRules(family, modelRaw, at, providerId, accountType) {
        var when = Number.isFinite(at) ? at : Date.now();
        return RULES.filter(function(rule) {
          if ((rule.providerId ? rule.providerId !== providerId : rule.family !== family) || !ruleMatchesModel(rule, modelRaw)) return false;
          if (rule.accountType && rule.accountType !== accountType) return false;
          if (rule.effectiveFrom && when < Date.parse(rule.effectiveFrom)) return false;
          if (rule.effectiveTo && when >= Date.parse(rule.effectiveTo)) return false;
          return true;
        });
      }
      function modelFallbackRules(modelRaw, at) {
        var when = Number.isFinite(at) ? at : Date.now();
        return RULES.filter(function(rule) {
          if (MODEL_FALLBACK_EXCLUDED_FAMILIES.has(rule.family) || rule.providerId || rule.confidence !== "exact" || !ruleMatchesModel(rule, modelRaw)) return false;
          if (rule.effectiveFrom && when < Date.parse(rule.effectiveFrom)) return false;
          if (rule.effectiveTo && when >= Date.parse(rule.effectiveTo)) return false;
          return true;
        });
      }
      function rulesForIdentity(family, modelRaw, at, providerId, accountType) {
        var custom = overrides.filter((rule) => rule.providerId === providerId && (!rule.accountType || rule.accountType === accountType) && ruleMatchesModel(rule, modelRaw) && (!rule.effectiveFrom || at >= Date.parse(rule.effectiveFrom)) && (!rule.effectiveTo || at < Date.parse(rule.effectiveTo)));
        if (custom.length) return { matches: custom, estimatedFallback: false, custom: true };
        var direct = matchingRules(family, modelRaw, at, providerId, accountType);
        if (direct.length > 0 || family !== "unknown") return { matches: direct, estimatedFallback: false };
        var fallback = modelFallbackRules(modelRaw, at);
        return { matches: fallback, estimatedFallback: fallback.length === 1 };
      }
      function normalizeAccountType2(value) {
        var type = String(value || "api").trim().toLowerCase().replace(/_/g, "-");
        if (["coding-plan", "subscription-plan", "paid-plan"].indexOf(type) >= 0) type = "token-plan";
        return ["api", "subscription", "token-plan", "relay", "local", "free", "unknown"].indexOf(type) >= 0 ? type : "unknown";
      }
      function normalizeIdentity2(providerId, modelRaw, accountType, at) {
        var provider = typeof providerId === "string" && providerId.trim() ? providerId.trim() : "unknown";
        var raw = typeof modelRaw === "string" && modelRaw.trim() ? modelRaw.trim() : "(unknown)";
        var family = providerFamilyOf2(provider);
        var matches = rulesForIdentity(family, raw, at, provider, normalizeAccountType2(accountType)).matches;
        return {
          providerId: provider,
          providerFamily: family,
          modelRaw: raw,
          modelCanonical: matches.length === 1 ? matches[0].canonical : raw,
          accountType: normalizeAccountType2(accountType),
          ambiguous: matches.length > 1
        };
      }
      function tokenCounts(usage) {
        function n(value) {
          return Number.isFinite(value) && value >= 0 ? value : 0;
        }
        return {
          uncached: n(usage && usage.uncached),
          cacheRead: n(usage && usage.cacheRead),
          cacheWrite: n(usage && usage.cacheWrite),
          output: n(usage && usage.output),
          reasoning: n(usage && usage.reasoning)
        };
      }
      function totalBillableTokens(tokens) {
        return tokens.uncached + tokens.cacheRead + tokens.cacheWrite + tokens.output;
      }
      function positiveRate(value) {
        return Number.isFinite(value) && value > 0 ? value : null;
      }
      function usdCnyRate(options) {
        var override = positiveRate(options && options.usdCnyRate);
        return override || USD_CNY_RATE;
      }
      function convertCostToCny2(cost, options) {
        if (!cost || typeof cost !== "object") return cost;
        var currency = typeof cost.currency === "string" ? cost.currency.toUpperCase() : "";
        if (currency === DISPLAY_CURRENCY) return { ...cost, currency: DISPLAY_CURRENCY };
        if (cost.amount == null || currency !== "USD") return { ...cost };
        var fxAt = cost.pricing?.pricedAt;
        var day = Number.isFinite(fxAt) ? new Date(fxAt).toISOString().slice(0, 10) : "9999-12-31";
        var fx = catalog.fx.filter((row) => row.date <= day).at(-1) || catalog.fx[0];
        var rate = positiveRate(options?.usdCnyRate) || fx.usdCny;
        if (!rate) return { ...cost };
        var convertedAmount = cost.amount * rate;
        return {
          ...cost,
          status: convertedAmount > 0 ? "estimated" : cost.status === "free" ? "free" : cost.status,
          currency: DISPLAY_CURRENCY,
          amount: convertedAmount,
          exactAmount: 0,
          estimatedAmount: convertedAmount,
          pricing: { ...cost.pricing, nativeAmount: cost.amount, nativeCurrency: "USD", fxRate: rate, fxDate: fx.date, fxSource: fx.sourceUrl }
        };
      }
      function convertCostSummaryToCny(summary, options) {
        if (!summary || !Array.isArray(summary.totals)) return summary;
        var totals = /* @__PURE__ */ new Map();
        var conversionFailures = 0;
        for (var total of summary.totals) {
          var converted = convertCostToCny2({
            status: (total.estimatedAmount || 0) > 0 ? "estimated" : "exact",
            amount: total.amount,
            currency: total.currency,
            exactAmount: total.exactAmount || 0,
            estimatedAmount: total.estimatedAmount || 0
          }, options);
          if (!converted || converted.currency !== DISPLAY_CURRENCY) {
            conversionFailures++;
            continue;
          }
          var row = totals.get(DISPLAY_CURRENCY) || { currency: DISPLAY_CURRENCY, amount: 0, exactAmount: 0, estimatedAmount: 0 };
          row.amount += converted.amount || 0;
          row.exactAmount += converted.exactAmount || 0;
          row.estimatedAmount += converted.estimatedAmount || 0;
          totals.set(DISPLAY_CURRENCY, row);
        }
        var status = summary.status;
        var unpricedTokens = Number.isFinite(summary.unpricedTokens) ? summary.unpricedTokens : 0;
        var unknownRows = (Number.isFinite(summary.unknownRows) ? summary.unknownRows : 0) + conversionFailures;
        if (conversionFailures > 0 || unknownRows > 0 || unpricedTokens > 0) status = totals.size > 0 ? "partial" : "unsupported";
        return {
          status,
          totals: Array.from(totals.values()),
          unpricedTokens,
          unknownRows
        };
      }
      function summarizeCostsCny2(costs, options) {
        return summarizeCosts((costs || []).map(function(cost) {
          return convertCostToCny2(cost, options);
        }));
      }
      function mergeCostSummariesCny2(summaries, options) {
        return mergeCostSummaries((summaries || []).map(function(summary) {
          return convertCostSummaryToCny(summary, options);
        }));
      }
      function deepSeekPeak(slot) {
        var t = slot * 30 * 60 * 1e3;
        var bj = new Date(t + BEIJING_OFFSET_MS);
        var minutes = bj.getUTCHours() * 60 + bj.getUTCMinutes();
        return minutes >= 9 * 60 && minutes < 12 * 60 || minutes >= 14 * 60 && minutes < 18 * 60;
      }
      function normalizeServiceTier(value) {
        if (value === "fast") return "priority";
        if (value == null || value === "auto" || value === "default") return "standard";
        return ["standard", "priority", "batch", "flex"].includes(value) ? value : "unknown";
      }
      function ratesFor(rule, usage, at) {
        var contextTokens = Number.isFinite(usage && usage.contextTokens) ? usage.contextTokens : usage && usage.contextOver512k === true ? 512001 : tokenCounts(usage).uncached + tokenCounts(usage).cacheRead + tokenCounts(usage).cacheWrite;
        if (rule.legacy) {
          var time = Number.isFinite(at) ? at : Number.isFinite(usage && usage.slot) ? usage.slot * 30 * 60 * 1e3 : Date.now();
          if (time < DEEPSEEK_CHANGE_AT) return rule.legacy;
          return deepSeekPeak(Number.isFinite(usage && usage.slot) ? usage.slot : Math.floor(time / (30 * 60 * 1e3))) ? rule.peak : rule.offPeak;
        }
        if (rule.serviceTiers) {
          var service = normalizeServiceTier(usage?.serviceTier);
          return rule.serviceTiers[service]?.[contextTokens > 512e3 ? "long" : "short"] || null;
        }
        if (rule.contextTiers) return rule.contextTiers[contextTokens > rule.contextThreshold ? "long" : "short"];
        return rule.rates;
      }
      function emptyCost(status, identity, tokens, extra) {
        return {
          status,
          amount: null,
          currency: null,
          exactAmount: 0,
          estimatedAmount: 0,
          unpricedTokens: totalBillableTokens(tokens),
          ruleId: null,
          sourceUrl: null,
          retrievedAt: null,
          providerId: identity.providerId,
          providerFamily: identity.providerFamily,
          modelCanonical: identity.modelCanonical,
          ...extra || {}
        };
      }
      function priceUsage2(usage, identityInput) {
        var at = Number.isFinite(usage?.time) ? usage.time : Number.isFinite(usage && usage.slot) ? usage.slot * 30 * 60 * 1e3 : Date.now();
        var identity = normalizeIdentity2(
          identityInput && identityInput.providerId || usage && usage.providerId,
          identityInput && identityInput.modelRaw || usage && (usage.modelRaw || usage.model),
          identityInput && identityInput.accountType || usage && usage.accountType,
          at
        );
        var tokens = tokenCounts(usage);
        var resolved = rulesForIdentity(identity.providerFamily, identity.modelRaw, at, identity.providerId, identity.accountType);
        if (identity.accountType === "free") {
          var freeMatches = resolved.matches;
          return { ...emptyCost("free", identity, tokens), amount: 0, currency: freeMatches.length === 1 ? freeMatches[0].currency : null, unpricedTokens: 0 };
        }
        if (identity.accountType === "subscription" || identity.accountType === "token-plan") {
          return emptyCost("subscription", identity, tokens);
        }
        if (identity.accountType === "unknown" || !resolved.custom && (identity.accountType === "relay" || identity.accountType === "local")) {
          return emptyCost("unsupported", identity, tokens);
        }
        if (identity.providerFamily === "unknown" && !resolved.estimatedFallback && !resolved.custom && !resolved.matches.some((rule2) => rule2.providerId === identity.providerId)) {
          return emptyCost(resolved.matches.length > 1 ? "ambiguous" : "unsupported", identity, tokens);
        }
        var matches = resolved.matches;
        if (matches.length > 1) return emptyCost("ambiguous", identity, tokens);
        if (matches.length === 0) return emptyCost("unsupported", identity, tokens);
        var rule = matches[0];
        var rates = ratesFor(rule, usage, at);
        var tier = normalizeServiceTier(usage?.serviceTier);
        if (tier === "unknown" || tier !== "standard" && !rule.tierMultipliers && !rule.serviceTiers) return emptyCost("unsupported", identity, tokens);
        if (rule.tierMultipliers) {
          var multiplier = rule.tierMultipliers[tier];
          if (!Number.isFinite(multiplier)) return emptyCost("unsupported", identity, tokens);
          if (rates) rates = Object.fromEntries(Object.entries(rates).map(([key, rate]) => [key, rate === null ? null : rate * multiplier]));
        }
        if (!rates) return emptyCost("unsupported", identity, tokens);
        var fields = ["uncached", "cacheRead", "cacheWrite", "output"];
        var missing = fields.filter((key) => rates[key] === null && tokens[key] > 0);
        var unpricedTokens = missing.reduce((total, key) => total + tokens[key], 0);
        var amount = fields.reduce((total, key) => total + (rates[key] === null ? 0 : tokens[key] * rates[key]), 0) / MILLION;
        if (unpricedTokens > 0 && fields.every((key) => rates[key] === null || tokens[key] === 0)) return emptyCost("unsupported", identity, tokens);
        if (!Number.isFinite(amount)) return emptyCost("unsupported", identity, tokens);
        var allZero = rates.uncached === 0 && rates.cacheRead === 0 && rates.cacheWrite === 0 && rates.output === 0;
        var uncertain = usage?.pricingIncomplete === true || resolved.estimatedFallback || rule.confidence === "estimated" || rule.observedFrom && at < Date.parse(rule.observedFrom) || rule.cacheWriteDurationUnknown && tokens.cacheWrite > 0 || rule.cacheStorageUnknown && tokens.cacheWrite > 0 || rule.cacheWritePriceUnknown && tokens.cacheWrite > 0;
        var status = unpricedTokens > 0 ? "partial" : allZero ? "free" : uncertain ? "estimated" : "exact";
        return {
          status,
          amount,
          currency: rule.currency,
          exactAmount: status === "exact" || status === "free" ? amount : 0,
          estimatedAmount: status === "estimated" || status === "partial" ? amount : 0,
          unpricedTokens,
          ruleId: rule.id,
          sourceUrl: rule.sourceUrl,
          retrievedAt: rule.retrievedAt,
          providerId: identity.providerId,
          providerFamily: identity.providerFamily,
          modelCanonical: rule.canonical,
          pricing: {
            catalogVersion: catalog.version,
            ruleRevision: rule.id,
            pricedAt: at,
            basis: resolved.custom ? "custom" : resolved.estimatedFallback ? "reference" : "provider",
            historicalEstimate: !!(rule.observedFrom && at < Date.parse(rule.observedFrom))
          }
        };
      }
      function emptyCostSummary() {
        return { status: "unsupported", totals: [], unpricedTokens: 0, unknownRows: 0 };
      }
      function summarizeCosts(costs) {
        var totals = /* @__PURE__ */ new Map();
        var unpricedTokens = 0;
        var unknownRows = 0;
        var pricedRows = 0;
        var estimatedRows = 0;
        var freeRows = 0;
        for (var cost of costs || []) {
          if (!cost || typeof cost !== "object") continue;
          if (cost.status === "free") freeRows++;
          unpricedTokens += Number.isFinite(cost.unpricedTokens) ? cost.unpricedTokens : 0;
          if (cost.amount == null || !cost.currency) {
            if ((cost.unpricedTokens || 0) > 0) unknownRows++;
            continue;
          }
          pricedRows++;
          if (cost.status === "estimated" && (cost.estimatedAmount || cost.amount || 0) > 0) estimatedRows++;
          var row = totals.get(cost.currency) || { currency: cost.currency, amount: 0, exactAmount: 0, estimatedAmount: 0 };
          row.amount += cost.amount;
          row.exactAmount += cost.exactAmount || 0;
          row.estimatedAmount += cost.estimatedAmount || 0;
          totals.set(cost.currency, row);
        }
        var status = "unsupported";
        if ((pricedRows > 0 || freeRows > 0) && (unknownRows > 0 || unpricedTokens > 0)) status = "partial";
        else if (pricedRows > 0 && estimatedRows > 0) status = "estimated";
        else if (freeRows > 0 && pricedRows === freeRows) status = "free";
        else if (pricedRows > 0) status = "exact";
        else if (freeRows > 0) status = "free";
        return { status, totals: Array.from(totals.values()).sort(function(a, b) {
          return a.currency.localeCompare(b.currency);
        }), unpricedTokens, unknownRows };
      }
      function mergeCostSummaries(summaries) {
        var pseudoCosts = [];
        for (var summary of summaries || []) {
          if (!summary) continue;
          for (var total of summary.totals || []) {
            pseudoCosts.push({
              status: summary.status === "free" ? "free" : total.estimatedAmount > 0 ? "estimated" : "exact",
              amount: total.amount,
              currency: total.currency,
              exactAmount: total.exactAmount,
              estimatedAmount: total.estimatedAmount,
              unpricedTokens: 0
            });
          }
          if ((summary.unpricedTokens || 0) > 0 || (summary.unknownRows || 0) > 0) {
            pseudoCosts.push({ status: "unsupported", amount: null, currency: null, exactAmount: 0, estimatedAmount: 0, unpricedTokens: summary.unpricedTokens || 0 });
          } else if (summary.status === "free" && !(summary.totals || []).length) {
            pseudoCosts.push({ status: "free", amount: 0, currency: null, exactAmount: 0, estimatedAmount: 0, unpricedTokens: 0 });
          }
        }
        var result = summarizeCosts(pseudoCosts);
        result.unknownRows = (summaries || []).reduce(function(sum, item) {
          return sum + (item && item.unknownRows || 0);
        }, 0);
        if (result.totals.length > 0 && result.unknownRows > 0) result.status = "partial";
        return result;
      }
      function pricingCatalog() {
        return RULES.map(function(rule) {
          return {
            ruleId: rule.id,
            providerFamily: rule.family,
            modelCanonical: rule.canonical,
            currency: rule.currency,
            status: rule.confidence === "estimated" ? "estimated" : "exact",
            sourceUrl: rule.sourceUrl,
            retrievedAt: rule.retrievedAt
          };
        });
      }
      return {
        catalog,
        SOURCES,
        RULES,
        DISPLAY_CURRENCY,
        USD_CNY_RATE,
        FX_RETRIEVED_AT,
        FX_SOURCE,
        providerFamilyOf: providerFamilyOf2,
        normalizeAccountType: normalizeAccountType2,
        normalizeServiceTier,
        normalizeIdentity: normalizeIdentity2,
        priceUsage: priceUsage2,
        summarizeCosts,
        mergeCostSummaries,
        convertCostToCny: convertCostToCny2,
        convertCostSummaryToCny,
        summarizeCostsCny: summarizeCostsCny2,
        mergeCostSummariesCny: mergeCostSummariesCny2,
        emptyCostSummary,
        pricingCatalog,
        tokenCounts
      };
    }
    module.exports = Object.assign(createPricing(), { createPricing, BUILTIN, validateCatalog, validateOverrides });
  }
});

// src/pricing-trust.cjs
var require_pricing_trust = __commonJS({
  "src/pricing-trust.cjs"(exports, module) {
    module.exports = {
      "url": "https://raw.githubusercontent.com/rongyishuaige7/dsh-stats/main/data/pricing/latest.json",
      "publicKey": "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA87uhNJ8heWOfx5beXSXaRYP8UuB86Ep4wQvp5xF6N9E=\n-----END PUBLIC KEY-----\n"
    };
  }
});

// src/route-data.cjs
var require_route_data = __commonJS({
  "src/route-data.cjs"(exports, module) {
    function hashKey(key) {
      let hash = 2166136261;
      for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
      return (hash >>> 0).toString(16).padStart(8, "0");
    }
    var rowCache = /* @__PURE__ */ new WeakMap();
    var identityCache = /* @__PURE__ */ new WeakMap();
    function compareRoutes(a, b) {
      if (a.slot !== b.slot) return a.slot - b.slot;
      for (const field of ["providerId", "model", "accountType", "serviceTier"]) {
        const left = String(a[field] ?? ""), right = String(b[field] ?? "");
        if (left !== right) return left < right ? -1 : 1;
      }
      return a.contextTokens - b.contextTokens;
    }
    function updateRoute(tree, key, update) {
      const hash = hashKey(key);
      let previous, replacement;
      function visit(node, depth) {
        const next2 = { ...node };
        if (depth === hash.length) {
          previous = node?.[key];
          const value = update(previous);
          replacement = value === null ? null : Object.freeze(value);
          if (value === null) delete next2[key];
          else next2[key] = value;
        } else {
          const child = visit(node?.[hash[depth]], depth + 1);
          if (Object.keys(child).length) next2[hash[depth]] = child;
          else delete next2[hash[depth]];
        }
        return Object.freeze(next2);
      }
      const next = visit(tree, 0);
      const cached = rowCache.get(tree);
      if (cached) {
        const rows = cached.slice();
        const index = previous === void 0 ? -1 : rows.indexOf(previous);
        if (index >= 0) {
          if (replacement === null) rows.splice(index, 1);
          else rows[index] = replacement;
        } else if (replacement !== null) {
          let low = 0, high = rows.length;
          while (low < high) {
            const mid = low + high >>> 1;
            if (compareRoutes(rows[mid], replacement) <= 0) low = mid + 1;
            else high = mid;
          }
          rows.splice(low, 0, replacement);
        }
        rowCache.set(next, rows);
      }
      return next;
    }
    function treeRows(tree, depth = 0) {
      if (!tree || typeof tree !== "object" || Array.isArray(tree)) throw new TypeError("invalid statsRoute index");
      if (depth === 8) return Object.values(tree);
      return Object.entries(tree).flatMap(([key, value]) => {
        if (!/^[0-9a-f]$/.test(key)) throw new TypeError("invalid statsRoute index key");
        return treeRows(value, depth + 1);
      });
    }
    function routeRows(route) {
      if (!route || typeof route !== "object") return [];
      if (route.routeTree !== void 0) {
        const tree = route.routeTree;
        if (!Object.isFrozen(tree)) return treeRows(tree).sort(compareRoutes);
        let rows = rowCache.get(tree);
        if (!rows) {
          rows = treeRows(tree).sort(compareRoutes);
          rowCache.set(tree, rows);
        }
        return rows.slice();
      }
      if (Array.isArray(route.routes)) return route.routes.slice();
      return route.routes && typeof route.routes === "object" ? Object.values(route.routes) : [];
    }
    function primaryRoute(rows, fallback = {}) {
      const totals = /* @__PURE__ */ new Map();
      let primary = fallback, weight = -1;
      for (const row of rows) {
        let key = identityCache.get(row);
        if (key === void 0) {
          key = JSON.stringify([row.providerId, row.model, row.accountType]);
          if (Object.isFrozen(row)) identityCache.set(row, key);
        }
        const total = (totals.get(key) || 0) + (row.uncached || 0) + (row.output || 0) + (row.cacheRead || 0) + (row.cacheWrite || 0);
        totals.set(key, total);
        if (total > weight) {
          primary = row;
          weight = total;
        }
      }
      return primary;
    }
    module.exports = { updateRoute, routeRows, primaryRoute };
  }
});

// src/index.js
var import_pricing3 = __toESM(require_pricing(), 1);
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { readFileSync as readFileSync2, readdirSync as readdirSync2, lstatSync, realpathSync, statSync as statSync2 } from "node:fs";
import { isAbsolute, join as join2, relative } from "node:path";
import { homedir } from "node:os";
import { zstdDecompressSync } from "node:zlib";

// src/pricing-store.js
var import_pricing = __toESM(require_pricing(), 1);
var import_pricing_trust = __toESM(require_pricing_trust(), 1);
import { readFileSync, writeFileSync, mkdirSync, renameSync, readdirSync, statSync, openSync, closeSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { verify, createHash, randomUUID } from "node:crypto";

// data/pricing/latest.json
var latest_default = { payload: '{\n  "schemaVersion": 1,\n  "version": 2026091704,\n  "publishedAt": "2026-09-17T21:20:40.511Z",\n  "rules": [\n    {\n      "id": "openai/gpt-6-astra@2026-09-17",\n      "family": "openai",\n      "canonical": "gpt-6-astra",\n      "aliases": [\n        "gpt-6-astra",\n        "openai/gpt-6-astra"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://developers.openai.com/api/docs/pricing",\n      "retrievedAt": "2026-09-17",\n      "rates": null,\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact",\n      "observedFrom": "2026-09-17T00:00:00Z",\n      "contextTiers": {\n        "short": {\n          "cacheRead": 1,\n          "uncached": 10,\n          "cacheWrite": 12.5,\n          "output": 50\n        },\n        "long": {\n          "cacheRead": 2,\n          "uncached": 20,\n          "cacheWrite": 25,\n          "output": 75\n        }\n      },\n      "contextThreshold": 272000,\n      "tierMultipliers": {\n        "standard": 1,\n        "priority": 2,\n        "batch": 0.5,\n        "flex": 0.5\n      }\n    },\n    {\n      "id": "deepseek/deepseek-v4-pro@2026-08-18",\n      "family": "deepseek",\n      "canonical": "deepseek-v4-pro",\n      "aliases": [\n        "deepseek-v4-pro"\n      ],\n      "currency": "CNY",\n      "sourceUrl": "https://api-docs.deepseek.com/zh-cn/quick_start/pricing",\n      "retrievedAt": "2026-08-18",\n      "rates": null,\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact",\n      "legacy": {\n        "cacheRead": 0.025,\n        "uncached": 3,\n        "cacheWrite": 3,\n        "output": 6\n      },\n      "offPeak": {\n        "cacheRead": 0.15,\n        "uncached": 4.5,\n        "cacheWrite": 4.5,\n        "output": 13.5\n      },\n      "peak": {\n        "cacheRead": 0.3,\n        "uncached": 9,\n        "cacheWrite": 9,\n        "output": 27\n      }\n    },\n    {\n      "id": "deepseek/deepseek-v4-flash@2026-08-18",\n      "family": "deepseek",\n      "canonical": "deepseek-v4-flash",\n      "aliases": [\n        "deepseek-v4-flash"\n      ],\n      "currency": "CNY",\n      "sourceUrl": "https://api-docs.deepseek.com/zh-cn/quick_start/pricing",\n      "retrievedAt": "2026-08-18",\n      "rates": null,\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact",\n      "legacy": {\n        "cacheRead": 0.02,\n        "uncached": 1,\n        "cacheWrite": 1,\n        "output": 2\n      },\n      "offPeak": {\n        "cacheRead": 0.05,\n        "uncached": 1.5,\n        "cacheWrite": 1.5,\n        "output": 4.5\n      },\n      "peak": {\n        "cacheRead": 0.1,\n        "uncached": 3,\n        "cacheWrite": 3,\n        "output": 9\n      }\n    },\n    {\n      "id": "minimax/MiniMax-M3@2026-08-18",\n      "family": "minimax",\n      "canonical": "MiniMax-M3",\n      "aliases": [\n        "minimax-m3"\n      ],\n      "currency": "CNY",\n      "sourceUrl": "https://platform.minimaxi.com/docs/guides/pricing-paygo",\n      "retrievedAt": "2026-08-18",\n      "rates": null,\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact",\n      "serviceTiers": {\n        "standard": {\n          "short": {\n            "cacheRead": 0.42,\n            "uncached": 2.1,\n            "cacheWrite": 2.1,\n            "output": 8.4\n          },\n          "long": {\n            "cacheRead": 0.84,\n            "uncached": 4.2,\n            "cacheWrite": 4.2,\n            "output": 16.8\n          }\n        },\n        "priority": {\n          "short": {\n            "cacheRead": 0.63,\n            "uncached": 3.15,\n            "cacheWrite": 3.15,\n            "output": 12.6\n          },\n          "long": {\n            "cacheRead": 1.26,\n            "uncached": 6.3,\n            "cacheWrite": 6.3,\n            "output": 25.2\n          }\n        }\n      }\n    },\n    {\n      "id": "minimax/MiniMax-M2.7@2026-08-18",\n      "family": "minimax",\n      "canonical": "MiniMax-M2.7",\n      "aliases": [\n        "minimax-m2.7"\n      ],\n      "currency": "CNY",\n      "sourceUrl": "https://platform.minimaxi.com/docs/guides/pricing-paygo",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 0.42,\n        "uncached": 2.1,\n        "cacheWrite": 2.625,\n        "output": 8.4\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact"\n    },\n    {\n      "id": "minimax/MiniMax-M2.7-highspeed@2026-08-18",\n      "family": "minimax",\n      "canonical": "MiniMax-M2.7-highspeed",\n      "aliases": [\n        "minimax-m2.7-highspeed"\n      ],\n      "currency": "CNY",\n      "sourceUrl": "https://platform.minimaxi.com/docs/guides/pricing-paygo",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 0.42,\n        "uncached": 4.2,\n        "cacheWrite": 2.625,\n        "output": 16.8\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact"\n    },\n    {\n      "id": "openai/gpt-5.6-sol@2026-08-26",\n      "family": "openai",\n      "canonical": "gpt-5.6-sol",\n      "aliases": [\n        "gpt-5.6-sol",\n        "openai/gpt-5.6-sol",\n        "daybreak-blue-latest"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://developers.openai.com/api/docs/pricing",\n      "retrievedAt": "2026-08-26",\n      "rates": null,\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact",\n      "contextTiers": {\n        "short": {\n          "cacheRead": 0.4,\n          "uncached": 4,\n          "cacheWrite": 5,\n          "output": 20\n        },\n        "long": {\n          "cacheRead": 0.8,\n          "uncached": 8,\n          "cacheWrite": 10,\n          "output": 30\n        }\n      },\n      "contextThreshold": 272000\n    },\n    {\n      "id": "openai/gpt-5.6-terra@2026-08-26",\n      "family": "openai",\n      "canonical": "gpt-5.6-terra",\n      "aliases": [\n        "gpt-5.6-terra",\n        "openai/gpt-5.6-terra"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://developers.openai.com/api/docs/pricing",\n      "retrievedAt": "2026-08-26",\n      "rates": null,\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact",\n      "contextTiers": {\n        "short": {\n          "cacheRead": 0.2,\n          "uncached": 2,\n          "cacheWrite": 2.5,\n          "output": 12\n        },\n        "long": {\n          "cacheRead": 0.4,\n          "uncached": 4,\n          "cacheWrite": 5,\n          "output": 18\n        }\n      },\n      "contextThreshold": 272000\n    },\n    {\n      "id": "openai/gpt-5.6-luna@2026-08-26",\n      "family": "openai",\n      "canonical": "gpt-5.6-luna",\n      "aliases": [\n        "gpt-5.6-luna",\n        "openai/gpt-5.6-luna"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://developers.openai.com/api/docs/pricing",\n      "retrievedAt": "2026-08-26",\n      "rates": null,\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact",\n      "contextTiers": {\n        "short": {\n          "cacheRead": 0.02,\n          "uncached": 0.2,\n          "cacheWrite": 0.25,\n          "output": 1.2\n        },\n        "long": {\n          "cacheRead": 0.04,\n          "uncached": 0.4,\n          "cacheWrite": 0.5,\n          "output": 1.8\n        }\n      },\n      "contextThreshold": 272000\n    },\n    {\n      "id": "openai/gpt-5.4@2026-08-26",\n      "family": "openai",\n      "canonical": "gpt-5.4",\n      "aliases": [\n        "gpt-5.4",\n        "openai/gpt-5.4"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://developers.openai.com/api/docs/pricing",\n      "retrievedAt": "2026-08-26",\n      "rates": null,\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact",\n      "contextTiers": {\n        "short": {\n          "cacheRead": 0.25,\n          "uncached": 2.5,\n          "cacheWrite": 2.5,\n          "output": 15\n        },\n        "long": {\n          "cacheRead": 0.5,\n          "uncached": 5,\n          "cacheWrite": 5,\n          "output": 30\n        }\n      },\n      "contextThreshold": 272000,\n      "cacheWritePriceUnknown": true\n    },\n    {\n      "id": "openai/gpt-5.4-mini@2026-08-26",\n      "family": "openai",\n      "canonical": "gpt-5.4-mini",\n      "aliases": [\n        "gpt-5.4-mini",\n        "openai/gpt-5.4-mini"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://developers.openai.com/api/docs/pricing",\n      "retrievedAt": "2026-08-26",\n      "rates": null,\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact",\n      "contextTiers": {\n        "short": {\n          "cacheRead": 0.075,\n          "uncached": 0.75,\n          "cacheWrite": 0.75,\n          "output": 4.5\n        },\n        "long": {\n          "cacheRead": 0.15,\n          "uncached": 1.5,\n          "cacheWrite": 1.5,\n          "output": 9\n        }\n      },\n      "contextThreshold": 272000,\n      "cacheWritePriceUnknown": true\n    },\n    {\n      "id": "openai/gpt-5.6-cyber@2026-08-26",\n      "family": "openai",\n      "canonical": "gpt-5.6-cyber",\n      "aliases": [\n        "gpt-5.6-cyber",\n        "openai/gpt-5.6-cyber",\n        "daybreak-red-latest"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://developers.openai.com/api/docs/pricing",\n      "retrievedAt": "2026-08-26",\n      "rates": {\n        "cacheRead": 1.25,\n        "uncached": 12.5,\n        "cacheWrite": 15.625,\n        "output": 75\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact"\n    },\n    {\n      "id": "anthropic/claude-opus-5@2026-08-18",\n      "family": "anthropic",\n      "canonical": "claude-opus-5",\n      "aliases": [\n        "claude-opus-5",\n        "anthropic/claude-opus-5"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://docs.anthropic.com/en/docs/about-claude/pricing",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 0.5,\n        "uncached": 5,\n        "cacheWrite": 6.25,\n        "output": 25\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact",\n      "cacheWriteDurationUnknown": true\n    },\n    {\n      "id": "anthropic/claude-sonnet-5@2026-08-18",\n      "family": "anthropic",\n      "canonical": "claude-sonnet-5",\n      "aliases": [\n        "claude-sonnet-5",\n        "anthropic/claude-sonnet-5"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://docs.anthropic.com/en/docs/about-claude/pricing",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 0.2,\n        "uncached": 2,\n        "cacheWrite": 2.5,\n        "output": 10\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact",\n      "cacheWriteDurationUnknown": true\n    },\n    {\n      "id": "anthropic/claude-sonnet-4-6@2026-08-18",\n      "family": "anthropic",\n      "canonical": "claude-sonnet-4-6",\n      "aliases": [\n        "claude-sonnet-4-6",\n        "claude-sonnet-4.6",\n        "anthropic/claude-sonnet-4.6",\n        "anthropic/claude-sonnet-4-6"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://docs.anthropic.com/en/docs/about-claude/pricing",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 0.3,\n        "uncached": 3,\n        "cacheWrite": 3.75,\n        "output": 15\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact",\n      "cacheWriteDurationUnknown": true\n    },\n    {\n      "id": "anthropic/claude-haiku-4-5@2026-08-18",\n      "family": "anthropic",\n      "canonical": "claude-haiku-4-5",\n      "aliases": [\n        "claude-haiku-4-5",\n        "claude-haiku-4.5",\n        "anthropic/claude-haiku-4.5",\n        "anthropic/claude-haiku-4-5"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://docs.anthropic.com/en/docs/about-claude/pricing",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 0.1,\n        "uncached": 1,\n        "cacheWrite": 1.25,\n        "output": 5\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact",\n      "cacheWriteDurationUnknown": true\n    },\n    {\n      "id": "google/gemini-3.7-flash@2026-08-18",\n      "family": "google",\n      "canonical": "gemini-3.7-flash",\n      "aliases": [\n        "gemini-3.7-flash",\n        "google/gemini-3.7-flash"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://ai.google.dev/gemini-api/docs/pricing",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 0.075,\n        "uncached": 0.75,\n        "cacheWrite": 0.75,\n        "output": 3.75\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact",\n      "effectiveTo": "2026-12-31T23:59:59.999Z",\n      "cacheStorageUnknown": true\n    },\n    {\n      "id": "google/gemini-3.1-pro-preview@2026-08-18",\n      "family": "google",\n      "canonical": "gemini-3.1-pro-preview",\n      "aliases": [\n        "gemini-3.1-pro-preview",\n        "gemini-3.1-pro-preview-customtools",\n        "google/gemini-3.1-pro-preview"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://ai.google.dev/gemini-api/docs/pricing",\n      "retrievedAt": "2026-08-18",\n      "rates": null,\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact",\n      "contextTiers": {\n        "short": {\n          "cacheRead": 0.2,\n          "uncached": 2,\n          "cacheWrite": 2,\n          "output": 12\n        },\n        "long": {\n          "cacheRead": 0.4,\n          "uncached": 4,\n          "cacheWrite": 4,\n          "output": 18\n        }\n      },\n      "contextThreshold": 200000,\n      "cacheStorageUnknown": true\n    },\n    {\n      "id": "google/gemini-2.5-pro@2026-08-18",\n      "family": "google",\n      "canonical": "gemini-2.5-pro",\n      "aliases": [\n        "gemini-2.5-pro",\n        "google/gemini-2.5-pro"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://ai.google.dev/gemini-api/docs/pricing",\n      "retrievedAt": "2026-08-18",\n      "rates": null,\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact",\n      "contextTiers": {\n        "short": {\n          "cacheRead": 0.125,\n          "uncached": 1.25,\n          "cacheWrite": 1.25,\n          "output": 10\n        },\n        "long": {\n          "cacheRead": 0.25,\n          "uncached": 2.5,\n          "cacheWrite": 2.5,\n          "output": 15\n        }\n      },\n      "contextThreshold": 200000,\n      "cacheStorageUnknown": true\n    },\n    {\n      "id": "google/gemini-2.5-flash@2026-08-18",\n      "family": "google",\n      "canonical": "gemini-2.5-flash",\n      "aliases": [\n        "gemini-2.5-flash",\n        "google/gemini-2.5-flash"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://ai.google.dev/gemini-api/docs/pricing",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 0.03,\n        "uncached": 0.3,\n        "cacheWrite": 0.3,\n        "output": 2.5\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact",\n      "cacheStorageUnknown": true\n    },\n    {\n      "id": "moonshot/kimi-k3@2026-08-18",\n      "family": "moonshot",\n      "canonical": "kimi-k3",\n      "aliases": [\n        "kimi-k3",\n        "moonshotai/kimi-k3"\n      ],\n      "currency": "CNY",\n      "sourceUrl": "https://platform.kimi.com/docs/pricing/chat.md",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 2,\n        "uncached": 20,\n        "cacheWrite": 20,\n        "output": 100\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact"\n    },\n    {\n      "id": "moonshot/kimi-k2.7-code@2026-08-18",\n      "family": "moonshot",\n      "canonical": "kimi-k2.7-code",\n      "aliases": [\n        "kimi-k2.7-code",\n        "moonshotai/kimi-k2.7-code"\n      ],\n      "currency": "CNY",\n      "sourceUrl": "https://platform.kimi.com/docs/pricing/chat.md",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 1.3,\n        "uncached": 6.5,\n        "cacheWrite": 6.5,\n        "output": 27\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact"\n    },\n    {\n      "id": "moonshot/kimi-k2.7-code-highspeed@2026-08-18",\n      "family": "moonshot",\n      "canonical": "kimi-k2.7-code-highspeed",\n      "aliases": [\n        "kimi-k2.7-code-highspeed",\n        "moonshotai/kimi-k2.7-code-highspeed"\n      ],\n      "currency": "CNY",\n      "sourceUrl": "https://platform.kimi.com/docs/pricing/chat.md",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 2.6,\n        "uncached": 13,\n        "cacheWrite": 13,\n        "output": 54\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact"\n    },\n    {\n      "id": "moonshot/kimi-k2.6@2026-08-18",\n      "family": "moonshot",\n      "canonical": "kimi-k2.6",\n      "aliases": [\n        "kimi-k2.6",\n        "moonshotai/kimi-k2.6"\n      ],\n      "currency": "CNY",\n      "sourceUrl": "https://platform.kimi.com/docs/pricing/chat.md",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 1.1,\n        "uncached": 6.5,\n        "cacheWrite": 6.5,\n        "output": 27\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact"\n    },\n    {\n      "id": "zai/glm-5.2@2026-08-18",\n      "family": "zai",\n      "canonical": "glm-5.2",\n      "aliases": [\n        "glm-5.2",\n        "z-ai/glm-5.2"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://docs.z.ai/guides/overview/pricing",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 0.26,\n        "uncached": 1.4,\n        "cacheWrite": 1.4,\n        "output": 4.4\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact"\n    },\n    {\n      "id": "zai/glm-5.1@2026-08-18",\n      "family": "zai",\n      "canonical": "glm-5.1",\n      "aliases": [\n        "glm-5.1",\n        "z-ai/glm-5.1"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://docs.z.ai/guides/overview/pricing",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 0.26,\n        "uncached": 1.4,\n        "cacheWrite": 1.4,\n        "output": 4.4\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact"\n    },\n    {\n      "id": "zai/glm-5@2026-08-18",\n      "family": "zai",\n      "canonical": "glm-5",\n      "aliases": [\n        "glm-5",\n        "z-ai/glm-5"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://docs.z.ai/guides/overview/pricing",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 0.2,\n        "uncached": 1,\n        "cacheWrite": 1,\n        "output": 3.2\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact"\n    },\n    {\n      "id": "zai/glm-5-turbo@2026-08-18",\n      "family": "zai",\n      "canonical": "glm-5-turbo",\n      "aliases": [\n        "glm-5-turbo",\n        "z-ai/glm-5-turbo"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://docs.z.ai/guides/overview/pricing",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 0.24,\n        "uncached": 1.2,\n        "cacheWrite": 1.2,\n        "output": 4\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact"\n    },\n    {\n      "id": "zai/glm-4.7@2026-08-18",\n      "family": "zai",\n      "canonical": "glm-4.7",\n      "aliases": [\n        "glm-4.7",\n        "z-ai/glm-4.7"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://docs.z.ai/guides/overview/pricing",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 0.11,\n        "uncached": 0.6,\n        "cacheWrite": 0.6,\n        "output": 2.2\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact"\n    },\n    {\n      "id": "zai/glm-4.7-flashx@2026-08-18",\n      "family": "zai",\n      "canonical": "glm-4.7-flashx",\n      "aliases": [\n        "glm-4.7-flashx",\n        "z-ai/glm-4.7-flashx"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://docs.z.ai/guides/overview/pricing",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 0.01,\n        "uncached": 0.07,\n        "cacheWrite": 0.07,\n        "output": 0.4\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact"\n    },\n    {\n      "id": "zai/glm-4.7-flash@2026-08-18",\n      "family": "zai",\n      "canonical": "glm-4.7-flash",\n      "aliases": [\n        "glm-4.7-flash",\n        "z-ai/glm-4.7-flash"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://docs.z.ai/guides/overview/pricing",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 0,\n        "uncached": 0,\n        "cacheWrite": 0,\n        "output": 0\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "exact"\n    },\n    {\n      "id": "openrouter/openai/gpt-5.6-sol@2026-08-18",\n      "family": "openrouter",\n      "canonical": "openai/gpt-5.6-sol",\n      "aliases": [\n        "openai/gpt-5.6-sol"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 0.25,\n        "uncached": 2.5,\n        "cacheWrite": 3.125,\n        "output": 15\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "estimated"\n    },\n    {\n      "id": "openrouter/openai/gpt-5.6-terra@2026-08-18",\n      "family": "openrouter",\n      "canonical": "openai/gpt-5.6-terra",\n      "aliases": [\n        "openai/gpt-5.6-terra"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 0.2,\n        "uncached": 2,\n        "cacheWrite": 2.5,\n        "output": 12\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "estimated"\n    },\n    {\n      "id": "openrouter/openai/gpt-5.6-luna@2026-08-18",\n      "family": "openrouter",\n      "canonical": "openai/gpt-5.6-luna",\n      "aliases": [\n        "openai/gpt-5.6-luna"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 0.02,\n        "uncached": 0.2,\n        "cacheWrite": 0.25,\n        "output": 1.2\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "estimated"\n    },\n    {\n      "id": "openrouter/anthropic/claude-opus-5@2026-08-18",\n      "family": "openrouter",\n      "canonical": "anthropic/claude-opus-5",\n      "aliases": [\n        "anthropic/claude-opus-5"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 0.5,\n        "uncached": 5,\n        "cacheWrite": 6.25,\n        "output": 25\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "estimated"\n    },\n    {\n      "id": "openrouter/anthropic/claude-sonnet-5@2026-08-18",\n      "family": "openrouter",\n      "canonical": "anthropic/claude-sonnet-5",\n      "aliases": [\n        "anthropic/claude-sonnet-5"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 0.2,\n        "uncached": 2,\n        "cacheWrite": 2.5,\n        "output": 10\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "estimated"\n    },\n    {\n      "id": "openrouter/google/gemini-3.7-flash@2026-08-18",\n      "family": "openrouter",\n      "canonical": "google/gemini-3.7-flash",\n      "aliases": [\n        "google/gemini-3.7-flash"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 0.0375,\n        "uncached": 0.375,\n        "cacheWrite": 0.0208333333333333,\n        "output": 1.875\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "estimated"\n    },\n    {\n      "id": "openrouter/moonshotai/kimi-k3@2026-08-18",\n      "family": "openrouter",\n      "canonical": "moonshotai/kimi-k3",\n      "aliases": [\n        "moonshotai/kimi-k3"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 0.3,\n        "uncached": 3,\n        "cacheWrite": 3,\n        "output": 15\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "estimated"\n    },\n    {\n      "id": "openrouter/z-ai/glm-5.2@2026-08-18",\n      "family": "openrouter",\n      "canonical": "z-ai/glm-5.2",\n      "aliases": [\n        "z-ai/glm-5.2"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-08-18",\n      "rates": {\n        "cacheRead": 0.115,\n        "uncached": 0.5,\n        "cacheWrite": 0.5,\n        "output": 3.15\n      },\n      "reasoningIncludedInOutput": true,\n      "confidence": "estimated"\n    },\n    {\n      "id": "openrouter/stealth/union-alpha@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "stealth/union-alpha",\n      "aliases": [\n        "stealth/union-alpha"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0,\n        "output": 0,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/~deepseek/deepseek-pro-latest@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "~deepseek/deepseek-pro-latest",\n      "aliases": [\n        "~deepseek/deepseek-pro-latest"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.7,\n        "output": 2.96,\n        "cacheRead": 0.032999999999999995,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true,\n      "effectiveTo": "2026-09-17T16:58:48.650Z"\n    },\n    {\n      "id": "openrouter/~deepseek/deepseek-flash-latest@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "~deepseek/deepseek-flash-latest",\n      "aliases": [\n        "~deepseek/deepseek-flash-latest"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.15,\n        "output": 0.6,\n        "cacheRead": 0.015,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/inference-net/schematron-v2-turbo@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "inference-net/schematron-v2-turbo",\n      "aliases": [\n        "inference-net/schematron-v2-turbo"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.03,\n        "output": 0.15,\n        "cacheRead": 0.03,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/inference-net/schematron-v2-small@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "inference-net/schematron-v2-small",\n      "aliases": [\n        "inference-net/schematron-v2-small"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.049999999999999996,\n        "output": 0.22999999999999998,\n        "cacheRead": 0.049999999999999996,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/inclusionai/ling-3.0-flash-vl@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "inclusionai/ling-3.0-flash-vl",\n      "aliases": [\n        "inclusionai/ling-3.0-flash-vl"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.06,\n        "output": 0.18,\n        "cacheRead": 0.012,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/inclusionai/ling-3.0-flash-vl:free@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "inclusionai/ling-3.0-flash-vl:free",\n      "aliases": [\n        "inclusionai/ling-3.0-flash-vl:free"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0,\n        "output": 0,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/inception/mercury-2.5@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "inception/mercury-2.5",\n      "aliases": [\n        "inception/mercury-2.5"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.04,\n        "output": 0.15,\n        "cacheRead": 0.004,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/nex-agi/nex-n2.5-mini:free@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "nex-agi/nex-n2.5-mini:free",\n      "aliases": [\n        "nex-agi/nex-n2.5-mini:free"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0,\n        "output": 0,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/nex-agi/nex-n2.5-pro:free@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "nex-agi/nex-n2.5-pro:free",\n      "aliases": [\n        "nex-agi/nex-n2.5-pro:free"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0,\n        "output": 0,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/inclusionai/ling-3.0-flash-sante:free@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "inclusionai/ling-3.0-flash-sante:free",\n      "aliases": [\n        "inclusionai/ling-3.0-flash-sante:free"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0,\n        "output": 0,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3.8-max-0902@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3.8-max-0902",\n      "aliases": [\n        "qwen/qwen3.8-max-0902"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 2,\n        "output": 6,\n        "cacheRead": 0.25,\n        "cacheWrite": 2.5\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/ibm-granite/granite-4.2-8b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "ibm-granite/granite-4.2-8b",\n      "aliases": [\n        "ibm-granite/granite-4.2-8b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.06,\n        "output": 0.25,\n        "cacheRead": 0.015,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/tencent/hy4-preview@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "tencent/hy4-preview",\n      "aliases": [\n        "tencent/hy4-preview"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.834,\n        "output": 2.501,\n        "cacheRead": 0.041999999999999996,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/inclusionai/ling-3.0-flash-fin@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "inclusionai/ling-3.0-flash-fin",\n      "aliases": [\n        "inclusionai/ling-3.0-flash-fin"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.06,\n        "output": 0.18,\n        "cacheRead": 0.012,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/inclusionai/ling-3.0-flash-fin:free@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "inclusionai/ling-3.0-flash-fin:free",\n      "aliases": [\n        "inclusionai/ling-3.0-flash-fin:free"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0,\n        "output": 0,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/~z-ai/glm-flash-latest@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "~z-ai/glm-flash-latest",\n      "aliases": [\n        "~z-ai/glm-flash-latest"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.075,\n        "output": 0.25,\n        "cacheRead": 0.015,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3.8-flash@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3.8-flash",\n      "aliases": [\n        "qwen/qwen3.8-flash"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.15,\n        "output": 0.47,\n        "cacheRead": 0.016,\n        "cacheWrite": 0.19999999999999998\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/z-ai/glm-5.3-flash@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "z-ai/glm-5.3-flash",\n      "aliases": [\n        "z-ai/glm-5.3-flash"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.09,\n        "output": 0.3,\n        "cacheRead": 0.018,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/z-ai/glm-5.3-flash:batch@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "z-ai/glm-5.3-flash:batch",\n      "aliases": [\n        "z-ai/glm-5.3-flash:batch"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.075,\n        "output": 0.25,\n        "cacheRead": 0.015,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/deepseek/deepseek-v4-flash-vision-exp@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "deepseek/deepseek-v4-flash-vision-exp",\n      "aliases": [\n        "deepseek/deepseek-v4-flash-vision-exp"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.22,\n        "output": 0.66,\n        "cacheRead": 0.007,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/deepseek/deepseek-v4-flash-vision-exp:batch@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "deepseek/deepseek-v4-flash-vision-exp:batch",\n      "aliases": [\n        "deepseek/deepseek-v4-flash-vision-exp:batch"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.11,\n        "output": 0.33,\n        "cacheRead": 0.0035,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/tencent/hy-mt2-1.8b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "tencent/hy-mt2-1.8b",\n      "aliases": [\n        "tencent/hy-mt2-1.8b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.044,\n        "output": 0.17700000000000002,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/tencent/hy-mt2-30b-a3b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "tencent/hy-mt2-30b-a3b",\n      "aliases": [\n        "tencent/hy-mt2-30b-a3b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.074,\n        "output": 0.295,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/~z-ai/glm-latest@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "~z-ai/glm-latest",\n      "aliases": [\n        "~z-ai/glm-latest"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.8775,\n        "output": 2.9699999999999998,\n        "cacheRead": 0.1755,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/tencent/hy-mt2-7b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "tencent/hy-mt2-7b",\n      "aliases": [\n        "tencent/hy-mt2-7b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.074,\n        "output": 0.295,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/z-ai/glm-5.3@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "z-ai/glm-5.3",\n      "aliases": [\n        "z-ai/glm-5.3"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 1.4,\n        "output": 4.4,\n        "cacheRead": 0.26,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/z-ai/glm-5.3:batch@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "z-ai/glm-5.3:batch",\n      "aliases": [\n        "z-ai/glm-5.3:batch"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.7,\n        "output": 2.2,\n        "cacheRead": 0.13,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3.8-27b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3.8-27b",\n      "aliases": [\n        "qwen/qwen3.8-27b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.21400000000000002,\n        "output": 2.5500000000000003,\n        "cacheRead": 0.15,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/dots-studio/dots-3-note-preview:free@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "dots-studio/dots-3-note-preview:free",\n      "aliases": [\n        "dots-studio/dots-3-note-preview:free"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0,\n        "output": 0,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/bytedance-seed/seed-2-1-turbo@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "bytedance-seed/seed-2-1-turbo",\n      "aliases": [\n        "bytedance-seed/seed-2-1-turbo"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.5,\n        "output": 2.5,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3.8-2.4t-a95b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3.8-2.4t-a95b",\n      "aliases": [\n        "qwen/qwen3.8-2.4t-a95b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 2,\n        "output": 6,\n        "cacheRead": 0.25,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3.8-2.4t-a95b:batch@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3.8-2.4t-a95b:batch",\n      "aliases": [\n        "qwen/qwen3.8-2.4t-a95b:batch"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 2,\n        "output": 6,\n        "cacheRead": 0.25,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/deepseek/deepseek-v4-pro-0813:batch@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "deepseek/deepseek-v4-pro-0813:batch",\n      "aliases": [\n        "deepseek/deepseek-v4-pro-0813:batch"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.66,\n        "output": 1.9800000000000002,\n        "cacheRead": 0.022,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/liquid/lfm-2.5-2.6b:free@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "liquid/lfm-2.5-2.6b:free",\n      "aliases": [\n        "liquid/lfm-2.5-2.6b:free"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0,\n        "output": 0,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/nvidia/nemotron-3.5-lightning@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "nvidia/nemotron-3.5-lightning",\n      "aliases": [\n        "nvidia/nemotron-3.5-lightning"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.08,\n        "output": 0.19999999999999998,\n        "cacheRead": 0.04,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/nvidia/nemotron-3.5-lightning:free@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "nvidia/nemotron-3.5-lightning:free",\n      "aliases": [\n        "nvidia/nemotron-3.5-lightning:free"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0,\n        "output": 0,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/upstage/solar-pro4@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "upstage/solar-pro4",\n      "aliases": [\n        "upstage/solar-pro4"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.09,\n        "output": 0.36,\n        "cacheRead": 0.018,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/meta/muse-glimmer-30b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "meta/muse-glimmer-30b",\n      "aliases": [\n        "meta/muse-glimmer-30b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.35,\n        "output": 1.5,\n        "cacheRead": 0.04,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true,\n      "effectiveTo": "2026-09-17T16:58:48.650Z"\n    },\n    {\n      "id": "openrouter/meta/muse-glimmer-30b:batch@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "meta/muse-glimmer-30b:batch",\n      "aliases": [\n        "meta/muse-glimmer-30b:batch"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.175,\n        "output": 0.75,\n        "cacheRead": 0.02,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/~deepseek/deepseek-v4-flash-latest@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "~deepseek/deepseek-v4-flash-latest",\n      "aliases": [\n        "~deepseek/deepseek-v4-flash-latest"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.03,\n        "output": 0.13,\n        "cacheRead": 0.01,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/deepseek/deepseek-v4-flash-0731@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "deepseek/deepseek-v4-flash-0731",\n      "aliases": [\n        "deepseek/deepseek-v4-flash-0731"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.06,\n        "output": 0.12,\n        "cacheRead": 0.012,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/deepseek/deepseek-v4-flash-0731:batch@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "deepseek/deepseek-v4-flash-0731:batch",\n      "aliases": [\n        "deepseek/deepseek-v4-flash-0731:batch"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.11,\n        "output": 0.33,\n        "cacheRead": 0.0035,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/thinkingmachines/inkling-small@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "thinkingmachines/inkling-small",\n      "aliases": [\n        "thinkingmachines/inkling-small"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.44999999999999996,\n        "output": 1.2,\n        "cacheRead": 0.09999999999999999,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/thinkingmachines/inkling-small:free@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "thinkingmachines/inkling-small:free",\n      "aliases": [\n        "thinkingmachines/inkling-small:free"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0,\n        "output": 0,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/inclusionai/ling-3.0-flash@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "inclusionai/ling-3.0-flash",\n      "aliases": [\n        "inclusionai/ling-3.0-flash"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.020999999999999998,\n        "output": 0.063,\n        "cacheRead": 0.004200000000000001,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/poolside/laguna-s-2.1@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "poolside/laguna-s-2.1",\n      "aliases": [\n        "poolside/laguna-s-2.1"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.09,\n        "output": 0.18,\n        "cacheRead": 0.009,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/poolside/laguna-s-2.1:free@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "poolside/laguna-s-2.1:free",\n      "aliases": [\n        "poolside/laguna-s-2.1:free"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0,\n        "output": 0,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/meituan/longcat-2.0@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "meituan/longcat-2.0",\n      "aliases": [\n        "meituan/longcat-2.0"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.3,\n        "output": 1.2,\n        "cacheRead": 0.006,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/thinkingmachines/inkling@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "thinkingmachines/inkling",\n      "aliases": [\n        "thinkingmachines/inkling"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 1,\n        "output": 4.05,\n        "cacheRead": 0.16999999999999998,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/thinkingmachines/inkling:batch@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "thinkingmachines/inkling:batch",\n      "aliases": [\n        "thinkingmachines/inkling:batch"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 1,\n        "output": 4.05,\n        "cacheRead": 0.16999999999999998,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/thinkingmachines/inkling:free@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "thinkingmachines/inkling:free",\n      "aliases": [\n        "thinkingmachines/inkling:free"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0,\n        "output": 0,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/moonshotai/kimi-k3:batch@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "moonshotai/kimi-k3:batch",\n      "aliases": [\n        "moonshotai/kimi-k3:batch"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 3,\n        "output": 15,\n        "cacheRead": 0.3,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/kwaipilot/kat-coder-pro-v2.5@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "kwaipilot/kat-coder-pro-v2.5",\n      "aliases": [\n        "kwaipilot/kat-coder-pro-v2.5"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.74,\n        "output": 2.96,\n        "cacheRead": 0.15,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/aion-labs/aion-3.0-mini@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "aion-labs/aion-3.0-mini",\n      "aliases": [\n        "aion-labs/aion-3.0-mini"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.7,\n        "output": 1.4,\n        "cacheRead": 0.18,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/aion-labs/aion-3.0@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "aion-labs/aion-3.0",\n      "aliases": [\n        "aion-labs/aion-3.0"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 3,\n        "output": 6,\n        "cacheRead": 0.75,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/poolside/laguna-xs-2.1@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "poolside/laguna-xs-2.1",\n      "aliases": [\n        "poolside/laguna-xs-2.1"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.06,\n        "output": 0.12,\n        "cacheRead": 0.03,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/poolside/laguna-xs-2.1:free@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "poolside/laguna-xs-2.1:free",\n      "aliases": [\n        "poolside/laguna-xs-2.1:free"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0,\n        "output": 0,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/cohere/north-mini-code:free@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "cohere/north-mini-code:free",\n      "aliases": [\n        "cohere/north-mini-code:free"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0,\n        "output": 0,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/z-ai/glm-5.2:batch@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "z-ai/glm-5.2:batch",\n      "aliases": [\n        "z-ai/glm-5.2:batch"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.7,\n        "output": 2.2,\n        "cacheRead": 0.07,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/z-ai/glm-5.2:free@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "z-ai/glm-5.2:free",\n      "aliases": [\n        "z-ai/glm-5.2:free"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0,\n        "output": 0,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/moonshotai/kimi-k2.7-code@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "moonshotai/kimi-k2.7-code",\n      "aliases": [\n        "moonshotai/kimi-k2.7-code"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.7062,\n        "output": 3.21,\n        "cacheRead": 0.18,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/nvidia/nemotron-3.5-content-safety@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "nvidia/nemotron-3.5-content-safety",\n      "aliases": [\n        "nvidia/nemotron-3.5-content-safety"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.19999999999999998,\n        "output": 0.19999999999999998,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/nvidia/nemotron-3.5-content-safety:free@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "nvidia/nemotron-3.5-content-safety:free",\n      "aliases": [\n        "nvidia/nemotron-3.5-content-safety:free"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0,\n        "output": 0,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/nvidia/nemotron-3-ultra-550b-a55b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "nvidia/nemotron-3-ultra-550b-a55b",\n      "aliases": [\n        "nvidia/nemotron-3-ultra-550b-a55b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.625,\n        "output": 3.125,\n        "cacheRead": 0.1875,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "nvidia/nemotron-3-ultra-550b-a55b:free",\n      "aliases": [\n        "nvidia/nemotron-3-ultra-550b-a55b:free"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0,\n        "output": 0,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/minimax/minimax-m3@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "minimax/minimax-m3",\n      "aliases": [\n        "minimax/minimax-m3"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.3,\n        "output": 1.2,\n        "cacheRead": 0.06,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/minimax/minimax-m3:batch@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "minimax/minimax-m3:batch",\n      "aliases": [\n        "minimax/minimax-m3:batch"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.3,\n        "output": 1.2,\n        "cacheRead": 0.06,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/stepfun/step-3.7-flash@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "stepfun/step-3.7-flash",\n      "aliases": [\n        "stepfun/step-3.7-flash"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.19999999999999998,\n        "output": 1.15,\n        "cacheRead": 0.04,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3.7-max@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3.7-max",\n      "aliases": [\n        "qwen/qwen3.7-max"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 1.475,\n        "output": 4.425,\n        "cacheRead": 0.295,\n        "cacheWrite": 1.84375\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/perceptron/perceptron-mk1@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "perceptron/perceptron-mk1",\n      "aliases": [\n        "perceptron/perceptron-mk1"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.15,\n        "output": 1.5,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mistralai/mistral-medium-3-5@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mistralai/mistral-medium-3-5",\n      "aliases": [\n        "mistralai/mistral-medium-3-5"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 1.5,\n        "output": 7.5,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mistralai/mistral-medium-3-5:batch@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mistralai/mistral-medium-3-5:batch",\n      "aliases": [\n        "mistralai/mistral-medium-3-5:batch"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.75,\n        "output": 3.75,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",\n      "aliases": [\n        "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0,\n        "output": 0,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/~moonshotai/kimi-latest@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "~moonshotai/kimi-latest",\n      "aliases": [\n        "~moonshotai/kimi-latest"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 2.0999999999999996,\n        "output": 10.950000000000001,\n        "cacheRead": 0.22999999999999998,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true,\n      "effectiveTo": "2026-09-17T16:58:48.650Z"\n    },\n    {\n      "id": "openrouter/qwen/qwen3.6-35b-a3b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3.6-35b-a3b",\n      "aliases": [\n        "qwen/qwen3.6-35b-a3b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.09999999999999999,\n        "output": 0.8999999999999999,\n        "cacheRead": 0.049999999999999996,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3.6-27b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3.6-27b",\n      "aliases": [\n        "qwen/qwen3.6-27b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.3,\n        "output": 2,\n        "cacheRead": 0.03,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/deepseek/deepseek-v4-pro@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "deepseek/deepseek-v4-pro",\n      "aliases": [\n        "deepseek/deepseek-v4-pro"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 1.5999999999999999,\n        "output": 3.1999999999999997,\n        "cacheRead": 0.135,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/deepseek/deepseek-v4-flash@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "deepseek/deepseek-v4-flash",\n      "aliases": [\n        "deepseek/deepseek-v4-flash"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.088606,\n        "output": 0.177212,\n        "cacheRead": 0.017721200000000003,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true,\n      "effectiveTo": "2026-09-17T16:58:48.650Z"\n    },\n    {\n      "id": "openrouter/tencent/hy3-preview@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "tencent/hy3-preview",\n      "aliases": [\n        "tencent/hy3-preview"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.18,\n        "output": 0.6,\n        "cacheRead": 0.06,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/xiaomi/mimo-v2.5-pro@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "xiaomi/mimo-v2.5-pro",\n      "aliases": [\n        "xiaomi/mimo-v2.5-pro"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.435,\n        "output": 0.87,\n        "cacheRead": 0.0036,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/xiaomi/mimo-v2.5@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "xiaomi/mimo-v2.5",\n      "aliases": [\n        "xiaomi/mimo-v2.5"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.14,\n        "output": 0.28,\n        "cacheRead": 0.0028,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/moonshotai/kimi-k2.6@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "moonshotai/kimi-k2.6",\n      "aliases": [\n        "moonshotai/kimi-k2.6"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.95,\n        "output": 4,\n        "cacheRead": 0.16,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/z-ai/glm-5.1@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "z-ai/glm-5.1",\n      "aliases": [\n        "z-ai/glm-5.1"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.966,\n        "output": 3.036,\n        "cacheRead": 0.1794,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/google/gemma-4-26b-a4b-it@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "google/gemma-4-26b-a4b-it",\n      "aliases": [\n        "google/gemma-4-26b-a4b-it"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.09,\n        "output": 0.3,\n        "cacheRead": 0.049999999999999996,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/google/gemma-4-26b-a4b-it:free@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "google/gemma-4-26b-a4b-it:free",\n      "aliases": [\n        "google/gemma-4-26b-a4b-it:free"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0,\n        "output": 0,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/google/gemma-4-31b-it@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "google/gemma-4-31b-it",\n      "aliases": [\n        "google/gemma-4-31b-it"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.09,\n        "output": 0.33999999999999997,\n        "cacheRead": 0.049999999999999996,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/google/gemma-4-31b-it:free@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "google/gemma-4-31b-it:free",\n      "aliases": [\n        "google/gemma-4-31b-it:free"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0,\n        "output": 0,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/z-ai/glm-5v-turbo@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "z-ai/glm-5v-turbo",\n      "aliases": [\n        "z-ai/glm-5v-turbo"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 1.2,\n        "output": 4,\n        "cacheRead": 0.24,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/arcee-ai/trinity-large-thinking@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "arcee-ai/trinity-large-thinking",\n      "aliases": [\n        "arcee-ai/trinity-large-thinking"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.25,\n        "output": 0.7999999999999999,\n        "cacheRead": 0.06,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/kwaipilot/kat-coder-pro-v2@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "kwaipilot/kat-coder-pro-v2",\n      "aliases": [\n        "kwaipilot/kat-coder-pro-v2"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.3,\n        "output": 1.2,\n        "cacheRead": 0.06,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/rekaai/reka-edge@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "rekaai/reka-edge",\n      "aliases": [\n        "rekaai/reka-edge"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.09999999999999999,\n        "output": 0.09999999999999999,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/minimax/minimax-m2.7@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "minimax/minimax-m2.7",\n      "aliases": [\n        "minimax/minimax-m2.7"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.3,\n        "output": 1.2,\n        "cacheRead": 0.06,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mistralai/mistral-small-2603@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mistralai/mistral-small-2603",\n      "aliases": [\n        "mistralai/mistral-small-2603"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.15,\n        "output": 0.6,\n        "cacheRead": 0.015,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mistralai/mistral-small-2603:batch@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mistralai/mistral-small-2603:batch",\n      "aliases": [\n        "mistralai/mistral-small-2603:batch"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.075,\n        "output": 0.3,\n        "cacheRead": 0.0075,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/z-ai/glm-5-turbo@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "z-ai/glm-5-turbo",\n      "aliases": [\n        "z-ai/glm-5-turbo"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 1.2,\n        "output": 4,\n        "cacheRead": 0.24,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/nvidia/nemotron-3-super-120b-a12b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "nvidia/nemotron-3-super-120b-a12b",\n      "aliases": [\n        "nvidia/nemotron-3-super-120b-a12b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.08,\n        "output": 0.44999999999999996,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/nvidia/nemotron-3-super-120b-a12b:free@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "nvidia/nemotron-3-super-120b-a12b:free",\n      "aliases": [\n        "nvidia/nemotron-3-super-120b-a12b:free"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0,\n        "output": 0,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3.5-9b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3.5-9b",\n      "aliases": [\n        "qwen/qwen3.5-9b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.09999999999999999,\n        "output": 0.15,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3.5-9b:batch@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3.5-9b:batch",\n      "aliases": [\n        "qwen/qwen3.5-9b:batch"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.16999999999999998,\n        "output": 0.25,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/inception/mercury-2@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "inception/mercury-2",\n      "aliases": [\n        "inception/mercury-2"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.25,\n        "output": 0.75,\n        "cacheRead": 0.024999999999999998,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3.5-35b-a3b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3.5-35b-a3b",\n      "aliases": [\n        "qwen/qwen3.5-35b-a3b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.1625,\n        "output": 1.3,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3.5-27b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3.5-27b",\n      "aliases": [\n        "qwen/qwen3.5-27b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.195,\n        "output": 1.56,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3.5-122b-a10b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3.5-122b-a10b",\n      "aliases": [\n        "qwen/qwen3.5-122b-a10b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.26,\n        "output": 2.08,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3.5-flash-02-23@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3.5-flash-02-23",\n      "aliases": [\n        "qwen/qwen3.5-flash-02-23"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.065,\n        "output": 0.26,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/aion-labs/aion-2.0@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "aion-labs/aion-2.0",\n      "aliases": [\n        "aion-labs/aion-2.0"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.7999999999999999,\n        "output": 1.5999999999999999,\n        "cacheRead": 0.19999999999999998,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3.5-397b-a17b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3.5-397b-a17b",\n      "aliases": [\n        "qwen/qwen3.5-397b-a17b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.55,\n        "output": 3.5,\n        "cacheRead": 0.22499999999999998,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/minimax/minimax-m2.5@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "minimax/minimax-m2.5",\n      "aliases": [\n        "minimax/minimax-m2.5"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.27,\n        "output": 1.08,\n        "cacheRead": 0.027,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/z-ai/glm-5@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "z-ai/glm-5",\n      "aliases": [\n        "z-ai/glm-5"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.6,\n        "output": 1.92,\n        "cacheRead": 0.12,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3-coder-next@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3-coder-next",\n      "aliases": [\n        "qwen/qwen3-coder-next"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.12,\n        "output": 0.7999999999999999,\n        "cacheRead": 0.07,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/openrouter/free@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "openrouter/free",\n      "aliases": [\n        "openrouter/free"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0,\n        "output": 0,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/stepfun/step-3.5-flash@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "stepfun/step-3.5-flash",\n      "aliases": [\n        "stepfun/step-3.5-flash"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.09999999999999999,\n        "output": 0.3,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/moonshotai/kimi-k2.5@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "moonshotai/kimi-k2.5",\n      "aliases": [\n        "moonshotai/kimi-k2.5"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.44999999999999996,\n        "output": 2.25,\n        "cacheRead": 0.07,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/upstage/solar-pro-3@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "upstage/solar-pro-3",\n      "aliases": [\n        "upstage/solar-pro-3"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.15,\n        "output": 0.6,\n        "cacheRead": 0.015,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/minimax/minimax-m2-her@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "minimax/minimax-m2-her",\n      "aliases": [\n        "minimax/minimax-m2-her"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.3,\n        "output": 1.2,\n        "cacheRead": 0.03,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/writer/palmyra-x5@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "writer/palmyra-x5",\n      "aliases": [\n        "writer/palmyra-x5"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.6,\n        "output": 6,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/z-ai/glm-4.7-flash@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "z-ai/glm-4.7-flash",\n      "aliases": [\n        "z-ai/glm-4.7-flash"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.060500000000000005,\n        "output": 0.39999999999999997,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/minimax/minimax-m2.1@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "minimax/minimax-m2.1",\n      "aliases": [\n        "minimax/minimax-m2.1"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.3,\n        "output": 1.2,\n        "cacheRead": 0.03,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/z-ai/glm-4.7@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "z-ai/glm-4.7",\n      "aliases": [\n        "z-ai/glm-4.7"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.39999999999999997,\n        "output": 1.75,\n        "cacheRead": 0.08,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/nvidia/nemotron-3-nano-30b-a3b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "nvidia/nemotron-3-nano-30b-a3b",\n      "aliases": [\n        "nvidia/nemotron-3-nano-30b-a3b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.06,\n        "output": 0.24,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mistralai/devstral-2512@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mistralai/devstral-2512",\n      "aliases": [\n        "mistralai/devstral-2512"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.39999999999999997,\n        "output": 2,\n        "cacheRead": 0.04,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/relace/relace-search@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "relace/relace-search",\n      "aliases": [\n        "relace/relace-search"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 1,\n        "output": 3,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/z-ai/glm-4.6v@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "z-ai/glm-4.6v",\n      "aliases": [\n        "z-ai/glm-4.6v"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.3,\n        "output": 0.8999999999999999,\n        "cacheRead": 0.055,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/amazon/nova-2-lite-v1@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "amazon/nova-2-lite-v1",\n      "aliases": [\n        "amazon/nova-2-lite-v1"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.3,\n        "output": 2.5,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mistralai/ministral-14b-2512@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mistralai/ministral-14b-2512",\n      "aliases": [\n        "mistralai/ministral-14b-2512"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.19999999999999998,\n        "output": 0.19999999999999998,\n        "cacheRead": 0.02,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mistralai/ministral-8b-2512@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mistralai/ministral-8b-2512",\n      "aliases": [\n        "mistralai/ministral-8b-2512"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.15,\n        "output": 0.15,\n        "cacheRead": 0.015,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mistralai/ministral-8b-2512:batch@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mistralai/ministral-8b-2512:batch",\n      "aliases": [\n        "mistralai/ministral-8b-2512:batch"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.075,\n        "output": 0.075,\n        "cacheRead": 0.0075,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mistralai/ministral-3b-2512@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mistralai/ministral-3b-2512",\n      "aliases": [\n        "mistralai/ministral-3b-2512"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.09999999999999999,\n        "output": 0.09999999999999999,\n        "cacheRead": 0.01,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mistralai/mistral-large-2512@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mistralai/mistral-large-2512",\n      "aliases": [\n        "mistralai/mistral-large-2512"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.5,\n        "output": 1.5,\n        "cacheRead": 0.049999999999999996,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mistralai/mistral-large-2512:batch@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mistralai/mistral-large-2512:batch",\n      "aliases": [\n        "mistralai/mistral-large-2512:batch"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.25,\n        "output": 0.75,\n        "cacheRead": 0.024999999999999998,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/deepseek/deepseek-v3.2@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "deepseek/deepseek-v3.2",\n      "aliases": [\n        "deepseek/deepseek-v3.2"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.26899999999999996,\n        "output": 0.39999999999999997,\n        "cacheRead": 0.13449999999999998,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/moonshotai/kimi-k2-thinking@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "moonshotai/kimi-k2-thinking",\n      "aliases": [\n        "moonshotai/kimi-k2-thinking"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.6,\n        "output": 2.5,\n        "cacheRead": 0.15,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/amazon/nova-premier-v1@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "amazon/nova-premier-v1",\n      "aliases": [\n        "amazon/nova-premier-v1"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 2.5,\n        "output": 12.5,\n        "cacheRead": 0.625,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/openai/gpt-oss-safeguard-20b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "openai/gpt-oss-safeguard-20b",\n      "aliases": [\n        "openai/gpt-oss-safeguard-20b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.075,\n        "output": 0.3,\n        "cacheRead": 0.0375,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/minimax/minimax-m2@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "minimax/minimax-m2",\n      "aliases": [\n        "minimax/minimax-m2"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.255,\n        "output": 1.02,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3-vl-32b-instruct@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3-vl-32b-instruct",\n      "aliases": [\n        "qwen/qwen3-vl-32b-instruct"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.10400000000000001,\n        "output": 0.41600000000000004,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/ibm-granite/granite-4.0-h-micro@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "ibm-granite/granite-4.0-h-micro",\n      "aliases": [\n        "ibm-granite/granite-4.0-h-micro"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.017,\n        "output": 0.112,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3-vl-8b-thinking@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3-vl-8b-thinking",\n      "aliases": [\n        "qwen/qwen3-vl-8b-thinking"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.18,\n        "output": 2.0999999999999996,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3-vl-8b-instruct@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3-vl-8b-instruct",\n      "aliases": [\n        "qwen/qwen3-vl-8b-instruct"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.117,\n        "output": 0.45499999999999996,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3-vl-30b-a3b-thinking@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3-vl-30b-a3b-thinking",\n      "aliases": [\n        "qwen/qwen3-vl-30b-a3b-thinking"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.19999999999999998,\n        "output": 2.4,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3-vl-30b-a3b-instruct@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3-vl-30b-a3b-instruct",\n      "aliases": [\n        "qwen/qwen3-vl-30b-a3b-instruct"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.13,\n        "output": 0.52,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/z-ai/glm-4.6@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "z-ai/glm-4.6",\n      "aliases": [\n        "z-ai/glm-4.6"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.5,\n        "output": 2,\n        "cacheRead": 0.09999999999999999,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true,\n      "effectiveTo": "2026-09-17T16:58:48.650Z"\n    },\n    {\n      "id": "openrouter/deepseek/deepseek-v3.2-exp@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "deepseek/deepseek-v3.2-exp",\n      "aliases": [\n        "deepseek/deepseek-v3.2-exp"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.27,\n        "output": 0.41,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/thedrummer/cydonia-24b-v4.1@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "thedrummer/cydonia-24b-v4.1",\n      "aliases": [\n        "thedrummer/cydonia-24b-v4.1"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.3,\n        "output": 0.5,\n        "cacheRead": 0.15,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/relace/relace-apply-3@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "relace/relace-apply-3",\n      "aliases": [\n        "relace/relace-apply-3"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.85,\n        "output": 1.25,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3-vl-235b-a22b-thinking@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3-vl-235b-a22b-thinking",\n      "aliases": [\n        "qwen/qwen3-vl-235b-a22b-thinking"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.39999999999999997,\n        "output": 4,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3-vl-235b-a22b-instruct@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3-vl-235b-a22b-instruct",\n      "aliases": [\n        "qwen/qwen3-vl-235b-a22b-instruct"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.21,\n        "output": 1.9,\n        "cacheRead": 0.09999999999999999,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/deepseek/deepseek-v3.1-terminus@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "deepseek/deepseek-v3.1-terminus",\n      "aliases": [\n        "deepseek/deepseek-v3.1-terminus"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.27,\n        "output": 1,\n        "cacheRead": 0.135,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3-next-80b-a3b-thinking@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3-next-80b-a3b-thinking",\n      "aliases": [\n        "qwen/qwen3-next-80b-a3b-thinking"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.15,\n        "output": 1.2,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3-next-80b-a3b-instruct@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3-next-80b-a3b-instruct",\n      "aliases": [\n        "qwen/qwen3-next-80b-a3b-instruct"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.09,\n        "output": 1.1,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/moonshotai/kimi-k2-0905@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "moonshotai/kimi-k2-0905",\n      "aliases": [\n        "moonshotai/kimi-k2-0905"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.6,\n        "output": 2.5,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3-30b-a3b-thinking-2507@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3-30b-a3b-thinking-2507",\n      "aliases": [\n        "qwen/qwen3-30b-a3b-thinking-2507"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.19999999999999998,\n        "output": 2.4,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/nousresearch/hermes-4-405b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "nousresearch/hermes-4-405b",\n      "aliases": [\n        "nousresearch/hermes-4-405b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 1,\n        "output": 3,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/deepseek/deepseek-chat-v3.1@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "deepseek/deepseek-chat-v3.1",\n      "aliases": [\n        "deepseek/deepseek-chat-v3.1"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.25,\n        "output": 0.95,\n        "cacheRead": 0.13,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mistralai/mistral-medium-3.1@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mistralai/mistral-medium-3.1",\n      "aliases": [\n        "mistralai/mistral-medium-3.1"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.39999999999999997,\n        "output": 2,\n        "cacheRead": 0.04,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mistralai/mistral-medium-3.1:batch@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mistralai/mistral-medium-3.1:batch",\n      "aliases": [\n        "mistralai/mistral-medium-3.1:batch"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.19999999999999998,\n        "output": 1,\n        "cacheRead": 0.02,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/z-ai/glm-4.5v@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "z-ai/glm-4.5v",\n      "aliases": [\n        "z-ai/glm-4.5v"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.6,\n        "output": 1.7999999999999998,\n        "cacheRead": 0.11,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/openai/gpt-oss-120b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "openai/gpt-oss-120b",\n      "aliases": [\n        "openai/gpt-oss-120b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.037,\n        "output": 0.16999999999999998,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/openai/gpt-oss-120b:batch@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "openai/gpt-oss-120b:batch",\n      "aliases": [\n        "openai/gpt-oss-120b:batch"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.15,\n        "output": 0.6,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/openai/gpt-oss-20b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "openai/gpt-oss-20b",\n      "aliases": [\n        "openai/gpt-oss-20b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.03,\n        "output": 0.13,\n        "cacheRead": 0.03,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mistralai/codestral-2508@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mistralai/codestral-2508",\n      "aliases": [\n        "mistralai/codestral-2508"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.3,\n        "output": 0.8999999999999999,\n        "cacheRead": 0.03,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mistralai/codestral-2508:batch@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mistralai/codestral-2508:batch",\n      "aliases": [\n        "mistralai/codestral-2508:batch"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.15,\n        "output": 0.44999999999999996,\n        "cacheRead": 0.015,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3-coder-30b-a3b-instruct@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3-coder-30b-a3b-instruct",\n      "aliases": [\n        "qwen/qwen3-coder-30b-a3b-instruct"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.07,\n        "output": 0.28,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3-30b-a3b-instruct-2507@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3-30b-a3b-instruct-2507",\n      "aliases": [\n        "qwen/qwen3-30b-a3b-instruct-2507"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.04815,\n        "output": 0.19305,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/z-ai/glm-4.5@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "z-ai/glm-4.5",\n      "aliases": [\n        "z-ai/glm-4.5"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.6,\n        "output": 2.2,\n        "cacheRead": 0.11,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/z-ai/glm-4.5-air@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "z-ai/glm-4.5-air",\n      "aliases": [\n        "z-ai/glm-4.5-air"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.13,\n        "output": 0.85,\n        "cacheRead": 0.024999999999999998,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3-235b-a22b-thinking-2507@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3-235b-a22b-thinking-2507",\n      "aliases": [\n        "qwen/qwen3-235b-a22b-thinking-2507"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.22999999999999998,\n        "output": 2.3,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3-coder@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3-coder",\n      "aliases": [\n        "qwen/qwen3-coder"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.3,\n        "output": 1,\n        "cacheRead": 0.09999999999999999,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/bytedance/ui-tars-1.5-7b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "bytedance/ui-tars-1.5-7b",\n      "aliases": [\n        "bytedance/ui-tars-1.5-7b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.09999999999999999,\n        "output": 0.19999999999999998,\n        "cacheRead": 0.09999999999999999,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3-235b-a22b-2507@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3-235b-a22b-2507",\n      "aliases": [\n        "qwen/qwen3-235b-a22b-2507"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.0875,\n        "output": 0.35,\n        "cacheRead": 0.0175,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/moonshotai/kimi-k2@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "moonshotai/kimi-k2",\n      "aliases": [\n        "moonshotai/kimi-k2"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.5700000000000001,\n        "output": 2.3,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/cognitivecomputations/dolphin-mistral-24b-venice-edition@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "cognitivecomputations/dolphin-mistral-24b-venice-edition",\n      "aliases": [\n        "cognitivecomputations/dolphin-mistral-24b-venice-edition"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.19999999999999998,\n        "output": 0.8999999999999999,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/tencent/hunyuan-a13b-instruct@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "tencent/hunyuan-a13b-instruct",\n      "aliases": [\n        "tencent/hunyuan-a13b-instruct"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.14,\n        "output": 0.5700000000000001,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/morph/morph-v3-large@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "morph/morph-v3-large",\n      "aliases": [\n        "morph/morph-v3-large"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.8999999999999999,\n        "output": 1.9,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/morph/morph-v3-fast@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "morph/morph-v3-fast",\n      "aliases": [\n        "morph/morph-v3-fast"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.7999999999999999,\n        "output": 1.2,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/baidu/ernie-4.5-vl-424b-a47b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "baidu/ernie-4.5-vl-424b-a47b",\n      "aliases": [\n        "baidu/ernie-4.5-vl-424b-a47b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.42,\n        "output": 1.25,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mistralai/mistral-small-3.2-24b-instruct@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mistralai/mistral-small-3.2-24b-instruct",\n      "aliases": [\n        "mistralai/mistral-small-3.2-24b-instruct"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.09375,\n        "output": 0.25,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/minimax/minimax-m1@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "minimax/minimax-m1",\n      "aliases": [\n        "minimax/minimax-m1"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.39999999999999997,\n        "output": 2.2,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/deepseek/deepseek-r1-0528@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "deepseek/deepseek-r1-0528",\n      "aliases": [\n        "deepseek/deepseek-r1-0528"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.5,\n        "output": 2.1500000000000004,\n        "cacheRead": 0.35,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mistralai/mistral-medium-3@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mistralai/mistral-medium-3",\n      "aliases": [\n        "mistralai/mistral-medium-3"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.39999999999999997,\n        "output": 2,\n        "cacheRead": 0.04,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/meta-llama/llama-guard-4-12b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "meta-llama/llama-guard-4-12b",\n      "aliases": [\n        "meta-llama/llama-guard-4-12b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.18,\n        "output": 0.18,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3-30b-a3b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3-30b-a3b",\n      "aliases": [\n        "qwen/qwen3-30b-a3b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.12,\n        "output": 0.5,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3-8b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3-8b",\n      "aliases": [\n        "qwen/qwen3-8b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.117,\n        "output": 0.45499999999999996,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3-14b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3-14b",\n      "aliases": [\n        "qwen/qwen3-14b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.12,\n        "output": 0.24,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3-32b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3-32b",\n      "aliases": [\n        "qwen/qwen3-32b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.08,\n        "output": 0.28,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen3-235b-a22b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3-235b-a22b",\n      "aliases": [\n        "qwen/qwen3-235b-a22b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.45499999999999996,\n        "output": 1.8199999999999998,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/meta-llama/llama-4-maverick@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "meta-llama/llama-4-maverick",\n      "aliases": [\n        "meta-llama/llama-4-maverick"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.1875,\n        "output": 0.6525,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/meta-llama/llama-4-scout@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "meta-llama/llama-4-scout",\n      "aliases": [\n        "meta-llama/llama-4-scout"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.09999999999999999,\n        "output": 0.3,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/deepseek/deepseek-chat-v3-0324@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "deepseek/deepseek-chat-v3-0324",\n      "aliases": [\n        "deepseek/deepseek-chat-v3-0324"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.25,\n        "output": 1,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mistralai/mistral-small-3.1-24b-instruct@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mistralai/mistral-small-3.1-24b-instruct",\n      "aliases": [\n        "mistralai/mistral-small-3.1-24b-instruct"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.351,\n        "output": 0.5549999999999999,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/google/gemma-3-4b-it@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "google/gemma-3-4b-it",\n      "aliases": [\n        "google/gemma-3-4b-it"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.049999999999999996,\n        "output": 0.09999999999999999,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/google/gemma-3-12b-it@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "google/gemma-3-12b-it",\n      "aliases": [\n        "google/gemma-3-12b-it"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.049999999999999996,\n        "output": 0.15,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/cohere/command-a@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "cohere/command-a",\n      "aliases": [\n        "cohere/command-a"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 2.5,\n        "output": 10,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/rekaai/reka-flash-3@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "rekaai/reka-flash-3",\n      "aliases": [\n        "rekaai/reka-flash-3"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.09999999999999999,\n        "output": 0.19999999999999998,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/google/gemma-3-27b-it@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "google/gemma-3-27b-it",\n      "aliases": [\n        "google/gemma-3-27b-it"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.08,\n        "output": 0.44999999999999996,\n        "cacheRead": 0.04,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/thedrummer/skyfall-36b-v2@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "thedrummer/skyfall-36b-v2",\n      "aliases": [\n        "thedrummer/skyfall-36b-v2"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.55,\n        "output": 0.7999999999999999,\n        "cacheRead": 0.25,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mistralai/mistral-saba@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mistralai/mistral-saba",\n      "aliases": [\n        "mistralai/mistral-saba"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.19999999999999998,\n        "output": 0.6,\n        "cacheRead": 0.02,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/aion-labs/aion-rp-llama-3.1-8b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "aion-labs/aion-rp-llama-3.1-8b",\n      "aliases": [\n        "aion-labs/aion-rp-llama-3.1-8b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.7999999999999999,\n        "output": 1.5999999999999999,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen2.5-vl-72b-instruct@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen2.5-vl-72b-instruct",\n      "aliases": [\n        "qwen/qwen2.5-vl-72b-instruct"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.7999999999999999,\n        "output": 1,\n        "cacheRead": 0.39999999999999997,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mistralai/mistral-small-24b-instruct-2501@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mistralai/mistral-small-24b-instruct-2501",\n      "aliases": [\n        "mistralai/mistral-small-24b-instruct-2501"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.049999999999999996,\n        "output": 0.08,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/deepseek/deepseek-r1-distill-llama-70b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "deepseek/deepseek-r1-distill-llama-70b",\n      "aliases": [\n        "deepseek/deepseek-r1-distill-llama-70b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.7999999999999999,\n        "output": 0.7999999999999999,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/deepseek/deepseek-r1@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "deepseek/deepseek-r1",\n      "aliases": [\n        "deepseek/deepseek-r1"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.7,\n        "output": 2.5,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/minimax/minimax-01@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "minimax/minimax-01",\n      "aliases": [\n        "minimax/minimax-01"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.19999999999999998,\n        "output": 1.1,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/microsoft/phi-4@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "microsoft/phi-4",\n      "aliases": [\n        "microsoft/phi-4"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.07,\n        "output": 0.14,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/deepseek/deepseek-chat@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "deepseek/deepseek-chat",\n      "aliases": [\n        "deepseek/deepseek-chat"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.2574,\n        "output": 1.0287,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true,\n      "effectiveTo": "2026-09-17T21:20:40.511Z"\n    },\n    {\n      "id": "openrouter/sao10k/l3.3-euryale-70b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "sao10k/l3.3-euryale-70b",\n      "aliases": [\n        "sao10k/l3.3-euryale-70b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.65,\n        "output": 0.75,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/cohere/command-r7b-12-2024@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "cohere/command-r7b-12-2024",\n      "aliases": [\n        "cohere/command-r7b-12-2024"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.0375,\n        "output": 0.15,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/meta-llama/llama-3.3-70b-instruct@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "meta-llama/llama-3.3-70b-instruct",\n      "aliases": [\n        "meta-llama/llama-3.3-70b-instruct"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.09999999999999999,\n        "output": 0.32,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/amazon/nova-lite-v1@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "amazon/nova-lite-v1",\n      "aliases": [\n        "amazon/nova-lite-v1"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.06,\n        "output": 0.24,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/amazon/nova-micro-v1@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "amazon/nova-micro-v1",\n      "aliases": [\n        "amazon/nova-micro-v1"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.035,\n        "output": 0.14,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/amazon/nova-pro-v1@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "amazon/nova-pro-v1",\n      "aliases": [\n        "amazon/nova-pro-v1"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.7999999999999999,\n        "output": 3.1999999999999997,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/openai/gpt-4o-2024-11-20@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "openai/gpt-4o-2024-11-20",\n      "aliases": [\n        "openai/gpt-4o-2024-11-20"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 2.5,\n        "output": 10,\n        "cacheRead": 1.25,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mistralai/mistral-large-2407@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mistralai/mistral-large-2407",\n      "aliases": [\n        "mistralai/mistral-large-2407"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 2,\n        "output": 6,\n        "cacheRead": 0.19999999999999998,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen-2.5-coder-32b-instruct@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen-2.5-coder-32b-instruct",\n      "aliases": [\n        "qwen/qwen-2.5-coder-32b-instruct"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.66,\n        "output": 1,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/thedrummer/unslopnemo-12b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "thedrummer/unslopnemo-12b",\n      "aliases": [\n        "thedrummer/unslopnemo-12b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.39999999999999997,\n        "output": 0.39999999999999997,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/anthracite-org/magnum-v4-72b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "anthracite-org/magnum-v4-72b",\n      "aliases": [\n        "anthracite-org/magnum-v4-72b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 2.5,\n        "output": 5,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen-2.5-7b-instruct@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen-2.5-7b-instruct",\n      "aliases": [\n        "qwen/qwen-2.5-7b-instruct"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.09999999999999999,\n        "output": 0.19999999999999998,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/meta-llama/llama-3.2-1b-instruct@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "meta-llama/llama-3.2-1b-instruct",\n      "aliases": [\n        "meta-llama/llama-3.2-1b-instruct"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.027,\n        "output": 0.201,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/meta-llama/llama-3.2-3b-instruct@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "meta-llama/llama-3.2-3b-instruct",\n      "aliases": [\n        "meta-llama/llama-3.2-3b-instruct"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.049999999999999996,\n        "output": 0.33,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/qwen/qwen-2.5-72b-instruct@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen-2.5-72b-instruct",\n      "aliases": [\n        "qwen/qwen-2.5-72b-instruct"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.36,\n        "output": 0.39999999999999997,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/cohere/command-r-08-2024@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "cohere/command-r-08-2024",\n      "aliases": [\n        "cohere/command-r-08-2024"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.15,\n        "output": 0.6,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/cohere/command-r-plus-08-2024@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "cohere/command-r-plus-08-2024",\n      "aliases": [\n        "cohere/command-r-plus-08-2024"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 2.5,\n        "output": 10,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/sao10k/l3.1-euryale-70b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "sao10k/l3.1-euryale-70b",\n      "aliases": [\n        "sao10k/l3.1-euryale-70b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.85,\n        "output": 0.85,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/nousresearch/hermes-3-llama-3.1-70b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "nousresearch/hermes-3-llama-3.1-70b",\n      "aliases": [\n        "nousresearch/hermes-3-llama-3.1-70b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.7,\n        "output": 0.7,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/nousresearch/hermes-3-llama-3.1-405b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "nousresearch/hermes-3-llama-3.1-405b",\n      "aliases": [\n        "nousresearch/hermes-3-llama-3.1-405b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 1,\n        "output": 1,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/sao10k/l3-lunaris-8b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "sao10k/l3-lunaris-8b",\n      "aliases": [\n        "sao10k/l3-lunaris-8b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.04,\n        "output": 0.049999999999999996,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/openai/gpt-4o-2024-08-06@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "openai/gpt-4o-2024-08-06",\n      "aliases": [\n        "openai/gpt-4o-2024-08-06"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 2.5,\n        "output": 10,\n        "cacheRead": 1.25,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/meta-llama/llama-3.1-70b-instruct@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "meta-llama/llama-3.1-70b-instruct",\n      "aliases": [\n        "meta-llama/llama-3.1-70b-instruct"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.39999999999999997,\n        "output": 0.39999999999999997,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/meta-llama/llama-3.1-8b-instruct@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "meta-llama/llama-3.1-8b-instruct",\n      "aliases": [\n        "meta-llama/llama-3.1-8b-instruct"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.049999999999999996,\n        "output": 0.08,\n        "cacheRead": 0.024999999999999998,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mistralai/mistral-nemo@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mistralai/mistral-nemo",\n      "aliases": [\n        "mistralai/mistral-nemo"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.019000000000000003,\n        "output": 0.03,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/openai/gpt-4o-mini@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "openai/gpt-4o-mini",\n      "aliases": [\n        "openai/gpt-4o-mini"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.15,\n        "output": 0.6,\n        "cacheRead": 0.075,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/openai/gpt-4o-mini-2024-07-18@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "openai/gpt-4o-mini-2024-07-18",\n      "aliases": [\n        "openai/gpt-4o-mini-2024-07-18"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.15,\n        "output": 0.6,\n        "cacheRead": 0.075,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/google/gemma-2-27b-it@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "google/gemma-2-27b-it",\n      "aliases": [\n        "google/gemma-2-27b-it"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.65,\n        "output": 0.65,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/openai/gpt-4o@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "openai/gpt-4o",\n      "aliases": [\n        "openai/gpt-4o"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 2.5,\n        "output": 10,\n        "cacheRead": 1.25,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/openai/gpt-4o-2024-05-13@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "openai/gpt-4o-2024-05-13",\n      "aliases": [\n        "openai/gpt-4o-2024-05-13"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 5,\n        "output": 15,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mistralai/mixtral-8x22b-instruct@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mistralai/mixtral-8x22b-instruct",\n      "aliases": [\n        "mistralai/mixtral-8x22b-instruct"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 2,\n        "output": 6,\n        "cacheRead": 0.19999999999999998,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/microsoft/wizardlm-2-8x22b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "microsoft/wizardlm-2-8x22b",\n      "aliases": [\n        "microsoft/wizardlm-2-8x22b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.62,\n        "output": 0.62,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/openai/gpt-4-turbo@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "openai/gpt-4-turbo",\n      "aliases": [\n        "openai/gpt-4-turbo"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 10,\n        "output": 30,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mistralai/mistral-large@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mistralai/mistral-large",\n      "aliases": [\n        "mistralai/mistral-large"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 2,\n        "output": 6,\n        "cacheRead": 0.19999999999999998,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/openai/gpt-3.5-turbo-0613@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "openai/gpt-3.5-turbo-0613",\n      "aliases": [\n        "openai/gpt-3.5-turbo-0613"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 1,\n        "output": 2,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/openai/gpt-3.5-turbo-instruct@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "openai/gpt-3.5-turbo-instruct",\n      "aliases": [\n        "openai/gpt-3.5-turbo-instruct"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 1.5,\n        "output": 2,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/openai/gpt-3.5-turbo-16k@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "openai/gpt-3.5-turbo-16k",\n      "aliases": [\n        "openai/gpt-3.5-turbo-16k"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 3,\n        "output": 4,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/mancer/weaver@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "mancer/weaver",\n      "aliases": [\n        "mancer/weaver"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.39999999999999997,\n        "output": 0.75,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/undi95/remm-slerp-l2-13b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "undi95/remm-slerp-l2-13b",\n      "aliases": [\n        "undi95/remm-slerp-l2-13b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.35,\n        "output": 0.65,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/gryphe/mythomax-l2-13b@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "gryphe/mythomax-l2-13b",\n      "aliases": [\n        "gryphe/mythomax-l2-13b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.08,\n        "output": 0.11,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/openai/gpt-3.5-turbo@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "openai/gpt-3.5-turbo",\n      "aliases": [\n        "openai/gpt-3.5-turbo"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 0.5,\n        "output": 1.5,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/openai/gpt-4@2026-09-17T08:46:53.180Z",\n      "family": "openrouter",\n      "canonical": "openai/gpt-4",\n      "aliases": [\n        "openai/gpt-4"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T08:46:53.180Z",\n      "rates": {\n        "uncached": 30,\n        "output": 60,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/~deepseek/deepseek-pro-latest@2026-09-17T16:58:48.650Z",\n      "family": "openrouter",\n      "canonical": "~deepseek/deepseek-pro-latest",\n      "aliases": [\n        "~deepseek/deepseek-pro-latest"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T16:58:48.650Z",\n      "rates": {\n        "uncached": 0.57948,\n        "output": 1.73844,\n        "cacheRead": 0.018438,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true,\n      "effectiveFrom": "2026-09-17T16:58:48.650Z"\n    },\n    {\n      "id": "openrouter/deepseek/deepseek-v4-pro-0813@2026-09-17T16:58:48.650Z",\n      "family": "openrouter",\n      "canonical": "deepseek/deepseek-v4-pro-0813",\n      "aliases": [\n        "deepseek/deepseek-v4-pro-0813"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T16:58:48.650Z",\n      "rates": {\n        "uncached": 0.57948,\n        "output": 1.73844,\n        "cacheRead": 0.018438,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/meta/muse-glimmer-30b@2026-09-17T16:58:48.650Z",\n      "family": "openrouter",\n      "canonical": "meta/muse-glimmer-30b",\n      "aliases": [\n        "meta/muse-glimmer-30b"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T16:58:48.650Z",\n      "rates": {\n        "uncached": 0.3,\n        "output": 1.1,\n        "cacheRead": 0.04,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true,\n      "effectiveFrom": "2026-09-17T16:58:48.650Z"\n    },\n    {\n      "id": "openrouter/~moonshotai/kimi-latest@2026-09-17T16:58:48.650Z",\n      "family": "openrouter",\n      "canonical": "~moonshotai/kimi-latest",\n      "aliases": [\n        "~moonshotai/kimi-latest"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T16:58:48.650Z",\n      "rates": {\n        "uncached": 1.875,\n        "output": 10.5,\n        "cacheRead": 0.2175,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true,\n      "effectiveFrom": "2026-09-17T16:58:48.650Z",\n      "effectiveTo": "2026-09-17T21:20:40.511Z"\n    },\n    {\n      "id": "openrouter/deepseek/deepseek-v4-flash@2026-09-17T16:58:48.650Z",\n      "family": "openrouter",\n      "canonical": "deepseek/deepseek-v4-flash",\n      "aliases": [\n        "deepseek/deepseek-v4-flash"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T16:58:48.650Z",\n      "rates": {\n        "uncached": 0.07,\n        "output": 0.14,\n        "cacheRead": 0.014,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true,\n      "effectiveFrom": "2026-09-17T16:58:48.650Z"\n    },\n    {\n      "id": "openrouter/z-ai/glm-4.6@2026-09-17T16:58:48.650Z",\n      "family": "openrouter",\n      "canonical": "z-ai/glm-4.6",\n      "aliases": [\n        "z-ai/glm-4.6"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T16:58:48.650Z",\n      "rates": {\n        "uncached": 0.43,\n        "output": 1.75,\n        "cacheRead": 0.08,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true,\n      "effectiveFrom": "2026-09-17T16:58:48.650Z"\n    },\n    {\n      "id": "openrouter/qwen/qwen3.8-27b:free@2026-09-17T21:20:40.511Z",\n      "family": "openrouter",\n      "canonical": "qwen/qwen3.8-27b:free",\n      "aliases": [\n        "qwen/qwen3.8-27b:free"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T21:20:40.511Z",\n      "rates": {\n        "uncached": 0,\n        "output": 0,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true\n    },\n    {\n      "id": "openrouter/~moonshotai/kimi-latest@2026-09-17T21:20:40.511Z",\n      "family": "openrouter",\n      "canonical": "~moonshotai/kimi-latest",\n      "aliases": [\n        "~moonshotai/kimi-latest"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T21:20:40.511Z",\n      "rates": {\n        "uncached": 2.0999999999999996,\n        "output": 10.950000000000001,\n        "cacheRead": 0.22999999999999998,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true,\n      "effectiveFrom": "2026-09-17T21:20:40.511Z"\n    },\n    {\n      "id": "openrouter/deepseek/deepseek-chat@2026-09-17T21:20:40.511Z",\n      "family": "openrouter",\n      "canonical": "deepseek/deepseek-chat",\n      "aliases": [\n        "deepseek/deepseek-chat"\n      ],\n      "currency": "USD",\n      "sourceUrl": "https://openrouter.ai/api/v1/models",\n      "retrievedAt": "2026-09-17",\n      "observedFrom": "2026-09-17T21:20:40.511Z",\n      "rates": {\n        "uncached": 0.32,\n        "output": 0.8899999999999999,\n        "cacheRead": null,\n        "cacheWrite": null\n      },\n      "confidence": "estimated",\n      "reasoningIncludedInOutput": true,\n      "effectiveFrom": "2026-09-17T21:20:40.511Z"\n    }\n  ],\n  "fx": [\n    {\n      "date": "2026-08-26",\n      "usdCny": 6.7205,\n      "sourceUrl": "https://api.frankfurter.app/2026-08-26?from=USD&to=CNY"\n    }\n  ]\n}\n', signature: "5pbQ6cM/xMHy81ridl+oqQ7rExjLvfmFTKYwJ0BFMbKFnuGzDCSv5vD9wTLPRmP63RMgtBhAWPFEtU6f+kIECg==" };

// src/pricing-store.js
var HOUR = 36e5;
var MAX_BYTES = 4 * 1024 * 1024;
var stores = /* @__PURE__ */ new WeakMap();
function read(file) {
  if (statSync(file).size > MAX_BYTES) throw new Error("pricing-file-too-large");
  return JSON.parse(readFileSync(file, "utf8"));
}
function atomic(file, value) {
  const temp = file + "." + randomUUID() + ".tmp";
  writeFileSync(temp, JSON.stringify(value) + "\n", { mode: 384, flag: "wx" });
  try {
    renameSync(temp, file);
  } finally {
    try {
      unlinkSync(temp);
    } catch {
    }
  }
}
function verifyEnvelope(envelope, publicKey = import_pricing_trust.default.publicKey) {
  if (!envelope || typeof envelope.payload !== "string" || Buffer.byteLength(envelope.payload) > MAX_BYTES || typeof envelope.signature !== "string" || !verify(null, Buffer.from(envelope.payload), publicKey, Buffer.from(envelope.signature, "base64"))) throw new Error("pricing-signature-invalid");
  return import_pricing.default.validateCatalog(JSON.parse(envelope.payload));
}
var PricingStore = class {
  constructor(home, { fetchImpl = (...args) => fetch(...args), now = () => Date.now(), publicKey = import_pricing_trust.default.publicKey, url = import_pricing_trust.default.url } = {}) {
    this.dir = join(home, "plugins", "dsh-stats", "pricing");
    this.fetch = fetchImpl;
    this.now = now;
    this.publicKey = publicKey;
    this.url = url;
    this.catalog = import_pricing.default.BUILTIN;
    this.envelope = publicKey === import_pricing_trust.default.publicKey ? latest_default : null;
    this.error = null;
    this.lastSuccessAt = null;
    this.lastCheckAt = null;
    this.inflight = null;
    this.settings = { revision: 0, autoUpdate: true, pinnedVersion: null, overrides: [] };
    try {
      this.settings = this.validateSettings(read(join(this.dir, "settings.json")));
    } catch (error) {
      if (error.code !== "ENOENT") {
        this.error = "pricing-settings-invalid";
        this.settingsInvalid = true;
      }
    }
    try {
      const cached = this.settings.pinnedVersion === null ? read(join(this.dir, "current.json")) : { envelope: read(join(this.dir, "catalog-" + this.settings.pinnedVersion + ".json")) };
      const catalog = verifyEnvelope(cached.envelope, publicKey);
      if (catalog.version >= this.catalog.version || this.settings.pinnedVersion === catalog.version) {
        this.catalog = catalog;
        this.envelope = cached.envelope;
        this.lastSuccessAt = Number.isFinite(cached.lastSuccessAt) ? cached.lastSuccessAt : null;
      }
    } catch (error) {
      if (error.code !== "ENOENT") this.error = "pricing-cache-invalid";
    }
    this.rebuild();
  }
  validateSettings(value) {
    if (!value || !Number.isSafeInteger(value.revision) || value.revision < 0 || typeof value.autoUpdate !== "boolean" || value.pinnedVersion !== null && (!Number.isSafeInteger(value.pinnedVersion) || value.pinnedVersion <= 0)) throw new Error("pricing-settings-invalid");
    return { revision: value.revision, autoUpdate: value.autoUpdate, pinnedVersion: value.pinnedVersion, overrides: import_pricing.default.validateOverrides(value.overrides) };
  }
  rebuild() {
    this.engine = import_pricing.default.createPricing(this.catalog, this.settings.overrides);
    this.fingerprint = createHash("sha256").update(JSON.stringify([this.catalog, this.settings.overrides])).digest("hex");
  }
  syncDisk() {
    const stamp = (name) => {
      try {
        const st = statSync(join(this.dir, name));
        return st.mtimeMs + ":" + st.size + ":" + st.ino;
      } catch {
        return "";
      }
    };
    const stampKey = stamp("settings.json") + "/" + stamp("current.json");
    if (stampKey === this.diskStamp) return;
    try {
      let settings = this.settings;
      try {
        settings = this.validateSettings(read(join(this.dir, "settings.json")));
      } catch (error) {
        if (error.code !== "ENOENT") {
          this.settingsInvalid = true;
          throw new Error("pricing-settings-invalid");
        }
      }
      let cached;
      try {
        cached = settings.pinnedVersion === null ? read(join(this.dir, "current.json")) : { envelope: read(join(this.dir, "catalog-" + settings.pinnedVersion + ".json")) };
      } catch (error) {
        if (error.code !== "ENOENT" || settings.pinnedVersion !== null) throw new Error("pricing-cache-invalid");
      }
      const catalog = cached ? verifyEnvelope(cached.envelope, this.publicKey) : this.catalog;
      this.settings = settings;
      this.settingsInvalid = false;
      if (settings.pinnedVersion === catalog.version || settings.pinnedVersion === null && catalog.version >= import_pricing.default.BUILTIN.version) {
        this.catalog = catalog;
        if (cached) this.envelope = cached.envelope;
        if (Number.isFinite(cached?.lastSuccessAt)) this.lastSuccessAt = cached.lastSuccessAt;
      }
      this.rebuild();
      this.diskStamp = stampKey;
    } catch (error) {
      this.error = /^pricing-[a-z0-9-]+$/.test(error.message) ? error.message : "pricing-cache-invalid";
    }
  }
  withLock(fn) {
    mkdirSync(this.dir, { recursive: true, mode: 448 });
    const lock = join(this.dir, "settings.lock");
    let fd;
    try {
      fd = openSync(lock, "wx", 384);
    } catch (error) {
      if (error.code !== "EEXIST") throw new Error("pricing-settings-busy");
      let dead = false;
      try {
        const owner = read(lock);
        if (Number.isSafeInteger(owner.pid) && owner.pid > 0) {
          try {
            process.kill(owner.pid, 0);
          } catch (err) {
            dead = err.code === "ESRCH";
          }
        }
      } catch {
      }
      if (!dead) throw new Error("pricing-settings-busy");
      try {
        unlinkSync(lock);
        fd = openSync(lock, "wx", 384);
      } catch {
        throw new Error("pricing-settings-busy");
      }
    }
    try {
      writeFileSync(fd, JSON.stringify({ pid: process.pid }));
      this.syncDisk();
      return fn();
    } finally {
      closeSync(fd);
      unlinkSync(lock);
    }
  }
  close() {
    this.closed = true;
    this.controller?.abort();
  }
  snapshot() {
    this.syncDisk();
    return this.engine;
  }
  status() {
    this.syncDisk();
    let history = [];
    try {
      history = readdirSync(this.dir).filter((name) => /^catalog-\d+\.json$/.test(name)).map((name) => Number(name.slice(8, -5))).sort((a, b) => b - a);
    } catch {
    }
    return {
      version: this.catalog.version,
      publishedAt: this.catalog.publishedAt,
      fingerprint: this.fingerprint,
      lastCheckAt: this.lastCheckAt,
      lastSuccessAt: this.lastSuccessAt,
      error: this.error,
      revision: this.settings.revision,
      autoUpdate: this.settings.autoUpdate,
      pinnedVersion: this.settings.pinnedVersion,
      catalogJson: JSON.stringify(this.catalog),
      overridesJson: JSON.stringify(this.settings.overrides),
      history
    };
  }
  async refresh({ force = false, unknown = false } = {}) {
    if (this.closed) return this.status();
    if (this.inflight) return this.inflight;
    this.syncDisk();
    const now = this.now();
    if (!force && (!this.settings.autoUpdate || this.settings.pinnedVersion !== null || this.settingsInvalid)) return this.status();
    if (!force && this.lastCheckAt !== null && now - this.lastCheckAt < (unknown ? 15 * 6e4 : HOUR)) return this.status();
    this.lastCheckAt = now;
    this.inflight = this.download({ force, revision: this.settings.revision }).finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }
  async download({ force, revision }) {
    const controller = new AbortController();
    this.controller = controller;
    const timer = setTimeout(() => controller.abort(), 12e3);
    timer.unref?.();
    try {
      const response = await this.fetch(this.url, { signal: controller.signal, redirect: "error", headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("pricing-http-" + response.status);
      if (Number(response.headers.get("content-length")) > MAX_BYTES) {
        await response.body?.cancel();
        throw new Error("pricing-response-too-large");
      }
      const reader = response.body.getReader();
      let length = 0;
      const chunks = [];
      try {
        for (; ; ) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > MAX_BYTES) throw new Error("pricing-response-too-large");
          chunks.push(Buffer.from(value));
        }
      } finally {
        await reader.cancel().catch(() => {
        });
      }
      const envelope = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const catalog = verifyEnvelope(envelope, this.publicKey);
      if (Date.parse(catalog.publishedAt) > this.now() + 5 * 6e4) throw new Error("pricing-future-version");
      if (this.closed) return this.status();
      this.withLock(() => {
        if (this.settingsInvalid) throw new Error("pricing-settings-invalid");
        const highest = Math.max(import_pricing.default.BUILTIN.version, this.catalog.version, ...this.status().history);
        if (catalog.version < highest) throw new Error("pricing-version-regressed");
        let previous;
        try {
          previous = verifyEnvelope(read(join(this.dir, "catalog-" + catalog.version + ".json")), this.publicKey);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
        if (previous && JSON.stringify(catalog) !== JSON.stringify(previous) || catalog.version === this.catalog.version && JSON.stringify(catalog) !== JSON.stringify(this.catalog)) throw new Error("pricing-version-conflict");
        if (this.envelope) atomic(join(this.dir, "catalog-" + this.catalog.version + ".json"), this.envelope);
        atomic(join(this.dir, "catalog-" + catalog.version + ".json"), envelope);
        if (this.settings.pinnedVersion !== null || !force && (!this.settings.autoUpdate || revision !== this.settings.revision)) return;
        const lastSuccessAt = this.now();
        atomic(join(this.dir, "current.json"), { envelope, lastSuccessAt });
        this.lastSuccessAt = lastSuccessAt;
        this.envelope = envelope;
        this.catalog = catalog;
        this.error = null;
        this.rebuild();
      });
    } catch (error) {
      if (!this.closed) this.error = /^pricing-[a-z0-9-]+$/.test(error.message) ? error.message : controller.signal.aborted ? "pricing-timeout" : "pricing-update-failed";
    } finally {
      clearTimeout(timer);
      this.controller = null;
    }
    return this.status();
  }
  preview(overrides) {
    return import_pricing.default.createPricing(this.catalog, import_pricing.default.validateOverrides(overrides));
  }
  persistSettings(settings) {
    atomic(join(this.dir, "settings-" + this.settings.revision + ".json"), this.settings);
    atomic(join(this.dir, "settings-" + settings.revision + ".json"), settings);
    atomic(join(this.dir, "settings.json"), settings);
    this.settings = settings;
  }
  save({ revision, autoUpdate, overrides, fingerprint }) {
    return this.withLock(() => {
      if (this.settingsInvalid) throw new Error("pricing-settings-invalid");
      if (fingerprint !== void 0 && fingerprint !== this.fingerprint) throw new Error("pricing-settings-conflict");
      if (revision !== this.settings.revision) throw new Error("pricing-settings-conflict");
      const settings = this.validateSettings({ revision: revision + 1, autoUpdate, pinnedVersion: autoUpdate ? null : this.settings.pinnedVersion, overrides });
      this.persistSettings(settings);
      this.rebuild();
      return this.status();
    });
  }
  rollback(version, revision) {
    return this.withLock(() => {
      if (this.settingsInvalid) throw new Error("pricing-settings-invalid");
      if (revision !== this.settings.revision) throw new Error("pricing-settings-conflict");
      if (!Number.isSafeInteger(version) || version <= 0) throw new Error("pricing-version-invalid");
      const envelope = read(join(this.dir, "catalog-" + version + ".json"));
      const catalog = verifyEnvelope(envelope, this.publicKey);
      if (catalog.version !== version) throw new Error("pricing-version-invalid");
      this.persistSettings({ ...this.settings, revision: revision + 1, autoUpdate: false, pinnedVersion: version });
      this.envelope = envelope;
      this.catalog = catalog;
      this.rebuild();
      return this.status();
    });
  }
};
function pricingStore(owner, home) {
  let store = stores.get(owner);
  if (!store || store.home !== home) {
    store = new PricingStore(home);
    store.home = home;
    stores.set(owner, store);
  }
  return store;
}

// src/index.js
var import_route_data = __toESM(require_route_data(), 1);

// src/accounts.js
var import_pricing2 = __toESM(require_pricing(), 1);
var { normalizeAccountType, providerFamilyOf } = import_pricing2.default;
var CACHE_MS = 5 * 60 * 1e3;
var REQUEST_TIMEOUT_MS = 15 * 1e3;
var MAX_RESPONSE_BYTES = 1024 * 1024;
var STATUS_MESSAGES = {
  "not-configured": "credential is not configured",
  unauthorized: "credential is invalid or lacks permission",
  "rate-limited": "provider rate limit reached",
  unavailable: "provider account service is unavailable",
  "invalid-response": "provider returned an invalid account response",
  blocked: "provider account endpoint was blocked by the safety policy",
  unsupported: "provider has no supported public account endpoint"
};
var DEFAULTS = {
  deepseek: { apiKeyRef: "DEEPSEEK_API_KEY", baseURL: "https://api.deepseek.com", actionUrl: "https://platform.deepseek.com/top_up" },
  openrouter: { apiKeyRef: "OPENROUTER_MANAGEMENT_KEY", baseURL: "https://openrouter.ai", actionUrl: "https://openrouter.ai/credits" },
  moonshot: { apiKeyRef: "MOONSHOT_API_KEY", baseURL: "https://api.moonshot.cn", actionUrl: "https://platform.moonshot.cn/console/account" },
  zai: { apiKeyRef: "ZAI_API_KEY", baseURL: "https://api.z.ai", actionUrl: "https://z.ai/manage-apikey/apikey-list" },
  kimi: { apiKeyRef: "KIMI_API_KEY", baseURL: "https://api.kimi.com", actionUrl: "https://www.kimi.com/code/console" },
  minimax: { apiKeyRef: "MINIMAX_API_KEY", baseURL: "https://www.minimax.io", actionUrl: "https://platform.minimaxi.com/console/usage" }
};
function defaultUsageExtractor(response) {
  const remaining = response?.remaining ?? response?.quota?.remaining ?? response?.balance;
  const unit = response?.unit ?? response?.quota?.unit ?? "USD";
  return {
    isValid: response?.is_active ?? response?.isValid ?? true,
    remaining,
    unit,
    total: response?.total ?? response?.quota?.total,
    used: response?.used ?? response?.quota?.used
  };
}
var DEFAULT_GENERIC_USAGE_TEMPLATE = Object.freeze({
  request: Object.freeze({
    url: "{{baseUrl}}/v1/usage",
    method: "GET",
    headers: Object.freeze({ Authorization: "Bearer {{apiKey}}" })
  }),
  extractor: defaultUsageExtractor
});
function firstNonEmpty(...values) {
  for (const value of values) {
    const hit = nonEmpty(value);
    if (hit) return hit;
  }
  return null;
}
function objectRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function profileBaseURL(profile) {
  return firstNonEmpty(profile?.baseURL, profile?.baseUrl, profile?.base_url);
}
function profileApiKeyRef(profile) {
  return firstNonEmpty(profile?.apiKeyEnv, profile?.apiKeyRef, profile?.api_key_env, profile?.api_key_ref);
}
function profileAccountApiKeyRef(profile) {
  return firstNonEmpty(profile?.accountApiKeyEnv, profile?.accountApiKeyRef, profile?.account_api_key_env, profile?.account_api_key_ref);
}
function profileUsageTemplate(profile) {
  for (const key of ["accountUsage", "account_usage", "usageTemplate", "usage_template"]) {
    if (Object.prototype.hasOwnProperty.call(profile || {}, key)) {
      const value = objectRecord(profile[key]);
      return value;
    }
  }
  return null;
}
function validTemplateBase(baseURL) {
  try {
    const url = new URL(baseURL);
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
}
function defaultUsageTemplateFor(baseURL) {
  let url;
  try {
    url = new URL(baseURL);
  } catch {
    return DEFAULT_GENERIC_USAGE_TEMPLATE;
  }
  const path = url.pathname.replace(/\/+$/, "");
  if (!/\/v1$/i.test(path)) return DEFAULT_GENERIC_USAGE_TEMPLATE;
  return Object.freeze({
    request: Object.freeze({
      url: "{{baseUrl}}/usage",
      method: "GET",
      headers: Object.freeze({ Authorization: "Bearer {{apiKey}}" })
    }),
    extractor: defaultUsageExtractor
  });
}
var AccountError = class extends Error {
  constructor(status, code = status) {
    super(STATUS_MESSAGES[status] || "provider account query failed");
    this.name = "AccountError";
    this.status = status;
    this.code = code;
  }
};
function nonEmpty(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function numberOrNull(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}
function nonNegativeOrNull(value) {
  const parsed = numberOrNull(value);
  return parsed !== null && parsed >= 0 ? parsed : null;
}
function clampPercent(value) {
  const parsed = numberOrNull(value);
  return parsed === null ? null : Math.round(Math.max(0, Math.min(100, parsed)) * 10) / 10;
}
function timestampOrNull(value) {
  if (value === null || value === void 0 || value === "") return null;
  const parsed = typeof value === "number" && Number.isFinite(value) ? new Date(value < 2e10 ? value * 1e3 : value) : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}
function serviceFrom(ctx, name) {
  try {
    return ctx?.reflect?.get?.(name, false) || ctx?.get?.(name) || ctx?.[name] || null;
  } catch {
    return ctx?.[name] || null;
  }
}
async function setting(settings, name) {
  try {
    return await settings?.get?.(name);
  } catch {
    return null;
  }
}
function displayName(id, configured) {
  return nonEmpty(configured) || ({
    "deepseek-official": "DeepSeek",
    openrouter: "OpenRouter",
    moonshotai: "Moonshot",
    "moonshotai-cn": "Moonshot",
    kimi: "Kimi",
    "kimi-coding": "Kimi For Coding",
    zai: "Z.ai",
    "zai-coding-cn": "Z.ai Coding Plan",
    minimax: "MiniMax",
    "minimax-cn": "MiniMax"
  }[id] || id);
}
async function configuredProviders(ctx) {
  const settings = serviceFrom(ctx, "settings");
  const deepseek = await setting(settings, "llm-deepseek");
  const providers = [{
    id: "deepseek-official",
    displayName: "DeepSeek",
    apiKeyRef: profileApiKeyRef(deepseek),
    accountApiKeyRef: profileAccountApiKeyRef(deepseek),
    baseURL: profileBaseURL(deepseek) || DEFAULTS.deepseek.baseURL,
    accountType: nonEmpty(deepseek?.accountType) || "api",
    accountUsage: profileUsageTemplate(deepseek),
    source: "deepseek"
  }];
  const pi = await setting(settings, "llm-pi-ai");
  if (pi && typeof pi === "object" && pi.providers && typeof pi.providers === "object") {
    for (const [id, profile] of Object.entries(pi.providers)) {
      if (!profile || typeof profile !== "object" || !nonEmpty(id)) continue;
      providers.push({
        id,
        displayName: displayName(id, profile.displayName),
        apiKeyRef: profileApiKeyRef(profile),
        accountApiKeyRef: profileAccountApiKeyRef(profile),
        baseURL: profileBaseURL(profile),
        accountType: nonEmpty(profile.accountType) || nonEmpty(profile.billingMode),
        accountUsage: profileUsageTemplate(profile),
        api: firstNonEmpty(profile.api, profile.protocol),
        source: "pi-ai"
      });
    }
  }
  const unique = /* @__PURE__ */ new Map();
  for (const provider of providers) if (!unique.has(provider.id)) unique.set(provider.id, provider);
  return [...unique.values()];
}
function accountSpec(provider) {
  const id = String(provider.id || "unknown").toLowerCase();
  const family = providerFamilyOf(id);
  const configuredAccountType = nonEmpty(provider.accountType);
  const accountType = normalizeAccountType(configuredAccountType || (family === "minimax" ? "token-plan" : "api"));
  const subscription = accountType === "subscription" || accountType === "token-plan";
  const configuredBaseURL = firstNonEmpty(provider.baseURL, provider.baseUrl, provider.base_url);
  const configuredApiKeyRef = firstNonEmpty(provider.apiKeyRef, provider.apiKeyEnv, provider.api_key_ref, provider.api_key_env);
  const configuredAccountApiKeyRef = firstNonEmpty(provider.accountApiKeyRef, provider.accountApiKeyEnv, provider.account_api_key_ref, provider.account_api_key_env);
  let adapter = null, mode = "unsupported", defaults = null;
  const usageTemplate = objectRecord(provider.accountUsage);
  if (usageTemplate?.request && typeof usageTemplate.request === "object") {
    adapter = "generic-usage";
    mode = "balance";
  } else if (id === "deepseek" || id === "deepseek-official") {
    adapter = "deepseek-balance";
    mode = "balance";
    defaults = DEFAULTS.deepseek;
  } else if (id === "openrouter") {
    adapter = "openrouter-balance";
    mode = "balance";
    defaults = DEFAULTS.openrouter;
  } else if (["moonshotai", "moonshotai-cn", "kimi", "kimi-api"].includes(id) && !subscription) {
    adapter = "moonshot-balance";
    mode = "balance";
    defaults = DEFAULTS.moonshot;
  } else if (["kimi-coding", "kimi-for-coding"].includes(id) || family === "moonshot" && subscription) {
    adapter = "kimi-token-plan";
    mode = "subscription";
    defaults = DEFAULTS.kimi;
  } else if (["zai-coding-cn", "zai-coding"].includes(id) || family === "zai" && subscription) {
    adapter = "zai-token-plan";
    mode = "subscription";
    defaults = DEFAULTS.zai;
  } else if (family === "zai") {
    adapter = "zai-balance";
    mode = "balance";
    defaults = DEFAULTS.zai;
  } else if (family === "minimax") {
    defaults = DEFAULTS.minimax;
    if (subscription) {
      adapter = "minimax-token-plan";
      mode = "subscription";
    }
  }
  const customRoute = provider.source === "pi-ai" || family === "unknown";
  const hasCredentialRef = firstNonEmpty(configuredApiKeyRef, configuredAccountApiKeyRef, usageTemplate?.apiKeyRef, usageTemplate?.apiKeyEnv);
  if (!adapter && !subscription && customRoute && validTemplateBase(configuredBaseURL) && hasCredentialRef) {
    adapter = "generic-usage";
    mode = "balance";
  }
  const templateKeyRef = nonEmpty(usageTemplate?.apiKeyRef) || nonEmpty(usageTemplate?.apiKeyEnv);
  const apiKeyRef = adapter === "openrouter-balance" ? configuredAccountApiKeyRef || DEFAULTS.openrouter.apiKeyRef : templateKeyRef || configuredAccountApiKeyRef || configuredApiKeyRef || defaults?.apiKeyRef || null;
  return {
    id: provider.id,
    displayName: displayName(provider.id, provider.displayName),
    providerFamily: family,
    adapter,
    mode,
    apiKeyRef,
    baseURL: configuredBaseURL || firstNonEmpty(usageTemplate?.baseURL) || defaults?.baseURL || null,
    actionUrl: defaults?.actionUrl || null,
    accountType,
    usageTemplate: adapter === "generic-usage" ? usageTemplate?.request ? usageTemplate : defaultUsageTemplateFor(configuredBaseURL) : usageTemplate
  };
}
function allowedUrl(baseURL, path, allowedHosts) {
  let base;
  try {
    base = new URL(baseURL);
  } catch {
    throw new AccountError("blocked", "invalid-url");
  }
  if (base.protocol !== "https:" || base.username || base.password || !allowedHosts.includes(base.hostname.toLowerCase())) {
    throw new AccountError("blocked", "endpoint-not-allowed");
  }
  return new URL(path, base.origin).href;
}
function httpStatus(status) {
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 429) return "rate-limited";
  if (status === 404 || status === 405) return "unsupported";
  return status >= 500 ? "unavailable" : "invalid-response";
}
async function responseJson(response, signal) {
  const declared = numberOrNull(response?.headers?.get?.("content-length"));
  if (declared !== null && declared > MAX_RESPONSE_BYTES) {
    void response?.body?.cancel?.().catch(() => {
    });
    throw new AccountError("invalid-response", "response-too-large");
  }
  if (typeof response?.body?.getReader === "function") {
    const reader = response.body.getReader();
    const cancel = () => {
      void reader.cancel().catch(() => {
      });
    };
    const decoder = new TextDecoder();
    let size = 0, text = "";
    signal?.addEventListener("abort", cancel, { once: true });
    try {
      for (; ; ) {
        if (signal?.aborted) throw new AccountError("unavailable", "timeout");
        const { done, value } = await reader.read();
        if (signal?.aborted) throw new AccountError("unavailable", "timeout");
        if (done) break;
        size += value.byteLength;
        if (size > MAX_RESPONSE_BYTES) {
          cancel();
          throw new AccountError("invalid-response", "response-too-large");
        }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } catch (error) {
      if (signal?.aborted) throw new AccountError("unavailable", "timeout");
      if (error instanceof AccountError) throw error;
      throw new AccountError("unavailable", "transport-failed");
    } finally {
      signal?.removeEventListener("abort", cancel);
      reader.releaseLock();
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new AccountError("invalid-response", "invalid-json");
    }
  }
  if (typeof response?.arrayBuffer === "function") {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_RESPONSE_BYTES) throw new AccountError("invalid-response", "response-too-large");
    try {
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new AccountError("invalid-response", "invalid-json");
    }
  }
  try {
    return await response.json();
  } catch {
    throw new AccountError("invalid-response", "invalid-json");
  }
}
async function requestJson(url, headers, deps) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs || REQUEST_TIMEOUT_MS);
  try {
    let response;
    try {
      response = await (deps.fetch || globalThis.fetch)(url, {
        method: "GET",
        headers: { accept: "application/json", ...headers },
        redirect: "error",
        signal: controller.signal
      });
    } catch (error) {
      if (controller.signal.aborted || error?.name === "AbortError" || error?.name === "TimeoutError") throw new AccountError("unavailable", "timeout");
      throw new AccountError("unavailable", "transport-failed");
    }
    if (!response?.ok) throw new AccountError(httpStatus(Number(response?.status)), `http-${response?.status || 0}`);
    return await responseJson(response, controller.signal);
  } finally {
    clearTimeout(timer);
  }
}
function interpolateTemplate(value, variables) {
  if (typeof value === "string") return value.replace(/\{\{(baseUrl|apiKey)\}\}/g, (_match, key) => variables[key]);
  if (Array.isArray(value)) return value.map((item) => interpolateTemplate(item, variables));
  if (value && typeof value === "object") {
    const result = {};
    for (const [key, item] of Object.entries(value)) result[key] = interpolateTemplate(item, variables);
    return result;
  }
  return value;
}
function templateUrl(baseURL, configuredUrl) {
  let base;
  try {
    base = new URL(baseURL);
  } catch {
    throw new AccountError("blocked", "invalid-url");
  }
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) throw new AccountError("blocked", "endpoint-not-allowed");
  if (typeof configuredUrl !== "string" || !configuredUrl.trim()) throw new AccountError("invalid-response", "usage-request-missing");
  if (/\{\{apiKey\}\}/.test(configuredUrl)) throw new AccountError("blocked", "credential-in-url");
  const expanded = configuredUrl.replace(/\{\{baseUrl\}\}/g, base.toString().replace(/\/$/, ""));
  let target;
  try {
    target = new URL(expanded, base);
  } catch {
    throw new AccountError("blocked", "invalid-url");
  }
  if (target.protocol !== "https:" || target.origin !== base.origin || target.username || target.password) {
    throw new AccountError("blocked", "endpoint-not-allowed");
  }
  return target.href;
}
async function requestTemplate(template, spec, key, deps) {
  const request = template?.request;
  if (!request || typeof request !== "object") throw new AccountError("invalid-response", "usage-request-missing");
  const method = String(request.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "POST") throw new AccountError("blocked", "method-not-allowed");
  const url = templateUrl(spec.baseURL, request.url);
  const variables = { baseUrl: spec.baseURL.replace(/\/$/, ""), apiKey: key };
  const headers = interpolateTemplate(request.headers && typeof request.headers === "object" ? request.headers : {}, variables);
  const bodyValue = request.body === void 0 ? void 0 : interpolateTemplate(request.body, variables);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs || REQUEST_TIMEOUT_MS);
  try {
    let response;
    try {
      const init = { method, headers: { accept: "application/json", ...headers }, redirect: "error", signal: controller.signal };
      if (bodyValue !== void 0 && method !== "GET") {
        init.body = typeof bodyValue === "string" ? bodyValue : JSON.stringify(bodyValue);
        if (!Object.keys(init.headers).some((name) => name.toLowerCase() === "content-type")) init.headers["content-type"] = "application/json";
      }
      response = await (deps.fetch || globalThis.fetch)(url, init);
    } catch (error) {
      if (controller.signal.aborted || error?.name === "AbortError" || error?.name === "TimeoutError") throw new AccountError("unavailable", "timeout");
      throw new AccountError("unavailable", "transport-failed");
    }
    if (!response?.ok) throw new AccountError(httpStatus(Number(response?.status)), `http-${response?.status || 0}`);
    return await responseJson(response, controller.signal);
  } finally {
    clearTimeout(timer);
  }
}
function pathValue(value, path) {
  if (typeof path !== "string" || !path.trim()) return void 0;
  return path.split(".").filter(Boolean).reduce((current, key) => current == null ? void 0 : current[key], value);
}
function extractorValue(body, descriptor) {
  if (Array.isArray(descriptor)) {
    for (const path of descriptor) {
      const value = pathValue(body, path);
      if (value !== void 0 && value !== null) return value;
    }
    return void 0;
  }
  return pathValue(body, descriptor);
}
function genericUsageView(template, body) {
  let extracted;
  try {
    if (typeof template?.extractor === "function") extracted = template.extractor(body);
    else if (template?.extractor && typeof template.extractor === "object") {
      extracted = {};
      for (const [key, path] of Object.entries(template.extractor)) extracted[key] = extractorValue(body, path);
    } else extracted = body;
  } catch (error) {
    if (error instanceof AccountError) throw error;
    throw new AccountError("invalid-response", "extractor-failed");
  }
  if (!extracted || typeof extracted !== "object" || Array.isArray(extracted)) throw new AccountError("invalid-response", "invalid-usage-extractor");
  const source = body && typeof body === "object" && !Array.isArray(body) ? body : null;
  const isValid = extracted.isValid ?? source?.is_active ?? source?.isValid;
  if (isValid === false) throw new AccountError("invalid-response", "provider-invalid");
  const quota = extracted.quota && typeof extracted.quota === "object" ? extracted.quota : null;
  const sourceQuota = source?.quota && typeof source.quota === "object" ? source.quota : null;
  const remaining = extracted.remaining ?? quota?.remaining ?? extracted.balance ?? source?.remaining ?? sourceQuota?.remaining ?? source?.balance;
  const unit = extracted.unit ?? quota?.unit ?? source?.unit ?? sourceQuota?.unit ?? "USD";
  const total = extracted.total ?? quota?.total ?? source?.total ?? sourceQuota?.total;
  const used = extracted.used ?? quota?.used ?? source?.used ?? sourceQuota?.used;
  return balanceView(unit, remaining, { total, used, toppedUp: extracted.toppedUp, granted: extracted.granted, unlimited: extracted.unlimited === true });
}
async function resolveCredential(credentials, ref) {
  if (!ref || !credentials || typeof credentials.resolve !== "function") return "";
  try {
    const hit = await credentials.resolve(ref);
    return nonEmpty(typeof hit === "string" ? hit : hit?.value) || "";
  } catch {
    return "";
  }
}
function emptyAccount(spec, status, now, code = status) {
  return {
    id: spec.id,
    displayName: spec.displayName,
    providerFamily: spec.providerFamily,
    mode: spec.mode,
    adapter: spec.adapter,
    status,
    stale: false,
    fetchedAt: now,
    lastSuccessAt: null,
    errorCode: status === "ok" ? null : code,
    missingCredential: status === "not-configured" ? spec.apiKeyRef : null,
    actionUrl: spec.actionUrl,
    balance: null,
    plan: null,
    windows: []
  };
}
function balanceView(currency, remaining, fields = {}) {
  if (!nonEmpty(currency) || nonNegativeOrNull(remaining) === null) throw new AccountError("invalid-response");
  return {
    currency: String(currency).toUpperCase(),
    remaining: nonNegativeOrNull(remaining),
    used: nonNegativeOrNull(fields.used),
    total: nonNegativeOrNull(fields.total),
    toppedUp: nonNegativeOrNull(fields.toppedUp),
    granted: nonNegativeOrNull(fields.granted),
    unlimited: fields.unlimited === true
  };
}
function windowView(kind, used, remaining, reset) {
  let usedPercent = clampPercent(used), remainingPercent = clampPercent(remaining);
  if (usedPercent === null && remainingPercent !== null) usedPercent = Math.round((100 - remainingPercent) * 10) / 10;
  if (remainingPercent === null && usedPercent !== null) remainingPercent = Math.round((100 - usedPercent) * 10) / 10;
  if (usedPercent === null || remainingPercent === null) return null;
  return { kind, usedPercent, remainingPercent, resetsAt: timestampOrNull(reset) };
}
function limitWindow(value, kind) {
  if (!value || typeof value !== "object") return null;
  const total = nonNegativeOrNull(value.limit ?? value.total);
  const remaining = nonNegativeOrNull(value.remaining);
  if (total === null || remaining === null || total <= 0) return null;
  return windowView(kind, (total - remaining) / total * 100, remaining / total * 100, value.resetTime ?? value.reset_time ?? value.resetsAt);
}
function parseMiniMax(body, now) {
  const code = numberOrNull(body?.base_resp?.status_code ?? body?.baseResp?.statusCode);
  if (code !== null && code !== 0) return [];
  const remains = Array.isArray(body?.model_remains) ? body.model_remains : Array.isArray(body?.data?.model_remains) ? body.data.model_remains : [];
  const row = remains.find((entry) => String(entry?.model_name ?? entry?.modelName ?? "").toLowerCase() === "general") || remains.find((entry) => /^(minimax-m|coding-plan)/i.test(String(entry?.model_name ?? entry?.modelName ?? "")));
  if (!row) return [];
  const percentage = (prefix, camel) => {
    const remaining = clampPercent(row[`${prefix}_remaining_percent`] ?? row[`${camel}RemainingPercent`]);
    if (remaining !== null) return remaining;
    const total = nonNegativeOrNull(row[`${prefix}_total_count`] ?? row[`${camel}TotalCount`]);
    const used = nonNegativeOrNull(row[`${prefix}_usage_count`] ?? row[`${camel}UsageCount`]);
    if (total !== null && total > 0 && used !== null) return clampPercent((1 - used / total) * 100);
    const status = numberOrNull(row[`${prefix}_status`] ?? row[`${camel}Status`]);
    if (status === 2) return 0;
    if (status === 3) return 100;
    return null;
  };
  const sessionRemaining = percentage("current_interval", "currentInterval");
  const weeklyRemaining = percentage("current_weekly", "currentWeekly");
  const durationReset = (value) => nonNegativeOrNull(value) === null ? null : now + Number(value);
  return [
    sessionRemaining === null ? null : windowView("session", 100 - sessionRemaining, sessionRemaining, row.current_interval_end_time ?? row.currentIntervalEndTime ?? durationReset(row.remains_time ?? row.remainsTime)),
    weeklyRemaining === null ? null : windowView("weekly", 100 - weeklyRemaining, weeklyRemaining, row.current_weekly_end_time ?? row.currentWeeklyEndTime ?? durationReset(row.weekly_remains_time ?? row.weeklyRemainsTime))
  ].filter(Boolean);
}
function zaiWindowMinutes(limit) {
  const unit = numberOrNull(limit?.unit);
  const count = numberOrNull(limit?.number);
  if (unit === null || count === null || count <= 0) return null;
  if (unit === 5) return count;
  if (unit === 3) return count * 60;
  if (unit === 1) return count * 24 * 60;
  if (unit === 6) return count * 7 * 24 * 60;
  return null;
}
function zaiUsedPercent(limit) {
  const total = nonNegativeOrNull(limit?.usage);
  const remaining = nonNegativeOrNull(limit?.remaining);
  const current = nonNegativeOrNull(limit?.currentValue ?? limit?.current_value);
  if (total !== null && total > 0) {
    const used = remaining === null ? current : current === null ? total - remaining : Math.max(total - remaining, current);
    if (used !== null) return clampPercent(Math.max(0, Math.min(total, used)) / total * 100);
  }
  return clampPercent(limit?.percentage ?? limit?.usedPercent ?? limit?.used_percent);
}
function displayPlan(value) {
  return String(value ?? "").trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ").replace(/\bglm\b/gi, "GLM").replace(/\b\w/g, (char) => char.toUpperCase());
}
function zaiPlan(quota, subscription) {
  const row = Array.isArray(subscription?.data) ? subscription.data.find((entry) => entry && typeof entry === "object") : null;
  for (const source of [row, quota?.data]) {
    for (const key of ["product_name", "productName", "plan_name", "planName", "package_name", "packageName", "plan_type", "planType", "level"]) {
      const value = displayPlan(source?.[key]);
      if (value) return value;
    }
  }
  return "GLM Coding Plan";
}
function zaiWindow(limit, kind, fallbackReset = null) {
  const used = zaiUsedPercent(limit);
  return used === null ? null : windowView(kind, used, 100 - used, limit?.nextResetTime ?? limit?.next_reset_time ?? fallbackReset);
}
async function queryBalance(spec, key, deps, now) {
  let url, body, balance;
  if (spec.adapter === "generic-usage") {
    body = await requestTemplate(spec.usageTemplate, spec, key, deps);
    balance = genericUsageView(spec.usageTemplate, body);
  } else if (spec.adapter === "deepseek-balance") {
    url = allowedUrl(spec.baseURL, "/user/balance", ["api.deepseek.com"]);
    body = await requestJson(url, { authorization: `Bearer ${key}` }, deps);
    const infos = Array.isArray(body?.balance_infos) ? body.balance_infos : [];
    if (!infos.length) throw new AccountError("invalid-response", "balance-unavailable");
    const info = infos.find((entry) => String(entry?.currency).toUpperCase() === "CNY") || infos[0];
    balance = balanceView(info?.currency, info?.total_balance, { toppedUp: info?.topped_up_balance, granted: info?.granted_balance });
  } else if (spec.adapter === "openrouter-balance") {
    url = allowedUrl(DEFAULTS.openrouter.baseURL, "/api/v1/credits", ["openrouter.ai"]);
    body = await requestJson(url, { authorization: `Bearer ${key}` }, deps);
    const total = nonNegativeOrNull(body?.data?.total_credits), used = nonNegativeOrNull(body?.data?.total_usage);
    if (total === null || used === null) throw new AccountError("invalid-response");
    balance = balanceView("USD", Math.max(0, total - used), { total, used });
  } else if (spec.adapter === "moonshot-balance") {
    url = allowedUrl(spec.baseURL || DEFAULTS.moonshot.baseURL, "/v1/users/me/balance", ["api.moonshot.cn", "api.moonshot.ai"]);
    body = await requestJson(url, { authorization: `Bearer ${key}` }, deps);
    balance = balanceView(body?.data?.currency || "CNY", body?.data?.available_balance, { toppedUp: body?.data?.cash_balance, granted: body?.data?.voucher_balance });
  } else {
    url = allowedUrl(spec.baseURL || DEFAULTS.zai.baseURL, "/api/paas/v4/balance", ["api.z.ai", "open.bigmodel.cn"]);
    body = await requestJson(url, { authorization: `Bearer ${key}` }, deps);
    balance = balanceView(body?.data?.currency || "USD", body?.data?.available_balance ?? body?.data?.total_balance, { total: body?.data?.total_balance });
  }
  return { ...emptyAccount(spec, "ok", now, null), balance, lastSuccessAt: now };
}
async function querySubscription(spec, key, deps, now) {
  let plan = spec.displayName, windows = [];
  if (spec.adapter === "kimi-token-plan") {
    const url = allowedUrl(spec.baseURL || DEFAULTS.kimi.baseURL, "/coding/v1/usages", ["api.kimi.com"]);
    const body = await requestJson(url, { authorization: `Bearer ${key}` }, deps);
    const data = body?.data ?? body;
    const limits = Array.isArray(data?.limits) ? data.limits : [];
    const session = limits.map((entry) => limitWindow(entry?.detail ?? entry, "session")).find(Boolean) || null;
    const weekly = limitWindow(data?.usage, "weekly");
    windows = [session, weekly].filter(Boolean);
    plan = nonEmpty(data?.plan ?? data?.planName) || "Kimi For Coding";
  } else if (spec.adapter === "zai-token-plan") {
    const cn = String(spec.id).includes("cn") || String(spec.baseURL).includes("bigmodel.cn");
    const host = cn ? "https://open.bigmodel.cn" : "https://api.z.ai";
    const headers = { authorization: key };
    const body = await requestJson(host + "/api/monitor/usage/quota/limit", headers, deps);
    let subscription = null;
    try {
      subscription = await requestJson(host + "/api/biz/subscription/list", headers, deps);
    } catch {
    }
    const limits = Array.isArray(body?.data?.limits) ? body.data.limits : [];
    const tokenLimits = limits.filter((row) => ["TOKENS_LIMIT", "CREDIT_LIMIT"].includes(String(row?.type ?? row?.limit_type).toUpperCase()) && zaiUsedPercent(row) !== null).sort((a, b) => (zaiWindowMinutes(a) ?? Number.MAX_SAFE_INTEGER) - (zaiWindowMinutes(b) ?? Number.MAX_SAFE_INTEGER));
    const first = tokenLimits[0] || null;
    const session = tokenLimits.length >= 2 ? first : zaiWindowMinutes(first) !== null && zaiWindowMinutes(first) <= 360 ? first : null;
    const weekly = tokenLimits.length >= 2 ? tokenLimits[tokenLimits.length - 1] : session === null ? first : null;
    windows = [session ? zaiWindow(session, "session") : null, weekly ? zaiWindow(weekly, "weekly") : null].filter(Boolean);
    const timeLimit = limits.find((row) => String(row?.type ?? row?.limit_type).toUpperCase() === "TIME_LIMIT");
    const subscriptionRow = Array.isArray(subscription?.data) ? subscription.data[0] : null;
    const renewAt = subscriptionRow?.next_renew_time ?? subscriptionRow?.nextRenewTime ?? null;
    const billing = zaiWindow(timeLimit, "billing", renewAt);
    if (billing) windows.push(billing);
    plan = zaiPlan(body, subscription);
  } else {
    const cn = String(spec.id).includes("cn") || String(spec.baseURL).includes("minimaxi.com");
    const hosts = cn ? ["https://www.minimaxi.com/v1/token_plan/remains", "https://api.minimaxi.com/v1/token_plan/remains", "https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains"] : ["https://www.minimax.io/v1/token_plan/remains", "https://api.minimax.io/v1/token_plan/remains", "https://api.minimax.io/v1/api/openplatform/coding_plan/remains"];
    let lastError = null;
    for (let index = 0; index < hosts.length; index++) {
      try {
        const body = await requestJson(hosts[index], { authorization: `Bearer ${key}` }, deps);
        const parsed = parseMiniMax(body, now);
        if (parsed.length) {
          windows = parsed;
          lastError = null;
          break;
        }
        lastError = new AccountError("invalid-response", "quota-windows-missing");
        if (index === hosts.length - 1) throw lastError;
      } catch (error) {
        lastError = error;
        if (index === hosts.length - 1 || !["unsupported", "invalid-response"].includes(error?.status)) throw error;
      }
    }
    if (lastError) throw lastError;
    plan = "MiniMax Coding Plan";
  }
  if (!windows.length) throw new AccountError("invalid-response", "quota-windows-missing");
  return { ...emptyAccount(spec, "ok", now, null), plan, windows, lastSuccessAt: now };
}
async function queryProviderAccount(spec, credentials, deps = {}) {
  const now = (deps.now || Date.now)();
  if (!spec.adapter || spec.mode === "unsupported") return emptyAccount(spec, "unsupported", now);
  const key = await resolveCredential(credentials, spec.apiKeyRef);
  if (!key) return emptyAccount(spec, "not-configured", now);
  try {
    return spec.mode === "balance" ? await queryBalance(spec, key, deps, now) : await querySubscription(spec, key, deps, now);
  } catch (error) {
    return emptyAccount(spec, error?.status || "unavailable", now, error?.code || "query-failed");
  }
}
function transient(status) {
  return status === "unavailable" || status === "rate-limited" || status === "invalid-response";
}
function staleResult(previous, current) {
  if (!previous || previous.status !== "ok" && !previous.stale || !transient(current.status)) return current;
  return {
    ...previous,
    status: current.status,
    stale: true,
    fetchedAt: current.fetchedAt,
    lastSuccessAt: previous.lastSuccessAt ?? previous.fetchedAt,
    errorCode: current.errorCode
  };
}
var stateByOwner = /* @__PURE__ */ new WeakMap();
function registryState(owner) {
  let state = stateByOwner.get(owner);
  if (!state) {
    state = { cache: /* @__PURE__ */ new Map(), inflight: /* @__PURE__ */ new Map() };
    stateByOwner.set(owner, state);
  }
  return state;
}
function credentialsFrom(ctx) {
  return serviceFrom(ctx, "credentials");
}
async function refreshOne(state, spec, credentials, deps) {
  const signature = JSON.stringify(spec);
  const active = state.inflight.get(spec.id);
  if (active?.signature === signature) return active.promise;
  let promise;
  promise = queryProviderAccount(spec, credentials, deps).then((current) => {
    const cached = state.cache.get(spec.id);
    const previous = cached?.signature === signature ? cached.account : null;
    const account = staleResult(previous, current);
    if (state.inflight.get(spec.id)?.promise === promise) {
      state.cache.set(spec.id, { signature, account });
    }
    return account;
  }).finally(() => {
    if (state.inflight.get(spec.id)?.promise === promise) state.inflight.delete(spec.id);
  });
  state.inflight.set(spec.id, { signature, promise });
  return promise;
}
async function collectAccounts(owner, ctx, options = {}) {
  const deps = options.deps || {};
  const now = (deps.now || Date.now)();
  const specs = (await configuredProviders(ctx)).map(accountSpec);
  const state = registryState(owner);
  const credentials = credentialsFrom(ctx);
  const accounts = await Promise.all(specs.map(async (spec) => {
    const signature = JSON.stringify(spec);
    const hit = state.cache.get(spec.id);
    const age = now - (hit?.account?.fetchedAt || 0);
    if (!options.force && hit?.signature === signature && age >= 0 && age < (deps.cacheMs ?? CACHE_MS)) return hit.account;
    return refreshOne(state, spec, credentials, deps);
  }));
  const warnings = accounts.filter((account) => account.status !== "ok" && account.status !== "unsupported" && account.status !== "not-configured").map((account) => ({
    providerId: account.id,
    code: String(account.errorCode || account.status).toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
    message: STATUS_MESSAGES[account.status] || "provider account query failed"
  }));
  return { generatedAt: now, accounts, warnings };
}
async function providerViews(owner, ctx) {
  const now = Date.now();
  const state = registryState(owner);
  const credentials = credentialsFrom(ctx);
  const specs = (await configuredProviders(ctx)).map(accountSpec);
  const providers = await Promise.all(specs.map(async (spec) => {
    const signature = JSON.stringify(spec);
    const hit = state.cache.get(spec.id);
    const cached = hit?.signature === signature ? hit.account : null;
    const configured = spec.adapter !== null && (cached ? cached.status !== "not-configured" : !!await resolveCredential(credentials, spec.apiKeyRef));
    return {
      id: spec.id,
      displayName: spec.displayName,
      providerFamily: spec.providerFamily,
      accountMode: spec.mode,
      adapter: spec.adapter,
      configured,
      status: cached?.status || (spec.adapter ? "pending" : "unsupported"),
      fetchedAt: cached?.fetchedAt || null
    };
  }));
  return { generatedAt: now, providers };
}

// src/index.js
var { normalizeIdentity, priceUsage, convertCostToCny, summarizeCostsCny, mergeCostSummariesCny } = import_pricing3.default;
var __runInitializers = function(thisArg, initializers, value) {
  var useValue = arguments.length > 2;
  for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
  return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
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
    context.addInitializer = function(f) {
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
var SLOT_MINUTES = 30;
var SLOT_MS = SLOT_MINUTES * 60 * 1e3;
var GAP_MS = 10 * 60 * 1e3;
var MIN_INTERVAL_MS = 60 * 1e3;
var LONG_CONTEXT_TOKENS = 512e3;
var ZSTD_MAGIC = 4247762216;
var STATS_SCHEMA_VERSION = 2;
var SESSION_PROJECTION_DOMAIN_VERSION = 3;
var PROJECTION_ROW_VERSIONS = Object.freeze({ sessionStats: 1, tokenUsage: 1, title: 1, sessionListMetadata: 1, statsRoute: 3 });
var DEEPSEEK_BALANCE_API = "https://api.deepseek.com/user/balance";
var DEEPSEEK_TOP_UP_URL = "https://platform.deepseek.com/top_up";
var DEEPSEEK_API_KEY_REF = "DEEPSEEK_API_KEY";
var BALANCE_CACHE_MS = 60 * 1e3;
var BALANCE_TIMEOUT_MS = 15 * 1e3;
var BALANCE_ERROR_MESSAGES = {
  "no-api-key": "\u672A\u914D\u7F6E DEEPSEEK_API_KEY",
  "credential-failed": "\u8BFB\u53D6 DeepSeek \u51ED\u8BC1\u5931\u8D25",
  "fetch-unavailable": "\u5F53\u524D\u5BBF\u4E3B\u4E0D\u652F\u6301\u7F51\u7EDC\u8BF7\u6C42",
  "fetch-timeout": "DeepSeek \u4F59\u989D\u8BF7\u6C42\u8D85\u65F6",
  "fetch-failed": "DeepSeek \u4F59\u989D\u8BF7\u6C42\u5931\u8D25",
  "http-401": "DeepSeek \u51ED\u8BC1\u65E0\u6548\u6216\u5DF2\u8FC7\u671F",
  "http-403": "DeepSeek \u51ED\u8BC1\u6CA1\u6709\u4F59\u989D\u67E5\u8BE2\u6743\u9650",
  "http-429": "DeepSeek \u4F59\u989D\u8BF7\u6C42\u8FC7\u4E8E\u9891\u7E41",
  "http-4xx": "DeepSeek \u4F59\u989D\u8BF7\u6C42\u88AB\u62D2\u7EDD",
  "http-5xx": "DeepSeek \u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528",
  "invalid-response": "DeepSeek \u8FD4\u56DE\u7684\u4F59\u989D\u6570\u636E\u65E0\u6548",
  "balance-unavailable": "DeepSeek \u4F59\u989D\u6682\u4E0D\u53EF\u7528"
};
var DeepSeekBalanceError = class extends Error {
  constructor(code) {
    super(BALANCE_ERROR_MESSAGES[code] || "DeepSeek \u4F59\u989D\u67E5\u8BE2\u5931\u8D25");
    this.name = "DeepSeekBalanceError";
    this.code = code;
  }
};
function balanceErrorCode(error) {
  return error?.code && typeof error.code === "string" ? error.code : "fetch-failed";
}
function parseBalanceAmount(value) {
  if (value === void 0 || value === null || value === "") return null;
  const number = typeof value === "string" ? Number(value.trim()) : value;
  return Number.isFinite(number) && number >= 0 ? number : null;
}
function normalizeBalanceInfo(info) {
  if (!info || typeof info !== "object" || Array.isArray(info)) throw new DeepSeekBalanceError("invalid-response");
  const currency = typeof info.currency === "string" && info.currency.trim() ? info.currency.trim().toUpperCase() : null;
  const total = parseBalanceAmount(info.total_balance);
  const toppedUp = parseBalanceAmount(info.topped_up_balance);
  const granted = parseBalanceAmount(info.granted_balance);
  if (!currency || total === null || info.topped_up_balance != null && toppedUp === null || info.granted_balance != null && granted === null) {
    throw new DeepSeekBalanceError("invalid-response");
  }
  return {
    provider: "deepseek",
    name: currency === "CNY" ? "DeepSeek" : `DeepSeek ${currency}`,
    status: "ok",
    currency,
    total,
    toppedUp,
    granted,
    fetchedAt: null,
    topUpUrl: DEEPSEEK_TOP_UP_URL,
    errorCode: null
  };
}
function balancePayload(generatedAt, accounts, warnings = []) {
  return { generatedAt, accounts, warnings };
}
function unavailableBalancePayload(now, status, code) {
  const message = BALANCE_ERROR_MESSAGES[code] || BALANCE_ERROR_MESSAGES["fetch-failed"];
  return balancePayload(now, [{
    provider: "deepseek",
    name: "DeepSeek",
    status,
    currency: "CNY",
    total: null,
    toppedUp: null,
    granted: null,
    fetchedAt: null,
    topUpUrl: DEEPSEEK_TOP_UP_URL,
    errorCode: code
  }], [{ code: `BALANCE_${code.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`, message }]);
}
function staleBalancePayload(cached, now, error) {
  const code = balanceErrorCode(error);
  const message = BALANCE_ERROR_MESSAGES[code] || BALANCE_ERROR_MESSAGES["fetch-failed"];
  return balancePayload(now, cached.accounts.map((account) => ({ ...account, status: "stale", errorCode: code })), [{
    code: `BALANCE_${code.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`,
    message
  }]);
}
async function fetchDeepSeekBalance(credentials, fetchImpl = globalThis.fetch, now = Date.now()) {
  let resolved;
  if (!credentials || typeof credentials.resolve !== "function") throw new DeepSeekBalanceError("no-api-key");
  try {
    resolved = await credentials.resolve(DEEPSEEK_API_KEY_REF);
  } catch {
    throw new DeepSeekBalanceError("credential-failed");
  }
  const apiKey = typeof resolved === "string" ? resolved : resolved?.value;
  if (typeof apiKey !== "string" || !apiKey.trim()) throw new DeepSeekBalanceError("no-api-key");
  if (typeof fetchImpl !== "function") throw new DeepSeekBalanceError("fetch-unavailable");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BALANCE_TIMEOUT_MS);
  try {
    let response;
    try {
      response = await fetchImpl(DEEPSEEK_BALANCE_API, {
        headers: { authorization: `Bearer ${apiKey}` },
        redirect: "error",
        signal: controller.signal
      });
    } catch (error) {
      if (error?.name === "AbortError" || error?.name === "TimeoutError" || controller.signal.aborted) {
        throw new DeepSeekBalanceError("fetch-timeout");
      }
      throw new DeepSeekBalanceError("fetch-failed");
    }
    if (!response || !response.ok) {
      const status = Number(response?.status);
      if (status === 401) throw new DeepSeekBalanceError("http-401");
      if (status === 403) throw new DeepSeekBalanceError("http-403");
      if (status === 429) throw new DeepSeekBalanceError("http-429");
      if (status >= 500) throw new DeepSeekBalanceError("http-5xx");
      throw new DeepSeekBalanceError("http-4xx");
    }
    let body;
    try {
      body = await responseJson(response, controller.signal);
    } catch (error) {
      throw new DeepSeekBalanceError(error?.code === "timeout" ? "fetch-timeout" : "invalid-response");
    }
    if (!Array.isArray(body?.balance_infos) || body.balance_infos.length === 0) throw new DeepSeekBalanceError("invalid-response");
    const accounts = body.balance_infos.map(normalizeBalanceInfo).map((account) => ({ ...account, fetchedAt: now }));
    return balancePayload(now, accounts);
  } finally {
    clearTimeout(timer);
  }
}
var balanceStateByService = /* @__PURE__ */ new WeakMap();
function balanceState(service) {
  let state = balanceStateByService.get(service);
  if (!state) {
    state = { cache: null, inflight: null };
    balanceStateByService.set(service, state);
  }
  return state;
}
function credentialsService(ctx) {
  try {
    return ctx?.reflect?.get?.("credentials", false) || ctx?.credentials || null;
  } catch {
    return null;
  }
}
function dshHome() {
  return process.env.DSH_HOME || join2(homedir(), ".dsh");
}
function scanZstdFrames(buffer) {
  const frames = [];
  let truncated = false;
  let offset = 0;
  while (offset < buffer.length) {
    const start = offset;
    if (buffer.length - offset < 4) {
      truncated = true;
      break;
    }
    if (buffer.readUInt32LE(offset) !== ZSTD_MAGIC) throw new Error("corrupt Zstandard session log: invalid frame magic");
    offset += 4;
    if (offset >= buffer.length) {
      truncated = true;
      break;
    }
    const descriptor = buffer.readUInt8(offset);
    offset += 1;
    if ((descriptor & 8) !== 0) throw new Error("corrupt Zstandard session log: reserved frame-header bit");
    const contentSizeFlag = descriptor >>> 6;
    const singleSegment = (descriptor & 32) !== 0;
    const checksum = (descriptor & 4) !== 0;
    const dictionaryFlag = descriptor & 3;
    const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag;
    const contentSizeBytes = contentSizeFlag === 0 ? singleSegment ? 1 : 0 : 1 << contentSizeFlag;
    const headerBytes = (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes;
    if (offset + headerBytes > buffer.length) {
      truncated = true;
      break;
    }
    offset += headerBytes;
    for (; ; ) {
      if (offset + 3 > buffer.length) {
        truncated = true;
        offset = buffer.length;
        break;
      }
      const blockHeader = buffer.readUIntLE(offset, 3);
      offset += 3;
      const lastBlock = (blockHeader & 1) !== 0;
      const blockType = blockHeader >>> 1 & 3;
      const blockSize = blockHeader >>> 3;
      const storedBytes = blockType === 1 ? 1 : blockSize;
      if (blockType === 3) throw new Error("corrupt Zstandard session log: reserved block type");
      if (offset + storedBytes > buffer.length) {
        truncated = true;
        offset = buffer.length;
        break;
      }
      offset += storedBytes;
      if (lastBlock) break;
    }
    if (truncated) break;
    if (checksum && offset + 4 > buffer.length) {
      truncated = true;
      break;
    }
    if (checksum) offset += 4;
    frames.push({ start, end: offset });
  }
  return { frames, truncated };
}
function readJson(file) {
  try {
    return { ok: true, value: JSON.parse(readFileSync2(file, "utf8")), error: null };
  } catch (error) {
    return { ok: false, value: null, error };
  }
}
function readStable(file, attempts = 3) {
  let last = null;
  for (let i = 0; i < attempts; i++) {
    const before = statSync2(file);
    const buf = readFileSync2(file);
    const after = statSync2(file);
    last = {
      buf,
      mtimeMs: after.mtimeMs,
      ctimeMs: after.ctimeMs,
      size: after.size,
      ino: after.ino,
      stable: before.mtimeMs === after.mtimeMs && before.ctimeMs === after.ctimeMs && before.size === after.size && before.ino === after.ino
    };
    if (last.stable) return last;
  }
  return last;
}
function beijingDate(ms) {
  return new Date(ms + 8 * 3600 * 1e3);
}
function localDayKey(ms) {
  const d = beijingDate(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
function minutesOfDay(ms) {
  const d = beijingDate(ms);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}
function basename(p) {
  return (p || "").replace(/[/\\]+$/, "").split(/[/\\]/).pop() || "";
}
function objectRecord2(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function projectionRouteRows(route) {
  if (!objectRecord2(route)) return [];
  const rows = import_route_data.default.routeRows(route);
  return rows.filter((row) => objectRecord2(row) && (row.model === null || typeof row.model === "string" && row.model.trim()) && Number.isFinite(row.time) && row.time >= 0 && (row.slot === void 0 || Number.isSafeInteger(row.slot) && row.slot >= 0));
}
function nonNegativeNumber(value) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
function firstString(...values) {
  for (const value of values) if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}
function accountTypeOf(source, fallback = "api") {
  return firstString(source?.accountType, source?.account_type, source?.billingMode, source?.billing_mode, fallback) || "api";
}
function rawIdentity(providerId, modelRaw, accountType, at) {
  return normalizeIdentity(providerId || "unknown", modelRaw || "(unknown)", accountType || "api", at);
}
function identityKey(identity) {
  return [identity.providerId, identity.modelRaw, identity.accountType].join("\0");
}
function identityFields(identity) {
  return {
    providerId: identity.providerId,
    providerFamily: identity.providerFamily,
    modelRaw: identity.modelRaw,
    modelCanonical: identity.modelCanonical,
    accountType: identity.accountType
  };
}
function activityIntervals(times) {
  if (!times.length) return [];
  const intervals = [];
  let s = times[0], last = times[0];
  for (let i = 1; i < times.length; i++) {
    const t = times[i];
    if (t - last <= GAP_MS) last = t;
    else {
      intervals.push([s, last]);
      s = last = t;
    }
  }
  intervals.push([s, last]);
  return intervals.map(([a, b]) => [a, Math.max(b, a + MIN_INTERVAL_MS)]);
}
var sessionsDirCache = { home: null, at: 0, dirs: [] };
function sessionDirs(home) {
  const now = Date.now();
  if (sessionsDirCache.home !== home || now - sessionsDirCache.at > 5e3) {
    try {
      sessionsDirCache = { home, at: now, dirs: readdirSync2(join2(home, "sessions")) };
    } catch {
      sessionsDirCache = { home, at: now, dirs: [] };
    }
  }
  return sessionsDirCache.dirs;
}
function findSessionFile(home, sessionId) {
  if (typeof sessionId !== "string" || !sessionId) return null;
  let root;
  try {
    root = realpathSync(join2(home, "sessions"));
  } catch {
    return null;
  }
  const encodedId = encodeSegment(sessionId);
  const rawIdIsSafe = sessionId !== "." && sessionId !== ".." && !/[/\\\0]/.test(sessionId);
  for (const enc of sessionDirs(home)) {
    const dirIds = rawIdIsSafe && encodedId !== sessionId ? [encodedId, sessionId] : [encodedId];
    for (const dirId of dirIds) for (const suffix of ["session.v3.jsonl.zstd", "session.v3.jsonl", "session.v2.jsonl.zstd", "session.v2.jsonl", "session.v1.jsonl.zstd", "session.v1.jsonl", "session.jsonl.zstd", "session.jsonl"]) {
      const cand = join2(root, enc, dirId, suffix);
      try {
        const stat = lstatSync(cand);
        if (!stat.isFile() || stat.isSymbolicLink()) continue;
        const real = realpathSync(cand);
        const rel = relative(root, real);
        if (rel && rel !== ".." && !rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) && !isAbsolute(rel)) return real;
      } catch {
      }
    }
  }
  return null;
}
function encodeSegment(raw) {
  if (raw.length === 0) throw new Error("cannot encode an empty path segment");
  if (raw === ".") return "~002E";
  if (raw === "..") return "~002E~002E";
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    const ch = String.fromCharCode(code);
    out += ch !== "~" && /^[A-Za-z0-9._-]$/.test(ch) ? ch : `~${code.toString(16).toUpperCase().padStart(4, "0")}`;
  }
  return out;
}
function expandStorageRecord(record) {
  if (!record || typeof record !== "object") return [record];
  const type = record.type;
  if (type !== "text-chunks" && type !== "reasoning-chunks" && type !== "tool-call-chunks") return [record];
  const exactKeys = (value, keys2) => value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === keys2.length && keys2.every((key) => Object.prototype.hasOwnProperty.call(value, key));
  const data = record.data;
  const envelopeKeys = ["type", "seq0", "time0", "data"];
  if (!exactKeys(record, envelopeKeys) || !Number.isSafeInteger(record.seq0) || record.seq0 < 0 || !Number.isSafeInteger(record.time0)) {
    throw new Error("corrupt session log: malformed packed chunk envelope");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("corrupt session log: malformed packed chunk data");
  const membersKey = type === "tool-call-chunks" ? "args" : "texts";
  const members = data[membersKey];
  const keys = type === "tool-call-chunks" ? Object.prototype.hasOwnProperty.call(data, "name") ? ["turn", "step", "index", "id", "name", "dt", "args"] : ["turn", "step", "index", "id", "dt", "args"] : ["turn", "step", "index", "dt", "texts"];
  if (!exactKeys(data, keys) || !Number.isFinite(data.turn) || !Number.isFinite(data.step) || !Number.isFinite(data.index)) {
    throw new Error("corrupt session log: malformed packed chunk data");
  }
  if (!Array.isArray(members) || members.length === 0 || members.some((value) => typeof value !== "string")) throw new Error("corrupt session log: packed chunk members must be non-empty strings");
  if (!Array.isArray(data.dt) || data.dt.length !== members.length - 1 || data.dt.some((dt) => !Number.isSafeInteger(dt))) throw new Error("corrupt session log: invalid packed chunk offsets");
  if (type === "tool-call-chunks" && (typeof data.id !== "string" || Object.prototype.hasOwnProperty.call(data, "name") && typeof data.name !== "string")) throw new Error("corrupt session log: invalid packed tool call");
  if (!Number.isSafeInteger(record.seq0 + members.length - 1)) throw new Error("corrupt session log: packed chunk sequence overflow");
  let time = record.time0;
  return members.map((value, index) => {
    if (index > 0) {
      time += data.dt[index - 1];
      if (!Number.isSafeInteger(time)) throw new Error("corrupt session log: packed chunk time overflow");
    }
    let chunk;
    if (type === "text-chunks") chunk = { type: "text-delta", index: data.index, text: value };
    else if (type === "reasoning-chunks") chunk = { type: "reasoning-delta", index: data.index, text: value };
    else chunk = { type: "tool-call-delta", index: data.index, id: data.id, ...data.name !== void 0 ? { name: data.name } : {}, argumentsDelta: value };
    return { type: "assistant/chunk", seq: record.seq0 + index, time, data: { turn: data.turn, step: data.step, chunk } };
  });
}
function contextService(ctx, name) {
  try {
    if (!ctx) return null;
    if (typeof ctx.get === "function") {
      const value = ctx.get(name);
      if (value !== void 0) return value;
    }
    if (typeof ctx.reflect?.get === "function") {
      const value = ctx.reflect.get(name, false);
      if (value !== void 0) return value;
    }
    return ctx[name] || null;
  } catch {
    return null;
  }
}
function normalizeProjectionUsage(value) {
  const totals = objectRecord2(value?.totals) || value;
  if (!totals) return null;
  return {
    uncached: nonNegativeNumber(totals.uncachedInputTokens),
    output: nonNegativeNumber(totals.outputTokens),
    cacheRead: nonNegativeNumber(totals.cacheReadTokens),
    cacheWrite: nonNegativeNumber(totals.cacheWriteTokens),
    reasoning: 0
  };
}
function projectionCheckpoint(entry, sessionId, header, warnings, domainVersion) {
  const checkpoint = {};
  if (!objectRecord2(entry)) return checkpoint;
  if (domainVersion !== void 0 && domainVersion !== SESSION_PROJECTION_DOMAIN_VERSION) {
    warnings.push({ code: "SESSION_CACHE_DOMAIN_VERSION_UNSUPPORTED", sessionId, message: `projection cache domain version ${String(domainVersion)} is not supported` });
    return checkpoint;
  }
  const identity = objectRecord2(entry.identity);
  if (identity) {
    if (identity.id !== void 0 && identity.id !== sessionId) {
      warnings.push({ code: "SESSION_CACHE_IDENTITY_MISMATCH", sessionId, message: "projection cache identity id did not match the requested session" });
      return checkpoint;
    }
    if (header?.id && identity.id && identity.id !== header.id) return checkpoint;
    if (header?.cwd !== void 0 && identity.cwd !== void 0 && identity.cwd !== header.cwd) {
      warnings.push({ code: "SESSION_CACHE_CWD_MISMATCH", sessionId, message: "projection cache cwd did not match the session header" });
      return checkpoint;
    }
    if (header?.createdAt !== void 0 && identity.createdAt !== void 0 && identity.createdAt !== header.createdAt) {
      warnings.push({ code: "SESSION_CACHE_CREATED_AT_MISMATCH", sessionId, message: "projection cache createdAt did not match the session header" });
      return checkpoint;
    }
    for (const key of ["parentSession", "seedLength"]) {
      if (header?.[key] !== void 0 && identity[key] !== void 0 && identity[key] !== header[key]) {
        warnings.push({ code: "SESSION_CACHE_LIFECYCLE_MISMATCH", sessionId, message: `projection cache ${key} did not match the session lifecycle` });
        return checkpoint;
      }
    }
  }
  const rows = objectRecord2(entry.rows);
  if (!rows) return checkpoint;
  for (const [key, row] of Object.entries(rows)) {
    if (!objectRecord2(row) || !Number.isSafeInteger(row.ver) || row.ver < 0 || !Number.isSafeInteger(row.seq) || row.seq < -1) {
      warnings.push({ code: "SESSION_CACHE_ROW_INVALID", sessionId, message: `projection row ${key} had invalid ver/seq and was ignored` });
      continue;
    }
    if (PROJECTION_ROW_VERSIONS[key] !== void 0 && row.ver !== PROJECTION_ROW_VERSIONS[key]) {
      warnings.push({ code: "SESSION_CACHE_ROW_VERSION_UNSUPPORTED", sessionId, message: `projection row ${key} version ${row.ver} is not supported` });
      continue;
    }
    checkpoint[key] = { ver: row.ver, seq: row.seq, val: row.val };
  }
  return checkpoint;
}
function projectionLifecycleMismatch(route, ...expectedValues) {
  if (!objectRecord2(route)) return null;
  for (const key of ["parentSession", "seedLength"]) {
    if (route[key] === void 0) continue;
    for (const expected of expectedValues) {
      if (!objectRecord2(expected) || expected[key] === void 0) continue;
      if (route[key] !== expected[key]) return key;
    }
  }
  return null;
}
function inheritedCount(header, count) {
  if (Number.isSafeInteger(count) && count >= 0) return count;
  if (Number.isSafeInteger(header?.inheritedEventCount) && header.inheritedEventCount >= 0) return header.inheritedEventCount;
  return header?.parentSession && Number.isSafeInteger(header.seedLength) && header.seedLength >= 0 ? header.seedLength : 0;
}
function routeProjectionState(header = null, count) {
  return {
    origin: firstString(header?.origin),
    parentSession: firstString(header?.parentSession),
    seedLength: Number.isSafeInteger(header?.seedLength) && header.seedLength >= 0 ? header.seedLength : null,
    inheritedEventCount: inheritedCount(header, count),
    current: { providerId: "unknown", model: null, accountType: "api", serviceTier: "standard" },
    routeTree: {},
    last: null
  };
}
var validatedRouteRows = /* @__PURE__ */ new WeakSet();
var validatedRouteViews = /* @__PURE__ */ new WeakSet();
function routeProjectionSchema(value) {
  if (validatedRouteViews.has(value)) return value;
  const record = objectRecord2(value);
  if (!record || !objectRecord2(record.current) || !Array.isArray(record.routes)) throw new TypeError("invalid statsRoute projection");
  if (record.origin !== null && typeof record.origin !== "string") throw new TypeError("invalid statsRoute origin");
  if (record.parentSession !== null && typeof record.parentSession !== "string") throw new TypeError("invalid statsRoute parentSession");
  if (record.seedLength !== null && (!Number.isSafeInteger(record.seedLength) || record.seedLength < 0)) throw new TypeError("invalid statsRoute seedLength");
  if (typeof record.current.providerId !== "string" || record.current.model !== null && typeof record.current.model !== "string" || typeof record.current.accountType !== "string" || !["standard", "priority", "batch", "flex", "unknown"].includes(record.current.serviceTier)) throw new TypeError("invalid statsRoute current route");
  for (const row of record.routes) {
    if (validatedRouteRows.has(row)) continue;
    if (!objectRecord2(row) || row.model !== null && typeof row.model !== "string" || typeof row.providerId !== "string" || typeof row.accountType !== "string" || !["standard", "priority", "batch", "flex", "unknown"].includes(row.serviceTier) || !Number.isSafeInteger(row.slot) || row.slot < 0 || !Number.isFinite(row.time) || row.time < 0) throw new TypeError("invalid statsRoute row");
    for (const key of ["uncached", "output", "cacheRead", "cacheWrite", "reasoning", "contextTokens"]) if (!Number.isFinite(row[key]) || row[key] < 0) throw new TypeError("invalid statsRoute token count");
    if (!Number.isSafeInteger(row.count) || row.count < 1) throw new TypeError("invalid statsRoute request count");
    if (Object.isFrozen(row)) validatedRouteRows.add(row);
  }
  return value;
}
function routeProjectionStateSchema(value) {
  const record = objectRecord2(value);
  if (!record || !objectRecord2(record.routeTree) || !Number.isSafeInteger(record.inheritedEventCount) || record.inheritedEventCount < 0) throw new TypeError("invalid statsRoute state");
  routeProjectionSchema(routeProjectionView(record));
  if (record.last !== null) {
    if (!objectRecord2(record.last) || typeof record.last.key !== "string" || typeof record.last.routeKey !== "string") throw new TypeError("invalid statsRoute last sample");
    for (const field of ["uncached", "output", "cacheRead", "cacheWrite", "reasoning"]) {
      if (!Number.isFinite(record.last[field]) || record.last[field] < 0) throw new TypeError("invalid statsRoute last sample");
    }
  }
  return value;
}
function routeProjectionValueFromEntry(entry, sessionId, header, warnings, domainVersion) {
  if (domainVersion !== void 0 && domainVersion !== SESSION_PROJECTION_DOMAIN_VERSION) return null;
  const row = entry?.rows?.statsRoute;
  if (!objectRecord2(row) || !Object.prototype.hasOwnProperty.call(row, "val")) return null;
  const versioned = Object.prototype.hasOwnProperty.call(row, "ver") || Object.prototype.hasOwnProperty.call(row, "seq");
  if (versioned && (!Number.isSafeInteger(row.ver) || row.ver < 0 || !Number.isSafeInteger(row.seq) || row.seq < -1)) {
    warnings.push({ code: "SESSION_CACHE_ROW_INVALID", sessionId, message: "projection row statsRoute had invalid ver/seq and was ignored" });
    return null;
  }
  if (versioned && row.ver !== PROJECTION_ROW_VERSIONS.statsRoute) {
    warnings.push({ code: "SESSION_CACHE_ROW_VERSION_UNSUPPORTED", sessionId, message: `projection row statsRoute version ${String(row.ver)} is not supported` });
    return null;
  }
  const value = row.val;
  try {
    if (objectRecord2(value?.routeTree)) routeProjectionStateSchema(value);
    else if (!versioned) routeProjectionSchema({ ...value, routes: import_route_data.default.routeRows(value).map((row2) => ({
      ...row2,
      contextTokens: row2.contextTokens ?? row2.uncached + row2.cacheRead + row2.cacheWrite,
      count: row2.count ?? 1
    })) });
    else routeProjectionSchema(value);
  } catch {
    warnings.push({ code: "SESSION_CACHE_ROUTE_INVALID", sessionId, message: "projection row statsRoute was malformed and was ignored" });
    return null;
  }
  const lifecycleMismatch = projectionLifecycleMismatch(value, entry?.identity, header);
  if (lifecycleMismatch) {
    warnings.push({ code: "SESSION_CACHE_LIFECYCLE_MISMATCH", sessionId, message: `projection cache ${lifecycleMismatch} did not match the session lifecycle` });
    return null;
  }
  return value;
}
function routeProjectionRoute(config, current) {
  const requestedTier = firstString(config?.serviceTier, config?.service_tier);
  return {
    providerId: firstString(config?.provider, config?.providerId, config?.provider_id, current?.providerId) || "unknown",
    model: firstString(config?.model, current?.model),
    accountType: accountTypeOf(config, current?.accountType || "api"),
    serviceTier: import_pricing3.default.normalizeServiceTier(requestedTier || current?.serviceTier)
  };
}
function routeProjectionUsage(event) {
  if (event?.type === "assistant/chunk" && event.data?.chunk?.type === "usage") return event.data.chunk.usage || {};
  if (event?.type === "assistant/message" && event.data?.usage !== void 0) return event.data.usage || {};
  if (event?.type !== "assistant/message" && event?.type !== "assistant/attempt") return null;
  const stream = event.data?.stream;
  if (!Array.isArray(stream)) return null;
  for (let i = stream.length - 1; i >= 0; i--) {
    if (stream[i]?.type === "chunk" && stream[i].chunk?.type === "usage") return stream[i].chunk.usage || {};
  }
  return null;
}
function routeProjectionApply(state, event) {
  if (!event || typeof event !== "object") return state;
  if (event.type === "session") {
    return {
      ...state,
      origin: firstString(event.origin, state.origin),
      parentSession: firstString(event.parentSession, state.parentSession),
      seedLength: Number.isSafeInteger(event.seedLength) ? event.seedLength : state.seedLength,
      inheritedEventCount: Math.max(state.inheritedEventCount, inheritedCount(event))
    };
  }
  if (Number.isSafeInteger(event.seq) && event.seq < state.inheritedEventCount) return state;
  const key = Number.isSafeInteger(event.data?.turn) && Number.isSafeInteger(event.data?.step) ? event.data.turn + ":" + event.data.step : null;
  if (event.type === "llm/retry-started") return key !== null && state.last?.key === key ? { ...state, last: null } : state;
  let current = state.current;
  if (event.type === "request/header") {
    const header = event.data?.header;
    const config = header?.config;
    current = routeProjectionRoute({ ...config, provider: firstString(config?.provider, config?.providerId, config?.provider_id, header?.provider) }, current);
    return { ...state, current };
  }
  const usage = routeProjectionUsage(event);
  if (!usage || !Number.isFinite(event.time) || event.time < 0) return state;
  const source = event.data?.message?.source;
  const route = routeProjectionRoute(source, current);
  const sample = {
    uncached: nonNegativeNumber(usage.inputTokens),
    output: nonNegativeNumber(usage.outputTokens),
    cacheRead: nonNegativeNumber(usage.cacheReadTokens),
    cacheWrite: nonNegativeNumber(usage.cacheWriteTokens),
    reasoning: nonNegativeNumber(usage.reasoningTokens)
  };
  const contextTokens = sample.uncached + sample.cacheRead + sample.cacheWrite;
  const slot = Math.floor(event.time / SLOT_MS);
  const routeKey = JSON.stringify([route.providerId, route.model, route.accountType, route.serviceTier, slot, contextTokens, event.time]);
  const previous = key !== null && state.last?.key === key ? state.last : null;
  let routeTree = state.routeTree;
  if (previous) routeTree = import_route_data.default.updateRoute(routeTree, previous.routeKey, (row) => {
    if (!row || row.count <= 1) return null;
    const next = { ...row, count: row.count - 1 };
    for (const field of ["uncached", "output", "cacheRead", "cacheWrite", "reasoning"]) next[field] = Math.max(0, row[field] - previous[field]);
    return next;
  });
  routeTree = import_route_data.default.updateRoute(routeTree, routeKey, (row) => {
    const next = row ? { ...row, count: row.count + 1, time: Math.max(row.time, event.time) } : { ...route, slot, time: event.time, contextTokens, count: 1, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 };
    for (const field of ["uncached", "output", "cacheRead", "cacheWrite", "reasoning"]) next[field] += sample[field];
    return next;
  });
  return { ...state, current: route, routeTree, last: key === null ? null : { key, routeKey, ...sample } };
}
var routeViews = /* @__PURE__ */ new WeakMap();
function routeProjectionView(state) {
  let cached = routeViews.get(state.routeTree);
  if (!cached || !Object.isFrozen(state.routeTree)) {
    const routes2 = import_route_data.default.routeRows(state).map((row) => Object.isFrozen(row) ? row : Object.freeze({ ...row }));
    cached = { routes: Object.freeze(routes2), primary: import_route_data.default.primaryRoute(routes2, null) };
    if (Object.isFrozen(state.routeTree)) routeViews.set(state.routeTree, cached);
  }
  const { routes } = cached;
  const primary = cached.primary || state.current;
  const view = {
    origin: state.origin,
    parentSession: state.parentSession,
    seedLength: state.seedLength,
    inheritedEventCount: state.inheritedEventCount,
    current: Object.freeze({ providerId: primary.providerId, model: primary.model, accountType: primary.accountType, serviceTier: primary.serviceTier }),
    routes
  };
  routeProjectionSchema(view);
  Object.freeze(view);
  validatedRouteViews.add(view);
  return view;
}
var STATS_ROUTE_PROJECTION = Object.freeze({
  key: "statsRoute",
  stateVersion: 3,
  schema: { parse: routeProjectionSchema },
  stateSchema: { parse: routeProjectionStateSchema },
  init: routeProjectionState,
  apply: routeProjectionApply,
  view: routeProjectionView,
  wire: { viewSchema: { parse: routeProjectionSchema }, view: routeProjectionView }
});
function deriveSessionInfoFromEvents(rawEvents, header = null, quality = {}) {
  const events = [];
  let malformedRecords = 0;
  for (const raw of Array.isArray(rawEvents) ? rawEvents : []) {
    try {
      const expanded = expandStorageRecord(raw);
      for (const event of expanded) {
        if (!objectRecord2(event)) malformedRecords++;
        else events.push(event);
      }
    } catch {
      malformedRecords++;
    }
  }
  header = header || events.find((event) => event?.type === "session") || null;
  const seedMarker = events.find((event) => event?.type === "session/end-seed" && event.data?.inherited === true);
  const count = inheritedCount(header, quality.inheritedEventCount ?? seedMarker?.seq);
  const unknownSeed = header?.isSeeded === true && quality.inheritedEventCount === void 0 && !seedMarker && !Number.isSafeInteger(header.seedLength);
  const times = [];
  let currentModel = null;
  let currentProvider = "unknown";
  let currentAccountType = "api";
  let currentServiceTier = "standard";
  let origin = typeof header?.origin === "string" ? header.origin : null;
  let parentSession = typeof header?.parentSession === "string" ? header.parentSession : null;
  let seedLength = Number.isSafeInteger(header?.seedLength) && header.seedLength >= 0 ? header.seedLength : null;
  let firstOwnSeq = count;
  const usageByStep = /* @__PURE__ */ new Map();
  let lastUsage = null;
  const derived = emptyRaw();
  const slotStats = /* @__PURE__ */ new Map();
  const addSlot = (time, field, value) => {
    if (!Number.isFinite(time) || !value) return;
    const slot = Math.floor(time / SLOT_MS);
    const row = slotStats.get(slot) || { slot, turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0 };
    row[field] += value;
    slotStats.set(slot, row);
  };
  const addInterval = (field, start, end) => {
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
    const first = Math.floor(start / SLOT_MS), last = Math.floor((end - 1) / SLOT_MS);
    for (let slot = first; slot <= last; slot++) {
      const overlap = Math.min(end, (slot + 1) * SLOT_MS) - Math.max(start, slot * SLOT_MS);
      if (overlap > 0) addSlot(slot * SLOT_MS, field, overlap);
    }
  };
  let openStep = null;
  let lastTurn = null;
  const pendingCalls = /* @__PURE__ */ new Map();
  let derivedEvents = 0;
  let lastSeq = -1;
  let expectedSeq = 0;
  let seqGap = false;
  for (const ev of events) {
    const evSeq = ev?.seq;
    if (evSeq !== void 0 && (!Number.isSafeInteger(evSeq) || evSeq < 0)) {
      malformedRecords++;
      continue;
    }
    if (Number.isSafeInteger(evSeq)) {
      if (evSeq !== expectedSeq) {
        if (!(evSeq === firstOwnSeq && expectedSeq < firstOwnSeq)) seqGap = true;
      }
      if (evSeq >= expectedSeq) expectedSeq = evSeq + 1;
      lastSeq = Math.max(lastSeq, evSeq);
    }
    if (unknownSeed || evSeq !== void 0 && evSeq < firstOwnSeq) continue;
    const t = ev?.time;
    if (Object.prototype.hasOwnProperty.call(ev || {}, "time") && (!Number.isFinite(t) || t < 0)) {
      malformedRecords++;
      continue;
    }
    if (Number.isFinite(t)) times.push(t);
    if (!ev || typeof ev !== "object") continue;
    const usage = routeProjectionUsage(ev);
    const stepKey = Number.isSafeInteger(ev.data?.turn) && Number.isSafeInteger(ev.data?.step) ? ev.data.turn + ":" + ev.data.step : null;
    if (ev.type === "llm/retry-started" && lastUsage?.stepKey === stepKey) lastUsage = null;
    if (usage && Number.isFinite(t)) {
      if (stepKey === null) malformedRecords++;
      const source = ev.data?.message?.source;
      const route = routeProjectionRoute(source, { model: currentModel, providerId: currentProvider, accountType: currentAccountType, serviceTier: currentServiceTier });
      currentModel = route.model;
      currentProvider = route.providerId;
      currentAccountType = route.accountType;
      currentServiceTier = route.serviceTier;
      const key = stepKey !== null && lastUsage?.stepKey === stepKey ? lastUsage.key : usageByStep.size;
      usageByStep.set(key, {
        time: t,
        ...route,
        uncached: nonNegativeNumber(usage.inputTokens),
        output: nonNegativeNumber(usage.outputTokens),
        cacheRead: nonNegativeNumber(usage.cacheReadTokens),
        cacheWrite: nonNegativeNumber(usage.cacheWriteTokens),
        reasoning: nonNegativeNumber(usage.reasoningTokens)
      });
      lastUsage = stepKey === null ? null : { stepKey, key };
    }
    if (ev.type === "session") {
      if (ev.origin != null && typeof ev.origin !== "string" || ev.parentSession != null && typeof ev.parentSession !== "string" || ev.seedLength != null && (!Number.isSafeInteger(ev.seedLength) || ev.seedLength < 0)) malformedRecords++;
      origin = typeof ev.origin === "string" ? ev.origin : origin;
      parentSession = typeof ev.parentSession === "string" ? ev.parentSession : parentSession;
      seedLength = Number.isSafeInteger(ev.seedLength) && ev.seedLength >= 0 ? ev.seedLength : seedLength;
      firstOwnSeq = Math.max(firstOwnSeq, inheritedCount(ev));
    } else if (ev.type === "request/header") {
      const config = ev.data?.header?.config;
      if (config?.model) currentModel = config.model;
      const provider = firstString(config?.provider, config?.providerId, config?.provider_id, ev.data?.header?.provider);
      if (provider) currentProvider = provider;
      currentAccountType = accountTypeOf(config, currentAccountType);
      currentServiceTier = import_pricing3.default.normalizeServiceTier(config?.serviceTier || config?.service_tier);
    } else if (ev.type === "step/start") {
      openStep = Number.isFinite(t) ? { turn: ev.data?.turn, step: ev.data?.step, startTime: t, firstTokenTime: null } : null;
    } else if (ev.type === "assistant/chunk") {
      if (openStep && openStep.turn === ev.data?.turn && openStep.step === ev.data?.step && openStep.firstTokenTime === null && Number.isFinite(t) && isTokenDelta(ev.data?.chunk)) openStep.firstTokenTime = t;
    } else if (ev.type === "assistant/message" || ev.type === "assistant/attempt") {
      const u = usage;
      if (openStep && openStep.turn === ev.data?.turn && openStep.step === ev.data?.step && openStep.firstTokenTime === null) openStep.firstTokenTime = streamFirstTokenTime(ev.data?.stream);
      if (ev.type === "assistant/attempt") continue;
      if (openStep && openStep.turn === ev.data?.turn && openStep.step === ev.data?.step && Number.isFinite(t)) {
        const llm = Math.max(0, t - openStep.startTime);
        derived.llmMs += llm;
        addInterval("llmMs", openStep.startTime, t);
        if (openStep.firstTokenTime !== null) {
          const ttft = Math.max(0, openStep.firstTokenTime - openStep.startTime);
          derived.ttftMs += ttft;
          derived.ttftSteps++;
          addSlot(openStep.firstTokenTime, "ttftMs", ttft);
          addSlot(openStep.firstTokenTime, "ttftSteps", 1);
          const out = Number.isFinite(u?.outputTokens) && u.outputTokens >= 0 ? u.outputTokens : null;
          if (out !== null) {
            const decode = Math.max(0, t - openStep.firstTokenTime);
            derived.decodeMs += decode;
            derived.decodeTokens += out;
            addInterval("decodeMs", openStep.firstTokenTime, t);
            addSlot(t, "decodeTokens", out);
          }
        }
        derivedEvents++;
        openStep = null;
      }
    } else if (ev.type === "tool/call") {
      const callId = ev.data?.callId;
      if (typeof callId === "string" && Number.isFinite(t)) pendingCalls.set(callId, t);
    } else if (ev.type === "tool/result") {
      const callId = ev.data?.message?.source?.callId;
      if (typeof callId === "string" && pendingCalls.has(callId) && Number.isFinite(t)) {
        const start = pendingCalls.get(callId);
        const tool = Math.max(0, t - start);
        derived.toolMs += tool;
        addInterval("toolMs", start, t);
        pendingCalls.delete(callId);
        derivedEvents++;
      }
    } else if (ev.type === "step/end") {
      derived.steps++;
      addSlot(t, "steps", 1);
      derivedEvents++;
      if (lastTurn !== ev.data?.turn) {
        derived.turns++;
        addSlot(t, "turns", 1);
        lastTurn = ev.data?.turn;
      }
      openStep = null;
    } else if (ev.type === "turn/end") pendingCalls.clear();
  }
  times.sort((a, b) => a - b);
  const modelTokens = /* @__PURE__ */ new Map();
  for (const u of usageByStep.values()) {
    const identity = rawIdentity(u.providerId, u.model, u.accountType, u.time);
    const key = identityKey(identity);
    const row = modelTokens.get(key) || { identity, weight: 0 };
    row.weight += (u.cacheRead || 0) + (u.cacheWrite || 0) + (u.output || 0) + (u.uncached || 0);
    modelTokens.set(key, row);
  }
  let primary = null, modelWeight = -1;
  for (const row of modelTokens.values()) if (row.weight > modelWeight) {
    modelWeight = row.weight;
    primary = row.identity;
  }
  if (primary === null) primary = rawIdentity(currentProvider, currentModel, currentAccountType, times[times.length - 1]);
  return {
    times,
    lastTime: times.length ? times[times.length - 1] : null,
    model: primary.modelRaw === "(unknown)" ? null : primary.modelRaw,
    providerId: primary.providerId,
    accountType: primary.accountType,
    usages: [...usageByStep.values()],
    origin,
    parentSession,
    seedLength,
    inheritedEventCount: count,
    stats: derivedEvents ? derived : null,
    slotStats: [...slotStats.values()].sort((a, b) => a.slot - b.slot),
    partial: Boolean(quality.partial) || malformedRecords > 0 || events.length === 0 && !header || seqGap || unknownSeed || header?.version !== void 0 && ![0, 1, 2, 3].includes(header.version),
    stale: Boolean(quality.stale),
    missing: false,
    unavailable: false,
    malformedRecords,
    lastSeq,
    seqGap,
    unknownSeed,
    formatVersion: header?.version,
    futureVersion: header?.version !== void 0 && ![0, 1, 2, 3].includes(header.version),
    header: header || null
  };
}
var officialReadCaches = /* @__PURE__ */ new WeakMap();
function officialReadCache(owner) {
  let cache = officialReadCaches.get(owner);
  if (!cache) {
    cache = { entries: /* @__PURE__ */ new Map(), weight: 0 };
    officialReadCaches.set(owner, cache);
  }
  return cache;
}
function forgetOfficialRead(cache, id) {
  const old = cache.entries.get(id);
  if (old) cache.weight -= old.weight;
  cache.entries.delete(id);
}
function rememberOfficialRead(cache, id, entry) {
  forgetOfficialRead(cache, id);
  if (entry.weight > 1e5) return;
  cache.entries.set(id, entry);
  cache.weight += entry.weight;
  while (cache.entries.size > 128 || cache.weight > 1e5) forgetOfficialRead(cache, cache.entries.keys().next().value);
}
async function officialReadRevision(ctx, id, warnings) {
  const sessions = contextService(ctx, "sessions");
  if (sessions?.get?.(id)) return null;
  if (contextService(ctx, "sessionQuery") && typeof sessions?.get !== "function") return null;
  const persistence = contextService(ctx, "sessionPersistence");
  if (typeof persistence?.stat !== "function") return null;
  try {
    const observed = await persistence.stat(id);
    if (typeof observed?.revision !== "string" || !observed.revision || !objectRecord2(observed.header)) return null;
    return JSON.stringify([observed.revision, observed.header]);
  } catch (error) {
    warnings.push({ code: "OFFICIAL_REVISION_FAILED", sessionId: id, message: error?.message || String(error) });
    return null;
  }
}
async function officialSessionSource(ctx, sessionId) {
  const normalize = (loaded, source, liveSession) => {
    if (!loaded || !Array.isArray(loaded.events)) return null;
    const header = loaded.header || loaded.meta || loaded.session;
    return { header, inheritedEventCount: inheritedCount(header, loaded.inheritedEventCount), events: loaded.events, source, liveSession };
  };
  const live = contextService(ctx, "sessions")?.get?.(sessionId);
  if (live) {
    const events = typeof live.snapshotEvents === "function" ? live.snapshotEvents() : live.events;
    if (Array.isArray(events)) return normalize({ header: live.header, inheritedEventCount: live.inheritedEventCount, events }, "live", live);
  }
  const query = contextService(ctx, "sessionQuery");
  if (typeof query?.readSession === "function") {
    const result = normalize(await query.readSession(sessionId), "sessionQuery");
    if (result) return result;
  }
  const persistence = contextService(ctx, "sessionPersistence");
  for (const method of ["inspect", "load"]) if (typeof persistence?.[method] === "function") {
    const result = normalize(await persistence[method](sessionId), "sessionPersistence");
    if (result) return result;
  }
  if (typeof persistence?.open === "function") {
    const handle = await persistence.open(sessionId, "read");
    try {
      const loaded = await handle.read();
      return normalize({ ...loaded, header: handle.header, inheritedEventCount: handle.inheritedEventCount }, "sessionPersistence");
    } finally {
      await handle.close();
    }
  }
  return null;
}
async function officialProjectionValues(ctx, source, entry, warnings, sessionId, domainVersion) {
  const projections = contextService(ctx, "sessionProjections");
  const projectionCache = contextService(ctx, "sessionProjectionCache");
  try {
    if (source?.source === "live" && source.liveSession && typeof projections?.snapshot === "function") {
      return projections.snapshot(source.liveSession)?.values || null;
    }
    const needsSource = projectionCache?.coldSnapshot?.length >= 2 || projections?.restore?.length >= 4;
    if (needsSource && !source) return null;
    if (projectionCache && typeof projectionCache.coldSnapshot === "function") {
      try {
        const snapshot = needsSource ? await projectionCache.coldSnapshot(source.header, source.inheritedEventCount, source.events) : await projectionCache.coldSnapshot(sessionId);
        const snapshotSeq = snapshot?.asOfSeq;
        const snapshotDomain = snapshot?.domain ?? snapshot?.unit;
        const snapshotVersion = snapshot?.version;
        const snapshotIdentity = objectRecord2(snapshot?.identity);
        const expectedIdentity = objectRecord2(entry?.identity) || objectRecord2(source?.header);
        const lifecycleMismatch = projectionLifecycleMismatch(snapshot?.values?.statsRoute, entry?.identity, source?.header);
        const identityMismatch = snapshotIdentity && expectedIdentity && (snapshotIdentity.id !== void 0 && expectedIdentity.id !== void 0 && snapshotIdentity.id !== expectedIdentity.id || snapshotIdentity.createdAt !== void 0 && expectedIdentity.createdAt !== void 0 && snapshotIdentity.createdAt !== expectedIdentity.createdAt || snapshotIdentity.cwd !== void 0 && expectedIdentity.cwd !== void 0 && snapshotIdentity.cwd !== expectedIdentity.cwd);
        if (snapshotDomain !== void 0 && snapshotDomain !== "session_projcache") {
          warnings.push({ code: "SESSION_CACHE_DOMAIN_MISMATCH", sessionId, message: "official projection snapshot belonged to a different domain" });
        } else if (identityMismatch) {
          warnings.push({ code: "SESSION_CACHE_IDENTITY_MISMATCH", sessionId, message: "official projection snapshot identity did not match the requested lifecycle" });
        } else if (lifecycleMismatch) {
          warnings.push({ code: "SESSION_CACHE_LIFECYCLE_MISMATCH", sessionId, message: `official projection snapshot ${lifecycleMismatch} did not match the session lifecycle` });
        } else if (snapshotVersion !== void 0 && snapshotVersion !== SESSION_PROJECTION_DOMAIN_VERSION) {
          warnings.push({ code: "SESSION_CACHE_DOMAIN_VERSION_UNSUPPORTED", sessionId, message: `official projection snapshot version ${String(snapshotVersion)} is not supported` });
        } else if (snapshotSeq !== void 0 && (!Number.isSafeInteger(snapshotSeq) || snapshotSeq < -1)) {
          warnings.push({ code: "SESSION_CACHE_WATERMARK_INVALID", sessionId, message: "official projection snapshot watermark was invalid" });
        } else if (snapshot?.values && typeof snapshot.values === "object" && !Array.isArray(snapshot.values)) {
          warnings.push({ code: "OFFICIAL_PROJECTION_CACHE_USED", sessionId, message: "projection values loaded through sessionProjectionCache coldSnapshot" });
          return snapshot.values;
        }
      } catch (error) {
        warnings.push({ code: "OFFICIAL_PROJECTION_CACHE_FAILED", sessionId, message: error?.message || String(error) });
      }
    }
    if (!projections) return null;
    const persistence = contextService(ctx, "sessionPersistence");
    if (persistence && typeof persistence.readFrom === "function" && typeof projections.restore === "function" && typeof projections.restoreFloor === "function") {
      const checkpoint = projectionCheckpoint(entry, sessionId, source?.header, warnings, domainVersion);
      const floor = projections.restoreFloor(checkpoint);
      if (floor !== void 0) {
        const suffix = await persistence.readFrom(sessionId, floor);
        if (suffix && Array.isArray(suffix.events)) {
          const header = source?.header || suffix.header || suffix.meta || suffix.session || entry?.identity;
          const restored = projections.restore(checkpoint, suffix.events, floor, header, inheritedCount(header, suffix.inheritedEventCount ?? source?.inheritedEventCount));
          return restored?.snapshot?.values || null;
        }
      }
    }
    if (typeof projections.restore === "function" && source?.events) {
      const checkpoint = projectionCheckpoint(entry, sessionId, source.header, warnings, domainVersion);
      const restored = projections.restore(checkpoint, source.events, 0, source.header, source.inheritedEventCount);
      return restored?.snapshot?.values || null;
    }
  } catch (error) {
    warnings.push({ code: "OFFICIAL_PROJECTION_FAILED", sessionId, message: error?.message || String(error) });
  }
  return null;
}
function infoFromProjectionValues(values, entry) {
  const metadata = objectRecord2(values?.sessionListMetadata) || objectRecord2(entry?.rows?.sessionListMetadata?.val) || {};
  const identity = objectRecord2(entry?.identity) || {};
  const createdAt = Number.isFinite(identity.createdAt) && identity.createdAt >= 0 ? identity.createdAt : null;
  const lastPromptAt = Number.isFinite(metadata.lastPromptAt) && metadata.lastPromptAt >= 0 ? metadata.lastPromptAt : null;
  const routeProjection = objectRecord2(values?.statsRoute);
  const routeRows = projectionRouteRows(routeProjection);
  const routeTimes = routeRows.map((row) => row.time).filter((value) => Number.isFinite(value) && value >= 0);
  const times = [createdAt, lastPromptAt, ...routeTimes].filter((value, index, list) => value !== null && list.indexOf(value) === index).sort((a, b) => a - b);
  const usages = routeRows.map((row) => ({
    time: row.time,
    model: row.model,
    providerId: firstString(row.providerId) || "unknown",
    accountType: accountTypeOf(row, "api"),
    serviceTier: import_pricing3.default.normalizeServiceTier(row.serviceTier),
    contextTokens: Number.isFinite(row.contextTokens) ? row.contextTokens : void 0,
    count: Number.isSafeInteger(row.count) && row.count > 0 ? row.count : 1,
    pricingIncomplete: !Number.isFinite(row.contextTokens) || !Number.isSafeInteger(row.count) || row.count > 1,
    uncached: nonNegativeNumber(row.uncached),
    output: nonNegativeNumber(row.output),
    cacheRead: nonNegativeNumber(row.cacheRead),
    cacheWrite: nonNegativeNumber(row.cacheWrite),
    reasoning: nonNegativeNumber(row.reasoning)
  }));
  const current = import_route_data.default.primaryRoute(usages, objectRecord2(routeProjection?.current) || {});
  return {
    times,
    lastTime: times.length ? times.at(-1) : null,
    model: firstString(current.model, metadata.model, identity.model),
    providerId: firstString(current.providerId, metadata.providerId, identity.providerId) || "unknown",
    accountType: firstString(current.accountType, metadata.accountType, identity.accountType) || "api",
    usages,
    origin: firstString(routeProjection?.origin, metadata.origin, identity.origin),
    parentSession: firstString(routeProjection?.parentSession, metadata.parentSession, identity.parentSession),
    seedLength: Number.isSafeInteger(routeProjection?.seedLength) && routeProjection.seedLength >= 0 ? routeProjection.seedLength : Number.isSafeInteger(metadata.seedLength) && metadata.seedLength >= 0 ? metadata.seedLength : null,
    stats: objectRecord2(values?.sessionStats),
    slotStats: [],
    partial: true,
    cacheOnly: true,
    stale: false,
    missing: false,
    unavailable: false,
    seqGap: false,
    futureVersion: false,
    lastSeq: -1
  };
}
function isTokenDelta(chunk) {
  if (!chunk || typeof chunk !== "object") return false;
  if (chunk.type === "text-delta" || chunk.type === "reasoning-delta") return typeof chunk.text === "string" && chunk.text !== "";
  return chunk.type === "tool-call-delta" && (typeof chunk.argumentsDelta === "string" && chunk.argumentsDelta !== "" || chunk.name !== void 0);
}
function streamFirstTokenTime(stream) {
  for (const record of Array.isArray(stream) ? stream : []) {
    if (record?.type === "chunk") {
      if (Number.isFinite(record.time) && isTokenDelta(record.chunk)) return record.time;
    } else if (["text-chunks", "reasoning-chunks", "tool-call-chunks"].includes(record?.type)) {
      let time = record.time0;
      const fragments = record.type === "tool-call-chunks" ? record.args : record.texts;
      for (let i = 0; i < (Array.isArray(fragments) ? fragments.length : 0); i++) {
        if (i > 0) time += record.dt?.[i - 1];
        if (Number.isFinite(time) && (fragments[i] !== "" || record.name !== void 0)) return time;
      }
    }
  }
  return null;
}
function readSessionRecords(file, snapshot) {
  const records = [];
  let truncated = false;
  if (file.endsWith(".jsonl")) {
    const text = snapshot.buf.toString("utf8");
    const lines = text.split("\n");
    if (lines.length && lines.at(-1) !== "") {
      truncated = true;
      lines.pop();
    }
    for (const line of lines) {
      if (!line) continue;
      try {
        records.push(JSON.parse(line));
      } catch {
        records.push(null);
      }
    }
    return { records, truncated };
  }
  const scanned = scanZstdFrames(snapshot.buf);
  truncated = scanned.truncated;
  for (const frame of scanned.frames) {
    const text = zstdDecompressSync(snapshot.buf.subarray(frame.start, frame.end)).toString("utf8");
    const lines = text.split("\n");
    if (lines.at(-1) !== "") truncated = true;
    for (const line of lines) {
      if (!line) continue;
      try {
        records.push(JSON.parse(line));
      } catch {
        records.push(null);
      }
    }
  }
  return { records, truncated };
}
var sessionInfoCache = /* @__PURE__ */ new Map();
var SESSION_CACHE_LIMIT = 300;
function sessionInfo(home, sessionId) {
  const file = findSessionFile(home, sessionId);
  if (!file) return { times: [], lastTime: null, model: null, providerId: "unknown", accountType: "api", usages: [], origin: null, parentSession: null, seedLength: null, stats: null, slotStats: [], partial: false, stale: false, missing: true, seqGap: false, futureVersion: false, header: null };
  const cached = sessionInfoCache.get(file);
  let snapshot;
  try {
    const stat = statSync2(file);
    if (cached?.stable && ["mtimeMs", "ctimeMs", "size", "ino"].every((key) => cached[key] === stat[key])) {
      sessionInfoCache.delete(file);
      sessionInfoCache.set(file, cached);
      return cached.info;
    }
    snapshot = readStable(file);
  } catch (error) {
    if (cached) return { ...cached.info, stale: true, readError: error.message };
    throw error;
  }
  const { mtimeMs, ctimeMs, size, ino } = snapshot;
  const decoded = readSessionRecords(file, snapshot);
  const info = deriveSessionInfoFromEvents(decoded.records, null, { partial: decoded.truncated || !snapshot.stable });
  sessionInfoCache.set(file, { mtimeMs, ctimeMs, size, ino, stable: snapshot.stable, info });
  while (sessionInfoCache.size > SESSION_CACHE_LIMIT) {
    const oldest = sessionInfoCache.keys().next().value;
    sessionInfoCache.delete(oldest);
  }
  return info;
}
function emptyRaw() {
  return { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 };
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
  a.reasoning += b.reasoning;
}
function slotDurations(times) {
  const slotMs = /* @__PURE__ */ new Map();
  for (const [s, e] of activityIntervals(times)) {
    const startSlot = Math.floor(s / SLOT_MS);
    const endSlot = Math.floor(e / SLOT_MS);
    for (let k = startSlot; k <= endSlot; k++) {
      const overlap = Math.min(e, (k + 1) * SLOT_MS) - Math.max(s, k * SLOT_MS);
      if (overlap > 0) slotMs.set(k, (slotMs.get(k) || 0) + overlap);
    }
  }
  return [...slotMs.entries()].map(([slot, ms]) => ({ slot, ms }));
}
function slotUsages(usages, engine = import_pricing3.default) {
  const m = /* @__PURE__ */ new Map();
  for (const u of usages) {
    const k = Math.floor(u.time / SLOT_MS);
    const identity = rawIdentity(u.providerId, u.model, u.accountType, u.time);
    const serviceTier = import_pricing3.default.normalizeServiceTier(u.serviceTier);
    const contextTokens = Number.isFinite(u.contextTokens) ? u.contextTokens : u.uncached + u.cacheRead + u.cacheWrite;
    const contextOver512k = contextTokens > LONG_CONTEXT_TOKENS;
    const key = identityKey(identity) + "\0" + serviceTier + "\0" + contextTokens + "\0" + k + "\0" + u.time;
    const cur = m.get(key) || {
      model: identity.modelRaw,
      time: u.time,
      ...identityFields(identity),
      serviceTier,
      contextTokens,
      contextOver512k,
      slot: k,
      uncached: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      reasoning: 0
    };
    cur.uncached += u.uncached;
    cur.output += u.output;
    cur.cacheRead += u.cacheRead;
    cur.cacheWrite += u.cacheWrite;
    cur.reasoning += u.reasoning;
    if (u.pricingIncomplete) cur.pricingIncomplete = true;
    m.set(key, cur);
  }
  return [...m.values()].map(({ pricingIncomplete, ...row }) => ({ ...row, cost: engine.convertCostToCny(engine.priceUsage({ ...row, pricingIncomplete }, row)) }));
}
function modelUsages(rows) {
  const grouped = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const identity = rawIdentity(row.providerId, row.modelRaw || row.model, row.accountType, row.slot * SLOT_MS);
    const key = identityKey(identity);
    const current = grouped.get(key) || {
      model: identity.modelRaw,
      ...identityFields(identity),
      uncached: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      reasoning: 0,
      _costs: []
    };
    current.uncached += row.uncached || 0;
    current.output += row.output || 0;
    current.cacheRead += row.cacheRead || 0;
    current.cacheWrite += row.cacheWrite || 0;
    current.reasoning += row.reasoning || 0;
    current._costs.push(convertCostToCny(row.cost || priceUsage(row, row)));
    grouped.set(key, current);
  }
  return [...grouped.values()].map(({ _costs, ...row }) => ({ ...row, cost: summarizeCostsCny(_costs) }));
}
function projectionSlotUsage(info, usage, updatedAt, engine = import_pricing3.default) {
  const identity = rawIdentity(info.providerId, info.model, info.accountType, updatedAt);
  const contextTokens = usage.uncached + usage.cacheRead + usage.cacheWrite;
  const row = {
    model: identity.modelRaw,
    ...identityFields(identity),
    serviceTier: "standard",
    contextTokens,
    contextOver512k: contextTokens > LONG_CONTEXT_TOKENS,
    slot: Math.floor(updatedAt / SLOT_MS),
    ...usage
  };
  return { ...row, cost: engine.convertCostToCny(engine.priceUsage({ ...row, pricingIncomplete: true }, row)) };
}
var StatsService = (() => {
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
        kind: "method",
        name: "pricing",
        static: false,
        private: false,
        access: { has: (obj) => "pricing" in obj, get: (obj) => obj.pricing },
        metadata: _metadata
      }, null, _instanceExtraInitializers);
      if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    }
    constructor(ctx) {
      super(ctx, "stats");
      __runInitializers(this, _instanceExtraInitializers);
      if (typeof ctx?.effect === "function") ctx.effect(() => {
        const store = pricingStore(this, dshHome());
        this._pricingAuto = true;
        void store.refresh();
        const timer = setInterval(() => {
          void store.refresh();
        }, 36e5);
        timer.unref?.();
        return () => {
          this._pricingAuto = false;
          clearInterval(timer);
          store.close();
        };
      }, "dsh-stats: pricing updates");
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
      const officialProjectionAvailable = typeof projectionCache?.coldSnapshot === "function" || typeof sessionProjections?.restoreFloor === "function" && typeof persistence?.readFrom === "function";
      let wsRead = { ok: false, value: null, error: null };
      let sessionsRead = { ok: false, value: null, error: null };
      let wsJson = null;
      if (!officialWorkspaceAvailable) {
        wsRead = readJson(join2(home, "storages", "workspace.json"));
        if (!wsRead.ok) warnings.push({ code: "WORKSPACE_READ_FAILED", message: wsRead.error?.message || "workspace storage read failed" });
        wsJson = wsRead.value;
      }
      if (!officialProjectionAvailable) {
        sessionsRead = readJson(join2(home, "storages", "session_projcache.json"));
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
        wsRead = readJson(join2(home, "storages", "workspace.json"));
        if (!wsRead.ok) warnings.push({ code: "WORKSPACE_READ_FAILED", message: wsRead.error?.message || "workspace storage read failed" });
        wsJson = wsRead.value;
      }
      const rawWorkspaces = wsJson?.tables?.workspaces;
      const workspaces = objectRecord2(rawWorkspaces) || {};
      if (wsRead.ok && !objectRecord2(rawWorkspaces)) warnings.push({ code: "WORKSPACE_SHAPE_INVALID", message: "workspace table was missing or not an object; invalid entries were ignored" });
      const rawArchivedIds = wsJson?.global?.archivedSessionIds;
      if (wsRead.ok && rawArchivedIds !== void 0 && !Array.isArray(rawArchivedIds)) warnings.push({ code: "ARCHIVED_IDS_SHAPE_INVALID", message: "archivedSessionIds was not an array; the value was ignored" });
      const archivedSet = new Set((Array.isArray(rawArchivedIds) ? rawArchivedIds : []).filter((id) => typeof id === "string" && id));
      const rawSessionsTable = sessionsRead.value?.tables?.sessions;
      const sessionsTable = objectRecord2(rawSessionsTable) || {};
      const projectionDomainVersion = sessionsRead.value?.unit?.version;
      if (projectionDomainVersion !== void 0 && projectionDomainVersion !== SESSION_PROJECTION_DOMAIN_VERSION) warnings.push({ code: "SESSION_CACHE_DOMAIN_VERSION_UNSUPPORTED", message: `projection cache domain version ${String(projectionDomainVersion)} is not supported` });
      if (sessionsRead.ok && !objectRecord2(rawSessionsTable)) warnings.push({ code: "SESSION_TABLE_SHAPE_INVALID", message: "session projection table was missing or not an object; the value was ignored" });
      let persistedHeaders = [];
      let sessionListResolved = false;
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
      const seen = /* @__PURE__ */ new Set();
      const workspaceEntries = [];
      for (const [wsId, ws] of Object.entries(workspaces)) {
        if (!objectRecord2(ws)) {
          warnings.push({ code: "WORKSPACE_ENTRY_INVALID", message: `workspace ${wsId} was not an object and was ignored` });
          continue;
        }
        const rawSessionIds = ws.sessionIds;
        if (rawSessionIds !== void 0 && !Array.isArray(rawSessionIds)) warnings.push({ code: "SESSION_IDS_SHAPE_INVALID", message: `workspace ${wsId} sessionIds was not an array; the value was ignored` });
        const sessionIds = [];
        const localIds = /* @__PURE__ */ new Set();
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
        if (ws.title !== void 0 && typeof ws.title !== "string") warnings.push({ code: "WORKSPACE_METADATA_INVALID", message: `workspace ${wsId} title was not a string` });
        if (ws.path !== void 0 && typeof ws.path !== "string") warnings.push({ code: "WORKSPACE_METADATA_INVALID", message: `workspace ${wsId} path was not a string` });
        workspaceEntries.push({ wsId, ws: { title, path }, sessionIds });
      }
      const memberships = /* @__PURE__ */ new Map();
      for (const entry of workspaceEntries) for (const sessionId of entry.sessionIds) {
        const owners = memberships.get(sessionId) || [];
        owners.push(entry);
        memberships.set(sessionId, owners);
      }
      const ownerBySession = /* @__PURE__ */ new Map();
      for (const [sessionId, owners] of memberships) {
        const cwd = sessionsTable[sessionId]?.identity?.cwd;
        const owner = owners.find((entry) => typeof cwd === "string" && cwd && entry.ws.path === cwd) || owners[0];
        ownerBySession.set(sessionId, owner.wsId);
        if (owners.length > 1) warnings.push({ code: "SESSION_MULTIPLE_WORKSPACES", sessionId, message: `session ${sessionId} belonged to multiple workspaces and was counted only in ${owner.wsId}` });
      }
      const processSession = async (sessionId, cwdFallback) => {
        seen.add(sessionId);
        const entry = sessionsTable[sessionId];
        let statsRow = objectRecord2(entry?.rows?.sessionStats?.val);
        let usageTotals = objectRecord2(entry?.rows?.tokenUsage?.val?.totals);
        const rawTitle = entry?.rows?.title?.val;
        let title = typeof rawTitle === "string" ? rawTitle : null;
        let meta = objectRecord2(entry?.rows?.sessionListMetadata?.val) || {};
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
        const reuseRead = revision !== null && cachedRead?.revision === revision && cachedRead.metadataKey === metadataKey && readServices.every((service, index) => service === cachedRead.services[index]);
        if (reuseRead) {
          ({ info, officialSource, officialValues } = structuredClone(cachedRead.value));
          warnings.push(...cachedRead.warnings.map((row) => ({ ...row })));
        } else {
          forgetOfficialRead(readCache, sessionId);
          const warningStart = warnings.length;
          if (!liveSession && officialProjectionAvailable) {
            try {
              officialValues = await officialProjectionValues(hostCtx, null, entry, warnings, sessionId, projectionDomainVersion);
            } catch (error) {
              warnings.push({ code: "OFFICIAL_PROJECTION_FAILED", sessionId, message: error?.message || String(error) });
            }
          }
          const routeProjectionAvailable = objectRecord2(officialValues?.statsRoute) !== null;
          const projectionValuesAvailable = objectRecord2(officialValues) !== null && (objectRecord2(officialValues?.sessionStats) !== null || objectRecord2(officialValues?.tokenUsage) !== null || routeProjectionAvailable);
          if (!liveSession && projectionValuesAvailable) {
            info = infoFromProjectionValues(officialValues, entry);
            if (objectRecord2(officialValues?.sessionStats)) statsRow = officialValues.sessionStats;
            const officialUsage = normalizeProjectionUsage(officialValues?.tokenUsage);
            if (officialUsage) usageTotals = {
              uncachedInputTokens: officialUsage.uncached,
              outputTokens: officialUsage.output,
              cacheReadTokens: officialUsage.cacheRead,
              cacheWriteTokens: officialUsage.cacheWrite
            };
            cacheOnly = true;
            warnings.push({ code: routeProjectionAvailable ? "OFFICIAL_ROUTE_PROJECTION_USED" : "OFFICIAL_PROJECTION_VALUES_USED", sessionId, message: routeProjectionAvailable ? "model route and token buckets came from the official projection cache" : "session statistics and token usage came from the official projection cache" });
          } else try {
            officialSource = await officialSessionSource(hostCtx, sessionId);
            if (officialSource) {
              info = deriveSessionInfoFromEvents(officialSource.events, officialSource.header, { inheritedEventCount: officialSource.inheritedEventCount });
              if (!officialValues) officialValues = await officialProjectionValues(hostCtx, officialSource, entry, warnings, sessionId, projectionDomainVersion);
              if (objectRecord2(officialValues?.sessionStats)) statsRow = officialValues.sessionStats;
              const officialUsage = normalizeProjectionUsage(officialValues?.tokenUsage);
              if (officialUsage) usageTotals = {
                uncachedInputTokens: officialUsage.uncached,
                outputTokens: officialUsage.output,
                cacheReadTokens: officialUsage.cacheRead,
                cacheWriteTokens: officialUsage.cacheWrite
              };
            }
          } catch (error) {
            warnings.push({ code: "OFFICIAL_PERSISTENCE_FAILED", sessionId, message: error?.message || String(error) });
          }
          if (revision !== null && officialSource && info && !info.partial && !info.stale && warnings.slice(warningStart).every((row) => row.code.startsWith("OFFICIAL_") && row.code.endsWith("_USED"))) {
            const afterRevision = await officialReadRevision(hostCtx, sessionId, warnings);
            if (afterRevision === revision) rememberOfficialRead(readCache, sessionId, {
              revision,
              metadataKey,
              services: readServices,
              weight: 1 + info.usages.length * 2 + info.times.length + info.slotStats.length,
              warnings: warnings.slice(warningStart).map((row) => ({ ...row })),
              value: structuredClone({ info, officialValues, officialSource: {
                header: officialSource.header,
                source: officialSource.source,
                inheritedEventCount: officialSource.inheritedEventCount
              } })
            });
          }
        }
        if (!info && !officialSource && officialValues) {
          info = infoFromProjectionValues(officialValues, entry);
          if (objectRecord2(officialValues.sessionStats)) statsRow = officialValues.sessionStats;
          const officialUsage = normalizeProjectionUsage(officialValues.tokenUsage);
          if (officialUsage) usageTotals = {
            uncachedInputTokens: officialUsage.uncached,
            outputTokens: officialUsage.output,
            cacheReadTokens: officialUsage.cacheRead,
            cacheWriteTokens: officialUsage.cacheWrite
          };
        }
        if (!officialSource && !officialValues) try {
          await new Promise((resolve) => setImmediate(resolve));
          info = sessionInfo(home, sessionId);
        } catch (err) {
          const message = err?.message || String(err);
          console.warn(`[dsh-stats] \u4F1A\u8BDD ${sessionId} \u65E5\u5FD7\u89E3\u7801\u5931\u8D25\uFF08\u4F7F\u7528 projection cache\uFF09:`, message);
          warnings.push({ code: "SESSION_DECODE_FAILED", sessionId, message });
          info = { times: [], lastTime: null, model: null, providerId: "unknown", accountType: "api", usages: [], slotStats: [], stats: null, partial: false, stale: false, missing: false, unavailable: true };
        }
        if (officialValues) {
          if (objectRecord2(officialValues.sessionStats)) statsRow = officialValues.sessionStats;
          const officialUsage = normalizeProjectionUsage(officialValues.tokenUsage);
          if (officialUsage) usageTotals = {
            uncachedInputTokens: officialUsage.uncached,
            outputTokens: officialUsage.output,
            cacheReadTokens: officialUsage.cacheRead,
            cacheWriteTokens: officialUsage.cacheWrite
          };
          if (officialValues.title === null || typeof officialValues.title === "string") title = officialValues.title;
          meta = objectRecord2(officialValues.sessionListMetadata) || meta;
          if (Number.isFinite(meta.lastPromptAt) && meta.lastPromptAt >= 0) lastPromptAt = meta.lastPromptAt;
        }
        const sourceHeader = officialSource?.header || info?.header || null;
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
        const projectionInvalid = rawTitle !== void 0 && rawTitle !== null && typeof rawTitle !== "string" || rawCreatedAt !== void 0 && rawCreatedAt !== null && createdAt === null || rawLastPromptAt !== void 0 && rawLastPromptAt !== null && lastPromptAt === null || entry?.identity?.cwd !== void 0 && entry?.identity?.cwd !== null && typeof entry.identity.cwd !== "string";
        const archived = archivedSet.has(sessionId);
        if (officialSource?.source === "sessionPersistence" || officialSource?.source === "sessionQuery") warnings.push({ code: "OFFICIAL_SOURCE_USED", sessionId, message: `session events loaded through ${officialSource.source}` });
        if (!officialSource && entry && !cacheOnly) {
          const checkpoint = projectionCheckpoint(entry, sessionId, sourceHeader, warnings, projectionDomainVersion);
          const rawRows = objectRecord2(entry.rows);
          const hasVersionedRows = rawRows && Object.values(rawRows).some((row) => objectRecord2(row) && (Object.prototype.hasOwnProperty.call(row, "ver") || Object.prototype.hasOwnProperty.call(row, "seq")));
          if (Object.keys(checkpoint).length > 0) {
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
            if (checkedStats && (info.lastSeq < 0 || checkedStats.seq === info.lastSeq)) statsRow = objectRecord2(checkedStats.val) || statsRow;
            if (checkedUsage && (info.lastSeq < 0 || checkedUsage.seq === info.lastSeq)) usageTotals = objectRecord2(checkedUsage.val?.totals) || usageTotals;
          } else if (hasVersionedRows) {
            statsRow = null;
            usageTotals = null;
          }
        }
        if (info.seqGap || info.futureVersion || info.unknownSeed) {
          statsRow = null;
          usageTotals = null;
        }
        if (info.seqGap) warnings.push({ code: "SESSION_SEQ_GAP", sessionId, message: "session log sequence had a gap; cache values were not trusted" });
        if (info.unknownSeed) warnings.push({ code: "SESSION_SEED_BOUNDARY_UNKNOWN", sessionId, message: "inherited event boundary could not be recovered; unattributable usage was excluded" });
        if (info.futureVersion) warnings.push({ code: "SESSION_FORMAT_VERSION_UNSUPPORTED", sessionId, message: `session log format version ${String(info.formatVersion ?? sourceHeader?.version ?? "unknown")} is newer than this plugin` });
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
        const usedProjectionUsage = info.usages.length === 0 && projectionTokens > 0 && !inheritedUsage && (info.missing || info.unavailable || info.partial || info.cacheOnly);
        const cacheOnlyArchived = archived && info.missing && info.usages.length === 0 && usedProjectionUsage;
        const cacheOnlyFork = archived && effectiveParentSession !== null && info.missing && info.cacheOnly;
        if (cacheOnlyFork || archived && effectiveParentSession !== null && info.usages.length === 0 && projectionTokens > 0 || cacheOnlyArchived) {
          warnings.push({ code: "SESSION_ORPHAN_FORK_DISCARDED", sessionId, message: "archived fork had no own usage; inherited projection tokens were excluded from statistics" });
          return null;
        }
        if (info.missing) warnings.push({ code: "SESSION_LOG_MISSING", sessionId, message: "session log was not found; projection cache was used where available" });
        if (info.partial) warnings.push({ code: "SESSION_LOG_PARTIAL", sessionId, message: "session log was incomplete or malformed; only valid committed records were used" });
        if (info.stale) warnings.push({ code: "SESSION_LOG_STALE", sessionId, message: info.readError || "cached session snapshot was used" });
        if (projectionInvalid) warnings.push({ code: "SESSION_METADATA_INVALID", sessionId, message: "invalid projection metadata was ignored" });
        if (usedProjectionUsage) {
          totalUncached = projectionUsage.uncached;
          totalOutput = projectionUsage.output;
          totalCacheRead = projectionUsage.cacheRead;
          totalCacheWrite = projectionUsage.cacheWrite;
          warnings.push({ code: "SESSION_USAGE_FALLBACK", sessionId, message: "token usage came from the projection cache and may include inherited fork context" });
        }
        const eventStats = info.stats || statsRow || {};
        const raw = {
          turns: nonNegativeNumber(eventStats.turns),
          steps: nonNegativeNumber(eventStats.steps),
          llmMs: nonNegativeNumber(eventStats.llmMs),
          toolMs: nonNegativeNumber(eventStats.toolMs),
          ttftMs: nonNegativeNumber(eventStats.ttftMs),
          ttftSteps: nonNegativeNumber(eventStats.ttftSteps),
          decodeMs: nonNegativeNumber(eventStats.decodeMs),
          decodeTokens: nonNegativeNumber(eventStats.decodeTokens),
          uncached: totalUncached,
          output: totalOutput,
          cacheRead: totalCacheRead,
          cacheWrite: totalCacheWrite,
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
          quality: info.stale ? "stale" : info.partial || info.missing || info.unavailable || info.cacheOnly || cacheOnly || usedProjectionUsage || projectionInvalid ? "partial" : "exact",
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
          for (; ; ) {
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
      const strayByCwd = /* @__PURE__ */ new Map();
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
      const projectIndex = /* @__PURE__ */ new Map();
      projects.forEach((p, i) => projectIndex.set(p.id, i));
      const daysMap = /* @__PURE__ */ new Map();
      for (const p of projects) {
        const intervals = p.sessions.flatMap((s) => s._intervals || []).sort((a, b) => a[0] - b[0]);
        const merged = [];
        for (const interval of intervals) {
          const last = merged[merged.length - 1];
          if (last && interval[0] <= last[1]) last[1] = Math.max(last[1], interval[1]);
          else merged.push([...interval]);
        }
        const projectSlots = /* @__PURE__ */ new Map();
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
          if (!day) {
            day = { date, dayTotalMs: 0, slotBlocks: [] };
            daysMap.set(date, day);
          }
          day.dayTotalMs += ms;
          day.slotBlocks.push({ slot: slotOfDay, projectId: p.id, name: p.name, colorIndex: projectIndex.get(p.id), ms });
        }
      }
      const days = [...daysMap.values()].sort((a, b) => a.date < b.date ? -1 : 1);
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
        const after = await this.aggregate(import_pricing3.default.createPricing(engine.catalog, overrides));
        if (store.status().fingerprint !== fingerprint) throw new Error("pricing-settings-conflict");
        const changed = [];
        const old = new Map(before.projects.flatMap((p) => p.sessions).map((s) => [s.id, s]));
        for (const session of after.projects.flatMap((p) => p.sessions)) {
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
export {
  StatsService,
  StatsService as default,
  fetchDeepSeekBalance,
  normalizeBalanceInfo
};
