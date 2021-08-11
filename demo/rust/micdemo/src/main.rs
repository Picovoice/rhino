/*
    Copyright 2021 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

use chrono::prelude::*;
use clap::{App, Arg, ArgGroup};
use ctrlc;
use hound;
use miniaudio;
use rhino::{Rhino, RhinoBuilder};
use std::collections::VecDeque;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

static LISTENING: AtomicBool = AtomicBool::new(false);

fn process_audio_chunk(samples: &[i16], rhino: &Rhino, buffer: &mut VecDeque<i16>) {
    buffer.extend(samples.iter());

    while buffer.len() >= rhino.frame_length() as usize && LISTENING.load(Ordering::SeqCst) {
        let frame: Vec<i16> = buffer.drain(..rhino.frame_length() as usize).collect();
        let is_finalized = rhino.process(&frame).unwrap();
        if is_finalized {
            let inference = rhino.get_inference().unwrap();
            if inference.is_understood {
                println!("\n[{}] Detected:", Local::now().format("%F %T"));
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

fn rhino_demo(
    miniaudio_backend: &[miniaudio::Backend],
    audio_device_index: usize,
    context_path: &str,
    sensitivity: Option<f32>,
    model_path: Option<&str>,
    output_path: Option<&str>,
) {
    let mut buffer: VecDeque<i16> = VecDeque::new();

    let mut rhino_builder = RhinoBuilder::new(context_path);

    if let Some(sensitivity) = sensitivity {
        rhino_builder.sensitivity(sensitivity);
    }

    if let Some(model_path) = model_path {
        rhino_builder.model_path(model_path);
    }

    let rhino = rhino_builder.init().expect("Failed to create Rhino");

    let wavspec = hound::WavSpec {
        channels: 1,
        sample_rate: 16000,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };
    let output_file_writer = match output_path {
        Some(output_path) => Some(Arc::new(Mutex::new(
            hound::WavWriter::create(output_path, wavspec)
                .expect("Failed to open output audio file"),
        ))),
        None => None,
    };

    let miniaudio_context =
        miniaudio::Context::new(&miniaudio_backend, None).expect("Failed to create audio context");
    miniaudio_context
        .with_capture_devices(|_: _| {})
        .expect("Failed to access capture devices");
    let device_id = miniaudio_context
        .capture_devices()
        .get(audio_device_index)
        .expect("No device available given audio device index.")
        .id()
        .clone();

    println!("Using {:?} backend", miniaudio_context.backend());

    let mut device_config = miniaudio::DeviceConfig::new(miniaudio::DeviceType::Capture);
    device_config
        .capture_mut()
        .set_format(miniaudio::Format::S16);
    device_config.capture_mut().set_channels(1);
    device_config.capture_mut().set_device_id(Some(device_id));
    device_config.set_sample_rate(rhino.sample_rate());
    device_config.set_data_callback(move |_, _, frames| {
        process_audio_chunk(frames.as_samples(), &rhino, &mut buffer);

        if let Some(output_file_writer_mutex) = &output_file_writer {
            let mut output_file_writer = output_file_writer_mutex.lock().unwrap();
            let samples: &[i16] = frames.as_samples();
            for sample in samples {
                output_file_writer.write_sample(*sample).unwrap();
            }
        }
    });

    let device = miniaudio::Device::new(Some(miniaudio_context), &device_config)
        .expect("Failed to initialize capture device");

    LISTENING.store(true, Ordering::SeqCst);
    device.start().expect("Failed to start device");
    println!("Listening for commands...");

    ctrlc::set_handler(|| {
        LISTENING.store(false, Ordering::SeqCst);
    })
    .expect("Unable to setup signal handler");

    // Spin loop until we receive the ctrlc handler
    while LISTENING.load(Ordering::SeqCst) {
        std::hint::spin_loop();
        std::thread::sleep(std::time::Duration::from_millis(10));
    }

    println!("\nStopping!");
    device.stop().expect("Failed to stop device");
    println!("Stopped");
}

fn show_audio_devices(miniaudio_backend: &[miniaudio::Backend]) {
    let miniaudio_context =
        miniaudio::Context::new(miniaudio_backend, None).expect("failed to create context");
    miniaudio_context
        .with_capture_devices(|capture_devices| {
            println!("Capture Devices:");
            for (idx, device) in capture_devices.iter().enumerate() {
                println!("\t{}: {}", idx, device.name());
            }
        })
        .expect("failed to get devices");
}

fn main() {
    let matches = App::new("Picovoice Rhino Rust Mic Demo")
        .group(
            ArgGroup::with_name("contexts_group")
            .arg("context_path")
            .arg("show_audio_devices")
            .required(true)
        )
        .arg(
            Arg::with_name("context_path")
            .long("context_path")
            .value_name("PATH")
            .help("Path to Rhino context file (.rhn)")
            .takes_value(true)
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
        .arg(
            Arg::with_name("audio_device_index")
            .long("audio_device_index")
            .value_name("INDEX")
            .help("Index of input audio device.")
            .takes_value(true)
            .default_value("0")
        )
        .arg(
            Arg::with_name("audio_backend")
            .long("audio_backend")
            .value_name("BACKEND")
            .help("The name of a specific audio backend to use. Note: not all options will work on a given platform.")
            .takes_value(true)
            .possible_values(&["Wasapi", "DSound", "WinMM", "CoreAudio", "SNDIO", "Audio4", "OSS", "PulseAudio", "Alsa", "Jack", "AAudio", "OpenSL", "WebAudio"])
        )
        .arg(
            Arg::with_name("output_path")
            .long("output_path")
            .value_name("PATH")
            .help("Path to recorded audio (for debugging)")
            .takes_value(true)
        )
        .arg(
            Arg::with_name("show_audio_devices")
            .long("show_audio_devices")
        )
        .get_matches();

    let miniaudio_backend = match matches.value_of("audio_backend") {
        Some(audio_backend_str) => vec![match audio_backend_str {
            "Wasapi" => miniaudio::Backend::Wasapi,
            "DSound" => miniaudio::Backend::DSound,
            "WinMM" => miniaudio::Backend::WinMM,
            "CoreAudio" => miniaudio::Backend::CoreAudio,
            "SNDIO" => miniaudio::Backend::SNDIO,
            "Audio4" => miniaudio::Backend::Audio4,
            "OSS" => miniaudio::Backend::OSS,
            "PulseAudio" => miniaudio::Backend::PulseAudio,
            "Alsa" => miniaudio::Backend::Alsa,
            "Jack" => miniaudio::Backend::Jack,
            "AAudio" => miniaudio::Backend::AAudio,
            "OpenSL" => miniaudio::Backend::OpenSL,
            "WebAudio" => miniaudio::Backend::WebAudio,
            _ => panic!("Unsupported audio backend"),
        }],
        _ => vec![],
    };

    if matches.is_present("show_audio_devices") {
        return show_audio_devices(&miniaudio_backend);
    }

    let audio_device_index = matches
        .value_of("audio_device_index")
        .unwrap()
        .parse()
        .unwrap();

    let context_path = matches.value_of("context_path").unwrap();

    let sensitivity = match matches.value_of("sensitivity") {
        Some(sensitivity) => Some(sensitivity.parse().unwrap()),
        None => None,
    };
    let model_path = matches.value_of("model_path");
    let output_path = matches.value_of("output_path");

    rhino_demo(
        &miniaudio_backend,
        audio_device_index,
        context_path,
        sensitivity,
        model_path,
        output_path,
    );
}
