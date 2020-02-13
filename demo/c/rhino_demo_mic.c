/*
    Copyright 2018 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

#include <alsa/asoundlib.h>
#include <dlfcn.h>
#include <signal.h>
#include <stdio.h>

#include "pv_porcupine.h"
#include "pv_rhino.h"

static volatile bool is_interrupted = false;

void interrupt_handler(int _) {
    (void) _;
    is_interrupted = true;
}

int main(int argc, char *argv[]) {
    if (argc != 8) {
        fprintf(stderr,
                "usage : %s rhino_library_path rhino_model_path rhino_context_path porcupine_library_path "
                "porcupine_model_path porcupine_keyword_path input_audio_device\n",
                argv[0]);
        exit(1);
    }

    signal(SIGINT, interrupt_handler);

    const char *rhino_library_path = argv[1];
    const char *rhino_model_path = argv[2];
    const char *rhino_context_path = argv[3];
    const char *porcupine_library_path = argv[4];
    const char *porcupine_model_path = argv[5];
    const char *porcupine_keyword_path = argv[6];
    const char *input_audio_device = argv[7];

    void *rhino_library = dlopen(rhino_library_path, RTLD_NOW);
    if (!rhino_library) {
        fprintf(stderr, "failed to open Rhino's library");
        exit(1);
    }

    char *error;

    const char *(*pv_status_to_string)(pv_status_t) = dlsym(rhino_library, "pv_status_to_string");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_status_to_string' with '%s'.\n", error);
        exit(1);
    }

    int32_t (*pv_sample_rate)() = dlsym(rhino_library, "pv_sample_rate");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_sample_rate' with '%s'.\n", error);
        exit(1);
    }

    pv_status_t (*pv_rhino_init)(const char *, const char *, float, pv_rhino_t **);
    pv_rhino_init = dlsym(rhino_library, "pv_rhino_init");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_rhino_init' with '%s'.\n", error);
        exit(1);
    }

    void (*pv_rhino_delete)(pv_rhino_t *);
    pv_rhino_delete = dlsym(rhino_library, "pv_rhino_delete");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_rhino_delete' with '%s'.\n", error);
        exit(1);
    }

    pv_status_t (*pv_rhino_process)(pv_rhino_t *, const int16_t *, bool *);
    pv_rhino_process = dlsym(rhino_library, "pv_rhino_process");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_rhino_process' with '%s'.\n", error);
        exit(1);
    }

    pv_status_t (*pv_rhino_is_understood)(const pv_rhino_t *, bool *);
    pv_rhino_is_understood = dlsym(rhino_library, "pv_rhino_is_understood");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_rhino_is_understood' with '%s'.\n", error);
        exit(1);
    }

    pv_status_t (*pv_rhino_get_intent)(const pv_rhino_t *, const char **, int *, const char ***, const char ***);
    pv_rhino_get_intent = dlsym(rhino_library, "pv_rhino_get_intent");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_rhino_get_intent' with '%s'.\n", error);
        exit(1);
    }

    pv_status_t (*pv_rhino_free_slots_and_values)(const pv_rhino_t *, const char **, const char **);
    pv_rhino_free_slots_and_values = dlsym(rhino_library, "pv_rhino_free_slots_and_values");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_rhino_free_slots_and_values' with '%s'.\n", error);
        exit(1);
    }

    pv_status_t (*pv_rhino_reset)(pv_rhino_t *);
    pv_rhino_reset = dlsym(rhino_library, "pv_rhino_reset");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_rhino_reset' with '%s'.\n", error);
        exit(1);
    }

    pv_status_t (*pv_rhino_context_info)(const pv_rhino_t *, const char **);
    pv_rhino_context_info = dlsym(rhino_library, "pv_rhino_context_info");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_rhino_context_info' with '%s'.\n", error);
        exit(1);
    }

    int32_t (*pv_rhino_frame_length)();
    pv_rhino_frame_length = dlsym(rhino_library, "pv_rhino_frame_length");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_rhino_frame_length' with '%s'.\n", error);
        exit(1);
    }

    void *porcupine_library = dlopen(porcupine_library_path, RTLD_NOW);
    if (!porcupine_library) {
        fprintf(stderr, "failed to open Porcupine's library.\n");
        exit(1);
    }

    pv_status_t (*pv_porcupine_init)(const char *, int32_t, const char *const *, const float *, pv_porcupine_t **) =
    dlsym(porcupine_library, "pv_porcupine_init");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_porcupine_init' with '%s'.\n", error);
        exit(1);
    }

    void (*pv_porcupine_delete)(pv_porcupine_t *) = dlsym(porcupine_library, "pv_porcupine_delete");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_porcupine_delete' with '%s'.\n", error);
        exit(1);
    }

    pv_status_t (*pv_porcupine_process)(pv_porcupine_t *, const int16_t *, int32_t *) =
    dlsym(porcupine_library, "pv_porcupine_process");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_porcupine_process' with '%s'.\n", error);
        exit(1);
    }

    int32_t (*pv_porcupine_frame_length)() = dlsym(porcupine_library, "pv_porcupine_frame_length");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_porcupine_frame_length' with '%s'.\n", error);
        exit(1);
    }

    pv_rhino_t *rhino;
    pv_status_t status = pv_rhino_init(rhino_model_path, rhino_context_path, 0.5f, &rhino);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "'pv_rhino_init' failed with '%s'\n", pv_status_to_string(status));
        exit(1);
    }

    pv_porcupine_t *porcupine;
    const float sensitivity = 0.5f;
    status = pv_porcupine_init(porcupine_model_path, 1, &porcupine_keyword_path, &sensitivity, &porcupine);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "'pv_porcupine_init' failed with '%s'\n", pv_status_to_string(status));
        exit(1);
    }

    snd_pcm_t *alsa_handle;
    int error_code = snd_pcm_open(&alsa_handle, input_audio_device, SND_PCM_STREAM_CAPTURE, 0);
    if (error_code != 0) {
        fprintf(stderr, "'snd_pcm_open' failed with '%s'\n", snd_strerror(error_code));
        exit(1);
    }

    snd_pcm_hw_params_t *hardware_params;
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

    error_code = snd_pcm_hw_params_set_rate(alsa_handle, hardware_params, pv_sample_rate(), 0);
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

    const int32_t frame_length = pv_rhino_frame_length();
    if (pv_rhino_frame_length() != pv_porcupine_frame_length()) {
        exit(1);
    }

    int16_t *pcm = malloc(sizeof(int16_t) * frame_length);
    if (!pcm) {
        printf("failed to allocate memory for audio buffer\n");
        return 1;
    }

    const char *context_info;
    status = pv_rhino_context_info(rhino, &context_info);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "'pv_rhino_context_info' failed with '%s'\n", pv_status_to_string(status));
        exit(1);
    }
    fprintf(stdout, "%s\n\n", context_info);

    bool is_wake_word_detected = false;

    while (!is_interrupted) {
        const int count = snd_pcm_readi(alsa_handle, pcm, frame_length);
        if (count < 0) {
            fprintf(stderr, "'snd_pcm_readi' failed with '%s'\n", snd_strerror(count));
            exit(1);
        } else if (count != frame_length) {
            fprintf(stderr, "read %d frames instead of %d\n", count, frame_length);
            exit(1);
        }

        if (!is_wake_word_detected) {
            int32_t keyword_index;
            status = pv_porcupine_process(porcupine, pcm, &keyword_index);
            if (status != PV_STATUS_SUCCESS) {
                fprintf(stderr, "'pv_porcupine_process' failed with '%s'\n", pv_status_to_string(status));
                exit(1);
            }
            if (keyword_index != -1) {
                fprintf(stdout, "detected wake word\n");
                is_wake_word_detected = true;
            }
        } else {
            bool is_finalized;
            status = pv_rhino_process(rhino, pcm, &is_finalized);
            if (status != PV_STATUS_SUCCESS) {
                fprintf(stderr, "'pv_rhino_process' failed with '%s'\n", pv_status_to_string(status));
                exit(1);
            }
            if (is_finalized) {
                bool is_understood;
                status = pv_rhino_is_understood(rhino, &is_understood);
                if (status != PV_STATUS_SUCCESS) {
                    fprintf(stderr, "'pv_rhino_is_understood' failed with '%s'\n", pv_status_to_string(status));
                    exit(1);
                }

                if (is_understood) {
                    const char *intent;
                    int32_t num_slots;
                    const char **slots;
                    const char **values;
                    status = pv_rhino_get_intent(rhino, &intent, &num_slots, &slots, &values);
                    if (status != PV_STATUS_SUCCESS) {
                        fprintf(stderr, "'pv_rhino_get_intent' failed with '%s'\n", pv_status_to_string(status));
                        exit(1);
                    }

                    fprintf(stdout, "intent : %s\n", intent);
                    for (int32_t i = 0; i < num_slots; i++) {
                        fprintf(stdout, "%s : %s\n", slots[i], values[i]);
                    }
                    fprintf(stdout, "\n\n");

                    status = pv_rhino_free_slots_and_values(rhino, slots, values);
                    if (status != PV_STATUS_SUCCESS) {
                        fprintf(stderr, "'pv_rhino_free_slots_and_values' failed with '%s'\n",
                                pv_status_to_string(status));
                        exit(1);
                    }
                } else {
                    fprintf(stdout, "couldn't infer the intent\n");
                }

                status = pv_rhino_reset(rhino);
                if (status != PV_STATUS_SUCCESS) {
                    fprintf(stderr, "'pv_rhino_reset' failed with '%s'\n", pv_status_to_string(status));
                    exit(1);
                }
                is_wake_word_detected = false;
            }
        }
    }

    free(pcm);
    snd_pcm_close(alsa_handle);
    pv_porcupine_delete(porcupine);
    pv_rhino_delete(rhino);
    dlclose(porcupine_library);
    dlclose(rhino_library);

    return 0;
}
