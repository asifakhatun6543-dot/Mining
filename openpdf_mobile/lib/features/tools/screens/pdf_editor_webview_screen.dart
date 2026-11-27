import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/file_service.dart';
import '../../../core/services/file_export_service.dart';
import '../../../core/services/pdf_editor_server.dart';
import '../../../shared/widgets/glass/glass_download_success_dialog.dart';
import '../../chat_ai/screens/chat_ai_screen.dart';
import '../../profile/screens/profile_screen.dart';
import 'pdf_editor_canvas_screen.dart';

/// PDF 🫰 Studio - Exact Website PDF Editor Replication Screen
/// Multi-Tier Architecture:
/// - Tier 1: Zero-latency on-device loopback HTTP server with binary PDF streaming
/// - Tier 2: Direct Flutter asset loading (loadFlutterAsset) with Base64 bridge
/// - Tier 3: Enhanced Native PDF Canvas Editor fallback
class PdfEditorWebViewScreen extends StatefulWidget {
  final File? pdfFile;

  const PdfEditorWebViewScreen({super.key, this.pdfFile});

  @override
  State<PdfEditorWebViewScreen> createState() => _PdfEditorWebViewScreenState();
}

class _PdfEditorWebViewScreenState extends State<PdfEditorWebViewScreen> {
  final PdfEditorServer _server = PdfEditorServer();
  WebViewController? _webViewController;
  bool _hasError = false;
  bool _isUsingFallback = false;
  bool _documentInjected = false;
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

