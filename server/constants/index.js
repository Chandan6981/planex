const TASK_STATUS = {
  TODO:        'todo',
  IN_PROGRESS: 'inprogress',
  REVIEW:      'review',
  DONE:        'done'
};

const TASK_PRIORITY = {
  URGENT: 'urgent',
  HIGH:   'high',
  MEDIUM: 'medium',
  LOW:    'low',
  NONE:   'none'
};

const NOTIFICATION_TYPE = {
  TASK:    'task',
  PROJECT: 'project',
  COMMENT: 'comment',
  MENTION: 'mention'
};

const MEMBER_ROLE = {
  OWNER:  'owner',
  MEMBER: 'member'
};

module.exports = { TASK_STATUS, TASK_PRIORITY, NOTIFICATION_TYPE, MEMBER_ROLE };
