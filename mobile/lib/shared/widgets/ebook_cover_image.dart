import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme/app_colors.dart';
import '../../features/home/data/ebook_repository.dart';

/// Couverture chargée via Dio (base API correcte), avec fallback placeholder.
class EbookCoverImage extends ConsumerWidget {
  const EbookCoverImage({
    super.key,
    required this.ebookId,
    this.fit = BoxFit.cover,
  });

  final int ebookId;
  final BoxFit fit;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncBytes = ref.watch(_coverBytesProvider(ebookId));

    return asyncBytes.when(
      loading: () => Container(color: AppColors.netflixCardBg),
      error: (_, __) => _placeholder(),
      data: (bytes) {
        if (bytes == null || bytes.isEmpty) return _placeholder();
        return Image.memory(
          Uint8List.fromList(bytes),
          fit: fit,
          gaplessPlayback: true,
          errorBuilder: (_, __, ___) => _placeholder(),
        );
      },
    );
  }

  Widget _placeholder() {
    return Container(
      color: AppColors.netflixCardBg,
      child: const Icon(Icons.menu_book, color: AppColors.netflixGray),
    );
  }
}

final _coverBytesProvider =
    FutureProvider.autoDispose.family<List<int>?, int>((ref, id) async {
  return ref.watch(ebookRepositoryProvider).fetchCoverBytes(id);
});
