/// Centralized, compile-time synchronized build and version metadata.
/// Updated via semantic release versioning and injected via --dart-define in CI.
class BuildInfo {
  BuildInfo._();

  static const String appVersion = String.fromEnvironment(
    'APP_VERSION',
    defaultValue: '2.0.1',
  );

  static const String buildNumber = String.fromEnvironment(
    'APP_BUILD_NUMBER',
    defaultValue: '11',
  );

  static const String editorVersion = String.fromEnvironment(
    'EDITOR_VERSION',
    defaultValue: '5.0',
  );

  static const String commitSha = String.fromEnvironment(
    'GIT_COMMIT_SHA',
    defaultValue: 'local',
  );

  static const String buildTimestamp = String.fromEnvironment(
    'BUILD_TIMESTAMP',
    defaultValue: 'local',
  );

  static String get fullVersion => '$appVersion (Build $buildNumber)';

  static String get shortCommitSha =>
      commitSha.length > 7 ? commitSha.substring(0, 7) : commitSha;

  static String get diagnosticsSummary =>
      'Application Version: $appVersion\n'
      'Build Number: $buildNumber\n'
      'PDF Editor Version: $editorVersion\n'
      'Source Commit SHA: $shortCommitSha\n'
      'Build Timestamp: $buildTimestamp';
}
