importScripts('pv_rhino.js');
importScripts('rhino.js');

onmessage = function (e) {
    switch (e.data.command) {
        case "init":
            init(e.data.context);
            break;
        case "process":
            process(e.data.inputFrame);
            break;
        case "release":
            release();
            break;
    }
};

let context;

let rhino = null;

function init(context_) {
    context = context_;

    if (Rhino.isLoaded()) {
        rhino = Rhino.create(context)
    }
}

function process(inputFrame) {
    if (rhino == null && Rhino.isLoaded()) {
        rhino = Rhino.create(context)
    } else if (rhino != null) {
        let result = rhino.process(inputFrame);
        if ('isUnderstood' in result) {
            postMessage(result);
        }
    }
}

function release() {
    if (rhino != null) {
        rhino.release();
    }

    rhino = null;
}
