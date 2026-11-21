import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:syncfusion_flutter_pdf/pdf.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/file_service.dart';
import '../../../core/services/history_service.dart';
import '../../../shared/widgets/glass/glass_container.dart';
import '../../../shared/widgets/glass/glass_signature_pad.dart';

enum EditorActiveTool {
  select,
  text,
  sign,
  draw,
  erase,
  redact,
  watermark,
}

class CanvasTextItem {
  String id;
  String text;
  Offset position;
  double fontSize;
  Color color;
  bool isBold;

  CanvasTextItem({
    required this.id,
    required this.text,
    required this.position,
    this.fontSize = 14.0,
    this.color = const Color(0xFF0F172A),
    this.isBold = false,
  });
}

class CanvasSignatureItem {
  String id;
  Uint8List imageBytes;
  Offset position;
  double width;
  double height;

  CanvasSignatureItem({
    required this.id,
    required this.imageBytes,
    required this.position,
    this.width = 160,
    this.height = 70,
  });
}

class CanvasRedactItem {
  String id;
  Rect rect;

  CanvasRedactItem({required this.id, required this.rect});
}

/// OpenPDF Studio - Full-Featured Mobile PDF Editor Canvas Screen
class PdfEditorCanvasScreen extends StatefulWidget {
  final File pdfFile;

  const PdfEditorCanvasScreen({super.key, required this.pdfFile});

  @override
  State<PdfEditorCanvasScreen> createState() => _PdfEditorCanvasScreenState();
}

class _PdfEditorCanvasScreenState extends State<PdfEditorCanvasScreen> {
  late TextEditingController _titleController;
  int _currentPage = 1;
  int _totalPages = 1;
  double _zoomScale = 1.0;
  EditorActiveTool _activeTool = EditorActiveTool.select;

