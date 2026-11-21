import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../domain/entities/tool_entity.dart';

/// Complete Catalog of All 23 OpenPDF Studio Tools
class ToolsData {
  ToolsData._();

  static const List<ToolEntity> allTools = [
    // 1. Edit PDF
    ToolEntity(
      id: 'edit-pdf',
      title: 'Edit PDF',
      description: 'Edit existing text in-place directly on PDF pages, match original fonts, add signatures, shapes, and notes.',
      category: ToolCategory.edit,
      icon: Icons.edit_note_rounded,
      accentColor: AppColors.brandRed,
      badge: 'Popular',
      isPopular: true,
      keywords: ['edit', 'modify', 'text', 'replace', 'signature', 'annotate', 'fonts'],
    ),

    // 2. Compress PDF
    ToolEntity(
      id: 'compress-pdf',
      title: 'Compress PDF',
      description: 'Specify exact target size in KB, MB, or GB (e.g. 100 KB for Govt/Job portals or 1 MB for email). Fast & lossless quality.',
      category: ToolCategory.optimize,
      icon: Icons.compress_rounded,
      accentColor: AppColors.success,
      badge: 'Custom KB/MB',
      isPopular: true,
      keywords: ['compress', 'reduce', 'shrink', 'smaller', 'kb', 'mb', 'optimize'],
    ),

    // 3. PDF to Word
    ToolEntity(
      id: 'pdf-to-word',
      title: 'PDF to Word',
      description: 'Convert PDF into editable Microsoft Word (.docx) documents with headings, paragraphs, bold, and clean formatting.',
      category: ToolCategory.convertFrom,
      icon: Icons.description_rounded,
      accentColor: AppColors.wordBlue,
      badge: 'DOCX Export',
      isPopular: true,
      keywords: ['word', 'docx', 'doc', 'convert', 'export', 'formatting'],
    ),

    // 4. PDF to Excel
    ToolEntity(
      id: 'pdf-to-excel',
      title: 'PDF to Excel',
      description: 'Extract tabular data, bank statements, and invoices into structured Microsoft Excel (.xlsx) spreadsheets & CSV files.',
      category: ToolCategory.convertFrom,
      icon: Icons.table_chart_rounded,
      accentColor: AppColors.excelGreen,
      badge: 'XLSX / CSV',
      isPopular: true,
      keywords: ['excel', 'xlsx', 'csv', 'spreadsheet', 'table', 'extract', 'invoice'],
    ),

    // 5. PDF to PowerPoint
    ToolEntity(
      id: 'pdf-to-pptx',
      title: 'PDF to PowerPoint',
      description: 'Transform PDF documents into 16:9 presentation slide decks (.pptx) ready for Microsoft PowerPoint & Google Slides.',
      category: ToolCategory.convertFrom,
      icon: Icons.slideshow_rounded,
      accentColor: AppColors.pptOrange,
      badge: '16:9 Slides',
      keywords: ['powerpoint', 'ppt', 'pptx', 'presentation', 'slides', 'deck'],
    ),

    // 6. Word to PDF
    ToolEntity(
      id: 'word-to-pdf',
      title: 'Word to PDF',
      description: 'Convert Word documents (.docx, .doc, .rtf) into professional, high-resolution paginated PDF documents.',
      category: ToolCategory.convertTo,
      icon: Icons.picture_as_pdf_rounded,
      accentColor: AppColors.wordBlue,
      badge: 'Instant',
      keywords: ['word', 'docx', 'create', 'convert to pdf'],
    ),

    // 7. Excel to PDF
    ToolEntity(
      id: 'excel-to-pdf',
      title: 'Excel to PDF',
      description: 'Convert Excel spreadsheets and CSV sheets into executive formatted PDF reports with zebra tables and headers.',
      category: ToolCategory.convertTo,
      icon: Icons.table_rows_rounded,
      accentColor: AppColors.excelGreen,
      badge: 'Table Report',
      keywords: ['excel', 'spreadsheet', 'csv', 'table', 'report'],
    ),

    // 8. PowerPoint to PDF
    ToolEntity(
      id: 'pptx-to-pdf',
      title: 'PowerPoint to PDF',
      description: 'Convert presentation slide decks (.pptx) into high-resolution landscape presentation PDF documents.',
      category: ToolCategory.convertTo,
      icon: Icons.present_to_all_rounded,
      accentColor: AppColors.pptOrange,
      badge: 'Deck to PDF',
      keywords: ['powerpoint', 'ppt', 'slides', 'deck', 'convert'],
    ),

    // 9. PDF AI Summarizer
    ToolEntity(
      id: 'ai-summarizer',
      title: 'PDF AI Summarizer',
      description: 'Extract executive summaries, key bullet takeaways, or ask questions to your document offline.',
      category: ToolCategory.ai,
      icon: Icons.auto_awesome_rounded,
      accentColor: AppColors.aiPurple,
      badge: 'AI Powered',
      isPopular: true,
      keywords: ['ai', 'summarize', 'summary', 'takeaways', 'intelligence'],
    ),

    // 10. PDF Translator
    ToolEntity(
      id: 'translator',
      title: 'PDF Translator',
      description: 'Multi-language document translation for Hindi, Spanish, French, German, Bengali, and Arabic.',
      category: ToolCategory.ai,
      icon: Icons.translate_rounded,
      accentColor: AppColors.info,
      badge: 'Multi-Lang',
      keywords: ['translate', 'hindi', 'language', 'bengali', 'spanish'],
    ),

    // 11. HTML to PDF
    ToolEntity(
      id: 'html-to-pdf',
      title: 'HTML to PDF',
      description: 'Real-time HTML/CSS code editor with live preview and instant A4 PDF export.',
      category: ToolCategory.convertTo,
      icon: Icons.code_rounded,
      accentColor: AppColors.scannerTeal,
      badge: 'Live Editor',
      keywords: ['html', 'css', 'code', 'web', 'export'],
    ),

    // 12. Unlock PDF
    ToolEntity(
      id: 'unlock-pdf',
      title: 'Unlock PDF',
      description: 'Strip passwords, editing locks, and printing restrictions from protected PDF files.',
      category: ToolCategory.security,
      icon: Icons.lock_open_rounded,
      accentColor: AppColors.warning,
      badge: 'Security',
      keywords: ['unlock', 'password', 'decrypt', 'permissions', 'security'],
    ),

    // 13. PDF Convert to Scanner
    ToolEntity(
      id: 'pdf-scanner',
      title: 'PDF Convert to Scanner',
      description: 'Transform clean digital PDFs into authentic photocopies with contrast, paper grain, and skew.',
      category: ToolCategory.optimize,
      icon: Icons.document_scanner_rounded,
      accentColor: AppColors.darkPrimaryAccent,
      badge: 'Photocopy Look',
      keywords: ['scanner', 'photocopy', 'black and white', 'grain', 'contrast'],
    ),

    // 14. Merge PDF
    ToolEntity(
      id: 'merge-pdf',
      title: 'Merge PDF',
      description: 'Combine multiple PDF files into one unified document with drag-and-drop reordering.',
      category: ToolCategory.organize,
      icon: Icons.call_merge_rounded,
      accentColor: AppColors.organizeAmber,
      badge: 'Most Used',
      isPopular: true,
      keywords: ['merge', 'combine', 'join', 'unify', 'attach'],
    ),

    // 15. Split PDF
    ToolEntity(
      id: 'split-pdf',
      title: 'Split PDF',
      description: 'Separate one page or a whole set for easy conversion into independent PDF files with page range picker.',
      category: ToolCategory.organize,
      icon: Icons.call_split_rounded,
      accentColor: AppColors.pptOrange,
      keywords: ['split', 'extract', 'separate', 'divide', 'pages'],
    ),

    // 16. JPG to PDF
    ToolEntity(
      id: 'jpg-to-pdf',
      title: 'JPG to PDF',
      description: 'Convert JPG, PNG, and WebP images to PDF in seconds. Easily adjust orientation and margins.',
      category: ToolCategory.convertTo,
      icon: Icons.add_photo_alternate_rounded,
      accentColor: AppColors.warning,
      isPopular: true,
      keywords: ['jpg', 'png', 'image', 'photo', 'picture', 'convert'],
    ),

    // 17. PDF to JPG
    ToolEntity(
      id: 'pdf-to-jpg',
      title: 'PDF to JPG',
      description: 'Convert each PDF page into a high-resolution JPG image or extract all embedded images.',
      category: ToolCategory.convertFrom,
      icon: Icons.image_rounded,
      accentColor: AppColors.aiPurple,
      isPopular: true,
      keywords: ['pdf to jpg', 'extract images', 'photos', 'pictures'],
    ),

    // 18. Resize & Compress Image
    ToolEntity(
      id: 'image-resize',
      title: 'Resize & Compress Image',
      description: 'Resize JPG, PNG, and WebP graphics by exact pixel dimensions or percentage while adjusting quality.',
      category: ToolCategory.optimize,
      icon: Icons.photo_size_select_large_rounded,
      accentColor: AppColors.imageCyan,
      keywords: ['resize', 'compress image', 'dimensions', 'resolution'],
    ),

    // 19. Rotate PDF
    ToolEntity(
      id: 'rotate-pdf',
      title: 'Rotate PDF',
      description: 'Rotate your PDF pages 90°, 180°, or 270°. Perfect for orienting scanned papers correctly.',
      category: ToolCategory.organize,
      icon: Icons.rotate_right_rounded,
      accentColor: AppColors.info,
      keywords: ['rotate', 'turn', 'orientation', 'landscape', 'portrait'],
    ),

    // 20. Sign PDF
    ToolEntity(
      id: 'sign-pdf',
      title: 'Sign PDF',
      description: 'Sign a document yourself or apply signatures directly onto contracts, agreements, and forms.',
      category: ToolCategory.edit,
      icon: Icons.draw_rounded,
      accentColor: AppColors.wordBlue,
      isPopular: true,
      keywords: ['sign', 'signature', 'e-sign', 'contract', 'initials'],
    ),

    // 21. Watermark PDF
    ToolEntity(
      id: 'watermark-pdf',
      title: 'Watermark PDF',
      description: 'Stamp an image or text over your PDF in seconds. Choose typography, transparency, and position.',
      category: ToolCategory.edit,
      icon: Icons.branding_watermark_rounded,
      accentColor: const Color(0xFFEC4899),
      keywords: ['watermark', 'stamp', 'copyright', 'diagonal', 'logo'],
    ),

    // 22. OCR PDF & Inpaint
    ToolEntity(
      id: 'ocr',
      title: 'OCR PDF & Inpaint',
      description: 'Convert non-selectable scanned documents into editable text using local Tesseract OCR & OpenCV inpainting.',
      category: ToolCategory.ai,
      icon: Icons.text_snippet_rounded,
      accentColor: AppColors.aiPurple,
      badge: 'ML Kit',
      keywords: ['ocr', 'scanned', 'extract text', 'receipt', 'inpaint'],
    ),

    // 23. Redact PDF
    ToolEntity(
      id: 'redact',
      title: 'Redact PDF',
      description: 'Permanently purge sensitive text characters, numbers, and personal confidential data from the stream.',
      category: ToolCategory.security,
      icon: Icons.shield_rounded,
      accentColor: AppColors.securityCrimson,
      badge: 'Security',
      keywords: ['redact', 'blackout', 'confidential', 'privacy', 'security'],
    ),
  ];
}
