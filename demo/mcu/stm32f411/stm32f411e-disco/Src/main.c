/*
    Copyright 2025 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>

#include "stm32f411e_discovery.h"

#include "pv_rhino_mcu.h"

#include "pv_audio_rec.h"
#include "pv_params.h"
#include "pv_st_f411.h"

#define MEMORY_BUFFER_SIZE (50 * 1024)

static int8_t memory_buffer[MEMORY_BUFFER_SIZE] __attribute__((aligned(16)));

static const char *ACCESS_KEY = "${ACCESS_KEY}"; //AccessKey string obtained from Picovoice Console (https://picovoice.ai/console/)

static const float SENSITIVITY = 0.75f;
static const float ENDPOINT_DURATION_SEC = 1.0f;
static const bool REQUIRE_ENDPOINT = true;

static void inference_callback(bool is_understood, const char *intent, int32_t num_slots, const char **slots, const char **values) {
    printf("{\n");
    printf("    is_understood : '%s',\n", (is_understood ? "true" : "false"));
    if (is_understood) {
        printf("    intent : '%s',\n", intent);
        if (num_slots > 0) {
            printf("    slots : {\n");
            for (int32_t i = 0; i < num_slots; i++) {
                printf("        '%s' : '%s',\n", slots[i], values[i]);
            }
            printf("    }\n");
        }
    }
    printf("}\n\n");
    for (int32_t i = 0; i < 10; i++) {
        BSP_LED_Toggle(LED3);
        BSP_LED_Toggle(LED4);
        BSP_LED_Toggle(LED5);
        BSP_LED_Toggle(LED6);
        HAL_Delay(30);
    }
}

static void error_handler(void) {
    while (true) {}
}

void print_error_message(char **message_stack, int32_t message_stack_depth) {
    for (int32_t i = 0; i < message_stack_depth; i++) {
        printf("[%ld] %s\n", i, message_stack[i]);
    }
}

int main(void) {
    pv_status_t status = pv_board_init();
    if (status != PV_STATUS_SUCCESS) {
        error_handler();
    }

    const uint8_t *board_uuid = pv_get_uuid();
    printf("UUID: ");
    for (uint32_t i = 0; i < pv_get_uuid_size(); i++) {
        printf(" %.2x", board_uuid[i]);
    }
    printf("\r\n");

    status = pv_audio_rec_init();
    if (status != PV_STATUS_SUCCESS) {
        printf("Audio init failed with '%s'", pv_status_to_string(status));
        error_handler();
    }

    status = pv_audio_rec_start();
    if (status != PV_STATUS_SUCCESS) {
        printf("Recording audio failed with '%s'", pv_status_to_string(status));
        error_handler();
    }

    pv_rhino_t *handle = NULL;

    char **message_stack = NULL;
    int32_t message_stack_depth = 0;
    pv_status_t error_status;

    status = pv_rhino_init(
    		ACCESS_KEY,
			memory_buffer,
			MEMORY_BUFFER_SIZE,
			CONTEXT_ARRAY,
			sizeof(CONTEXT_ARRAY),
			SENSITIVITY,
			ENDPOINT_DURATION_SEC,
			REQUIRE_ENDPOINT,
			&handle);
    if (status != PV_STATUS_SUCCESS) {
        printf("Rhino init failed with '%s':\n", pv_status_to_string(status));

        error_status = pv_get_error_stack(&message_stack, &message_stack_depth);
        if (error_status != PV_STATUS_SUCCESS) {
            printf("Unable to get Rhino error state with '%s':\n", pv_status_to_string(error_status));
            error_handler();
        }

        print_error_message(message_stack, message_stack_depth);
        pv_free_error_stack(message_stack);

        error_handler();
    }

    while (true) {
        const int16_t *buffer = pv_audio_rec_get_new_buffer();
        if (buffer) {
            bool is_finalized = false;
            status = pv_rhino_process(handle, buffer, &is_finalized);
            if (status != PV_STATUS_SUCCESS) {
                printf("Rhino process failed with '%s'", pv_status_to_string(status));
                error_handler();
            }
            if (is_finalized) {
            	bool is_understood = false;
            	status = pv_rhino_is_understood(handle, &is_understood);
                if (status != PV_STATUS_SUCCESS) {
                    printf("Rhino is_understood failed with '%s'", pv_status_to_string(status));
                    error_handler();
                }

                if (is_understood) {
                	const char *intent = NULL;
                	int32_t num_slots = 0;
                	const char **slots = NULL;
                	const char **values = NULL;

                	status = pv_rhino_get_intent(
                			handle,
							&intent,
							&num_slots,
							&slots,
							&values);
                    if (status != PV_STATUS_SUCCESS) {
                        printf("Rhino get_intent failed with '%s'", pv_status_to_string(status));
                        error_handler();
                    }

                    inference_callback(is_understood, intent, num_slots, slots, values);

                    status = pv_rhino_free_slots_and_values(handle, slots, values);
                    if (status != PV_STATUS_SUCCESS) {
                        printf("Rhino free_slots_and_values failed with '%s'", pv_status_to_string(status));
                        error_handler();
                    }
                } else {
                	inference_callback(is_understood, NULL, 0, NULL, NULL);
                }

                status = pv_rhino_reset(handle);
                if (status != PV_STATUS_SUCCESS) {
                    printf("Rhino reset failed with '%s'", pv_status_to_string(status));
                    error_handler();
                }
            }
        }
    }
    pv_board_deinit();
    pv_audio_rec_deinit();
    pv_rhino_delete(handle);
}
