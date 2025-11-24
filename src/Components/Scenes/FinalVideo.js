import React, { useEffect, useState } from 'react';

const FinalVideo = ({ jobId, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('queued');
  const [finalVideoUrl, setFinalVideoUrl] = useState('');
  const [jobProgress, setJobProgress] = useState({ percent: 0, phase: '' });

  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;

    const pollJobStatus = async () => {
      try {
        const resp = await fetch(
          `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/merge-job-status/${encodeURIComponent(jobId)}`
        );
        const text = await resp.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (_) {
          data = text;
        }

        if (!resp.ok) throw new Error(`merge-job-status failed: ${resp.status} ${text}`);

        const jobStatus = String(data?.status || '').toLowerCase();
        const progress = data?.progress || {};
        const percent = Number(progress?.percent) || 0;
        const phase = String(progress?.phase || progress?.stage || '').toLowerCase();

        if (!cancelled) {
          setStatus(jobStatus);
          setJobProgress({ percent, phase });

          // If job is succeeded, get the final video URL
          if (jobStatus === 'succeeded' || jobStatus === 'completed') {
            setIsLoading(false);
            setFinalVideoUrl(
              data?.final_video_url ||
              data?.finalVideoUrl ||
              data?.video_url ||
              data?.videoUrl ||
              data?.result_url ||
              data?.resultUrl ||
              ''
            );
            return; // Stop polling
          }

          // If job failed, stop polling
          if (jobStatus === 'failed' || jobStatus === 'error') {
            setIsLoading(false);
            setError(data?.error || data?.message || 'Video generation failed');
            return; // Stop polling
          }

          // Continue polling if job is still processing
          if (!cancelled && (jobStatus === 'queued' || jobStatus === 'processing' || jobStatus === 'in_progress')) {
            timeoutId = setTimeout(pollJobStatus, 3000); // Poll every 3 seconds
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || 'Failed to check job status');
          setIsLoading(false);
        }
      }
    };

    if (jobId) {
      pollJobStatus();
    } else {
      setError('No job ID provided');
      setIsLoading(false);
    }

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [jobId]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-lg relative h-[100%]">
      {isLoading && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
          <div className="bg-white shadow-2xl rounded-2xl px-8 py-9 text-center space-y-3">
            <div className="w-16 h-16 rounded-full border-4 border-[#D8D3FF] border-t-[#13008B] animate-spin mx-auto" />
            <div className="text-lg font-semibold text-[#13008B]">Generating Final Reel</div>
            <div className="text-sm text-gray-600">
              {jobProgress.phase ? jobProgress.phase.toUpperCase() : 'PROCESSING'} • {Math.min(100, Math.max(0, Math.round(jobProgress.percent)))}%
            </div>
            <p className="text-xs text-gray-500">Please keep this tab open while we prepare your final video.</p>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-600 font-semibold mb-1">Error</div>
            <div className="text-sm text-red-600">{error}</div>
            {onClose && (
              <button
                onClick={onClose}
                className="mt-3 px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
              >
                Go Back
              </button>
            )}
          </div>
        )}

        {finalVideoUrl && !isLoading && (
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#13008B]">Final Reel</h2>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
                >
                  Back
                </button>
              )}
            </div>
            <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
              <video src={finalVideoUrl} controls className="w-full h-full object-contain bg-black" />
            </div>
            <div className="mt-4 flex items-center gap-4">
              <a
                href={finalVideoUrl}
                download
                className="px-4 py-2 rounded-lg bg-[#13008B] text-white text-sm hover:bg-[#0f0069]"
              >
                Download Video
              </a>
            </div>
          </div>
        )}

        {status === 'succeeded' && !finalVideoUrl && !error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-sm text-yellow-800">
              Video generation completed, but video URL is not available yet. Please refresh the page.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinalVideo;

