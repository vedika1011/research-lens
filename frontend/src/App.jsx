import React, { useState } from 'react';
import InputScreen from './components/InputScreen';
import ResultsScreen from './components/ResultsScreen';

function App() {
  const [appState, setAppState] = useState('input'); // 'input', 'loading-extract', 'loading-analyze', 'results'
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const [opportunities, setOpportunities] = useState(null);

  const [challengeResult, setChallengeResult] = useState(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeError, setChallengeError] = useState(null);

  const [gaps, setGaps] = useState(null);
  const [contradictions, setContradictions] = useState(null);

  const handleAnalyze = async (topic, files) => {
    setAppState('loading-extract');
    setError(null);

    const formData = new FormData();
    formData.append('topic', topic);

    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      // Step 1: Upload and Extract Text
      const uploadResponse = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(
          errorData.error || 'Failed to extract text from papers'
        );
      }

      const uploadData = await uploadResponse.json();

      // Step 2: Analyze with LLM
      setAppState('loading-analyze');

      const analyzeResponse = await fetch(
        'http://localhost:3001/api/analyze',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(uploadData),
        }
      );

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json();
        throw new Error(
          errorData.error || 'Failed to analyze papers'
        );
      }

      const analysisData = await analyzeResponse.json();

      // Step 3: Extract Gaps
      const gapsResponse = await fetch(
        'http://localhost:3001/api/gaps',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            paperAnalyses: analysisData.papers
              .map(p => p.analysis)
              .filter(Boolean),
          }),
        }
      );

      const gapsData = gapsResponse.ok
        ? await gapsResponse.json()
        : null;

      // Step 4: Extract Contradictions
      const contradictionsResponse = await fetch(
        'http://localhost:3001/api/contradictions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            paperAnalyses: analysisData.papers
              .map(p => p.analysis)
              .filter(Boolean),
          }),
        }
      );

      const contradictionsData = contradictionsResponse.ok
        ? await contradictionsResponse.json()
        : null;

      // Step 5: Extract Research Opportunities
      const opportunitiesResponse = await fetch(
        'http://localhost:3001/api/opportunities',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            paperAnalyses: analysisData.papers
              .map(p => p.analysis)
              .filter(Boolean),
            landscape: analysisData.landscape,
            gaps: gapsData,
            contradictions: contradictionsData,
          }),
        }
      );

      const opportunitiesData = opportunitiesResponse.ok
        ? await opportunitiesResponse.json()
        : null;

      setOpportunities(opportunitiesData);

      setResults(analysisData);
      setGaps(gapsData);
      setContradictions(contradictionsData);

      // Clear any previous Challenge My Idea result
      setChallengeResult(null);
      setChallengeError(null);

      setAppState('results');
    } catch (err) {
      console.error(err);
      setError(err.message);
      setAppState('input');
    }
  };

  // Challenge My Idea
  const handleChallenge = async (ideaText) => {
    if (
      !ideaText ||
      ideaText.trim().split(/\s+/).length < 10
    ) {
      setChallengeError(
        'Please describe your research idea in at least 10 words.'
      );
      return;
    }

    setChallengeLoading(true);
    setChallengeError(null);

    try {
      const response = await fetch(
        'http://localhost:3001/api/challenge',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ideaText: ideaText.trim(),
            topic: results?.topic || '',
            paperAnalyses:
              results?.papers
                ?.map(p => p.analysis)
                .filter(Boolean) || [],
            landscape: results?.landscape || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Failed to challenge the research idea.'
        );
      }

      setChallengeResult(data);
    } catch (err) {
      console.error(err);
      setChallengeError(err.message);
    } finally {
      setChallengeLoading(false);
    }
  };

  const handleReset = () => {
    setResults(null);
    setGaps(null);
    setContradictions(null);
    setOpportunities(null);

    setChallengeResult(null);
    setChallengeError(null);
    setChallengeLoading(false);

    setError(null);
    setAppState('input');
  };

  const isLoading =
    appState === 'loading-extract' ||
    appState === 'loading-analyze';

  const loadingMessage =
    appState === 'loading-extract'
      ? 'Extracting text from PDFs...'
      : 'Analyzing papers with AI...';

  return (
    <div className="min-h-screen bg-zinc-50 selection:bg-amber-100 selection:text-amber-900">
      <nav className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-zinc-900">
            ResearchLens
          </span>
        </div>
      </nav>

      <main>
        {error && (
          <div className="max-w-2xl mx-auto mt-6 bg-red-50 border border-red-200 text-red-800 rounded-md p-4 text-sm">
            {error}
          </div>
        )}

        {(appState === 'input' || isLoading) && (
          <InputScreen
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
            loadingMessage={loadingMessage}
          />
        )}

        {appState === 'results' && results && (
          <>
            <ResultsScreen
              data={results}
              onReset={handleReset}
              opportunities={opportunities}
              challengeResult={challengeResult}
              onChallenge={handleChallenge}
              challengeLoading={challengeLoading}
              challengeError={challengeError}
            />

            {gaps && gaps.gaps && (
              <section className="max-w-5xl mx-auto mt-8 p-6 bg-white border border-zinc-200 rounded-md shadow-sm">
                <h2 className="text-xl font-semibold text-zinc-900 mb-3">
                  Research Gaps
                </h2>

                <ul className="list-disc pl-5 space-y-1 text-zinc-800">
                  {gaps.gaps.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </section>
            )}

            {contradictions &&
              contradictions.contradictions && (
                <section className="max-w-5xl mx-auto mt-8 p-6 bg-white border border-zinc-200 rounded-md shadow-sm">
                  <h2 className="text-xl font-semibold text-zinc-900 mb-3">
                    Contradictions
                  </h2>

                  <ul className="list-disc pl-5 space-y-1 text-zinc-800">
                    {contradictions.contradictions.map(
                      (c, i) => (
                        <li key={i}>{c}</li>
                      )
                    )}
                  </ul>
                </section>
              )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;