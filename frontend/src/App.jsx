import React, { useState, useEffect } from 'react';
import InputScreen from './components/InputScreen';
import ResultsScreen from './components/ResultsScreen';

function App() {
  const [appState, setAppState] = useState('input');
  useEffect(() => {
    if (appState === 'results') {
      window.scrollTo(0, 0);
    }
  }, [appState]);
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

    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      // ==========================================
      // STEP 1: Upload and extract PDF text
      // ==========================================

      const uploadResponse = await fetch(
        'http://localhost:3001/api/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();

        throw new Error(
          errorData.error ||
          'Failed to extract text from papers'
        );
      }

      const uploadData = await uploadResponse.json();

      // ==========================================
      // STEP 2: Analyze papers with AI
      // ==========================================

      setAppState('loading-analyze');

      const analyzeResponse = await fetch(
        'http://localhost:3001/api/analyze',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(uploadData),
        }
      );

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json();

        throw new Error(
          errorData.error ||
          'Failed to analyze papers'
        );
      }

      const analysisData = await analyzeResponse.json();

      const paperAnalyses = analysisData.papers
        .map((paper) => paper.analysis)
        .filter(Boolean);

      // ==========================================
      // STEP 3: Extract research gaps
      // ==========================================

      const gapsResponse = await fetch(
        'http://localhost:3001/api/gaps',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic,
            paperAnalyses,
          }),
        }
      );

      const gapsData = gapsResponse.ok
        ? await gapsResponse.json()
        : null;

      // ==========================================
      // STEP 4: Extract contradictions
      // ==========================================

      const contradictionsResponse = await fetch(
        'http://localhost:3001/api/contradictions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic,
            paperAnalyses,
          }),
        }
      );

      const contradictionsData =
        contradictionsResponse.ok
          ? await contradictionsResponse.json()
          : null;

      // ==========================================
      // STEP 5: Generate research opportunities
      // ==========================================

      const opportunitiesResponse = await fetch(
        'http://localhost:3001/api/opportunities',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic,
            paperAnalyses,
            landscape: analysisData.landscape,
            gaps: gapsData,
            contradictions: contradictionsData,
          }),
        }
      );

      const opportunitiesData =
        opportunitiesResponse.ok
          ? await opportunitiesResponse.json()
          : null;

      // ==========================================
      // STORE RESULTS
      // ==========================================

      /*
        Keep gaps and contradictions inside results
        so ResultsScreen can render the complete
        research analysis in one place.
      */

      setResults({
        ...analysisData,
        gaps: gapsData,
        contradictions: contradictionsData,
      });

      setGaps(gapsData);
      setContradictions(contradictionsData);
      setOpportunities(opportunitiesData);

      // Clear previous Challenge My Idea result
      setChallengeResult(null);
      setChallengeError(null);
      setChallengeLoading(false);

      setAppState('results');

    } catch (err) {
      console.error(err);

      setError(err.message);
      setAppState('input');
    }
  };


  // ==========================================
  // CHALLENGE MY IDEA
  // ==========================================

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
                ?.map((paper) => paper.analysis)
                .filter(Boolean) || [],

            landscape:
              results?.landscape || null,
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

      setChallengeError(
        err.message ||
        'Failed to analyze the research idea.'
      );

    } finally {
      setChallengeLoading(false);
    }
  };


  // ==========================================
  // RESET
  // ==========================================

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


  // ==========================================
  // LOADING STATE
  // ==========================================

  const isLoading =
    appState === 'loading-extract' ||
    appState === 'loading-analyze';

  const loadingMessage =
    appState === 'loading-extract'
      ? 'Extracting text from PDFs...'
      : 'Analyzing papers with AI...';


  // ==========================================
  // UI
  // ==========================================

  return (
    <main>

      {/* Error message */}

      {error && (
        <div className="max-w-2xl mx-auto mt-6 px-6">
          <div className="border-t border-b border-red-200 py-4 text-sm text-red-700">
            {error}
          </div>
        </div>
      )}


      {/* Input / Loading screen */}

      {(appState === 'input' || isLoading) && (
        <InputScreen
          onAnalyze={handleAnalyze}
          isLoading={isLoading}
          loadingMessage={loadingMessage}
        />
      )}


      {/* Results */}

      {appState === 'results' && results && (
        <ResultsScreen
          data={results}
          onReset={handleReset}
          opportunities={opportunities}
          challengeResult={challengeResult}
          onChallenge={handleChallenge}
          challengeLoading={challengeLoading}
          challengeError={challengeError}
        />
      )}

    </main>
  );
}

export default App;