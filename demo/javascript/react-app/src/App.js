import React, { useState, useEffect } from "react";
import SmartLightingDemo from "./picovoice/smart_lighting_demo";
import "@picovoice/web-voice-processor/src/web_voice_processor";
import "./App.css";
const MESSAGE_TIMEOUT_MS = 5000;

const demo = new SmartLightingDemo();

const LIVING_ROOM = "living room";
const BEDROOM = "bedroom";
const BATHROOM = "bathroom";
const HALLWAY = "hallway";
const KITCHEN = "kitchen";
const CLOSET = "closet";
const PANTRY = "pantry";

const FURNITURE_DARK_GRAY = "#76838E";
const FURNITURE_LIGHT_GRAY = "#dbdbdb";
const FURNITURE_BLUE = "#DDECFA";
const FURNITURE_OFFWHITE = "#F8F9FA";

const LIGHT_YELLOW = "#fcec03";
const LIGHT_PINK = "#fc03f0";
const LIGHT_BLUE = "#00d0ff";
const LIGHT_PURPLE = "#690fb8";
const LIGHT_GREEN = "#00e03c";
const LIGHT_RED = "#ff0000";
const LIGHT_ORANGE = "#ff9d00";

const LIGHT_MAP = new Map();
LIGHT_MAP.set("yellow", LIGHT_YELLOW);
LIGHT_MAP.set("pink", LIGHT_PINK);
LIGHT_MAP.set("blue", LIGHT_BLUE);
LIGHT_MAP.set("purple", LIGHT_PURPLE);
LIGHT_MAP.set("green", LIGHT_GREEN);
LIGHT_MAP.set("red", LIGHT_RED);
LIGHT_MAP.set("orange", LIGHT_ORANGE);

const INTENSITY = [
  { zero: 1.0, fifty: 0.3, hundred: 0.0 },
  { zero: 1.0, fifty: 0.5, hundred: 0.0 },
  { zero: 1.0, fifty: 0.7, hundred: 0.0 },
];

const INCREMENT = "incr";
const DECREMENT = "decr";
const DIRECTION_MAP = new Map();
DIRECTION_MAP.set("up", INCREMENT);
DIRECTION_MAP.set("down", DECREMENT);
DIRECTION_MAP.set("brighter", INCREMENT);
DIRECTION_MAP.set("dimmer", DECREMENT);
DIRECTION_MAP.set("brighten", INCREMENT);
DIRECTION_MAP.set("dim", DECREMENT);
DIRECTION_MAP.set("decrease", DECREMENT);
DIRECTION_MAP.set("increase", INCREMENT);
DIRECTION_MAP.set("reduce", DECREMENT);
DIRECTION_MAP.set("drop", DECREMENT);
DIRECTION_MAP.set("lower", DECREMENT);

const ASPECT_COLOR = "color";
const ASPECT_INTENSITY = "intensity";
const RESET_MAP = new Map();
RESET_MAP.set("color", ASPECT_COLOR);
RESET_MAP.set("colors", ASPECT_COLOR);
RESET_MAP.set("intensity", ASPECT_INTENSITY);
RESET_MAP.set("brightness", ASPECT_INTENSITY);

