require('dotenv').config();

const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const emailService = require('./services/emailService');
const { QUEUE_EVENTS } = require('./services/queueService');

if (!process.env.AWS_SQS_QUEUE_URL) {
  console.error('❌ AWS_SQS_QUEUE_URL is not set in .env');
  process.exit(1);
}
if (!process.env.EMAIL_USER) {
  console.error('❌ EMAIL_USER is not set in .env');
  process.exit(1);
}

const sqs = new SQSClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

const QUEUE_URL = process.env.AWS_SQS_QUEUE_URL;

const processMessage = async (type, payload) => {
  switch (type) {
    case QUEUE_EVENTS.TASK_ASSIGNED:
      await emailService.sendTaskAssigned(payload);
      console.log(`✅ Email sent [TASK_ASSIGNED] → ${payload.to}`);
      break;

    case QUEUE_EVENTS.COMMENT_ADDED:
      await emailService.sendCommentNotification(payload);
      console.log(`✅ Email sent [COMMENT_ADDED] → ${payload.to}`);
      break;

    case QUEUE_EVENTS.TASK_DUE_SOON:
      console.log(`⏰ Due soon reminder for: ${payload.taskTitle}`);
      break;

    default:
      console.warn(`⚠️ Unknown message type: ${type}`);
  }
};

const startWorker = async () => {
  console.log('🔄 PlanEx queue worker started');
  console.log(`📬 Polling: ${QUEUE_URL}`);
  console.log(`📧 Sending from: ${process.env.EMAIL_USER}`);
  console.log('─'.repeat(50));

  while (true) {
    try {
      const response = await sqs.send(new ReceiveMessageCommand({
        QueueUrl:            QUEUE_URL,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds:     20,    
        VisibilityTimeout:   30      
      }));

      if (!response.Messages || response.Messages.length === 0) continue;

      console.log(`📩 ${response.Messages.length} message(s) received`);

      for (const message of response.Messages) {
        try {
          const { type, payload } = JSON.parse(message.Body);
          await processMessage(type, payload);

          await sqs.send(new DeleteMessageCommand({
            QueueUrl:      QUEUE_URL,
            ReceiptHandle: message.ReceiptHandle
          }));
        } catch (err) {
  
          console.error(`❌ Failed to process message: ${err.message}`);
        }
      }

    } catch (err) {
      console.error('❌ SQS polling error:', err.message);

      await new Promise(r => setTimeout(r, 5000));
    }
  }
};

startWorker();