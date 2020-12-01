/*
    Copyright 2018-2020 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

#include <alsa/asoundlib.h>
#include <dlfcn.h>
#include <stdio.h>

#include "pv_rhino.h"

int main(int argc, char *argv[]) {
    if (argc != 5) {
        fprintf(stderr, "usage : %s library_path model_path context_path input_audio_device\n", argv[0]);
        exit(1);
    }

    const char *library_path = argv[1];
    const char *model_path = argv[2];
    const char *context_path = argv[3];
    const char *input_audio_device = argv[4];

    void *rhino_library = dlopen(library_path, RTLD_NOW);
    if (!rhino_library) {
        fprintf(stderr, "failed to open Rhino's library");
        exit(1);
    }

    char *error = NULL;

    const char *(*pv_status_to_string_func)(pv_status_t) = dlsym(rhino_library, "pv_status_to_string");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_status_to_string' with '%s'.\n", error);
        exit(1);
    }

    int32_t (*pv_sample_rate_func)() = dlsym(rhino_library, "pv_sample_rate");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_sample_rate' with '%s'.\n", error);
        exit(1);
    }

    pv_status_t (*pv_rhino_init_func)(const char *, const char *, float, pv_rhino_t **) = NULL;
    pv_rhino_init_func = dlsym(rhino_library, "pv_rhino_init");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_rhino_init' with '%s'.\n", error);
        exit(1);
    }

    void (*pv_rhino_delete_func)(pv_rhino_t *) = NULL;
    pv_rhino_delete_func = dlsym(rhino_library, "pv_rhino_delete");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_rhino_delete' with '%s'.\n", error);
        exit(1);
    }

    pv_status_t (*pv_rhino_process_func)(pv_rhino_t *, const int16_t *, bool *) = NULL;
    pv_rhino_process_func = dlsym(rhino_library, "pv_rhino_process");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_rhino_process' with '%s'.\n", error);
        exit(1);
    }

    pv_status_t (*pv_rhino_is_understood_func)(const pv_rhino_t *, bool *) = NULL;
    pv_rhino_is_understood_func = dlsym(rhino_library, "pv_rhino_is_understood");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_rhino_is_understood' with '%s'.\n", error);
        exit(1);
    }

    pv_status_t (*pv_rhino_get_intent_func)(const pv_rhino_t *, const char **, int *, const char ***, const char ***) = NULL;
    pv_rhino_get_intent_func = dlsym(rhino_library, "pv_rhino_get_intent");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_rhino_get_intent' with '%s'.\n", error);
        exit(1);
    }

    pv_status_t (*pv_rhino_free_slots_and_values_func)(const pv_rhino_t *, const char **, const char **) = NULL;
    pv_rhino_free_slots_and_values_func = dlsym(rhino_library, "pv_rhino_free_slots_and_values");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_rhino_free_slots_and_values' with '%s'.\n", error);
        exit(1);
    }

    pv_status_t (*pv_rhino_reset_func)(pv_rhino_t *) = NULL;
    pv_rhino_reset_func = dlsym(rhino_library, "pv_rhino_reset");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_rhino_reset' with '%s'.\n", error);
        exit(1);
    }

    pv_status_t (*pv_rhino_context_info_func)(const pv_rhino_t *, const char **) = NULL;
    pv_rhino_context_info_func = dlsym(rhino_library, "pv_rhino_context_info");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_rhino_context_info' with '%s'.\n", error);
        exit(1);
    }

    int32_t (*pv_rhino_frame_length_func)() = NULL;
    pv_rhino_frame_length_func = dlsym(rhino_library, "pv_rhino_frame_length");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_rhino_frame_length' with '%s'.\n", error);
        exit(1);
    }

    pv_rhino_t *rhino = NULL;
    pv_status_t status = pv_rhino_init_func(model_path, context_path, 0.5f, &rhino);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "'pv_rhino_init' failed with '%s'\n", pv_status_to_string_func(status));
        exit(1);
    }

    snd_pcm_t *alsa_handle = NULL;
    int error_code = snd_pcm_open(&alsa_handle, input_audio_device, SND_PCM_STREAM_CAPTURE, 0);
    if (error_code != 0) {
        fprintf(stderr, "'snd_pcm_open' failed with '%s'\n", snd_strerror(error_code));
        exit(1);
    }

    snd_pcm_hw_params_t *hardware_params = NULL;
    error_code = snd_pcm_hw_params_malloc(&hardware_params);
    if (error_code != 0) {
        fprintf(stderr, "'snd_pcm_hw_params_malloc' failed with '%s'\n", snd_strerror(error_code));
        exit(1);
    }

    error_code = snd_pcm_hw_params_any(alsa_handle, hardware_params);
    if (error_code != 0) {
        fprintf(stderr, "'snd_pcm_hw_params_any' failed with '%s'\n", snd_strerror(error_code));
        exit(1);
    }

    error_code = snd_pcm_hw_params_set_access(alsa_handle, hardware_params, SND_PCM_ACCESS_RW_INTERLEAVED);
    if (error_code != 0) {
        fprintf(stderr, "'snd_pcm_hw_params_set_access' failed with '%s'\n", snd_strerror(error_code));
        exit(1);
    }

    error_code = snd_pcm_hw_params_set_format(alsa_handle, hardware_params, SND_PCM_FORMAT_S16_LE);
    if (error_code != 0) {
        fprintf(stderr, "'snd_pcm_hw_params_set_format' failed with '%s'\n", snd_strerror(error_code));
        exit(1);
    }

    error_code = snd_pcm_hw_params_set_rate(alsa_handle, hardware_params, pv_sample_rate_func(), 0);
    if (error_code != 0) {
        fprintf(stderr, "'snd_pcm_hw_params_set_rate' failed with '%s'\n", snd_strerror(error_code));
        exit(1);
    }

    error_code = snd_pcm_hw_params_set_channels(alsa_handle, hardware_params, 1);
    if (error_code != 0) {
        fprintf(stderr, "'snd_pcm_hw_params_set_channels' failed with '%s'\n", snd_strerror(error_code));
        exit(1);
    }

    error_code = snd_pcm_hw_params(alsa_handle, hardware_params);
    if (error_code != 0) {
        fprintf(stderr, "'snd_pcm_hw_params' failed with '%s'\n", snd_strerror(error_code));
        exit(1);
    }

    snd_pcm_hw_params_free(hardware_params);

    error_code = snd_pcm_prepare(alsa_handle);
    if (error_code != 0) {
        fprintf(stderr, "'snd_pcm_prepare' failed with '%s'\n", snd_strerror(error_code));
        exit(1);
    }

    const int32_t frame_length = pv_rhino_frame_length_func();

    int16_t *pcm = malloc(sizeof(int16_t) * frame_length);
    if (!pcm) {
        printf("failed to allocate memory for audio buffer\n");
        return 1;
    }

    const char *context_info = NULL;
    status = pv_rhino_context_info_func(rhino, &context_info);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "'pv_rhino_context_info' failed with '%s'\n", pv_status_to_string_func(status));
        exit(1);
    }
    fprintf(stdout, "%s\n\n", context_info);

    bool is_finalized = false;

    while (!is_finalized) {
        const int count = snd_pcm_readi(alsa_handle, pcm, frame_length);
        if (count < 0) {
            fprintf(stderr, "'snd_pcm_readi' failed with '%s'\n", snd_strerror(count));
            exit(1);
        } else if (count != frame_length) {
            fprintf(stderr, "read %d frames instead of %d\n", count, frame_length);
            exit(1);
        }

        status = pv_rhino_process_func(rhino, pcm, &is_finalized);
        if (status != PV_STATUS_SUCCESS) {
            fprintf(stderr, "'pv_rhino_process' failed with '%s'\n", pv_status_to_string_func(status));
            exit(1);
        }
    }

    bool is_understood = false;
    status = pv_rhino_is_understood_func(rhino, &is_understood);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "'pv_rhino_is_understood' failed with '%s'\n", pv_status_to_string_func(status));
        exit(1);
    }

    const char *intent = NULL;
    int32_t num_slots = 0;
    const char **slots = NULL;
    const char **values = NULL;

    if (is_understood) {
        status = pv_rhino_get_intent_func(rhino, &intent, &num_slots, &slots, &values);
        if (status != PV_STATUS_SUCCESS) {
            fprintf(stderr, "'pv_rhino_get_intent' failed with '%s'\n", pv_status_to_string_func(status));
            exit(1);
        }
    }

    fprintf(stdout, "{\n");
    fprintf(stdout, "    'is_understood' : '%s',\n", is_understood ? "true" : "false");
    if (is_understood) {
        fprintf(stdout, "    'intent' : '%s',\n", intent);
        if (num_slots > 0) {
            fprintf(stdout, "    'slots' : {\n");
            for (int32_t i = 0; i < num_slots; i++) {
                fprintf(stdout, "        '%s' : '%s',\n", slots[i], values[i]);
            }
            fprintf(stdout, "    }\n");
        }
    }
    fprintf(stdout, "}\n");

    if (is_understood) {
        status = pv_rhino_free_slots_and_values_func(rhino, slots, values);
        if (status != PV_STATUS_SUCCESS) {
            fprintf(stderr, "'pv_rhino_free_slots_and_values' failed with '%s'\n",
                    pv_status_to_string_func(status));
            exit(1);
        }
    }

    status = pv_rhino_reset_func(rhino);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "'pv_rhino_reset' failed with '%s'\n", pv_status_to_string_func(status));
        exit(1);
    }

    free(pcm);
    snd_pcm_close(alsa_handle);
    pv_rhino_delete_func(rhino);
    dlclose(rhino_library);

    return 0;
}
