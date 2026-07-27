import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/app_colors.dart';
import '../../../core/api/api_exceptions.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/error_state.dart';
import '../../../shared/widgets/ebook_cover_image.dart';
import '../../authentication/data/auth_repository.dart';
import '../../home/data/ebook_repository.dart';

class EbookDetailPage extends ConsumerWidget {
  const EbookDetailPage({super.key, required this.id});

  final int id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ebookAsync = ref.watch(ebookDetailProvider(id));
    final user = ref.watch(authStateProvider).valueOrNull?.user;
    final hasSubscription =
        user?.isAdmin == true || user?.hasActiveSubscription == true;

    return Scaffold(
      backgroundColor: AppColors.netflixBlack,
      body: ebookAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.netflixRed),
        ),
        error: (error, _) => ErrorState(
          message: error is AppException
              ? error.message
              : 'Livre introuvable',
          onRetry: () => ref.invalidate(ebookDetailProvider(id)),
        ),
        data: (ebook) {
          return CustomScrollView(
            slivers: [
              SliverAppBar(
                pinned: true,
                backgroundColor: AppColors.netflixBlack,
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () => context.pop(),
                ),
                title: const Text('E-BOOK'),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: SizedBox(
                            width: 180,
                            child: AspectRatio(
                              aspectRatio: 2 / 3,
                              child: EbookCoverImage(ebookId: ebook.id),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        ebook.title,
                        style: Theme.of(context).textTheme.displaySmall,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        ebook.author,
                        style: const TextStyle(
                          color: AppColors.netflixRed,
                          fontWeight: FontWeight.w600,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 12),
                      if (ebook.categories.isNotEmpty)
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: ebook.categories
                              .map(
                                (c) => Chip(
                                  label: Text(c.name),
                                  backgroundColor: Colors.white10,
                                  labelStyle: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                  ),
                                  side: BorderSide.none,
                                ),
                              )
                              .toList(),
                        ),
                      const SizedBox(height: 12),
                      Text(
                        '${ebook.totalPages} pages · aperçu ${ebook.previewPages} pages',
                        style: const TextStyle(color: AppColors.netflixGray),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        ebook.description,
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                      const SizedBox(height: 28),
                      AppButton(
                        label: 'Lire l\'aperçu gratuit',
                        icon: Icons.menu_book,
                        onPressed: () =>
                            context.push('/reader/${ebook.id}?preview=1'),
                      ),
                      const SizedBox(height: 12),
                      if (hasSubscription)
                        AppButton(
                          label: 'Lire le livre',
                          isOutlined: true,
                          icon: Icons.chrome_reader_mode,
                          onPressed: () =>
                              context.push('/reader/${ebook.id}'),
                        )
                      else
                        AppButton(
                          label: 'S\'abonner pour lire en entier',
                          isOutlined: true,
                          icon: Icons.workspace_premium,
                          onPressed: () => context.push('/subscription'),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
