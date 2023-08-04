
# Copyright 2023 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import json
import os

from xml.dom import minidom


def update_ios_demo(contexts):

    scheme_dir = os.path.join(
        os.path.dirname(__file__),
        "../../demo/ios/RhinoDemo.xcodeproj/xcshareddata/xcschemes")
    base_scheme = os.path.join(
        os.path.dirname(__file__),
        scheme_dir,
        "_enDemo.xcscheme")

    for language, context in contexts.items():
        if language == 'en':
            continue

        language_scheme = os.path.join(scheme_dir, f"{language}Demo.xcscheme")
        if not os.path.exists(language_scheme):
            print(f"Creating iOS demo scheme for `{language}`")
            base_scheme_content = minidom.parse(base_scheme)
            pre_build_action = base_scheme_content.getElementsByTagName('ActionContent')[0]
            pre_build_action.setAttribute(
                'scriptText',
                pre_build_action.attributes['scriptText'].value.replace(" en", f" {language}").replace(" smart_lighting", f" {context}"))

            env_vars = base_scheme_content.getElementsByTagName('EnvironmentVariable')
            for env_var in env_vars:
                if env_var.getAttribute('key') == 'LANGUAGE':
                    env_var.setAttribute('value', language)
                if env_var.getAttribute('key') == 'CONTEXT':
                    env_var.setAttribute('value', context)

            with open(os.path.join(scheme_dir, f"{language}Demo.xcscheme"), 'w') as f:
                f.write(base_scheme_content.toxml())
        else:
            print(f"iOS scheme for `{language}` already exists")


def main():
    with open(os.path.join(os.path.dirname(__file__), "../.test/test_data.json"), encoding='utf-8') as f:
        json_content = json.loads(f.read())

    contexts = {x['language']: x['context_name'] for x in json_content['tests']['within_context']}
    update_ios_demo(contexts=contexts)


if __name__ == '__main__':
    main()