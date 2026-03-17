const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }
});

const FROM = process.env.EMAIL_FROM || `PlanEx <${process.env.EMAIL_USER}>`;
const BASE = process.env.CLIENT_URL  || 'http://localhost:3000';

const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
    .container { max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #1e293b; padding: 24px; display: flex; align-items: center; gap: 12px; }
    .logo { color: #fff; font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
    .logo span { color: #6366f1; }
    .body { padding: 28px 28px 20px; }
    .title { font-size: 16px; font-weight: 600; color: #0a0a0f; margin: 0 0 8px; }
    .text { font-size: 14px; color: #52525b; line-height: 1.6; margin: 0 0 20px; }
    .task-box { background: #f8f8fa; border: 1px solid #e4e4e7; border-radius: 8px; padding: 14px 16px; margin: 0 0 24px; }
    .task-name { font-size: 14px; font-weight: 600; color: #0a0a0f; }
    .btn { display: inline-block; background: #4f46e5; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; }
    .footer { padding: 16px 28px; border-top: 1px solid #f4f4f5; font-size: 12px; color: #a1a1aa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Plan<span>Ex</span></div>
    </div>
    <div class="body">${content}</div>
    <div class="footer">You received this because you are a member of PlanEx. © 2025 PlanEx</div>
  </div>
</body>
</html>`;

const sendTaskAssigned = async ({ to, toName, assignerName, taskTitle, taskId }) => {
  const html = baseTemplate(`
    <p class="title">You have been assigned a task</p>
    <p class="text">Hi ${toName}, <strong>${assignerName}</strong> has assigned you to:</p>
    <div class="task-box">
      <div class="task-name">${taskTitle}</div>
    </div>
    <a href="${BASE}/tasks/${taskId}" class="btn">View Task</a>
  `);

  await transporter.sendMail({
    from:    FROM,
    to,
    subject: `${assignerName} assigned you to "${taskTitle}"`,
    html
  });
};

const sendCommentNotification = async ({ to, toName, commenterName, taskTitle, taskId, commentText }) => {
  const html = baseTemplate(`
    <p class="title">New comment on your task</p>
    <p class="text">Hi ${toName}, <strong>${commenterName}</strong> commented on <strong>${taskTitle}</strong>:</p>
    <div class="task-box">
      <div class="task-name" style="font-weight:400;color:#52525b;">"${commentText}"</div>
    </div>
    <a href="${BASE}/tasks/${taskId}" class="btn">View Task</a>
  `);

  await transporter.sendMail({
    from:    FROM,
    to,
    subject: `${commenterName} commented on "${taskTitle}"`,
    html
  });
};

module.exports = { sendTaskAssigned, sendCommentNotification };