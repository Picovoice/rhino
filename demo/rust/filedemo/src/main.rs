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
use hound;
use itertools::Itertools;
use rhino::RhinoBuilder;
use std::path::PathBuf;

fn rhino_demo(
    input_audio_path: PathBuf,
    access_key: &str,
    context_path: &str,
    sensitivity: Option<f32>,
    endpoint_duration_sec: Option<f32>,
    require_endpoint: Option<bool>,
    model_path: Option<&str>,
) {
    let mut rhino_builder = RhinoBuilder::new(access_key, context_path);

    if let Some(sensitivity) = sensitivity {
        rhino_builder.sensitivity(sensitivity);
    }

    if let Some(endpoint_duration_sec) = endpoint_duration_sec {
        rhino_builder.endpoint_duration_sec(endpoint_duration_sec);
    }

    if let Some(require_endpoint) = require_endpoint {
        rhino_builder.require_endpoint(require_endpoint);
    }

    if let Some(model_path) = model_path {
        rhino_builder.model_path(model_path);
    }

    let rhino = rhino_builder.init().expect("Failed to create Rhino");

    let mut wav_reader = match hound::WavReader::open(input_audio_path.clone()) {
        Ok(reader) => reader,
        Err(err) => panic!(
            "Failed to open .wav audio file {}: {}",
            input_audio_path.display(),
            err
        ),
    };

    if wav_reader.spec().sample_rate != rhino.sample_rate() {
        panic!(
            "Audio file should have the expected sample rate of {}, got {}",
            rhino.sample_rate(),
            wav_reader.spec().sample_rate
        );
    }

    if wav_reader.spec().channels != 1u16 {
        panic!(
            "Audio file should have the expected number of channels 1, got {}",
            wav_reader.spec().channels
        );
    }

    if wav_reader.spec().bits_per_sample != 16u16
        || wav_reader.spec().sample_format != hound::SampleFormat::Int
    {
        panic!("WAV format should be in the signed 16 bit format",);
    }

    let mut timestamp = Duration::zero();
    'process: for frame in &wav_reader.samples().chunks(rhino.frame_length() as usize) {
        let frame: Vec<i16> = frame.map(|s| s.unwrap()).collect_vec();
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
                break 'process;
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
            .help("Path to input audio file (mono, WAV, 16-bit, 16kHz).")
            .takes_value(true)
            .required(true)
        )
        .arg(
            Arg::with_name("access_key")
            .long("access_key")
            .value_name("ACCESS_KEY")
            .help("AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)")
            .takes_value(true)
            .required(true),
        )
        .arg(
            Arg::with_name("context_path")
            .long("context_path")
            .value_name("PATH")
            .help("Path to Rhino context file (.rhn).")
            .takes_value(true)
            .required(true)
        )
        .arg(
            Arg::with_name("model_path")
            .long("model_path")
            .value_name("PATH")
            .help("Path to Rhino model file (.pv).")
            .takes_value(true)
        )
        .arg(
            Arg::with_name("sensitivity")
            .long("sensitivity")
            .value_name("SENSITIVITY")
            .help("Inference sensitivity. The value should be a number within [0, 1]. A higher sensitivity results in fewer misses at the cost of increasing the false alarm rate. If not set 0.5 will be used.")
            .takes_value(true)
        )
        .arg(
            Arg::with_name("endpoint_duration")
            .long("endpoint_duration")
            .value_name("DURATION")
            .help("Endpoint duration in seconds. An endpoint is a chunk of silence at the end of an utterance that marks the end of spoken command. It should be a positive number within [0.5, 5]. If not set 1.0 will be used.")
            .takes_value(true)
        )
        .arg(
            Arg::with_name("require_endpoint")
            .long("require_endpoint")
            .value_name("BOOL")
            .help("If set, Rhino requires an endpoint (chunk of silence) before finishing inference.")
            .takes_value(true)
            .possible_values(&["TRUE", "true", "FALSE", "false"])
        )
        .get_matches();

    let input_audio_path = PathBuf::from(matches.value_of("input_audio_path").unwrap());

    let access_key = matches
        .value_of("access_key")
        .expect("AccessKey is REQUIRED for Rhino operation");

    let context_path = matches.value_of("context_path").unwrap();

    let model_path = matches.value_of("model_path");

    let sensitivity = matches
        .value_of("sensitivity")
        .map(|sensitivity| sensitivity.parse().unwrap());

    let endpoint_duration_sec = matches
        .value_of("endpoint_duration")
        .map(|endpoint_duration| endpoint_duration.parse().unwrap());

    let require_endpoint = matches.value_of("require_endpoint").map(|req| match req {
        "TRUE" | "true" => true,
        "FALSE" | "false" => false,
        _ => unreachable!(),
    });

    rhino_demo(
        input_audio_path,
        access_key,
        context_path,
        sensitivity,
        endpoint_duration_sec,
        require_endpoint,
        model_path,
    );
}
