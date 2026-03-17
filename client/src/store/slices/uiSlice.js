import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    createTaskModal: false,
    createProjectModal: false,
    taskDetailPanel: null,
    notificationPanel: false,
    toast: null,
    viewMode: 'board', // board | list | timeline
  },
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    setCreateTaskModal: (state, action) => { state.createTaskModal = action.payload; },
    setCreateProjectModal: (state, action) => { state.createProjectModal = action.payload; },
    setTaskDetailPanel: (state, action) => { state.taskDetailPanel = action.payload; },
    toggleNotificationPanel: (state) => { state.notificationPanel = !state.notificationPanel; },
    closeNotificationPanel: (state) => { state.notificationPanel = false; },
    showToast: (state, action) => { state.toast = action.payload; },
    hideToast: (state) => { state.toast = null; },
    setViewMode: (state, action) => { state.viewMode = action.payload; },
  }
});

export const {
  toggleSidebar, setCreateTaskModal, setCreateProjectModal,
  setTaskDetailPanel, toggleNotificationPanel, closeNotificationPanel,
  showToast, hideToast, setViewMode
} = uiSlice.actions;
export default uiSlice.reducer;
