import ExpoModulesCore

@ExpoModule("AccrualSqliteFunctions")
public class AccrualSqliteFunctionsModule: Module {
  /// Returns "" because new connections pick the functions up automatically.
  @JS
  nonisolated func prepare() throws -> String {
    let code = AccrualSqlInstall()
    if code != 0 {
      throw Exception(name: "ERR_ACCRUAL_SQL", description: "Could not register SQL functions (SQLite code \(code))")
    }
    return ""
  }
}
