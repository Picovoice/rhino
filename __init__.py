from .binding.python.rhino import Rhino
from .resources.util.python import *


def create(library_path=None, model_path=None, context_path=None):
    """
    Factory method for Rhino

    :param library_path: Absolute path to Rhino's dynamic library.
    :param model_path: Absolute path to file containing model parameters.
    :param context_path: Absolute path to file containing context parameters. A context represents the set of
    expressions (spoken commands), intents, and intent arguments (slots) within a domain of interest.
    :return: An instance of Rhino Speech-to-Intent engine.
    """

    if library_path is None:
        library_path = LIBRARY_PATH

    if model_path is None:
        model_path = MODEL_PATH

    return Rhino(library_path=library_path, model_path=model_path, context_path=context_path)
