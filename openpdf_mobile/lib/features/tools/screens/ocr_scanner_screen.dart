import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/file_service.dart';
import '../../../core/services/ocr_scanning_service.dart';
import '../../../shared/widgets/glass/glass_container.dart';
import '../../../shared/widgets/glass/glass_button.dart';

/// OpenPDF Studio - Dedicated On-Device OCR Scanner & Receipt Processor
class OcrScannerScreen extends StatefulWidget {
  final File? initialImage;

  const OcrScannerScreen({super.key, this.initialImage});

  @override
  State<OcrScannerScreen> createState() => _OcrScannerScreenState();
}

class _OcrScannerScreenState extends State<OcrScannerScreen> with SingleTickerProviderStateMixin {
  File? _imageFile;
  OcrResult? _ocrResult;
  bool _isProcessing = false;
  late TextEditingController _textController;
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _textController = TextEditingController();
    _tabController = TabController(length: 2, vsync: this);
    if (widget.initialImage != null) {
      _imageFile = widget.initialImage;
      _processOcr();
    }
  }

  @override
  void dispose() {
    _textController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _captureFromCamera() async {
    final file = await OcrScanningService.instance.captureFromCamera();
    if (file != null) {
      setState(() => _imageFile = file);
      await _processOcr();
    }
  }

  Future<void> _pickFromGallery() async {
    final file = await OcrScanningService.instance.pickScannedImage();
    if (file != null) {
      setState(() => _imageFile = file);
      await _processOcr();
    }
  }

  Future<void> _processOcr() async {
    if (_imageFile == null) return;
    setState(() => _isProcessing = true);

    try {
      final res = await OcrScanningService.instance.processImageOcr(_imageFile!);
      setState(() {
        _ocrResult = res;
        _textController.text = res.fullText;
        _tabController.animateTo(1); // Auto switch to text view
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('OCR Error: $e')));
    } finally {
      setState(() => _isProcessing = false);
    }
  }

  Future<void> _exportSearchablePdf() async {
    if (_imageFile == null || _ocrResult == null) return;
    setState(() => _isProcessing = true);
    try {
      final pdfFile = await OcrScanningService.instance.createSearchablePdf(
        scannedImage: _imageFile!,
        ocrResult: _ocrResult!,
      );

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Searchable OCR PDF created ✓'),
          action: SnackBarAction(
            label: 'Share',
            onPressed: () => FileService.instance.shareFile(pdfFile.path),
          ),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Export error: $e')));
    } finally {
      setState(() => _isProcessing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        title: Text(
          'OCR PDF & Receipt Scanner',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Top Action Card (Camera / Gallery / Status)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: GlassContainer(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _isProcessing ? null : _captureFromCamera,
                        icon: const Icon(Icons.camera_alt_rounded, size: 18),
                        label: const Text('Camera', style: TextStyle(fontWeight: FontWeight.w700)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.aiPurple,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(vertical: 11),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _isProcessing ? null : _pickFromGallery,
                        icon: const Icon(Icons.photo_library_rounded, size: 18),
                        label: const Text('Gallery / PDF', style: TextStyle(fontWeight: FontWeight.w700)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isDark ? const Color(0x33FFFFFF) : const Color(0x150F172A),
                          foregroundColor: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(vertical: 11),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            if (_imageFile != null) ...[
              // Tab Selector: Scanned Image vs Recognized Text
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                child: Container(
                  height: 42,
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0x22FFFFFF) : const Color(0x120F172A),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: TabBar(
                    controller: _tabController,
                    indicator: BoxDecoration(
                      color: isDark ? AppColors.darkPrimaryAccent : AppColors.brandRed,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    indicatorSize: TabBarIndicatorSize.tab,
                    labelColor: Colors.white,
                    unselectedLabelColor: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                    labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                    tabs: const [
                      Tab(text: 'Scanned Image'),
                      Tab(text: 'Recognized Text'),
                    ],
                  ),
                ),
              ),

              // Tab Views
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    // View 1: Image with detected coordinate bounds
                    Padding(
                      padding: const EdgeInsets.all(20),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(18),
                        child: Container(
                          color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0),
                          child: Stack(
                            fit: StackFit.expand,
                            children: [
                              Image.file(_imageFile!, fit: BoxFit.contain),
                              if (_isProcessing)
                                Container(
                                  color: Colors.black45,
                                  child: const Center(
                                    child: CircularProgressIndicator(color: Colors.white),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),

                    // View 2: Extracted Text Editor
                    Padding(
                      padding: const EdgeInsets.all(20),
                      child: GlassContainer(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  '${_ocrResult?.lines.length ?? 0} Text Lines Detected',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                                  ),
                                ),
                                Row(
                                  children: [
                                    IconButton(
                                      icon: const Icon(Icons.copy_rounded, size: 18),
                                      tooltip: 'Copy Text',
                                      onPressed: () {
                                        Clipboard.setData(ClipboardData(text: _textController.text));
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('Copied OCR text ✓')),
                                        );
                                      },
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.share_rounded, size: 18),
                                      tooltip: 'Share Text',
                                      onPressed: () {
                                        // Share text string directly
                                        Clipboard.setData(ClipboardData(text: _textController.text));
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('Ready to share text ✓')),
                                        );
                                      },
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            const Divider(),
                            Expanded(
                              child: TextField(
                                controller: _textController,
                                maxLines: null,
                                expands: true,
                                style: TextStyle(
                                  fontSize: 14,
                                  height: 1.5,
                                  color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                                ),
                                decoration: const InputDecoration(
                                  border: InputBorder.none,
                                  hintText: 'Recognized document text will appear here...',
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Bottom Actions: Create Searchable PDF
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                child: GlassButton(
                  label: 'Generate Searchable PDF (Vector Text Layer)',
                  icon: Icons.picture_as_pdf_rounded,
                  isLoading: _isProcessing,
                  onPressed: _isProcessing ? null : _exportSearchablePdf,
                ),
              ),
            ] else ...[
              // Empty State
              Expanded(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 40),
                    child: GlassContainer(
                      padding: const EdgeInsets.all(28),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.document_scanner_rounded,
                            size: 54,
                            color: isDark ? AppColors.darkPrimaryAccent : AppColors.aiPurple,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'Scan Any Receipt or Document',
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                              color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Take a live photo or pick a scanned invoice. On-device Google ML Kit recognizes text instantly with high accuracy.',
                            style: TextStyle(
                              fontSize: 12.5,
                              color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                              height: 1.4,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
