# Activity

This demo is intended for applications that need to do voice recognition when in focus. The default context for this demo
is "smart lighting". Simply press start and the engine can recognize commands such as "turn off the lights" or "
set the lights in the bedroom to blue". See below for the full context

```yaml
context:
  expressions:
    turnLight:
      - "[switch, turn] $state:state [the, all] lights"
      - "[switch, turn] [the, all] lights $state:state"
      - "[switch, turn] $state:state the $location:location lights"
      - "[switch, turn] the $location:location lights $state:state"
      - "[switch, turn] $state:state the lights in the $location:location"
      - "[switch, turn] the lights in the $location:location $state:state"
    turnOffLight:
      - "shut off the $location:location lights"
      - "shut the $location:location lights off"
      - "shut off the lights in the $location:location"
      - "shut the lights in the $location:location off"
    changeIntensity:
      - "[turn, make] [the, all] lights $intensityChange:intensityChange"
      - "[turn, make] the $location:location lights $intensityChange:intensityChange"
      - "[turn, make] the lights in the $location:location $intensityChange:intensityChange"
      - "$adjustIntensity:adjustIntensity brightness in the $location:location"
    lowerIntensity:
      - "dim [the, all] lights"
      - "dim the $location:location lights"
      - "dim the lights in the $location:location"
    changeColor:
      - "[set, change, switch] the lights to $color:color"
      - "[set, change, switch] the $location:location lights to $color:color"
      - "[set, change, switch] the lights in the $location:location to $color:color"
      - "[set, change, switch] color to $color:color"
      - "[set, change, switch] color in the $location:location to $color:color"
      - "[turn, make] the lights $color:color"
      - "[turn, make] the $location:location lights $color:color"
      - "[turn, make] the lights in the $location:location $color:color"
  slots:
    state:
      - "off"
      - "on"
    color:
      - "black"
      - "blue"
      - "green"
      - "pink"
      - "purple"
      - "red"
      - "violet"
      - "white"
      - "yellow"
    location:
      - "attic"
      - "balcony"
      - "basement"
      - "bathroom"
      - "bedroom"
      - "entrance"
      - "kitchen"
      - "living room"
    intensityChange:
      - "brighter"
      - "darker"
      - "dimmer"
    adjustIntensity:
      - "decrease"
      - "increase"
      - "lower"
      - "raise"
```

# Service

This demo is intended for an application that needs to do voice recognition for an extended period. The demo uses
Picovoice's wake-word engine ([Porcupine](https://github.com/Picovoice/porcupine)) to provide an always-listening experience.
The default wake phrase is "Picovoice". The default Rhino context is "smart lighting" as in the above.
