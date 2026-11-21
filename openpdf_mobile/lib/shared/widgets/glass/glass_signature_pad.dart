import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import 'glass_container.dart';
import 'glass_button.dart';

class StrokePoint {
  final Offset offset;
  final Color color;
  final double strokeWidth;

  StrokePoint(this.offset, this.color, this.strokeWidth);
}

/// OpenPDF Studio - Interactive Touch Signature Drawing Pad
class GlassSignaturePad extends StatefulWidget {
  final ValueChanged<Uint8List> onSignatureSaved;

  const GlassSignaturePad({super.key, required this.onSignatureSaved});

  static Future<Uint8List?> show(BuildContext context) async {
    return showModalBottomSheet<Uint8List>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        height: MediaQuery.of(context).size.height * 0.72,
        decoration: const BoxDecoration(
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: GlassSignaturePad(
          onSignatureSaved: (bytes) => Navigator.of(context).pop(bytes),
        ),
      ),
    );
  }

  @override
  State<GlassSignaturePad> createState() => _GlassSignaturePadState();
}

class _GlassSignaturePadState extends State<GlassSignaturePad> {
  final List<List<StrokePoint>> _strokes = [];
  Color _selectedColor = const Color(0xFF0F172A); // Default crisp black
  double _strokeWidth = 3.2;

  final GlobalKey _canvasKey = GlobalKey();

  void _onPanStart(DragStartDetails details) {
    final box = _canvasKey.currentContext?.findRenderObject() as RenderBox?;
    if (box != null) {
      final local = box.globalToLocal(details.globalPosition);
      setState(() {
        _strokes.add([StrokePoint(local, _selectedColor, _strokeWidth)]);
      });
    }
  }

  void _onPanUpdate(DragUpdateDetails details) {
    final box = _canvasKey.currentContext?.findRenderObject() as RenderBox?;
    if (box != null && _strokes.isNotEmpty) {
      final local = box.globalToLocal(details.globalPosition);
      setState(() {
        _strokes.last.add(StrokePoint(local, _selectedColor, _strokeWidth));
      });
    }
  }

  void _clear() {
    setState(() {
      _strokes.clear();
    });
  }

  void _undo() {
    if (_strokes.isNotEmpty) {
      setState(() {
        _strokes.removeLast();
      });
    }
  }

  Future<void> _saveSignature() async {
    if (_strokes.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please draw your signature before saving')),
      );
      return;
    }

    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    const size = Size(500, 260);

    // Render strokes onto transparent background
    final painter = _SignaturePainter(_strokes);
    painter.paint(canvas, size);

    final picture = recorder.endRecording();
    final image = await picture.toImage(size.width.toInt(), size.height.toInt());
    final byteData = await image.toByteData(format: ui.ImageByteFormat.png);

    if (byteData != null) {
      widget.onSignatureSaved(byteData.buffer.asUint8List());
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GlassContainer(
      borderRadius: 28,
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
      child: Column(
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 42,
              height: 5,
              decoration: BoxDecoration(
                color: isDark ? const Color(0x33FFFFFF) : const Color(0x22000000),
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: AppColors.brandRed.withOpacity(0.18),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.draw_rounded, color: AppColors.brandRed, size: 20),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Draw Your Signature',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.undo_rounded, size: 20),
                    tooltip: 'Undo',
                    onPressed: _strokes.isNotEmpty ? _undo : null,
                  ),
                  IconButton(
                    icon: const Icon(Icons.clear_rounded, size: 20),
                    tooltip: 'Clear',
                    onPressed: _strokes.isNotEmpty ? _clear : null,
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 10),

          // Drawing Canvas Area
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: Container(
                key: _canvasKey,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                    width: 1.5,
                  ),
                ),
                child: GestureDetector(
                  onPanStart: _onPanStart,
                  onPanUpdate: _onPanUpdate,
                  child: CustomPaint(
                    painter: _SignaturePainter(_strokes),
                    child: Stack(
                      children: [
                        if (_strokes.isEmpty)
                          Center(
                            child: Text(
                              'Sign your name here with your finger',
                              style: TextStyle(
                                fontSize: 13,
                                color: (isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText).withOpacity(0.6),
                              ),
                            ),
                          ),
                        // Signature Baseline
                        Positioned(
                          left: 30,
                          right: 30,
                          bottom: 50,
                          child: Container(
                            height: 1,
                            color: isDark ? const Color(0x22FFFFFF) : const Color(0x1A000000),
                          ),
                        ),
                        Positioned(
                          left: 30,
                          bottom: 56,
                          child: Text(
                            '✕',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: isDark ? const Color(0x44FFFFFF) : const Color(0x33000000),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),

          const SizedBox(height: 14),

          // Ink Color & Pen Thickness Selector
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Colors
              Row(
                children: [
                  _buildColorCircle(const Color(0xFF0F172A), 'Black'),
                  const SizedBox(width: 8),
                  _buildColorCircle(const Color(0xFF2563EB), 'Blue'),
                  const SizedBox(width: 8),
                  _buildColorCircle(const Color(0xFFE5322D), 'Red'),
                ],
              ),

              // Stroke Widths
              Row(
                children: [
                  _buildStrokePill(2.0, 'Fine'),
                  const SizedBox(width: 6),
                  _buildStrokePill(3.5, 'Normal'),
                  const SizedBox(width: 6),
                  _buildStrokePill(5.5, 'Bold'),
                ],
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Apply Button
          GlassButton(
            label: 'Apply Signature to Document',
            icon: Icons.check_rounded,
            onPressed: _saveSignature,
          ),
        ],
      ),
    );
  }

  Widget _buildColorCircle(Color color, String tooltip) {
    final isSelected = _selectedColor == color;
    return GestureDetector(
      onTap: () => setState(() => _selectedColor = color),
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(
            color: isSelected ? Colors.white : Colors.transparent,
            width: 2.5,
          ),
          boxShadow: isSelected
              ? [BoxShadow(color: color.withOpacity(0.5), blurRadius: 8, offset: const Offset(0, 2))]
              : null,
        ),
      ),
    );
  }

  Widget _buildStrokePill(double width, String label) {
    final isSelected = _strokeWidth == width;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () => setState(() => _strokeWidth = width),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? AppColors.darkPrimaryAccent : AppColors.brandRed)
              : (isDark ? const Color(0x1FFFFFFF) : const Color(0x0F000000)),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? Colors.white : (isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText),
          ),
        ),
      ),
    );
  }
}

class _SignaturePainter extends CustomPainter {
  final List<List<StrokePoint>> strokes;

  _SignaturePainter(this.strokes);

  @override
  void paint(Canvas canvas, Size size) {
    for (final stroke in strokes) {
      if (stroke.isEmpty) continue;

      final paint = Paint()
        ..color = stroke.first.color
        ..strokeWidth = stroke.first.strokeWidth
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..style = PaintingStyle.stroke;

      if (stroke.length == 1) {
        canvas.drawCircle(stroke.first.offset, stroke.first.strokeWidth / 2, paint);
      } else {
        final path = Path();
        path.moveTo(stroke.first.offset.dx, stroke.first.offset.dy);

        for (int i = 1; i < stroke.length; i++) {
          final p0 = stroke[i - 1].offset;
          final p1 = stroke[i].offset;
          final mid = Offset((p0.dx + p1.dx) / 2, (p0.dy + p1.dy) / 2);
          path.quadraticBezierTo(p0.dx, p0.dy, mid.dx, mid.dy);
        }
        canvas.drawPath(path, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _SignaturePainter oldDelegate) => true;
}
