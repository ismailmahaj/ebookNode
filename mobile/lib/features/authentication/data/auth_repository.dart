import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/api/dio_client.dart';
import '../../../core/auth/secure_token_storage.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/storage/shared_preferences_provider.dart';
import '../../../shared/models/user.dart';

const _onboardingKey = 'onboarding_completed';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    dio: ref.watch(dioClientProvider),
    storage: ref.watch(secureTokenStorageProvider),
    prefs: ref.watch(sharedPreferencesProvider),
  );
});

final authStateProvider = AsyncNotifierProvider<AuthNotifier, AuthState>(
  AuthNotifier.new,
);

class AuthState {
  const AuthState({this.user, this.isAuthenticated = false});

  final User? user;
  final bool isAuthenticated;

  AuthState copyWith({User? user, bool? isAuthenticated}) {
    return AuthState(
      user: user ?? this.user,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
    );
  }
}

class AuthNotifier extends AsyncNotifier<AuthState> {
  @override
  Future<AuthState> build() async {
    return const AuthState();
  }

  AuthRepository get _repo => ref.read(authRepositoryProvider);

  Future<bool> isOnboardingCompleted() => _repo.isOnboardingCompleted();

  Future<void> completeOnboarding() => _repo.completeOnboarding();

  Future<void> checkSession({bool silent = false}) async {
    if (!silent) {
      state = const AsyncLoading();
    }
    final result = await AsyncValue.guard(() async {
      final user = await _repo.getCurrentUser();
      if (user == null) return const AuthState();
      return AuthState(user: user, isAuthenticated: true);
    });
    if (result.hasError) {
      state = const AsyncData(AuthState());
      return;
    }
    state = result;
  }

  Future<void> login(String email, String password) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final user = await _repo.login(email, password);
      return AuthState(user: user, isAuthenticated: true);
    });
    if (state.hasError) throw state.error!;
  }

  Future<void> register({
    required String name,
    required String email,
    required String password,
    required String passwordConfirmation,
  }) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final user = await _repo.register(
        name: name,
        email: email,
        password: password,
        passwordConfirmation: passwordConfirmation,
      );
      return AuthState(user: user, isAuthenticated: true);
    });
    if (state.hasError) throw state.error!;
  }

  Future<void> logout() async {
    await _repo.logout();
    state = const AsyncData(AuthState());
  }
}

class AuthRepository {
  AuthRepository({
    required Dio dio,
    required SecureTokenStorage storage,
    required SharedPreferences prefs,
  }) : _dio = dio,
       _storage = storage,
       _prefs = prefs;

  final Dio _dio;
  final SecureTokenStorage _storage;
  final SharedPreferences _prefs;

  Future<bool> isOnboardingCompleted() async =>
      _prefs.getBool(_onboardingKey) ?? false;

  Future<void> completeOnboarding() => _prefs.setBool(_onboardingKey, true);

  Future<User?> getCurrentUser() async {
    if (!await _storage.hasToken()) return null;
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiConstants.authMe,
      );
      return User.fromJson(response.data!);
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        await _storage.deleteToken();
        return null;
      }
      // API injoignable — pas de session
      if (e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout) {
        return null;
      }
      throw mapDioException(e);
    }
  }

  Future<User> login(String email, String password) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.authLogin,
        data: {'email': email.trim(), 'password': password},
      );
      final data = response.data!;
      await _storage.writeToken(data['token'] as String);
      return User.fromJson(data['user'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<User> register({
    required String name,
    required String email,
    required String password,
    required String passwordConfirmation,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.authRegister,
        data: {
          'name': name.trim(),
          'email': email.trim().toLowerCase(),
          'password': password,
          'password_confirmation': passwordConfirmation,
        },
      );
      final data = response.data!;
      await _storage.writeToken(data['token'] as String);
      return User.fromJson(data['user'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<void> logout() async {
    try {
      await _dio.post(ApiConstants.authLogout);
    } catch (_) {
      // Ignore — token cleared locally anyway
    }
    await _storage.deleteToken();
  }
}
