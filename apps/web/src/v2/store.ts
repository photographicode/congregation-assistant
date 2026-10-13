import { create } from "zustand";
type Appearance = {
  theme: string;
  tone: string;
  size: string;
  weight: string;
  solid: boolean;
  auto: boolean;
  fit: "auto" | "compact" | "comfortable" | "large";
  clock: "locale" | "12" | "24";
};
const initial: Appearance = {
  theme: "auto",
  tone: "standard",
  size: "M",
  weight: "regular",
  solid: false,
  auto: true,
  fit: "auto",
  clock: "locale",
};
let saved = {};
try {
  saved = JSON.parse(localStorage.getItem("ca-v2-appearance") || "{}");
} catch {}
export const useAppearance = create<
  Appearance & { set: (patch: Partial<Appearance>) => void }
>((set) => ({
  ...initial,
  ...saved,
  set: (patch) =>
    set((state) => {
      const next = { ...state, ...patch };
      try {
        localStorage.setItem(
          "ca-v2-appearance",
          JSON.stringify({
            theme: next.theme,
            tone: next.tone,
            size: next.size,
            weight: next.weight,
            solid: next.solid,
            auto: next.auto,
            fit: next.fit,
            clock: next.clock,
          }),
        );
      } catch {}
      return next;
    }),
}));
