importScripts("pv_rhino.js")
importScripts("rhino.js")

onmessage = function (e) {
  switch (e.data.command) {
    case "init":
      init(e.data.context)
      break
    case "process":
      process(e.data.inputFrame)
      break
    case "pause":
      paused = true
      break
    case "resume":
      paused = false
      break
    case "release":
      release()
      break
  }
}

let context
let paused
let rhino = null

function init(context_) {
  context = context_
  paused = true

  // n.b.: typically this will never actually run
  // the context is generally created in "process()" below
  // TODO: create context via callback / promise
  if (Rhino.isLoaded()) {
    rhino = Rhino.create(context)
  }
}

function process(inputFrame) {
  if (rhino === null && Rhino.isLoaded()) {
    rhino = Rhino.create(context)
  }

  if (!paused) {
    if (rhino !== null) {
      let result = rhino.process(inputFrame)
      if ("isUnderstood" in result) {
        postMessage(result)
      }
    }
  }
}

function release() {
  if (rhino != null) {
    rhino.release()
  }

  rhino = null
}
