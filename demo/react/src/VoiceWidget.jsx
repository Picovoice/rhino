import { useState, useEffect } from "react";
import { useRhino } from "@picovoice/rhino-web-react";

import { CLOCK_EN_64 } from "./dist/rhn_contexts_base64";

export default function VoiceWidget() {
  const [inference, setInference] = useState(null);
  const [workerChunk, setWorkerChunk] = useState({ factory: null });
  const [isChunkLoaded, setIsChunkLoaded] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [inputValue, setInputValue] = useState("");

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
          setIsChunkLoaded(true);
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
    start,
    pause,
    stop,
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
          <a href="https://console.picovoice.ai/">Picovoice Console</a>:
          <input
            type="text"
            name="accessKey"
            onChange={(value) => setInputValue(value.target.value)}
            disabled={isLoaded}
          />
        </label>
        <button className="start-button" onClick={() => setAccessKey(inputValue)} disabled={isLoaded}>
          Start Rhino
        </button>
      </h3>
      <h3>Dynamic Import Loaded: {JSON.stringify(isChunkLoaded)}</h3>
      <h3>Rhino Loaded: {JSON.stringify(isLoaded)}</h3>
      <h3>Listening: {JSON.stringify(isListening)}</h3>
      <h3>Error: {JSON.stringify(isError)}</h3>
      {isError && accessKey && (
        <p className="error-message">{JSON.stringify(errorMessage)}</p>
      )}
      <h3>Talking: {JSON.stringify(isTalking)}</h3>

      <br />
      <button
        onClick={() => start()}
        disabled={isError || isListening || !isLoaded}
      >
        Start
      </button>
      <button
        onClick={() => pause()}
        disabled={isError || !isListening || !isLoaded}
      >
        Pause
      </button>
      <button
        onClick={() => stop()}
        disabled={isError || !isListening || !isLoaded}
      >
        Stop
      </button>
      <button
        onClick={() => pushToTalk()}
        disabled={!isListening || isTalking || isError || !isLoaded}
      >
        Push to Talk
      </button>
      <h3>Inference:</h3>
      {inference !== null && <pre>{JSON.stringify(inference, null, 2)}</pre>}
      <hr />
      <h3>Context Info:</h3>
      <pre>{contextInfo}</pre>
    </div>
  );
}
