import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:syncfusion_flutter_pdf/pdf.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/file_service.dart';
import '../../../core/services/history_service.dart';
import '../../../shared/widgets/glass/glass_signature_pad.dart';
import '../../../shared/widgets/document_actions_sheet.dart';
import 'package:printing/printing.dart';

enum EditorActiveTool {
  select,
  text,
  sign,
  highlight,
  shapes,
  stamp,
  erase,
  image,
  redact,
}

enum AnnotationType {
  text,
  signature,
  image,
  redact,
  highlight,
  shape,
  stamp,
}

class CanvasAnnotationAction {
  final AnnotationType type;
  final dynamic item;

  CanvasAnnotationAction({required this.type, required this.item});
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

class CanvasImageStampItem {
  String id;
  Uint8List imageBytes;
  Offset position;
  double width;
  double height;

  CanvasImageStampItem({
    required this.id,
    required this.imageBytes,
    required this.position,
    this.width = 140,
    this.height = 140,
  });
}

class CanvasRedactItem {
  String id;
  Rect rect;

  CanvasRedactItem({required this.id, required this.rect});
}

class CanvasHighlightItem {
  String id;
  Rect rect;
  Color color;

  CanvasHighlightItem({
    required this.id,
    required this.rect,
    this.color = const Color(0xFFFFEB3B),
  });
}

class CanvasShapeItem {
  String id;
  Rect rect;
  String shapeType; // 'rect', 'circle'
  Color color;

  CanvasShapeItem({
    required this.id,
    required this.rect,
    required this.shapeType,
    this.color = const Color(0xFFFF2A55),
  });
}

class CanvasStampItem {
  String id;
  String stampText;
  Offset position;
  Color color;

  CanvasStampItem({
    required this.id,
    required this.stampText,
    required this.position,
    this.color = const Color(0xFF10B981),
  });
}

/// OpenPDF Studio - In-Place Interactive PDF Canvas Editor
class PdfEditorCanvasScreen extends StatefulWidget {
  final File pdfFile;

  const PdfEditorCanvasScreen({super.key, required this.pdfFile});

  @override
  State<PdfEditorCanvasScreen> createState() => _PdfEditorCanvasScreenState();
}

class _PdfEditorCanvasScreenState extends State<PdfEditorCanvasScreen> {
  late TextEditingController _titleController;
  final TransformationController _transformationController = TransformationController();

  int _currentPage = 1;
  int _totalPages = 1;
  double _zoomScale = 1.0;
  EditorActiveTool _activeTool = EditorActiveTool.select;

  // Annotations on current page
  final List<CanvasTextItem> _textItems = [];
  final List<CanvasSignatureItem> _signatureItems = [];
  final List<CanvasImageStampItem> _imageStampItems = [];
  final List<CanvasRedactItem> _redactItems = [];
  final List<CanvasHighlightItem> _highlightItems = [];
  final List<CanvasShapeItem> _shapeItems = [];
  final List<CanvasStampItem> _stampItems = [];

  // Undo & Redo History Stacks
  final List<CanvasAnnotationAction> _undoStack = [];
  final List<CanvasAnnotationAction> _redoStack = [];

  bool _isSaving = false;
  Uint8List? _pageImageBytes;
  bool _isRenderingPage = true;

  @override
  void initState() {
    super.initState();
    final initialName = widget.pdfFile.path.split(Platform.isWindows ? r'\' : '/').last;
    _titleController = TextEditingController(text: initialName);
    _loadDocumentDetails();

    _transformationController.addListener(() {
      final scale = _transformationController.value.getMaxScaleOnAxis();
      if ((scale - _zoomScale).abs() > 0.05) {
        setState(() {
          _zoomScale = scale;
        });
      }
    });
  }

  @override
  void dispose() {
    _titleController.dispose();
    _transformationController.dispose();
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
      await _renderPage(_currentPage);
    } catch (_) {
      await _renderPage(_currentPage);
    }
  }

