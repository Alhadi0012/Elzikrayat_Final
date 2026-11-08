/**
 * Photos slice.
 *
 * items    - the gallery list
 * current  - the photo open on the detail page
 * stats    - the counters on the home page
 */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api, { toError } from "../../api/axiosClient";

export const fetchPhotos = createAsyncThunk(
  "photos/fetchAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/photos", { params });
      return data;
    } catch (error) {
      return rejectWithValue(toError(error));
    }
  }
);

export const fetchPhoto = createAsyncThunk(
  "photos/fetchOne",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/photos/${id}`);
      return data; // { photo, comments } - commentsSlice reads the comments
    } catch (error) {
      return rejectWithValue(toError(error));
    }
  }
);

/**
 * Upload. The caller passes a plain object; the FormData is built here so no
 * component has to know the field names the API expects.
 */
export const uploadPhoto = createAsyncThunk(
  "photos/upload",
  async ({ file, title, description, onProgress }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("title", title);
      formData.append("description", description || "");

      const { data } = await api.post("/photos", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: event => {
          if (onProgress && event.total) {
            onProgress(Math.round((event.loaded * 100) / event.total));
          }
        }
      });
      return data;
    } catch (error) {
      return rejectWithValue(toError(error));
    }
  }
);

export const deletePhoto = createAsyncThunk(
  "photos/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/photos/${id}`);
      return id; // the reducer removes it from the list by id
    } catch (error) {
      return rejectWithValue(toError(error));
    }
  }
);

export const fetchStats = createAsyncThunk(
  "photos/stats",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/photos/stats");
      return data.stats;
    } catch (error) {
      return rejectWithValue(toError(error));
    }
  }
);

const photosSlice = createSlice({
  name: "photos",
  initialState: {
    items: [],
    total: 0,
    current: null,
    stats: { users: 0, photos: 0, comments: 0 },
    loading: false,
    uploading: false,
    error: null,
    fieldErrors: null
  },

  reducers: {
    clearCurrent(state) {
      state.current = null;
    },
    clearPhotoError(state) {
      state.error = null;
      state.fieldErrors = null;
    }
  },

  extraReducers: builder => {
    builder
      .addCase(fetchPhotos.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPhotos.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.photos;
        state.total = action.payload.total;
      })
      .addCase(fetchPhotos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Could not load the gallery.";
      })

      .addCase(fetchPhoto.pending, state => {
        state.loading = true;
        state.error = null;
        state.current = null;
      })
      .addCase(fetchPhoto.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload.photo;
      })
      .addCase(fetchPhoto.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Could not load this photo.";
      })

      .addCase(uploadPhoto.pending, state => {
        state.uploading = true;
        state.error = null;
        state.fieldErrors = null;
      })
      .addCase(uploadPhoto.fulfilled, (state, action) => {
        state.uploading = false;
        /* Newest first, so the new photo goes to the front of the list. */
        state.items.unshift(action.payload.photo);
        state.total += 1;
      })
      .addCase(uploadPhoto.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload?.message || "The upload failed.";
        state.fieldErrors = action.payload?.details || null;
      })

      .addCase(deletePhoto.fulfilled, (state, action) => {
        state.items = state.items.filter(photo => photo._id !== action.payload);
        state.total = Math.max(0, state.total - 1);
        if (state.current?._id === action.payload) state.current = null;
      })
      .addCase(deletePhoto.rejected, (state, action) => {
        state.error = action.payload?.message || "Could not delete the photo.";
      })

      .addCase(fetchStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  }
});

export const { clearCurrent, clearPhotoError } = photosSlice.actions;

export const selectPhotos = state => state.photos.items;
export const selectCurrentPhoto = state => state.photos.current;
export const selectPhotosLoading = state => state.photos.loading;

export default photosSlice.reducer;
