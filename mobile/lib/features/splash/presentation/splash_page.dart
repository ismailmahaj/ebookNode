import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/app_colors.dart';
import '../../../core/storage/shared_preferences_provider.dart';
import '../../authentication/data/auth_repository.dart';

class SplashPage extends ConsumerStatefulWidget {
  const SplashPage({super.key});

  @override
  ConsumerState<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends ConsumerState<SplashPage> {
  static const _onboardingKey = 'onboarding_completed';
  bool _started = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  Future<void> _bootstrap() async {
    if (_started) return;
    _started = true;

    // Affichage minimum du splash
    await Future<void>.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;

    // Onboarding via SharedPreferences uniquement (jamais bloquant)
    final prefs = ref.read(sharedPreferencesProvider);
    final onboardingDone = prefs.getBool(_onboardingKey) ?? false;

    // Session : timeout court, ne jamais bloquer le splash
    try {
      await ref
          .read(authStateProvider.notifier)
          .checkSession(silent: true)
          .timeout(const Duration(seconds: 4));
    } catch (_) {
      // Ignore — on ira vers login / onboarding
    }

    if (!mounted) return;

    final isAuthenticated =
        ref.read(authStateProvider).valueOrNull?.isAuthenticated ?? false;

    if (isAuthenticated) {
      context.go('/');
    } else if (!onboardingDone) {
      context.go('/onboarding');
    } else {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: AppColors.netflixBlack,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.menu_book, size: 64, color: AppColors.netflixRed),
            SizedBox(height: 16),
            Text(
              'E-BOOK',
              style: TextStyle(
                fontSize: 36,
                fontWeight: FontWeight.bold,
                color: Colors.white,
                letterSpacing: 4,
              ),
            ),
            SizedBox(height: 32),
            SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.netflixRed,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
