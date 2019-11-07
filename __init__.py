from .binding.python.rhino import Rhino
from .resources.util.python import *


def create(library_path=None, model_file_path=None, context_file_path=None):
	"""
	Factory method for Rhino

    :param library_path: Absolute path to Rhino's dynamic library.
    :param model_file_path: Absolute path to file containing model parameters.
    :param context_file_path: Absolute path to file containing context parameters. A context represents the set of
    expressions (commands), intents, and intent arguments (slots) within a domain of interest.
    :return: An instance of Rhino speech-to-intent engine.
	"""

	if library_path is None:
		library_path = LIBRARY_PATH

	if model_file_path is None:
		model_file_path = MODEL_FILE_PATH

	if context_file_path is None:
		context_file_path = CONTEXT_FILE_PATH

	return Rhino(
	    library_path=library_path,
        model_file_path=model_file_path,
        context_file_path=context_file_path)
	