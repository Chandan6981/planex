const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

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

const pushToQueue = async (type, payload) => {
  if (!process.env.AWS_SQS_QUEUE_URL) {
    // SQS not configured — skip silently
    return;
  }
  try {
    const body = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
    await sqs.send(new SendMessageCommand({
      QueueUrl:               process.env.AWS_SQS_QUEUE_URL,
      MessageBody:            body,
      MessageGroupId:         'planex-notifications',
    }));
    console.log(`📤 Queued: ${type} → ${payload.to}`);
  } catch (err) {
    console.error('SQS push error:', err.message);
  }
};

module.exports = { pushToQueue, QUEUE_EVENTS };