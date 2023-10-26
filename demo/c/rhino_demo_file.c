/*
    Copyright 2018-2023 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

#include <getopt.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/time.h>

#if defined(_WIN32) || defined(_WIN64)

#include <windows.h>

#define UTF8_COMPOSITION_FLAG (0)
#define NULL_TERMINATED       (-1)

#else

#include <dlfcn.h>

#endif

#define DR_WAV_IMPLEMENTATION

#include "dr_wav.h"

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

static struct option long_options[] = {
        {"access_key",                required_argument, NULL, 'a'},
        {"library_path",              required_argument, NULL, 'l'},
        {"model_path",                required_argument, NULL, 'm'},
        {"context_path",              required_argument, NULL, 'c'},
        {"wav_path",                  required_argument, NULL, 'w'},
        {"sensitivity",               required_argument, NULL, 't'},
        {"endpoint_duration_sec",     required_argument, NULL, 'u'},
        {"require_endpoint",          required_argument, NULL, 'e'},
        {"performance_threshold_sec", optional_argument, NULL, 'p'}
};

void print_usage(const char *program_name) {
    fprintf(
            stderr,
            "Usage : %s -a ACCESS_KEY -l LIBRARY_PATH -m MODEL_PATH -c CONTEXT_PATH -w WAV_PATH [-t SENSITIVITY] "
            "[-u, --endpoint_duration_sec] [-e, --require_endpoint (true,false)]\n",
            program_name);
}

void print_error_message(char **message_stack, int32_t message_stack_depth) {
    for (int32_t i = 0; i < message_stack_depth; i++) {
        fprintf(stderr, "  [%d] %s\n", i, message_stack[i]);
    }
}

int picovoice_main(int argc, char *argv[]) {
    const char *access_key = NULL;
    const char *library_path = NULL;
    const char *model_path = NULL;
    const char *context_path = NULL;
    const char *wav_path = NULL;
    float sensitivity = 0.5f;
    float endpoint_duration_sec = 1.f;
    bool require_endpoint = true;
    double performance_threshold_sec = 0;

    int c;
    while ((c = getopt_long(argc, argv, "a:l:m:c:w:t:u:e:p:", long_options, NULL)) != -1) {
        switch (c) {
            case 'a':
                access_key = optarg;
                break;
            case 'l':
                library_path = optarg;
                break;
            case 'm':
                model_path = optarg;
                break;
            case 'c':
                context_path = optarg;
                break;
            case 'w':
                wav_path = optarg;
                break;
            case 't':
                sensitivity = strtof(optarg, NULL);
                break;
            case 'u':
                endpoint_duration_sec = strtof(optarg, NULL);
                break;
            case 'e':
                require_endpoint = (strcmp(optarg, "false") != 0);
                break;
            case 'p':
                performance_threshold_sec = strtod(optarg, NULL);
                break;
            default:
                exit(1);
        }
    }

    if (!access_key || !library_path || !model_path || !context_path || !wav_path) {
        print_usage(argv[0]);
        exit(1);
    }

    void *rhino_library = open_dl(library_path);
    if (!rhino_library) {
        fprintf(stderr, "failed to open library.\n");
        exit(1);
    }

    const char *(*pv_status_to_string_func)(pv_status_t) = load_symbol(rhino_library, "pv_status_to_string");
    if (!pv_status_to_string_func) {
        print_dl_error("failed to load `pv_status_to_string`");
        exit(1);
    }

    int32_t (*pv_sample_rate_func)() = load_symbol(rhino_library, "pv_sample_rate");
    if (!pv_sample_rate_func) {
        print_dl_error("failed to load `pv_sample_rate`");
        exit(1);
    }

    pv_status_t (*pv_rhino_init_func)(
            const char *,
            const char *,
            const char *,
            float,
            float,
            bool,
            pv_rhino_t **) =
            load_symbol(rhino_library, "pv_rhino_init");
    if (!pv_rhino_init_func) {
        print_dl_error("failed to load `pv_rhino_init`");
        exit(1);
    }

    void (*pv_rhino_delete_func)(pv_rhino_t *) = load_symbol(rhino_library, "pv_rhino_delete");
    if (!pv_rhino_delete_func) {
        print_dl_error("failed to load `pv_rhino_delete`");
        exit(1);
    }

    pv_status_t (*pv_rhino_process_func)(pv_rhino_t *, const int16_t *, bool *) =
            load_symbol(rhino_library, "pv_rhino_process");
    if (!pv_rhino_process_func) {
        print_dl_error("failed to load `pv_rhino_process`");
        exit(1);
    }

    pv_status_t (*pv_rhino_is_understood_func)(const pv_rhino_t *, bool *) =
            load_symbol(rhino_library, "pv_rhino_is_understood");
    if (!pv_rhino_is_understood_func) {
        print_dl_error("failed to load `pv_rhino_is_understood`");
        exit(1);
    }

    pv_status_t (*pv_rhino_get_intent_func)(const pv_rhino_t *, const char **, int32_t *, const char ***, const char ***) =
            load_symbol(rhino_library, "pv_rhino_get_intent");
    if (!pv_rhino_get_intent_func) {
        print_dl_error("failed to load `pv_rhino_get_intent`");
        exit(1);
    }

    pv_status_t (*pv_rhino_free_slots_and_values_func)(const pv_rhino_t *, const char **, const char **) =
            load_symbol(rhino_library, "pv_rhino_free_slots_and_values");
    if (!pv_rhino_free_slots_and_values_func) {
        print_dl_error("failed to load `pv_rhino_free_slots_and_values`");
        exit(1);
    }

    int32_t (*pv_rhino_frame_length_func)() = load_symbol(rhino_library, "pv_rhino_frame_length");
    if (!pv_rhino_frame_length_func) {
        print_dl_error("failed to load `pv_rhino_frame_length`");
        exit(1);
    }

    const char *(*pv_rhino_version_func)() = load_symbol(rhino_library, "pv_rhino_version");
    if (!pv_rhino_version_func) {
        print_dl_error("failed to load `pv_rhino_version`");
        exit(1);
    }

    pv_status_t (*pv_get_error_stack_func)(char ***, int32_t *) = load_symbol(rhino_library, "pv_get_error_stack");
    if (!pv_get_error_stack_func) {
        print_dl_error("failed to load 'pv_get_error_stack_func'");
        exit(1);
    }

    void (*pv_free_error_stack_func)(char **) = load_symbol(rhino_library, "pv_free_error_stack");
    if (!pv_free_error_stack_func) {
        print_dl_error("failed to load 'pv_free_error_stack_func'");
        exit(1);
    }

    char **message_stack = NULL;
    int32_t message_stack_depth = 0;
    pv_status_t error_status = PV_STATUS_RUNTIME_ERROR;

    drwav f;

#if defined(_WIN32) || defined(_WIN64)

    int wav_path_wchars_num = MultiByteToWideChar(CP_UTF8, UTF8_COMPOSITION_FLAG, wav_path, NULL_TERMINATED, NULL, 0);
    wchar_t wav_path_w[wav_path_wchars_num];
    MultiByteToWideChar(CP_UTF8, UTF8_COMPOSITION_FLAG, wav_path, NULL_TERMINATED, wav_path_w, wav_path_wchars_num);
    const int drwav_init_file_status = drwav_init_file_w(&f, wav_path_w, NULL);

#else

    const int drwav_init_file_status = drwav_init_file(&f, wav_path, NULL);

#endif

    if (!drwav_init_file_status) {
        fprintf(stderr, "failed to open wav file at `%s`.", wav_path);
        exit(1);
    }

    if (f.sampleRate != (uint32_t) pv_sample_rate_func()) {
        fprintf(stderr, "audio sample rate should be %d\n.", pv_sample_rate_func());
        exit(1);
    }

    if (f.bitsPerSample != 16) {
        fprintf(stderr, "audio format should be 16-bit\n.");
        exit(1);
    }

    if (f.channels != 1) {
        fprintf(stderr, "audio should be single-channel.\n");
        exit(1);
    }

    int16_t *pcm = calloc(pv_rhino_frame_length_func(), sizeof(int16_t));
    if (!pcm) {
        fprintf(stderr, "failed to allocate memory for audio frame.\n");
        exit(1);
    }

    pv_rhino_t *rhino = NULL;

    pv_status_t status = pv_rhino_init_func(
            access_key,
            model_path,
            context_path,
            sensitivity,
            endpoint_duration_sec,
            require_endpoint,
            &rhino);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "'pv_rhino_init' failed with '%s'", pv_status_to_string_func(status));
        error_status = pv_get_error_stack_func(&message_stack, &message_stack_depth);

        if (error_status != PV_STATUS_SUCCESS) {
            fprintf(stderr, ".\nUnable to get Rhino error state with '%s'\n", pv_status_to_string_func(error_status));
            exit(1);
        }

        if (message_stack_depth > 0) {
            fprintf(stderr, ":\n");
            print_error_message(message_stack, message_stack_depth);
        } 

        pv_free_error_stack_func(message_stack);
        exit(1);
    }

    fprintf(stdout, "Picovoice Rhino Speech-to-Intent (%s) :\n\n", pv_rhino_version_func());

    double total_cpu_time_usec = 0;
    double total_processed_time_usec = 0;
    int32_t frame_index = 0;

    while ((int32_t) drwav_read_pcm_frames_s16(&f, pv_rhino_frame_length_func(), pcm) == pv_rhino_frame_length_func()) {
        struct timeval before;
        gettimeofday(&before, NULL);

        bool is_finalized = false;
        status = pv_rhino_process_func(rhino, pcm, &is_finalized);
        if (status != PV_STATUS_SUCCESS) {
            fprintf(stderr, "'pv_rhino_process' failed with '%s'", pv_status_to_string_func(status));
            error_status = pv_get_error_stack_func(&message_stack, &message_stack_depth);

            if (error_status != PV_STATUS_SUCCESS) {
                fprintf(stderr, ".\nUnable to get Rhino error state with '%s'\n", pv_status_to_string_func(error_status));
                exit(1);
            }

            if (message_stack_depth > 0) {
                fprintf(stderr, ":\n");
                print_error_message(message_stack, message_stack_depth);
            } 

            pv_free_error_stack_func(message_stack);
            exit(1);
        }

        if (is_finalized) {
            bool is_understood = false;
            status = pv_rhino_is_understood_func(rhino, &is_understood);
            if (status != PV_STATUS_SUCCESS) {
                fprintf(stderr, "'pv_rhino_is_understood'failed with '%s'", pv_status_to_string_func(status));
                error_status = pv_get_error_stack_func(&message_stack, &message_stack_depth);

                if (error_status != PV_STATUS_SUCCESS) {
                    fprintf(stderr, ".\nUnable to get Rhino error state with '%s'\n", pv_status_to_string_func(error_status));
                    exit(1);
                }

                if (message_stack_depth > 0) {
                    fprintf(stderr, ":\n");
                    print_error_message(message_stack, message_stack_depth);
                } 

                pv_free_error_stack_func(message_stack);
                exit(1);
            }

            const char *intent = NULL;
            int32_t num_slots = 0;
            const char **slots = NULL;
            const char **values = NULL;

            if (is_understood) {
                status = pv_rhino_get_intent_func(rhino, &intent, &num_slots, &slots, &values);
                if (status != PV_STATUS_SUCCESS) {
                    fprintf(stderr, "'pv_rhino_get_intent' failed with '%s'", pv_status_to_string_func(status));
                    error_status = pv_get_error_stack_func(&message_stack, &message_stack_depth);

                    if (error_status != PV_STATUS_SUCCESS) {
                        fprintf(stderr, ".\nUnable to get Rhino error state with '%s'\n", pv_status_to_string_func(error_status));
                        exit(1);
                    }

                    if (message_stack_depth > 0) {
                        fprintf(stderr, ":\n");
                        print_error_message(message_stack, message_stack_depth);
                    } 

                    pv_free_error_stack_func(message_stack);
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
                    error_status = pv_get_error_stack_func(&message_stack, &message_stack_depth);

                    if (error_status != PV_STATUS_SUCCESS) {
                        fprintf(stderr, ".\nUnable to get Rhino error state with '%s'\n", pv_status_to_string_func(error_status));
                        exit(1);
                    }

                    if (message_stack_depth > 0) {
                        fprintf(stderr, ":\n");
                        print_error_message(message_stack, message_stack_depth);
                    } 

                    pv_free_error_stack_func(message_stack);
                    exit(1);
                }
            }

            break;
        }

        struct timeval after;
        gettimeofday(&after, NULL);

        total_cpu_time_usec +=
                (double) (after.tv_sec - before.tv_sec) * 1e6 + (double) (after.tv_usec - before.tv_usec);
        total_processed_time_usec += (pv_rhino_frame_length_func() * 1e6) / pv_sample_rate_func();
        frame_index++;
    }

    const double real_time_factor = total_cpu_time_usec / total_processed_time_usec;
    fprintf(stdout, "real time factor : %.3f\n", real_time_factor);

    free(pcm);
    drwav_uninit(&f);
    pv_rhino_delete_func(rhino);
    close_dl(rhino_library);

    if (performance_threshold_sec > 0) {
        const double total_cpu_time_sec = total_cpu_time_usec * 1e-6;
        if (total_cpu_time_sec > performance_threshold_sec) {
            fprintf(
                    stderr,
                    "Expected threshold (%.3fs), process took (%.3fs)\n",
                    performance_threshold_sec,
                    total_cpu_time_sec);
            exit(1);
        }
    }

    return 0;
}

int main(int argc, char *argv[]) {

#if defined(_WIN32) || defined(_WIN64)

    LPWSTR *wargv = CommandLineToArgvW(GetCommandLineW(), &argc);
    if (wargv == NULL) {
        fprintf(stderr, "CommandLineToArgvW failed\n");
        exit(1);
    }

    char *utf8_argv[argc];

    for (int i = 0; i < argc; ++i) {
        // WideCharToMultiByte: https://docs.microsoft.com/en-us/windows/win32/api/stringapiset/nf-stringapiset-widechartomultibyte
        int arg_chars_num = WideCharToMultiByte(CP_UTF8, UTF8_COMPOSITION_FLAG, wargv[i], NULL_TERMINATED, NULL, 0, NULL, NULL);
        utf8_argv[i] = (char *) malloc(arg_chars_num * sizeof(char));
        if (!utf8_argv[i]) {
            fprintf(stderr, "failed to to allocate memory for converting args");
        }
        WideCharToMultiByte(CP_UTF8, UTF8_COMPOSITION_FLAG, wargv[i], NULL_TERMINATED, utf8_argv[i], arg_chars_num, NULL, NULL);
    }

    LocalFree(wargv);
    argv = utf8_argv;

#endif

    int result = picovoice_main(argc, argv);

#if defined(_WIN32) || defined(_WIN64)

    for (int i = 0; i < argc; ++i) {
        free(utf8_argv[i]);
    }

#endif

    return result;
}
