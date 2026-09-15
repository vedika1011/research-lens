# ResearchLens - Stage 1

ResearchLens helps researchers go from "reading papers" to "finding what to research next." 
This repository contains the Stage 1 MVP, which is focused on setting up the project skeleton, frontend shell, and PDF extraction pipeline.

## Project Structure

- **frontend/**: React + Vite + Tailwind CSS v4 frontend.
- **backend/**: Node.js + Express backend using `pdf-parse` for text extraction and `multer` for memory-based file uploads.

## How to Run Locally

### 1. Start the Backend

Open a terminal window and navigate to the backend directory:

```bash
cd backend
npm install
npm run dev
```

The backend API will start on `http://localhost:3001`.

### 2. Start the Frontend

Open a new terminal window and navigate to the frontend directory:

```bash
cd frontend
npm install
npm run dev
```

The frontend application will run (typically on `http://localhost:5173`). Open this URL in your browser to interact with the app.

## Features Completed
- Restrained, minimalist UI tailored for researchers.
- File upload handling with limits (Max 5 PDFs, Max 15MB each).
- PDF text extraction via the backend endpoint (`POST /api/upload`).
