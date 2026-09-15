const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'dummy'
});

const MODEL = 'openai/gpt-oss-120b';

// ============================================================
// RATE LIMIT CONTROL
// ============================================================

const MIN_REQUEST_INTERVAL = 12000;

let lastRequestTime = 0;
let requestQueue = Promise.resolve();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function compactPaperAnalyses(paperAnalyses) {
  if (!Array.isArray(paperAnalyses)) {
    return [];
  }

  return paperAnalyses.map((paper) => ({
    filename: paper.filename || '',
    title: paper.title || '',
    researchProblem: truncateText(
      paper.researchProblem,
      700
    ),
    methodology: truncateText(
      paper.methodology,
      700
    ),
    dataset: truncateText(
      paper.dataset,
      400
    ),
    keyFindings: Array.isArray(paper.keyFindings)
      ? paper.keyFindings
        .slice(0, 4)
        .map((item) => truncateText(item, 400))
      : [],
    evaluationMetrics: Array.isArray(
      paper.evaluationMetrics
    )
      ? paper.evaluationMetrics.slice(0, 5)
      : [],
    limitations: Array.isArray(paper.limitations)
      ? paper.limitations
        .slice(0, 5)
        .map((item) => truncateText(item, 400))
      : [],
    relevantQuote: truncateText(
      paper.relevantQuote,
      500
    )
  }));
}

// ============================================================
// GROQ CALL
// ============================================================

async function callGroqWithRetry(
  systemPrompt,
  userPrompt,
  jsonSchema,
  retries = 1,
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
        (
          err.status === 429 ||
          err.code === 429 ||
          err.error?.code === 'rate_limit_exceeded'
        );

      if (isRateLimit) {
        console.error('Groq rate limit reached.');

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
          'LLM call failed: ' +
          (err?.message || 'Unknown error')
        );
      }

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
You are a strict academic research assistant.

Analyze the provided paper relative to:
"${topic}"

Use only information supported by the provided paper text.

Do not invent findings, datasets, limitations, metrics,
or quotations.

Return a concise structured analysis.
`;

  const schema = {
    name: 'PaperAnalysis',

    schema: {
      type: 'object',

      properties: {
        filename: {
          type: 'string'
        },

        title: {
          type: 'string'
        },

        researchProblem: {
          type: 'string'
        },

        methodology: {
          type: 'string'
        },

        dataset: {
          type: 'string'
        },

        keyFindings: {
          type: 'array',
          items: {
            type: 'string'
          }
        },

        evaluationMetrics: {
          type: 'array',
          items: {
            type: 'string'
          }
        },

        limitations: {
          type: 'array',
          items: {
            type: 'string'
          }
        },

        relevantQuote: {
          type: 'string'
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

    1,

    {
      reasoning_effort: 'low',
      max_completion_tokens: 1000
    }
  );
}

// ============================================================
// COMBINED RESEARCH SYNTHESIS
// ============================================================

async function synthesizeResearch(
  topic,
  paperAnalyses
) {
  const compactAnalyses =
    compactPaperAnalyses(paperAnalyses);

  const systemPrompt = `
You are a strict academic research synthesis assistant.

Research topic:
"${topic}"

You are given structured analyses of research papers.

Using ONLY those analyses, produce:

1. Research landscape
2. Research gaps
3. Contradictions
4. Research opportunities

All findings must be grounded in the supplied papers.

Do not invent evidence.

Do not force contradictions.

If no meaningful contradiction exists, return an empty
contradictions array.

Research opportunities must be based on the identified gaps.

Do not claim that any opportunity is guaranteed to be novel.
`;

  const schema = {
    name: 'ResearchSynthesis',

    schema: {
      type: 'object',

      properties: {
        landscape: {
          type: 'object',

          properties: {
            landscapeSummary: {
              type: 'string'
            },

            commonThemes: {
              type: 'array',
              items: {
                type: 'string'
              }
            },

            divergingApproaches: {
              type: 'array',
              items: {
                type: 'string'
              }
            }
          },

          required: [
            'landscapeSummary',
            'commonThemes',
            'divergingApproaches'
          ]
        },

        gaps: {
          type: 'object',

          properties: {
            gaps: {
              type: 'array',
              items: {
                type: 'string'
              }
            }
          },

          required: ['gaps']
        },

        contradictions: {
          type: 'object',

          properties: {
            contradictions: {
              type: 'array',
              items: {
                type: 'string'
              }
            }
          },

          required: ['contradictions']
        },

        opportunities: {
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
      },

      required: [
        'landscape',
        'gaps',
        'contradictions',
        'opportunities'
      ]
    }
  };

  return await callGroqWithRetry(
    systemPrompt,

    `Paper analyses:
${JSON.stringify(compactAnalyses)}`,

    schema,

    1,

    {
      reasoning_effort: 'low',
      max_completion_tokens: 1600
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

Compare the user's research idea against ONLY the
uploaded paper analyses and research landscape.

Assess overlap with existing work.

Identify overlapping papers and explain the overlap.

Assign noveltyScore as high, medium, or low.

This is only a comparison against the uploaded papers.
Do not claim universal novelty.

Suggest concrete ways to differentiate the idea.
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
    1,
    {
      reasoning_effort: 'low',
      max_completion_tokens: 1000
    }
  );
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  analyzePaper,
  synthesizeResearch,
  challengeIdea
};