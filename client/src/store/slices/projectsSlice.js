import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const fetchProjects = createAsyncThunk('projects/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/projects');
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const createProject = createAsyncThunk('projects/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/projects', data);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const updateProject = createAsyncThunk('projects/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/projects/${id}`, data);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const deleteProject = createAsyncThunk('projects/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/projects/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const fetchProjectStats = createAsyncThunk('projects/stats', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/projects/${id}/stats`);
    return { id, stats: res.data };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

const projectsSlice = createSlice({
  name: 'projects',
  initialState: {
    list: [],
    current: null,
    stats: {},
    loading: false,
    error: null,
  },
  reducers: {
    setCurrentProject: (state, action) => { state.current = action.payload; },
    updateProjectSocket: (state, action) => {
      const idx = state.list.findIndex(p => p._id === action.payload._id);
      if (idx !== -1) state.list[idx] = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => { state.loading = true; })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        const idx = state.list.findIndex(p => p._id === action.payload._id);
        if (idx !== -1) state.list[idx] = action.payload;
        if (state.current?._id === action.payload._id) state.current = action.payload;
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.list = state.list.filter(p => p._id !== action.payload);
      })
      .addCase(fetchProjectStats.fulfilled, (state, action) => {
        state.stats[action.payload.id] = action.payload.stats;
      });
  }
});

export const { setCurrentProject, updateProjectSocket } = projectsSlice.actions;
export default projectsSlice.reducer;
