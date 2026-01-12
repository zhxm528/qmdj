# Backend Log Spec (app/api/bazi)

Scope:
- app/api/bazi/*.ts
- app/api/bazi/**/route.ts

Goals:
- Keep only input/response logs and error logs.
- Keep all error logs (console.error).
- Remove all other logs.

## Standard Log Format

1) Input log (entry)
- Log once at the handler entry.
- Must include parameter names and values.
- Example:
  - console.log("[module] input ok:", { paramA, paramB });

2) Response log (exit)
- Log once right before a successful return.
- Must include the main response keys and summary fields.
- Example:
  - console.log("[module] response ok:", { success: true, resultCount });

3) Error logs
- Keep existing console.error (error + stack).

## Naming

- Use file or folder name:
  - app/api/bazi/route.ts -> [bazi]
  - app/api/bazi/tonggen/route.ts -> [tonggen]
  - app/api/bazi/step4.ts -> [step4]

## Checklist

- step1 to step13: keep only input ok / response ok / console.error.
- app/api/bazi/route.ts: keep only input ok / response ok / console.error.
- app/api/bazi/**/route.ts: keep only input ok / response ok / console.error.

## Disallowed Logs

- Any console.log/console.warn with business details, SQL, params, or data output.
- Any console.warn that is not an error.
