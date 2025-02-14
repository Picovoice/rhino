let rhino = null;

function writeMessage(message, bold = false) {
  console.log(message);
  let p = document.createElement("p");
  let text = document.createTextNode(message);

  if (bold) {
    let b = document.createElement("b");
    b.appendChild(text)
    text = b
  }

  p.appendChild(text);
  document.getElementById("messages").appendChild(p);
}

function rhinoInferenceCallback(inference) {
  if (inference.isFinalized) {
    writeMessage(`Inference detected: ${JSON.stringify(inference)}`, true);
    if (rhino) {
      WebVoiceProcessor.WebVoiceProcessor.unsubscribe(rhino);
    }
    document.getElementById("push-to-talk").disabled = false;
    writeMessage("Press the 'Push to Talk' button to speak again.");
  }
}

async function startRhino(accessKey) {
  try {
    writeMessage("Rhino is loading. Please wait...");
    rhino = await RhinoWeb.RhinoWorker.create(
        accessKey,
        rhinoContext,
        rhinoInferenceCallback,
        rhinoModel,
    );

    writeMessage("Rhino worker ready!");
    document.getElementById("push-to-talk").disabled = false;
    document.getElementById("rhn-context-yaml").innerText = rhino.contextInfo;

    writeMessage("Press the 'Push to Talk' button to talk. Then say something from the context info below.");
  } catch (error) {
    writeMessage(error);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("push-to-talk").onclick = function (event) {
    if (rhino) {
      writeMessage("Rhino is listening for your commands ...");
      this.disabled = true;
      WebVoiceProcessor.WebVoiceProcessor.subscribe(rhino);
    }
  };
});