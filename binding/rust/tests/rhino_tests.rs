/*
    Copyright 2021-2023 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

#[cfg(test)]
mod tests {
    use itertools::Itertools;
    use rodio::{source::Source, Decoder};
    use serde_json::Value;
    use std::collections::HashMap;
    use std::env;
    use std::fs::{read_to_string, File};
    use std::io::BufReader;

    use rhino::util::pv_platform;
    use rhino::RhinoBuilder;

    fn append_lang(path: &str, language: &str) -> String {
        if language == "en" {
            String::from(path)
        } else {
            format!("{path}_{language}")
        }
    }

    fn load_test_data() -> Value {
        let test_json_path = format!(
            "{}{}",
            env!("CARGO_MANIFEST_DIR"),
            "/../../resources/test/test_data.json"
        );
        let contents: String =
            read_to_string(test_json_path).expect("Unable to read test_data.json");
        let test_json: Value =
            serde_json::from_str(&contents).expect("Unable to parse test_data.json");
        test_json
    }

    fn model_path_by_language(language: &str) -> String {
        format!(
            "{}{}.pv",
            env!("CARGO_MANIFEST_DIR"),
            append_lang("/../../lib/common/rhino_params", language)
        )
    }

    fn context_path_by_language(context: &str, language: &str) -> String {
        format!(
            "{}{}/{}/{}_{}.rhn",
            env!("CARGO_MANIFEST_DIR"),
            append_lang("/../../resources/contexts", language),
            pv_platform(),
            context,
            pv_platform()
        )
    }

    fn run_rhino_test(
        language: &str,
        context: &str,
        is_within_context: bool,
        intent: &str,
        slots: HashMap<String, String>,
        audio_file_name: &str,
    ) {
        let access_key = env::var("PV_ACCESS_KEY")
            .expect("Pass the AccessKey in using the PV_ACCESS_KEY env variable");

        let rhino = RhinoBuilder::new(access_key, context_path_by_language(context, language))
            .model_path(model_path_by_language(language))
            .init()
            .expect("Unable to create Rhino");

        let soundfile_path = format!(
            "{}{}{}",
            env!("CARGO_MANIFEST_DIR"),
            "/../../resources/audio_samples/",
            audio_file_name
        );

        let soundfile = BufReader::new(File::open(&soundfile_path).expect(&soundfile_path));
        let source = Decoder::new(soundfile).unwrap();

        assert_eq!(
            rhino.sample_rate(),
            source.sample_rate(),
            "`{language}` sample_rate failed for context `{context}`"
        );

        let mut is_finalized = false;
        for frame in &source.chunks(rhino.frame_length() as usize) {
            let frame = frame.collect_vec();
            if frame.len() == rhino.frame_length() as usize {
                is_finalized = rhino.process(&frame).unwrap();
                if is_finalized {
                    break;
                }
            }
        }

        assert_eq!(
            is_finalized, true,
            "`{language}` is_finalized failed for context `{context}`"
        );
        let inference = rhino.get_inference().unwrap();

        assert_eq!(
            inference.is_understood, is_within_context,
            "`{language}` is_understood failed for context `{context}`"
        );

        if is_within_context {
            assert_eq!(
                inference.intent.unwrap(),
                intent,
                "`{language}` intent failed for context `{context}`"
            );
            assert_eq!(
                inference.slots, slots,
                "`{language}` slots failed for context `{context}`"
            );
        }
    }

    #[test]
    fn test_within_context() {
        let test_json: Value = load_test_data();

        for t in test_json["tests"]["within_context"].as_array().unwrap() {
            let language = t["language"].as_str().unwrap();
            let context = t["context_name"].as_str().unwrap();
            let intent = t["inference"]["intent"].as_str().unwrap();
            let slots_json = t["inference"]["slots"].as_object().unwrap();
            let mut slots = HashMap::new();
            slots_json.iter().for_each(|(key, value)| {
                slots.insert(key.to_string(), String::from(value.as_str().unwrap()));
            });

            let test_audio = append_lang("test_within_context", language) + ".wav";
            run_rhino_test(language, context, true, intent, slots, &test_audio);
        }
    }

    #[test]
    fn test_out_of_context() {
        let test_json: Value = load_test_data();

        for t in test_json["tests"]["out_of_context"].as_array().unwrap() {
            let language = t["language"].as_str().unwrap();
            let context = t["context_name"].as_str().unwrap();

            let test_audio = append_lang("test_out_of_context", language) + ".wav";
            run_rhino_test(language, context, false, "", HashMap::new(), &test_audio);
        }
    }
}
