/*
    Copyright 2018 Picovoice Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

            http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

#ifndef PV_RHINO_H
#define PV_RHINO_H

#include <stdbool.h>
#include <stdint.h>

#include "picovoice.h"

#ifdef __cplusplus
extern "C"
{
#endif

/**
 * Forward declaration for speech-to-intent object (a.k.a Rhino).
 * The object directly infers intent from speech commands within a given context of interest in real-time. It
 * processes incoming audio in consecutive frames (chunks) and at the end of each frame indicates if the intent
 * extraction is finalized. When finalized, the intent can be retrieved as structured data in form of an intent string
 * and pairs of slots and values representing arguments (details) of intent. The number of samples per frame can be
 * attained by calling 'pv_rhino_frame_length()'. The incoming audio needs to have a sample rate equal to
 * 'pv_sample_rate()' and be 16-bit linearly-encoded. Furthermore, Rhino operates on single channel audio.
 */
typedef struct pv_rhino_object pv_rhino_object_t;

#ifdef PV_RHINO_BAREMACHINE
/**
 * Constructor.
 *
 * @param context Context parameters. A context represents the set of expressions (commands), intents, and intent
 * arguments (slots) within a domain of interest.
 * @param context_length Length of context in bytes.
 * @param[out] object Constructed speech-to-intent object.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT' or 'PV_STATUS_OUT_OF_MEMORY' on failure.
 */
PV_API pv_status_t pv_rhino_init(const void *context, int context_length, pv_rhino_object_t **object);
#else
/**
 * Constructor.
 *
 * @param model_file_path Absolute path to file containing model parameters.
 * @param context_file_path Absolute path to file containing context parameters. A context represents the set of
 * expressions (commands), intents, and intent arguments (slots) within a domain of interest.
 * @param[out] object Constructed speech-to-intent object.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT', 'PV_STATUS_IO_ERROR', or 'PV_STATUS_OUT_OF_MEMORY' on
 * failure.
 */
PV_API pv_status_t pv_rhino_init(const char *model_file_path, const char *context_file_path, pv_rhino_object_t **object);
#endif

/**
 * Destructor.
 *
 * @param object Speech-to-intent object.
 */
PV_API void pv_rhino_delete(pv_rhino_object_t *object);

/**
 * Processes a frame of audio and emits a flag indicating if the engine has finalized intent extraction. When finalized,
 * 'pv_rhino_is_understood()' should be called to check if the command was valid (is within context of interest).
 *
 * @param object Speech-to-intent object.
 * @param pcm A frame of audio samples. The number of samples per frame can be attained by calling
 * 'pv_rhino_frame_length()'. The incoming audio needs to have a sample rate equal to 'pv_sample_rate()' and be 16-bit
 * linearly-encoded. Furthermore, Rhino operates on single channel audio.
 * @param[out] is_finalized Flag indicating whether the engine has finalized intent extraction.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT' or 'PV_STATUS_OUT_OF_MEMORY' on failure.
 */
PV_API pv_status_t pv_rhino_process(pv_rhino_object_t *object, const int16_t *pcm, bool *is_finalized);

/**
 * Indicates if the spoken command is valid, is within the domain of interest (context), and the engine understood it.
 *
 * @param object Speech-to-intent object.
 * @param[out] is_understood Flag indicating if the spoken command is valid, is within the domain of interest (context),
 * and the engine understood it.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT' on failure.
 */
PV_API pv_status_t pv_rhino_is_understood(const pv_rhino_object_t *object, bool *is_understood);

/**
 * Getter for the intent inferred from spoken command. The intent is presented as an intent string and pairs of slots
 * and their values. It should be called only after intent extraction is finalized and it is verified that the spoken
 * command is valid and understood via calling 'pv_rhino_is_understood()'.
 *
 * @param object Speech-to-intent object.
 * @param[out] intent Inferred intent.
 * @param[out] num_slots Number of slots.
 * @param[out] slots Array of inferred slots. Its memory needs to be freed by the caller.
 * @param[out] values Array of inferred slot values in the same order of inferred slots. Its memory needs to be freed
 * by the caller.
 * @return State code. Returns 'PV_STATUS_INVALID_ARGUMENT', 'PV_STATUS_INVALID_STATE', or 'PV_STATUS_OUT_OF_MEMORY' on
 * failure.
 */
PV_API pv_status_t pv_rhino_get_intent(
        const pv_rhino_object_t *object,
        const char **intent,
        int *num_slots,
        const char ***slots,
        const char ***values);

/**
 * Resets the internal state of the engine. It should be called before the engine can be used to infer intent from a new
 * stream of audio.
 *
 * @param object Speech-to-intent object.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT' on failure.
 */
PV_API pv_status_t pv_rhino_reset(pv_rhino_object_t *object);

/**
 * Getter for expressions. Each expression maps a set of spoken phrases to an intent and possibly a number of slots
 * (intent arguments).
 *
 * @param object Speech-to-intent object.
 * @param[out] expressions Expressions.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT' on failure.
 */
PV_API pv_status_t pv_rhino_context_expressions(const pv_rhino_object_t *object, const char **expressions);

/**
 * Getter for version string.
 *
 * @return Version.
 */
PV_API const char *pv_rhino_version(void);

/**
 * Getter for length (number of audio samples) per frame.
 *
 * @return frame length.
 */
PV_API int pv_rhino_frame_length(void);

#ifdef __cplusplus
}
#endif

#endif // PV_RHINO_H
