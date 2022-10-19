import "./App.css";
import { useState } from "react";

import VoiceWidget from "./VoiceWidget";


function App() {
    const [show, setShow] = useState(true);
    return (
        <div className="App">
            <h1>Rhino React Hook ("useRhino" from @picovoice/rhino-react)</h1>
            <button onClick={() => setShow(!show)}>
                Toggle VoiceWidget {show ? "OFF" : "ON"}
            </button>
            <br />
            <br />
            {show && <VoiceWidget />}
        </div>
    );
}

export default App;
