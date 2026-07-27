import 'category.dart';

class Ebook {
  const Ebook({
    required this.id,
    required this.title,
    required this.slug,
    required this.author,
    required this.description,
    required this.coverImageUrl,
    required this.totalPages,
    required this.previewPages,
    this.isbn,
    this.pdfFileSize = 0,
    this.publishedAt,
    this.isFeatured = false,
    this.isActive = true,
    this.categories = const [],
    this.totalViews,
  });

  final int id;
  final String title;
  final String slug;
  final String author;
  final String description;
  final String? isbn;
  final String coverImageUrl;
  final int pdfFileSize;
  final int totalPages;
  final int previewPages;
  final String? publishedAt;
  final bool isFeatured;
  final bool isActive;
  final List<Category> categories;
  final int? totalViews;

  factory Ebook.fromJson(Map<String, dynamic> json) {
    final cats = (json['categories'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(Category.fromJson)
        .toList();

    return Ebook(
      id: json['id'] as int,
      title: json['title'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      author: json['author'] as String? ?? '',
      description: json['description'] as String? ?? '',
      isbn: json['isbn'] as String?,
      coverImageUrl: json['cover_image_url'] as String? ?? '',
      pdfFileSize: (json['pdf_file_size'] as num?)?.toInt() ?? 0,
      totalPages: (json['total_pages'] as num?)?.toInt() ?? 0,
      previewPages: (json['preview_pages'] as num?)?.toInt() ?? 10,
      publishedAt: json['published_at'] as String?,
      isFeatured: json['is_featured'] == true,
      isActive: json['is_active'] != false,
      categories: cats,
      totalViews: (json['total_views'] as num?)?.toInt(),
    );
  }
}

class EbooksPage {
  const EbooksPage({
    required this.data,
    required this.currentPage,
    required this.lastPage,
    required this.perPage,
    required this.total,
  });

  final List<Ebook> data;
  final int currentPage;
  final int lastPage;
  final int perPage;
  final int total;

  factory EbooksPage.fromJson(Map<String, dynamic> json) {
    final items = (json['data'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(Ebook.fromJson)
        .toList();

    return EbooksPage(
      data: items,
      currentPage: (json['current_page'] as num?)?.toInt() ?? 1,
      lastPage: (json['last_page'] as num?)?.toInt() ?? 1,
      perPage: (json['per_page'] as num?)?.toInt() ?? 20,
      total: (json['total'] as num?)?.toInt() ?? items.length,
    );
  }
}
