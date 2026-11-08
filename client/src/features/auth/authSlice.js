/**
 * Authentication slice.
 *
 * Holds the signed-in user, the token and the state of the OTP flows.
 * Every call to the API goes through a thunk, so the components only read
 * state and dispatch - they never talk to axios directly.
 */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api, { tokenStore, toError } from "../../api/axiosClient";

/* Small helper so each thunk stays one readable line. */
const call = (type, request) =>
  createAsyncThunk(type, async (arg, { rejectWithValue }) => {
    try {
      const { data } = await request(arg);
      return data;
    } catch (error) {
      return rejectWithValue(toError(error));
    }
  });

export const register = call("auth/register", body =>
  api.post("/auth/register", body));

export const verifyOtp = call("auth/verifyOtp", body =>
  api.post("/auth/verify-otp", body));

export const resendOtp = call("auth/resendOtp", email =>
  api.post("/auth/resend-otp", { email }));

export const login = call("auth/login", body =>
  api.post("/auth/login", body));

export const forgotPassword = call("auth/forgotPassword", email =>
  api.post("/auth/forgot-password", { email }));

export const resetPassword = call("auth/resetPassword", body =>
  api.post("/auth/reset-password", body));

export const loadMe = call("auth/loadMe", () => api.get("/auth/me"));

const initialState = {
  user: null,
  token: tokenStore.get(),
  /* Restoring the session is only attempted when a token already exists. */
  loading: Boolean(tokenStore.get()),
  error: null,
  fieldErrors: null,
  message: null,

  /* OTP flow */
  pendingEmail: null,     // the address awaiting a code
  needsVerification: false,
  lockedUntil: null       // set when the account is locked out
};

/** Shared handling for the three responses that sign a user in. */
function signIn(state, action) {
  state.loading = false;
  state.user = action.payload.user;
  state.token = action.payload.token;
  state.message = action.payload.message || null;
  state.needsVerification = false;
  state.pendingEmail = null;
  state.lockedUntil = null;
  tokenStore.set(action.payload.token);
}

function pending(state) {
  state.loading = true;
  state.error = null;
  state.fieldErrors = null;
  state.message = null;
}

function rejected(state, action) {
  state.loading = false;
  state.error = action.payload?.message || "Something went wrong.";
  state.fieldErrors = action.payload?.details || null;
  if (action.payload?.lockedUntil) state.lockedUntil = action.payload.lockedUntil;
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      tokenStore.clear();
      state.user = null;
      state.token = null;
      state.error = null;
      state.message = null;
      state.pendingEmail = null;
      state.needsVerification = false;
      state.lockedUntil = null;
    },
    clearMessages(state) {
      state.error = null;
      state.fieldErrors = null;
      state.message = null;
    },
    setPendingEmail(state, action) {
      state.pendingEmail = action.payload;
    }
  },

  extraReducers: builder => {
    builder
      /* Register: the account exists but is not usable until the code is
         confirmed, so no token is stored here. */
      .addCase(register.pending, pending)
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.message;
        state.pendingEmail = action.payload.email;
        state.needsVerification = true;
      })
      .addCase(register.rejected, rejected)

      .addCase(verifyOtp.pending, pending)
      .addCase(verifyOtp.fulfilled, signIn)
      .addCase(verifyOtp.rejected, rejected)

      .addCase(resendOtp.pending, pending)
      .addCase(resendOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.message;
      })
      .addCase(resendOtp.rejected, rejected)

      .addCase(login.pending, pending)
      .addCase(login.fulfilled, signIn)
      .addCase(login.rejected, (state, action) => {
        rejected(state, action);
        /* The server answers 403 with needsVerification when the account
           exists but was never confirmed - send the user to the OTP page
           instead of leaving them stuck on a failed login. */
        if (action.payload?.needsVerification) {
          state.needsVerification = true;
          state.pendingEmail = action.payload.email;
        }
      })

      .addCase(forgotPassword.pending, pending)
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.message;
      })
      .addCase(forgotPassword.rejected, rejected)

      .addCase(resetPassword.pending, pending)
      .addCase(resetPassword.fulfilled, signIn)
      .addCase(resetPassword.rejected, rejected)

      /* Session restore on page load. A failure here is silent: it only
         means the stored token is no longer good. */
      .addCase(loadMe.pending, state => { state.loading = true; })
      .addCase(loadMe.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
      })
      .addCase(loadMe.rejected, state => {
        state.loading = false;
        state.user = null;
        state.token = null;
        tokenStore.clear();
      });
  }
});

export const { logout, clearMessages, setPendingEmail } = authSlice.actions;

/* Selectors keep the state shape in one place. */
export const selectUser = state => state.auth.user;
export const selectIsLoggedIn = state => Boolean(state.auth.user);
export const selectAuthLoading = state => state.auth.loading;

export default authSlice.reducer;
