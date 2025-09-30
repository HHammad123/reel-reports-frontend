import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  jobId: null,
  status: null,
  progress: null,
  resultUrl: null,
  lastUpdated: null,
  error: null,
  statusUrl: null,
};

const videoJobSlice = createSlice({
  name: 'videoJob',
  initialState,
  reducers: {
    setJob(state, action) {
      const { jobId, status=null, progress=null, statusUrl=null } = action.payload || {};
      state.jobId = jobId;
      state.status = status;
      state.progress = progress;
      state.resultUrl = null;
      state.error = null;
      state.statusUrl = statusUrl;
      state.lastUpdated = new Date().toISOString();
    },
    updateJobStatus(state, action) {
      const { status, progress, resultUrl, error } = action.payload || {};
      if (status) state.status = status;
      if (progress !== undefined) state.progress = progress;
      if (resultUrl !== undefined) state.resultUrl = resultUrl;
      if (error !== undefined) state.error = error;
      state.lastUpdated = new Date().toISOString();
    },
    clearJob(state) { Object.assign(state, initialState); },
  },
});

export const { setJob, updateJobStatus, clearJob } = videoJobSlice.actions;
export const selectVideoJob = (state) => state.videoJob || initialState;
export default videoJobSlice.reducer;
