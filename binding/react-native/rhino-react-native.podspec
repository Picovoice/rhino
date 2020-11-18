require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "rhino-react-native"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "10.0" }
  s.source       = { :git => "https://github.com/Picovoice/rhino.git", :tag => "#{s.version}" }

  s.source_files = "ios/*.{h,m,mm,swift}"
  
  s.preserve_paths = 'ios/**/*.*'
  s.resources = 'ios/resources/**/*.*'
  
  s.pod_target_xcconfig = { 'OTHER_LDFLAGS' => '-ObjC'}

  s.subspec 'pv_rhino' do |sc|    
    sc.pod_target_xcconfig = {
      'SWIFT_INCLUDE_PATHS' => '$(PODS_TARGET_SRCROOT)/ios/pv_rhino',
      'OTHER_CFLAGS' => '-Xcc -fmodule-map-file="${PODS_TARGET_SRCROOT}/ios/pv_rhino/module.private.modulemap"',
      'OTHER_SWIFT_FLAGS' => '-Xcc -fmodule-map-file="${PODS_TARGET_SRCROOT}/ios/pv_rhino/module.private.modulemap"'
    }
    
    sc.vendored_libraries = 'ios/pv_rhino/libpv_rhino.a'
    sc.source_files = 'ios/pv_rhino/pv_rhino.h', 'ios/pv_rhino/picovoice.h'
    sc.preserve_paths = 'ios/pv_rhino/*.*'
  end

  s.dependency "React"
end
