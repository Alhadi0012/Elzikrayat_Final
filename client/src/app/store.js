/**
 * The Redux store.
 *
 * One slice per feature. Adding a feature means adding a reducer here and
 * nothing else changes.
 */
import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../features/auth/authSlice";
import photosReducer from "../features/photos/photosSlice";
import commentsReducer from "../features/comments/commentsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    photos: photosReducer,
    comments: commentsReducer
  },

  middleware: getDefault =>
    getDefault({
      /* The upload thunk carries a File and an onProgress callback, neither
         of which is serialisable. They never reach the store, so the check
         is relaxed for that action only. */
      serializableCheck: {
        ignoredActions: ["photos/upload/pending"],
        ignoredActionPaths: ["meta.arg.file", "meta.arg.onProgress"]
      }
    })
});
