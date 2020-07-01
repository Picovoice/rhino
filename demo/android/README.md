# Activity

This demo is intended for applications that need to do voice recognition when in focus. The default context for this demo
is "smart lighting". Simply press start and the engine can recognize commands such as "turn off the lights" or "
set the lights in the bedroom to blue". See below for the full context:

```yaml
context:
  expressions:
    changeColor:
      - (please) [change, set, switch] (the) $location:location (to) $color:color
      - (please) [change, set, switch] (the) $location:location color (to) $color:color
      - (please) [change, set, switch] (the) $location:location lights (to) $color:color
      - (please) [change, set, switch] (the) color [at, in] the $location:location (to) $color:color
      - (please) [change, set, switch] (the) lights [at, in] the $location:location to $color:color
      - (please) [change, set, switch] (the) lights to $color:color
      - (please) [turn, make] (the) $location:location (color) $color:color
      - (please) [turn, make] (the) lights [at, in] the $location:location $color:color
      - (please) [turn, make] (the) lights $color:color
      - (please) [turn, make] (the) lights $color:color [at, in] the $location:location
    changeIntensity:
      - (please) [turn, make] (the) $location:location $intensityAdjective:intensity
      - (please) [turn, make] (the) $location:location lights $intensityAdjective:intensity
      - (please) [turn, make] (the) lights [in, at] the $location:location $intensityAdjective:intensity
      - (please) [turn, make] (the) lights $intensityAdjective:intensity
      - (please) $intensityVerb:intensity (the) [lights, brightness, intensity]
      - (please) $intensityVerb:intensity (the) $location:location lights
      - (please) $intensityVerb:intensity (the) lights [in, at] (the) $location:location
      - (please) $intensityVerb:intensity [the, all] lights
      - (please) $intensityVerb:intensity the $location:location (brightness)
      - (please) $intensityVerb:intensity the $location:location [lights, brightness, intensity]
    changeLightState:
      - (please) [switch, turn] $state:state (the) $location:location (lights)
      - (please) [switch, turn] $state:state (the) lights
      - (please) [switch, turn] $state:state (the) lights [at, in] (the) $location:location
      - (please) [switch, turn] (the) $location:location lights $state:state
      - (please) [switch, turn] (the) lights $state:state
      - (please) [switch, turn] (the) lights [in, at] the $location:location $state:state
    changeLightStateOff:
      - (please) shut (the) $location:location lights off
      - (please) shut (the) lights [at, in] (the) $location:location off
      - (please) shut off (the) $location:location lights
      - (please) shut off (the) lights
      - (please) shut off (the) lights [at, in] (the) $location:location
    reset:
      - (please) reset (the) $feature:feature
      - (please) reset (the) $feature:feature [at, in] (the) $location:location
      - (please) reset (the) $location:location $feature:feature
  slots:
    color:
      - blue
      - green
      - orange
      - pink
      - purple
      - red
      - white
      - yellow
    intensityAdjective:
      - brighter
      - dimmer
      - lighter
      - darker
      - lower
    intensityVerb:
      - brighten
      - decrease
      - dim
      - down
      - drop
      - increase
      - lower
      - raise
      - reduce
      - up
    state:
      - off
      - on
    location:
      - all
      - bathroom
      - bedroom
      - closet
      - hallway
      - kitchen
      - living room
      - pantry
    feature:
      - brightness
      - color
      - colors
      - intensity
```

# Service

This demo is intended for an application that needs to do voice recognition for an extended period. The demo uses
Picovoice's wake-word engine ([Porcupine](https://github.com/Picovoice/porcupine)) to provide an always-listening experience.
The default wake phrase is "Picovoice". The default Rhino context is "smart lighting" as in the above.
