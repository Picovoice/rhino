/*
    Copyright 2018-2023 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

#ifndef PV_RHINO_H
#define PV_RHINO_H

#include <stdbool.h>
#include <stdint.h>

#include "picovoice.h"

#ifdef __cplusplus

extern "C" {

#endif

/**
 * Forward declaration for Rhino Speech-to-Intent engine. It directly infers the user's intent from spoken commands
 * in real-time. Rhino processes incoming audio in consecutive frames and indicates if the inference is finalized. When
 * finalized, the inferred intent can be retrieved as structured data in the form of an intent string and pairs of slots
 * and values. The number of samples per frame can be attained by calling 'pv_rhino_frame_length()'. The incoming audio
 * needs to have a sample rate equal to 'pv_sample_rate()' and be 16-bit linearly-encoded. Rhino operates on
 * single-channel audio.
 */
typedef struct pv_rhino pv_rhino_t;

/**
 * Constructor.
 *
 * @param access_key AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
 * @param model_path Absolute path to file containing model parameters.
 * @param context_path Absolute path to file containing context parameters. A context represents the set of
 * expressions (spoken commands), intents, and intent arguments (slots) within a domain of interest.
 * @param sensitivity Inference sensitivity. It should be a number within [0, 1]. A higher sensitivity value results in
 * fewer misses at the cost of (potentially) increasing the erroneous inference rate.
 * @param endpoint_duration_sec Endpoint duration in seconds. An endpoint is a chunk of silence at the end of an
 * utterance that marks the end of spoken command. It should be a positive number within [0.5, 5]. A lower endpoint
 * duration reduces delay and improves responsiveness. A higher endpoint duration assures Rhino doesn't return inference
 * pre-emptively in case the user pauses before finishing the request.
 * @param require_endpoint If set to `true`, Rhino requires an endpoint (a chunk of silence) after the spoken command.
 * If set to `false`, Rhino tries to detect silence, but if it cannot, it still will provide inference regardless. Set
 * to `false` only if operating in an environment with overlapping speech (e.g. people talking in the background).
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT', 'PV_STATUS_IO_ERROR', or 'PV_STATUS_OUT_OF_MEMORY' on
 * failure.
 */
PV_API pv_status_t pv_rhino_init(
        const char *access_key,
        const char *model_path,
        const char *context_path,
        float sensitivity,
        float endpoint_duration_sec,
        bool require_endpoint,
        pv_rhino_t **object);

/**
 * Destructor.
 *
 * @param object Speech-to-Intent object.
 */
PV_API void pv_rhino_delete(pv_rhino_t *object);

/**
 * Processes a frame of audio and emits a flag indicating if the inference is finalized. When finalized,
 * 'pv_rhino_is_understood()' should be called to check if the spoken command is considered valid.
 *
 * @param object Speech-to-Intent object.
 * @param pcm A frame of audio samples. The number of samples per frame can be attained by calling
 * 'pv_rhino_frame_length()'. The incoming audio needs to have a sample rate equal to 'pv_sample_rate()' and be 16-bit
 * linearly-encoded. Rhino operates on single-channel audio.
 * @param[out] is_finalized Flag indicating if the inference is finalized.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT' or 'PV_STATUS_OUT_OF_MEMORY' on failure.
 */
PV_API pv_status_t pv_rhino_process(pv_rhino_t *object, const int16_t *pcm, bool *is_finalized);

/**
 * Indicates if the spoken command is valid, is within the domain of interest (context), and the engine understood it.
 * Upon success 'pv_rhino_get_intent()' may be called to retrieve inferred intent. If not understood, 'pv_rhino_reset()'
 * should be called.
 *
 * @param object Speech-to-Intent object.
 * @param[out] is_understood Flag indicating if the spoken command is understood.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT' on failure.
 */
PV_API pv_status_t pv_rhino_is_understood(const pv_rhino_t *object, bool *is_understood);

/**
 * Getter for the intent. The intent is stored as an intent string and pairs of slots and values. It should be called
 * only after intent inference is finalized and it is verified that the spoken command is understood via calling
 * 'pv_rhino_is_understood()'.
 *
 * @param object Speech-to-Intent object.
 * @param[out] intent Inferred intent.
 * @param[out] num_slots Number of slots.
 * @param[out] slots Array of inferred slots. Its memory needs to be freed by calling 'pv_rhino_free_slots_and_values()'.
 * @param[out] values Array of inferred slot values. Its memory needs to be freed by calling
 * 'pv_rhino_free_slots_and_values()'.
 * @return State code. Returns 'PV_STATUS_INVALID_ARGUMENT', 'PV_STATUS_INVALID_STATE', or 'PV_STATUS_OUT_OF_MEMORY' on
 * failure.
 */
PV_API pv_status_t pv_rhino_get_intent(
        const pv_rhino_t *object,
        const char **intent,
        int32_t *num_slots,
        const char ***slots,
        const char ***values);

/**
 * Frees memory resources allocated to slots and values after calling 'pv_rhino_get_intent()'. One shouldn't free these
 * resources via standard C library 'free()'.
 *
 * @param object Speech-to-Intent object.
 * @param slots Slots.
 * @param values Slot values.
 *
 * @return Returns 'PV_STATUS_INVALID_ARGUMENT' on failure.
 */
PV_API pv_status_t pv_rhino_free_slots_and_values(const pv_rhino_t *object, const char **slots, const char **values);

/**
 * Resets the internal state of the engine. It should be called before the engine can be used to infer intent from a new
 * stream of audio.
 *
 * @param object Speech-to-Intent object.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT' on failure.
 */
PV_API pv_status_t pv_rhino_reset(pv_rhino_t *object);

/**
 * Getter for context information.
 *
 * @param object Speech-to-Intent object.
 * @param[out] context_info Context information.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT' on failure.
 */
PV_API pv_status_t pv_rhino_context_info(const pv_rhino_t *object, const char **context_info);

/**
 * Getter for version.
 *
 * @return Version.
 */
PV_API const char *pv_rhino_version(void);

/**
 * Getter for number of audio samples per frame.
 *
 * @return Frame length.
 */
PV_API int32_t pv_rhino_frame_length(void);

#ifdef __cplusplus
}

#endif

#endif // PV_RHINO_H
