import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/app_colors.dart';
import '../../../core/api/api_exceptions.dart';
import '../../../core/widgets/app_skeleton.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_state.dart';
import '../../../shared/widgets/ebook_cover_card.dart';
import '../../home/data/ebook_repository.dart';

class DiscoveryPage extends ConsumerWidget {
  const DiscoveryPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ebooksAsync = ref.watch(ebooksProvider);

    return Scaffold(
      backgroundColor: AppColors.netflixBlack,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'Explorer',
                style: Theme.of(context).textTheme.displaySmall,
              ),
            ),
            Expanded(
              child: ebooksAsync.when(
                loading: () => const AppSkeletonList(),
                error: (error, _) => ErrorState(
                  message: error is AppException
                      ? error.message
                      : 'Erreur de chargement',
                  onRetry: () => ref.invalidate(ebooksProvider),
                ),
                data: (ebooks) {
                  if (ebooks.isEmpty) {
                    return const EmptyState(
                      title: 'Aucun contenu',
                      subtitle: 'Aucun ebook à explorer',
                    );
                  }

                  return GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      childAspectRatio: 0.52,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 16,
                    ),
                    itemCount: ebooks.length,
                    itemBuilder: (_, i) {
                      return EbookCoverCard(
                        ebook: ebooks[i],
                        width: double.infinity,
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
