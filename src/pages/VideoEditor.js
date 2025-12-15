import React, { useMemo } from 'react';
import { ReactVideoEditor } from '../Components/video-editor-js/pro/components/react-video-editor';
import { HttpRenderer } from '../Components/video-editor-js/pro/utils/http-renderer';
import '../Components/video-editor-js/pro/styles.css';
import '../Components/video-editor-js/pro/styles.utilities.css';
import '../Components/video-editor-js/pro/styles/base-themes/dark.css';
import '../Components/video-editor-js/pro/styles/base-themes/light.css';
import '../Components/video-editor-js/pro/styles/base-themes/rve.css';

// TODO: Replace these placeholders with real values from your app/config.
const PROJECT_ID = 'demo-project';
const DEFAULT_PROJECT_OVERLAYS = [];
const APP_CONFIG = { fps: 30 };
const LAMBDA_RENDER_ENDPOINT = '/api/render/lambda';

export default function VideoEditor() {
  const lambdaRenderer = useMemo(
    () =>
      new HttpRenderer(LAMBDA_RENDER_ENDPOINT, {
        type: 'lambda',
        entryPoint: LAMBDA_RENDER_ENDPOINT,
      }),
    []
  );

    return (
    <div className="w-full h-screen bg-white">
      <ReactVideoEditor
        projectId={PROJECT_ID}
        defaultOverlays={DEFAULT_PROJECT_OVERLAYS}
        fps={APP_CONFIG.fps}
        renderer={lambdaRenderer}
        showDefaultThemes={true}
      />
        </div>
    );
  }

