import React, {
  useState,
  useEffect
} from 'react';

import InputScreen from './components/InputScreen';
import ResultsScreen from './components/ResultsScreen';

function App() {
  const API_URL =
    import.meta.env.VITE_API_URL;

  const [appState, setAppState] =
    useState('input');

  const [results, setResults] =
    useState(null);

  const [error, setError] =
    useState(null);

  const [opportunities, setOpportunities] =
    useState(null);

  const [challengeResult, setChallengeResult] =
    useState(null);

  const [challengeLoading, setChallengeLoading] =
    useState(false);

  const [challengeError, setChallengeError] =
    useState(null);

  const [gaps, setGaps] =
    useState(null);

  const [contradictions, setContradictions] =
    useState(null);

  // ==========================================================
  // SCROLL TO TOP
  // ==========================================================

  useEffect(() => {
    if (
      appState === 'results'
    ) {
      window.scrollTo(
        0,
        0
      );
    }
  }, [appState]);

  // ==========================================================
  // ANALYZE LITERATURE
  // ==========================================================

  const handleAnalyze =
    async (
      topic,
      files
    ) => {
      setAppState(
        'loading-extract'
      );

      setError(null);

      const formData =
        new FormData();

      formData.append(
        'topic',
        topic
      );

      files.forEach(
        (file) => {
          formData.append(
            'files',
            file
          );
        }
      );

      try {
        // ======================================================
        // STEP 1: UPLOAD
        // ======================================================

        const uploadResponse =
          await fetch(
            `${API_URL}/api/upload`,
            {
              method:
                'POST',

              body:
                formData
            }
          );

        if (
          !uploadResponse.ok
        ) {
          const errorData =
            await uploadResponse.json();

          throw new Error(
            errorData.error ||
            'Failed to extract text from papers'
          );
        }

        const uploadData =
          await uploadResponse.json();

        // ======================================================
        // STEP 2: ONE COMPLETE AI ANALYSIS
        // ======================================================

        setAppState(
          'loading-analyze'
        );

        const analyzeResponse =
          await fetch(
            `${API_URL}/api/analyze`,
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json'
              },

              body:
                JSON.stringify(
                  uploadData
                )
            }
          );

        if (
          !analyzeResponse.ok
        ) {
          const errorData =
            await analyzeResponse.json();

          throw new Error(
            errorData.error ||
            'Failed to analyze papers'
          );
        }

        const analysisData =
          await analyzeResponse.json();

        // ======================================================
        // STORE RESULTS
        // ======================================================

        setResults(
          analysisData
        );

        setGaps(
          analysisData.gaps ||
          null
        );

        setContradictions(
          analysisData.contradictions ||
          null
        );

        setOpportunities(
          analysisData.opportunities ||
          null
        );

        setChallengeResult(
          null
        );

        setChallengeError(
          null
        );

        setChallengeLoading(
          false
        );

        setAppState(
          'results'
        );

      } catch (err) {
        console.error(
          err
        );

        setError(
          err.message
        );

        setAppState(
          'input'
        );
      }
    };

  // ==========================================================
  // CHALLENGE MY IDEA
  // ==========================================================

  const handleChallenge =
    async (
      ideaText
    ) => {
      if (
        !ideaText ||
        ideaText
          .trim()
          .split(/\s+/)
          .length < 10
      ) {
        setChallengeError(
          'Please describe your research idea in at least 10 words.'
        );

        return;
      }

      setChallengeLoading(
        true
      );

      setChallengeError(
        null
      );

      try {
        const response =
          await fetch(
            `${API_URL}/api/challenge`,
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json'
              },

              body:
                JSON.stringify({
                  ideaText:
                    ideaText.trim(),

                  topic:
                    results?.topic ||
                    '',

                  paperAnalyses:
                    results?.papers
                      ?.map(
                        (
                          paper
                        ) =>
                          paper.analysis
                      )
                      .filter(
                        Boolean
                      ) || [],

                  landscape:
                    results?.landscape ||
                    null
                })
            }
          );

        const data =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
            'Failed to challenge the research idea.'
          );
        }

        setChallengeResult(
          data
        );

      } catch (err) {
        console.error(
          err
        );

        setChallengeError(
          err.message ||
          'Failed to analyze the research idea.'
        );

      } finally {
        setChallengeLoading(
          false
        );
      }
    };

  // ==========================================================
  // RESET
  // ==========================================================

  const handleReset =
    () => {
      setResults(
        null
      );

      setGaps(
        null
      );

      setContradictions(
        null
      );

      setOpportunities(
        null
      );

      setChallengeResult(
        null
      );

      setChallengeError(
        null
      );

      setChallengeLoading(
        false
      );

      setError(
        null
      );

      setAppState(
        'input'
      );
    };

  // ==========================================================
  // LOADING
  // ==========================================================

  const isLoading =
    appState ===
    'loading-extract' ||
    appState ===
    'loading-analyze';

  const loadingMessage =
    appState ===
      'loading-extract'
      ? 'Extracting text from PDFs...'
      : 'Analyzing literature and finding research opportunities...';

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <main>

      {/* ERROR */}

      {error && (
        <div className="max-w-2xl mx-auto mt-6 px-6">
          <div className="border-t border-b border-red-200 py-4 text-sm text-red-700">
            {error}
          </div>
        </div>
      )}

      {/* INPUT / LOADING */}

      {(appState === 'input' ||
        isLoading) && (
          <InputScreen
            onAnalyze={
              handleAnalyze
            }

            isLoading={
              isLoading
            }

            loadingMessage={
              loadingMessage
            }
          />
        )}

      {/* RESULTS */}

      {appState ===
        'results' &&
        results && (
          <ResultsScreen
            data={
              results
            }

            onReset={
              handleReset
            }

            opportunities={
              opportunities
            }

            challengeResult={
              challengeResult
            }

            onChallenge={
              handleChallenge
            }

            challengeLoading={
              challengeLoading
            }

            challengeError={
              challengeError
            }
          />
        )}

    </main>
  );
}

export default App;