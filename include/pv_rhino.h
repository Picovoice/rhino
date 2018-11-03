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
 * Forward declaration for Speech to Intent object (a.k.a Rhino). The object translates speech (commands) in a given
 * context into structured data (intent). It processes incoming audio in consecutive frames (chunks). The number of
 * samples per frame can be attained by calling 'pv_rhino_frame_length()'. The incoming audio needs to have a sample
 * rate equal to 'pv_sample_rate()' and be 16-bit linearly-encoded. Furthermore, Rhino operates on single channel audio.
 */
typedef struct pv_rhino_object pv_rhino_object_t;

#ifdef PV_RHINO_BARE_MACHINE
PV_API pv_status_t pv_rhino_init(const void *context, pv_rhino_object_t **object);
#else
/**
 * Constructor.
 *
 * @param model_file_path Absolute path to file containing model parameters.
 * @param context_file_path Absolute path to file containing context parameters.
 * @param object Constructed Speech to Intent object.
 * @return Status code. Returns 'PV_STATUS_OUT_OF_MEMORY', 'PV_STATUS_IO_ERROR', or 'PV_STATUS_INVALID_ARGUMENT' on
 * failure.
 */
PV_API pv_status_t pv_rhino_init(
        const char *model_file_path,
        const char *context_file_path,
        pv_rhino_object_t **object);
#endif

/**
 * Destructor.
 *
 * @param object Speech to Intent object.
 */
PV_API void pv_rhino_delete(pv_rhino_object_t *object);

/**
 * Processes a frame of audio and returns a flag weather it has finalized intent extraction.
 *
 * @param object Speech to Intent object.
 * @param pcm A frame of audio samples. The number of samples per frame can be attained by calling
 * 'pv_rhino_frame_length()'. The incoming audio needs to have a sample rate equal to 'pv_sample_rate()' and be 16-bit
 * linearly-encoded. Furthermore, Rhino operates on single channel audio.
 * @param is_finalized Flag indicating whether the engine has finalized intent extraction.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT' on failure.
 */
PV_API pv_status_t pv_rhino_process(pv_rhino_object_t *object, const int16_t *pcm, bool *is_finalized);

/**
 * Indicates weather the engine understood the intent within speech command.
 *
 * @param object Speech to Intent object.
 * @param is_understood Flag indicating weather the engine understood the intent within the speech.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT' on failure.
 */
PV_API pv_status_t pv_rhino_is_understood(const pv_rhino_object_t *object, bool *is_understood);

/**
 * Retrieves the intent attributes after the engine has finalized the extraction and only if the command is understood.
 * i.e. this should be called only after 'is_finalized' returned by 'pv_rhino_process' is set to true and then
 * 'is_understood' returned by 'pv_rhino_is_understood' is set to true.
 *
 * @param object Speech to Intent object.
 * @param num_attributes Number of extracts attributes within speech command.
 * @param attributes Attribute values.
 * @return Status code. Returns 'PV_STATUS_OUT_OF_MEMORY', or 'PV_STATUS_INVALID_ARGUMENT' on failure.
 */
PV_API pv_status_t pv_rhino_get_attributes(const pv_rhino_object_t *object, int *num_attributes, const char ***attributes);

/**
 * Retrieves the number of intent attributes after the engine has finalized the extraction and only if the command is
 * understood. i.e. this should be called only after 'is_finalized' returned by 'pv_rhino_process' is set to true and
 * then 'is_understood' returned by 'pv_rhino_is_understood' is set to true.
 *
 * @param object Speech to Intent object.
 * @param num_attributes Number of inferred attributes.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT' on failure.
 */
PV_API pv_status_t pv_rhino_get_num_attributes(const pv_rhino_object_t *object, int *num_attributes);

/**
 * Retrieves the a given attribute's value after the engine has finalized the extraction and only if the command is
 * understood. i.e. this should be called only after 'is_finalized' returned by 'pv_rhino_process' is set to true and
 * then 'is_understood' returned by 'pv_rhino_is_understood' is set to true.
 *
 * @param object Speech to Intent object.
 * @param attribute_index The index of attribute.
 * @param attribute Attribute value.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT' on failure.
 */
PV_API pv_status_t pv_rhino_get_attribute(const pv_rhino_object_t *object, int attribute_index, const char **attribute);

/**
 * Retrieves the a given attribute's value after the engine has finalized the extraction and only if the command is
 * understood. i.e. this should be called only after 'is_finalized' returned by 'pv_rhino_process' is set to true and
 * then 'is_understood' returned by 'pv_rhino_is_understood' is set to true.
 *
 * @param object Speech to Intent object.
 * @param attribute Attribute.
 * @param value Returned attribute value.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT' on failure.
 */
PV_API pv_status_t pv_rhino_get_attribute_value(const pv_rhino_object_t *object, const char *attribute, const char **value);

/**
 * Resets the internal state of the Speech to Intent engine.
 *
 * @param object Speech to Intent object.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT' on failure.
 */
PV_API pv_status_t pv_rhino_reset(pv_rhino_object_t *object);

/**
 * Getter of attributes within a context. The caller is responsible for freeing the returned array of attributes.
 *
 * @param object Speech to Intent object.
 * @param num_attributes Number of attributes within current context.
 * @param attributes Context attributes.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT' or 'PV_STATUS_OUT_OF_MEMORY' on failure.
 */
PV_API pv_status_t pv_rhino_get_context_attributes(
        const pv_rhino_object_t *object,
        int *num_attributes,
        const char ***attributes);

/**
 * Getter for different values of a given attribute. The caller is responsible for freeing the returned array of values.
 *
 * @param object Speech to Intent object.
 * @param attribute A given attribute within current context.
 * @param num_values Number of possible values for the given attribute in current context.
 * @param values Possible values for given attribute in current context.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT' or 'PV_STATUS_OUT_OF_MEMORY' on failure.
 */
PV_API pv_status_t pv_rhino_get_attribute_values(
        const pv_rhino_object_t *object,
        const char *attribute,
        int *num_values,
        const char ***values);

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
