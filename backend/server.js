const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
require('dotenv').config();

const {
  analyzeResearch,
  challengeIdea
} = require('./llmService');

const app = express();

const port =
  process.env.PORT || 3001;

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
    fileSize:
      15 * 1024 * 1024,

    files: 5
  }
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get(
  '/api/health',
  (req, res) => {
    res.json({
      status: 'ok',
      service:
        'ResearchLens backend'
    });
  }
);

// ============================================================
// UPLOAD + PDF EXTRACTION
// ============================================================

app.post(
  '/api/upload',
  upload.array('files', 5),

  async (req, res) => {
    try {
      const topic =
        req.body.topic;

      if (!topic) {
        return res.status(400).json({
          error:
            'Topic is required.'
        });
      }

      if (
        !req.files ||
        req.files.length === 0
      ) {
        return res.status(400).json({
          error:
            'At least one PDF file is required.'
        });
      }

      const papers = [];

      for (
        const file of req.files
      ) {
        const paperData = {
          filename:
            file.originalname,

          pageCount: 0,

          extractedText:
            null,

          error: null
        };

        if (
          file.mimetype !==
          'application/pdf'
        ) {
          paperData.error =
            'Invalid file type. Only PDFs are allowed.';

          papers.push(
            paperData
          );

          continue;
        }

        try {
          const data =
            await pdfParse(
              file.buffer
            );

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

        papers.push(
          paperData
        );
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
// COMPLETE RESEARCH ANALYSIS
// ONE GROQ CALL
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
          (paper) =>
            !paper.error &&
            paper.extractedText
        );

      if (
        validPapers.length === 0
      ) {
        return res.status(400).json({
          error:
            'No valid text to analyze from the provided papers.'
        });
      }

      console.log(
        `Starting analysis of ${validPapers.length} paper(s)...`
      );

      // ========================================================
      // ONE AI CALL
      // ========================================================

      let analysisResult;

      try {
        analysisResult =
          await analyzeResearch(
            topic,
            validPapers
          );

      } catch (err) {
        console.error(
          'Research analysis failed:',
          err
        );

        return res.status(500).json({
          error: err.message
        });
      }

      // ========================================================
      // MATCH AI RESULTS TO UPLOADED PAPERS
      // ========================================================

      const analyzedPapers =
        papers.map(
          (paper) => {
            const aiAnalysis =
              analysisResult.papers?.find(
                (result) =>
                  result.filename ===
                  paper.filename
              );

            if (
              aiAnalysis
            ) {
              return {
                ...paper,
                analysis:
                  aiAnalysis,
                llmError:
                  null
              };
            }

            if (
              paper.error ||
              !paper.extractedText
            ) {
              return {
                ...paper,
                analysis:
                  null,
                llmError:
                  null
              };
            }

            return {
              ...paper,
              analysis:
                null,
              llmError:
                'No analysis returned for this paper.'
            };
          }
        );

      // ========================================================
      // REMOVE RAW TEXT
      // ========================================================

      const cleanPapers =
        analyzedPapers.map(
          ({
            extractedText,
            ...rest
          }) => rest
        );

      // ========================================================
      // RETURN EVERYTHING
      // ========================================================

      return res.json({
        topic,

        landscape:
          analysisResult.landscape ||
          null,

        landscapeError:
          null,

        gaps:
          analysisResult.gaps ||
          null,

        contradictions:
          analysisResult.contradictions ||
          null,

        opportunities:
          analysisResult.opportunities ||
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

      return res.json(
        result
      );

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