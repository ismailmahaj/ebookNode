import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/app_colors.dart';
import '../../shared/models/ebook.dart';

class EbookCoverCard extends StatelessWidget {
  const EbookCoverCard({
    super.key,
    required this.ebook,
    required this.coverUrl,
    this.width = 120,
  });

  final Ebook ebook;
  final String coverUrl;
  final double width;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/ebook/${ebook.id}'),
      child: SizedBox(
        width: width,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: AspectRatio(
                aspectRatio: 2 / 3,
                child: coverUrl.isEmpty
                    ? Container(
                        color: AppColors.netflixCardBg,
                        child: const Icon(
                          Icons.menu_book,
                          color: AppColors.netflixGray,
                        ),
                      )
                    : CachedNetworkImage(
                        imageUrl: coverUrl,
                        fit: BoxFit.cover,
                        placeholder: (_, __) => Container(
                          color: AppColors.netflixCardBg,
                        ),
                        errorWidget: (_, __, ___) => Container(
                          color: AppColors.netflixCardBg,
                          child: const Icon(
                            Icons.broken_image,
                            color: AppColors.netflixGray,
                          ),
                        ),
                      ),
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
