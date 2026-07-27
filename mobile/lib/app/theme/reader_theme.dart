import 'package:flutter/material.dart';

import 'app_colors.dart';

enum ReaderThemeMode { white, sepia, gray, black }

class ReaderTheme {
  const ReaderTheme({
    required this.background,
    required this.foreground,
    required this.name,
  });

  final Color background;
  final Color foreground;
  final String name;

  static const themes = {
    ReaderThemeMode.white: ReaderTheme(
      background: AppColors.readerWhite,
      foreground: Color(0xFF1A1A1A),
      name: 'Blanc',
    ),
    ReaderThemeMode.sepia: ReaderTheme(
      background: AppColors.readerSepia,
      foreground: Color(0xFF3D2B1F),
      name: 'Sépia',
    ),
    ReaderThemeMode.gray: ReaderTheme(
      background: AppColors.readerGray,
      foreground: Color(0xFF2A2A2A),
      name: 'Gris',
    ),
    ReaderThemeMode.black: ReaderTheme(
      background: AppColors.readerBlack,
      foreground: Color(0xFFE0E0E0),
      name: 'Noir',
    ),
  };
}
