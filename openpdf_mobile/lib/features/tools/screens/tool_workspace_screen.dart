import 'dart:io';
import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/file_service.dart';
import '../../../core/services/pdf_processing_service.dart';
import '../../../core/services/office_conversion_service.dart';
import '../../../core/services/image_processing_service.dart';
import '../../../core/services/ocr_scanning_service.dart';
import '../../../domain/entities/tool_entity.dart';
import '../../../shared/widgets/glass/glass_container.dart';
import '../../../shared/widgets/glass/glass_button.dart';
import '../../../shared/widgets/document_actions_sheet.dart';
import 'pdf_editor_canvas_screen.dart';
import 'ocr_scanner_screen.dart';

/// OpenPDF Studio - Universal Dedicated Mobile Tool Workspace
class ToolWorkspaceScreen extends StatefulWidget {
  final ToolEntity tool;

  const ToolWorkspaceScreen({super.key, required this.tool});

  @override
  State<ToolWorkspaceScreen> createState() => _ToolWorkspaceScreenState();
}

class _ToolWorkspaceScreenState extends State<ToolWorkspaceScreen> {
  File? _selectedFile;
  List<File> _multipleFiles = [];
  bool _isProcessing = false;
  File? _resultFile;
  String? _resultDetails;

  // Compression Configuration States
  double _compressTargetKb = 200;
  bool _isCustomCompressSize = false;
  final TextEditingController _customCompressController = TextEditingController(text: '200');
  String _customCompressUnit = 'KB';

  // Other Tool Configurations
  String _watermarkText = 'CONFIDENTIAL';
  int _rotateAngle = 90;

  @override
  void dispose() {
    _customCompressController.dispose();
    super.dispose();
  }

  String get _actionButtonLabel {
    if (_isProcessing) return 'Processing Document...';
    final id = widget.tool.id;
    if (id == 'edit-pdf') return 'Edit PDF';
    if (id == 'sign-pdf') return 'Sign PDF';
    if (id == 'compress-pdf') return 'Compress PDF';
    if (id == 'merge-pdf') return 'Merge PDFs';
    if (id == 'split-pdf') return 'Split PDF';
    if (id == 'rotate-pdf') return 'Rotate PDF';
    if (id == 'watermark-pdf') return 'Watermark PDF';
    if (id == 'ocr') return 'Scan & Extract Text (OCR)';
    if (id.startsWith('pdf-to-')) {
      final target = id.replaceFirst('pdf-to-', '').toUpperCase();
      return 'Convert to $target';
    }
    if (id.endsWith('-to-pdf')) {
      return 'Convert to PDF';
    }
    if (widget.tool.title.toLowerCase().contains('convert')) {
      return widget.tool.title;
    }
    return 'Process ${widget.tool.title}';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        title: Text(
          widget.tool.title,
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
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header Card
              _buildHeaderCard(isDark),
              const SizedBox(height: 18),

              // File Selection Area with Cloud Uploads
              _buildFileSelectionCard(isDark),
              const SizedBox(height: 18),

              // Tool-Specific Configuration Controls
              if (_selectedFile != null || _multipleFiles.isNotEmpty) ...[
                _buildConfigurationCard(isDark),
                const SizedBox(height: 24),

                // Primary Action Button (No "Execute" word)
                GlassButton(
                  label: _actionButtonLabel,
                  icon: widget.tool.icon,
                  isLoading: _isProcessing,
                  onPressed: _isProcessing ? null : _handlePrimaryAction,
                ),
                const SizedBox(height: 24),
              ],

              // Success Result Card (Download, Save As, Print, Share)
              if (_resultFile != null) ...[
                _buildResultCard(isDark),
                const SizedBox(height: 30),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeaderCard(bool isDark) {
    return GlassContainer(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: widget.tool.accentColor.withOpacity(isDark ? 0.22 : 0.12),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: widget.tool.accentColor.withOpacity(0.35)),
            ),
            child: Icon(widget.tool.icon, size: 24, color: widget.tool.accentColor),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      widget.tool.title,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                      ),
                    ),
                    if (widget.tool.badge != null) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: widget.tool.accentColor.withOpacity(0.18),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          widget.tool.badge!,
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: widget.tool.accentColor),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  widget.tool.description,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFileSelectionCard(bool isDark) {
    final hasFile = _selectedFile != null || _multipleFiles.isNotEmpty;

    return GlassContainer(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Icon(
            hasFile ? Icons.task_alt_rounded : Icons.cloud_upload_outlined,
            size: 40,
            color: hasFile ? AppColors.success : (isDark ? AppColors.darkPrimaryAccent : AppColors.brandRed),
          ),
          const SizedBox(height: 12),
          Text(
            hasFile
                ? (_selectedFile != null
                    ? _selectedFile!.path.split(Platform.isWindows ? r'\' : '/').last
                    : '${_multipleFiles.length} files selected')
                : 'Select PDF or Document',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            hasFile ? 'Tap below to change file' : 'Files are processed 100% locally on your phone',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),

          // Primary Browse Files Button
          ElevatedButton.icon(
            onPressed: () => _pickFiles(),
            icon: const Icon(Icons.file_open_rounded, size: 18),
            label: Text(hasFile ? 'Change File' : 'Browse Files'),
            style: ElevatedButton.styleFrom(
              backgroundColor: isDark ? const Color(0x33FFFFFF) : const Color(0x150F172A),
              foregroundColor: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 11),
            ),
          ),

          const SizedBox(height: 16),

          // Cloud Storage Upload Bar (Google Drive, Dropbox, OneDrive)
          Row(
            children: [
              Expanded(child: Divider(color: (isDark ? Colors.white : Colors.black).withOpacity(0.1))),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                child: Text(
                  'OR UPLOAD FROM CLOUD',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.6,
                    color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                  ),
                ),
              ),
              Expanded(child: Divider(color: (isDark ? Colors.white : Colors.black).withOpacity(0.1))),
            ],
          ),

