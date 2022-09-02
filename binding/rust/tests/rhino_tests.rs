/*
    Copyright 2021 Picovoice Inc.

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
    use std::collections::HashMap;
    use std::env;
    use std::fs::File;
    use std::io::BufReader;

    use rhino::util::pv_platform;
    use rhino::RhinoBuilder;

    fn append_lang(path: &str, language: &str) -> String {
        if language == "en" {
            String::from(path)
        } else {
            format!("{}_{}", path, language)
        }
    }

    fn model_path_by_language(language: &str) -> String {
        format!(
            "{}{}{}",
            env!("CARGO_MANIFEST_DIR"),
            append_lang("/../../lib/common/rhino_params", language),
            ".pv"
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

        assert_eq!(rhino.sample_rate(), source.sample_rate());

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

        assert!(is_finalized);
        let inference = rhino.get_inference().unwrap();

        assert!(inference.is_understood == is_within_context);

        if is_within_context {
            assert_eq!(inference.intent.unwrap(), intent);

            assert_eq!(inference.slots, slots);
        }
    }

    macro_rules! rhino_tests {
        ($($test_name:ident: $values:expr,)*) => {
        $(
            #[test]
            fn $test_name() {
                let (language, context, is_within_context, intent, slots):
                    (&str, &str, bool, &str, HashMap<&str, &str>) = $values;
                let mut string_slots = HashMap::new();
                for (key, value) in slots {
                    string_slots.insert(String::from(key), String::from(value));
                }
                let audio_file_name = format!("{}.wav", stringify!($test_name));
                run_rhino_test(language, context, is_within_context, intent, string_slots, &audio_file_name);
            }
        )*
        }
    }

    rhino_tests! {
        test_within_context_es: (
            "es",
            &"iluminación_inteligente",
            true,
            "changeColor",
            HashMap::from([("location", "habitación"), ("color", "rosado")]),
        ),
        test_out_of_context_es: (
            "es",
            &"iluminación_inteligente",
            false,
            "changeColor",
            HashMap::new(),
        ),
        test_within_context_de: (
            "de",
            &"beleuchtung",
            true,
            "changeState",
            HashMap::from([("state", "aus")]),
        ),
        test_out_of_context_de: (
            "de",
            &"beleuchtung",
            false,
            "changeState",
            HashMap::new(),
        ),
        test_within_context_fr: (
            "fr",
            &"éclairage_intelligent",
            true,
            "changeColor",
            HashMap::from([("color", "violet")]),
        ),
        test_out_of_context_fr: (
            "fr",
            &"éclairage_intelligent",
            false,
            "changeColor",
            HashMap::new(),
        ),
        test_within_context_it: (
            "it",
            &"illuminazione",
            true,
            "spegnereLuce",
            HashMap::from([("luogo", "bagno")]),
        ),
        test_out_of_context_it: (
            "it",
            &"illuminazione",
            false,
            "spegnereLuce",
            HashMap::new(),
        ),
        test_within_context_ja: (
            "ja",
            &"sumāto_shōmei",
            true,
            "色変更",
            HashMap::from([("色", "青")]),
        ),
        test_out_of_context_ja: (
            "ja",
            &"sumāto_shōmei",
            false,
            "色変更",
            HashMap::new(),
        ),
        test_within_context_ko: (
            "ko",
            &"seumateu_jomyeong",
            true,
            "changeColor",
            HashMap::from([("color", "파란색")]),
        ),
        test_out_of_context_ko: (
            "ko",
            &"seumateu_jomyeong",
            false,
            "changeColor",
            HashMap::new(),
        ),
        test_within_context_pt: (
            "pt",
            &"luz_inteligente",
            true,
            "ligueLuz",
            HashMap::from([("lugar", "cozinha")]),
        ),
        test_out_of_context_pt: (
            "pt",
            &"luz_inteligente",
            false,
            "ligueLuz",
            HashMap::new(),
        ),
    }

    #[test]
    fn test_within_context() {
        let access_key = env::var("PV_ACCESS_KEY")
            .expect("Pass the AccessKey in using the PV_ACCESS_KEY env variable");
        let context_path = format!(
            "../../resources/contexts/{}/coffee_maker_{}.rhn",
            pv_platform(),
            pv_platform(),
        );
        let rhino = RhinoBuilder::new(access_key, context_path)
            .init()
            .expect("Unable to create Rhino");

        let soundfile = BufReader::new(
            File::open(concat!(
                env!("CARGO_MANIFEST_DIR"),
                "/../../resources/audio_samples/test_within_context.wav"
            ))
            .unwrap(),
        );
        let source = Decoder::new(soundfile).unwrap();

        assert_eq!(rhino.sample_rate(), source.sample_rate());

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

        assert!(is_finalized);

        let inference = rhino.get_inference().unwrap();

        assert!(inference.is_understood);
        assert_eq!(inference.intent.unwrap(), "orderBeverage");

        let mut expected_slot_values = HashMap::new();
        expected_slot_values.insert(String::from("beverage"), String::from("americano"));
        expected_slot_values.insert(String::from("numberOfShots"), String::from("double shot"));
        expected_slot_values.insert(String::from("size"), String::from("medium"));

        assert_eq!(inference.slots, expected_slot_values);
    }

    #[test]
    fn test_out_of_context() {
        let access_key = env::var("PV_ACCESS_KEY")
            .expect("Pass the AccessKey in using the PV_ACCESS_KEY env variable");
        let context_path = format!(
            "../../resources/contexts/{}/coffee_maker_{}.rhn",
            pv_platform(),
            pv_platform(),
        );
        let rhino = RhinoBuilder::new(access_key, context_path)
            .init()
            .expect("Unable to create Rhino");

        let soundfile = BufReader::new(
            File::open(concat!(
                env!("CARGO_MANIFEST_DIR"),
                "/../../resources/audio_samples/test_out_of_context.wav"
            ))
            .unwrap(),
        );
        let source = Decoder::new(soundfile).unwrap();

        assert_eq!(rhino.sample_rate(), source.sample_rate());

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

        assert!(is_finalized);
        assert!(!rhino.get_inference().unwrap().is_understood);
    }
}
