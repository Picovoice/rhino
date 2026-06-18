#
# Copyright 2026 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import argparse
import os
import struct
import wave

import pvrhino
from pvrecorder import PvRecorder


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        '--access_key',
        help='AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)')

    parser.add_argument(
        '--yaml_path',
        help="Absolute path to the yaml file provided by this demo.",
        default=os.path.join(os.path.dirname(__file__), "contacts.yaml"))

    parser.add_argument(
        '--device',
        help='Device to run inference on (`best`, `cpu:{num_threads}`, `gpu:{gpu_index}`). '
             'Default: automatically selects best device for `pvrhino`')

    parser.add_argument(
        '--sensitivity',
        help="Inference sensitivity. It should be a number within [0, 1]. A higher sensitivity value results in "
             "fewer misses at the cost of (potentially) increasing the erroneous inference rate.",
        type=float,
        default=0.5)

    parser.add_argument(
        '--endpoint_duration_sec',
        help="Endpoint duration in seconds. An endpoint is a chunk of silence at the end of an utterance that marks "
             "the end of spoken command. It should be a positive number within [0.5, 5]. A lower endpoint duration "
             "reduces delay and improves responsiveness. A higher endpoint duration assures Rhino doesn't return "
             "inference preemptively in case the user pauses before finishing the request.",
        type=float,
        default=1.)

    parser.add_argument(
        '--require_endpoint',
        help="If set to `True`, Rhino requires an endpoint (a chunk of silence) after the spoken command. If set to "
             "`False`, Rhino tries to detect silence, but if it cannot, it still will provide inference regardless. "
             "Set to `False` only if operating in an environment with overlapping speech (e.g. people talking in the "
             "background).",
        default='True',
        choices=['True', 'False'])

    parser.add_argument(
        '--show_inference_devices',
        action='store_true',
        help='Show the list of available devices for Rhino inference and exit')

    parser.add_argument('--audio_device_index', help='Index of input audio device.', type=int, default=-1)

    parser.add_argument('--show_audio_devices', action='store_true')

    args = parser.parse_args()

    if args.require_endpoint.lower() == 'false':
        require_endpoint = False
    else:
        require_endpoint = True

    if args.show_inference_devices:
        print('\n'.join(pvrhino.available_devices(library_path=args.library_path)))
        return

    if args.show_audio_devices:
        for i, device in enumerate(PvRecorder.get_available_devices()):
            print('Device %d: %s' % (i, device))
        return

    if not args.access_key:
        print('Argument --access_key is required.')
        return

    context_path = f"{os.path.splitext(args.yaml_path)[0]}.rhn"

    try:
        pvrhino.train_context_from_yaml(
            access_key=args.access_key,
            output_path=context_path,
            language="en",
            yaml_path=args.yaml_path)
    except Exception as e:
        print(e)
        raise e

    print('Enter additional contacts separated by spaces:')
    contacts = input()

    if contacts:
        try:
            original = ["Mom", "Dad", "John", "Jane"]
            pvrhino.train_context_from_dynamic_slots(
                access_key=args.access_key,
                output_path=context_path,
                language="en",
                context_path=context_path,
                slots={
                    "contacts": set(original + contacts.split())
                })
        except Exception as e:
            print(e)
            raise e

    try:
        rhino = pvrhino.create(
            access_key=args.access_key,
            context_path=context_path,
            sensitivity=args.sensitivity,
            endpoint_duration_sec=args.endpoint_duration_sec,
            require_endpoint=require_endpoint)
    except pvrhino.RhinoInvalidArgumentError as e:
        print("One or more arguments provided to Rhino is invalid: ", args)
        print(e)
        raise e
    except pvrhino.RhinoActivationError as e:
        print("AccessKey activation error")
        raise e
    except pvrhino.RhinoActivationLimitError as e:
        print("AccessKey '%s' has reached it's temporary device limit" % args.access_key)
        raise e
    except pvrhino.RhinoActivationRefusedError as e:
        print("AccessKey '%s' refused" % args.access_key)
        raise e
    except pvrhino.RhinoActivationThrottledError as e:
        print("AccessKey '%s' has been throttled" % args.access_key)
        raise e
    except pvrhino.RhinoError as e:
        print("Failed to initialize Rhino")
        raise e

    print('Rhino version: %s' % rhino.version)
    print('Context info: %s' % rhino.context_info)

    recorder = PvRecorder(
        frame_length=rhino.frame_length,
        device_index=args.audio_device_index)
    recorder.start()

    print('Using device: %s' % recorder.selected_device)
    print('Listening ... Press Ctrl+C to exit.\n')

    try:
        while True:
            pcm = recorder.read()

            is_finalized = rhino.process(pcm)
            if is_finalized:
                inference = rhino.get_inference()
                if inference.is_understood:
                    print('{')
                    print("  intent : '%s'" % inference.intent)
                    print('  slots : {')
                    for slot, value in inference.slots.items():
                        print("    %s : '%s'" % (slot, value))
                    print('  }')
                    print('}\n')
                else:
                    print("Didn't understand the command.\n")
    except KeyboardInterrupt:
        print('Stopping ...')
    finally:
        recorder.delete()
        rhino.delete()


if __name__ == '__main__':
    main()
