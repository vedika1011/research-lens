import React, { useState, useRef } from 'react';
import { Upload, X, FileText } from 'lucide-react';

export default function InputScreen({
  onAnalyze,
  isLoading,
  loadingMessage,
}) {
  const [topic, setTopic] = useState('');
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(
        (f) => f.type === 'application/pdf'
      );

      setFiles((prev) => [...prev, ...newFiles].slice(0, 5));
      e.target.value = '';
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const isFormValid =
    topic.trim().length > 0 && files.length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isFormValid) {
      onAnalyze(topic, files);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f3] text-zinc-900">

      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="w-full px-8 md:px-12 lg:px-16 xl:px-20 pt-16 md:pt-20 pb-12">

        <div className="grid lg:grid-cols-[55%_45%] min-h-[540px]">

          {/* =================================================
              LEFT — HERO TYPOGRAPHY
          ================================================= */}

          <div className="flex flex-col justify-between pr-10 xl:pr-20">

            <div>

              {/* Eyebrow */}

              <div className="flex items-center gap-4 mb-8">

                <span className="w-11 h-px bg-amber-700" />

                <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-amber-700">
                  Research Intelligence
                </p>

              </div>


              {/* Main heading */}

              <h1 className="font-serif text-[4.3rem] leading-[0.88] tracking-[-0.055em] text-zinc-900 md:text-[5.4rem] lg:text-[5.8rem] xl:text-[6.5rem]">

                Turn papers into

                <br />

                your next

                <br />

                <span className="italic text-amber-700">
                  research direction.
                </span>

              </h1>

            </div>


            {/* Description */}

            <p className="mt-8 max-w-2xl text-[16px] leading-7 text-zinc-600">
              Compare papers, uncover research gaps, and discover
              promising directions before you start building.
            </p>

          </div>


          {/* =================================================
              RIGHT — PROCESS
          ================================================= */}

          <div className="relative flex items-end pl-8 xl:pl-12">

            {/* Vertical rule */}

            <div className="absolute left-0 top-0 bottom-0 w-px bg-zinc-300" />


            <div className="w-full pb-2">

              {/* Section label */}

              <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-400 mb-12">
                From literature to ideas
              </p>


              {/* PROCESS LIST */}

              <div className="space-y-9">


                {/* -----------------------------------------
                    01
                ------------------------------------------ */}

                <div className="grid grid-cols-[64px_1fr] gap-7">

                  <div className="font-serif text-4xl leading-none text-zinc-300">
                    01
                  </div>

                  <div>

                    <p className="font-serif text-[2rem] leading-none text-zinc-900">
                      Literature
                    </p>

                    <p className="mt-3 max-w-md text-[14px] leading-6 text-zinc-500">
                      Bring together the research papers that
                      define the problem you are investigating.
                    </p>

                  </div>

                </div>


                {/* Connector */}

                <div className="ml-[31px] h-7 border-l border-dashed border-zinc-300" />


                {/* -----------------------------------------
                    02
                ------------------------------------------ */}

                <div className="grid grid-cols-[64px_1fr] gap-7">

                  <div className="font-serif text-4xl leading-none text-zinc-300">
                    02
                  </div>

                  <div>

                    <p className="font-serif text-[2rem] leading-none text-zinc-900">
                      Evidence
                    </p>

                    <p className="mt-3 max-w-md text-[14px] leading-6 text-zinc-500">
                      Compare methods, findings, limitations,
                      research gaps, and contradictions.
                    </p>

                  </div>

                </div>


                {/* Connector */}

                <div className="ml-[31px] h-7 border-l border-dashed border-zinc-300" />


                {/* -----------------------------------------
                    03
                ------------------------------------------ */}

                <div className="grid grid-cols-[64px_1fr] gap-7">

                  <div className="font-serif text-4xl leading-none text-zinc-300">
                    03
                  </div>

                  <div>

                    <p className="font-serif text-[2rem] leading-none text-zinc-900">
                      Research ideas
                    </p>

                    <p className="mt-3 max-w-md text-[14px] leading-6 text-zinc-500">
                      Turn what the literature is missing into
                      a research direction worth investigating.
                    </p>

                  </div>

                </div>

              </div>


              {/* Bottom statement */}

              <div className="mt-12 pt-6 border-t border-zinc-200">

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          ANALYSIS AREA
      ====================================================== */}

      <section className="w-full px-8 md:px-12 lg:px-16 xl:px-20 pb-20">

        <div className="border-t border-zinc-300 pt-10">

          <form onSubmit={handleSubmit}>

            {/* CHANGED:
                Reduced gap and made right column start earlier */}

            <div className="grid lg:grid-cols-[42%_58%] gap-10 lg:gap-14">


              {/* =================================================
                  LEFT
              ================================================= */}

              <div>

                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700 mb-6">
                  Start your analysis
                </p>


                <h2 className="font-serif text-4xl md:text-[3.3rem] leading-[1.02] tracking-[-0.03em] text-zinc-900">

                  Begin with a

                  <br />

                  research question.

                </h2>


                <p className="mt-6 max-w-md text-[15px] leading-7 text-zinc-500">
                  Tell ResearchLens what you are investigating,
                  then provide the papers you want to compare.
                </p>

              </div>


              {/* =================================================
                  RIGHT
              ================================================= */}

              <div className="space-y-10">


                {/* RESEARCH TOPIC */}

                <div>

                  <label
                    htmlFor="topic"
                    className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-4"
                  >
                    Research topic
                  </label>


                  <input
                    type="text"
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full bg-transparent border-0 border-b border-zinc-300 focus:border-zinc-900 focus:ring-0 px-0 py-3 text-[18px] text-zinc-900 placeholder-zinc-400 outline-none transition-colors"
                    placeholder="e.g. privacy-preserving fog computing"
                  />

                </div>


                {/* RESEARCH PAPERS */}

                <div>

                  <div className="flex items-end justify-between mb-4">

                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      Research papers
                    </label>

                    <span className="text-[11px] tracking-wide text-zinc-400">
                      {files.length}/5
                    </span>

                  </div>


                  {/* Upload area */}

                  <div
                    className="group cursor-pointer border border-dashed border-zinc-300 hover:border-zinc-500 transition-colors px-6 py-7 bg-[#fbfaf7]"
                    onClick={() => fileInputRef.current?.click()}
                  >

                    <div className="flex items-center justify-between gap-5">

                      <div className="flex items-center gap-5">

                        <Upload className="h-5 w-5 text-zinc-500 flex-shrink-0" />

                        <div>

                          <p className="text-[15px] font-medium text-zinc-800 group-hover:text-zinc-950 transition-colors">
                            Add research papers
                          </p>

                          <p className="text-[12px] text-zinc-400 mt-1">
                            PDF documents · Up to 5 papers
                          </p>

                        </div>

                      </div>


                      <span className="text-xl font-light text-zinc-400 group-hover:text-amber-700 transition-colors">
                        +
                      </span>

                    </div>


                    <input
                      ref={fileInputRef}
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      multiple
                      accept="application/pdf"
                      onChange={handleFileChange}
                    />

                  </div>


                  {/* FILE LIST */}

                  {files.length > 0 && (

                    <ul className="mt-4 divide-y divide-zinc-200 border-t border-b border-zinc-200">

                      {files.map((file, index) => (

                        <li
                          key={index}
                          className="flex items-center justify-between py-3"
                        >

                          <div className="flex items-center min-w-0 pr-4">

                            <FileText className="h-4 w-4 text-zinc-400 mr-3 flex-shrink-0" />

                            <span className="text-sm text-zinc-700 truncate">
                              {file.name}
                            </span>

                          </div>


                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="flex-shrink-0 text-zinc-400 hover:text-zinc-900 transition-colors"
                            aria-label={`Remove ${file.name}`}
                          >

                            <X className="h-4 w-4" />

                          </button>

                        </li>

                      ))}

                    </ul>

                  )}

                </div>


                {/* ACTION */}

                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pt-2">


                  <p className="text-[12px] leading-5 text-zinc-400 max-w-sm">
                    ResearchLens compares the literature you provide.
                    It does not replace reading the original papers.
                  </p>


                  <button
                    type="submit"
                    disabled={!isFormValid || isLoading}
                    className="inline-flex items-center justify-center px-7 py-3.5 bg-zinc-900 text-white text-sm font-medium hover:bg-amber-700 disabled:bg-zinc-300 disabled:text-zinc-500 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >

                    {isLoading
                      ? (loadingMessage || 'Analyzing papers...')
                      : 'Analyze literature'}

                    <span className="ml-4 text-base">
                      →
                    </span>

                  </button>

                </div>

              </div>

            </div>

          </form>

        </div>

      </section>

    </div>
  );
}