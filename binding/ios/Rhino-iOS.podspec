Pod::Spec.new do |s|
    s.name = 'Rhino-iOS'
    s.module_name = 'Rhino'
    s.version = '2.1.3'
    s.license = {:type => 'Apache 2.0'}
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
    s.homepage = 'https://github.com/Picovoice/rhino/tree/master/binding/ios'
    s.author = { 'Picovoice' => 'hello@picovoice.ai' }
    s.source = { :git => "https://github.com/Picovoice/rhino.git", :tag => "Rhino-iOS-v2.1.3" }
    s.ios.deployment_target = '9.0'
    s.swift_version = '5.0'
    s.vendored_frameworks = 'lib/ios/PvRhino.xcframework'
    s.resource_bundles = {
      'RhinoResources' => [
        'lib/common/rhino_params.pv'
      ]
    }
    s.source_files = 'binding/ios/*.{swift}'
    s.exclude_files = 'binding/ios/RhinoAppTest/**'
    
    s.dependency 'ios-voice-processor', '~> 1.0.2'
  end
