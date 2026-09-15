import React, { useState } from 'react';
import InputScreen from './components/InputScreen';
import ResultsScreen from './components/ResultsScreen';

function App() {
  const [appState, setAppState] = useState('input');
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
        .map((p) => p.analysis)
        .filter(Boolean);

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

      setResults(analysisData);
      setGaps(gapsData);
      setContradictions(contradictionsData);
      setOpportunities(opportunitiesData);

      setChallengeResult(null);
      setChallengeError(null);

      setAppState('results');

    } catch (err) {
      console.error(err);

      setError(err.message);
      setAppState('input');
    }
  };


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
                ?.map((p) => p.analysis)
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

    <main>

      {error && (
        <div className="max-w-2xl mx-auto mt-6 px-6">
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 text-sm">
            {error}
          </div>
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


          {gaps?.gaps && (

            <section className="max-w-5xl mx-auto mt-8 mb-8 px-6">

              <div className="border-t border-zinc-300 pt-6">

                <h2 className="font-serif text-3xl mb-4">
                  Research Gaps
                </h2>

                <ul className="list-disc pl-5 space-y-2 text-zinc-700">

                  {gaps.gaps.map((gap, index) => (
                    <li key={index}>
                      {gap}
                    </li>
                  ))}

                </ul>

              </div>

            </section>

          )}


          {contradictions?.contradictions && (

            <section className="max-w-5xl mx-auto mt-8 mb-16 px-6">

              <div className="border-t border-zinc-300 pt-6">

                <h2 className="font-serif text-3xl mb-4">
                  Contradictions
                </h2>

                <ul className="list-disc pl-5 space-y-2 text-zinc-700">

                  {contradictions.contradictions.map(
                    (contradiction, index) => (
                      <li key={index}>
                        {contradiction}
                      </li>
                    )
                  )}

                </ul>

              </div>

            </section>

          )}

        </>

      )}

    </main>

  );
}

export default App;