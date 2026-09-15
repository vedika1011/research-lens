const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'dummy'
});

const MODEL = 'openai/gpt-oss-120b';

// ============================================================
// RATE LIMIT / TOKEN CONTROL
// ============================================================

// Keep requests spaced out instead of sending many requests
// to Groq at the same time.
const MIN_REQUEST_INTERVAL = 12000; // 12 seconds

let lastRequestTime = 0;
let requestQueue = Promise.resolve();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Queue all Groq requests so they happen one at a time.
function queueGroqRequest(fn) {
  const nextRequest = requestQueue.then(async () => {
    const now = Date.now();
    const elapsed = now - lastRequestTime;

    if (elapsed < MIN_REQUEST_INTERVAL) {
      await sleep(MIN_REQUEST_INTERVAL - elapsed);
    }

    lastRequestTime = Date.now();

    return fn();
  });

  // Keep the queue alive even if one request fails.
  requestQueue = nextRequest.catch(() => { });

  return nextRequest;
}

// ============================================================
// TEXT CONTROL
// ============================================================

function truncateText(text, maxChars = 3500) {
  if (!text || text.length <= maxChars) {
    return text || '';
  }

  const half = Math.floor(maxChars / 2);

  return (
    text.substring(0, half) +
    '\n\n...[TRUNCATED MIDDLE]...\n\n' +
    text.substring(text.length - half)
  );
}

// Keep downstream prompts compact.
// We do not need to send every large field repeatedly.
function compactPaperAnalyses(paperAnalyses) {
  if (!Array.isArray(paperAnalyses)) {
    return [];
  }

  return paperAnalyses.map((paper) => ({
    filename: paper.filename || '',
    title: paper.title || '',
    researchProblem: truncateText(paper.researchProblem, 700),
    methodology: truncateText(paper.methodology, 700),
    dataset: truncateText(paper.dataset, 400),
    keyFindings: Array.isArray(paper.keyFindings)
      ? paper.keyFindings.slice(0, 4).map((item) => truncateText(item, 400))
      : [],
    evaluationMetrics: Array.isArray(paper.evaluationMetrics)
      ? paper.evaluationMetrics.slice(0, 5)
      : [],
    limitations: Array.isArray(paper.limitations)
      ? paper.limitations.slice(0, 5).map((item) => truncateText(item, 400))
      : [],
    relevantQuote: truncateText(paper.relevantQuote, 500)
  }));
}

// ============================================================
// GROQ CALL WITH RETRY
// ============================================================

async function callGroqWithRetry(
  systemPrompt,
  userPrompt,
  jsonSchema,
  retries = 2,
  extraParams = {}
) {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      const completion = await queueGroqRequest(() =>
        groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],

          model: MODEL,

          response_format: {
            type: 'json_schema',
            json_schema: jsonSchema
          },

          ...extraParams
        })
      );

      const responseText =
        completion.choices[0]?.message?.content || '{}';

      return JSON.parse(responseText);

    } catch (err) {
      const isRateLimit =
        err &&
        (err.status === 429 ||
          err.code === 429 ||
          err.error?.code === 'rate_limit_exceeded');

      if (isRateLimit) {
        console.error('Groq rate limit reached.');

        // Wait before retrying instead of immediately sending
        // another request.
        if (attempt < retries) {
          console.log(
            'Waiting 30 seconds before retrying...'
          );

          await sleep(30000);

          attempt++;
          continue;
        }

        throw new Error(
          'Analysis is temporarily rate-limited. Please wait about a minute and try again.'
        );
      }

      attempt++;

      console.error(
        `LLM Call failed on attempt ${attempt}:`,
        err?.message || err
      );

      if (attempt > retries) {
        throw new Error(
          'LLM call or parsing failed after retries: ' +
          (err?.message || 'Unknown error')
        );
      }

      // Short delay for non-rate-limit errors.
      await sleep(3000);
    }
  }
}

// ============================================================
// PAPER ANALYSIS
// ============================================================