  /// Renders the real original PDF document page in high resolution using on-device PDF engine
  Future<void> _renderPage(int pageNumber) async {
    if (!mounted) return;
    setState(() => _isRenderingPage = true);

    try {
      final bytes = await widget.pdfFile.readAsBytes();
      final pageIndex = (pageNumber - 1).clamp(0, _totalPages > 0 ? _totalPages - 1 : 0);

      await for (final page in Printing.raster(bytes, pages: [pageIndex], dpi: 150)) {
        final pngData = await page.toPng();
        if (mounted) {
          setState(() {
            _pageImageBytes = pngData;
            _isRenderingPage = false;
          });
        }
        break;
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isRenderingPage = false);
      }
    }
  }

  void _pushAction(CanvasAnnotationAction action) {
    _undoStack.add(action);
    _redoStack.clear();
  }

  void _undo() {
    if (_undoStack.isEmpty) return;
    setState(() {
      final action = _undoStack.removeLast();
      _redoStack.add(action);

      switch (action.type) {
        case AnnotationType.text:
          _textItems.removeWhere((i) => i.id == action.item.id);
          break;
        case AnnotationType.signature:
          _signatureItems.removeWhere((i) => i.id == action.item.id);
          break;
        case AnnotationType.image:
          _imageStampItems.removeWhere((i) => i.id == action.item.id);
          break;
        case AnnotationType.redact:
          _redactItems.removeWhere((i) => i.id == action.item.id);
          break;
        case AnnotationType.highlight:
          _highlightItems.removeWhere((i) => i.id == action.item.id);
          break;
        case AnnotationType.shape:
          _shapeItems.removeWhere((i) => i.id == action.item.id);
          break;
        case AnnotationType.stamp:
          _stampItems.removeWhere((i) => i.id == action.item.id);
          break;
      }
    });
  }

  void _redo() {
    if (_redoStack.isEmpty) return;
    setState(() {
      final action = _redoStack.removeLast();
      _undoStack.add(action);

      switch (action.type) {
        case AnnotationType.text:
          _textItems.add(action.item as CanvasTextItem);
          break;
        case AnnotationType.signature:
          _signatureItems.add(action.item as CanvasSignatureItem);
          break;
        case AnnotationType.image:
          _imageStampItems.add(action.item as CanvasImageStampItem);
          break;
        case AnnotationType.redact:
          _redactItems.add(action.item as CanvasRedactItem);
          break;
        case AnnotationType.highlight:
          _highlightItems.add(action.item as CanvasHighlightItem);
          break;
        case AnnotationType.shape:
          _shapeItems.add(action.item as CanvasShapeItem);
          break;
        case AnnotationType.stamp:
          _stampItems.add(action.item as CanvasStampItem);
          break;
      }
    });
  }

  void _zoomIn() {
    final newScale = (_zoomScale + 0.25).clamp(0.5, 3.5);
    _setZoom(newScale);
  }

  void _zoomOut() {
    final newScale = (_zoomScale - 0.25).clamp(0.5, 3.5);
    _setZoom(newScale);
  }

  void _fitToScreen() {
    _setZoom(1.0);
  }

  void _setZoom(double scale) {
    setState(() {
      _zoomScale = scale;
      _transformationController.value = Matrix4.identity()..scale(scale);
    });
  }

