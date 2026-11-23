import 'package:flutter/material.dart';
import '../config/theme/app_theme.dart';
import '../core/constants/app_strings.dart';
import '../core/services/theme_service.dart';
import '../features/splash/screens/splash_screen.dart';

/// PDF 🫰 Studio - Root Application Widget
class OpenPdfStudioApp extends StatelessWidget {
  const OpenPdfStudioApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: ThemeService.instance,
      builder: (context, _) {
        return MaterialApp(
          title: AppStrings.appName,
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: ThemeService.instance.themeMode,
          home: const SplashScreen(),
        );
      },
    );
  }
}
