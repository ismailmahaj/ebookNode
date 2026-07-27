import 'package:flutter/material.dart';

import '../../../app/theme/app_colors.dart';
import '../../../core/widgets/empty_state.dart';

class SubscriptionPage extends StatelessWidget {
  const SubscriptionPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.netflixBlack,
      appBar: AppBar(title: const Text('Premium')),
      body: const EmptyState(
        title: 'Abonnement Premium',
        subtitle: 'Paywall et checkout — Phase 7 (IAP + web)',
        icon: Icons.workspace_premium,
      ),
    );
  }
}
