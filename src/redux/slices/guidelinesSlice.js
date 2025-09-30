import { createSlice } from '@reduxjs/toolkit';

// This slice holds the in-memory Guidelines form state so navigating
// between steps does not reset selections. It is NOT persisted.

const initialState = {
  form: null,
};

const guidelinesSlice = createSlice({
  name: 'guidelines',
  initialState,
  reducers: {
    setGuidelinesState(state, action) {
      state.form = action.payload || null;
    },
    mergeGuidelinesState(state, action) {
      const patch = action.payload || {};
      state.form = { ...(state.form || {}), ...patch };
    },
    clearGuidelinesState(state) {
      state.form = null;
    },
  },
});

export const { setGuidelinesState, mergeGuidelinesState, clearGuidelinesState } = guidelinesSlice.actions;
export const selectGuidelinesForm = (state) => state.guidelines?.form || null;

export default guidelinesSlice.reducer;

