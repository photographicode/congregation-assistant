import { create } from "zustand";
import {experiencePresets,type Experience} from "./experience";
type Appearance = Experience & {
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
  ...experiencePresets.balanced,
  experienceChosen: false,
  theme: "auto",
  tone: "standard",
  size: "M",
  weight: "regular",
  solid: false,
  auto: true,
  fit: "auto",
  clock: "locale",
};
let appearanceStorageKey="ca-v2-appearance";
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
          appearanceStorageKey,
          JSON.stringify({
            style:next.style,experienceChosen:next.experienceChosen,navigation:next.navigation,density:next.density,motion:next.motion,colorIntensity:next.colorIntensity,charts:next.charts,background:next.background,
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

// Scope device preferences to the signed-in account and congregation.
export function activateAppearanceProfile(account:string,congregation:string,publisher=false){
 appearanceStorageKey='ca-v2-appearance:'+encodeURIComponent(account)+':'+encodeURIComponent(congregation);
 let profile={};try{profile=JSON.parse(localStorage.getItem(appearanceStorageKey)||'{}');}catch{}
 useAppearance.setState({...initial,...(publisher?experiencePresets.calm:{}),experienceChosen:false,...profile});
}
