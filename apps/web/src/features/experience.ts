export type Experience={style:'calm'|'balanced'|'lively';experienceChosen:boolean;navigation:'classic'|'rail'|'tabs';density:'comfortable'|'compact';motion:'full'|'reduced';colorIntensity:'soft'|'vivid';charts:boolean;background:'static'|'ambient'|'off'};
export const experiencePresets:Record<Experience['style'],Experience>={
 calm:{style:'calm',experienceChosen:true,navigation:'classic',density:'comfortable',motion:'reduced',colorIntensity:'soft',charts:false,background:'static'},
 balanced:{style:'balanced',experienceChosen:true,navigation:'classic',density:'comfortable',motion:'full',colorIntensity:'soft',charts:true,background:'static'},
 lively:{style:'lively',experienceChosen:true,navigation:'classic',density:'compact',motion:'full',colorIntensity:'vivid',charts:true,background:'ambient'}
};