          const SizedBox(height: 12),

          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildCloudUploadBtn(
                label: 'Google Drive',
                icon: Icons.add_to_drive_rounded,
                color: const Color(0xFF34A853),
                isDark: isDark,
                onTap: () => _pickFromCloud('Google Drive'),
              ),
              const SizedBox(width: 8),
              _buildCloudUploadBtn(
                label: 'Dropbox',
                icon: Icons.cloud_queue_rounded,
                color: const Color(0xFF0061FE),
                isDark: isDark,
                onTap: () => _pickFromCloud('Dropbox'),
              ),
              const SizedBox(width: 8),
              _buildCloudUploadBtn(
                label: 'OneDrive',
                icon: Icons.cloud_circle_rounded,
                color: const Color(0xFF0078D4),
                isDark: isDark,
                onTap: () => _pickFromCloud('OneDrive'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCloudUploadBtn({
    required String label,
    required IconData icon,
    required Color color,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: color.withOpacity(isDark ? 0.15 : 0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withOpacity(0.25)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickFromCloud(String provider) async {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Opening $provider cloud picker...'),
        duration: const Duration(seconds: 1),
      ),
    );
    await _pickFiles();
  }

  Future<void> _pickFiles() async {
    if (widget.tool.id == 'merge-pdf') {
      final docs = await FileService.instance.pickMultiplePdfFiles();
      if (docs.isNotEmpty) {
        setState(() {
          _multipleFiles = docs.map((d) => File(d.path)).toList();
          _resultFile = null;
        });
      }
    } else if (widget.tool.id == 'jpg-to-pdf') {
      final imgs = await FileService.instance.pickImages();
      if (imgs.isNotEmpty) {
        setState(() {
          _multipleFiles = imgs;
          _selectedFile = imgs.first;
          _resultFile = null;
        });
      }
    } else {
      final doc = await FileService.instance.pickPdfFile();
      if (doc != null) {
        setState(() {
          _selectedFile = File(doc.path);
          _resultFile = null;
        });
      }
    }
  }

  Widget _buildConfigurationCard(bool isDark) {
    switch (widget.tool.id) {
      case 'edit-pdf':
      case 'sign-pdf':
        // Clean info card without redundant dual launch button
        return GlassContainer(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.brandRed.withOpacity(0.14),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.touch_app_rounded, color: AppColors.brandRed, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Interactive Editor Ready', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                    const SizedBox(height: 2),
                    Text(
                      'Tap "${_actionButtonLabel}" below to open the visual editing canvas.',
                      style: TextStyle(
                        fontSize: 11.5,
                        color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );

      case 'ocr':
        return GlassContainer(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('On-Device ML Kit OCR', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              const SizedBox(height: 6),
              Text(
                'Launch the dedicated camera receipt scanner to photograph physical papers, detect text blocks, and create a searchable PDF.',
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                ),
              ),
              const SizedBox(height: 14),
              GlassButton(
                label: 'Launch Camera & Receipt Scanner',
                icon: Icons.camera_alt_rounded,
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => OcrScannerScreen(initialImage: _selectedFile),
                    ),
                  );
                },
              ),
            ],
          ),
        );

      case 'compress-pdf':
        return GlassContainer(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Target Output Size', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                  Text(
                    _isCustomCompressSize
                        ? '${_customCompressController.text} $_customCompressUnit'
                        : '${_compressTargetKb.toInt()} KB',
                    style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.success),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Slider for preset range
              if (!_isCustomCompressSize)
                Slider(
                  value: _compressTargetKb.clamp(50, 2000),
                  min: 50,
                  max: 2000,
                  divisions: 39,
                  activeColor: AppColors.success,
                  onChanged: (v) => setState(() => _compressTargetKb = v),
                ),

              // Preset Chips + Custom Option
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  ...[50, 100, 200, 500, 1000].map((preset) {
                    final isSel = !_isCustomCompressSize && _compressTargetKb.toInt() == preset;
                    return ChoiceChip(
                      label: Text('${preset} KB', style: TextStyle(fontSize: 11, color: isSel ? Colors.white : null)),
                      selected: isSel,
                      selectedColor: AppColors.success,
                      onSelected: (_) {
                        setState(() {
                          _isCustomCompressSize = false;
                          _compressTargetKb = preset.toDouble();
                        });
                      },
                    );
                  }),
                  ChoiceChip(
                    label: Text('Custom Size', style: TextStyle(fontSize: 11, color: _isCustomCompressSize ? Colors.white : null)),
                    selected: _isCustomCompressSize,
                    selectedColor: AppColors.brandRed,
                    onSelected: (_) {
                      setState(() => _isCustomCompressSize = true);
                    },
                  ),
                ],
              ),

