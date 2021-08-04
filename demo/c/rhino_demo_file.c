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
#include <stdlib.h>
#include <sys/time.h>

#if defined(_WIN32) || defined(_WIN64)

#include <windows.h>

#endif

#include "pv_rhino.h"

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

int main(int argc, char *argv[]) {
    if (argc != 5) {
        fprintf(stderr, "usage : %s library_path model_path context_path wav_path\n", argv[0]);
        exit(1);
    }

    const char *library_path = argv[1];
    const char *model_path = argv[2];
    const char *context_path = argv[3];
    const char *wav_path = argv[4];

    void *rhino_library = open_dl(library_path);
    if (!rhino_library) {
        fprintf(stderr, "failed to open library.\n");
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

    pv_status_t (*pv_rhino_init_func)(const char *, const char *, float, pv_rhino_t **) =
            load_symbol(rhino_library, "pv_rhino_init");
    if (!pv_rhino_init_func) {
        print_dl_error("failed to load 'pv_rhino_init'");
        exit(1);
    }

    void (*pv_rhino_delete_func)(pv_rhino_t *) = load_symbol(rhino_library, "pv_rhino_delete");
    if (!pv_rhino_delete_func) {
        print_dl_error("failed to load 'pv_rhino_delete'");
        exit(1);
    }

    pv_status_t (*pv_rhino_process_func)(pv_rhino_t *, const int16_t *, bool *) =
            load_symbol(rhino_library, "pv_rhino_process");
    if (!pv_rhino_process_func) {
        print_dl_error("failed to load 'pv_rhino_process'");
        exit(1);
    }

    pv_status_t (*pv_rhino_is_understood_func)(const pv_rhino_t *, bool *) =
            load_symbol(rhino_library, "pv_rhino_is_understood");
    if (!pv_rhino_is_understood_func) {
        print_dl_error("failed to load 'pv_rhino_is_understood'");
        exit(1);
    }

    pv_status_t (*pv_rhino_get_intent_func)(const pv_rhino_t *, const char **, int32_t *, const char ***, const char ***) =
            load_symbol(rhino_library, "pv_rhino_get_intent");
    if (!pv_rhino_get_intent_func) {
        print_dl_error("failed to load 'pv_rhino_get_intent'");
        exit(1);
    }

    pv_status_t (*pv_rhino_free_slots_and_values_func)(const pv_rhino_t *, const char **, const char **) =
            load_symbol(rhino_library, "pv_rhino_free_slots_and_values");
    if (!pv_rhino_free_slots_and_values_func) {
        print_dl_error("failed to load 'pv_rhino_free_slots_and_values'");
        exit(1);
    }

    int32_t (*pv_rhino_frame_length_func)() = load_symbol(rhino_library, "pv_rhino_frame_length");
    if (!pv_rhino_frame_length_func) {
        print_dl_error("failed to load 'pv_rhino_frame_length'n");
        exit(1);
    }

    const char *(*pv_rhino_version_func)() = load_symbol(rhino_library, "pv_rhino_version");
    if (!pv_rhino_version_func) {
        print_dl_error("failed to load 'pv_rhino_version'");
        exit(1);
    }

    pv_rhino_t *rhino = NULL;
    pv_status_t status = pv_rhino_init_func(model_path, context_path, 0.5f, &rhino);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "'pv_rhino_init' failed with '%s'\n", pv_status_to_string_func(status));
        exit(1);
    }

    FILE *wav = fopen(wav_path, "rb");
    if (!wav) {
        fprintf(stderr, "failed to open wav file\n");
        exit(1);
    }

    if (fseek(wav, 44, SEEK_SET) != 0) {
        printf("failed to skip the wav header\n");
        exit(1);
    }

    const int32_t frame_length = pv_rhino_frame_length_func();

    int16_t *pcm = malloc(sizeof(int16_t) * frame_length);
    if (!pcm) {
        fprintf(stderr, "failed to allocate memory for audio buffer\n");
        exit(1);
    }

    double total_cpu_time_usec = 0;
    double total_processed_time_usec = 0;

    fprintf(stdout, "Picovoice Rhino Speech-to-Intent (%s) :\n\n", pv_rhino_version_func());

    while (fread(pcm, sizeof(int16_t), frame_length, wav) == (size_t) frame_length) {
        struct timeval before;
        gettimeofday(&before, NULL);

        bool is_finalized = false;
        status = pv_rhino_process_func(rhino, pcm, &is_finalized);
        if (status != PV_STATUS_SUCCESS) {
            fprintf(stderr, "'pv_rhino_process' failed with '%s'\n", pv_status_to_string_func(status));
            exit(1);
        }

        if (is_finalized) {
            bool is_understood = false;
            status = pv_rhino_is_understood_func(rhino, &is_understood);
            if (status != PV_STATUS_SUCCESS) {
                fprintf(stderr, "'pv_rhino_is_understood'failed with '%s'\n", pv_status_to_string_func(status));
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
            fprintf(stdout, "  'is_understood' : '%s',\n", is_understood ? "true" : "false");
            if (is_understood) {
                fprintf(stdout, "  'intent' : '%s'\n", intent);
                if (num_slots > 0) {
                    fprintf(stdout, "  'slots' : {\n");
                    for (int32_t i = 0; i < num_slots; i++) {
                        fprintf(stdout, "    '%s' : '%s',\n", slots[i], values[i]);
                    }
                    fprintf(stdout, "  }\n");
                }
            }
            fprintf(stdout, "}\n\n");

            if (is_understood) {
                status = pv_rhino_free_slots_and_values_func(rhino, slots, values);
                if (status != PV_STATUS_SUCCESS) {
                    fprintf(stderr, "'pv_rhino_free_slots_and_values' failed with '%s'\n", pv_status_to_string_func(status));
                    exit(1);
                }
            }

            break;
        }

        struct timeval after;
        gettimeofday(&after, NULL);

        total_cpu_time_usec +=
                (double) (after.tv_sec - before.tv_sec) * 1e6 + (double) (after.tv_usec - before.tv_usec);
        total_processed_time_usec += (frame_length * 1e6) / pv_sample_rate_func();
    }

    const double real_time_factor = total_cpu_time_usec / total_processed_time_usec;
    fprintf(stdout, "real time factor : %.3f\n", real_time_factor);

    free(pcm);
    fclose(wav);
    pv_rhino_delete_func(rhino);
    close_dl(rhino_library);

    return 0;
}
