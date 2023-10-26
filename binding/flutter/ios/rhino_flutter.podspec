Pod::Spec.new do |s|
  s.name             = 'rhino_flutter'
  s.version          = '3.0.0'
  s.summary          = 'A Flutter package plugin for Picovoice\'s Rhino Speech-to-Intent engine'
  s.description      = <<-DESC
  A Flutter package plugin for Picovoice\'s Rhino Speech-to-Intent engine
                       DESC
  s.homepage         = 'https://picovoice.ai/'
  s.license          = { :type => 'Apache-2.0' }
  s.author           = { 'Picovoice' => 'hello@picovoice.ai' }
  s.source           = { :git => "https://github.com/Picovoice/rhino.git" }
  s.source_files = 'Classes/**/*'
  s.platform = :ios, '11.0'
  s.dependency 'Flutter'
  s.dependency 'Rhino-iOS', '~> 3.0.0'

  s.swift_version = '5.0'
end