const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
require('dotenv').config();

const {
  analyzePaper,
  synthesizeResearch,
  challengeIdea
} = require('./llmService');

const app = express();

const port = process.env.PORT || 3001;

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());

app.use(
  express.json({
    limit: '50mb'
  })
);

// ============================================================
// FILE UPLOAD
// ============================================================

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 5
  }
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ResearchLens backend'
  });
});

// ============================================================
// STEP 1: UPLOAD + PDF EXTRACTION
// ============================================================

app.post(
  '/api/upload',
  upload.array('files', 5),
  async (req, res) => {
    try {
      const topic = req.body.topic;

      if (!topic) {
        return res.status(400).json({
          error: 'Topic is required.'
        });
      }

      if (
        !req.files ||
        req.files.length === 0
      ) {
        return res.status(400).json({
          error: 'At least one PDF file is required.'
        });
      }

      const papers = [];

      for (const file of req.files) {
        const paperData = {
          filename: file.originalname,
          pageCount: 0,
          extractedText: null,
          error: null
        };

        if (
          file.mimetype !==
          'application/pdf'
        ) {
          paperData.error =
            'Invalid file type. Only PDFs are allowed.';

          papers.push(paperData);
          continue;
        }

        try {
          const data =
            await pdfParse(file.buffer);

          paperData.extractedText =
            data.text;

          paperData.pageCount =
            data.numpages;

        } catch (err) {
          console.error(
            `Failed to parse ${file.originalname}:`,
            err
          );

          paperData.error =
            'Failed to extract text from this PDF.';
        }

        papers.push(paperData);
      }

      return res.json({
        topic,
        papers
      });

    } catch (error) {
      console.error(
        'Upload error:',
        error
      );

      return res.status(500).json({
        error:
          'Internal server error processing the upload.'
      });
    }
  }
);

// ============================================================
// STEP 2: PAPER ANALYSIS + COMPLETE SYNTHESIS
// ============================================================

app.post(
  '/api/analyze',
  async (req, res) => {
    try {
      const {
        topic,
        papers
      } = req.body;

      if (
        !topic ||
        !papers ||
        !Array.isArray(papers)
      ) {
        return res.status(400).json({
          error:
            'Topic and an array of papers are required.'
        });
      }

      const validPapers =
        papers.filter(
          (p) =>
            !p.error &&
            p.extractedText
        );

      if (
        validPapers.length === 0
      ) {
        return res.status(400).json({
          error:
            'No valid text to analyze from the provided papers.'
        });
      }

      // ========================================================
      // PAPER ANALYSIS
      // ========================================================

      const analyzedValidPapers = [];

      // IMPORTANT:
      // Process papers sequentially rather than in parallel.
      // This prevents a burst of Groq requests.

      for (
        const paper of validPapers
      ) {
        try {
          console.log(
            `Analyzing paper: ${paper.filename}`
          );

          const analysis =
            await analyzePaper(
              topic,
              paper
            );

          analyzedValidPapers.push({
            ...paper,
            analysis,
            llmError: null
          });

        } catch (err) {
          console.error(
            `Analysis failed for ${paper.filename}:`,
            err.message
          );

          analyzedValidPapers.push({
            ...paper,
            analysis: null,
            llmError: err.message
          });
        }
      }

      // ========================================================
      // COMBINE PAPER RESULTS
      // ========================================================

      const allAnalyzedPapers =
        papers.map((p) => {
          if (
            p.error ||
            !p.extractedText
          ) {
            return {
              ...p,
              analysis: null,
              llmError: null
            };
          }

          const matched =
            analyzedValidPapers.find(
              (ap) =>
                ap.filename ===
                p.filename
            );

          return matched || p;
        });

      const successfulAnalyses =
        analyzedValidPapers
          .filter(
            (p) =>
              !p.llmError &&
              p.analysis
          )
          .map(
            (p) => p.analysis
          );

      // ========================================================
      // ONE COMBINED SYNTHESIS CALL
      // ========================================================

      let synthesis = null;
      let synthesisError = null;

      if (
        successfulAnalyses.length > 0
      ) {
        try {
          console.log(
            'Generating combined research synthesis...'
          );

          synthesis =
            await synthesizeResearch(
              topic,
              successfulAnalyses
            );

        } catch (err) {
          console.error(
            'Research synthesis failed:',
            err
          );

          synthesisError =
            'Failed to generate research synthesis: ' +
            err.message;
        }

      } else {
        synthesisError =
          'Could not generate research synthesis because all paper analyses failed.';
      }

      // ========================================================
      // REMOVE RAW PDF TEXT FROM RESPONSE
      // ========================================================

      const cleanPapers =
        allAnalyzedPapers.map(
          ({
            extractedText,
            ...rest
          }) => rest
        );

      // ========================================================
      // RESPONSE
      // ========================================================

      return res.json({
        topic,

        landscape:
          synthesis?.landscape ||
          null,

        landscapeError:
          synthesisError,

        gaps:
          synthesis?.gaps ||
          null,

        contradictions:
          synthesis?.contradictions ||
          null,

        opportunities:
          synthesis?.opportunities ||
          null,

        papers:
          cleanPapers
      });

    } catch (error) {
      console.error(
        'Analysis endpoint error:',
        error
      );

      return res.status(500).json({
        error:
          'Internal server error during analysis.'
      });
    }
  }
);

// ============================================================
// CHALLENGE MY IDEA
// ============================================================

app.post(
  '/api/challenge',
  async (req, res) => {
    try {
      const {
        topic,
        paperAnalyses,
        landscape,
        ideaText
      } = req.body;

      if (
        !topic ||
        !paperAnalyses ||
        !ideaText
      ) {
        return res.status(400).json({
          error:
            'Topic, paperAnalyses, and ideaText are required.'
        });
      }

      const result =
        await challengeIdea(
          topic,
          paperAnalyses,
          landscape,
          ideaText
        );

      return res.json(result);

    } catch (error) {
      console.error(
        'Challenge endpoint error:',
        error
      );

      return res.status(500).json({
        error:
          error.message ||
          'Internal server error during challenge processing.'
      });
    }
  }
);

// ============================================================
// START SERVER
// ============================================================

app.listen(
  port,
  '0.0.0.0',
  () => {
    console.log(
      `Backend server running on port ${port}`
    );
  }
);