/**
 * Comments slice.
 *
 * GET /api/photos/:id returns the photo together with its comments, so this
 * slice seeds itself from that response instead of making a second request.
 * fetchComments exists for the cases where only the thread is needed.
 */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api, { toError } from "../../api/axiosClient";
import { fetchPhoto } from "../photos/photosSlice";

export const fetchComments = createAsyncThunk(
  "comments/fetch",
  async (photoId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/photos/${photoId}/comments`);
      return data.comments;
    } catch (error) {
      return rejectWithValue(toError(error));
    }
  }
);

export const addComment = createAsyncThunk(
  "comments/add",
  async ({ photoId, comment }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/photos/${photoId}/comments`, { comment });
      return data.comment; // already populated with the author
    } catch (error) {
      return rejectWithValue(toError(error));
    }
  }
);

export const deleteComment = createAsyncThunk(
  "comments/delete",
  async ({ photoId, commentId }, { rejectWithValue }) => {
    try {
      await api.delete(`/photos/${photoId}/comments/${commentId}`);
      return commentId;
    } catch (error) {
      return rejectWithValue(toError(error));
    }
  }
);

const commentsSlice = createSlice({
  name: "comments",
  initialState: {
    items: [],
    loading: false,
    adding: false,
    error: null,
    fieldErrors: null
  },

  reducers: {
    clearComments(state) {
      state.items = [];
      state.error = null;
      state.fieldErrors = null;
    }
  },

  extraReducers: builder => {
    builder
      /* Seeded by the photo detail request - no extra round trip. */
      .addCase(fetchPhoto.pending, state => {
        state.items = [];
        state.error = null;
      })
      .addCase(fetchPhoto.fulfilled, (state, action) => {
        state.items = action.payload.comments || [];
      })

      .addCase(fetchComments.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchComments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Could not load the comments.";
      })

      .addCase(addComment.pending, state => {
        state.adding = true;
        state.error = null;
        state.fieldErrors = null;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        state.adding = false;
        /* Oldest first, so a new comment goes at the end. */
        state.items.push(action.payload);
      })
      .addCase(addComment.rejected, (state, action) => {
        state.adding = false;
        state.error = action.payload?.message || "Could not post the comment.";
        state.fieldErrors = action.payload?.details || null;
      })

      .addCase(deleteComment.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item._id !== action.payload);
      })
      .addCase(deleteComment.rejected, (state, action) => {
        state.error = action.payload?.message || "Could not delete the comment.";
      });
  }
});

export const { clearComments } = commentsSlice.actions;

export const selectComments = state => state.comments.items;
export const selectCommentsAdding = state => state.comments.adding;

export default commentsSlice.reducer;
