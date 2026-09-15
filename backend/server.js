const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
require('dotenv').config();

const { analyzePaper, synthesizeLandscape } = require('./llmService');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
// Increased limit because extractedText arrays can be large
app.use(express.json({ limit: '50mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 5
  }
});

app.post('/api/upload', upload.array('files', 5), async (req, res) => {
  try {
    const topic = req.body.topic;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required.' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'At least one PDF file is required.' });
    }

    const papers = [];

    for (const file of req.files) {
      const paperData = {
        filename: file.originalname,
        pageCount: 0,
        extractedText: null,
        error: null
      };

      if (file.mimetype !== 'application/pdf') {
        paperData.error = 'Invalid file type. Only PDFs are allowed.';
        papers.push(paperData);
        continue;
      }

      try {
        const data = await pdfParse(file.buffer);
        paperData.extractedText = data.text;
        paperData.pageCount = data.numpages;
      } catch (err) {
        console.error(`Failed to parse ${file.originalname}:`, err);
        paperData.error = 'Failed to extract text from this PDF.';
      }

      papers.push(paperData);
    }

    return res.json({ topic, papers });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Internal server error processing the upload.' });
  }
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { topic, papers } = req.body;

    if (!topic || !papers || !Array.isArray(papers)) {
      return res.status(400).json({ error: 'Topic and an array of papers are required.' });
    }

    // Filter out papers that already failed in the upload stage
    const validPapers = papers.filter(p => !p.error && p.extractedText);

    if (validPapers.length === 0) {
      return res.status(400).json({ error: 'No valid text to analyze from the provided papers.' });
    }

    // 1. Analyze each paper in parallel
    const analysisPromises = validPapers.map(paper =>
      analyzePaper(topic, paper)
        .then(analysis => ({ ...paper, analysis, llmError: null }))
        .catch(err => ({ ...paper, analysis: null, llmError: err.message }))
    );

    const analyzedValidPapers = await Promise.all(analysisPromises);

    // Combine with initially invalid papers
    const allAnalyzedPapers = papers.map(p => {
      if (p.error || !p.extractedText) return { ...p, analysis: null, llmError: null };
      const matched = analyzedValidPapers.find(ap => ap.filename === p.filename);
      return matched || p;
    });

    const successfulAnalyses = analyzedValidPapers
      .filter(p => !p.llmError && p.analysis)
      .map(p => p.analysis);

    let landscape = null;
    let landscapeError = null;

    // 2. Synthesize landscape if there's at least one successful analysis
    if (successfulAnalyses.length > 0) {
      try {
        landscape = await synthesizeLandscape(topic, successfulAnalyses);
      } catch (err) {
        console.error('Landscape synthesis failed:', err);
        landscapeError = 'Failed to synthesize landscape: ' + err.message;
      }
    } else {
      landscapeError = 'Could not generate landscape summary because all paper analyses failed.';
    }

    // Only remove raw text to save bandwidth if desired, but frontend might need it? 
    // We can remove it to make response smaller, as frontend already displayed it in stage 1, but now it doesn't need it.
    const cleanPapers = allAnalyzedPapers.map(({ extractedText, ...rest }) => rest);

    return res.json({
      topic,
      landscape,
      landscapeError,
      papers: cleanPapers
    });

  } catch (error) {
    console.error('Analysis endpoint error:', error);
    return res.status(500).json({ error: 'Internal server error during analysis.' });
  }
});

app.post('/api/gaps', async (req, res) => {
  try {
    const { topic, paperAnalyses } = req.body;
    if (!topic || !paperAnalyses) {
      return res.status(400).json({ error: 'Topic and paperAnalyses are required.' });
    }
    const gapsResult = await require('./llmService').extractGaps(topic, paperAnalyses);
    return res.json(gapsResult);
  } catch (error) {
    console.error('Gaps endpoint error:', error);
    return res.status(500).json({ error: 'Internal server error during gaps extraction.' });
  }
});

app.post('/api/contradictions', async (req, res) => {
  try {
    const { topic, paperAnalyses } = req.body;
    if (!topic || !paperAnalyses) {
      return res.status(400).json({ error: 'Topic and paperAnalyses are required.' });
    }
    const contradictionsResult = await require('./llmService').extractContradictions(topic, paperAnalyses);
    return res.json(contradictionsResult);
  } catch (error) {
    console.error('Contradictions endpoint error:', error);
    return res.status(500).json({ error: 'Internal server error during contradictions extraction.' });
  }
});

app.post('/api/opportunities', async (req, res) => {
  try {
    const { topic, paperAnalyses, landscape, gaps, contradictions } = req.body;
    if (!topic || !paperAnalyses) {
      return res.status(400).json({ error: 'Topic and paperAnalyses are required.' });
    }
    const result = await require('./llmService').extractOpportunities(topic, paperAnalyses, landscape, gaps, contradictions);
    return res.json(result);
  } catch (error) {
    console.error('Opportunities endpoint error:', error);
    return res.status(500).json({ error: 'Internal server error during opportunities extraction.' });
  }
});

app.post('/api/challenge', async (req, res) => {
  try {
    const { topic, paperAnalyses, landscape, ideaText } = req.body;
    if (!topic || !paperAnalyses || !ideaText) {
      return res.status(400).json({ error: 'Topic, paperAnalyses, and ideaText are required.' });
    }
    const result = await require('./llmService').challengeIdea(topic, paperAnalyses, landscape, ideaText);
    return res.json(result);
  } catch (error) {
    console.error('Challenge endpoint error:', error);
    return res.status(500).json({ error: 'Internal server error during challenge processing.' });
  }
});
app.listen(port, '0.0.0.0', () =>
  console.log(`Backend server running on port ${port}`)
);