import {normalizeTheme,resolvedTheme} from "../../../../packages/core/themes";
import { create } from "zustand";
import {experiencePresets,type Experience} from "./experience";
type Appearance = Experience & {
  theme: string;
  backgroundIntensity:number;
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
  backgroundIntensity:100,
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
if(new URLSearchParams(location.search).get('demo')==='publisher')saved={...experiencePresets.calm,experienceChosen:false,...saved};
export const useAppearance = create<
  Appearance & { set: (patch: Partial<Appearance>) => void }
>((set) => ({
  ...initial,
  ...saved,
  set: (patch) =>
    set((state) => {
      const next = { ...state, ...patch,theme:normalizeTheme(patch.theme||state.theme) };
      try {
        localStorage.setItem(
          appearanceStorageKey,
          JSON.stringify({
            style:next.style,experienceChosen:next.experienceChosen,navigation:next.navigation,density:next.density,motion:next.motion,colorIntensity:next.colorIntensity,charts:next.charts,background:next.background,
            theme: next.theme,backgroundIntensity:next.backgroundIntensity,
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

export function hasAppearanceProfile(){try{return Boolean(localStorage.getItem(appearanceStorageKey));}catch{return false;}}

// Apply the stored theme before the first application text is painted.
document.documentElement.dataset.theme=resolvedTheme(useAppearance.getState().theme,matchMedia('(prefers-color-scheme: dark)').matches);
