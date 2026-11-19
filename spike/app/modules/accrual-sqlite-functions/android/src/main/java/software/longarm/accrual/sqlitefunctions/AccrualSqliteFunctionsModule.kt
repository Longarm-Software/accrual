package software.longarm.accrual.sqlitefunctions

import io.github.expo.modules.v2.ExpoModule
import io.github.expo.modules.v2.JS
import io.github.expo.modules.v2.Module

@ExpoModule("AccrualSqliteFunctions")
class AccrualSqliteFunctionsModule : Module() {
  /**
   * The shared library that expo-sqlite must load into each connection.
   * It is packaged with the app, so the dynamic linker finds it by name.
   */
  @JS
  fun prepare(): String = "libaccrualsql.so"
}