async function analyzePaper(topic, paper) {
  const truncatedText = truncateText(
    paper.extractedText,
    3500
  );

  const systemPrompt = `
You are a strict, analytical research assistant.

Analyze the provided academic paper relative to the research topic:
"${topic}"

Use only information supported by the provided paper text.

Do not invent findings, datasets, limitations, metrics, or quotations.

Return a concise but useful structured analysis.
`;

  const schema = {
    name: 'PaperAnalysis',

    schema: {
      type: 'object',

      properties: {
        filename: {
          type: 'string',
          description: 'The filename of the paper'
        },

        title: {
          type: 'string',
          description:
            'Best guess of the paper title based on the text'
        },

        researchProblem: {
          type: 'string',
          description:
            'A concise description of the problem the paper addresses'
        },

        methodology: {
          type: 'string',
          description:
            'A concise summary of the methods used'
        },

        dataset: {
          type: 'string',
          description:
            "Datasets or inputs used, or 'Not applicable'/'Not mentioned'"
        },

        keyFindings: {
          type: 'array',
          items: {
            type: 'string'
          },
          description:
            'Important findings supported by the paper'
        },

        evaluationMetrics: {
          type: 'array',
          items: {
            type: 'string'
          },
          description:
            'Metrics used to evaluate the methodology'
        },

        limitations: {
          type: 'array',
          items: {
            type: 'string'
          },
          description:
            'Limitations mentioned or clearly supported by the paper'
        },

        relevantQuote: {
          type: 'string',
          description:
            'A short exact quote from the provided text supporting the research problem'
        }
      },

      required: [
        'filename',
        'title',
        'researchProblem',
        'methodology',
        'dataset',
        'keyFindings',
        'evaluationMetrics',
        'limitations',
        'relevantQuote'
      ]
    }
  };

  return await callGroqWithRetry(
    systemPrompt,

    `Paper filename: ${paper.filename}

Paper text:
${truncatedText}`,

    schema,

    2,

    {
      reasoning_effort: 'low',
      max_completion_tokens: 1000
    }
  );
}

// ============================================================
// RESEARCH LANDSCAPE
// ============================================================

async function synthesizeLandscape(
  topic,
  paperAnalyses
) {
  const compactAnalyses =
    compactPaperAnalyses(paperAnalyses);

  const systemPrompt = `
You are a strict research synthesis AI.

You will receive concise structured analyses of research papers about:
"${topic}"

Synthesize the research landscape using only the provided analyses.

Do not invent information.
`;

  const schema = {
    name: 'LandscapeSynthesis',

    schema: {
      type: 'object',

      properties: {
        landscapeSummary: {
          type: 'string',
          description:
            '2-3 concise sentences summarizing the collective research landscape'
        },

        commonThemes: {
          type: 'array',
          items: {
            type: 'string'
          },
          description:
            'Themes shared across multiple papers'
        },

        divergingApproaches: {
          type: 'array',
          items: {
            type: 'string'
          },
          description:
            'Important differences in methods, approaches, or findings'
        }
      },

      required: [
        'landscapeSummary',
        'commonThemes',
        'divergingApproaches'
      ]
    }
  };

  return await callGroqWithRetry(
    systemPrompt,

    `Paper analyses:
${JSON.stringify(compactAnalyses)}`,

    schema,

    2,

    {
      reasoning_effort: 'low',
      max_completion_tokens: 700
    }
  );
}

// ============================================================
// RESEARCH GAPS
// ============================================================

async function extractGaps(
  topic,
  paperAnalyses
) {
  const compactAnalyses =
    compactPaperAnalyses(paperAnalyses);

  const systemPrompt = `
You are a research assistant.

Given the research topic and structured analyses of several papers,
identify meaningful research gaps that emerge across the literature.

Use only the provided evidence.

Avoid generic statements such as "more research is needed."
`;

  const schema = {
    name: 'GapsExtraction',

    schema: {
      type: 'object',

      properties: {
        gaps: {
          type: 'array',

          items: {
            type: 'string'
          },

          description:
            'Specific research gaps grounded in the provided papers'
        }
      },

      required: ['gaps']
    }
  };

  return await callGroqWithRetry(
    systemPrompt,

    `Topic: ${topic}

Paper analyses:
${JSON.stringify(compactAnalyses)}`,

    schema,

    2,

    {
      reasoning_effort: 'low',
      max_completion_tokens: 700
    }
  );
}

// ============================================================
// CONTRADICTIONS
// ============================================================

async function extractContradictions(
  topic,
  paperAnalyses
) {
  const compactAnalyses =
    compactPaperAnalyses(paperAnalyses);

  const systemPrompt = `
You are a research assistant.

Compare the provided paper analyses for the topic:
"${topic}"

Identify genuine contradictions or conflicting findings.

Only report contradictions that are actually supported by the provided analyses.

If there is no meaningful contradiction, return an empty list.

Do not force a contradiction.
`;

  const schema = {
    name: 'ContradictionsExtraction',

    schema: {
      type: 'object',

      properties: {
        contradictions: {
          type: 'array',

          items: {
            type: 'string'
          },

          description:
            'Genuine contradictions or conflicting findings'
        }
      },

      required: ['contradictions']
    }
  };

  return await callGroqWithRetry(
    systemPrompt,

    `Topic: ${topic}

Paper analyses:
${JSON.stringify(compactAnalyses)}`,

    schema,

    2,

    {
      reasoning_effort: 'low',
      max_completion_tokens: 700
    }
  );
}

// ============================================================
// RESEARCH OPPORTUNITIES
// ============================================================

