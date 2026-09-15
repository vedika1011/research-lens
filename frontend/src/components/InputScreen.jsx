import React, { useState, useRef } from 'react';
import { Upload, X, FileText } from 'lucide-react';

export default function InputScreen({ onAnalyze, isLoading, loadingMessage }) {
  const [topic, setTopic] = useState('');
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
      setFiles(prev => [...prev, ...newFiles].slice(0, 5)); // max 5
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const isFormValid = topic.trim().length > 0 && files.length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isFormValid) {
      onAnalyze(topic, files);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-20 p-6">
      <header className="mb-12">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 mb-3">
          Turn papers into your next research idea.
        </h1>
        <p className="text-zinc-600 text-sm">
          Upload up to 5 PDFs and specify your research topic.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-zinc-700 mb-2">
            Research Topic
          </label>
          <input
            type="text"
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full px-4 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600 sm:text-sm"
            placeholder="e.g., Transformer architecture efficiency"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Upload Papers (PDF)
          </label>
          <div 
            className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-zinc-300 border-dashed rounded-md hover:border-amber-500 transition-colors cursor-pointer bg-white"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-zinc-400" />
              <div className="flex text-sm text-zinc-600 justify-center">
                <span className="relative cursor-pointer rounded-md font-medium text-amber-600 hover:text-amber-500 focus-within:outline-none">
                  <span>Upload a file</span>
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
                </span>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-zinc-500">
                PDF up to 15MB each (Max 5)
              </p>
            </div>
          </div>
        </div>

        {files.length > 0 && (
          <ul className="divide-y divide-zinc-200 border border-zinc-200 rounded-md bg-white">
            {files.map((file, index) => (
              <li key={index} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                <div className="flex w-0 flex-1 items-center">
                  <FileText className="h-5 w-5 flex-shrink-0 text-zinc-400" aria-hidden="true" />
                  <span className="ml-2 w-0 flex-1 truncate">{file.name}</span>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="font-medium text-zinc-400 hover:text-zinc-500 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button
          type="submit"
          disabled={!isFormValid || isLoading}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? (loadingMessage || 'Analyzing Papers...') : 'Analyze Papers'}
        </button>
      </form>
    </div>
  );
}
