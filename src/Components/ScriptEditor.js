import React, { useEffect, useState, useCallback, useRef } from 'react';
import ErrorBoundary from './ErrorBoundary';
import Chat from './Chat';

// Lightweight dedicated Script editor section.
// Reuses the scenes editor from Chat with scenesMode enabled and hides chat input.
// Provides a clean header with Back and Generate Images actions.
const ScriptEditor = ({
  title = 'The Generated Script is:',
  initialScenes = null,
  onBack,
  onGenerateImages,
  // Passthrough props for Chat scenes editor
  addUserChat,
  userChat,
  setuserChat,
  sendUserSessionData,
  chatHistory,
  setChatHistory,
  imagesAvailable = false,
  onOpenImagesList,
}) => {
  const [loadedScenes, setLoadedScenes] = useState(null);
  const [isLoadingScript, setIsLoadingScript] = useState(true);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Function to load script from session data API
  const loadScriptFromSession = useCallback(async () => {
    try {
      const sessionId = localStorage.getItem('session_id');
      const userId = localStorage.getItem('token');
      
      if (!sessionId || !userId) {
        console.warn('[ScriptEditor] Missing session_id or token');
        setIsLoadingScript(false);
        setScriptLoaded(true);
        // Don't use fallback - only show data from API
        setLoadedScenes([]);
        return;
      }

      setIsLoadingScript(true);
      setScriptLoaded(false);

      // Always call user session data API
      console.log('[ScriptEditor] Calling user session data API...');
      const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, session_id: sessionId })
      });

      const text = await resp.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (_) {
        data = text;
      }

      if (!resp.ok) {
        console.error('[ScriptEditor] Failed to load session data:', resp.status, text);
        setIsLoadingScript(false);
        setScriptLoaded(true);
        // Don't use fallback - only show data from API
        setLoadedScenes([]);
        return;
      }

      // Extract session_data from response
      const sessionData = data?.session_data || data?.session || {};
      
      // Helper function to find arrays that might be scripts (arrays with objects that have scene_number or scene_title)
      const findScriptArray = (obj, path = '') => {
        if (!obj || typeof obj !== 'object') return null;
        if (Array.isArray(obj)) {
          // Check if this array looks like a script (has objects with scene properties)
          if (obj.length > 0) {
            const firstItem = obj[0];
            if (firstItem && typeof firstItem === 'object') {
              const hasSceneProps = firstItem.scene_number || firstItem.scene_title || firstItem.sceneNumber || 
                                   firstItem.title || firstItem.narration || firstItem.description;
              if (hasSceneProps) {
                console.log(`[ScriptEditor] Found potential script array at path: ${path}`, {
                  length: obj.length,
                  firstItem: firstItem
                });
                return obj;
              }
            }
          }
          return null;
        }
        // Recursively search object properties
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            const result = findScriptArray(obj[key], path ? `${path}.${key}` : key);
            if (result) return result;
          }
        }
        return null;
      };
      
      console.log('[ScriptEditor] Full API response structure:', {
        hasData: !!data,
        hasSessionData: !!sessionData,
        hasScripts: !!sessionData?.scripts,
        scriptsLength: Array.isArray(sessionData?.scripts) ? sessionData.scripts.length : 0,
        hasReorderedScript: !!sessionData?.reordered_script,
        hasChangedScript: !!sessionData?.changed_script,
        hasAiresponse: !!sessionData?.airesponse,
        rootHasReorderedScript: !!data?.reordered_script,
        rootHasChangedScript: !!data?.changed_script,
        rootHasAiresponse: !!data?.airesponse,
        sessionDataKeys: Object.keys(sessionData || {}),
        dataKeys: Object.keys(data || {}),
        fullResponse: JSON.stringify(data, null, 2).substring(0, 3000) // Increased log size
      });

      let scriptData = null;

      // First, check for reordered_script or changed_script (from switch-model API)
      if (!scriptData && sessionData?.reordered_script) {
        const reordered = sessionData.reordered_script;
        console.log('[ScriptEditor] Found reordered_script:', {
          hasAiresponse: !!reordered?.airesponse,
          isArray: Array.isArray(reordered),
          type: typeof reordered
        });
        if (Array.isArray(reordered?.airesponse)) {
          scriptData = reordered.airesponse;
        } else if (Array.isArray(reordered)) {
          scriptData = reordered;
        } else if (reordered && typeof reordered === 'object') {
          scriptData = reordered;
        }
      }

      if (!scriptData && sessionData?.changed_script) {
        const changed = sessionData.changed_script;
        console.log('[ScriptEditor] Found changed_script:', {
          hasAiresponse: !!changed?.airesponse,
          isArray: Array.isArray(changed),
          type: typeof changed
        });
        if (Array.isArray(changed?.airesponse)) {
          scriptData = changed.airesponse;
        } else if (Array.isArray(changed)) {
          scriptData = changed;
        } else if (changed && typeof changed === 'object') {
          scriptData = changed;
        }
      }

      // Get scripts array from session_data
      const scripts = Array.isArray(sessionData?.scripts) && sessionData.scripts.length > 0 
        ? sessionData.scripts 
        : [];

      // Extract script from scripts array (scripts[0] is the latest, but check all if needed)
      if (!scriptData && scripts.length > 0) {
        // Check all scripts in the array, not just first 3
        for (let i = 0; i < scripts.length; i++) {
          const currentScript = scripts[i];
          console.log(`[ScriptEditor] Checking scripts[${i}]:`, {
            hasAiresponse: !!currentScript?.airesponse,
            hasReorderedScript: !!currentScript?.reordered_script,
            hasChangedScript: !!currentScript?.changed_script,
            airesponseType: Array.isArray(currentScript?.airesponse) ? 'array' : typeof currentScript?.airesponse,
            airesponseLength: Array.isArray(currentScript?.airesponse) ? currentScript.airesponse.length : 'N/A',
            isArray: Array.isArray(currentScript),
            type: typeof currentScript
          });

          // Check for reordered_script or changed_script in the script object
          if (currentScript?.reordered_script) {
            const reordered = currentScript.reordered_script;
            if (Array.isArray(reordered?.airesponse)) {
              scriptData = reordered.airesponse;
              console.log(`[ScriptEditor] Found reordered_script.airesponse in scripts[${i}]`);
              break;
            } else if (Array.isArray(reordered)) {
              scriptData = reordered;
              console.log(`[ScriptEditor] Found reordered_script array in scripts[${i}]`);
              break;
            } else if (reordered && typeof reordered === 'object') {
              scriptData = reordered;
              console.log(`[ScriptEditor] Found reordered_script object in scripts[${i}]`);
              break;
            }
          }

          if (currentScript?.changed_script) {
            const changed = currentScript.changed_script;
            if (Array.isArray(changed?.airesponse)) {
              scriptData = changed.airesponse;
              console.log(`[ScriptEditor] Found changed_script.airesponse in scripts[${i}]`);
              break;
            } else if (Array.isArray(changed)) {
              scriptData = changed;
              console.log(`[ScriptEditor] Found changed_script array in scripts[${i}]`);
              break;
            } else if (changed && typeof changed === 'object') {
              scriptData = changed;
              console.log(`[ScriptEditor] Found changed_script object in scripts[${i}]`);
              break;
            }
          }

          // Extract airesponse array from the script object
          if (Array.isArray(currentScript?.airesponse)) {
            scriptData = currentScript.airesponse;
            console.log(`[ScriptEditor] Found airesponse array in scripts[${i}]:`, {
              length: scriptData.length,
              firstScene: scriptData[0] || null
            });
            break;
          } else if (Array.isArray(currentScript)) {
            // If the script itself is an array
            scriptData = currentScript;
            console.log(`[ScriptEditor] Found script as array in scripts[${i}]`);
            break;
          } else if (currentScript && typeof currentScript === 'object') {
            // If it's an object, check various formats
            if (Array.isArray(currentScript?.rows)) {
              scriptData = currentScript;
              console.log(`[ScriptEditor] Found script with rows in scripts[${i}]`);
              break;
            } else if (Array.isArray(currentScript?.script)) {
              scriptData = currentScript.script;
              console.log(`[ScriptEditor] Found script.script array in scripts[${i}]`);
              break;
            } else if (Object.keys(currentScript).length > 0) {
              // If it's a non-empty object, use it (might be the script structure)
              scriptData = currentScript;
              console.log(`[ScriptEditor] Found script object in scripts[${i}]`);
              break;
            }
          }
        }
      }

      // If no script found in scripts array, check sessionData directly
      if (!scriptData && Array.isArray(sessionData?.airesponse)) {
        console.log('[ScriptEditor] Found airesponse directly in sessionData');
        scriptData = sessionData.airesponse;
      }

      // Also check if the entire response is the script or has script at root level
      if (!scriptData && Array.isArray(data?.airesponse)) {
        console.log('[ScriptEditor] Found airesponse in root response');
        scriptData = data.airesponse;
      }

      // Check root level for reordered_script or changed_script (in case API returns it at root)
      if (!scriptData && data?.reordered_script) {
        const reordered = data.reordered_script;
        console.log('[ScriptEditor] Found reordered_script at root level');
        if (Array.isArray(reordered?.airesponse)) {
          scriptData = reordered.airesponse;
        } else if (Array.isArray(reordered)) {
          scriptData = reordered;
        } else if (reordered && typeof reordered === 'object') {
          scriptData = reordered;
        }
      }

      if (!scriptData && data?.changed_script) {
        const changed = data.changed_script;
        console.log('[ScriptEditor] Found changed_script at root level');
        if (Array.isArray(changed?.airesponse)) {
          scriptData = changed.airesponse;
        } else if (Array.isArray(changed)) {
          scriptData = changed;
        } else if (changed && typeof changed === 'object') {
          scriptData = changed;
        }
      }

      // If still no script found, try recursive search for script arrays
      if (!scriptData) {
        console.log('[ScriptEditor] Performing recursive search for script arrays...');
        const foundScript = findScriptArray(sessionData, 'sessionData');
        if (foundScript) {
          scriptData = foundScript;
          console.log('[ScriptEditor] Found script via recursive search');
        } else {
          const foundScriptRoot = findScriptArray(data, 'root');
          if (foundScriptRoot) {
            scriptData = foundScriptRoot;
            console.log('[ScriptEditor] Found script via recursive search in root');
          }
        }
      }

      // If still no script, check if scripts array items have nested structures we haven't checked
      if (!scriptData && scripts.length > 0) {
        console.log('[ScriptEditor] Checking all scripts array items for nested structures...');
        for (let i = 0; i < scripts.length; i++) {
          const scriptItem = scripts[i];
          // Try recursive search in each script item
          const found = findScriptArray(scriptItem, `scripts[${i}]`);
          if (found) {
            scriptData = found;
            console.log(`[ScriptEditor] Found script via recursive search in scripts[${i}]`);
            break;
          }
        }
      }

      // Only use API data - no fallback to localStorage or initialScenes
      // This ensures we always show the latest data from the backend

      // Validate scriptData - ensure it's not empty
      if (scriptData) {
        // Normalize scriptData - if it's an object with airesponse/script/rows, extract the array
        let normalizedScript = scriptData;
        if (scriptData && typeof scriptData === 'object' && !Array.isArray(scriptData)) {
          if (Array.isArray(scriptData.airesponse) && scriptData.airesponse.length > 0) {
            normalizedScript = scriptData.airesponse;
            console.log('[ScriptEditor] Normalized script: extracted airesponse array');
          } else if (Array.isArray(scriptData.script) && scriptData.script.length > 0) {
            normalizedScript = scriptData.script;
            console.log('[ScriptEditor] Normalized script: extracted script array');
          } else if (Array.isArray(scriptData.rows) && scriptData.rows.length > 0) {
            // Keep the object with rows (this is the expected format for Chat component)
            normalizedScript = scriptData;
            console.log('[ScriptEditor] Normalized script: using object with rows');
          }
          // If it's an object but doesn't have airesponse/script/rows, keep it as-is
          // The Chat component's normalizeScriptToRows can handle various formats
        }

        // Very lenient validation - accept any non-null/undefined value
        // The Chat component's normalizeScriptToRows can handle various formats
        // If we found something, try to use it - let Chat component decide if it's valid
        if (normalizedScript !== null && normalizedScript !== undefined) {
          console.log('[ScriptEditor] ✅ Using script data (will let Chat component validate):', {
            type: Array.isArray(normalizedScript) ? 'array' : typeof normalizedScript,
            length: Array.isArray(normalizedScript) ? normalizedScript.length : 'N/A',
            keys: !Array.isArray(normalizedScript) ? Object.keys(normalizedScript || {}) : [],
            hasRows: !!(normalizedScript?.rows),
            hasAiresponse: !!(normalizedScript?.airesponse),
            hasScript: !!(normalizedScript?.script),
            firstItem: Array.isArray(normalizedScript) && normalizedScript.length > 0 ? normalizedScript[0] : null,
            stringified: JSON.stringify(normalizedScript).substring(0, 1000)
          });
          setLoadedScenes(normalizedScript);
        } else {
          console.warn('[ScriptEditor] ⚠️ Script data is null or undefined');
          setLoadedScenes([]);
        }
      } else {
        console.warn('[ScriptEditor] ⚠️ No script found in session data from API. Full response keys:', Object.keys(data || {}));
        // Always use API data - no fallback to initialScenes
        setLoadedScenes([]);
      }
    } catch (error) {
      console.error('[ScriptEditor] ❌ Error loading script from session:', error);
      // Always use API data - no fallback to initialScenes
      setLoadedScenes([]);
    } finally {
      setIsLoadingScript(false);
      setScriptLoaded(true);
    }
  }, []); // Removed initialScenes dependency - always use API data

  // Always load from API when component mounts
  useEffect(() => {
    loadScriptFromSession();
  }, [loadScriptFromSession]);

  // Reload script when refreshTrigger changes (triggered by script changes)
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('[ScriptEditor] Refreshing script after change...');
      // Show loading state during refresh
      setIsLoadingScript(true);
      setScriptLoaded(false);
      loadScriptFromSession();
    }
  }, [refreshTrigger, loadScriptFromSession]);

  // Callback to refresh script after changes (add scene, delete scene, reorder, switch model)
  const handleScriptChange = useCallback(() => {
    console.log('[ScriptEditor] Script changed, triggering refresh...');
    // Add a delay to ensure API has updated (longer delay for add/delete/reorder operations)
    // The backend needs time to process and update the session data
    setTimeout(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 1500); // Increased to 1.5 seconds to ensure backend has processed the change
  }, []);

  // Preload brand-assets images on mount and cache in localStorage for reuse
  useEffect(() => {
    (async () => {
      try {
        const token = (typeof window !== 'undefined' && localStorage.getItem('token')) || '';
        if (!token) return;
        const cacheKey = `brand_assets_images:${token}`;
        // Always refresh on mount to keep it up to date
        const resp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/images/${encodeURIComponent(token)}`);
        const text = await resp.text();
        let data; try { data = JSON.parse(text); } catch(_) { data = text; }
        if (resp.ok && data && typeof data === 'object') {
          try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch(_) {}
        }
      } catch (_) { /* noop */ }
    })();
  }, []);
  return (
    <div className='bg-white rounded-lg shadow-sm flex-1 flex flex-col min-h-0 overflow-x-hidden' style={{ minHeight: '100vh' }}>
      <div className='flex-1 overflow-visible min-h-0' style={{ minHeight: '100vh' }}>
        <ErrorBoundary>
          {isLoadingScript || !scriptLoaded ? (
            <div className="flex items-center justify-center w-full" style={{ minHeight: '100vh' }}>
              <div className="text-center space-y-6">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-[#13008B] mx-auto"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-8 w-8 rounded-full bg-[#13008B] opacity-20 animate-pulse"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-[#13008B]">Loading Script</p>
                  <p className="text-sm text-gray-500">Fetching script data from session...</p>
                  <div className="flex items-center justify-center space-x-1 pt-2">
                    <div className="w-2 h-2 bg-[#13008B] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-[#13008B] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-[#13008B] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Chat
              addUserChat={addUserChat}
              userChat={userChat}
              setuserChat={setuserChat}
              sendUserSessionData={sendUserSessionData}
              chatHistory={chatHistory}
              setChatHistory={setChatHistory}
              isChatLoading={false}
              onOpenImagesList={onOpenImagesList}
              imagesAvailable={imagesAvailable}
              scenesMode={true}
              enablePresenterOptions={true}
              initialScenes={loadedScenes}
              onBackToChat={onBack}
              onScriptChange={handleScriptChange}
              key={`script-editor-${scriptLoaded ? 'loaded' : 'loading'}-${loadedScenes ? (Array.isArray(loadedScenes) ? loadedScenes.length : 'obj') : 'null'}`}
            />
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default ScriptEditor;

