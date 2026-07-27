import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../app/theme/app_colors.dart';
import '../../../core/widgets/empty_state.dart';

class ReaderPage extends StatelessWidget {
  const ReaderPage({super.key, required this.id, this.preview = false});

  final int id;
  final bool preview;

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
          title: Text(preview ? 'Aperçu' : 'Lecture'),
        ),
        body: EmptyState(
          title: 'Lecteur PDF',
          subtitle: 'Lecteur avancé — Phase 5 (ebook #$id)',
          icon: Icons.picture_as_pdf,
        ),
      ),
    );
  }
}
