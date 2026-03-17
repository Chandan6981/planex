import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const fetchTasks = createAsyncThunk('tasks/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/tasks', { params });
    return Array.isArray(res.data) ? res.data : (res.data.tasks || []);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const createTask = createAsyncThunk('tasks/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/tasks', data);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const updateTask = createAsyncThunk('tasks/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/tasks/${id}`, data);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const deleteTask = createAsyncThunk('tasks/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/tasks/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const fetchTask = createAsyncThunk('tasks/fetchOne', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/tasks/${id}`);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const addComment = createAsyncThunk('tasks/addComment', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/tasks/${id}/comments`, data);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

const upsert = (list, task) => {
  const idx = list.findIndex(t => t._id === task._id);
  if (idx !== -1) list[idx] = task;
  else list.push(task);
};

// Extract project ID as plain string — handles both populated object and raw string/ObjectId
const extractProjId = (task) => {
  const raw = task?.project?._id || task?.project;
  return raw ? raw.toString() : null;
};

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: {
    list: [],
    currentProjectId: null,
    selectedTask: null,
    loading: false,
    error: null,
    filter: { status: 'all', priority: 'all', search: '' }
  },
  reducers: {
    setSelectedTask:  (state, action) => { state.selectedTask = action.payload; },
    setFilter:        (state, action) => { state.filter = { ...state.filter, ...action.payload }; },
    clearFilter:      (state) => { state.filter = { status: 'all', priority: 'all', search: '' }; },
    clearTasks:       (state) => { state.list = []; state.currentProjectId = null; },

    taskCreatedSocket: (state, action) => {
      const task = action.payload;
      if (!task?._id) return;
      const taskProjId = extractProjId(task);
      // Convert both to string for reliable comparison
      if (taskProjId && state.currentProjectId &&
          taskProjId.toString() === state.currentProjectId.toString()) {
        upsert(state.list, task);
      }
    },

    taskUpdatedSocket: (state, action) => {
      const task = action.payload;
      if (!task?._id) return;
      const taskProjId = extractProjId(task);
      if (taskProjId && state.currentProjectId &&
          taskProjId.toString() === state.currentProjectId.toString()) {
        upsert(state.list, task);
      }
      if (state.selectedTask?._id === task._id) {
        state.selectedTask = task;
      }
    },

    taskDeletedSocket: (state, action) => {
      state.list = state.list.filter(t => t._id !== action.payload);
      if (state.selectedTask?._id === action.payload) state.selectedTask = null;
    },

    moveTaskOptimistic: (state, action) => {
      const { taskId, newColumn, newStatus } = action.payload;
      const task = state.list.find(t => t._id === taskId);
      if (task) { task.column = newColumn; task.status = newStatus; }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending,   (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.list = Array.isArray(action.payload) ? action.payload : [];
        // Store as plain string so comparisons always work
        const projArg = action.meta.arg?.project;
        state.currentProjectId = projArg ? projArg.toString() : null;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.list = [];
      })

      .addCase(createTask.fulfilled, (state, action) => {
        const task = action.payload;
        if (!task?._id) return;
        const taskProjId = extractProjId(task);
        if (taskProjId && state.currentProjectId &&
            taskProjId.toString() === state.currentProjectId.toString()) {
          upsert(state.list, task);
        }
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        if (!action.payload?._id) return;
        upsert(state.list, action.payload);
        if (state.selectedTask?._id === action.payload._id) state.selectedTask = action.payload;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.list = state.list.filter(t => t._id !== action.payload);
        if (state.selectedTask?._id === action.payload) state.selectedTask = null;
      })
      .addCase(fetchTask.fulfilled, (state, action) => {
        if (!action.payload?._id) return;
        state.selectedTask = action.payload;
        upsert(state.list, action.payload);
      })
      .addCase(addComment.fulfilled, (state, action) => {
        if (!action.payload?._id) return;
        upsert(state.list, action.payload);
        if (state.selectedTask?._id === action.payload._id) state.selectedTask = action.payload;
      });
  }
});

export const {
  setSelectedTask, setFilter, clearFilter, clearTasks,
  taskCreatedSocket, taskUpdatedSocket, taskDeletedSocket, moveTaskOptimistic
} = tasksSlice.actions;
export default tasksSlice.reducer;