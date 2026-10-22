/** Shared interaction and retry intervals, in milliseconds. */
export const TIMING = Object.freeze({
  notice:5000,
  noticeWithUndo:8000,
  undo:10000,
  delayedRequest:6000,
  verySlowRequest:15000,
  probeTimeout:3000,
  offlineProbe:20000,
  maintenanceRetry:30000,
  retryBase:250,
  localSyncDebounce:300,
  inputDebounce:200,
  blurDelay:120,
});
