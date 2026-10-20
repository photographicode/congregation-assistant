import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tests/v3/**/*.test.ts','tests/hell/**/*.test.ts'],environment:'node',pool:'forks',maxWorkers:2}});