export default function LightingDemo(props) {
  const [listening, setListening] = useState(false);
  const [wakePhrase, setWakePhrase] = useState(false);
  const [intentFailed, setIntentFailed] = useState(false);

  const [message, setMessage] = useState("");

  const [demoInitialized, setDemoInitialized] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const [livingRoomLightState, setLivingRoomLightState] = useState(false);
  const [bedroomLightState, setBedroomLightState] = useState(false);
  const [kitchenLightState, setKitchenLightState] = useState(false);
  const [bathroomLightState, setBathroomLightState] = useState(false);
  const [hallwayLightState, setHallwayLightState] = useState(false);
  const [closetLightState, setClosetLightState] = useState(false);
  const [pantryLightState, setPantryLightState] = useState(false);

  const [livingRoomLightColor, setLivingRoomLightColor] = useState(
    LIGHT_YELLOW
  );
  const [bedroomLightColor, setBedroomLightColor] = useState(LIGHT_YELLOW);
  const [kitchenLightColor, setKitchenLightColor] = useState(LIGHT_YELLOW);
  const [bathroomLightColor, setBathroomLightColor] = useState(LIGHT_YELLOW);
  const [hallwayLightColor, setHallwayLightColor] = useState(LIGHT_YELLOW);
  const [closetLightColor, setClosetLightColor] = useState(LIGHT_YELLOW);
  const [pantryLightColor, setPantryLightColor] = useState(LIGHT_YELLOW);

  const [livingRoomLightIntensity, setLivingRoomLightIntensity] = useState(1);
  const [bedroomLightIntensity, setBedroomLightIntensity] = useState(1);
  const [kitchenLightIntensity, setKitchenLightIntensity] = useState(1);
  const [bathroomLightIntensity, setBathroomLightIntensity] = useState(1);
  const [hallwayLightIntensity, setHallwayLightIntensity] = useState(1);
  const [closetLightIntensity, setClosetLightIntensity] = useState(1);
  const [pantryLightIntensity, setPantryLightIntensity] = useState(1);

  const setAllLightState = (state) => {
    setLivingRoomLightState(state);
    setBedroomLightState(state);
    setKitchenLightState(state);
    setBathroomLightState(state);
    setHallwayLightState(state);
    setClosetLightState(state);
    setPantryLightState(state);
  };

  const setAllLightColor = (color) => {
    setLivingRoomLightColor(color);
    setBedroomLightColor(color);
    setKitchenLightColor(color);
    setBathroomLightColor(color);
    setHallwayLightColor(color);
    setClosetLightColor(color);
    setPantryLightColor(color);

    if (isAllOff()) {
      setAllLightState(true);
    }
  };

  const isAllOff = () => {
    return !(
      livingRoomLightState ||
      bedroomLightState ||
      kitchenLightState ||
      bathroomLightState ||
      hallwayLightState ||
      closetLightState ||
      pantryLightState
    );
  };

  const setAllLightIntensity = (direction) => {
    const getNewLightIntensity = (intensity) => {
      if (isAllOff()) {
        return 0;
      }
      if (direction === INCREMENT) {
        if (intensity < INTENSITY.length - 1) {
          return intensity + 1;
        } else {
          setMessage("Some lights are already at maximum intensity");
          return intensity;
        }
      } else if (direction === DECREMENT) {
        if (intensity > 0) {
          return intensity - 1;
        } else {
          setMessage("Some lights are already at minimum intensity");
          return intensity;
        }
      } else {
        return direction;
      }
    };
    setLivingRoomLightIntensity(getNewLightIntensity(livingRoomLightIntensity));
    setBedroomLightIntensity(getNewLightIntensity(bedroomLightIntensity));
    setKitchenLightIntensity(getNewLightIntensity(kitchenLightIntensity));
    setBathroomLightIntensity(getNewLightIntensity(bathroomLightIntensity));
    setHallwayLightIntensity(getNewLightIntensity(hallwayLightIntensity));
    setClosetLightIntensity(getNewLightIntensity(closetLightIntensity));
    setPantryLightIntensity(getNewLightIntensity(pantryLightIntensity));

    if (isAllOff()) {
      setAllLightState(true);
    }
  };

  const STATE_MAP = new Map();
  STATE_MAP.set(LIVING_ROOM, setLivingRoomLightState);
  STATE_MAP.set(BEDROOM, setBedroomLightState);
  STATE_MAP.set(KITCHEN, setKitchenLightState);
  STATE_MAP.set(BATHROOM, setBathroomLightState);
  STATE_MAP.set(HALLWAY, setHallwayLightState);
  STATE_MAP.set(CLOSET, setClosetLightState);
  STATE_MAP.set(PANTRY, setPantryLightState);
  STATE_MAP.set("all", setAllLightState);

  const COLOR_MAP = new Map();
  COLOR_MAP.set(LIVING_ROOM, setLivingRoomLightColor);
  COLOR_MAP.set(BEDROOM, setBedroomLightColor);
  COLOR_MAP.set(KITCHEN, setKitchenLightColor);
  COLOR_MAP.set(BATHROOM, setBathroomLightColor);
  COLOR_MAP.set(HALLWAY, setHallwayLightColor);
  COLOR_MAP.set(CLOSET, setClosetLightColor);
  COLOR_MAP.set(PANTRY, setPantryLightColor);
  COLOR_MAP.set("all", setAllLightColor);

  const resetDemo = () => {
    setAllLightColor(LIGHT_YELLOW);
    setAllLightIntensity(1);
    setAllLightState(false);
    setMessage("");
    setIntentFailed(false);
    setWakePhrase(false);
  };

  const changeIntensity = (location, direction) => {
    let currentState = null;
    let currentIntensity = null;
    let setIntensity = null;
    switch (location) {
      case LIVING_ROOM:
        currentState = livingRoomLightState;
        currentIntensity = livingRoomLightIntensity;
        setIntensity = setLivingRoomLightIntensity;
        break;
      case BEDROOM:
        currentState = bedroomLightState;
        currentIntensity = bedroomLightIntensity;
        setIntensity = setBedroomLightIntensity;
        break;
      case KITCHEN:
        currentState = kitchenLightState;
        currentIntensity = kitchenLightIntensity;
        setIntensity = setKitchenLightIntensity;
        break;
      case BATHROOM:
        currentState = bathroomLightState;
        currentIntensity = bathroomLightIntensity;
        setIntensity = setBathroomLightIntensity;
        break;
      case HALLWAY:
        currentState = hallwayLightState;
        currentIntensity = hallwayLightIntensity;
        setIntensity = setHallwayLightIntensity;
        break;
      case CLOSET:
        currentState = closetLightState;
        currentIntensity = closetLightIntensity;
        setIntensity = setClosetLightIntensity;
        break;
      case PANTRY:
        currentState = pantryLightState;
        currentIntensity = pantryLightIntensity;
        setIntensity = setPantryLightIntensity;
        break;
      case "all":
        setAllLightIntensity(direction);
        break;
      default:
        return;
    }

    if (currentIntensity !== null && setIntensity !== null) {
      if (direction === INCREMENT) {
        if (currentState === false) {
          setIntensity(0);
          STATE_MAP.get(location)(true);
          return;
        }
        if (currentIntensity < INTENSITY.length - 1) {
          setIntensity(currentIntensity + 1);
        } else {
          setMessage("Light is already at maximum intensity");
        }
      } else if (direction === DECREMENT) {
        if (currentState === false) {
          setMessage("Light is already at minimum intensity");
          return;
        }
        if (currentIntensity > 0) {
          setIntensity(currentIntensity - 1);
        } else {
          setMessage("Light is already at minimum intensity");
        }
      } else if (direction === "reset") {
        setIntensity(1);
      }
    }
  };

  const toggleListening = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const stopListening = () => {
    demo.stop();
    setListening(false);
    setWakePhrase(false);
    resetDemo();
  };

  const startListening = () => {
    demo.start(initCallback, ppnCallback, rhnCallback);
    setListening(true);
    setWakePhrase(false);
    setIntentFailed(false);

    if (!demoInitialized) {
      setDemoInitialized(true);
      setDemoLoading(true);
    }
  };

  const initCallback = (event) => {
    setDemoInitialized(true);
    setDemoLoading(false);
  };

  const ppnCallback = (event) => {
    setWakePhrase(true);
    // reset the demo on re-activating the keyword
    setIntentFailed(false);
    setMessage("");
  };

  const rhnCallback = (information) => {
    setWakePhrase(false);

    if (information.isUnderstood === false) {
      setIntentFailed(true);
    } else {
      setIntentFailed(false);
      const intent = information.intent;
      const slots = information.slots;
      const location =
        slots["location"] === undefined ? "all" : slots["location"];

      if (intent === "changeLightState") {
        const state = slots["state"] === "on" ? true : false;
        STATE_MAP.get(location)(state);
      } else if (intent === "changeLightStateOff") {
        STATE_MAP.get(location)(false);
      } else if (intent === "changeColor") {
        const color = LIGHT_MAP.get(slots["color"]);
        COLOR_MAP.get(location)(color);
        if (location !== "all") {
          STATE_MAP.get(location)(true);
        }
      } else if (intent === "changeIntensity") {
        const dir = DIRECTION_MAP.get(slots["intensity"]);
        changeIntensity(location, dir);
      } else if (intent === "reset") {
        const resetAspect = RESET_MAP.get(slots["feature"]);
        if (location === null || location === undefined) {
          if (resetAspect === ASPECT_COLOR) {
            setAllLightColor(LIGHT_YELLOW);
          } else if (resetAspect === ASPECT_INTENSITY) {
            setAllLightIntensity(1);
          }
        } else {
          if (resetAspect === ASPECT_COLOR) {
            COLOR_MAP.get(location)(LIGHT_YELLOW);
          } else if (resetAspect === ASPECT_INTENSITY) {
            changeIntensity(location, "reset");
          }
        }
      }
    }
  };

  // Refresh the callbacks so that their closures see the latest state of the React hooks
  useEffect(() => {
    demo.refresh(initCallback, ppnCallback, rhnCallback);
  });

  useEffect(() => {
    if (message !== "") {
      setTimeout(() => {
        setMessage("");
      }, MESSAGE_TIMEOUT_MS);
    }
  }, [message]);

  return (
    <>
      <h1>Smart Lighting Demo</h1>
      <div className="lighting-demo">
        <div className="side-panel">
          <div className="instructions">
            <h2>Instructions</h2>

            <h3>Getting Started</h3>
            <p>
              Welcome to the smart home! Using your voice, you can control
              various aspects of the lights in this house.
            </p>
            <p>
              To start any command, say <strong>"Picovoice"</strong> to wake the device.
            </p>

            <h3>Turning The Lights On/Off</h3>
            <p>Here are some example phrases:</p>
            <p className="example-phrase">
              <strong>"Turn the lights in the Living Room on"</strong>
            </p>
            <p className="example-phrase">
              <strong>"Shut off the lights in the Bathroom"</strong>
            </p>
            <p className="example-phrase">
              <strong>"Switch on all lights"</strong>
            </p>

            <h3>Changing Light Color</h3>
            <p>Here are some example phrases:</p>
            <p className="example-phrase">
              <strong>"Turn the lights in the Kitchen Blue"</strong>
            </p>
            <p className="example-phrase">
              <strong>"Make the closet lights green"</strong>
            </p>
            <p className="example-phrase">
              <strong>"Switch all lights purple"</strong>
            </p>
            <p>
              Possible Colors:
              <br /> <br />
              <span className="badge" style={{ backgroundColor: LIGHT_RED }}>
                Red
              </span>
              <span className="badge" style={{ backgroundColor: LIGHT_ORANGE }}>
                Orange
              </span>
              <span className="badge" style={{ backgroundColor: LIGHT_YELLOW }}>
                Yellow
              </span>
              <span className="badge" style={{ backgroundColor: LIGHT_GREEN }}>
                Green
              </span>
              <span className="badge" style={{ backgroundColor: LIGHT_BLUE }}>
                Blue
              </span>
              <span className="badge" style={{ backgroundColor: LIGHT_PURPLE }}>
                Purple
              </span>
              <span className="badge" style={{ backgroundColor: LIGHT_PINK }}>
                Pink
              </span>
            </p>

            <h3>Dimming/Brightening</h3>
            <p>Here are some example phrases:</p>
            <p className="example-phrase">
              <strong>"Turn the lights in the hallway up"</strong>
            </p>
            <p className="example-phrase">
              <strong>"Make the closet lights brighter"</strong>
            </p>
            <p className="example-phrase">
              <strong>"Dim all the lights"</strong>
            </p>
          </div>
        </div>

        <div>
          <div className={`house-container ${wakePhrase ? "active" : ""}`}>
            <svg
              className={`house ${wakePhrase ? "active" : ""}`}
              viewBox="0 0 480 400"
            >
              {/* GRADIENTS */}
              <defs>
                <radialGradient
                  id="livingRoomGradient"
                  cx="50%"
                  cy="50%"
                  r="50%"
                  fx="50%"
                  fy="50%"
                >
                  <stop
                    offset="0%"
                    stopColor={livingRoomLightColor}
                    stopOpacity={INTENSITY[livingRoomLightIntensity].zero}
                  />
                  <stop
                    offset="50%"
                    stopColor={livingRoomLightColor}
                    stopOpacity={INTENSITY[livingRoomLightIntensity].fifty}
                  />
                  <stop
                    offset="100%"
                    stopColor={livingRoomLightColor}
                    stopOpacity={INTENSITY[livingRoomLightIntensity].hundred}
                  />
                </radialGradient>

                <radialGradient
                  id="bedroomGradient"
                  cx="50%"
                  cy="50%"
                  r="50%"
                  fx="50%"
                  fy="50%"
                >
                  <stop
                    offset="0%"
                    stopColor={bedroomLightColor}
                    stopOpacity={INTENSITY[bedroomLightIntensity].zero}
                  />
                  <stop
                    offset="50%"
                    stopColor={bedroomLightColor}
                    stopOpacity={INTENSITY[bedroomLightIntensity].fifty}
                  />
                  <stop
                    offset="100%"
                    stopColor={bedroomLightColor}
                    stopOpacity={INTENSITY[bedroomLightIntensity].hundred}
                  />
                </radialGradient>

                <radialGradient
                  id="bathroomGradient"
                  cx="50%"
                  cy="50%"
                  r="50%"
                  fx="50%"
                  fy="50%"
                >
                  <stop
                    offset="0%"
                    stopColor={bathroomLightColor}
                    stopOpacity={INTENSITY[bathroomLightIntensity].zero}
                  />
                  <stop
                    offset="50%"
                    stopColor={bathroomLightColor}
                    stopOpacity={INTENSITY[bathroomLightIntensity].fifty}
                  />
                  <stop
                    offset="100%"
                    stopColor={bathroomLightColor}
                    stopOpacity={INTENSITY[bathroomLightIntensity].hundred}
                  />
                </radialGradient>

                <radialGradient
                  id="hallwayGradient"
                  cx="50%"
                  cy="50%"
                  r="50%"
                  fx="50%"
                  fy="50%"
                >
                  <stop
                    offset="0%"
                    stopColor={hallwayLightColor}
                    stopOpacity={INTENSITY[hallwayLightIntensity].zero}
                  />
                  <stop
                    offset="50%"
                    stopColor={hallwayLightColor}
                    stopOpacity={INTENSITY[hallwayLightIntensity].fifty}
                  />
                  <stop
                    offset="100%"
                    stopColor={hallwayLightColor}
                    stopOpacity={INTENSITY[hallwayLightIntensity].hundred}
                  />
                </radialGradient>

                <radialGradient
                  id="kitchenGradient"
                  cx="50%"
                  cy="50%"
                  r="50%"
                  fx="50%"
                  fy="50%"
                >
                  <stop
                    offset="0%"
                    stopColor={kitchenLightColor}
                    stopOpacity={INTENSITY[kitchenLightIntensity].zero}
                  />
                  <stop
                    offset="50%"
                    stopColor={kitchenLightColor}
                    stopOpacity={INTENSITY[kitchenLightIntensity].fifty}
                  />
                  <stop
                    offset="100%"
                    stopColor={kitchenLightColor}
                    stopOpacity={INTENSITY[kitchenLightIntensity].hundred}
                  />
                </radialGradient>

                <radialGradient
                  id="closetGradient"
                  cx="50%"
                  cy="50%"
                  r="50%"
                  fx="50%"
                  fy="50%"
                >
                  <stop
                    offset="0%"
                    stopColor={closetLightColor}
                    stopOpacity={INTENSITY[closetLightIntensity].zero}
                  />
                  <stop
                    offset="50%"
                    stopColor={closetLightColor}
                    stopOpacity={INTENSITY[closetLightIntensity].fifty}
                  />
                  <stop
                    offset="100%"
                    stopColor={closetLightColor}
                    stopOpacity={INTENSITY[closetLightIntensity].hundred}
                  />
                </radialGradient>

                <radialGradient
                  id="pantryGradient"
                  cx="50%"
                  cy="50%"
                  r="50%"
                  fx="50%"
                  fy="50%"
                >
                  <stop
                    offset="0%"
                    stopColor={pantryLightColor}
                    stopOpacity={INTENSITY[pantryLightIntensity].zero}
                  />
                  <stop
                    offset="50%"
                    stopColor={pantryLightColor}
                    stopOpacity={INTENSITY[pantryLightIntensity].fifty}
                  />
                  <stop
                    offset="100%"
                    stopColor={pantryLightColor}
                    stopOpacity={INTENSITY[pantryLightIntensity].hundred}
                  />
                </radialGradient>
              </defs>
              {/* WALL */}
              <polyline
                points="224,397.6 2.4,397.6 2.4,2.4 477.6,2.4 477.6,397.6 258,397.6"
                id="outer-wall"
              />
              {/* LIVING ROOM */}
              <polyline
                points="160,224 2.4,224 2.4,2.4 240,2.4 240,128"
                className="room"
              />
              {/* BEDROOM */}
              <polyline
                points="240,128 240,2.4 477.6,2.4 477.6,176 470,176"
                className="room"
              />

              {/* KITCHEN */}
              <polyline
                points="224,397.6 2.4,397.6 2.4,224 167.2,224 167.2,250"
                className="room"
              />
              {/* BATHROOM */}
              <polyline
                points="475.2,272 320,272 320,176 448,176"
                className="room"
              />
              {/* HALLWAY */}
              <polyline
                points="310,272 477.6,272 477.6,397.6 258,397.6"
                className="room"
              />
              {/* CLOSET */}
              <polyline
                points="310,176 320,176 320,224 240,224 240,176 250,176"
                className="room"
              />
              {/* PANTRY */}
              <polyline
                points="250,272 240,272 240,224 320,224 320,272 310,272"
                className="room"
              />

              {/* LIVING ROOM TV */}
              <rect
                x="20"
                y="20"
                width="15"
                height="70"
                rx="5"
                fill={FURNITURE_DARK_GRAY}
              />

              {/* LIVING ROOM COUCH */}
              <rect
                x="170"
                y="15"
                width="60"
                height="100"
                rx="5"
                fill={FURNITURE_LIGHT_GRAY}
              />
              <rect
                x="172"
                y="25"
                width="40"
                height="80"
                rx="5"
                fill={FURNITURE_OFFWHITE}
              />

              {/* LIVING ROOM DESK */}
              <rect
                x="20"
                y="150"
                width="90"
                height="50"
                fill={FURNITURE_BLUE}
              />

              {/* LIVING ROOM CHAIR 1*/}
              <path
                d=" M 45,145 L 30,120 L60,120 Z"
                fill={FURNITURE_DARK_GRAY}
              />
              <ellipse
                cx="45"
                cy="135"
                rx="15"
                ry="10"
                fill={FURNITURE_LIGHT_GRAY}
              />

              {/* LIVING ROOM CHAIR 2*/}
              <path
                d=" M 85,145 L 70,120 L100,120 Z"
                fill={FURNITURE_DARK_GRAY}
              />
              <ellipse
                cx="85"
                cy="135"
                rx="15"
                ry="10"
                fill={FURNITURE_LIGHT_GRAY}
              />

              {/* BEDROOM BED */}
              <rect
                x="330"
                y="15"
                width="140"
                height="110"
                rx="5"
                fill={FURNITURE_LIGHT_GRAY}
              />
              <rect
                x="330"
                y="15"
                width="90"
                height="110"
                rx="5"
                fill={FURNITURE_BLUE}
              />
              <rect
                x="433"
                y="22"
                width="25"
                height="45"
                rx="5"
                fill={FURNITURE_OFFWHITE}
              />
              <rect
                x="433"
                y="72"
                width="25"
                height="45"
                rx="5"
                fill={FURNITURE_OFFWHITE}
              />

              {/* KITCHEN COUNTERS */}
              <rect
                x="4.8"
                y="226.4"
                width="50"
                height="168.8"
                fill={FURNITURE_LIGHT_GRAY}
              />
              <rect
                x="4.8"
                y="226.4"
                width="160"
                height="50"
                fill={FURNITURE_LIGHT_GRAY}
              />

              {/* KITCHEN SINK */}
              <rect
                x="9.4"
                y="290"
                width="35"
                height="50"
                fill={FURNITURE_OFFWHITE}
              />
              <rect
                x="14.4"
                y="295"
                width="25"
                height="40"
                fill={FURNITURE_DARK_GRAY}
              />

              {/* KITCHEN STOVE */}
              <rect
                x="70"
                y="232.4"
                width="50"
                height="35"
                fill={FURNITURE_OFFWHITE}
              />
              <circle cx="85" cy="243" r="7" fill={FURNITURE_DARK_GRAY} />
              <circle cx="85" cy="258" r="7" fill={FURNITURE_DARK_GRAY} />
              <circle cx="105" cy="243" r="7" fill={FURNITURE_DARK_GRAY} />
              <circle cx="105" cy="258" r="7" fill={FURNITURE_DARK_GRAY} />

              {/* BATHROOM BATHTUB */}
              <rect
                x="322.4"
                y="178.4"
                width="50"
                height="91.2"
                fill={FURNITURE_OFFWHITE}
              />
              <rect
                x="327.4"
                y="183.4"
                width="40"
                height="81.2"
                fill={FURNITURE_LIGHT_GRAY}
              />

              {/* BATHROOM SINK */}
              <rect
                x="435.2"
                y="239.6"
                width="40"
                height="30"
                fill={FURNITURE_LIGHT_GRAY}
              />
              <rect
                x="440.2"
                y="245"
                width="30"
                height="20"
                fill={FURNITURE_DARK_GRAY}
              />

              {/* HALLWAY SHOE RACK */}
              <rect
                x="415.2"
                y="370.2"
                width="60"
                height="25"
                fill={FURNITURE_LIGHT_GRAY}
              />

              {/* LIVING ROOM LIGHTS*/}
              <rect
                x="0"
                y="0"
                width="224"
                height="224"
                className={`lights${livingRoomLightState ? " on" : ""}`}
                id="living-room"
              />

              {/* BEDROOM LIGHTS*/}
              <rect
                x="272"
                y="0"
                width="176"
                height="176"
                className={`lights${bedroomLightState ? " on" : ""}`}
                id="bedroom"
              />

              {/* KITCHEN LIGHTS*/}
              <rect
                x="0"
                y="224"
                width="160"
                height="160"
                className={`lights${kitchenLightState ? " on" : ""}`}
                id="kitchen"
              />

              {/* BATHROOM LIGHTS*/}
              <rect
                x="352"
                y="176"
                width="96"
                height="96"
                className={`lights${bathroomLightState ? " on" : ""}`}
                id="bathroom"
              />

              {/* HALLWAY LIGHTS*/}
              <rect
                x="305"
                y="272"
                width="128"
                height="128"
                className={`lights${hallwayLightState ? " on" : ""}`}
                id="hallway"
              />

              {/* CLOSET LIGHTS*/}
              <rect
                x="256"
                y="176"
                width="48"
                height="48"
                className={`lights${closetLightState ? " on" : ""}`}
                id="closet"
              />

              {/* PANTRY LIGHTS*/}
              <rect
                x="256"
                y="224"
                width="48"
                height="48"
                className={`lights${pantryLightState ? " on" : ""}`}
                id="pantry"
              />

              {/* LABELS */}
              <text x="40" y="35" className="font-weight-bold">
                LIVING ROOM
              </text>
              <text x="247" y="35" className="font-weight-bold">
                BEDROOM
              </text>
              <text x="250" y="210" className="font-weight-bold">
                CLOSET
              </text>
              <text x="375" y="230" className="font-weight-bold">
                BATHROOM
              </text>
              <text x="250" y="250" className="font-weight-bold">
                PANTRY
              </text>
              <text x="380" y="360" className="font-weight-bold">
                HALLWAY
              </text>
              <text x="60" y="380" className="font-weight-bold">
                KITCHEN
              </text>
            </svg>
          </div>
          <div className = "alerts-container">

          <button
            disabled={demoLoading}
            className={listening && !demoLoading ? "btn-danger" : "btn-primary"}
            variant="primary"
            onClick={() => toggleListening()}
            id="demo-button"
          >
            {!demoLoading && listening && "Stop Demo"}
            {!demoLoading && !listening && "Start Listening"}
            {demoLoading && "Loading…"}
          </button>
          <div className="progress-indicator">
            {demoLoading && (
              <>
                <div className="spinner initializing"></div>
                <div>initializing Demo...</div>
              </>
            )}
            {listening && !demoLoading && !wakePhrase && (
              <>
                <div className="spinner wakephrase"></div>
                <div>Listening for "Picovoice"...</div>
              </>
            )}
            {listening && !demoLoading && wakePhrase && (
              <>
                <div className="spinner command"></div>
                <div>Listening for command...</div>
              </>
            )}
          </div>
            {message !== "" && (
              <div className = "message">{message}</div>
            )}
            {intentFailed && (
              <div className = "message">Speech-to-intent engine couldn't understand your command</div>
            )}
        </div>
          </div>
          
      </div>
    </>
  );
}
