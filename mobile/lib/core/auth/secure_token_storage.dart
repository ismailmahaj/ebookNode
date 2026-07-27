import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SecureTokenStorage {
  SecureTokenStorage({FlutterSecureStorage? storage, SharedPreferences? prefs})
    : _storage =
          storage ??
          const FlutterSecureStorage(
            iOptions: IOSOptions(
              accessibility: KeychainAccessibility.first_unlock,
            ),
            aOptions: AndroidOptions(encryptedSharedPreferences: true),
          ),
      _prefs = prefs;

  static const _tokenKey = 'auth_token';
  static const _fallbackKey = 'auth_token_fallback';
  static const _timeout = Duration(seconds: 3);

  final FlutterSecureStorage _storage;
  final SharedPreferences? _prefs;

  Future<String?> readToken() async {
    // En debug, SharedPreferences est plus fiable sur le simulateur iOS
    if (kDebugMode && _prefs != null) {
      final fallback = _prefs.getString(_fallbackKey);
      if (fallback != null && fallback.isNotEmpty) return fallback;
    }

    try {
      return await _storage
          .read(key: _tokenKey)
          .timeout(_timeout, onTimeout: () => null);
    } catch (_) {
      return _prefs?.getString(_fallbackKey);
    }
  }

  Future<void> writeToken(String token) async {
    if (kDebugMode && _prefs != null) {
      await _prefs.setString(_fallbackKey, token);
    }

    try {
      await _storage.write(key: _tokenKey, value: token).timeout(_timeout);
    } catch (_) {
      // Fallback déjà écrit en debug
    }
  }

  Future<void> deleteToken() async {
    if (_prefs != null) {
      await _prefs.remove(_fallbackKey);
    }

    try {
      await _storage.delete(key: _tokenKey).timeout(_timeout);
    } catch (_) {
      // Ignorer
    }
  }

  Future<bool> hasToken() async {
    final token = await readToken();
    return token != null && token.isNotEmpty;
  }
}
