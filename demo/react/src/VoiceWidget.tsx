import { useState } from "react";
import { useRhino } from "@picovoice/rhino-react";

import rhinoModelParams from "./rhino_params";

export default function VoiceWidget() {
  const [accessKey, setAccessKey] = useState("");

  const {
    inference,
    contextInfo,
    isLoaded,
    isListening,
    error,
    init,
    process,
    release,
  } = useRhino();

  const rhnInit = async () => {
    await init(
      accessKey,
      { publicPath: "clock_wasm.rhn" },
      { base64: rhinoModelParams },
    );
  }

  const rhnProcess = async () => {
    await process()
  }

  const rhnRelease = async () => {
    await release()
  }

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
            onChange={(value) => setAccessKey(value.target.value)}
            disabled={isLoaded}
          />
        </label>
        <button className="start-button" onClick={() => rhnInit()} disabled={isLoaded || accessKey.length === 0}>
          Init Rhino
        </button>
      </h3>
      <h3>Rhino Loaded: {JSON.stringify(isLoaded)}</h3>
      <h3>Listening: {JSON.stringify(isListening)}</h3>
      <h3>Error: {JSON.stringify(error !== null)}</h3>
      {error && accessKey && (
        <p className="error-message">{JSON.stringify(error)}</p>
      )}

      <br />
      <button
        onClick={() => rhnProcess()}
        disabled={error !== null || !isLoaded || isListening}
      >
        Process
      </button>
      <button
        onClick={() => rhnRelease()}
        disabled={error !== null || !isLoaded || isListening}
      >
        Release
      </button>

      <h3>Inference:</h3>
      {inference && <pre>{JSON.stringify(inference, null, 2)}</pre>}
      <hr />
      <h3>Context Info:</h3>
      <pre>{contextInfo}</pre>
    </div>
  );
}
