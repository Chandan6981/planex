const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const crypto = require('crypto');

const sqs = new SQSClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

const QUEUE_EVENTS = {
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  TASK_UPDATED:  'TASK_UPDATED',
  TASK_DUE_SOON: 'TASK_DUE_SOON',
  COMMENT_ADDED: 'COMMENT_ADDED',
};

const pushToQueue = async (type, payload, recipientId) => {
  if (!process.env.AWS_SQS_QUEUE_URL) return; // SQS not configured — skip silently

  try {
    const body = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });

    // Deduplication key: type + recipient + taskId + current 5-minute window
    // Prevents duplicate emails within SQS deduplication window (5 min)
    const minuteWindow  = Math.floor(Date.now() / (5 * 60 * 1000));
    const dedupSource   = `${type}:${recipientId || 'global'}:${payload.taskId || ''}:${minuteWindow}`;
    const dedupId       = crypto.createHash('sha256').update(dedupSource).digest('hex').slice(0, 128);

    // Per-recipient group ID — different users' messages processed in parallel
    // If one user's message fails it won't block another user's notifications
    const groupId = recipientId ? `user-${recipientId}` : 'global-notifications';

    await sqs.send(new SendMessageCommand({
      QueueUrl:                process.env.AWS_SQS_QUEUE_URL,
      MessageBody:             body,
      MessageGroupId:          groupId,
      MessageDeduplicationId:  dedupId,
    }));
  } catch (err) {
    // Never let queue errors crash the API — log and continue
    console.error('SQS push error:', err.message);
  }
};

module.exports = { pushToQueue, QUEUE_EVENTS };