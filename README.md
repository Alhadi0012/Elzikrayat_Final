# Alzikrayat — MERN Edition

A full-stack photo sharing application. Users register with an email code,
upload photos to Cloudinary, and comment on each other's memories.

Course Project 3 — Advanced Web Technologies, Sudan University of Science and
Technology.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (Vite) + Redux Toolkit + React Router |
| Backend | Node.js + Express |
| Database | MongoDB with Mongoose |
| Images | Cloudinary |
| Email | Nodemailer (Gmail or any SMTP) |
| Auth | JWT + bcrypt + 6-digit OTP |

No Next.js, NestJS, Prisma or Sequelize. Every route, controller, model and
component is hand-written.

---

## Running it

You need Node 18+ and MongoDB running locally (or an Atlas connection string).

### 1. Backend

```bash
cd server
npm install
cp .env.example .env      # then fill in the values, see the table below
npm run dev               # http://localhost:5000
```

Expected output:

```
DB connected: 127.0.0.1
API running at http://localhost:5000
```

### 2. Frontend

In a second terminal:

```bash
cd client
npm install
npm run dev               # http://localhost:5173
```

Vite proxies `/api` to port 5000, so there is no CORS problem in development.

---

## Environment variables

All of these live in `server/.env`, which is git-ignored and must never be
committed.

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | yes | `mongodb://127.0.0.1:27017/alzikrayat` for a local server. Use `127.0.0.1`, not `localhost`: Node may resolve `localhost` to `::1` and fail to connect. |
| `PORT` | no | API port, default `5000`. |
| `CLIENT_URL` | no | Allowed CORS origin, default `http://localhost:5173`. |
| `JWT_SECRET` | yes | Any long random string. Changing it signs everyone out. |
| `JWT_EXPIRES_IN` | no | Token lifetime, default `7d`. |
| `CLOUDINARY_CLOUD_NAME` | for uploads | From the Cloudinary dashboard. |
| `CLOUDINARY_API_KEY` | for uploads | From the Cloudinary dashboard. |
| `CLOUDINARY_API_SECRET` | for uploads | From the Cloudinary dashboard. |
| `EMAIL_USER` | for real email | Gmail address, or the SMTP username. |
| `EMAIL_PASS` | for real email | Gmail **App Password** (16 characters), not the account password. |
| `EMAIL_FROM` | no | The From header shown to recipients. |
| `EMAIL_HOST` / `EMAIL_PORT` | no | Set these to use a provider other than Gmail (Brevo, Mailtrap…). |

`client/.env` has one optional variable, `VITE_API_URL`, needed only when the
API is deployed on a different origin from the frontend.

### Developing without email

Leave `EMAIL_USER` empty. Every OTP is printed in the server terminal instead
of being sent, so the whole flow can be built and tested before any mail
account exists. Set the variables to switch to real delivery — no code change.

### Gmail App Password

A normal Gmail password will not work. Turn on 2-Step Verification, then
Google Account → Security → App passwords, and use the 16-character value.

---

## API

All responses are JSON. Errors use `{ "error": "message", "details": {...} }`,
where `details` maps a field name to its validation message.

### Authentication

| Method | Endpoint | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | firstName, lastName, email, password, (location, occupation, description) | Creates an unverified account and emails a code. |
| POST | `/api/auth/verify-otp` | email, otp | Confirms the account, returns a JWT. |
| POST | `/api/auth/resend-otp` | email | 60-second cooldown. |
| POST | `/api/auth/login` | email, password | Refused until the account is verified. |
| POST | `/api/auth/forgot-password` | email | Always the same reply, whether or not the email exists. |
| POST | `/api/auth/reset-password` | email, otp, newPassword | Returns a JWT. |
| GET | `/api/auth/me` | — | Requires `Authorization: Bearer <token>`. |

