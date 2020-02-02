from .binding.python.rhino import Rhino
from .resources.util.python import *


def create(library_path=None, model_path=None, context_path=None, context=None):
    """
    Factory method for Rhino

    :param library_path: Absolute path to Rhino's dynamic library.
    :param model_path: Absolute path to file containing model parameters.
    :param context_path: Absolute path to file containing context parameters. A context represents the set of
    expressions (commands), intents, and intent arguments (slots) within a domain of interest.
    :param context: The context to be used by Rhino. List of default contexts can be retrieved via 'pvrhino.CONTEXTS'
    :return: An instance of Rhino speech-to-intent engine.
    """

    if library_path is None:
        library_path = RHINO_LIBRARY_PATH

    if model_path is None:
        model_path = RHINO_MODEL_FILE_PATH

    if context_path is None:
        if context is None:
            raise ValueError("'context' or 'context_path' must be set")
        if context not in CONTEXTS:
            raise ValueError(
                "context '%s' is not available by default. default contexts are :\n%s" % (context, ', '.join(CONTEXTS)))
        context_path = CONTEXT_FILE_PATHS[context]

    return Rhino(
        library_path=library_path,
        model_path=model_path,
        context_path=context_path)
