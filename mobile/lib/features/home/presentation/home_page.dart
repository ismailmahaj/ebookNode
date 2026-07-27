import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/app_colors.dart';
import '../../../core/api/api_exceptions.dart';
import '../../../core/widgets/app_skeleton.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_state.dart';
import '../../../shared/models/ebook.dart';
import '../../../shared/widgets/ebook_cover_card.dart';
import '../../../shared/widgets/ebook_cover_image.dart';
import '../data/ebook_repository.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ebooksAsync = ref.watch(ebooksProvider);

    return Scaffold(
      backgroundColor: AppColors.netflixBlack,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.netflixRed,
          onRefresh: () async {
            ref.invalidate(ebooksProvider);
            await ref.read(ebooksProvider.future);
          },
          child: ebooksAsync.when(
            loading: () => const AppSkeletonList(),
            error: (error, _) => ErrorState(
              message: error is AppException
                  ? error.message
                  : 'Impossible de charger le catalogue',
              onRetry: () => ref.invalidate(ebooksProvider),
            ),
            data: (ebooks) {
              if (ebooks.isEmpty) {
                return const CustomScrollView(
                  physics: AlwaysScrollableScrollPhysics(),
                  slivers: [
                    SliverFillRemaining(
                      child: EmptyState(
                        title: 'Aucun ebook',
                        subtitle: 'Le catalogue est vide pour le moment',
                        icon: Icons.menu_book_outlined,
                      ),
                    ),
                  ],
                );
              }

              final featured = ebooks.where((e) => e.isFeatured).toList();
              final hero = featured.isNotEmpty ? featured.first : ebooks.first;
              final byCategory = _groupByCategory(ebooks);

              return CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.menu_book,
                            color: AppColors.netflixRed,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'E-BOOK',
                            style: Theme.of(context).textTheme.displaySmall,
                          ),
                        ],
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(child: _HeroSection(ebook: hero)),
                  if (featured.length > 1)
                    SliverToBoxAdapter(
                      child: _CarouselSection(
                        title: 'À ne pas manquer',
                        ebooks: featured,
                      ),
                    ),
                  SliverToBoxAdapter(
                    child: _CarouselSection(
                      title: 'Ajouts récents',
                      ebooks: ebooks,
                    ),
                  ),
                  ...byCategory.entries.map(
                    (entry) => SliverToBoxAdapter(
                      child: _CarouselSection(
                        title: entry.key,
                        ebooks: entry.value,
                      ),
                    ),
                  ),
                  const SliverToBoxAdapter(child: SizedBox(height: 24)),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Map<String, List<Ebook>> _groupByCategory(List<Ebook> ebooks) {
    final map = <String, List<Ebook>>{};
    for (final ebook in ebooks) {
      for (final cat in ebook.categories) {
        map.putIfAbsent(cat.name, () => []);
        if (!map[cat.name]!.any((e) => e.id == ebook.id)) {
          map[cat.name]!.add(ebook);
        }
      }
    }
    return map;
  }
}

class _HeroSection extends StatelessWidget {
  const _HeroSection({required this.ebook});

  final Ebook ebook;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      child: GestureDetector(
        onTap: () => context.push('/ebook/${ebook.id}'),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: SizedBox(
            height: 220,
            child: Stack(
              fit: StackFit.expand,
              children: [
                EbookCoverImage(ebookId: ebook.id, fit: BoxFit.cover),
                Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        Colors.black.withValues(alpha: 0.85),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        ebook.title,
                        style: Theme.of(context).textTheme.displaySmall?.copyWith(
                              color: Colors.white,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${ebook.author} · ${ebook.totalPages} pages',
                        style: const TextStyle(color: AppColors.netflixWhite),
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton.icon(
                        onPressed: () => context.push('/ebook/${ebook.id}'),
                        icon: const Icon(Icons.menu_book, size: 18),
                        label: const Text('Voir le détail'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CarouselSection extends StatelessWidget {
  const _CarouselSection({
    required this.title,
    required this.ebooks,
  });

  final String title;
  final List<Ebook> ebooks;

  @override
  Widget build(BuildContext context) {
    if (ebooks.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
          child: Text(
            title,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: Colors.white,
                ),
          ),
        ),
        SizedBox(
          height: 230,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: ebooks.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (_, i) => EbookCoverCard(ebook: ebooks[i]),
          ),
        ),
      ],
    );
  }
}
