const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'dummy'
});

const MODEL = 'openai/gpt-oss-120b';

function truncateText(text, maxChars = 4000) {
  if (!text || text.length <= maxChars) return text;
  // Take first 2000 and last 2000 characters
  const half = Math.floor(maxChars / 2);
  return text.substring(0, half) + '\n\n...[TRUNCATED MIDDLE]...\n\n' + text.substring(text.length - half);
}

async function callGroqWithRetry(systemPrompt, userPrompt, jsonSchema, retries = 1, extraParams = {}) {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: MODEL,
        response_format: {
          type: 'json_schema',
          json_schema: jsonSchema
        },
        ...extraParams
      });
      const responseText = completion.choices[0]?.message?.content || '{}';
      return JSON.parse(responseText);
    } catch (err) {
      // Handle rate limiting gracefully
      if (err && (err.status === 429 || err.code === 429)) {
        throw new Error('Analysis is temporarily rate-limited. Please wait about a minute and try again.');
      }
      attempt++;
      console.error(`LLM Call failed on attempt ${attempt}:`, err.message);
      if (attempt > retries) {
        throw new Error('LLM call or parsing failed after retries: ' + err.message);
      }
    }
  }
}

async function analyzePaper(topic, paper) {
  const truncatedText = truncateText(paper.extractedText);
  const systemPrompt = `You are a strict, analytical research assistant. Extract information from the provided academic paper text relative to the research topic: "${topic}". Provide a comprehensive breakdown based on the schema.`;
  
  const schema = {
    name: "PaperAnalysis",
    schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "The filename of the paper" },
        title: { type: "string", description: "Best guess of the paper title based on the text" },
        researchProblem: { type: "string", description: "A concise description of the problem the paper addresses" },
        methodology: { type: "string", description: "A brief summary of the methods used" },
        dataset: { type: "string", description: "Datasets or inputs used (or 'Not applicable'/'Not mentioned')" },
        keyFindings: { type: "array", items: { type: "string" }, description: "Key findings from the paper" },
        evaluationMetrics: { type: "array", items: { type: "string" }, description: "Metrics used to evaluate the methodology" },
        limitations: { type: "array", items: { type: "string" }, description: "Limitations mentioned in the paper" },
        relevantQuote: { type: "string", description: "A short, exact verbatim quote from the text that best supports the research problem" }
      },
      required: ["filename", "title", "researchProblem", "methodology", "dataset", "keyFindings", "evaluationMetrics", "limitations", "relevantQuote"]
    }
  };

  return await callGroqWithRetry(
    systemPrompt,
    `Paper filename: ${paper.filename}\n\nPaper text:\n${truncatedText}`,
    schema,
    1,
    { reasoning_effort: "low", max_completion_tokens: 1500 }
  );
}

async function synthesizeLandscape(topic, paperAnalyses) {
  const systemPrompt = `You are a strict research synthesis AI. You will receive an array of JSON objects representing summaries of several research papers on the topic: "${topic}". Synthesize the landscape across all these papers into the required schema.`;
  
  const schema = {
    name: "LandscapeSynthesis",
    schema: {
      type: "object",
      properties: {
        landscapeSummary: { type: "string", description: "2-3 sentences summarizing the collective coverage and state of research in these papers regarding the topic." },
        commonThemes: { type: "array", items: { type: "string" }, description: "Themes or topics that are common across multiple papers." },
        divergingApproaches: { type: "array", items: { type: "string" }, description: "Differing methods, approaches, or conclusions between the papers (e.g. approach A vs approach B)." }
      },
      required: ["landscapeSummary", "commonThemes", "divergingApproaches"]
    }
  };

  return await callGroqWithRetry(systemPrompt, `Paper summaries:\n${JSON.stringify(paperAnalyses, null, 2)}`, schema);
}

async function extractGaps(topic, paperAnalyses) {
  const systemPrompt = `You are a research assistant. Given the topic and an array of paper analyses, identify the research gaps that emerge across these papers. Provide a concise list of gaps.`;
  const schema = {
    name: "GapsExtraction",
    schema: {
      type: "object",
      properties: {
        gaps: { type: "array", items: { type: "string" }, description: "List of identified research gaps across the analyses" }
      },
      required: ["gaps"]
    }
  };
  return await callGroqWithRetry(
    systemPrompt,
    `Topic: ${topic}\n\nPaper Analyses:\n${JSON.stringify(paperAnalyses, null, 2)}`,
    schema,
    1,
    { reasoning_effort: "low", max_completion_tokens: 1000 }
  );
}

async function extractContradictions(topic, paperAnalyses) {
  const systemPrompt = `You are a research assistant. Given the topic and an array of paper analyses, find any contradictions or conflicting findings among the papers. Provide a concise list of contradictions.`;
  const schema = {
    name: "ContradictionsExtraction",
    schema: {
      type: "object",
      properties: {
        contradictions: { type: "array", items: { type: "string" }, description: "List of contradictions found across the analyses" }
      },
      required: ["contradictions"]
    }
  };
  return await callGroqWithRetry(systemPrompt, `Topic: ${topic}\n\nPaper Analyses:\n${JSON.stringify(paperAnalyses, null, 2)}`, schema);
}

module.exports = {
  analyzePaper,
  synthesizeLandscape,
  extractGaps,
  extractContradictions
};
