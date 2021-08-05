/*
    Copyright 2018-2021 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

#if !defined(_WIN32) && !defined(_WIN64)

#include <dlfcn.h>

#endif

#include <stdio.h>

#if defined(_WIN32) && defined(_WIN64)

#include <windows.h>

#endif

#pragma GCC diagnostic push

#pragma GCC diagnostic ignored "-Wunused-result"

#define MINIAUDIO_IMPLEMENTATION

#include "miniaudio/miniaudio.h"

#pragma GCC diagnostic pop

#include "pv_rhino.h"

typedef struct {
    int16_t *buffer;
    int32_t max_size;
    int32_t filled;
} frame_buffer_t;

typedef struct {
    frame_buffer_t frame_buffer;
    const char *(*pv_status_to_string_func)(pv_status_t);
    pv_status_t (*pv_rhino_process_func)(pv_rhino_t *, const int16_t *, bool *);
    pv_status_t (*pv_rhino_is_understood_func)(const pv_rhino_t *, bool *);
    pv_status_t (*pv_rhino_get_intent_func)(const pv_rhino_t *, const char **, int *, const char ***, const char ***);
    pv_status_t (*pv_rhino_free_slots_and_values_func)(const pv_rhino_t *, const char **, const char **);
    pv_status_t (*pv_rhino_reset_func)(pv_rhino_t *);
    pv_rhino_t *rhino;
} pv_rhino_data_t;

static volatile bool is_done = false;

static void *open_dl(const char *dl_path) {

#if defined(_WIN32) || defined(_WIN64)

    return LoadLibrary(dl_path);

#else

    return dlopen(dl_path, RTLD_NOW);

#endif

}

static void *load_symbol(void *handle, const char *symbol) {

#if defined(_WIN32) || defined(_WIN64)

    return GetProcAddress((HMODULE) handle, symbol);

#else

    return dlsym(handle, symbol);

#endif

}

static void close_dl(void *handle) {

#if defined(_WIN32) || defined(_WIN64)

    FreeLibrary((HMODULE) handle);

#else

    dlclose(handle);

#endif

}

static void print_dl_error(const char *message) {

#if defined(_WIN32) || defined(_WIN64)

    fprintf(stderr, "%s with code '%lu'.\n", message, GetLastError());

#else

    fprintf(stderr, "%s with '%s'.\n", message, dlerror());

#endif

}

static void print_usage(const char *program) {
    fprintf(stderr, "usage : %s library_path model_path context_path audio_device_index\n"
                    "        %s --show_audio_devices\n", program, program);
}

static void rhino_process_callback(const pv_rhino_data_t *pv_rhino_data, const int16_t *pcm) {
    bool is_finalized = false;

    pv_status_t status = pv_rhino_data->pv_rhino_process_func(
            pv_rhino_data->rhino,
            pcm,
            &is_finalized);

    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "'pv_rhino_process' failed with '%s'\n", pv_rhino_data->pv_status_to_string_func(status));
        exit(1);
    }

    if (!is_finalized) {
        return;
    }

    bool is_understood = false;
    status = pv_rhino_data->pv_rhino_is_understood_func(pv_rhino_data->rhino, &is_understood);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "'pv_rhino_is_understood' failed with '%s'\n",
                pv_rhino_data->pv_status_to_string_func(status));
        exit(1);
    }

    const char *intent = NULL;
    int32_t num_slots = 0;
    const char **slots = NULL;
    const char **values = NULL;

    if (is_understood) {
        status = pv_rhino_data->pv_rhino_get_intent_func(pv_rhino_data->rhino, &intent, &num_slots, &slots, &values);
        if (status != PV_STATUS_SUCCESS) {
            fprintf(stderr, "'pv_rhino_get_intent' failed with '%s'\n",
                    pv_rhino_data->pv_status_to_string_func(status));
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
    fflush(stdout);

    if (is_understood) {
        status = pv_rhino_data->pv_rhino_free_slots_and_values_func(pv_rhino_data->rhino, slots, values);
        if (status != PV_STATUS_SUCCESS) {
            fprintf(stderr, "'pv_rhino_free_slots_and_values' failed with '%s'\n",
                    pv_rhino_data->pv_status_to_string_func(status));
            exit(1);
        }
    }

    status = pv_rhino_data->pv_rhino_reset_func(pv_rhino_data->rhino);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "'pv_rhino_reset' failed with '%s'\n",
                pv_rhino_data->pv_status_to_string_func(status));
        exit(1);
    }

    is_done = true;
}

static void mic_callback(ma_device *device, void *output, const void *input, ma_uint32 frame_count) {
    (void) output;

    pv_rhino_data_t *pv_rhino_data = (pv_rhino_data_t *) device->pUserData;

    frame_buffer_t *frame_buffer = &pv_rhino_data->frame_buffer;

    int16_t *buffer_ptr = &frame_buffer->buffer[frame_buffer->filled];
    int16_t *input_ptr = (int16_t *) input;

    int32_t processed_frames = 0;

    while (processed_frames < frame_count) {
        const int32_t remaining_frames = (int32_t) frame_count - processed_frames;
        const int32_t available_frames = frame_buffer->max_size - frame_buffer->filled;

        if (available_frames > 0) {
            const int32_t frames_to_read = (remaining_frames < available_frames) ? remaining_frames : available_frames;

            memcpy(buffer_ptr, input_ptr, frames_to_read * sizeof(int16_t));
            buffer_ptr += frames_to_read;
            input_ptr += frames_to_read;

            processed_frames += frames_to_read;
            frame_buffer->filled += frames_to_read;
        } else {
            rhino_process_callback(pv_rhino_data, frame_buffer->buffer);

            buffer_ptr = frame_buffer->buffer;
            frame_buffer->filled = 0;
        }
    }
}

int main(int argc, char *argv[]) {
    if (argc != 2 && argc != 5) {
        print_usage(argv[0]);
        exit(1);
    }

    ma_context context;
    ma_result result;

    result = ma_context_init(NULL, 0, NULL, &context);
    if (result != MA_SUCCESS) {
        fprintf(stderr, "failed to initialize the input audio device list.\n");
        exit(1);
    }

    ma_device_info *capture_info;
    ma_uint32 capture_count;

    result = ma_context_get_devices(&context, NULL, NULL, &capture_info, &capture_count);
    if (result != MA_SUCCESS) {
        fprintf(stderr, "failed to get the available input devices.\n");
        exit(1);
    }

    if (argc == 2) {
        if (strcmp(argv[1], "--show_audio_devices") == 0) {
            for (ma_uint32 device = 0; device < capture_count; device++) {
                fprintf(stdout, "index: %d, name: %s\n", device, capture_info[device].name);
            }
            return 0;
        } else {
            print_usage(argv[0]);
            exit(1);
        }
    }

    const char *library_path = argv[1];
    const char *model_path = argv[2];
    const char *context_path = argv[3];
    const int32_t device_index = strtol(argv[4], NULL, 10);

    if (device_index >= capture_count) {
        fprintf(stderr, "no device available given audio device index.\n");
        exit(1);
    }

    void *rhino_library = open_dl(library_path);
    if (!rhino_library) {
        fprintf(stderr, "failed to open Rhino's library");
        exit(1);
    }

    const char *(*pv_status_to_string_func)(pv_status_t) = load_symbol(rhino_library, "pv_status_to_string");
    if (!pv_status_to_string_func) {
        print_dl_error("failed to load 'pv_status_to_string'");
        exit(1);
    }

    int32_t (*pv_sample_rate_func)() = load_symbol(rhino_library, "pv_sample_rate");
    if (!pv_sample_rate_func) {
        print_dl_error("failed to load 'pv_sample_rate'");
        exit(1);
    }

    pv_status_t (*pv_rhino_init_func)(const char *, const char *, float, pv_rhino_t **) = NULL;
    pv_rhino_init_func = load_symbol(rhino_library, "pv_rhino_init");
    if (!pv_rhino_init_func) {
        print_dl_error("failed to load 'pv_rhino_init'");
        exit(1);
    }

    void (*pv_rhino_delete_func)(pv_rhino_t *) = NULL;
    pv_rhino_delete_func = load_symbol(rhino_library, "pv_rhino_delete");
    if (!pv_rhino_delete_func) {
        print_dl_error("failed to load 'pv_rhino_delete'");
        exit(1);
    }

    pv_status_t (*pv_rhino_process_func)(pv_rhino_t *, const int16_t *, bool *) = NULL;
    pv_rhino_process_func = load_symbol(rhino_library, "pv_rhino_process");
    if (!pv_rhino_process_func) {
        print_dl_error("failed to load 'pv_rhino_process'");
        exit(1);
    }

    pv_status_t (*pv_rhino_is_understood_func)(const pv_rhino_t *, bool *) = NULL;
    pv_rhino_is_understood_func = load_symbol(rhino_library, "pv_rhino_is_understood");
    if (!pv_rhino_is_understood_func) {
        print_dl_error("failed to load 'pv_rhino_is_understood'");
        exit(1);
    }

    pv_status_t
    (*pv_rhino_get_intent_func)(const pv_rhino_t *, const char **, int *, const char ***, const char ***) = NULL;
    pv_rhino_get_intent_func = load_symbol(rhino_library, "pv_rhino_get_intent");
    if (!pv_rhino_get_intent_func) {
        print_dl_error("failed to load 'pv_rhino_get_intent'");
        exit(1);
    }

    pv_status_t (*pv_rhino_free_slots_and_values_func)(const pv_rhino_t *, const char **, const char **) = NULL;
    pv_rhino_free_slots_and_values_func = load_symbol(rhino_library, "pv_rhino_free_slots_and_values");
    if (!pv_rhino_free_slots_and_values_func) {
        print_dl_error("failed to load 'pv_rhino_free_slots_and_values'");
        exit(1);
    }

    pv_status_t (*pv_rhino_reset_func)(pv_rhino_t *) = NULL;
    pv_rhino_reset_func = load_symbol(rhino_library, "pv_rhino_reset");
    if (!pv_rhino_reset_func) {
        print_dl_error("failed to load 'pv_rhino_reset'");
        exit(1);
    }

    pv_status_t (*pv_rhino_context_info_func)(const pv_rhino_t *, const char **) = NULL;
    pv_rhino_context_info_func = load_symbol(rhino_library, "pv_rhino_context_info");
    if (!pv_rhino_context_info_func) {
        print_dl_error("failed to load 'pv_rhino_context_info'");
        exit(1);
    }

    int32_t (*pv_rhino_frame_length_func)() = NULL;
    pv_rhino_frame_length_func = load_symbol(rhino_library, "pv_rhino_frame_length");
    if (!pv_rhino_frame_length_func) {
        print_dl_error("failed to load 'pv_rhino_frame_length'");
        exit(1);
    }

    pv_rhino_t *rhino = NULL;
    pv_status_t status = pv_rhino_init_func(model_path, context_path, 0.5f, &rhino);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "'pv_rhino_init' failed with '%s'\n", pv_status_to_string_func(status));
        exit(1);
    }

    const int32_t frame_length = pv_rhino_frame_length_func();

    pv_rhino_data_t pv_rhino_data;
    pv_rhino_data.frame_buffer.buffer = malloc(frame_length * sizeof(int16_t));
    if (!pv_rhino_data.frame_buffer.buffer) {
        fprintf(stderr, "failed to allocate memory using 'malloc'\n");
        exit(1);
    }

    pv_rhino_data.frame_buffer.max_size = frame_length;
    pv_rhino_data.frame_buffer.filled = 0;

    pv_rhino_data.pv_status_to_string_func = pv_status_to_string_func;
    pv_rhino_data.pv_rhino_process_func = pv_rhino_process_func;
    pv_rhino_data.pv_rhino_is_understood_func = pv_rhino_is_understood_func;
    pv_rhino_data.pv_rhino_get_intent_func = pv_rhino_get_intent_func;
    pv_rhino_data.pv_rhino_free_slots_and_values_func = pv_rhino_free_slots_and_values_func;
    pv_rhino_data.pv_rhino_reset_func = pv_rhino_reset_func;
    pv_rhino_data.rhino = rhino;

    ma_device_config device_config;
    ma_device device;

    device_config = ma_device_config_init(ma_device_type_capture);
    device_config.capture.format = ma_format_s16;
    device_config.capture.pDeviceID = &capture_info[device_index].id;
    device_config.capture.channels = 1;
    device_config.sampleRate = pv_sample_rate_func();
    device_config.dataCallback = mic_callback;
    device_config.pUserData = &pv_rhino_data;

    result = ma_device_init(&context, &device_config, &device);
    if (result != MA_SUCCESS) {
        fprintf(stderr, "failed to initialize capture device.\n");
        exit(1);
    }

    result = ma_device_start(&device);
    if (result != MA_SUCCESS) {
        fprintf(stderr, "failed to start device.\n");
        exit(1);
    }

    fprintf(stdout, "Using device: %s\n", device.capture.name);
    fflush(stdout);

    const char *context_info = NULL;
    status = pv_rhino_context_info_func(rhino, &context_info);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "'pv_rhino_context_info' failed with '%s'\n", pv_status_to_string_func(status));
        exit(1);
    }
    fprintf(stdout, "%s\n\n", context_info);
    fflush(stdout);

    while (!is_done);

    ma_device_uninit(&device);
    ma_context_uninit(&context);

    free(pv_rhino_data.frame_buffer.buffer);
    pv_rhino_delete_func(rhino);

    close_dl(rhino_library);

    return 0;
}
