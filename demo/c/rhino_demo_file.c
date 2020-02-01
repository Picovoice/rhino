/*
    Copyright 2018 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/


#include <dlfcn.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/time.h>

#include "pv_rhino.h"

int main(int argc, char *argv[]) {
    if (argc != 5) {
        fprintf(stderr, "usage : %s library_path model_path context_path wav_path\n", argv[0]);
        exit(1);
    }

    const char *library_path = argv[1];
    const char *model_path = argv[2];
    const char *context_path = argv[3];
    const char *wav_path = argv[4];

    void *rhino_library = dlopen(library_path, RTLD_NOW);
    if (!rhino_library) {
        fprintf(stderr,"failed to open library");
        exit(1);
    }

    char *error;

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

    pv_status_t (*pv_rhino_get_intent)(const pv_rhino_t *, const char **, int32_t *, const char ***, const char ***);
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

    int32_t (*pv_rhino_frame_length)();
    pv_rhino_frame_length = dlsym(rhino_library, "pv_rhino_frame_length");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_rhino_frame_length' with '%s'.\n", error);
        exit(1);
    }

    const char *(*pv_status_to_string)(pv_status_t) = dlsym(rhino_library, "pv_status_to_string");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_status_to_string' with '%s'.\n", error);
        exit(1);
    }

    int32_t (*pv_sample_rate)();
    pv_sample_rate = dlsym(rhino_library, "pv_sample_rate");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_sample_rate' with '%s'.\n", error);
        exit(1);
    }

    FILE *wav = fopen(wav_path, "rb");
    if (!wav) {
        fprintf(stderr,"failed to open wav file\n");
        exit(1);
    }

    if (fseek(wav, 44, SEEK_SET) != 0) {
        printf("failed to skip the wav header\n");
        exit(1);
    }

    const int32_t frame_length = pv_rhino_frame_length();

    int16_t *pcm = malloc(sizeof(int16_t) * frame_length);
    if (!pcm) {
        fprintf(stderr,"failed to allocate memory for audio buffer\n");
        exit(1);
    }

    pv_rhino_t *rhino;
    pv_status_t status = pv_rhino_init(model_path, context_path, 0.5f, &rhino);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "'pv_rhino_init' failed with '%s'\n", pv_status_to_string(status));
        exit(1);
    }

    double total_cpu_time_usec = 0;
    double total_processed_time_usec = 0;

    while (fread(pcm, sizeof(int16_t), frame_length, wav) == (size_t) frame_length) {
        struct timeval before;
        gettimeofday(&before, NULL);

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
                fprintf(stderr, "'pv_rhino_is_understood'failed with '%s'\n", pv_status_to_string(status));
                exit(1);
            }

            if (is_understood) {
                const char *intent;
                int32_t num_slots;
                const char **slots;
                const char **values;
                status = pv_rhino_get_intent(rhino, &intent, &num_slots, &slots, &values);
                if (status != PV_STATUS_SUCCESS) {
                    fprintf(stderr,"'pv_rhino_get_intent' failed with '%s'\n", pv_status_to_string(status));
                    exit(1);
                }

                fprintf(stdout,"'%s'\n", intent);
                for (int i = 0; i < num_slots; i++) {
                    fprintf(stdout, "'%s' : '%s'\n", slots[i], values[i]);
                }

                status = pv_rhino_free_slots_and_values(rhino, slots, values);
                if (status != PV_STATUS_SUCCESS) {
                    fprintf(stderr,"'pv_rhino_free_slots_and_values' failed with '%s'\n", pv_status_to_string(status));
                    exit(1);
                }
            } else {
                fprintf(stdout, "failed to understand intent\n");
            }

            break;
        }

        struct timeval after;
        gettimeofday(&after, NULL);

        total_cpu_time_usec +=
                (double) (after.tv_sec - before.tv_sec) * 1e6 + (double) (after.tv_usec - before.tv_usec);
        total_processed_time_usec += (frame_length * 1e6) / pv_sample_rate();
    }

    const double real_time_factor = total_cpu_time_usec / total_processed_time_usec;
    fprintf(stdout, "real time factor is : %.3f\n", real_time_factor);

    free(pcm);
    fclose(wav);
    pv_rhino_delete(rhino);
    dlclose(rhino_library);

    return 0;
}