  void _handleCanvasTap(TapUpDetails details) {
    final pos = details.localPosition;

    switch (_activeTool) {
      case EditorActiveTool.text:
        _showAddTextDialog(pos);
        break;

      case EditorActiveTool.highlight:
        final hItem = CanvasHighlightItem(
          id: 'hl_${DateTime.now().millisecondsSinceEpoch}',
          rect: Rect.fromLTWH(pos.dx - 50, pos.dy - 10, 100, 20),
        );
        setState(() {
          _highlightItems.add(hItem);
          _pushAction(CanvasAnnotationAction(type: AnnotationType.highlight, item: hItem));
        });
        break;

      case EditorActiveTool.shapes:
        final shapeItem = CanvasShapeItem(
          id: 'shape_${DateTime.now().millisecondsSinceEpoch}',
          rect: Rect.fromLTWH(pos.dx - 40, pos.dy - 25, 80, 50),
          shapeType: 'rect',
        );
        setState(() {
          _shapeItems.add(shapeItem);
          _pushAction(CanvasAnnotationAction(type: AnnotationType.shape, item: shapeItem));
        });
        break;

      case EditorActiveTool.stamp:
        _showStampSelector(pos);
        break;

      case EditorActiveTool.redact:
        final redact = CanvasRedactItem(
          id: 'redact_${DateTime.now().millisecondsSinceEpoch}',
          rect: Rect.fromLTWH(pos.dx - 45, pos.dy - 12, 90, 24),
        );
        setState(() {
          _redactItems.add(redact);
          _pushAction(CanvasAnnotationAction(type: AnnotationType.redact, item: redact));
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
        backgroundColor: const Color(0xFF101827),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text('Add Text to PDF', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
        content: TextField(
          controller: textController,
          autofocus: true,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: 'Enter text here...',
            hintStyle: const TextStyle(color: Colors.white54),
            filled: true,
            fillColor: const Color(0xFF1E293B),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel', style: TextStyle(color: Colors.white70)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.brandRed,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () {
              final val = textController.text.trim();
              if (val.isNotEmpty) {
                final textItem = CanvasTextItem(
                  id: 'txt_${DateTime.now().millisecondsSinceEpoch}',
                  text: val,
                  position: position,
                );
                setState(() {
                  _textItems.add(textItem);
                  _pushAction(CanvasAnnotationAction(type: AnnotationType.text, item: textItem));
                  _activeTool = EditorActiveTool.select;
                });
              }
              Navigator.of(ctx).pop();
            },
            child: const Text('Add Text', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showStampSelector(Offset position) {
    final stamps = ['APPROVED', 'CONFIDENTIAL', 'DRAFT', 'PAID', 'VERIFIED'];
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF101827),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Select Stamp to Apply', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: stamps.map((s) {
                return ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1E293B),
                    side: const BorderSide(color: AppColors.brandRed),
                  ),
                  onPressed: () {
                    final item = CanvasStampItem(
                      id: 'stamp_${DateTime.now().millisecondsSinceEpoch}',
                      stampText: s,
                      position: position,
                    );
                    setState(() {
                      _stampItems.add(item);
                      _pushAction(CanvasAnnotationAction(type: AnnotationType.stamp, item: item));
                      _activeTool = EditorActiveTool.select;
                    });
                    Navigator.of(ctx).pop();
                  },
                  child: Text(s, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openSignaturePad() async {
    final signatureBytes = await GlassSignaturePad.show(context);
    if (signatureBytes != null) {
      final sigItem = CanvasSignatureItem(
        id: 'sig_${DateTime.now().millisecondsSinceEpoch}',
        imageBytes: signatureBytes,
        position: const Offset(80, 240),
      );
      setState(() {
        _signatureItems.add(sigItem);
        _pushAction(CanvasAnnotationAction(type: AnnotationType.signature, item: sigItem));
        _activeTool = EditorActiveTool.select;
      });
    }
  }

  Future<void> _pickAndStampImage() async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(source: ImageSource.gallery);
      if (picked != null) {
        final bytes = await picked.readAsBytes();
        final imgStamp = CanvasImageStampItem(
          id: 'img_${DateTime.now().millisecondsSinceEpoch}',
          imageBytes: bytes,
          position: const Offset(60, 180),
        );
        setState(() {
          _imageStampItems.add(imgStamp);
          _pushAction(CanvasAnnotationAction(type: AnnotationType.image, item: imgStamp));
          _activeTool = EditorActiveTool.select;
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not load image: $e')),
      );
    }
  }

  void _showPagesBottomSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF101827),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Document Pages & Organization', style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold)),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: Colors.white70),
                    onPressed: () => Navigator.of(ctx).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              SizedBox(
                height: 120,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _totalPages,
                  itemBuilder: (context, idx) {
                    final pageNum = idx + 1;
                    final isCurrent = pageNum == _currentPage;
                    return GestureDetector(
                      onTap: () {
                        setState(() => _currentPage = pageNum);
                        _renderPage(pageNum);
                        Navigator.of(ctx).pop();
                      },
                      child: Container(
                        width: 80,
                        margin: const EdgeInsets.only(right: 12),
                        decoration: BoxDecoration(
                          color: isCurrent ? AppColors.brandRed.withOpacity(0.15) : const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isCurrent ? AppColors.brandRed : Colors.white24,
                            width: isCurrent ? 2 : 1,
                          ),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.description_outlined, color: isCurrent ? AppColors.brandRed : Colors.white70, size: 36),
                            const SizedBox(height: 6),
                            Text('Page $pageNum', style: TextStyle(color: isCurrent ? AppColors.brandRed : Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<File?> _exportAndSave() async {
    setState(() => _isSaving = true);
    try {
      final inputBytes = await widget.pdfFile.readAsBytes();
      final document = PdfDocument(inputBytes: inputBytes);

      final pageIdx = (_currentPage - 1).clamp(0, document.pages.count - 1);
      final page = document.pages[pageIdx];

      // 1. Stamp text annotations
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

      // 2. Stamp signatures
      for (final sig in _signatureItems) {
        final bitmap = PdfBitmap(sig.imageBytes);
        page.graphics.drawImage(
          bitmap,
          Rect.fromLTWH(sig.position.dx, sig.position.dy, sig.width, sig.height),
        );
      }

      // 3. Stamp image stamps
      for (final img in _imageStampItems) {
        final bitmap = PdfBitmap(img.imageBytes);
        page.graphics.drawImage(
          bitmap,
          Rect.fromLTWH(img.position.dx, img.position.dy, img.width, img.height),
        );
      }

      // 4. Stamp redactions
      final blackBrush = PdfSolidBrush(PdfColor(15, 23, 42));
      for (final redact in _redactItems) {
        page.graphics.drawRectangle(
          brush: blackBrush,
          bounds: redact.rect,
        );
      }

      final outputBytes = Uint8List.fromList(document.saveSync());
      document.dispose();

      final rawName = _titleController.text.trim().isNotEmpty ? _titleController.text.trim() : 'Edited_Document.pdf';
      final outName = rawName.endsWith('.pdf') ? rawName : '$rawName.pdf';

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

      return savedFile;
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Save error: $e'), backgroundColor: AppColors.error),
      );
      return null;
    } finally {
      setState(() => _isSaving = false);
    }
  }

  Future<void> _handleDone() async {
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

    final savedFile = await _exportAndSave();

    if (mounted) {
      Navigator.of(context).pop(); // dismiss loading dialog
      if (savedFile != null) {
        final docName = savedFile.path.split(Platform.isWindows ? r'\' : '/').last;
        // Open the comprehensive 15-Action Drawer
        DocumentActionsSheet.show(
          context,
          documentTitle: docName,
          documentPath: savedFile.path,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF080D18) : const Color(0xFFD6DFEB),
      // -----------------------------------------------------------------------
      // 1. Top Bar: `< All Tools` | `🕒 Title.pdf` | Prominent `Done` button
      // -----------------------------------------------------------------------
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF101827) : Colors.white,
        elevation: 1,
        titleSpacing: 0,
        leadingWidth: 108,
        leading: GestureDetector(
          onTap: () => Navigator.of(context).pop(),
          child: Container(
            margin: const EdgeInsets.only(left: 10, top: 8, bottom: 8),
            padding: const EdgeInsets.symmetric(horizontal: 8),
            decoration: BoxDecoration(
              border: Border.all(color: isDark ? Colors.white24 : Colors.black12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(Icons.arrow_back_ios_new_rounded, size: 14, color: isDark ? Colors.white : Colors.black87),
                const SizedBox(width: 4),
                Text(
                  'All Tools',
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
              ],
            ),
          ),
        ),
        title: Row(
          children: [
            Container(height: 20, width: 1, color: isDark ? Colors.white24 : Colors.black12, margin: const EdgeInsets.symmetric(horizontal: 8)),
            Expanded(
              child: Container(
                height: 36,
                padding: const EdgeInsets.symmetric(horizontal: 10),
                decoration: BoxDecoration(
                  border: Border.all(color: isDark ? Colors.white24 : Colors.black12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.access_time_rounded, size: 16, color: isDark ? Colors.white54 : Colors.black45),
                    const SizedBox(width: 6),
                    Expanded(
                      child: TextField(
                        controller: _titleController,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                        decoration: const InputDecoration(
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: EdgeInsets.zero,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        actions: [
          // Replaced 3-line hamburger menu & download icon with single, high-contrast Done Button
          Padding(
            padding: const EdgeInsets.only(right: 12, top: 8, bottom: 8),
            child: ElevatedButton.icon(
              onPressed: _isSaving ? null : _handleDone,
              icon: _isSaving
                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.check_rounded, size: 16),
              label: const Text('Done', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.brandRed,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.symmetric(horizontal: 14),
              ),
            ),
          ),
        ],
      ),

      // -----------------------------------------------------------------------
      // 2. Canvas Body + Floating Pill + Elevated Ribbon Toolbar
      // -----------------------------------------------------------------------
      body: Stack(
        children: [
          // A. Multi-touch Interactive Canvas Viewport
          Positioned.fill(
            child: InteractiveViewer(
              transformationController: _transformationController,
              minScale: 0.5,
              maxScale: 3.5,
              child: Center(
                child: Container(
                  width: 360,
                  height: 520,
                  margin: const EdgeInsets.only(bottom: 96),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.22),
                        blurRadius: 28,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: GestureDetector(
                    onTapUp: _handleCanvasTap,
                    child: Stack(
                      children: [
                        // 1. REAL ORIGINAL PDF DOCUMENT PAGE RENDERED IN HIGH RESOLUTION
                        Positioned.fill(
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: _isRenderingPage
                                ? Container(
                                    color: Colors.white,
                                    child: Center(
                                      child: Column(
                                        mainAxisSize: MainAxisSize.min,
                                        children: const [
                                          SizedBox(
                                            width: 28,
                                            height: 28,
                                            child: CircularProgressIndicator(
                                              color: AppColors.brandRed,
                                              strokeWidth: 2.5,
                                            ),
                                          ),
                                          SizedBox(height: 12),
                                          Text(
                                            'Rendering original document page...',
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: Colors.black54,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  )
                                : (_pageImageBytes != null
                                    ? Container(
                                        color: Colors.white,
                                        child: Image.memory(
                                          _pageImageBytes!,
                                          fit: BoxFit.contain,
                                        ),
                                      )
                                    : Container(
                                        color: Colors.white,
                                        child: Center(
                                          child: Text(
                                            _titleController.text,
                                            style: const TextStyle(color: Colors.black54),
                                          ),
                                        ),
                                      )),
                          ),
                        ),

                        // Highlights
                        ..._highlightItems.map((hl) {
                          return Positioned(
                            left: hl.rect.left,
                            top: hl.rect.top,
                            width: hl.rect.width,
                            height: hl.rect.height,
                            child: GestureDetector(
                              onTap: () {
                                if (_activeTool == EditorActiveTool.erase) {
                                  setState(() => _highlightItems.remove(hl));
                                }
                              },
                              child: Container(
                                decoration: BoxDecoration(
                                  color: hl.color.withOpacity(0.38),
                                  borderRadius: BorderRadius.circular(3),
                                ),
                              ),
                            ),
                          );
                        }),

                        // Shapes
                        ..._shapeItems.map((sh) {
                          return Positioned(
                            left: sh.rect.left,
                            top: sh.rect.top,
                            width: sh.rect.width,
                            height: sh.rect.height,
                            child: GestureDetector(
                              onTap: () {
                                if (_activeTool == EditorActiveTool.erase) {
                                  setState(() => _shapeItems.remove(sh));
                                }
                              },
                              child: Container(
                                decoration: BoxDecoration(
                                  border: Border.all(color: sh.color, width: 2),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                              ),
                            ),
                          );
                        }),

                        // Stamps (APPROVED, CONFIDENTIAL, etc.)
                        ..._stampItems.map((st) {
                          return Positioned(
                            left: st.position.dx,
                            top: st.position.dy,
                            child: GestureDetector(
                              onTap: () {
                                if (_activeTool == EditorActiveTool.erase) {
                                  setState(() => _stampItems.remove(st));
                                }
                              },
                              onPanUpdate: (d) => setState(() => st.position += d.delta),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  border: Border.all(color: st.color, width: 2),
                                  borderRadius: BorderRadius.circular(6),
                                  color: st.color.withOpacity(0.08),
                                ),
                                child: Text(
                                  st.stampText,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w900,
                                    color: st.color,
                                    letterSpacing: 1.2,
                                  ),
                                ),
                              ),
                            ),
                          );
                        }),

                        // Text Annotations
                        ..._textItems.map((item) {
                          return Positioned(
                            left: item.position.dx,
                            top: item.position.dy,
                            child: GestureDetector(
                              onTap: () {
                                if (_activeTool == EditorActiveTool.erase) {
                                  setState(() => _textItems.remove(item));
                                }
                              },
                              onPanUpdate: (d) => setState(() => item.position += d.delta),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  border: Border.all(color: Colors.blue.withOpacity(0.5), width: 1),
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
                              onTap: () {
                                if (_activeTool == EditorActiveTool.erase) {
                                  setState(() => _signatureItems.remove(sig));
                                }
                              },
                              onPanUpdate: (d) => setState(() => sig.position += d.delta),
                              child: Container(
                                width: sig.width,
                                height: sig.height,
                                decoration: BoxDecoration(
                                  border: Border.all(color: AppColors.brandRed.withOpacity(0.5), width: 1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Image.memory(sig.imageBytes, fit: BoxFit.contain),
                              ),
                            ),
                          );
                        }),

                        // Image Stamps
                        ..._imageStampItems.map((img) {
                          return Positioned(
                            left: img.position.dx,
                            top: img.position.dy,
                            child: GestureDetector(
                              onTap: () {
                                if (_activeTool == EditorActiveTool.erase) {
                                  setState(() => _imageStampItems.remove(img));
                                }
                              },
                              onPanUpdate: (d) => setState(() => img.position += d.delta),
                              child: Container(
                                width: img.width,
                                height: img.height,
                                decoration: BoxDecoration(
                                  border: Border.all(color: Colors.cyan.withOpacity(0.5), width: 1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Image.memory(img.imageBytes, fit: BoxFit.contain),
                              ),
                            ),
                          );
                        }),

                        // Redaction Blocks
                        ..._redactItems.map((redact) {
                          return Positioned(
                            left: redact.rect.left,
                            top: redact.rect.top,
                            width: redact.rect.width,
                            height: redact.rect.height,
                            child: GestureDetector(
                              onTap: () {
                                if (_activeTool == EditorActiveTool.erase) {
                                  setState(() => _redactItems.remove(redact));
                                }
                              },
                              child: Container(color: Colors.black),
                            ),
                          );
                        }),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),

          // -------------------------------------------------------------------
          // B. Elevated Floating Page & Zoom Control Pill (Lifted to bottom: 84)
          // -------------------------------------------------------------------
          Positioned(
            bottom: 84,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                height: 42,
                padding: const EdgeInsets.symmetric(horizontal: 10),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xE6101827) : const Color(0xE61E293B),
                  borderRadius: BorderRadius.circular(9999),
                  border: Border.all(color: Colors.white24, width: 0.8),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.35),
                      blurRadius: 18,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Up Arrow (Previous Page)
                    IconButton(
                      icon: const Icon(Icons.keyboard_arrow_up_rounded, size: 20, color: Colors.white),
                      visualDensity: VisualDensity.compact,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                      onPressed: _currentPage > 1
                          ? () {
                              setState(() => _currentPage--);
                              _renderPage(_currentPage);
                            }
                          : null,
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      child: Text(
                        '$_currentPage / $_totalPages',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
                      ),
                    ),
                    // Down Arrow (Next Page)
                    IconButton(
                      icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 20, color: Colors.white),
                      visualDensity: VisualDensity.compact,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                      onPressed: _currentPage < _totalPages
                          ? () {
                              setState(() => _currentPage++);
                              _renderPage(_currentPage);
                            }
                          : null,
                    ),
                    Container(height: 18, width: 1, color: Colors.white30, margin: const EdgeInsets.symmetric(horizontal: 8)),
                    // Minus (Zoom Out)
                    IconButton(
                      icon: const Icon(Icons.remove_rounded, size: 18, color: Colors.white),
                      visualDensity: VisualDensity.compact,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                      onPressed: _zoomOut,
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Text(
                        '${(_zoomScale * 100).toInt()}%',
                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Colors.white),
                      ),
                    ),
                    // Plus (Zoom In)
                    IconButton(
                      icon: const Icon(Icons.add_rounded, size: 18, color: Colors.white),
                      visualDensity: VisualDensity.compact,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                      onPressed: _zoomIn,
                    ),
                    Container(height: 18, width: 1, color: Colors.white30, margin: const EdgeInsets.symmetric(horizontal: 8)),
                    GestureDetector(
                      onTap: _fitToScreen,
                      child: Row(
                        children: const [
                          Icon(Icons.aspect_ratio_rounded, size: 16, color: Colors.white),
                          SizedBox(width: 4),
                          Text('Fit', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white)),
                        ],
                      ),
                    ),
                    const SizedBox(width: 4),
                  ],
                ),
              ),
            ),
          ),

          // -------------------------------------------------------------------
          // C. Elevated Docked Bottom Ribbon Toolbar (With All Website Tools)
          // -------------------------------------------------------------------
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              top: false,
              child: Container(
                height: 68,
                margin: const EdgeInsets.only(bottom: 4),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF101827) : Colors.white,
                  border: Border(
                    top: BorderSide(
                      color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                      width: 1,
                    ),
                  ),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.12), blurRadius: 16, offset: const Offset(0, -4)),
                  ],
                ),
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  children: [
                    // Pages / Organize
                    _buildRibbonActionBtn('Pages', Icons.layers_outlined, _showPagesBottomSheet),
                    // Undo
                    _buildRibbonActionBtn('Undo', Icons.undo_rounded, _undo, enabled: _undoStack.isNotEmpty),
                    // Redo
                    _buildRibbonActionBtn('Redo', Icons.redo_rounded, _redo, enabled: _redoStack.isNotEmpty),
                    // Divider
                    Container(height: 28, width: 1, color: isDark ? Colors.white24 : Colors.black12, margin: const EdgeInsets.symmetric(horizontal: 6, vertical: 18)),
                    // Select Tool
                    _buildRibbonToolBtn(EditorActiveTool.select, 'Select', Icons.near_me_outlined),
                    // Text Tool
                    _buildRibbonToolBtn(EditorActiveTool.text, 'Text', Icons.text_fields_rounded),
                    // Sign Tool
                    _buildRibbonActionBtn('Sign', Icons.draw_rounded, _openSignaturePad),
                    // Highlight Tool (From website)
                    _buildRibbonToolBtn(EditorActiveTool.highlight, 'Highlight', Icons.border_color_rounded),
                    // Shapes Tool (From website)
                    _buildRibbonToolBtn(EditorActiveTool.shapes, 'Shapes', Icons.crop_square_rounded),
                    // Stamp Tool (From website)
                    _buildRibbonToolBtn(EditorActiveTool.stamp, 'Stamp', Icons.verified_rounded),
                    // Redact Tool (From website)
                    _buildRibbonToolBtn(EditorActiveTool.redact, 'Redact', Icons.shield_outlined),
                    // Image Stamp Tool
                    _buildRibbonActionBtn('Image', Icons.image_outlined, _pickAndStampImage),
                    // Erase Tool
                    _buildRibbonToolBtn(EditorActiveTool.erase, 'Erase', Icons.cleaning_services_outlined),
                  ],
                ),
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
        margin: const EdgeInsets.symmetric(horizontal: 3, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? AppColors.brandRed.withOpacity(0.22) : const Color(0xFFFEE2E2))
              : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? AppColors.brandRed : Colors.transparent,
            width: 1.5,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 20,
              color: isSelected
                  ? AppColors.brandRed
                  : (isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                color: isSelected
                    ? AppColors.brandRed
                    : (isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRibbonActionBtn(String label, IconData icon, VoidCallback onTap, {bool enabled = true}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Opacity(
        opacity: enabled ? 1.0 : 0.4,
        child: Container(
          width: 58,
          margin: const EdgeInsets.symmetric(horizontal: 3, vertical: 8),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(8)),
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
      ),
    );
  }
}
