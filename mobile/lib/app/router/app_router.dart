import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/home/presentation/home_page.dart';
import '../../features/discovery/presentation/discovery_page.dart';
import '../../features/library/presentation/library_page.dart';
import '../../features/search/presentation/search_page.dart';
import '../../features/profile/presentation/profile_page.dart';
import '../../features/authentication/data/auth_repository.dart';
import '../../features/authentication/presentation/login_page.dart';
import '../../features/authentication/presentation/register_page.dart';
import '../../features/ebook_details/presentation/ebook_detail_page.dart';
import '../../features/onboarding/presentation/onboarding_page.dart';
import '../../features/reader/presentation/reader_page.dart';
import '../../features/splash/presentation/splash_page.dart';
import '../../features/subscription/presentation/subscription_page.dart';
import '../../shared/widgets/main_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _RouterRefresh(ref);

  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final authState = ref.read(authStateProvider);
      final isAuthenticated = authState.valueOrNull?.isAuthenticated ?? false;
      final path = state.matchedLocation;

      final isAuthRoute = path == '/login' || path == '/register';
      final isPublicRoute = path == '/splash' ||
          path == '/onboarding' ||
          isAuthRoute;

      // Le splash gère sa propre navigation
      if (path == '/splash') return null;

      if (!isAuthenticated && !isPublicRoute) {
        return '/login';
      }

      if (isAuthenticated && isAuthRoute) {
        return '/';
      }

      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashPage()),
      GoRoute(path: '/onboarding', builder: (_, __) => const OnboardingPage()),
      GoRoute(path: '/login', builder: (_, __) => const LoginPage()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterPage()),
      GoRoute(
        path: '/subscription',
        builder: (_, __) => const SubscriptionPage(),
      ),
      GoRoute(
        path: '/ebook/:id',
        builder: (_, state) =>
            EbookDetailPage(id: int.parse(state.pathParameters['id']!)),
      ),
      GoRoute(
        path: '/reader/:id',
        builder: (_, state) => ReaderPage(
          id: int.parse(state.pathParameters['id']!),
          preview: state.uri.queryParameters['preview'] == '1',
        ),
      ),
      StatefulShellRoute.indexedStack(
        builder: (_, __, navigationShell) =>
            MainShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [GoRoute(path: '/', builder: (_, __) => const HomePage())],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/explore',
                builder: (_, __) => const DiscoveryPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/library',
                builder: (_, __) => const LibraryPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/search', builder: (_, __) => const SearchPage()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                builder: (_, __) => const ProfilePage(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});

class _RouterRefresh extends ChangeNotifier {
  _RouterRefresh(this._ref) {
    _ref.listen(authStateProvider, (_, __) => notifyListeners());
  }

  final Ref _ref;
}
