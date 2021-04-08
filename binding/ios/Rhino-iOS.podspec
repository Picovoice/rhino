Pod::Spec.new do |s|
    s.name = 'Rhino-iOS'
    s.module_name = 'Rhino'
    s.version = '1.6.0'
    s.license = {:type => 'Apache 2.0', :file => 'LICENSE'}
    s.summary = 'iOS SDK for Picovoice\'s Rhino Speech-to-Intent engine'
    s.description = 
    <<-DESC
    Rhino is Picovoice's Speech-to-Intent engine. It directly infers intent from spoken commands within a given context of
    interest, in real-time. For example, given a spoken command *"Can I have a small double-shot espresso?"*, Rhino infers that the user wants to order a drink and emits the following inference result:
    
    ```json
    {
      "type": "espresso",
      "size": "small",
      "numberOfShots": "2"
    }
    ```
    
    Rhino is:    
        * using deep neural networks trained in real-world environments.
        * compact and computationally-efficient, making it perfect for IoT.
        * self-service. Developers and designers can train custom models using [Picovoice Console](https://picovoice.ai/console/).
    DESC
    s.homepage = 'https://picovoice.ai/'
    s.documentation_url = 'https://picovoice.ai/docs/api/rhino-ios/'
    s.author = { 'Picovoice' => 'hello@picovoice.ai' }
    s.source = { :git => "https://github.com/Picovoice/rhino.git"}
    s.ios.deployment_target = '9.0'
    s.swift_version = '5.0'
    s.ios.framework = 'AVFoundation'
    s.vendored_frameworks = 'lib/ios/PvRhino.xcframework'
    s.resources = 'lib/common/rhino_params.pv'
    s.source_files = 'binding/ios/*.{swift}'
  end