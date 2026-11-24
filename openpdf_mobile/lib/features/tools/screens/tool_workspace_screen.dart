import 'dart:io';
import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/file_service.dart';
import '../../../core/services/cloud_storage_service.dart';
import '../../../core/services/pdf_processing_service.dart';
import '../../../core/services/office_conversion_service.dart';
import '../../../core/services/image_processing_service.dart';
import '../../../core/services/ocr_scanning_service.dart';
import '../../../core/services/file_export_service.dart';
import '../../../domain/entities/tool_entity.dart';
import '../../../shared/widgets/glass/glass_container.dart';
import '../../../shared/widgets/glass/glass_button.dart';
import '../../../shared/widgets/glass/glass_download_success_dialog.dart';
import '../../../shared/widgets/document_actions_sheet.dart';
import 'pdf_editor_webview_screen.dart';
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
  String _compressPreset = 'recommended'; // 'low', 'recommended', 'high', 'custom'
  double _compressTargetKb = 200;
  bool _isCustomCompressSize = false;
  final TextEditingController _customCompressController = TextEditingController(text: '200');
  String _customCompressUnit = 'KB';

  // Image Resize Advanced Configuration States
  int _origImageWidth = 0;
  int _origImageHeight = 0;
  double _imageAspectRatio = 1.0;
  bool _lockAspectRatio = true;
  double _imagePercentage = 100.0;
  int _imageQuality = 85;
  String _imageFormat = 'jpg';
  int _imageDpi = 300;
  String _imageBgColorHex = '#FFFFFF';
  final TextEditingController _targetWidthController = TextEditingController();
  final TextEditingController _targetHeightController = TextEditingController();

  // PowerPoint Slide Size States
  String _selectedSlidePreset = '16:9';
  final TextEditingController _customSlideWidthController = TextEditingController(text: '13.33');
  final TextEditingController _customSlideHeightController = TextEditingController(text: '7.5');
  String _customSlideUnit = 'in';

  // Other Tool Configurations
  String _watermarkText = 'CONFIDENTIAL';
  int _rotateAngle = 90;

  @override
  void dispose() {
    _customCompressController.dispose();
    _targetWidthController.dispose();
    _targetHeightController.dispose();
    _customSlideWidthController.dispose();
    _customSlideHeightController.dispose();
    super.dispose();
  }

  String get _actionButtonLabel {
    if (_isProcessing) return 'Processing Document...';
    final id = widget.tool.id;
    if (id == 'edit-pdf') return 'Edit PDF';
    if (id == 'sign-pdf') return 'Sign PDF';
    if (id == 'compress-pdf') return 'Compress PDF';
    if (id == 'image-resize') return 'Resize & Compress Image';
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
    final doc = await CloudStorageService.instance.pickDocumentFromCloud(
      context: context,
      provider: provider,
    );
    if (doc != null && mounted) {
      setState(() {
        _selectedFile = File(doc.path);
        _resultFile = null;
      });
    }
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
    } else if (widget.tool.id == 'image-resize') {
      final imgs = await FileService.instance.pickImages();
      if (imgs.isNotEmpty) {
        final imgFile = imgs.first;
        try {
          final meta = await ImageProcessingService.instance.inspectImage(imgFile);
          setState(() {
            _selectedFile = imgFile;
            _resultFile = null;
            _origImageWidth = meta['width'] as int;
            _origImageHeight = meta['height'] as int;
            _imageAspectRatio = (meta['aspectRatio'] as num).toDouble();
            _targetWidthController.text = '${meta['width']}';
            _targetHeightController.text = '${meta['height']}';
          });
        } catch (_) {
          setState(() {
            _selectedFile = imgFile;
            _resultFile = null;
          });
        }
      }
    } else if (widget.tool.id == 'word-to-pdf') {
      final doc = await FileService.instance.pickWordFile();
      if (doc != null) {
        setState(() {
          _selectedFile = File(doc.path);
          _resultFile = null;
        });
      }
    } else if (widget.tool.id == 'excel-to-pdf') {
      final doc = await FileService.instance.pickExcelFile();
      if (doc != null) {
        setState(() {
          _selectedFile = File(doc.path);
          _resultFile = null;
        });
      }
    } else if (widget.tool.id == 'pptx-to-pdf') {
      final doc = await FileService.instance.pickPowerPointFile();
      if (doc != null) {
        setState(() {
          _selectedFile = File(doc.path);
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

      case 'image-resize':
        return GlassContainer(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Image Dimensions & Quality', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                  Text(
                    '$_origImageWidth × $_origImageHeight px',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Width and Height with Aspect Ratio Lock
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _targetWidthController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: 'Width (px)',
                        isDense: true,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onChanged: (val) {
                        final w = int.tryParse(val);
                        if (w != null && _lockAspectRatio && _imageAspectRatio > 0) {
                          _targetHeightController.text = (w / _imageAspectRatio).round().toString();
                        }
                      },
                    ),
                  ),
                  IconButton(
                    icon: Icon(
                      _lockAspectRatio ? Icons.link_rounded : Icons.link_off_rounded,
                      color: _lockAspectRatio ? AppColors.brandRed : Colors.grey,
                    ),
                    tooltip: 'Aspect Ratio Lock',
                    onPressed: () => setState(() => _lockAspectRatio = !_lockAspectRatio),
                  ),
                  Expanded(
                    child: TextField(
                      controller: _targetHeightController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: 'Height (px)',
                        isDense: true,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onChanged: (val) {
                        final h = int.tryParse(val);
                        if (h != null && _lockAspectRatio && _imageAspectRatio > 0) {
                          _targetWidthController.text = (h * _imageAspectRatio).round().toString();
                        }
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Percentage Presets
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Scale by Percentage', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  Text('${_imagePercentage.toInt()}%', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.brandRed)),
                ],
              ),
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                children: [25, 50, 75, 100, 150, 200].map((pct) {
                  final isSel = _imagePercentage.toInt() == pct;
                  return ChoiceChip(
                    label: Text('$pct%', style: TextStyle(fontSize: 11, color: isSel ? Colors.white : null)),
                    selected: isSel,
                    selectedColor: AppColors.brandRed,
                    onSelected: (_) {
                      setState(() {
                        _imagePercentage = pct.toDouble();
                        if (_origImageWidth > 0 && _origImageHeight > 0) {
                          final factor = pct / 100.0;
                          _targetWidthController.text = (_origImageWidth * factor).round().toString();
                          _targetHeightController.text = (_origImageHeight * factor).round().toString();
                        }
                      });
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 14),

              // Format & DPI Row
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Format', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 4),
                        DropdownButtonFormField<String>(
                          value: _imageFormat,
                          decoration: InputDecoration(
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          items: const [
                            DropdownMenuItem(value: 'jpg', child: Text('JPEG (.jpg)')),
                            DropdownMenuItem(value: 'png', child: Text('PNG (.png)')),
                            DropdownMenuItem(value: 'webp', child: Text('WebP (.webp)')),
                          ],
                          onChanged: (v) => setState(() => _imageFormat = v ?? 'jpg'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Resolution (DPI)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 4),
                        DropdownButtonFormField<int>(
                          value: _imageDpi,
                          decoration: InputDecoration(
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          items: const [
                            DropdownMenuItem(value: 72, child: Text('72 DPI (Web)')),
                            DropdownMenuItem(value: 96, child: Text('96 DPI (Screen)')),
                            DropdownMenuItem(value: 150, child: Text('150 DPI (Draft)')),
                            DropdownMenuItem(value: 300, child: Text('300 DPI (Print)')),
                            DropdownMenuItem(value: 600, child: Text('600 DPI (Ultra)')),
                          ],
                          onChanged: (v) => setState(() => _imageDpi = v ?? 300),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Quality Slider
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Quality Compression', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  Text('$_imageQuality%', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.success)),
                ],
              ),
              Slider(
                value: _imageQuality.toDouble(),
                min: 10,
                max: 100,
                divisions: 18,
                activeColor: AppColors.success,
                onChanged: (v) => setState(() => _imageQuality = v.toInt()),
              ),
            ],
          ),
        );

      case 'pdf-to-pptx':
      case 'pptx-to-pdf':
        return GlassContainer(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Slide Dimensions & Aspect Ratio', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: _selectedSlidePreset,
                decoration: InputDecoration(
                  isDense: true,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
                items: const [
                  DropdownMenuItem(value: '16:9', child: Text('Widescreen (16:9) - Standard HD')),
                  DropdownMenuItem(value: '4:3', child: Text('Standard (4:3) - Traditional Projector')),
                  DropdownMenuItem(value: '16:10', child: Text('Widescreen (16:10) - MacBook & Tablets')),
                  DropdownMenuItem(value: '1:1', child: Text('Square (1:1) - Social & Mobile')),
                  DropdownMenuItem(value: '9:16', child: Text('Portrait (9:16) - Vertical Mobile')),
                  DropdownMenuItem(value: 'A4-landscape', child: Text('A4 Landscape (297 × 210 mm)')),
                  DropdownMenuItem(value: 'A4-portrait', child: Text('A4 Portrait (210 × 297 mm)')),
                  DropdownMenuItem(value: 'A3-landscape', child: Text('A3 Landscape (420 × 297 mm)')),
                  DropdownMenuItem(value: 'A3-portrait', child: Text('A3 Portrait (297 × 420 mm)')),
                  DropdownMenuItem(value: 'Letter', child: Text('US Letter (11 × 8.5 in)')),
                  DropdownMenuItem(value: 'Legal', child: Text('US Legal (14 × 8.5 in)')),
                  DropdownMenuItem(value: 'custom', child: Text('Custom Slide Dimensions...')),
                ],
                onChanged: (v) => setState(() => _selectedSlidePreset = v ?? '16:9'),
              ),
              if (_selectedSlidePreset == 'custom') ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _customSlideWidthController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: InputDecoration(
                          labelText: 'Width',
                          isDense: true,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _customSlideHeightController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: InputDecoration(
                          labelText: 'Height',
                          isDense: true,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    DropdownButton<String>(
                      value: _customSlideUnit,
                      items: ['in', 'cm', 'mm', 'px'].map((u) => DropdownMenuItem(value: u, child: Text(u))).toList(),
                      onChanged: (u) => setState(() => _customSlideUnit = u ?? 'in'),
                    ),
                  ],
                ),
              ],
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

              // 4 Core Compression Presets
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  ChoiceChip(
                    label: const Text('Recommended (Balanced)', style: TextStyle(fontSize: 11)),
                    selected: _compressPreset == 'recommended' && !_isCustomCompressSize,
                    selectedColor: AppColors.success,
                    onSelected: (_) => setState(() {
                      _compressPreset = 'recommended';
                      _isCustomCompressSize = false;
                      _compressTargetKb = 200;
                    }),
                  ),
                  ChoiceChip(
                    label: const Text('High (Smaller File)', style: TextStyle(fontSize: 11)),
                    selected: _compressPreset == 'high' && !_isCustomCompressSize,
                    selectedColor: AppColors.brandRed,
                    onSelected: (_) => setState(() {
                      _compressPreset = 'high';
                      _isCustomCompressSize = false;
                      _compressTargetKb = 100;
                    }),
                  ),
                  ChoiceChip(
                    label: const Text('Low (High Quality)', style: TextStyle(fontSize: 11)),
                    selected: _compressPreset == 'low' && !_isCustomCompressSize,
                    selectedColor: AppColors.wordBlue,
                    onSelected: (_) => setState(() {
                      _compressPreset = 'low';
                      _isCustomCompressSize = false;
                      _compressTargetKb = 500;
                    }),
                  ),
                  ChoiceChip(
                    label: const Text('Custom Target Size', style: TextStyle(fontSize: 11)),
                    selected: _isCustomCompressSize,
                    selectedColor: AppColors.brandRed,
                    onSelected: (_) => setState(() {
                      _isCustomCompressSize = true;
                      _compressPreset = 'custom';
                    }),
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
    // If Edit PDF or Sign PDF, launch canvas directly without artificial delay popup
    if (widget.tool.id == 'edit-pdf' || widget.tool.id == 'sign-pdf') {
      if (_selectedFile == null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a PDF document first.')));
        return;
      }

      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => PdfEditorWebViewScreen(pdfFile: _selectedFile!)),
      );
      return;
    }

    // Otherwise execute processing
    await _executeProcessing();
  }

  Future<void> _executeProcessing() async {
    setState(() => _isProcessing = true);
    try {
      switch (widget.tool.id) {
        case 'image-resize':
          final targetW = int.tryParse(_targetWidthController.text) ?? _origImageWidth;
          final targetH = int.tryParse(_targetHeightController.text) ?? _origImageHeight;
          _resultFile = await ImageProcessingService.instance.resizeAndCompressImage(
            imageFile: _selectedFile!,
            targetWidth: targetW > 0 ? targetW : null,
            targetHeight: targetH > 0 ? targetH : null,
            quality: _imageQuality,
            format: _imageFormat,
            backgroundColorHex: _imageBgColorHex,
            dpi: _imageDpi,
            outputFileName: 'resized_${targetW}x${targetH}.$_imageFormat',
          );
          _resultDetails = 'Resized to ${targetW}x$targetH (${_imageFormat.toUpperCase()}, $_imageDpi DPI)';
          break;

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
            preset: _compressPreset,
          );
          _resultFile = res['file'] as File;
          _resultDetails = 'Original: ${res['originalFormatted']} → Compressed: ${res['compressedFormatted']} (${res['savedPercentage']}% saved)';
          break;

        case 'pdf-to-word':
          _resultFile = await OfficeConversionService.instance.pdfToWordDocx(pdfFile: _selectedFile!);
          _resultDetails = 'Genuine OpenXML .docx generated with headings & paragraphs';
          break;

        case 'word-to-pdf':
          _resultFile = await OfficeConversionService.instance.wordToPdf(wordFile: _selectedFile!);
          _resultDetails = 'Converted Word document into paginated vector PDF';
          break;

        case 'pdf-to-excel':
          _resultFile = await OfficeConversionService.instance.pdfToExcelXlsx(pdfFile: _selectedFile!);
          _resultDetails = 'Structured Excel Spreadsheet (.xlsx) extracted';
          break;

        case 'excel-to-pdf':
          _resultFile = await OfficeConversionService.instance.excelToPdf(excelFile: _selectedFile!);
          _resultDetails = 'Spreadsheet converted into clean table PDF report';
          break;

        case 'pdf-to-pptx':
          final customW = double.tryParse(_customSlideWidthController.text);
          final customH = double.tryParse(_customSlideHeightController.text);
          _resultFile = await OfficeConversionService.instance.pdfToPptx(
            pdfFile: _selectedFile!,
            slidePreset: _selectedSlidePreset,
            customWidth: customW,
            customHeight: customH,
            customUnit: _customSlideUnit,
          );
          _resultDetails = 'Generated PowerPoint slides ($_selectedSlidePreset)';
          break;

        case 'pptx-to-pdf':
          _resultFile = await OfficeConversionService.instance.pptxToPdf(pptxFile: _selectedFile!);
          _resultDetails = 'Converted presentation slides into landscape PDF pages';
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

      // Validate output
      if (_resultFile != null && (!await _resultFile!.exists() || await _resultFile!.length() == 0)) {
        throw Exception('Generated file is empty or missing. Please try again.');
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
                    final exportResult = await FileExportService.instance.exportDocument(
                      fileName: fileName,
                      bytes: bytes,
                      toolUsed: widget.tool.title,
                    );
                    if (mounted) {
                      if (exportResult.success) {
                        GlassDownloadSuccessDialog.show(context, exportResult);
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(exportResult.errorMessage ?? 'Download failed'),
                            backgroundColor: AppColors.error,
                          ),
                        );
                      }
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
                  onTap: () async {
                    final bytes = await _resultFile!.readAsBytes();
                    final exportResult = await FileExportService.instance.saveAsWithPicker(
                      fileName: fileName,
                      bytes: bytes,
                      toolUsed: widget.tool.title,
                    );
                    if (mounted && exportResult.success) {
                      GlassDownloadSuccessDialog.show(context, exportResult);
                    }
                  },
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
}
