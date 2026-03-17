import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';

export const formatDate = (date) => {
  if (!date) return null;
  return format(new Date(date), 'MMM d, yyyy');
};

export const formatDateShort = (date) => {
  if (!date) return null;
  return format(new Date(date), 'MMM d');
};

export const timeAgo = (date) => {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const getDueDateStatus = (date, isDone) => {
  if (!date) return null;
  if (isDone) return 'done';
  const d = new Date(date);
  if (isPast(d) && !isToday(d)) return 'overdue';
  if (isToday(d)) return 'today';
  if (isTomorrow(d)) return 'tomorrow';
  return 'upcoming';
};

export const getDueDateLabel = (date, isDone) => {
  if (!date) return null;
  const d = new Date(date);
  if (isDone) return formatDateShort(date);
  if (isPast(d) && !isToday(d)) return `Overdue · ${formatDateShort(date)}`;
  if (isToday(d)) return 'Due today';
  if (isTomorrow(d)) return 'Due tomorrow';
  return formatDateShort(date);
};

export const priorityConfig = {
  urgent: { label: 'Urgent', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: '🔴' },
  high: { label: 'High', color: '#f97316', bg: 'rgba(249,115,22,0.15)', icon: '🟠' },
  medium: { label: 'Medium', color: '#eab308', bg: 'rgba(234,179,8,0.15)', icon: '🟡' },
  low: { label: 'Low', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', icon: '🟢' },
  none: { label: 'None', color: '#64748b', bg: 'rgba(100,116,139,0.15)', icon: '⚪' },
};

export const statusConfig = {
  todo: { label: 'To Do', color: '#64748b' },
  inprogress: { label: 'In Progress', color: '#f59e0b' },
  review: { label: 'In Review', color: '#8b5cf6' },
  done: { label: 'Done', color: '#10b981' },
};

export const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export const getAvatarColor = (userId, color) => {
  if (color) return color;
  const colors = ['#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#a855f7', '#ec4899'];
  const idx = (userId?.charCodeAt(0) || 0) % colors.length;
  return colors[idx];
};

export const PROJECT_COLORS = [
  '#f43f5e', '#f97316', '#f5a623', '#eab308',
  '#22c55e', '#10b981', '#06b6d4', '#0ea5e9',
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899'
];

export const PROJECT_ICONS = ['📋', '🚀', '💡', '🎯', '⚡', '🔥', '💎', '🌟', '🎨', '🛠️', '📊', '🌈'];

export const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export const groupTasksByColumn = (tasks, columns) => {
  return columns.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => t.column === col.id || t.status === col.id);
    return acc;
  }, {});
};
