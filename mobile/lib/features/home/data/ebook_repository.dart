import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/config/env_config.dart';
import '../../../core/api/api_exceptions.dart';
import '../../../core/api/dio_client.dart';
import '../../../core/constants/api_constants.dart';
import '../../../shared/models/category.dart';
import '../../../shared/models/ebook.dart';

final ebookRepositoryProvider = Provider<EbookRepository>((ref) {
  return EbookRepository(
    dio: ref.watch(dioClientProvider),
    config: ref.watch(envConfigProvider),
  );
});

final ebooksProvider = FutureProvider.autoDispose<List<Ebook>>((ref) async {
  final repo = ref.watch(ebookRepositoryProvider);
  final page = await repo.getEbooks(perPage: 100);
  return page.data;
});

final ebookDetailProvider =
    FutureProvider.autoDispose.family<Ebook, int>((ref, id) async {
  return ref.watch(ebookRepositoryProvider).getEbook(id);
});

final categoriesProvider =
    FutureProvider.autoDispose<List<Category>>((ref) async {
  return ref.watch(ebookRepositoryProvider).getCategories();
});

class EbookRepository {
  EbookRepository({required Dio dio, required EnvConfig config})
      : _dio = dio,
        _config = config;

  final Dio _dio;
  final EnvConfig _config;

  String resolveMediaUrl(String? path) {
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    final normalized = path.startsWith('/') ? path : '/$path';
    return '${_config.apiBaseUrl}$normalized';
  }

  Future<EbooksPage> getEbooks({
    int page = 1,
    int perPage = 20,
    String? search,
    int? categoryId,
    bool? featured,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiConstants.ebooks,
        queryParameters: {
          'page': page,
          'per_page': perPage,
          if (search != null && search.isNotEmpty) 'search': search,
          if (categoryId != null) 'category_id': categoryId,
          if (featured == true) 'featured': true,
          'sort_by': 'created_at',
          'sort_order': 'desc',
        },
      );
      return EbooksPage.fromJson(response.data!);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<Ebook> getEbook(int id) async {
    try {
      final response =
          await _dio.get<Map<String, dynamic>>(ApiConstants.ebook(id));
      return Ebook.fromJson(response.data!);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  /// Télécharge le PDF (aperçu ou complet) avec auth Bearer.
  Future<List<int>> fetchPdfBytes(int id, {required bool preview}) async {
    try {
      final response = await _dio.get<List<int>>(
        preview ? ApiConstants.ebookPreview(id) : ApiConstants.ebookStream(id),
        options: Options(
          responseType: ResponseType.bytes,
          receiveTimeout: const Duration(minutes: 3),
        ),
      );
      final data = response.data;
      if (data == null || data.isEmpty) {
        throw const AppException('PDF vide ou indisponible.');
      }
      return data;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  /// Charge les octets de couverture via Dio (même base URL que l'API).
  Future<List<int>?> fetchCoverBytes(int id) async {
    try {
      final response = await _dio.get<List<int>>(
        ApiConstants.ebookCover(id),
        options: Options(
          responseType: ResponseType.bytes,
          receiveTimeout: const Duration(seconds: 30),
          validateStatus: (s) => s != null && s >= 200 && s < 400,
        ),
      );
      final data = response.data;
      if (data == null || data.isEmpty) return null;
      // Si l'API renvoie du JSON d'erreur malgré le status
      if (data.length < 200) {
        final head = String.fromCharCodes(data.take(20));
        if (head.contains('{') || head.contains('<!')) return null;
      }
      return data;
    } on DioException {
      return null;
    }
  }

  Future<List<Category>> getCategories() async {
    try {
      final response = await _dio.get<List<dynamic>>(ApiConstants.categories);
      return (response.data ?? [])
          .whereType<Map<String, dynamic>>()
          .map(Category.fromJson)
          .toList();
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }
}
