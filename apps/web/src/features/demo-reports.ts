import { create } from "zustand";
import type { Report } from "../../../../packages/core/repositories";
export const useDemoReports = create<{
  rows: Report[];
  update: (next: Report[] | ((old: Report[]) => Report[])) => void;
}>((set) => ({
  rows: [],
  update: (next) =>
    set((old) => ({
      rows: typeof next === "function" ? next(old.rows) : next,
    })),
}));
