export {
  applyRemoteDoc,
  beginLocalWrite,
  confirmLocalWrite,
  dismissConflict,
  importConflict,
  initialSyncState,
  rejectLocalWrite,
} from "./syncState";
export type {
  PendingWrite,
  SyncConflict,
  SyncItemStatus,
  SyncState,
} from "./syncState";
