import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/config/env_config.dart';
import '../storage/shared_preferences_provider.dart';
import '../auth/secure_token_storage.dart';
import 'api_exceptions.dart';

final envConfigProvider = Provider<EnvConfig>((ref) {
  throw UnimplementedError('EnvConfig must be overridden in main()');
});

final secureTokenStorageProvider = Provider<SecureTokenStorage>((ref) {
  return SecureTokenStorage(prefs: ref.watch(sharedPreferencesProvider));
});

final dioClientProvider = Provider<Dio>((ref) {
  final config = ref.watch(envConfigProvider);
  final storage = ref.watch(secureTokenStorageProvider);

  final dio = Dio(
    BaseOptions(
      baseUrl: config.apiUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await storage.readToken();
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) {
        handler.reject(error);
      },
    ),
  );

  if (!config.isProduction) {
    dio.interceptors.add(
      LogInterceptor(
        requestBody: true,
        responseBody: false,
        logPrint: (o) => print('[API] $o'),
      ),
    );
  }

  return dio;
});

AppException mapDioException(DioException error) {
  switch (error.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
    case DioExceptionType.connectionError:
      return const NetworkException();
    case DioExceptionType.badResponse:
      return _mapResponseError(error.response);
    case DioExceptionType.cancel:
      return const AppException('Requête annulée.');
    default:
      return const NetworkException();
  }
}

AppException _mapResponseError(Response<dynamic>? response) {
  final status = response?.statusCode ?? 0;
  final data = response?.data;
  String message = 'Une erreur est survenue.';

  if (data is Map<String, dynamic>) {
    message = data['message'] as String? ?? message;
    if (status == 422 && data['errors'] is Map) {
      final errors = <String, List<String>>{};
      (data['errors'] as Map).forEach((key, value) {
        if (value is List) {
          errors[key.toString()] = value.map((e) => e.toString()).toList();
        }
      });
      return ValidationException(message, fieldErrors: errors);
    }
  }

  return switch (status) {
    401 => const SessionExpiredException(),
    403 => AppException(message),
    404 => AppException(message),
    503 => AppException(message),
    >= 500 => AppException(message.isEmpty || message == 'Une erreur est survenue.'
        ? 'Erreur serveur. Réessayez plus tard.'
        : message),
    _ => AppException(message),
  };
}
