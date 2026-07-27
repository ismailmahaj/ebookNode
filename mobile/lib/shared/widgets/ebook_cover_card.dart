import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/app_colors.dart';
import '../../shared/models/ebook.dart';
import 'ebook_cover_image.dart';

class EbookCoverCard extends StatelessWidget {
  const EbookCoverCard({
    super.key,
    required this.ebook,
    this.width = 120,
  });

  final Ebook ebook;
  final double width;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/ebook/${ebook.id}'),
      child: SizedBox(
        width: width,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: AspectRatio(
                aspectRatio: 2 / 3,
                child: EbookCoverImage(ebookId: ebook.id),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              ebook.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
            Text(
              ebook.author,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppColors.netflixGray,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
