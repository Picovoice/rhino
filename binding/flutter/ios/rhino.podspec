Pod::Spec.new do |s|
  s.name             = 'rhino'
  s.version          = '1.6.0'
  s.summary          = 'A Flutter package plugin for Picovoice\'s Rhino Speech-to-Intent engine'
  s.description      = <<-DESC
  A Flutter package plugin for Picovoice\'s Rhino Speech-to-Intent engine
                       DESC
  s.homepage         = 'https://picovoice.ai/'
  s.license          = { :type => 'Apache-2.0' }
  s.author           = { 'Picovoice' => 'hello@picovoice.ai' }
  s.source           = { :git => "https://github.com/Picovoice/rhino.git" }
  s.source_files = 'Classes/**/*'
  s.platform = :ios, '9.0'
  s.dependency 'Flutter'
  s.static_framework = true

  # Flutter.framework does not contain a i386 slice.
  s.pod_target_xcconfig = { 
    'OTHER_LDFLAGS' => '-ObjC',
    'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'i386'}

    s.subspec 'pv_rhino' do |sc|    
      sc.pod_target_xcconfig = {
        'SWIFT_INCLUDE_PATHS' => '$(PODS_TARGET_SRCROOT)/pv_rhino',
        'OTHER_CFLAGS' => '-Xcc -fmodule-map-file="${PODS_TARGET_SRCROOT}/pv_rhino/module.private.modulemap"',
        'OTHER_SWIFT_FLAGS' => '-Xcc -fmodule-map-file="${PODS_TARGET_SRCROOT}/pv_rhino/module.private.modulemap"',        
      }
      
      sc.vendored_libraries = 'pv_rhino/libpv_rhino.a'
      sc.source_files = 'pv_rhino/pv_rhino.h', 'pv_rhino/picovoice.h'
      sc.public_header_files = 'pv_rhino/pv_rhino.h', 'pv_rhino/picovoice.h'
      sc.preserve_paths = 'pv_rhino/libpv_rhino.a', 'pv_rhino/module.private.modulemap'
    end

  s.swift_version = '5.0'
end