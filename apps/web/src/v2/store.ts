import { create } from "zustand";
type Appearance = {
  theme: string;
  tone: string;
  size: string;
  weight: string;
  solid: boolean;
  auto: boolean;
};
const initial: Appearance = {
  theme: "auto",
  tone: "standard",
  size: "M",
  weight: "regular",
  solid: false,
  auto: true,
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
          }),
        );
      } catch {}
      return next;
    }),
}));
