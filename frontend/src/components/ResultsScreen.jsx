import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Quote,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

export default function ResultsScreen({
  data,
  onReset,
  opportunities,
}) {
  const [expandedIndex, setExpandedIndex] = useState(-1);

  const [ideaText, setIdeaText] = useState('');
  const [challengeResult, setChallengeResult] = useState(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeError, setChallengeError] = useState(null);

  const {
    landscape,
    landscapeError,
    papers = [],
    topic,
    gaps = [],
    contradictions = [],
  } = data || {};

  const toggleExpand = (index) => {
    setExpandedIndex(
      expandedIndex === index ? -1 : index
    );
  };

  /* =====================================================
     CHALLENGE MY IDEA
  ===================================================== */

  const handleChallengeIdea = async () => {
    const trimmedIdea = ideaText.trim();

    if (
      trimmedIdea
        .split(/\s+/)
        .filter(Boolean)
        .length < 10
    ) {
      setChallengeError(
        'Please describe your research idea in at least 10 words.'
      );
      setChallengeResult(null);
      return;
    }

    if (!API_URL) {
      setChallengeError(
        'Backend URL is not configured.'
      );
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
            ...paper.analysis,
          };
        })
        .filter(Boolean);

      const response = await fetch(
        `${API_URL}/api/challenge`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic,
            ideaText: trimmedIdea,
            paperAnalyses,
            landscape,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
          'Failed to challenge the research idea.'
        );
      }

      setChallengeResult(result);
    } catch (err) {
      console.error(
        'Challenge My Idea error:',
        err
      );

      setChallengeError(
        err.message ||
        'Failed to analyze the research idea.'
      );
    } finally {
      setChallengeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f3] text-zinc-900">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="max-w-6xl mx-auto px-6 md:px-10 pt-12 pb-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 mb-3">
              Research Intelligence
            </p>

            <h1 className="font-serif text-4xl md:text-5xl tracking-[-0.03em] text-zinc-900">
              Research Landscape
            </h1>

            <p className="mt-3 text-sm text-zinc-500">
              Topic:{' '}
              <span className="text-zinc-900 font-medium">
                {topic}
              </span>
            </p>
          </div>

          <button
            onClick={onReset}
            className="self-start md:self-auto text-sm text-zinc-600 border-b border-zinc-400 pb-1 hover:text-amber-700 hover:border-amber-700 transition-colors"
          >
            Start New Analysis →
          </button>

        </div>
      </header>


      {/* =================================================
          MAIN
      ================================================= */}

      <main className="max-w-6xl mx-auto px-6 md:px-10 pb-24">

        {/* =================================================
            LANDSCAPE
        ================================================= */}

        {landscapeError ? (
          <div className="mb-12 border-t border-b border-red-200 py-5 text-sm text-red-700">
            {landscapeError}
          </div>
        ) : landscape ? (

          <section className="border-t border-zinc-300 py-10 mb-16">

            <div className="max-w-5xl">

              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700 mb-3">
                Literature synthesis
              </p>

              <h2 className="font-serif text-3xl md:text-4xl tracking-[-0.025em] mb-5">
                What the literature says
              </h2>

              <p className="max-w-4xl text-[15px] leading-7 text-zinc-600 mb-10">
                {landscape.landscapeSummary}
              </p>

            </div>


            <div className="grid md:grid-cols-2 gap-12 md:gap-20">

              {/* Common Themes */}

              <div>

                <h3 className="text-[10px] font-semibold uppercase tracking-[0.17em] text-zinc-400 mb-5">
                  Common themes
                </h3>

                <ul className="list-disc pl-5 space-y-3 text-[14px] leading-6 text-zinc-600">

                  {landscape.commonThemes?.map(
                    (theme, index) => (
                      <li key={index}>
                        {theme}
                      </li>
                    )
                  )}

                </ul>

              </div>


              {/* Diverging Approaches */}

              <div>

                <h3 className="text-[10px] font-semibold uppercase tracking-[0.17em] text-zinc-400 mb-5">
                  Diverging approaches
                </h3>

                <ul className="list-disc pl-5 space-y-3 text-[14px] leading-6 text-zinc-600">

                  {landscape.divergingApproaches?.map(
                    (approach, index) => (
                      <li key={index}>
                        {approach}
                      </li>
                    )
                  )}

                </ul>

              </div>

            </div>

          </section>

        ) : null}


        {/* =================================================
            PAPER BREAKDOWN
        ================================================= */}

        <section className="mb-20">

          <div className="mb-7">

            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700 mb-3">
              Literature
            </p>

            <h2 className="font-serif text-4xl md:text-5xl tracking-[-0.03em]">
              Paper Breakdown
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-500">
              Explore the individual papers behind the landscape.
            </p>

          </div>


          <div className="border-t border-zinc-300">

            {papers.map((paper, index) => {

              const hasError =
                paper.error ||
                paper.llmError;

              const analysis =
                paper.analysis;

              return (

                <div
                  key={index}
                  className="border-b border-zinc-300"
                >

                  {/* Paper Header */}

                  <button
                    onClick={() =>
                      !hasError &&
                      toggleExpand(index)
                    }
                    disabled={!!hasError}
                    className={`w-full flex items-center justify-between gap-6 py-6 text-left transition-colors ${hasError
                        ? 'bg-red-50'
                        : 'hover:bg-zinc-100/60'
                      }`}
                  >

                    <div className="flex-1 min-w-0">

                      <div className="flex items-center gap-3">

                        <span className="text-[10px] font-medium text-zinc-400 tabular-nums">
                          {String(index + 1).padStart(2, '0')}
                        </span>

                        <span className="font-serif text-xl md:text-2xl text-zinc-900 line-clamp-1">
                          {analysis
                            ? analysis.title
                            : paper.filename}
                        </span>

                        {hasError && (
                          <span className="inline-flex items-center gap-1 text-xs text-red-700 whitespace-nowrap">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Error
                          </span>
                        )}

                      </div>

                      {!hasError &&
                        analysis && (
                          <p className="ml-[2.1rem] mt-2 text-[14px] leading-6 text-zinc-500 line-clamp-1">
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


                  {/* Error */}

                  {hasError && (
                    <div className="px-6 pb-5 text-sm text-red-700">
                      {paper.error ||
                        paper.llmError}
                    </div>
                  )}


                  {/* Expanded Paper */}

                  {!hasError &&
                    expandedIndex === index &&
                    analysis && (

                      <div className="pb-10 pt-2 pl-[2.1rem]">

                        {/* Methodology + Dataset */}

                        <div className="grid md:grid-cols-2 gap-10 mb-10">

                          <div>

                            <h4 className="text-[10px] uppercase tracking-[0.17em] text-zinc-400 font-semibold mb-3">
                              Methodology
                            </h4>

                            <p className="text-[14px] leading-6 text-zinc-600">
                              {analysis.methodology}
                            </p>

                          </div>


                          <div>

                            <h4 className="text-[10px] uppercase tracking-[0.17em] text-zinc-400 font-semibold mb-3">
                              Dataset
                            </h4>

                            <p className="text-[14px] leading-6 text-zinc-600">
                              {analysis.dataset}
                            </p>

                          </div>

                        </div>


                        {/* Findings + Metrics */}

                        <div className="grid md:grid-cols-2 gap-10">

                          <div>

                            <h4 className="text-[10px] uppercase tracking-[0.17em] text-zinc-400 font-semibold mb-3">
                              Key findings
                            </h4>

                            <ul className="list-disc pl-5 space-y-2 text-[14px] leading-6 text-zinc-600">

                              {analysis.keyFindings?.map(
                                (finding, i) => (
                                  <li key={i}>
                                    {finding}
                                  </li>
                                )
                              )}

                            </ul>

                          </div>


                          <div>

                            <h4 className="text-[10px] uppercase tracking-[0.17em] text-zinc-400 font-semibold mb-3">
                              Limitations & metrics
                            </h4>

                            <div className="space-y-4">

                              {analysis.limitations &&
                                analysis.limitations.length > 0 && (

                                  <div>

                                    <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-400 mb-1">
                                      Limitations
                                    </p>

                                    <p className="text-[14px] leading-6 text-zinc-600">
                                      {analysis.limitations.join(', ')}
                                    </p>

                                  </div>

                                )}


                              {analysis.evaluationMetrics &&
                                analysis.evaluationMetrics.length > 0 && (

                                  <div>

                                    <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-400 mb-1">
                                      Metrics
                                    </p>

                                    <p className="text-[14px] leading-6 text-zinc-600">
                                      {analysis.evaluationMetrics.join(', ')}
                                    </p>

                                  </div>

                                )}

                            </div>

                          </div>

                        </div>


                        {/* Relevant Quote */}

                        {analysis.relevantQuote && (

                          <div className="mt-10 pt-7 border-t border-zinc-200">

                            <div className="flex gap-4">

                              <Quote className="w-5 h-5 text-amber-600 flex-shrink-0 rotate-180 mt-1" />

                              <blockquote className="max-w-3xl text-[14px] leading-6 text-zinc-600 italic">

                                "{analysis.relevantQuote}"

                                <footer className="mt-3 text-[10px] uppercase tracking-[0.15em] text-zinc-400 not-italic">
                                  Source quote
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

        </section>


        {/* =================================================
            RESEARCH OPPORTUNITIES
        ================================================= */}

        {opportunities &&
          opportunities.length > 0 && (

            <section className="pt-2 mb-20">

              <div className="mb-10">

                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700 mb-3">
                  What could come next
                </p>

                <h2 className="font-serif text-4xl md:text-5xl tracking-[-0.03em]">
                  Research Opportunities
                </h2>

                <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-500">
                  Directions suggested by the gaps and tensions across the literature.
                </p>

              </div>


              <div className="grid md:grid-cols-2 gap-x-16 gap-y-12">

                {opportunities.map(
                  (opp, index) => (

                    <article
                      key={index}
                      className="border-t border-zinc-300 pt-5"
                    >

                      <div className="flex items-start gap-4">

                        <span className="text-[10px] font-medium text-zinc-400 tabular-nums pt-1">
                          {String(index + 1).padStart(2, '0')}
                        </span>


                        <div className="flex-1">

                          <h3 className="font-serif text-2xl leading-tight text-zinc-900 mb-3">
                            {opp.title}
                          </h3>

                          <p className="text-[14px] leading-6 text-zinc-600">
                            {opp.description}
                          </p>


                          {/* Research Question */}

                          {opp.researchQuestion && (

                            <div className="mt-5 pt-4 border-t border-zinc-200">

                              <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-amber-700 mb-2">
                                Research question
                              </p>

                              <p className="text-[13px] leading-6 text-zinc-600">
                                {opp.researchQuestion}
                              </p>

                            </div>

                          )}


                          {/* Why It Matters */}

                          {opp.whyItMatters && (

                            <div className="mt-5">

                              <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-zinc-400 mb-2">
                                Why it matters
                              </p>

                              <p className="text-[13px] leading-6 text-zinc-600">
                                {opp.whyItMatters}
                              </p>

                            </div>

                          )}


                          {/* Based on Gaps */}

                          {opp.basedOnGaps &&
                            opp.basedOnGaps.length > 0 && (

                              <div className="mt-5">

                                <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-zinc-400 mb-2">
                                  Based on gaps
                                </p>

                                <p className="text-[13px] leading-5 text-zinc-500">
                                  {opp.basedOnGaps.join(', ')}
                                </p>

                              </div>

                            )}


                          {/* Evidence */}

                          {opp.evidence &&
                            opp.evidence.length > 0 && (

                              <div className="mt-6 pt-5 border-t border-zinc-200">

                                <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-zinc-400 mb-4">
                                  Evidence
                                </p>

                                <div className="space-y-4">

                                  {opp.evidence.map(
                                    (evidence, evidenceIndex) => (

                                      <div
                                        key={evidenceIndex}
                                        className="flex gap-3"
                                      >

                                        <Quote className="w-4 h-4 text-amber-600 flex-shrink-0 rotate-180 mt-1" />

                                        <div>

                                          <p className="text-[13px] leading-5 text-zinc-600 italic">
                                            {evidence.supportingPoint}
                                          </p>

                                          <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                                            {evidence.filename}
                                          </p>

                                        </div>

                                      </div>

                                    )
                                  )}

                                </div>

                              </div>

                            )}

                        </div>

                      </div>

                    </article>

                  )
                )}

              </div>

            </section>

          )}


        {/* =================================================
            CHALLENGE MY IDEA
        ================================================= */}

        <section className="pt-8 pb-12 mb-20">

          <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-20">

            {/* Left */}

            <div>

              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700 mb-3">
                Challenge your thinking
              </p>

              <h2 className="font-serif text-4xl md:text-5xl tracking-[-0.03em] leading-tight">
                Is your idea
                <br />
                actually new?
              </h2>

              <p className="mt-5 max-w-sm text-sm leading-6 text-zinc-500">
                Test your research direction against the literature you just analyzed.
              </p>

            </div>


            {/* Right */}

            <div>

              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-400 font-semibold mb-3">
                Your research idea
              </p>

              <textarea
                value={ideaText}
                onChange={(e) => {
                  setIdeaText(e.target.value);

                  if (challengeError) {
                    setChallengeError(null);
                  }
                }}
                placeholder="Describe your research idea in a sentence or two..."
                rows={6}
                className="w-full bg-transparent border border-zinc-300 px-4 py-4 text-[14px] leading-6 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-700 resize-y transition-colors"
              />


              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                <p className="text-xs text-zinc-400">
                  Minimum 10 words.
                </p>

                <button
                  onClick={handleChallengeIdea}
                  disabled={
                    challengeLoading ||
                    ideaText
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean)
                      .length < 10
                  }
                  className="self-start sm:self-auto px-5 py-3 bg-zinc-900 text-white text-sm font-medium hover:bg-amber-700 disabled:bg-zinc-300 disabled:text-zinc-500 disabled:cursor-not-allowed transition-colors"
                >
                  {challengeLoading
                    ? 'Analyzing idea...'
                    : 'Challenge my idea →'}
                </button>

              </div>


              {/* Challenge Error */}

              {challengeError && (

                <div className="mt-5 border-t border-red-200 pt-4 text-sm text-red-700">
                  {challengeError}
                </div>

              )}


              {/* =================================================
                  CHALLENGE RESULTS
              ================================================= */}

              {challengeResult && (

                <div className="mt-12 pt-10 border-t border-zinc-300">

                  <div className="mb-10">

                    <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-amber-700 mb-3">
                      Challenge result
                    </p>

                    <h3 className="font-serif text-3xl md:text-4xl tracking-[-0.025em] text-zinc-900">
                      How your idea holds up
                    </h3>

                  </div>


                  {/* Overlap Assessment */}

                  {challengeResult.overlapAssessment && (

                    <div className="mb-12">

                      <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-zinc-400 mb-4">
                        Overlap assessment
                      </p>

                      <p className="max-w-4xl text-[15px] leading-7 text-zinc-600">
                        {challengeResult.overlapAssessment}
                      </p>

                    </div>

                  )}


                  {/* Overlapping Papers */}

                  {challengeResult.overlappingPapers &&
                    challengeResult.overlappingPapers.length > 0 && (

                      <div className="mb-12">

                        <div className="flex items-baseline justify-between mb-5">

                          <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-zinc-400">
                            Overlapping papers
                          </p>

                          <span className="text-[10px] text-zinc-400 tabular-nums">
                            {String(
                              challengeResult.overlappingPapers.length
                            ).padStart(2, '0')}
                          </span>

                        </div>


                        <div className="border-t border-zinc-300">

                          {challengeResult.overlappingPapers.map(
                            (paper, index) => (

                              <div
                                key={index}
                                className="grid grid-cols-[40px_1fr] gap-4 py-5 border-b border-zinc-200"
                              >

                                <span className="text-[10px] text-zinc-400 tabular-nums pt-1">
                                  {String(index + 1).padStart(2, '0')}
                                </span>

                                <div>

                                  <p className="text-sm font-medium text-zinc-900">
                                    {paper.filename}
                                  </p>

                                  <p className="mt-2 max-w-3xl text-[13px] leading-6 text-zinc-600">
                                    {paper.overlapPoint}
                                  </p>

                                </div>

                              </div>

                            )
                          )}

                        </div>

                      </div>

                    )}


                  {/* Novelty */}

                  <div className="mb-12">

                    <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-zinc-400 mb-4">
                      Novelty
                    </p>

                    <div className="flex items-center gap-4">

                      <span className="font-serif text-3xl text-zinc-900">

                        {challengeResult.noveltyScore
                          ? challengeResult.noveltyScore
                            .charAt(0)
                            .toUpperCase() +
                          challengeResult.noveltyScore.slice(1)
                          : 'Not assessed'}

                      </span>

                      <span className="h-px w-10 bg-amber-600" />

                    </div>

                  </div>


                  {/* Novelty Reasoning */}

                  {challengeResult.noveltyReasoning && (

                    <div className="mb-12">

                      <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-zinc-400 mb-4">
                        Why
                      </p>

                      <p className="max-w-4xl text-[15px] leading-7 text-zinc-600">
                        {challengeResult.noveltyReasoning}
                      </p>

                    </div>

                  )}


                  {/* Differentiation */}

                  {challengeResult.differentiationSuggestions &&
                    challengeResult.differentiationSuggestions.length > 0 && (

                      <div>

                        <div className="mb-5">

                          <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-amber-700 mb-2">
                            Ways to differentiate
                          </p>

                          <p className="text-sm text-zinc-500">
                            Practical directions that could make the contribution more distinct.
                          </p>

                        </div>


                        <div className="border-t border-zinc-300">

                          {challengeResult.differentiationSuggestions.map(
                            (suggestion, index) => (

                              <div
                                key={index}
                                className="grid grid-cols-[40px_1fr] gap-4 py-6 border-b border-zinc-200"
                              >

                                <span className="text-[10px] text-zinc-400 tabular-nums pt-1">
                                  {String(index + 1).padStart(2, '0')}
                                </span>

                                <p className="max-w-4xl text-[14px] leading-6 text-zinc-600">
                                  {suggestion}
                                </p>

                              </div>

                            )
                          )}

                        </div>

                      </div>

                    )}

                </div>

              )}

            </div>

          </div>

        </section>


        {/* =================================================
            RESEARCH GAPS
        ================================================= */}

        {gaps &&
          gaps.length > 0 && (

            <section className="pt-2 mb-16">

              <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-amber-700 mb-3">
                What is missing
              </p>

              <h2 className="font-serif text-4xl md:text-5xl tracking-[-0.03em] mb-8">
                Research Gaps
              </h2>

              <ul className="max-w-5xl list-disc pl-5 space-y-4 text-[15px] leading-7 text-zinc-600">

                {gaps.map(
                  (gap, index) => (

                    <li key={index}>
                      {typeof gap === 'string'
                        ? gap
                        : gap.description || gap.gap || ''}
                    </li>

                  )
                )}

              </ul>

            </section>

          )}


        {/* =================================================
            CONTRADICTIONS
        ================================================= */}

        {contradictions &&
          contradictions.length > 0 && (

            <section className="pt-2">

              <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-amber-700 mb-3">
                Where the papers disagree
              </p>

              <h2 className="font-serif text-4xl md:text-5xl tracking-[-0.03em] mb-8">
                Contradictions
              </h2>

              <ul className="max-w-5xl list-disc pl-5 space-y-4 text-[15px] leading-7 text-zinc-600">

                {contradictions.map(
                  (contradiction, index) => (

                    <li key={index}>
                      {typeof contradiction === 'string'
                        ? contradiction
                        : contradiction.description ||
                        contradiction.contradiction ||
                        ''}
                    </li>

                  )
                )}

              </ul>

            </section>

          )}

      </main>

    </div>
  );
}