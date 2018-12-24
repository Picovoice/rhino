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


#include <dlfcn.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/time.h>

#include "pv_rhino.h"

/**
 * Simple utility program to measure the real time factor (RTF) of Rhino Speech-to-Intent engine. It processes a WAV file
 * with sampling rate of 16000 and measures duration of file and execution time.
 */
int main(int argc, char *argv[]) {
    if (argc != 5) {
        printf("usage: rhino_demo library_path model_path context_path wav_path\n");
        return 1;
    }

    const char *library_path = argv[1];
    const char *model_path = argv[2];
    const char *context_path = argv[3];
    const char *wav_path = argv[4];

    void *handle = dlopen(library_path, RTLD_NOW);
    if (!handle) {
        printf("failed to open rhino's shared library at '%s'", library_path);
    }

    pv_status_t (*pv_rhino_init_func)(const char*, const char*, pv_rhino_object_t**);
    pv_rhino_init_func = dlsym(handle, "pv_rhino_init");

    void (*pv_rhino_delete_func)(pv_rhino_object_t*);
    pv_rhino_delete_func = dlsym(handle, "pv_rhino_delete");

    pv_status_t (*pv_rhino_process_func)(pv_rhino_object_t*, const int16_t*, bool*);
    pv_rhino_process_func = dlsym(handle, "pv_rhino_process");

    pv_status_t (*pv_rhino_is_understood_func)(const pv_rhino_object_t*, bool*);
    pv_rhino_is_understood_func = dlsym(handle, "pv_rhino_is_understood");

    pv_status_t (*pv_rhino_get_intent_func)(const pv_rhino_object_t*, const char**, int*, const char***, const char***);
    pv_rhino_get_intent_func = dlsym(handle, "pv_rhino_get_intent");

    int (*pv_rhino_frame_length_func)();
    pv_rhino_frame_length_func = dlsym(handle, "pv_rhino_frame_length");

    FILE *wav = fopen(wav_path, "rb");
    if (!wav) {
        printf("failed to open wav file located at '%s'\n", wav_path);
        return 1;
    }

    // Assume the input WAV file has sampling rate of 16000 and is 16-bit encoded. Skip the WAV header and get to data
    // portion.

    static const int WAV_HEADER_SIZE_BYTES = 44;

    if (fseek(wav, WAV_HEADER_SIZE_BYTES, SEEK_SET) != 0) {
        printf("failed to skip the wav header\n");
        return 1;
    }

    const size_t frame_length = (size_t) pv_rhino_frame_length_func();

    int16_t *pcm = malloc(sizeof(int16_t) * frame_length);
    if (!pcm) {
        printf("failed to allocate memory for audio buffer\n");
        return 1;
    }

    pv_rhino_object_t *rhino;
    pv_status_t status = pv_rhino_init_func(model_path, context_path, &rhino);
    if (status != PV_STATUS_SUCCESS) {
        printf("failed to initialize rhino with following arguments:\n");
        printf("model path: %s", model_path);
        printf("context path: %s", context_path);
        return 1;
    }

    static const int SAMPLE_RATE = 16000;

    double total_cpu_time_usec = 0;
    double total_processed_time_usec = 0;

    while(fread(pcm, sizeof(int16_t), frame_length, wav) == frame_length) {
        struct timeval before, after;
        gettimeofday(&before, NULL);

        bool is_finalized;
        status = pv_rhino_process_func(rhino, pcm, &is_finalized);
        if (status != PV_STATUS_SUCCESS) {
            printf("failed to process audio\n");
            return 1;
        }
        if (is_finalized) {
            bool is_understood;
            status = pv_rhino_is_understood_func(rhino, &is_understood);
            if (status != PV_STATUS_SUCCESS) {
                printf("failed to understand\n");
                return 1;
            }

            if (is_understood) {
                const char *intent;
                int num_slots;
                const char **slots;
                const char **slot_values;
                status = pv_rhino_get_intent_func(rhino, &intent, &num_slots, &slots, &slot_values);
                if (status != PV_STATUS_SUCCESS) {
                    printf("failed to retrieve intent\n");
                    return 1;
                }

                printf("'%s'\n", intent);
                for (int i = 0; i < num_slots; i++) {
                    printf("'%s': '%s'\n", slots[i], slot_values[i]);
                }
            }

            break;
        }

        gettimeofday(&after, NULL);

        total_cpu_time_usec += (after.tv_sec - before.tv_sec) * 1e6 + (after.tv_usec - before.tv_usec);
        total_processed_time_usec += (frame_length * 1e6) / SAMPLE_RATE;
    }

    const double real_time_factor = total_cpu_time_usec / total_processed_time_usec;
    printf("real time factor is: %f\n", real_time_factor);

    pv_rhino_delete_func(rhino);
    free(pcm);
    fclose(wav);

    return 0;
}