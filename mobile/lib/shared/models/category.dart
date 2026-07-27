class Category {
  const Category({
    required this.id,
    required this.name,
    required this.slug,
    this.description,
    this.imageUrl,
    this.ebooksCount,
  });

  final int id;
  final String name;
  final String slug;
  final String? description;
  final String? imageUrl;
  final int? ebooksCount;

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'] as int,
      name: json['name'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      description: json['description'] as String?,
      imageUrl: json['image_url'] as String?,
      ebooksCount: json['ebooks_count'] as int?,
    );
  }
}
