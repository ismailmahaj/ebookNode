import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/app_colors.dart';
import '../../../core/widgets/app_button.dart';
import '../../authentication/data/auth_repository.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final user = auth.valueOrNull?.user;
    final isLoading = auth.isLoading;

    return Scaffold(
      backgroundColor: AppColors.netflixBlack,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Profil', style: Theme.of(context).textTheme.displaySmall),
              const SizedBox(height: 24),
              if (user != null) ...[
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: CircleAvatar(
                    backgroundColor: AppColors.netflixRed,
                    child: Text(
                      user.name.isNotEmpty ? user.name[0].toUpperCase() : '?',
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                  title: Text(user.name),
                  subtitle: Text(user.email),
                ),
                const SizedBox(height: 8),
                _InfoRow(
                  label: 'Abonnement',
                  value: user.hasActiveSubscription ? 'Actif' : 'Inactif',
                ),
                if (!user.hasActiveSubscription && !user.isAdmin) ...[
                  const SizedBox(height: 16),
                  AppButton(
                    label: 'S\'abonner',
                    icon: Icons.workspace_premium,
                    onPressed: () => context.push('/subscription'),
                  ),
                ],
                const Spacer(),
                AppButton(
                  label: 'Déconnexion',
                  isOutlined: true,
                  onPressed: () async {
                    await ref.read(authStateProvider.notifier).logout();
                    if (context.mounted) context.go('/login');
                  },
                ),
              ] else if (isLoading)
                const Center(child: CircularProgressIndicator())
              else
                Center(
                  child: Text(
                    'Non connecté',
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.netflixGray)),
          Text(value),
        ],
      ),
    );
  }
}
