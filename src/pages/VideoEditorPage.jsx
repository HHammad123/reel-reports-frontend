import React, { useMemo } from 'react';
import { ReactVideoEditor } from '../Components/video-editor-js/pro/components/react-video-editor';
import { HttpRenderer } from '../Components/video-editor-js/pro/utils/http-renderer';
import '../Components/video-editor-js/pro/styles.css';
import '../Components/video-editor-js/pro/styles.utilities.css';
import '../Components/video-editor-js/pro/styles/base-themes/dark.css';
import '../Components/video-editor-js/pro/styles/base-themes/light.css';
import '../Components/video-editor-js/pro/styles/base-themes/rve.css';

const PROJECT_ID = 'demo-project';
const DEFAULT_PROJECT_OVERLAYS = [];
const APP_CONFIG = { fps: 30 };
const LAMBDA_RENDER_ENDPOINT = '/api/render/lambda';

const VideoEditorPage = () => {
  const lambdaRenderer = useMemo(
    () =>
      new HttpRenderer(LAMBDA_RENDER_ENDPOINT, {
        type: 'lambda',
        entryPoint: LAMBDA_RENDER_ENDPOINT,
      }),
    []
  );

  return (
    <div
      className="w-full h-full bg-white"
      style={{ minHeight: 'calc(100vh - 80px)' }} // leave space for surrounding layout bars
    >
      <ReactVideoEditor
        projectId={PROJECT_ID}
        defaultOverlays={DEFAULT_PROJECT_OVERLAYS}
        fps={APP_CONFIG.fps}
        renderer={lambdaRenderer}
        showDefaultThemes={true}
      />
    </div>
  );
};

export default VideoEditorPage;