async function extractOpportunities(
  topic,
  paperAnalyses,
  landscape,
  gaps,
  contradictions
) {
  const compactAnalyses =
    compactPaperAnalyses(paperAnalyses);

  const compactLandscape = {
    landscapeSummary:
      landscape?.landscapeSummary || '',

    commonThemes:
      landscape?.commonThemes || [],

    divergingApproaches:
      landscape?.divergingApproaches || []
  };

  const compactGaps = {
    gaps: Array.isArray(gaps?.gaps)
      ? gaps.gaps.slice(0, 6)
      : []
  };

  const compactContradictions = {
    contradictions:
      Array.isArray(contradictions?.contradictions)
        ? contradictions.contradictions.slice(0, 6)
        : []
  };

  const systemPrompt = `
You are a research assistant.

Generate 3-5 concrete research opportunities based only on:

1. The research topic
2. The paper analyses
3. The research landscape
4. Identified research gaps
5. Identified contradictions

Every opportunity must be traceable to the provided literature.

Do not claim guaranteed novelty or guaranteed success.
`;

  const schema = {
    name: 'OpportunitiesExtraction',

    schema: {
      type: 'object',

      properties: {
        opportunities: {
          type: 'array',

          items: {
            type: 'object',

            properties: {
              title: {
                type: 'string'
              },

              description: {
                type: 'string'
              },

              researchQuestion: {
                type: 'string'
              },

              whyItMatters: {
                type: 'string'
              },

              basedOnGaps: {
                type: 'array',

                items: {
                  type: 'string'
                }
              },

              evidence: {
                type: 'array',

                items: {
                  type: 'object',

                  properties: {
                    filename: {
                      type: 'string'
                    },

                    supportingPoint: {
                      type: 'string'
                    }
                  },

                  required: [
                    'filename',
                    'supportingPoint'
                  ]
                }
              }
            },

            required: [
              'title',
              'description',
              'researchQuestion',
              'whyItMatters',
              'basedOnGaps',
              'evidence'
            ]
          }
        }
      },

      required: ['opportunities']
    }
  };

  const userPayload = JSON.stringify({
    topic,
    paperAnalyses: compactAnalyses,
    landscape: compactLandscape,
    gaps: compactGaps,
    contradictions: compactContradictions
  });

  return await callGroqWithRetry(
    systemPrompt,
    userPayload,
    schema,
    2,
    {
      reasoning_effort: 'low',
      max_completion_tokens: 1200
    }
  );
}

// ============================================================
// CHALLENGE MY IDEA
// ============================================================

async function challengeIdea(
  topic,
  paperAnalyses,
  landscape,
  ideaText
) {
  if (
    !ideaText ||
    ideaText.trim().split(/\s+/).length < 10
  ) {
    throw new Error(
      'Idea text too short. Provide a more detailed description.'
    );
  }

  const compactAnalyses =
    compactPaperAnalyses(paperAnalyses);

  const compactLandscape = {
    landscapeSummary:
      landscape?.landscapeSummary || '',

    commonThemes:
      landscape?.commonThemes || [],

    divergingApproaches:
      landscape?.divergingApproaches || []
  };

  const systemPrompt = `
You are a research assistant.

Compare the user's proposed research idea against ONLY the uploaded
paper analyses and synthesized landscape.

Assess overlap with the existing uploaded literature.

Identify specific papers that overlap and explain why.

Assign noveltyScore as:
- high
- medium
- low

This novelty assessment is relative only to the provided papers.

Do not claim that the idea is universally novel.

Suggest concrete ways the user could differentiate the idea.
`;

  const userPayload = JSON.stringify({
    topic,

    paperAnalyses: compactAnalyses,

    landscape: compactLandscape,

    ideaText
  });

  const schema = {
    name: 'ChallengeIdea',

    schema: {
      type: 'object',

      properties: {
        overlapAssessment: {
          type: 'string'
        },

        overlappingPapers: {
          type: 'array',

          items: {
            type: 'object',

            properties: {
              filename: {
                type: 'string'
              },

              overlapPoint: {
                type: 'string'
              }
            },

            required: [
              'filename',
              'overlapPoint'
            ]
          }
        },

        noveltyScore: {
          type: 'string',

          enum: [
            'high',
            'medium',
            'low'
          ]
        },

        noveltyReasoning: {
          type: 'string'
        },

        differentiationSuggestions: {
          type: 'array',

          items: {
            type: 'string'
          }
        }
      },

      required: [
        'overlapAssessment',
        'overlappingPapers',
        'noveltyScore',
        'noveltyReasoning',
        'differentiationSuggestions'
      ]
    }
  };

  return await callGroqWithRetry(
    systemPrompt,
    userPayload,
    schema,
    2,
    {
      reasoning_effort: 'low',
      max_completion_tokens: 1200
    }
  );
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  analyzePaper,
  synthesizeLandscape,
  extractGaps,
  extractContradictions,
  extractOpportunities,
  challengeIdea
};