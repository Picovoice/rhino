#
# Copyright 2025 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import os
import struct

HEADER = """
/*
    Copyright 2025 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

#ifndef PV_PARAMS_H
#define PV_PARAMS_H

#include <stdint.h>

"""

FOOTER = """

#endif // PV_PARAMS_H

"""

LANGUAGE_CODE_TO_NAME = {
    "de": "german",
    "en": "english",
    "es": "spanish",
    "fr": "french",
    "it": "italian",
    "ja": "japanese",
    "ko": "korean",
    "pt": "portuguese",
    "zh": "mandarin",
}


def generate_pv_params(contexts, header_file_folders):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_dir = os.path.join(script_dir, "../..")

    for header_file_path in header_file_folders:
        header_file = os.path.join(os.path.dirname(__file__), header_file_path, "pv_params.h")
        with open(header_file, "w") as f_out:
            f_out.write(HEADER)

            for language, context_name in contexts.items():
                if language == "en":
                    rhn_dir = os.path.join(repo_dir, f"resources/contexts/cortexm")
                else:
                    rhn_dir = os.path.join(repo_dir, f"resources/contexts_{language}/cortexm")

                f_out.write(f"\n#if defined(__PV_LANGUAGE_{LANGUAGE_CODE_TO_NAME[language].upper()}__)\n\n")

                context_file_path = os.path.join(rhn_dir, f"{context_name}_cortexm.rhn")
                ppn_c_array = rhn_to_c_array(context_file_path)
                f_out.write("// context = %s \n" % context_name)
                f_out.write("static const uint8_t CONTEXT_ARRAY[] = {\n")
                f_out.write("\n".join(ppn_c_array))
                f_out.write("};\n")

                f_out.write(f"\n#endif // __PV_LANGUAGE_{LANGUAGE_CODE_TO_NAME[language].upper()}__\n")

            f_out.write(FOOTER)


def rhn_to_c_array(binary_file_path):
    indent = 8
    line_width = 120
    with open(binary_file_path, "rb") as f:
        array = f.read()
        res = list()
        array = ["0x%s" % z.hex() for z in struct.unpack("%dc" % len(array), array)]
        row = " " * indent
        last_x = 0
        for x in array:
            if len(row) >= line_width:
                row = row.rsplit(", ", maxsplit=1)[0] + ","
                res.append(row)
                row = " " * indent + last_x
            if row != " " * indent:
                row += ", "
            row += x
            last_x = x
        if row != " " * indent:
            res.append(row)
        res.append("")
        return res


if __name__ == "__main__":
    contexts = {
        "de": "beleuchtung",
        "en": "smart_lighting",
        "es": "iluminación_inteligente",
        "fr": "éclairage_intelligent",
        "it": "illuminazione",
        "ja": "sumāto_shōmei",
        "ko": "seumateu_jomyeong",
        "pt": "luz_inteligente",
        "zh": "simple_context_zh",
    }
    include_folders = [
        "stm32f411/stm32f411e-disco/Inc/",
    ]

    generate_pv_params(contexts, include_folders)