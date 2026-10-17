import {createInstallController} from '../../../../packages/core/install-controller';
// Imported by the entry module so the browser event is captured before Settings loads.
export const installController=createInstallController(window,()=>matchMedia('(display-mode: standalone)').matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone));
