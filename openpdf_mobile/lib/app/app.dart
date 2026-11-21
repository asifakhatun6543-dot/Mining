import 'package:flutter/material.dart';
import '../config/theme/app_theme.dart';
import '../core/constants/app_strings.dart';
import '../features/shell/screens/main_shell_screen.dart';

/// OpenPDF Studio - Root Application Widget
class OpenPdfStudioApp extends StatelessWidget {
  const OpenPdfStudioApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppStrings.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: const MainShellScreen(),
    );
  }
}
