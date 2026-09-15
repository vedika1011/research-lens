require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.5-flash';

if (!GEMINI_API_KEY) {
  console.warn('WARNING: GEMINI_API_KEY is not set.');
}

function truncateText(text, maxChars = 6000) {
  if (!text) return '';

  if (text.length <= maxChars) {
    return text;
  }

  const half = Math.floor(maxChars / 2);

  return (
    text.substring(0, half) +
    '\n\n...[MIDDLE OF PAPER OMITTED FOR ANALYSIS]...\n\n' +
    text.substring(text.length - half)
  );
}

async function callGemini(prompt, schema, maxOutputTokens = 5000) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent` +
    `?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],

      generationConfig: {
        temperature: 0.2,
        maxOutputTokens,
        responseMimeType: 'application/json',
        responseSchema: schema
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Gemini API error:', JSON.stringify(data, null, 2));

    const message =
      data?.error?.message ||
      `Gemini API request failed with status ${response.status}`;

    throw new Error(message);
  }

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('') || '';

  if (!text) {
    console.error('Empty Gemini response:', JSON.stringify(data, null, 2));
    throw new Error('Gemini returned an empty response.');
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('Failed to parse Gemini JSON:', text);
    throw new Error('Gemini returned invalid JSON.');
  }
}


/* =========================================================
   MAIN RESEARCH ANALYSIS
   ========================================================= */

async function analyzeResearch(topic, papers) {
  const paperSections = papers
    .map((paper, index) => {
      return `
========================
PAPER ${index + 1}
========================

Filename:
${paper.filename}

Paper text:
${truncateText(paper.extractedText, 6000)}
`;
    })
    .join('\n');

  const prompt = `
You are ResearchLens, an academic research-analysis assistant.

Your job is to analyze a small collection of research papers and help a student move from:

papers → evidence → research landscape → gaps → contradictions → research opportunities.

Research topic:
"${topic}"

IMPORTANT RULES:

1. Base your analysis ONLY on the supplied paper text.
2. Do not invent datasets, results, methods, limitations, or claims.
3. If information is not present, say "Not mentioned".
4. Research gaps must emerge from the supplied papers.
5. Contradictions must be supported by differences between supplied papers.
6. Research opportunities should be reasonable extensions of the observed gaps.
7. Every opportunity must include evidence from one or more supplied papers.
8. Keep answers concise enough for a student-facing research tool.
9. relevantQuote must be a short EXACT quote copied from the supplied paper text.
10. Do not use markdown in the JSON values.

Analyze all papers and return the required JSON structure.

${paperSections}
`;

  const schema = {
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
        type: 'array',

        items: {
          type: 'string'
        }
      },

      contradictions: {
        type: 'array',

        items: {
          type: 'string'
        }
      },

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

    required: [
      'papers',
      'landscape',
      'gaps',
      'contradictions',
      'opportunities'
    ]
  };

  return await callGemini(prompt, schema, 7000);
}


/* =========================================================
   CHALLENGE MY IDEA
   ========================================================= */

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

  const prompt = `
You are ResearchLens, an academic research assistant.

The student has an existing research idea and wants to understand
how it relates to the supplied literature.

Research topic:
${topic}

Research landscape:
${JSON.stringify(landscape, null, 2)}

Paper analyses:
${JSON.stringify(paperAnalyses, null, 2)}

Student research idea:
${ideaText}

Analyze the idea ONLY against the supplied papers.

Rules:

1. Identify genuine overlap with existing work.
2. Name the papers where overlap exists.
3. Explain the specific overlap.
4. Estimate novelty relative ONLY to these supplied papers.
5. Do not claim that the idea is globally novel.
6. Suggest concrete ways to differentiate the idea.
7. Do not invent information about papers.
8. Keep the response concise and useful for a student.

Return JSON only.
`;

  const schema = {
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
  };

  return await callGemini(prompt, schema, 2500);
}


module.exports = {
  analyzeResearch,
  challengeIdea
};