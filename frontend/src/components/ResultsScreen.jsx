import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Quote
} from 'lucide-react';

export default function ResultsScreen({ data, onReset, opportunities }) {
  const [expandedIndex, setExpandedIndex] = useState(-1);

  // Challenge My Idea state
  const [ideaText, setIdeaText] = useState('');
  const [challengeResult, setChallengeResult] = useState(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeError, setChallengeError] = useState(null);

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? -1 : index);
  };

  const { landscape, landscapeError, papers, topic } = data;

  // Challenge My Idea
  const handleChallengeIdea = async () => {
    const trimmedIdea = ideaText.trim();

    if (trimmedIdea.split(/\s+/).length < 10) {
      setChallengeError(
        'Please describe your research idea in at least 10 words.'
      );
      setChallengeResult(null);
      return;
    }

    setChallengeLoading(true);
    setChallengeError(null);
    setChallengeResult(null);

    try {
      const paperAnalyses = papers
        .map((paper) => {
          if (!paper.analysis) return null;

          return {
            filename: paper.filename,
            ...paper.analysis
          };
        })
        .filter(Boolean);

      const response = await fetch(
        'http://localhost:3001/api/challenge',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            topic,
            ideaText: trimmedIdea,
            paperAnalyses,
            landscape
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'Failed to challenge the research idea.'
        );
      }

      setChallengeResult(result);
    } catch (err) {
      console.error('Challenge My Idea error:', err);
      setChallengeError(
        err.message || 'Failed to analyze the research idea.'
      );
    } finally {
      setChallengeLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto mt-12 p-6">

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">
            Research Landscape
          </h2>

          <p className="text-zinc-600 mt-1">
            Topic:{' '}
            <span className="font-medium text-zinc-900">
              {topic}
            </span>
          </p>
        </div>

        <button
          onClick={onReset}
          className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 transition-colors focus:outline-none"
        >
          Start New Analysis
        </button>
      </div>

      {/* Landscape */}
      {landscapeError ? (
        <div className="mb-10 bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800">
          {landscapeError}
        </div>
      ) : landscape ? (
        <div className="mb-12 bg-white border border-zinc-200 rounded-md p-6 shadow-sm">
          <h3 className="text-lg font-medium text-zinc-900 mb-3">
            Synthesis
          </h3>

          <p className="text-zinc-700 text-sm leading-relaxed mb-6">
            {landscape.landscapeSummary}
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 mb-2">
                Common Themes
              </h4>

              <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-700">
                {landscape.commonThemes?.map((theme, i) => (
                  <li key={i}>{theme}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-zinc-900 mb-2">
                Diverging Approaches
              </h4>

              <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-700">
                {landscape.divergingApproaches?.map((approach, i) => (
                  <li key={i}>{approach}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {/* Paper Breakdown */}
      <h3 className="text-xl font-semibold text-zinc-900 mb-4">
        Paper Breakdown
      </h3>

      <div className="space-y-4">
        {papers.map((paper, index) => {
          const hasError = paper.error || paper.llmError;
          const analysis = paper.analysis;

          return (
            <div
              key={index}
              className="border border-zinc-200 rounded-md bg-white overflow-hidden shadow-sm"
            >
              <button
                onClick={() => !hasError && toggleExpand(index)}
                disabled={!!hasError}
                className={`w-full flex justify-between items-center px-5 py-4 transition-colors text-left ${hasError
                    ? 'bg-red-50'
                    : 'bg-zinc-50 hover:bg-zinc-100'
                  }`}
              >
                <div className="flex-1 pr-4">
                  <div className="flex items-center space-x-3 mb-1">
                    <span className="font-medium text-zinc-900 line-clamp-1">
                      {analysis
                        ? analysis.title
                        : paper.filename}
                    </span>

                    {hasError && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 whitespace-nowrap">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Error
                      </span>
                    )}
                  </div>

                  {!hasError && analysis && (
                    <p className="text-sm text-zinc-600 line-clamp-1">
                      {analysis.researchProblem}
                    </p>
                  )}
                </div>

                {!hasError && (
                  <div className="flex-shrink-0">
                    {expandedIndex === index ? (
                      <ChevronUp className="w-5 h-5 text-zinc-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-zinc-500" />
                    )}
                  </div>
                )}
              </button>

              {hasError && (
                <div className="px-5 py-3 border-t border-red-200 bg-red-50">
                  <p className="text-sm text-red-700">
                    {paper.error || paper.llmError}
                  </p>
                </div>
              )}

              {!hasError &&
                expandedIndex === index &&
                analysis && (
                  <div className="px-5 py-5 border-t border-zinc-200 bg-white">
                    <div className="grid md:grid-cols-2 gap-8 mb-6">
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                          Methodology
                        </h4>

                        <p className="text-sm text-zinc-800">
                          {analysis.methodology}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                          Dataset
                        </h4>

                        <p className="text-sm text-zinc-800">
                          {analysis.dataset}
                        </p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 mb-6">
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2">
                          Key Findings
                        </h4>

                        <ul className="list-disc pl-4 space-y-1 text-sm text-zinc-800">
                          {analysis.keyFindings?.map(
                            (f, i) => (
                              <li key={i}>{f}</li>
                            )
                          )}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2">
                          Limitations & Metrics
                        </h4>

                        <div className="space-y-3">
                          {analysis.limitations &&
                            analysis.limitations.length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-zinc-500 mr-2">
                                  Limitations:
                                </span>

                                <span className="text-sm text-zinc-800">
                                  {analysis.limitations.join(', ')}
                                </span>
                              </div>
                            )}

                          {analysis.evaluationMetrics &&
                            analysis.evaluationMetrics.length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-zinc-500 mr-2">
                                  Metrics:
                                </span>

                                <span className="text-sm text-zinc-800">
                                  {analysis.evaluationMetrics.join(', ')}
                                </span>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>

                    {analysis.relevantQuote && (
                      <div className="mt-6 pt-4 border-t border-zinc-100">
                        <div className="flex gap-3">
                          <Quote className="w-5 h-5 text-amber-500 flex-shrink-0 rotate-180" />

                          <blockquote className="text-sm text-zinc-700 italic border-l-2 border-amber-200 pl-3">
                            "{analysis.relevantQuote}"

                            <footer className="text-xs text-zinc-500 mt-2 font-medium not-italic">
                              Source Quote
                            </footer>
                          </blockquote>
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>
          );
        })}
      </div>

      {/* Research Opportunities */}
      {opportunities &&
        opportunities.opportunities &&
        opportunities.opportunities.length > 0 && (
          <div className="mt-12">
            <h3 className="text-xl font-semibold text-zinc-900 mb-4">
              Research Opportunities
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              {opportunities.opportunities.map(
                (opp, idx) => (
                  <div
                    key={idx}
                    className="border border-zinc-200 rounded-md bg-white shadow-sm p-5"
                  >
                    <h4 className="text-lg font-medium text-zinc-900 mb-2">
                      {opp.title}
                    </h4>

                    <p className="text-sm text-zinc-700 mb-3 leading-relaxed">
                      {opp.description}
                    </p>

                    {opp.basedOnGaps &&
                      opp.basedOnGaps.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-zinc-600">
                            <span className="font-medium">
                              Based on gap
                              {opp.basedOnGaps.length > 1
                                ? 's'
                                : ''}
                              :
                            </span>{' '}
                            {opp.basedOnGaps.join(', ')}
                          </p>
                        </div>
                      )}

                    {opp.supportingEvidence &&
                      opp.supportingEvidence.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-zinc-100">
                          <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2">
                            Evidence
                          </p>

                          <div className="space-y-3">
                            {opp.supportingEvidence.map(
                              (evidence, evidenceIndex) => (
                                <div
                                  key={evidenceIndex}
                                  className="flex gap-3 items-start"
                                >
                                  <Quote className="w-5 h-5 text-amber-500 flex-shrink-0 rotate-180" />

                                  <blockquote className="text-sm text-zinc-700 italic border-l-2 border-amber-200 pl-3">
                                    {evidence.supportingPoint}

                                    <footer className="text-xs text-zinc-500 mt-2 font-medium not-italic">
                                      {evidence.filename}
                                    </footer>
                                  </blockquote>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {opp.suggestedApproach && (
                      <div className="mt-4 p-3 bg-zinc-50 border border-zinc-200 rounded-md">
                        <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                          Suggested Angle
                        </p>

                        <p className="text-sm text-zinc-700 leading-relaxed">
                          {opp.suggestedApproach}
                        </p>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        )}

      {/* Challenge My Idea */}
      <section className="mt-12">
        <div className="bg-white border border-zinc-200 rounded-md shadow-sm p-6">

          <div className="mb-5">
            <h3 className="text-xl font-semibold text-zinc-900">
              Challenge My Idea
            </h3>

            <p className="text-sm text-zinc-600 mt-1">
              Test your research idea against the papers you
              uploaded. ResearchLens will identify overlap and
              suggest ways to make the idea more distinct.
            </p>
          </div>

          <textarea
            value={ideaText}
            onChange={(e) => {
              setIdeaText(e.target.value);
              if (challengeError) {
                setChallengeError(null);
              }
            }}
            placeholder="Describe your research idea in a sentence or two..."
            rows={5}
            className="w-full border border-zinc-300 rounded-md p-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 resize-y"
          />

          <div className="mt-3 flex justify-end">
            <button
              onClick={handleChallengeIdea}
              disabled={
                challengeLoading ||
                ideaText.trim().split(/\s+/).filter(Boolean).length < 10
              }
              className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 border border-zinc-900 rounded-md hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {challengeLoading
                ? 'Challenging Idea...'
                : 'Challenge My Idea'}
            </button>
          </div>

          {/* Challenge error */}
          {challengeError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800">
              {challengeError}
            </div>
          )}

          {/* Challenge results */}
          {challengeResult && (
            <div className="mt-8 pt-6 border-t border-zinc-200">

              {/* Overlap Assessment */}
              {challengeResult.overlapAssessment && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-zinc-900 mb-2">
                    Overlap Assessment
                  </h4>

                  <p className="text-sm text-zinc-700 leading-relaxed">
                    {challengeResult.overlapAssessment}
                  </p>
                </div>
              )}

              {/* Overlapping Papers */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-zinc-900 mb-3">
                  Overlapping Papers
                </h4>

                {challengeResult.overlappingPapers &&
                  challengeResult.overlappingPapers.length > 0 ? (
                  <div className="space-y-3">
                    {challengeResult.overlappingPapers.map(
                      (paper, index) => (
                        <div
                          key={index}
                          className="border-l-2 border-amber-200 pl-4"
                        >
                          <p className="text-sm font-medium text-zinc-900">
                            {paper.filename}
                          </p>

                          <p className="text-sm text-zinc-700 mt-1">
                            {paper.overlapPoint}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-600">
                    No significant overlap found with the
                    uploaded papers.
                  </p>
                )}
              </div>

              {/* Novelty */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-zinc-900 mb-2">
                  Novelty
                </h4>

                <span className="inline-block px-3 py-1 border border-zinc-300 rounded-md text-sm font-medium text-zinc-800 bg-zinc-50">
                  {challengeResult.noveltyScore
                    ? challengeResult.noveltyScore.charAt(0).toUpperCase() +
                    challengeResult.noveltyScore.slice(1)
                    : 'Not assessed'}
                </span>
              </div>

              {/* Novelty Reasoning */}
              {challengeResult.noveltyReasoning && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-zinc-900 mb-2">
                    Why
                  </h4>

                  <p className="text-sm text-zinc-700 leading-relaxed">
                    {challengeResult.noveltyReasoning}
                  </p>
                </div>
              )}

              {/* Differentiation Suggestions */}
              {challengeResult.differentiationSuggestions &&
                challengeResult.differentiationSuggestions.length >
                0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 mb-2">
                      Ways to Differentiate
                    </h4>

                    <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-700">
                      {challengeResult.differentiationSuggestions.map(
                        (suggestion, index) => (
                          <li key={index}>{suggestion}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}