import coverageBaseline from './docs/engineering/coverage-baseline.json';
import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tests/v3/**/*.test.ts','tests/hell/**/*.test.ts'],environment:'node',pool:'forks',maxWorkers:2,coverage:{provider:'v8',reportsDirectory:'work/quality/coverage',reporter:['text','json-summary','lcov'],include:['packages/core/**/*.{ts,mjs}','packages/pdf/layout.{ts,mjs}','apps/web/src/**/*.{ts,tsx}'],exclude:['**/*.d.ts'],thresholds:coverageBaseline.thresholds}}});
