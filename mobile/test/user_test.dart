import 'package:flutter_test/flutter_test.dart';

import 'package:ebook_app/shared/models/user.dart';

void main() {
  group('User', () {
    test('fromJson parses API response', () {
      final user = User.fromJson({
        'id': 1,
        'name': 'Jean Dupont',
        'email': 'jean@exemple.com',
        'is_admin': false,
        'subscription_status': 'active',
        'subscription_ends_at': '2026-08-01T00:00:00.000Z',
        'has_active_subscription': true,
      });

      expect(user.id, 1);
      expect(user.name, 'Jean Dupont');
      expect(user.email, 'jean@exemple.com');
      expect(user.hasActiveSubscription, isTrue);
    });

    test('fromJson handles admin flag', () {
      final user = User.fromJson({
        'id': 2,
        'name': 'Admin',
        'email': 'admin@exemple.com',
        'is_admin': true,
        'has_active_subscription': true,
      });

      expect(user.isAdmin, isTrue);
    });
  });
}
