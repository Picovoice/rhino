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
    use std::fs::File;
    use std::io::BufReader;

    use rhino::RhinoBuilder;

    #[test]
    fn test_within_context() {
        let rhino = RhinoBuilder::new("../../resources/contexts/linux/coffee_maker_linux.rhn")
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
        let rhino = RhinoBuilder::new("../../resources/contexts/linux/coffee_maker_linux.rhn")
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