### Photos

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/api/photos` | no | Supports `?page=` and `?limit=`. |
| GET | `/api/photos/:id` | no | Returns the photo **and** its comments. |
| GET | `/api/photos/user/:userId` | no | One user's photos. |
| GET | `/api/photos/stats` | no | Counters for the home page. |
| POST | `/api/photos` | yes | `multipart/form-data`, file field named `photo`. |
| DELETE | `/api/photos/:id` | yes | Ownership is verified first. |

### Comments

| Method | Endpoint | Auth |
|---|---|---|
| GET | `/api/photos/:id/comments` | no |
| POST | `/api/photos/:id/comments` | yes |
| DELETE | `/api/photos/:id/comments/:commentId` | yes — author or photo owner |

---

## How an upload works

```
React (FormData)
  -> POST /api/photos
  -> multer writes the file to server/uploads/
  -> the controller uploads that file to Cloudinary
  -> the local file is deleted (on success AND on failure)
  -> Mongoose saves url + publicId + metadata
  -> JSON comes back and Redux adds the photo to the gallery
```

`server/uploads/` is therefore empty between uploads. It is kept in the
repository through a `.gitkeep` file because the specification requires it.

Deleting a photo removes it from Cloudinary **first**, then from MongoDB. The
other order would leave an orphan image in Cloudinary if the database write
failed, with nothing left pointing at it.

---

## Security

- Passwords are bcrypt hashes; `select: false` keeps them out of every query.
- Only the **hash** of each OTP is stored, never the code itself.
- Codes are generated with `crypto.randomInt`, not `Math.random`.
- 3 wrong codes destroy the code and lock the account out of the OTP flow for
  60 minutes. The lock lives on the user document, so requesting a new code
  cannot clear it.
- `/api/auth/*` allows 10 failed attempts per IP per 15 minutes.
- Login answers identically for an unknown email and a wrong password.
- `forgot-password` always returns the same message, so it cannot be used to
  discover which addresses are registered.
- Upload is limited to 5 MB and to image types, checked by extension and
  mimetype together.
- Uploaded files are renamed randomly, which also prevents path traversal
  through a crafted filename.
- A request that fails validation after multer has written its file deletes
  that file, so rejected uploads cannot fill the disk.

---

## Deployment

### Option A — one service (simplest)

```bash
cd client && npm run build       # creates client/dist
cd ../server && NODE_ENV=production npm start
```

With `NODE_ENV=production` the API also serves `client/dist` and sends
`index.html` for any non-API route, so React Router works on a refresh.

On Render: root directory `server`, build command
`npm install && cd ../client && npm install && npm run build`, start command
`npm start`. Add every variable from the table above, plus `NODE_ENV=production`.

### Option B — split (Vercel + Render)

- Deploy `client` to Vercel and set `VITE_API_URL` to the API URL.
- Deploy `server` to Render and set `CLIENT_URL` to the Vercel URL, so CORS
  allows it.

MongoDB Atlas is needed in both cases — a local database is not reachable from
a hosting provider.

---

## Project structure

```
alzikrayat/
├── client/
│   ├── src/
│   │   ├── api/axiosClient.js      one axios instance + token + error shape
│   │   ├── app/store.js            Redux store
│   │   ├── features/
│   │   │   ├── auth/authSlice.js
│   │   │   ├── photos/photosSlice.js
│   │   │   └── comments/commentsSlice.js
│   │   ├── components/             Navbar, PhotoCard, CommentSection, ...
│   │   ├── pages/                  Home, Gallery, PhotoDetail, Upload, ...
│   │   ├── App.jsx                 routes
│   │   └── main.jsx                Provider + BrowserRouter
│   └── vite.config.js              dev proxy to the API
└── server/
    ├── config/                     db.js, cloudinary.js
    ├── models/                     User, Photo, Comment, Otp
    ├── routes/                     authRoutes, photoRoutes, commentRoutes
    ├── controllers/                auth, photo, comment
    ├── middleware/                 auth, validation, upload, rateLimit, errorHandler
    ├── utils/                      sendEmail, token
    ├── uploads/                    temporary files only
    └── server.js
```

---

## Manual test run

1. Register → copy the code from the server terminal (or your inbox).
2. Enter the code → you are signed in automatically.
3. Upload a photo → check it appears in Cloudinary and that `server/uploads/`
   is empty again.
4. Add a comment.
5. Register a second account in a private window and try to delete the first
   user's photo → it must be refused with 403.
6. Delete your own photo → the image disappears from Cloudinary and its
   comments disappear from MongoDB.
7. Enter a wrong code three times → the account is locked for 60 minutes.
8. Use Forgot password → reset → log in with the new password.
