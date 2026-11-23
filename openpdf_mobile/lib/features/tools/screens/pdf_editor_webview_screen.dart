import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/file_service.dart';
import '../../../core/services/history_service.dart';
import '../../../core/services/pdf_editor_server.dart';
import '../../../shared/widgets/document_actions_sheet.dart';
import '../../chat_ai/screens/chat_ai_screen.dart';
import '../../profile/screens/profile_screen.dart';
import 'pdf_editor_canvas_screen.dart';

/// OpenPDF Studio - Exact Website PDF Editor Replication Screen (100% Offline WebView)
class PdfEditorWebViewScreen extends StatefulWidget {
  final File pdfFile;

  const PdfEditorWebViewScreen({super.key, required this.pdfFile});

  @override
  State<PdfEditorWebViewScreen> createState() => _PdfEditorWebViewScreenState();
}

class _PdfEditorWebViewScreenState extends State<PdfEditorWebViewScreen> {
  final PdfEditorServer _server = PdfEditorServer();
  WebViewController? _webViewController;
  bool _isLoading = true;
  bool _hasError = false;
  String _errorMessage = '';
  int _loadingProgress = 0;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _initWebEditor();
  }

  @override
  void dispose() {
    _server.stop();
    super.dispose();
  }

  Future<void> _initWebEditor() async {
    try {
      final port = await _server.start(
        pdfFile: widget.pdfFile,
        onExport: (filename, bytes) => _handleExportData(filename, bytes),
      );

      final docName = widget.pdfFile.path.split(Platform.isWindows ? r'\' : '/').last;
      final encodedName = Uri.encodeComponent(docName);
      final initialUrl = 'http://127.0.0.1:$port/index.html?mode=editor&autoload=1&docName=$encodedName';

      final controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(const Color(0xFF0F172A))
        ..addJavaScriptChannel(
          'FlutterBridge',
          onMessageReceived: (JavaScriptMessage message) {
            _handleBridgeMessage(message.message);
          },
        )
        ..setNavigationDelegate(
          NavigationDelegate(
            onProgress: (progress) {
              if (mounted) {
                setState(() => _loadingProgress = progress);
              }
            },
            onPageFinished: (url) {
              if (mounted) {
                setState(() => _isLoading = false);
              }
            },
            onWebResourceError: (error) {
              // Ignore non-fatal favicon or optional analytics errors
              if (error.isForMainFrame ?? false) {
                if (mounted) {
                  setState(() {
                    _hasError = true;
                    _errorMessage = error.description;
                  });
                }
              }
            },
          ),
        );

      await controller.loadRequest(Uri.parse(initialUrl));

      if (mounted) {
        setState(() {
          _webViewController = controller;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _hasError = true;
          _errorMessage = e.toString();
        });
      }
    }
  }

  void _handleBridgeMessage(String jsonStr) {
    try {
      final data = jsonDecode(jsonStr) as Map<String, dynamic>;
      final action = data['action'] as String?;

      switch (action) {
        case 'back':
          Navigator.of(context).maybePop();
          break;

        case 'export':
          final filename = data['filename'] as String? ?? 'edited_document.pdf';
          final base64Data = data['base64'] as String?;
          if (base64Data != null && base64Data.isNotEmpty) {
            final bytes = base64Decode(base64Data);
            _handleExportData(filename, bytes);
          }
          break;

        case 'chat_ai':
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const ChatAiScreen()),
          );
          break;

        case 'history':
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const ProfileScreen()),
          );
          break;

        case 'open_file':
          _pickAndLoadAnotherFile();
          break;

        default:
          break;
      }
    } catch (e) {
      debugPrint('Bridge message parse error: $e');
    }
  }

  Future<void> _handleExportData(String filename, Uint8List bytes) async {
    if (_isSaving) return;
    setState(() => _isSaving = true);

    // Show circular loading popup ("Please wait... Saving changes")
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF101827),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        content: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            children: const [
              SizedBox(
                width: 32,
                height: 32,
                child: CircularProgressIndicator(
                  strokeWidth: 3,
                  color: AppColors.brandRed,
                ),
              ),
              SizedBox(width: 20),
              Text(
                'Please wait...\nSaving changes',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14),
              ),
            ],
          ),
        ),
      ),
    );

    try {
      final outName = filename.endsWith('.pdf') ? filename : '$filename.pdf';
      final savedFile = await FileService.instance.saveFile(
        fileName: outName,
        bytes: bytes,
      );

      final sizeFormatted = '${(bytes.length / (1024 * 1024)).toStringAsFixed(1)} MB';
      await HistoryService.instance.addRecord(
        fileName: outName,
        filePath: savedFile.path,
        toolUsed: 'PDF Editor',
        fileType: 'pdf',
        sizeFormatted: sizeFormatted,
      );

      if (mounted) {
        Navigator.of(context).pop(); // dismiss loading dialog
        setState(() => _isSaving = false);

        // Open the comprehensive 15-Action Drawer
        DocumentActionsSheet.show(
          context,
          documentTitle: outName,
          documentPath: savedFile.path,
        );
      }
    } catch (e) {
      if (mounted) {
        Navigator.of(context).pop(); // dismiss loading dialog
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save PDF: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Future<void> _pickAndLoadAnotherFile() async {
    final doc = await FileService.instance.pickPdfFile();
    if (doc != null && mounted) {
      final newFile = File(doc.path);
      _server.updatePdfFile(newFile);
      final docName = doc.name;
      final encodedName = Uri.encodeComponent(docName);
      final port = _server.port;
      final newUrl = 'http://127.0.0.1:$port/index.html?mode=editor&autoload=1&docName=$encodedName';
      _webViewController?.loadRequest(Uri.parse(newUrl));
    }
  }

  @override
  Widget build(BuildContext context) {
    // If local server or WebView fails to load, gracefully fall back to native canvas
    if (_hasError) {
      return PdfEditorCanvasScreen(pdfFile: widget.pdfFile);
    }

    return PopScope(
      canPop: true,
      child: Scaffold(
        backgroundColor: const Color(0xFF0F172A),
        body: SafeArea(
          child: Stack(
            children: [
              if (_webViewController != null)
                WebViewWidget(controller: _webViewController!),

              // Loading indicator while WebView loads HTML/JS bundle
              if (_isLoading)
                Container(
                  color: const Color(0xFF0F172A),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const SizedBox(
                          width: 36,
                          height: 36,
                          child: CircularProgressIndicator(
                            strokeWidth: 3,
                            color: AppColors.brandRed,
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Opening OpenPDF Studio Editor...',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '$_loadingProgress%',
                          style: const TextStyle(
                            color: Colors.white54,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
