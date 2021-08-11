/*
    Copyright 2021 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

use chrono::Duration;
use clap::{App, Arg};
use itertools::Itertools;
use rhino::RhinoBuilder;
use rodio::{source::Source, Decoder};
use std::fs::File;
use std::io::BufReader;
use std::path::PathBuf;

fn rhino_demo(
    input_audio_path: PathBuf,
    context_path: &str,
    sensitivity: Option<f32>,
    model_path: Option<&str>,
) {
    let soundfile = BufReader::new(File::open(input_audio_path).unwrap());
    let audiosource = Decoder::new(soundfile).unwrap();

    let mut rhino_builder = RhinoBuilder::new(context_path);

    if let Some(sensitivity) = sensitivity {
        rhino_builder.sensitivity(sensitivity);
    }

    if let Some(model_path) = model_path {
        rhino_builder.model_path(model_path);
    }

    let rhino = rhino_builder.init().expect("Failed to create Rhino");

    if rhino.sample_rate() != audiosource.sample_rate() {
        panic!(
            "Audio file should have the expected sample rate of {}, got {}",
            rhino.sample_rate(),
            audiosource.sample_rate()
        );
    }

    let mut timestamp = Duration::zero();
    for frame in &audiosource.chunks(rhino.frame_length() as usize) {
        let frame = frame.collect_vec();
        timestamp = timestamp
            + Duration::milliseconds(((1000 * frame.len()) / rhino.sample_rate() as usize) as i64);

        if frame.len() == rhino.frame_length() as usize {
            let is_finalized = rhino.process(&frame).unwrap();
            if is_finalized {
                let inference = rhino.get_inference().unwrap();
                if inference.is_understood {
                    println!(
                        "\n[{}:{}:{}] Detected:",
                        timestamp.num_minutes(),
                        timestamp.num_seconds() - (timestamp.num_minutes() * 60),
                        timestamp.num_milliseconds() - (timestamp.num_seconds() * 1000),
                    );
                    println!("{{");
                    println!("\tintent : '{}'", inference.intent.unwrap());
                    println!("\tslots : {{");
                    for (slot, value) in inference.slots.iter() {
                        println!("\t\t{} : {}", slot, value);
                    }
                    println!("\t}}");
                    println!("}}\n");
                } else {
                    println!("Did not understand the command");
                }
            }
        }
    }
}

fn main() {
    let matches = App::new("Picovoice Rhino Rust File Demo")
        .arg(
            Arg::with_name("input_audio_path")
            .long("input_audio_path")
            .value_name("PATH")
            .help("Path to input audio file (mono, WAV, 16-bit, 16kHz)")
            .takes_value(true)
            .required(true)
        )
        .arg(
            Arg::with_name("context_path")
            .long("context_path")
            .value_name("PATH")
            .help("Path to Rhino context file (.rhn)")
            .takes_value(true)
            .required(true)
        )
        .arg(
            Arg::with_name("model_path")
            .long("model_path")
            .value_name("PATH")
            .help("Path to Rhino model file (.pv)")
            .takes_value(true)
        )
        .arg(
            Arg::with_name("sensitivity")
            .long("sensitivity")
            .value_name("SENSITIVITY")
            .help("Inference sensitivity. The value should be a number within [0, 1]. A higher sensitivity results in fewer misses at the cost of increasing the false alarm rate. If not set 0.5 will be used.")
            .takes_value(true)
        )
        .get_matches();

    let input_audio_path = PathBuf::from(matches.value_of("input_audio_path").unwrap());

    let context_path = matches.value_of("context_path").unwrap();

    let sensitivity = match matches.value_of("sensitivity") {
        Some(sensitivity) => Some(sensitivity.parse().unwrap()),
        None => None,
    };

    let model_path = matches.value_of("model_path");

    rhino_demo(input_audio_path, context_path, sensitivity, model_path);
}