  // Annotations on current page
  final List<CanvasTextItem> _textItems = [];
  final List<CanvasSignatureItem> _signatureItems = [];
  final List<CanvasRedactItem> _redactItems = [];
  final List<List<Offset>> _freehandStrokes = [];

  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.pdfFile.path.split('/').last);
    _loadDocumentDetails();
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  Future<void> _loadDocumentDetails() async {
    try {
      final bytes = await widget.pdfFile.readAsBytes();
      final document = PdfDocument(inputBytes: bytes);
      setState(() {
        _totalPages = document.pages.count > 0 ? document.pages.count : 1;
      });
      document.dispose();
    } catch (_) {}
  }

  void _handleCanvasTap(TapUpDetails details) {
    final pos = details.localPosition;

    switch (_activeTool) {
      case EditorActiveTool.text:
        _showAddTextDialog(pos);
        break;
      case EditorActiveTool.redact:
        setState(() {
          _redactItems.add(
            CanvasRedactItem(
              id: 'redact_${DateTime.now().millisecondsSinceEpoch}',
              rect: Rect.fromLTWH(pos.dx - 40, pos.dy - 12, 80, 24),
            ),
          );
        });
        break;
      default:
        break;
    }
  }

  void _showAddTextDialog(Offset position) {
    final textController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Text'),
        content: TextField(
          controller: textController,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'Enter text here...'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.brandRed),
            onPressed: () {
              final val = textController.text.trim();
              if (val.isNotEmpty) {
                setState(() {
                  _textItems.add(
                    CanvasTextItem(
                      id: 'txt_${DateTime.now().millisecondsSinceEpoch}',
                      text: val,
                      position: position,
                    ),
                  );
                });
              }
              Navigator.of(ctx).pop();
            },
            child: const Text('Add Text', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Future<void> _openSignaturePad() async {
    final signatureBytes = await GlassSignaturePad.show(context);
    if (signatureBytes != null) {
      setState(() {
        _signatureItems.add(
          CanvasSignatureItem(
            id: 'sig_${DateTime.now().millisecondsSinceEpoch}',
            imageBytes: signatureBytes,
            position: const Offset(80, 250),
          ),
        );
        _activeTool = EditorActiveTool.select;
      });
    }
  }

  Future<void> _exportAndSave() async {
    setState(() => _isSaving = true);
    try {
      final inputBytes = await widget.pdfFile.readAsBytes();
      final document = PdfDocument(inputBytes: inputBytes);

      final pageIdx = (_currentPage - 1).clamp(0, document.pages.count - 1);
      final page = document.pages[pageIdx];

      // Stamp text annotations
      final font = PdfStandardFont(PdfFontFamily.helvetica, 14, style: PdfFontStyle.bold);
      final textBrush = PdfSolidBrush(PdfColor(15, 23, 42));
      for (final item in _textItems) {
        page.graphics.drawString(
          item.text,
          font,
          brush: textBrush,
          bounds: Rect.fromLTWH(item.position.dx, item.position.dy, 300, 30),
        );
      }

      // Stamp signatures
      for (final sig in _signatureItems) {
        final bitmap = PdfBitmap(sig.imageBytes);
        page.graphics.drawImage(
          bitmap,
          Rect.fromLTWH(sig.position.dx, sig.position.dy, sig.width, sig.height),
        );
      }

      // Stamp redactions
      final blackBrush = PdfSolidBrush(PdfColor(15, 23, 42));
      for (final redact in _redactItems) {
        page.graphics.drawRectangle(
          brush: blackBrush,
          bounds: redact.rect,
        );
      }

      final outputBytes = Uint8List.fromList(document.saveSync());
      document.dispose();

      final outName = _titleController.text.trim().isNotEmpty
          ? _titleController.text.trim()
          : 'Edited_Document.pdf';

      final savedFile = await FileService.instance.saveFile(
        fileName: outName,
        bytes: outputBytes,
      );

      await HistoryService.instance.addRecord(
        fileName: outName,
        filePath: savedFile.path,
        toolUsed: 'PDF Editor',
        fileType: 'pdf',
        sizeFormatted: '${(outputBytes.length / (1024 * 1024)).toStringAsFixed(1)} MB',
      );

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Document saved successfully: $outName ✓'),
          action: SnackBarAction(
            label: 'Share',
            onPressed: () => FileService.instance.shareFile(savedFile.path),
          ),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Save error: $e')));
    } finally {
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0A0F1D) : const Color(0xFFE2E8F0),
      appBar: AppBar(
        title: TextField(
          controller: _titleController,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
          ),
          decoration: const InputDecoration(
            border: InputBorder.none,
            isDense: true,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          IconButton(
            icon: _isSaving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.download_rounded, color: AppColors.brandRed),
            tooltip: 'Export & Save PDF',
            onPressed: _isSaving ? null : _exportAndSave,
          ),
        ],
      ),
      body: Stack(
        children: [
          // 1. Interactive Page Canvas
          InteractiveViewer(
            minScale: 0.6,
            maxScale: 3.5,
            child: Center(
              child: Container(
                width: 360,
                height: 520,
                margin: const EdgeInsets.only(bottom: 70),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.18),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: GestureDetector(
                  onTapUp: _handleCanvasTap,
                  child: Stack(
                    children: [
                      // Document placeholder visual
                      Positioned.fill(
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(height: 18, width: 140, color: const Color(0xFFE2E8F0)),
                              const SizedBox(height: 14),
                              Container(height: 10, width: double.infinity, color: const Color(0xFFF1F5F9)),
                              const SizedBox(height: 8),
                              Container(height: 10, width: double.infinity, color: const Color(0xFFF1F5F9)),
                              const SizedBox(height: 8),
                              Container(height: 10, width: 220, color: const Color(0xFFF1F5F9)),
                              const SizedBox(height: 24),
                              Container(height: 10, width: double.infinity, color: const Color(0xFFF1F5F9)),
                              const SizedBox(height: 8),
                              Container(height: 10, width: 280, color: const Color(0xFFF1F5F9)),
                            ],
                          ),
                        ),
                      ),

                      // Text Annotations
                      ..._textItems.map((item) {
                        return Positioned(
                          left: item.position.dx,
                          top: item.position.dy,
                          child: GestureDetector(
                            onPanUpdate: (d) {
                              setState(() {
                                item.position += d.delta;
                              });
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                border: Border.all(color: Colors.blue.withOpacity(0.4), width: 1),
                                color: Colors.blue.withOpacity(0.06),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                item.text,
                                style: TextStyle(
                                  fontSize: item.fontSize,
                                  fontWeight: item.isBold ? FontWeight.bold : FontWeight.normal,
                                  color: item.color,
                                ),
                              ),
                            ),
                          ),
                        );
                      }),

                      // Signature Stamps
                      ..._signatureItems.map((sig) {
                        return Positioned(
                          left: sig.position.dx,
                          top: sig.position.dy,
                          child: GestureDetector(
                            onPanUpdate: (d) {
                              setState(() {
                                sig.position += d.delta;
                              });
                            },
                            child: Container(
                              width: sig.width,
                              height: sig.height,
                              decoration: BoxDecoration(
                                border: Border.all(color: AppColors.brandRed.withOpacity(0.4), width: 1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Image.memory(sig.imageBytes, fit: BoxFit.contain),
                            ),
                          ),
                        );
                      }),

                      // Redaction Blackout Blocks
                      ..._redactItems.map((redact) {
                        return Positioned(
                          left: redact.rect.left,
                          top: redact.rect.top,
                          width: redact.rect.width,
                          height: redact.rect.height,
                          child: Container(color: Colors.black),
                        );
                      }),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // 2. Floating Page Navigation Pill (PDFfiller style)
          Positioned(
            bottom: 74,
            left: 0,
            right: 0,
            child: Center(
              child: GlassContainer(
                height: 44,
                borderRadius: 22,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.keyboard_arrow_up_rounded, size: 20),
                      visualDensity: VisualDensity.compact,
                      onPressed: _currentPage > 1 ? () => setState(() => _currentPage--) : null,
                    ),
                    Text(
                      '$_currentPage / $_totalPages',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 20),
                      visualDensity: VisualDensity.compact,
                      onPressed: _currentPage < _totalPages ? () => setState(() => _currentPage++) : null,
                    ),
                    const VerticalDivider(width: 16, indent: 8, endIndent: 8),
                    Text(
                      '${(_zoomScale * 100).toInt()}%',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // 3. Docked Bottom Editing Ribbon Toolbar
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              height: 64,
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF101827) : Colors.white,
                border: Border(
                  top: BorderSide(
                    color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                    width: 1,
                  ),
                ),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 16, offset: const Offset(0, -4)),
                ],
              ),
              child: ListView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 8),
                children: [
                  _buildRibbonToolBtn(EditorActiveTool.select, 'Select', Icons.near_me_outlined),
                  _buildRibbonToolBtn(EditorActiveTool.text, 'Text', Icons.text_fields_rounded),
                  _buildRibbonActionBtn('Sign', Icons.draw_rounded, _openSignaturePad),
                  _buildRibbonToolBtn(EditorActiveTool.draw, 'Draw', Icons.brush_outlined),
                  _buildRibbonToolBtn(EditorActiveTool.redact, 'Redact', Icons.shield_outlined),
                  _buildRibbonToolBtn(EditorActiveTool.erase, 'Erase', Icons.cleaning_services_outlined),
                  _buildRibbonActionBtn('Watermark', Icons.branding_watermark_outlined, () {
                    // Quick watermark
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Use Watermark Tool from All Tools for advanced options')),
                    );
                  }),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRibbonToolBtn(EditorActiveTool tool, String label, IconData icon) {
    final isSelected = _activeTool == tool;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () => setState(() => _activeTool = tool),
      child: Container(
        width: 58,
        margin: const EdgeInsets.symmetric(horizontal: 2, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? AppColors.darkPrimaryAccent.withOpacity(0.2) : AppColors.brandRed.withOpacity(0.12))
              : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border: isSelected
              ? Border.all(color: isDark ? AppColors.darkPrimaryAccent : AppColors.brandRed, width: 1.2)
              : null,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 20,
              color: isSelected
                  ? (isDark ? AppColors.darkPrimaryAccent : AppColors.brandRed)
                  : (isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected
                    ? (isDark ? AppColors.darkPrimaryAccent : AppColors.brandRed)
                    : (isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRibbonActionBtn(String label, IconData icon, VoidCallback onTap) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 58,
        margin: const EdgeInsets.symmetric(horizontal: 2, vertical: 6),
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(10)),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 20, color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
