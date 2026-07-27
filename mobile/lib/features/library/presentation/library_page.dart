import 'package:flutter/material.dart';

import '../../../core/widgets/empty_state.dart';

class LibraryPage extends StatelessWidget {
  const LibraryPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: EmptyState(
        title: 'Votre bibliothèque',
        subtitle: 'En cours, terminés, téléchargements — Phase 4',
        icon: Icons.collections_bookmark_outlined,
      ),
    );
  }
}
