import { useState, useEffect } from "react";
import { useRhino } from "@picovoice/rhino-web-react";

import { CLOCK_EN_64 } from "./dist/rhn_contexts_base64";

export default function VoiceWidget() {
  const [inference, setInference] = useState(null);
  const [workerChunk, setWorkerChunk] = useState({ factory: null });
  const [accessKey, setAccessKey] = useState("");

  useEffect(() => {
    if (workerChunk.factory === null) {
      let isCanceled = false;
      const loadRhino = async () => {
        // Dynamically import the worker
        const rhnEnWorkerFactory = (
          await import("@picovoice/rhino-web-en-worker")
        ).RhinoWorkerFactory;

        // If the component unmounted while loading, don't attempt to update it
        if (!isCanceled) {
          setWorkerChunk({ factory: rhnEnWorkerFactory });
        }
      };

      loadRhino();

      return () => {
        isCanceled = true;
      };
    }
  }, [workerChunk]);

  const inferenceEventHandler = (rhinoInference) => {
    setInference(rhinoInference);
  };

  const {
    contextInfo,
    isLoaded,
    isListening,
    isError,
    isTalking,
    errorMessage,
    pushToTalk,
  } = useRhino(
    workerChunk.factory,
    {
      accessKey,
      context: { base64: CLOCK_EN_64 },
      start: true
    },
    inferenceEventHandler
  );

  return (
    <div className="voice-widget">
      <h2>VoiceWidget</h2>
      <h3>
        <label>
          AccessKey obtained from{" "}
          <a href="https://picovoice.ai/console/">Picovoice Console</a>:
          <input
            type="text"
            name="accessKey"
            onChange={(value) => setAccessKey(value.target.value)}
            disabled={isLoaded}
          />
        </label>
      </h3>
      <h3>
        Dynamic Import Loaded: {JSON.stringify(workerChunk.factory !== null)}
      </h3>
      <h3>Loaded: {JSON.stringify(isLoaded)}</h3>
      <h3>Listening: {JSON.stringify(isListening)}</h3>
      <h3>Error: {JSON.stringify(isError)}</h3>
      {isError && (
        <p className="error-message">{JSON.stringify(errorMessage)}</p>
      )}
      <h3>Talking: {JSON.stringify(isTalking)}</h3>

      <h3>
        Rhino Context: <i>Alarm Clock</i>
      </h3>
      <p>e.g. "Set a timer for two minutes"</p>
      <button
        onClick={() => pushToTalk()}
        disabled={!isListening || isTalking || isError || !isLoaded}
      >
        Push to Talk
      </button>
      <h3>Inference:</h3>
      {inference !== null && <pre>{JSON.stringify(inference)}</pre>}
      <h2>Context Info</h2>
      <pre>{contextInfo}</pre>
    </div>
  );
}
