# ResearchLens

ResearchLens is an AI-powered research assistant that turns research papers into actionable research directions. Instead of just summarizing papers, it helps you identify gaps, spot contradictions, and generate concrete research opportunities grounded in the literature you upload.

**From papers to research opportunities.**

## What it does

- Upload up to 5 research papers (PDF)
- Extract and analyze each paper's methodology, findings, dataset, and limitations
- Generate a research landscape: common themes and diverging approaches across papers
- Detect evidence-backed research gaps (dataset, methodology, evaluation, application, theoretical)
- Detect contradictions between papers, with possible explanations for the conflict
- Generate 3 to 5 research opportunities derived directly from the identified gaps
- Challenge My Idea: enter your own research idea and get an overlap and novelty assessment against the uploaded papers, with suggestions to differentiate it

Every gap, contradiction, and opportunity is backed by a specific paper and supporting evidence, not an unsupported model claim.

## Core flow

Papers -> Analysis -> Landscape -> Gaps -> Contradictions -> Opportunities -> Your Idea


## Tech stack

- Frontend: React, Tailwind CSS
- Backend: Node.js, Express
- LLM: Groq API (openai/gpt-oss-120b)
- PDF extraction: pdf-parse
- Deployment: Vercel

## Getting started

### Prerequisites

- Node.js 18 or later
- A Groq API key

### Setup

1. Clone the repository

```bash
git clone https://github.com/<your-username>/research-lens.git
cd research-lens
```

2. Install dependencies

```bash
# backend
cd backend
npm install

# frontend
cd ../frontend
npm install
```

3. Configure environment variables

Create a `.env` file in `/backend`:

GROQ_API_KEY=your_groq_api_key_here


4. Run locally

```bash
# from /backend
npm run dev

# from /frontend, in a separate terminal
npm run dev
```

The frontend will run on `http://localhost:5173` (or your configured Vite port) and the backend on `http://localhost:3000` (or as configured).

## Deployment

Deployed on Vercel under the project name `research-lens`.

To deploy your own instance:

1. Push the repository to GitHub
2. Import the project into Vercel
3. Set the `GROQ_API_KEY` environment variable in the Vercel project settings
4. Deploy

## Project structure

research-lens/
├── frontend/ React + Tailwind app
├── backend/ Express API, PDF extraction, Groq integration
└── README.md


## Notes

This is a hackathon MVP. It does not include authentication, a database, or persistent storage. Uploaded papers and analysis results exist only for the duration of a session.