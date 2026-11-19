require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'AccrualSqliteFunctions'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/Longarm-Software/accrual.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  # The extension registers itself with the SQLite build inside ExpoSQLite.
  s.dependency 'ExpoSQLite'

  s.source_files = 'ios/**/*.{h,m,swift}', 'cpp/accrualsql.c', 'cpp/vendor/quickjs/*.c'
  # Vendored headers are found by relative #include. Keeping them out of
  # source_files keeps our sqlite3.h out of every header map.
  s.preserve_paths = 'cpp/**/*.h'
  s.public_header_files = 'ios/AccrualSqlInstall.h'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    'GCC_WARN_INHIBIT_ALL_WARNINGS' => 'YES'
  }
end
