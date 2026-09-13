export {
  applyRemoteDoc,
  beginLocalWrite,
  confirmLocalWrite,
  dismissConflict,
  initialSyncState,
  rejectLocalWrite,
} from "./syncState";
export type {
  PendingWrite,
  SyncConflict,
  SyncItemStatus,
  SyncState,
} from "./syncState";
