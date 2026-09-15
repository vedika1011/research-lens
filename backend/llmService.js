const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'dummy'
});

const MODEL = 'openai/gpt-oss-120b';

// ============================================================
// HELPERS
// ============================================================

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function truncateText(text, maxChars = 2200) {
  if (!text || text.length <= maxChars) {
    return text || '';
  }

  const half = Math.floor(maxChars / 2);

  return (
    text.substring(0, half) +
    '\n\n...[TRUNCATED]...\n\n' +
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

    researchProblem: paper.researchProblem || '',

    methodology: paper.methodology || '',

    dataset: paper.dataset || '',

    keyFindings: Array.isArray(paper.keyFindings)
      ? paper.keyFindings.slice(0, 4)
      : [],

    evaluationMetrics: Array.isArray(
      paper.evaluationMetrics
    )
      ? paper.evaluationMetrics.slice(0, 5)
      : [],

    limitations: Array.isArray(paper.limitations)
      ? paper.limitations.slice(0, 5)
      : [],

    relevantQuote: paper.relevantQuote || ''
  }));
}

// ============================================================
// ONE GROQ REQUEST
// ============================================================

async function callGroq(
  systemPrompt,
  userPrompt,
  jsonSchema,
  maxCompletionTokens = 3000
) {
  try {
    console.log('Sending request to Groq...');

    const completion =
      await groq.chat.completions.create({
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

        reasoning_effort: 'low',

        max_completion_tokens:
          maxCompletionTokens
      });

    const responseText =
      completion.choices[0]?.message?.content ||
      '{}';

    return JSON.parse(responseText);

  } catch (err) {
    console.error(
      'Groq error:',
      err?.message || err
    );

    if (
      err?.status === 429 ||
      err?.code === 429 ||
      err?.error?.code === 'rate_limit_exceeded'
    ) {
      throw new Error(
        'Analysis is temporarily rate-limited. Please wait about a minute and try again.'
      );
    }

    throw new Error(
      err?.message ||
      'Groq analysis failed.'
    );
  }
}

// ============================================================
// MAIN ANALYSIS
// ONE CALL FOR EVERYTHING
// ============================================================

async function analyzeResearch(
  topic,
  papers
) {
  const paperInputs = papers.map(
    (paper, index) => ({
      paperNumber: index + 1,

      filename: paper.filename,

      text: truncateText(
        paper.extractedText,
        2200
      )
    })
  );

  const systemPrompt = `
You are ResearchLens, a strict academic research analysis assistant.

The user has provided several research papers about:

"${topic}"

Analyze ALL provided papers in ONE response.

Your response must contain:

1. Individual paper analyses
2. Research landscape
3. Research gaps
4. Contradictions
5. Research opportunities

IMPORTANT RULES:

- Use ONLY information present in the supplied paper text.
- Do not invent facts.
- Do not invent datasets.
- Do not invent results.
- Do not invent quotations.
- Do not force contradictions.
- If there is no meaningful contradiction, return an empty contradictions array.
- Research gaps must be grounded in the supplied papers.
- Research opportunities must be based on the identified gaps.
- Evidence must identify the relevant paper filename.
- Keep the response concise and useful.
- Do not claim that any opportunity is guaranteed to be novel.

For each paper identify:
- title
- research problem
- methodology
- dataset
- key findings
- evaluation metrics
- limitations
- one short relevant quote if available

For the landscape identify:
- overall summary
- common themes
- diverging approaches

For opportunities provide 3 concrete research directions.
`;

  const schema = {
    name: 'CompleteResearchAnalysis',

    schema: {
      type: 'object',

      properties: {
        papers: {
          type: 'array',

          items: {
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
        },

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

          required: [
            'gaps'
          ]
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

          required: [
            'contradictions'
          ]
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
            ]
},

required: [
  'opportunities'
]
        }
      },

required: [
  'papers',
  'landscape',
  'gaps',
  'contradictions',
  'opportunities'
]
    }
  };

return await callGroq(
  systemPrompt,

  `Research topic:

${topic}

Papers:

${JSON.stringify(
    paperInputs,
    null,
    2
  )}`,

  schema,

  3000
);
}

// ============================================================
// CHALLENGE MY IDEA
// ONE SEPARATE CALL
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
    compactPaperAnalyses(
      paperAnalyses
    );

  const systemPrompt = `
You are a research assistant.

Compare the user's proposed research idea against ONLY
the uploaded paper analyses and research landscape.

Identify:

- overlap with existing papers
- specific overlapping papers
- specific overlap points
- relative novelty assessment
- reasoning
- ways to differentiate the idea

The novelty assessment is ONLY relative to the uploaded papers.

Do not claim universal novelty.

Do not invent overlap.
`;

  const userPayload =
    JSON.stringify(
      {
        topic,
        paperAnalyses:
          compactAnalyses,
        landscape,
        ideaText
      },
      null,
      2
    );

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

  return await callGroq(
    systemPrompt,
    userPayload,
    schema,
    1200
  );
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  analyzeResearch,
  challengeIdea
};