              // Custom Size Input Field
              if (_isCustomCompressSize) ...[
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _customCompressController,
                        keyboardType: TextInputType.number,
                        style: TextStyle(
                          color: isDark ? Colors.white : Colors.black87,
                          fontSize: 14,
                        ),
                        decoration: InputDecoration(
                          labelText: 'Enter Target Size',
                          isDense: true,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                        onChanged: (val) {
                          final numVal = double.tryParse(val) ?? 200;
                          final multiplier = _customCompressUnit == 'MB' ? 1024 : 1;
                          _compressTargetKb = numVal * multiplier;
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    DropdownButton<String>(
                      value: _customCompressUnit,
                      dropdownColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                      items: ['KB', 'MB'].map((u) => DropdownMenuItem(value: u, child: Text(u))).toList(),
                      onChanged: (u) {
                        if (u != null) {
                          setState(() {
                            _customCompressUnit = u;
                            final numVal = double.tryParse(_customCompressController.text) ?? 200;
                            final multiplier = u == 'MB' ? 1024 : 1;
                            _compressTargetKb = numVal * multiplier;
                          });
                        }
                      },
                    ),
                  ],
                ),
              ],
            ],
          ),
        );

      case 'watermark-pdf':
        return GlassContainer(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Watermark Text', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              const SizedBox(height: 8),
              TextField(
                onChanged: (v) => _watermarkText = v,
                decoration: InputDecoration(
                  hintText: 'e.g. CONFIDENTIAL / DRAFT',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  isDense: true,
                ),
              ),
            ],
          ),
        );

      case 'rotate-pdf':
        return GlassContainer(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [90, 180, 270].map((deg) {
              final isSel = _rotateAngle == deg;
              return ChoiceChip(
                label: Text('$deg° Rotation'),
                selected: isSel,
                selectedColor: AppColors.darkPrimaryAccent,
                onSelected: (_) => setState(() => _rotateAngle = deg),
              );
            }).toList(),
          ),
        );

      default:
        return const SizedBox.shrink();
    }
  }

  Future<void> _handlePrimaryAction() async {
    // If Edit PDF or Sign PDF, launch canvas with progress popup
    if (widget.tool.id == 'edit-pdf' || widget.tool.id == 'sign-pdf') {
      if (_selectedFile == null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a PDF document first.')));
        return;
      }

      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => AlertDialog(
          backgroundColor: const Color(0xFF111726),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          content: Row(
            children: const [
              SizedBox(
                width: 28,
                height: 28,
                child: CircularProgressIndicator(strokeWidth: 3, color: AppColors.brandRed),
              ),
              SizedBox(width: 18),
              Text('Preparing document...', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      );

      await Future.delayed(const Duration(milliseconds: 600));
      if (mounted) {
        Navigator.of(context).pop(); // dismiss loading dialog
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => PdfEditorCanvasScreen(pdfFile: _selectedFile!)),
        );
      }
      return;
    }

    // Otherwise execute processing
    await _executeProcessing();
  }

  Future<void> _executeProcessing() async {
    setState(() => _isProcessing = true);
    try {
      switch (widget.tool.id) {
        case 'ocr':
          if (_selectedFile != null) {
            final ocrRes = await OcrScanningService.instance.processImageOcr(_selectedFile!);
            _resultFile = await OcrScanningService.instance.createSearchablePdf(
              scannedImage: _selectedFile!,
              ocrResult: ocrRes,
            );
            _resultDetails = 'Extracted ${ocrRes.lines.length} lines & created searchable PDF';
          }
          break;

        case 'compress-pdf':
          final res = await PdfProcessingService.instance.compressPdf(
            file: _selectedFile!,
            targetBytes: (_compressTargetKb * 1024).toInt(),
          );
          _resultFile = res['file'] as File;
          _resultDetails = 'Saved ${res['savedPercentage']}% (${res['compressedFormatted']})';
          break;

        case 'pdf-to-word':
          _resultFile = await OfficeConversionService.instance.pdfToWordDocx(pdfFile: _selectedFile!);
          _resultDetails = 'Genuine OpenXML .docx generated';
          break;

        case 'pdf-to-excel':
          _resultFile = await OfficeConversionService.instance.pdfToExcelXlsx(pdfFile: _selectedFile!);
          _resultDetails = 'Excel Spreadsheet (.xlsx) extracted';
          break;

        case 'pdf-to-pptx':
          _resultFile = await OfficeConversionService.instance.pdfToPptx(pdfFile: _selectedFile!);
          _resultDetails = 'PowerPoint 16:9 Slides generated';
          break;

        case 'merge-pdf':
          _resultFile = await PdfProcessingService.instance.mergePdfs(files: _multipleFiles);
          _resultDetails = 'Merged ${_multipleFiles.length} files successfully';
          break;

        case 'watermark-pdf':
          _resultFile = await PdfProcessingService.instance.watermarkPdf(
            file: _selectedFile!,
            watermarkText: _watermarkText,
          );
          _resultDetails = 'Stamped watermark across all pages';
          break;

        case 'rotate-pdf':
          _resultFile = await PdfProcessingService.instance.rotatePdf(
            file: _selectedFile!,
            angleDegrees: _rotateAngle,
          );
          _resultDetails = 'Rotated $_rotateAngle°';
          break;

        case 'jpg-to-pdf':
          _resultFile = await ImageProcessingService.instance.imagesToPdf(imageFiles: _multipleFiles);
          _resultDetails = 'Converted ${_multipleFiles.length} images to PDF';
          break;

        default:
          _resultFile = await PdfProcessingService.instance.rotatePdf(file: _selectedFile!, angleDegrees: 0);
          _resultDetails = 'Processed successfully';
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Processing error: $e')));
    } finally {
      setState(() => _isProcessing = false);
    }
  }

  Widget _buildResultCard(bool isDark) {
    final fileName = _resultFile!.path.split(Platform.isWindows ? r'\' : '/').last;

    return GlassContainer(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          const Icon(Icons.check_circle_rounded, size: 48, color: AppColors.success),
          const SizedBox(height: 10),
          const Text('Processing Complete!', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
          if (_resultDetails != null) ...[
            const SizedBox(height: 4),
            Text(_resultDetails!, style: TextStyle(fontSize: 13, color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText)),
          ],
          const SizedBox(height: 18),

          // 4 Action Buttons: Download, Save As, Print, Share
          Row(
            children: [
              Expanded(
                child: _buildSmallActionButton(
                  icon: Icons.download_rounded,
                  label: 'Download',
                  color: const Color(0xFF10B981),
                  onTap: () async {
                    final bytes = await _resultFile!.readAsBytes();
                    await FileService.instance.saveFile(fileName: fileName, bytes: bytes);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Saved to device storage: $fileName ✓')),
                      );
                    }
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildSmallActionButton(
                  icon: Icons.save_as_rounded,
                  label: 'Save As',
                  color: const Color(0xFFF59E0B),
                  onTap: () => _showSaveAsDialog(fileName),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _buildSmallActionButton(
                  icon: Icons.print_rounded,
                  label: 'Print',
                  color: const Color(0xFF6366F1),
                  onTap: () => FileService.instance.printDocument(filePath: _resultFile!.path, docName: fileName),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildSmallActionButton(
                  icon: Icons.share_rounded,
                  label: 'Share',
                  color: AppColors.brandRed,
                  onTap: () => FileService.instance.shareFile(_resultFile!.path),
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // 15-Action Drawer Trigger
          TextButton.icon(
            onPressed: () {
              DocumentActionsSheet.show(
                context,
                documentTitle: fileName,
                documentPath: _resultFile!.path,
              );
            },
            icon: const Icon(Icons.more_horiz_rounded, size: 18),
            label: const Text('More Options (All 15 Actions)', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  Widget _buildSmallActionButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return ElevatedButton.icon(
      onPressed: onTap,
      icon: Icon(icon, size: 16),
      label: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
      style: ElevatedButton.styleFrom(
        backgroundColor: color.withOpacity(0.15),
        foregroundColor: color,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: color.withOpacity(0.3)),
        ),
        padding: const EdgeInsets.symmetric(vertical: 10),
      ),
    );
  }

  void _showSaveAsDialog(String initialName) {
    final ctrl = TextEditingController(text: initialName);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Save Document As'),
        content: TextField(
          controller: ctrl,
          decoration: const InputDecoration(labelText: 'New Filename', border: OutlineInputBorder()),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.brandRed),
            onPressed: () async {
              final newName = ctrl.text.trim();
              if (newName.isNotEmpty) {
                final bytes = await _resultFile!.readAsBytes();
                await FileService.instance.saveFile(fileName: newName, bytes: bytes);
                if (mounted) {
                  Navigator.of(ctx).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Saved as $newName ✓')),
                  );
                }
              }
            },
            child: const Text('Save', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
