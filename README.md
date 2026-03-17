# PlanEx — Project Management App

A production-ready full-stack project management application built with the MERN stack. Features real-time collaboration, Kanban boards, file attachments via AWS S3, async email notifications via AWS SQS, and a comprehensive REST API with MongoDB aggregation pipelines.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Folder Structure](#folder-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [AWS Setup](#aws-setup)
- [Scripts](#scripts)

---

## Features

### Authentication
- JWT-based authentication with 7-day token expiry
- Secure password hashing with bcrypt (12 salt rounds)
- Rate limiting on login/register — 10 attempts per 15 minutes
- Auto-assigned user color based on name

### Task Management
- Full CRUD for tasks with title, description, status, priority, due date
- Drag and drop Kanban board (Todo → In Progress → In Review → Done)
- List view with sorting and filtering
- Subtasks with completion tracking and progress bar
- Comments on tasks with real-time updates
- Activity log — tracks every field change with old/new values
- Tags and estimated hours
- Recurring task support
- Bulk status updates across multiple tasks
- Assignee management with live search picker

### File Attachments (AWS S3)
- Upload images, PDFs, Word documents, text files (max 10MB)
- Upload during task creation or from task detail panel
- Drag and drop upload support
- Image thumbnails with preview
- Auto-delete from S3 when task is deleted
- Files stored at `taskflow/tasks/{taskId}/{timestamp}-{random}.ext`

### Projects
- Create and manage multiple projects with custom color and icon
- Kanban board per project with live stats bar
- Project members with owner/member roles
- Real-time progress tracking (stats computed from Redux — instant on drag)
- Task counts and completion percentage in sidebar

### My Tasks
- Personal task view across all projects
- Tabs: All Active, Inbox (no project), Today, This Week, Overdue, Completed
- Real-time updates via socket + Redux fallback
- Toggle task completion inline

### Dashboard
- Stats: Total Projects, Active Tasks, Due Today, Overdue
- My Priority Tasks list sorted by urgency
- Task Distribution bar chart (Recharts)
- Per-project progress cards
- All stats computed via MongoDB aggregation pipelines (`$facet`)
- Auto-refreshes on window focus

### Real-time (Socket.io)
- Live task creation, updates, deletion on Kanban board
- Personal `user:id` rooms for My Tasks updates
- Project `project:id` rooms for Kanban updates
- Real-time in-app notifications with unread badge
- Typing indicators
- Socket reconnection with polling fallback

### Notifications
- In-app notifications panel (newest first)
- Click to mark single notification as read — instant UI update
- Mark all as read
- Unread count badge on bell icon
- Persistent storage in user document

### Email Notifications (AWS SQS + Nodemailer)
- Async email queue — never blocks API responses
- Task assignment emails with HTML template
- Comment notification emails
- Queue worker runs as separate process
- Auto-retry on failure via SQS visibility timeout
- Dead letter queue support

### Security
- Helmet.js — secure HTTP headers
- CORS protection
- Request size limit (10kb)
- Input validation middleware (title, status, priority, email format)
- ObjectId validation on all `:id` routes
- Authorization checks — only task creator can delete, only project owner can delete project
- Bulk update field whitelist — prevents overwriting sensitive fields
- No JWT fallback secret — crashes loudly if missing

### Code Architecture
- MVC pattern — controllers, routes, models, middleware fully separated
- Constants file — no magic strings
- Centralized error handler — catches Mongoose, JWT, duplicate key errors
- Socket helpers extracted to `socketHelpers.js`
- Aggregation pipelines for all stats queries — no N+1 queries
- MongoDB indexes on Task model for performance
- Pagination support on task queries

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| Redux Toolkit | State management |
| React Router v6 | Client-side routing |
| Socket.io-client | Real-time communication |
| Axios | HTTP client |
| Recharts | Dashboard charts |
| @hello-pangea/dnd | Drag and drop Kanban |

### Backend
| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Express 4 | Web framework |
| MongoDB + Mongoose | Database + ODM |
| Socket.io | Real-time server |
| JWT | Authentication tokens |
| bcryptjs | Password hashing |
| Helmet | Security headers |
| express-rate-limit | Rate limiting |
| Multer + multer-s3 | File upload handling |
| Nodemailer | Email sending |
| Nodemon | Development server |

### Cloud & Infrastructure
| Service | Purpose |
|---|---|
| AWS S3 | File/image storage |
| AWS SQS (FIFO) | Async email message queue |
| Gmail SMTP | Email delivery |

---

## Architecture

```
Browser (React + Redux)
        │
        ├── REST API (axios) ──────────────────────→ Express Server
        │                                                   │
        └── WebSocket (socket.io-client) ──────────→ Socket.io Server
                                                            │
                                              ┌─────────────┼─────────────┐
                                              │             │             │
                                         Controllers    Middleware    Services
                                              │             │             │
                                         MongoDB ←──── Mongoose    AWS S3 / SQS
                                                                         │
                                                                   Queue Worker
                                                                         │
                                                                   Gmail SMTP
```

### Request Lifecycle
```
Request → CORS → express.json() → req.io inject
       → auth.js (JWT verify) → validateObjectId
       → validator middleware → controller
       → MongoDB operation → socket emit
       → SQS push (async) → res.json()
```

---

## Folder Structure

```
planex/
│
├── client/                          # React frontend
│   ├── public/
│   │   └── index.html               # HTML entry point, title: PlanEx
│   └── src/
│       ├── App.jsx                  # Router, socket init, protected layout
│       ├── index.js                 # React entry point
│       │
│       ├── components/
│       │   ├── auth/
│       │   │   └── AuthPage.jsx     # Login + Register page
│       │   ├── common/
│       │   │   └── PlanExLogo.jsx   # Reusable SVG logo component
│       │   ├── dashboard/
│       │   │   ├── Dashboard.jsx    # Overview page with charts + stats
│       │   │   └── SearchPage.jsx   # Search tasks and projects
│       │   ├── layout/
│       │   │   ├── Header.jsx       # Top bar, notifications, theme toggle
│       │   │   └── Sidebar.jsx      # Navigation, projects list
│       │   ├── projects/
│       │   │   ├── CreateProjectModal.jsx
│       │   │   └── ProjectPage.jsx  # Kanban/List view with live stats
│       │   ├── tasks/
│       │   │   ├── CreateTaskModal.jsx   # Create task with file queue
│       │   │   ├── KanbanBoard.jsx       # Drag and drop board
│       │   │   ├── MyTasks.jsx           # Personal task view with tabs
│       │   │   ├── TaskDetailPanel.jsx   # Slide-out panel with all task details
│       │   │   └── TaskList.jsx          # Table view
│       │   └── ui/
│       │       └── Toast.jsx             # Toast notifications
│       │
│       ├── store/
│       │   ├── index.js             # Redux store setup
│       │   └── slices/
│       │       ├── authSlice.js     # User auth state, notifications
│       │       ├── projectsSlice.js # Projects list state
│       │       ├── tasksSlice.js    # Tasks list, selected task, filters
│       │       └── uiSlice.js       # Modals, panels, toasts
│       │
│       ├── styles/
│       │   └── globals.css          # Full design system, dark + light theme
│       │
│       └── utils/
│           ├── api.js               # Axios instance with JWT interceptor
│           ├── helpers.js           # Date helpers, priority config, initials
│           └── socket.js            # Socket.io client with reconnection
│
├── server/                          # Express backend
│   ├── index.js                     # Entry point, middleware, routes, socket
│   ├── queueWorker.js               # SQS consumer, runs as separate process
│   ├── .env.example                 # Template for environment variables
│   │
│   ├── constants/
│   │   └── index.js                 # TASK_STATUS, TASK_PRIORITY, etc.
│   │
│   ├── controllers/
│   │   ├── authController.js        # register, login, getMe, updateTheme
│   │   ├── dashboardController.js   # getDashboard ($facet aggregation)
│   │   ├── projectController.js     # CRUD + members + stats
│   │   ├── taskController.js        # CRUD + comments + subtasks + S3 + SQS
│   │   └── userController.js        # getAllUsers, profile, notifications
│   │
│   ├── middleware/
│   │   ├── auth.js                  # JWT verification, sets req.user
│   │   ├── errorHandler.js          # Central error handler
│   │   └── validateObjectId.js      # Validates MongoDB ObjectId in params
│   │
│   ├── models/
│   │   ├── Project.js               # Project schema with members array
│   │   ├── Task.js                  # Task schema with indexes
│   │   └── User.js                  # User schema with bcrypt hooks
│   │
│   ├── routes/
│   │   ├── auth.js                  # POST /register, /login, GET /me
│   │   ├── dashboard.js             # GET /dashboard
│   │   ├── notifications.js         # Notifications routes
│   │   ├── projects.js              # CRUD + /members + /stats
│   │   ├── tasks.js                 # CRUD + /comments + /attachments + /subtasks
│   │   └── users.js                 # GET / + /profile + /notifications
│   │
│   ├── services/
│   │   ├── emailService.js          # HTML email templates (nodemailer)
│   │   ├── queueService.js          # pushToQueue() — SQS producer
│   │   └── s3Service.js             # multer-s3 upload config, deleteFile()
│   │
│   ├── socket/
│   │   ├── socketHandler.js         # Socket.io auth + room management
│   │   └── socketHelpers.js         # emitTask(), emitProject()
│   │
│   └── validators/
│       ├── authValidator.js         # validateRegister, validateLogin
│       ├── projectValidator.js      # validateCreateProject, validateUpdateProject
│       └── taskValidator.js         # validateCreateTask, validateUpdateTask
│
└── package.json                     # Root package.json
```

---

## Getting Started

### Prerequisites
- Node.js v18 or higher
- MongoDB (local or Atlas)
- AWS Account (optional — for S3 and SQS)
- Gmail account (optional — for email notifications)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/planex.git
cd planex

# 2. Install server dependencies
cd server
npm install

# 3. Install client dependencies
cd ../client
npm install
```

### Setup Environment Variables

```bash
cp server/.env.example server/.env
```

Open `server/.env` and fill in your values (see Environment Variables section below).

### Run the App

```bash
# Terminal 1 — API Server (port 5000)
cd server
npm run dev

# Terminal 2 — React Client (port 3000)
cd client
npm start

# Terminal 3 — Queue Worker (optional, requires AWS SQS)
cd server
node queueWorker.js
```

Open **http://localhost:3000**

---

## Environment Variables

Create `server/.env` with the following:

```env
# ── Core (required) ───────────────────────────────────────────────────────────
MONGO_URI=mongodb://localhost:27017/planex
JWT_SECRET=your_super_secret_jwt_key_minimum_32_chars
PORT=5000
CLIENT_URL=http://localhost:3000

# ── AWS S3 — file attachments (optional) ─────────────────────────────────────
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_S3_BUCKET=your-planex-bucket-name

# ── AWS SQS — async email queue (optional) ───────────────────────────────────
AWS_SQS_QUEUE_URL=https://sqs.eu-north-1.amazonaws.com/YOUR_ACCOUNT_ID/taskflow-notifications.fifo

# ── Email via Gmail SMTP (optional, required for queue worker) ────────────────
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=PlanEx <your@gmail.com>
```

> **Note:** The app runs without AWS and email configured. S3 and SQS errors are caught silently — tasks create and update normally without them.

---

## API Reference

### Auth
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login | No |
| GET | `/api/auth/me` | Get current user | Yes |
| PUT | `/api/auth/theme` | Update theme preference | Yes |

### Tasks
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/tasks` | Get tasks (supports `?project=`, `?myTasks=true`, `?status=`, `?priority=`) | Yes |
| POST | `/api/tasks` | Create task | Yes |
| GET | `/api/tasks/:id` | Get single task with all populated data | Yes |
| PUT | `/api/tasks/:id` | Update task | Yes |
| DELETE | `/api/tasks/:id` | Delete task (creator only) | Yes |
| PUT | `/api/tasks/bulk/update` | Bulk update tasks (whitelisted fields only) | Yes |
| POST | `/api/tasks/:id/comments` | Add comment | Yes |
| POST | `/api/tasks/:id/attachments` | Upload file to S3 | Yes |
| DELETE | `/api/tasks/:id/attachments/:attachmentId` | Delete file from S3 | Yes |
| POST | `/api/tasks/:id/subtasks` | Add subtask | Yes |
| PUT | `/api/tasks/:id/subtasks/:subtaskId` | Update subtask | Yes |

### Projects
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/projects` | Get user's projects with task counts | Yes |
| POST | `/api/projects` | Create project | Yes |
| GET | `/api/projects/:id` | Get project details | Yes |
| PUT | `/api/projects/:id` | Update project | Yes |
| DELETE | `/api/projects/:id` | Delete project (owner only) | Yes |
| POST | `/api/projects/:id/members` | Add member | Yes |
| GET | `/api/projects/:id/stats` | Get project stats (aggregation) | Yes |

### Users
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/users` | Get all users (for assignee picker) | Yes |
| PUT | `/api/users/profile` | Update profile | Yes |
| GET | `/api/users/notifications` | Get notifications | Yes |
| PUT | `/api/users/notifications/read-all` | Mark all read | Yes |
| PUT | `/api/users/notifications/:id/read` | Mark one read | Yes |

### Dashboard
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/dashboard` | Get all dashboard stats in one query | Yes |

---

## AWS Setup

### S3 (File Storage)
1. Create S3 bucket — uncheck "Block all public access"
2. Add bucket policy for public read
3. Add CORS configuration allowing your domain
4. Create IAM user with `AmazonS3FullAccess`
5. Generate access keys and add to `.env`

### SQS (Email Queue)
1. Create FIFO queue named `taskflow-notifications.fifo`
2. Enable **Content-based deduplication**
3. Attach `AmazonSQSFullAccess` to your IAM user
4. Copy Queue URL to `.env`
5. Run `node queueWorker.js` in a separate terminal

### Gmail App Password
1. Enable 2-Step Verification on your Google account
2. Go to Security → App passwords → Generate
3. Copy 16-character password to `EMAIL_PASS` in `.env`

---

## Scripts

```bash
# Server
npm run dev      # Start with nodemon (development)
npm start        # Start without nodemon (production)
npm run worker   # Start SQS queue worker

# Client
npm start        # Start React dev server
npm run build    # Build for production
```

---

## Key Design Decisions

- **Aggregation pipelines** — Dashboard and project stats use MongoDB `$facet` to run all stat queries in a single DB round trip instead of multiple queries
- **Socket rooms** — Two room types: `project:id` for Kanban updates, `user:id` for personal My Tasks and notifications
- **Optimistic UI** — Kanban drag/drop updates Redux immediately before API confirmation
- **SQS decoupling** — Email notifications pushed to queue so API never waits for SMTP — user gets instant response
- **Redux + local state** — Project task list in Redux (Kanban/List), My Tasks in local component state (personal view)
- **Defensive array handling** — All components guard against non-array API responses

---

## License

MIT