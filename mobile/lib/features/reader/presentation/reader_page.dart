import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pdfrx/pdfrx.dart';

import '../../../app/theme/app_colors.dart';
import '../../../core/api/api_exceptions.dart';
import '../../../core/widgets/error_state.dart';
import '../../home/data/ebook_repository.dart';

class ReaderPage extends ConsumerStatefulWidget {
  const ReaderPage({super.key, required this.id, this.preview = false});

  final int id;
  final bool preview;

  @override
  ConsumerState<ReaderPage> createState() => _ReaderPageState();
}

class _ReaderPageState extends ConsumerState<ReaderPage> {
  Uint8List? _bytes;
  Object? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ref.read(ebookRepositoryProvider).fetchPdfBytes(
            widget.id,
            preview: widget.preview,
          );
      if (!mounted) return;
      setState(() {
        _bytes = Uint8List.fromList(data);
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: AppColors.netflixBlack,
        appBar: AppBar(
          backgroundColor: Colors.black87,
          leading: IconButton(
            icon: const Icon(Icons.close),
            onPressed: () => Navigator.of(context).pop(),
          ),
          title: Text(widget.preview ? 'Aperçu' : 'Lecture'),
        ),
        body: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(color: AppColors.netflixRed),
            SizedBox(height: 16),
            Text(
              'Chargement du PDF…',
              style: TextStyle(color: AppColors.netflixGray),
            ),
          ],
        ),
      );
    }

    if (_error != null) {
      final message = _error is AppException
          ? (_error as AppException).message
          : 'Impossible de charger le PDF';
      return ErrorState(message: message, onRetry: _load);
    }

    final bytes = _bytes;
    if (bytes == null || bytes.isEmpty) {
      return ErrorState(
        message: 'PDF indisponible',
        onRetry: _load,
      );
    }

    return PdfViewer.data(
      bytes,
      sourceName: 'ebook-${widget.id}${widget.preview ? '-preview' : ''}',
      params: const PdfViewerParams(
        backgroundColor: AppColors.netflixBlack,
      ),
    );
  }
}
