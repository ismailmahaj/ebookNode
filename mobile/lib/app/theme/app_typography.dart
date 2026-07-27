import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';

abstract final class AppTypography {
  static TextTheme textTheme({bool isDark = true}) {
    final body = GoogleFonts.sourceSans3(
      color: isDark ? AppColors.netflixWhite : AppColors.netflixBlack,
    );
    final display = GoogleFonts.bebasNeue(
      color: isDark ? Colors.white : AppColors.netflixBlack,
    );

    return TextTheme(
      displayLarge: display.copyWith(fontSize: 48, letterSpacing: 1.2),
      displayMedium: display.copyWith(fontSize: 36, letterSpacing: 1),
      displaySmall: display.copyWith(fontSize: 28, letterSpacing: 0.8),
      headlineMedium: body.copyWith(fontSize: 20, fontWeight: FontWeight.w600),
      titleLarge: body.copyWith(fontSize: 18, fontWeight: FontWeight.w600),
      titleMedium: body.copyWith(fontSize: 16, fontWeight: FontWeight.w500),
      bodyLarge: body.copyWith(fontSize: 16),
      bodyMedium: body.copyWith(fontSize: 14),
      bodySmall: body.copyWith(fontSize: 12, color: AppColors.netflixGray),
      labelLarge: body.copyWith(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.5,
      ),
    );
  }
}