      final String initialUrl;
      if (widget.pdfFile != null) {
        final docName =
            widget.pdfFile!.path.split(Platform.isWindows ? r'\' : '/').last;
        final encodedName = Uri.encodeComponent(docName);
        initialUrl =
            'http://127.0.0.1:$port/index.html?mode=editor&autoload=1&docName=$encodedName';
      } else {
        initialUrl = 'http://127.0.0.1:$port/index.html?mode=editor';
      }

      // 1. Instantiate the controller first so the variable is declared and defined
      final controller = WebViewController();

      // 2. Configure the controller using cascaded calls
      controller
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(const Color(0xFFF8FAFC))
        ..addJavaScriptChannel(
          'FlutterBridge',
          onMessageReceived: (JavaScriptMessage message) {
            _handleBridgeMessage(message.message);
          },
        )
        ..setNavigationDelegate(
          NavigationDelegate(
            onPageFinished: (url) {
              _injectPendingDocument(controller);
            },
            onWebResourceError: (error) {
              debugPrint(
                  'Web resource warning: ${error.errorCode} - ${error.description}');
              // Only trigger fallback if the main page completely fails to load
              if (error.isForMainFrame ?? false) {
                if (error.errorCode < 0 && !_isUsingFallback) {
                  _attemptAssetFallback(controller);
                }
              }
            },
            onNavigationRequest: (NavigationRequest request) {
              final uri = Uri.tryParse(request.url);
              if (uri != null &&
                  (uri.host == '127.0.0.1' ||
                      uri.host == 'localhost' ||
                      uri.scheme == 'file' ||
                      uri.scheme == 'data' ||
                      uri.scheme == 'about')) {
                return NavigationDecision.navigate;
              }
              return NavigationDecision.prevent;
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
      debugPrint('WebEditor primary init error: $e');
      if (mounted) {
        _attemptAssetFallback(null);
      }
    }
  }

  Future<void> _injectPendingDocument(WebViewController controller) async {
    if (_documentInjected || widget.pdfFile == null) return;
    try {
      if (await widget.pdfFile!.exists()) {
        final bytes = await widget.pdfFile!.readAsBytes();
        final base64Data = base64Encode(bytes);
        final docName =
            widget.pdfFile!.path.split(Platform.isWindows ? r'\' : '/').last;
        _documentInjected = true;
        final js = '''
          if (window.loadPdfFromBase64 && (!window.State || !window.State.pdfDoc)) {
            window.loadPdfFromBase64("$base64Data", "$docName");
          }
        ''';
        await controller.runJavaScript(js);
      }
    } catch (e) {
      debugPrint('Inject document error: $e');
    }
  }

  Future<void> _attemptAssetFallback(
      WebViewController? existingController) async {
    if (_isUsingFallback) return;
    _isUsingFallback = true;

    try {
      final controller = existingController ?? WebViewController();

      controller
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(const Color(0xFFF8FAFC))
        ..addJavaScriptChannel(
          'FlutterBridge',
          onMessageReceived: (JavaScriptMessage message) {
            _handleBridgeMessage(message.message);
          },
        )
        ..setNavigationDelegate(
          NavigationDelegate(
            onPageFinished: (_) {
              _injectPendingDocument(controller);
            },
            onWebResourceError: (_) {
              if (mounted) setState(() => _hasError = true);
            },
            onNavigationRequest: (NavigationRequest request) {
              final uri = Uri.tryParse(request.url);
              if (uri != null &&
                  (uri.host == '127.0.0.1' ||
                      uri.host == 'localhost' ||
                      uri.scheme == 'file' ||
                      uri.scheme == 'data' ||
                      uri.scheme == 'about')) {
                return NavigationDecision.navigate;
              }
              return NavigationDecision.prevent;
            },
          ),
        );

      await controller.loadFlutterAsset('assets/web/index.html');

      if (mounted) {
        setState(() {
          _webViewController = controller;
          _hasError = false;
        });
      }
    } catch (e) {
      debugPrint('Asset fallback error: $e');
      if (mounted) {
        setState(() => _hasError = true);
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

        case 'pick_file':
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
                style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize: 14),
              ),
            ],
          ),
        ),
      ),
    );

    try {
      final outName = filename.endsWith('.pdf') ? filename : '$filename.pdf';
      final exportResult = await FileExportService.instance.exportDocument(
        fileName: outName,
        bytes: bytes,
        toolUsed: 'PDF Editor',
      );

      if (mounted) {
        Navigator.of(context).pop(); // dismiss loading dialog
        setState(() => _isSaving = false);

        if (exportResult.success) {
          GlassDownloadSuccessDialog.show(context, exportResult);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(exportResult.errorMessage ?? 'Failed to export PDF'),
              backgroundColor: AppColors.error,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        Navigator.of(context).pop();
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Failed to save PDF: $e'),
              backgroundColor: AppColors.error),
        );
      }
    }
  }

  Future<void> _pickAndLoadAnotherFile() async {
    final doc = await FileService.instance.pickPdfFile();
    if (doc != null && mounted) {
      _documentInjected = false;
      final newFile = File(doc.path);
      _server.updatePdfFile(newFile);
      final docName = doc.name;
      final encodedName = Uri.encodeComponent(docName);
      final port = _server.port;
      final newUrl =
          'http://127.0.0.1:$port/index.html?mode=editor&autoload=1&docName=$encodedName';
      _webViewController?.loadRequest(Uri.parse(newUrl));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_hasError) {
      if (widget.pdfFile != null) {
        return PdfEditorCanvasScreen(pdfFile: widget.pdfFile!);
      }
      return Scaffold(
        backgroundColor: const Color(0xFF0F172A),
        appBar: AppBar(
          backgroundColor: const Color(0xFF0F172A),
          title: const Text('PDF Editor', style: TextStyle(color: Colors.white)),
        ),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline_rounded, color: Colors.white54, size: 48),
              const SizedBox(height: 12),
              const Text('Could not load editor', style: TextStyle(color: Colors.white70)),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => _initWebEditor(),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    return PopScope(
      canPop: true,
      child: Scaffold(
        resizeToAvoidBottomInset: false,
        backgroundColor: const Color(0xFFF8FAFC),
        body: SafeArea(
          child: _webViewController != null
              ? WebViewWidget(controller: _webViewController!)
              : Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.08),
                          blurRadius: 20,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: const Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: 32,
                          height: 32,
                          child: CircularProgressIndicator(
                            strokeWidth: 3,
                            color: Color(0xFFE5322D),
                          ),
                        ),
                        SizedBox(height: 14),
                        Text(
                          'Processing PDF...',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
        ),
      ),
    );
  }
}
