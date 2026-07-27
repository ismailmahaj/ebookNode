import 'package:flutter_dotenv/flutter_dotenv.dart';

enum AppEnvironment { development, staging, production }

class EnvConfig {
  const EnvConfig({required this.apiBaseUrl, required this.environment});

  final String apiBaseUrl;
  final AppEnvironment environment;

  String get apiUrl => '$apiBaseUrl/api';

  bool get isProduction => environment == AppEnvironment.production;

  static Future<EnvConfig> load() async {
    await dotenv.load(fileName: '.env');

    final envName = dotenv.env['ENVIRONMENT'] ?? 'development';
    final environment = AppEnvironment.values.firstWhere(
      (e) => e.name == envName,
      orElse: () => AppEnvironment.development,
    );

    return EnvConfig(
      apiBaseUrl:
          dotenv.env['API_BASE_URL'] ??
          'https://ebooknode-production-06ee.up.railway.app',
      environment: environment,
    );
  }
}
