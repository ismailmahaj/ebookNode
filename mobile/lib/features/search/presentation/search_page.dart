import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/app_colors.dart';
import '../../../core/api/api_exceptions.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_state.dart';
import '../../../shared/models/ebook.dart';
import '../../../shared/widgets/ebook_cover_card.dart';
import '../../home/data/ebook_repository.dart';

final searchQueryProvider = StateProvider.autoDispose<String>((ref) => '');

final searchResultsProvider =
    FutureProvider.autoDispose<List<Ebook>>((ref) async {
  final query = ref.watch(searchQueryProvider).trim();
  if (query.isEmpty) return [];
  final page = await ref.watch(ebookRepositoryProvider).getEbooks(
        search: query,
        perPage: 50,
      );
  return page.data;
});

class SearchPage extends ConsumerStatefulWidget {
  const SearchPage({super.key});

  @override
  ConsumerState<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends ConsumerState<SearchPage> {
  final _controller = TextEditingController();
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      ref.read(searchQueryProvider.notifier).state = value;
    });
  }

  @override
  Widget build(BuildContext context) {
    final query = ref.watch(searchQueryProvider);
    final resultsAsync = ref.watch(searchResultsProvider);

    return Scaffold(
      backgroundColor: AppColors.netflixBlack,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: TextField(
                controller: _controller,
                onChanged: _onChanged,
                decoration: InputDecoration(
                  hintText: 'Titre, auteur...',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: query.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            _controller.clear();
                            ref.read(searchQueryProvider.notifier).state = '';
                          },
                        )
                      : null,
                ),
              ),
            ),
            Expanded(
              child: query.isEmpty
                  ? const EmptyState(
                      title: 'Rechercher',
                      subtitle: 'Tapez un titre ou un auteur',
                      icon: Icons.search,
                    )
                  : resultsAsync.when(
                      loading: () => const Center(
                        child: CircularProgressIndicator(
                          color: AppColors.netflixRed,
                        ),
                      ),
                      error: (error, _) => ErrorState(
                        message: error is AppException
                            ? error.message
                            : 'Erreur de recherche',
                        onRetry: () => ref.invalidate(searchResultsProvider),
                      ),
                      data: (ebooks) {
                        if (ebooks.isEmpty) {
                          return EmptyState(
                            title: 'Aucun résultat',
                            subtitle: 'Rien pour « $query »',
                            icon: Icons.search_off,
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
                            final ebook = ebooks[i];
                            return EbookCoverCard(
                              ebook: ebook,
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
