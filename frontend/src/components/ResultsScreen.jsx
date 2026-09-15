import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, Quote } from 'lucide-react';

export default function ResultsScreen({ data, onReset }) {
  const [expandedIndex, setExpandedIndex] = useState(-1);

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? -1 : index);
  };

  const { landscape, landscapeError, papers, topic } = data;

  return (
    <div className="max-w-5xl mx-auto mt-12 p-6">
      <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Research Landscape</h2>
          <p className="text-zinc-600 mt-1">Topic: <span className="font-medium text-zinc-900">{topic}</span></p>
        </div>
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 transition-colors focus:outline-none"
        >
          Start New Analysis
        </button>
      </div>

      {landscapeError ? (
        <div className="mb-10 bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800">
          {landscapeError}
        </div>
      ) : landscape ? (
        <div className="mb-12 bg-white border border-zinc-200 rounded-md p-6 shadow-sm">
          <h3 className="text-lg font-medium text-zinc-900 mb-3">Synthesis</h3>
          <p className="text-zinc-700 text-sm leading-relaxed mb-6">{landscape.landscapeSummary}</p>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 mb-2">Common Themes</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-700">
                {landscape.commonThemes?.map((theme, i) => (
                  <li key={i}>{theme}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 mb-2">Diverging Approaches</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-700">
                {landscape.divergingApproaches?.map((approach, i) => (
                  <li key={i}>{approach}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      <h3 className="text-xl font-semibold text-zinc-900 mb-4">Paper Breakdown</h3>
      
      <div className="space-y-4">
        {papers.map((paper, index) => {
          const hasError = paper.error || paper.llmError;
          const analysis = paper.analysis;
          
          return (
            <div key={index} className="border border-zinc-200 rounded-md bg-white overflow-hidden shadow-sm">
              <button
                onClick={() => !hasError && toggleExpand(index)}
                disabled={!!hasError}
                className={`w-full flex justify-between items-center px-5 py-4 transition-colors text-left ${hasError ? 'bg-red-50' : 'bg-zinc-50 hover:bg-zinc-100'}`}
              >
                <div className="flex-1 pr-4">
                  <div className="flex items-center space-x-3 mb-1">
                    <span className="font-medium text-zinc-900 line-clamp-1">{analysis ? analysis.title : paper.filename}</span>
                    {hasError && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 whitespace-nowrap">
                        <AlertCircle className="w-3 h-3 mr-1" /> Error
                      </span>
                    )}
                  </div>
                  {!hasError && analysis && (
                    <p className="text-sm text-zinc-600 line-clamp-1">{analysis.researchProblem}</p>
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
                  <p className="text-sm text-red-700">{paper.error || paper.llmError}</p>
                </div>
              )}

              {!hasError && expandedIndex === index && analysis && (
                <div className="px-5 py-5 border-t border-zinc-200 bg-white">
                  <div className="grid md:grid-cols-2 gap-8 mb-6">
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">Methodology</h4>
                      <p className="text-sm text-zinc-800">{analysis.methodology}</p>
                    </div>
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">Dataset</h4>
                      <p className="text-sm text-zinc-800">{analysis.dataset}</p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-8 mb-6">
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2">Key Findings</h4>
                      <ul className="list-disc pl-4 space-y-1 text-sm text-zinc-800">
                        {analysis.keyFindings?.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2">Limitations & Metrics</h4>
                      <div className="space-y-3">
                        {analysis.limitations && analysis.limitations.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-zinc-500 mr-2">Limitations:</span>
                            <span className="text-sm text-zinc-800">{analysis.limitations.join(', ')}</span>
                          </div>
                        )}
                        {analysis.evaluationMetrics && analysis.evaluationMetrics.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-zinc-500 mr-2">Metrics:</span>
                            <span className="text-sm text-zinc-800">{analysis.evaluationMetrics.join(', ')}</span>
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
                            — Source Quote
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
    </div>
  );
}
