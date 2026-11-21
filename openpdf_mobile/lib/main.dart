import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app/app.dart';
import 'core/services/history_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Configure modern Android edge-to-edge transparent system navigation
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarIconBrightness: Brightness.light,
      systemNavigationBarDividerColor: Colors.transparent,
    ),
  );

  // Initialize local persistent document history
  await HistoryService.instance.init();

  runApp(
    const ProviderScope(
      child: OpenPdfStudioApp(),
    ),
  );
}
