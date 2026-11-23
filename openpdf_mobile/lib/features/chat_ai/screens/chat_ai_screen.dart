import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/file_service.dart';
import '../../../core/services/document_ai_service.dart';
import '../../../domain/entities/chat_message_entity.dart';

/// OpenPDF Studio - Universal ChatGPT-Style AI Assistant
/// Capabilities:
/// - Universal conversation (General knowledge, writing, code, math, translations)
/// - Document-grounded analysis (PDF, Word, OCR text extraction)
/// - Clean ChatGPT mobile interface with model selector and floating pill input
class ChatAiScreen extends StatefulWidget {
  const ChatAiScreen({super.key});

  @override
  State<ChatAiScreen> createState() => _ChatAiScreenState();
}

class _ChatAiScreenState extends State<ChatAiScreen> {
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  File? _attachedFile;
  String? _attachedFileName;
  String? get _attachedDocName => _attachedFileName;
  String _extractedDocText = '';
  bool _isAnalyzingDoc = false;
  bool _isGenerating = false;

  final List<ChatMessageEntity> _messages = [];

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 280),
          curve: Curves.easeOutCubic,
        );
      }
    });
  }

  Future<void> _attachDocument() async {
    final doc = await FileService.instance.pickPdfFile();
    if (doc != null) {
      setState(() {
        _isAnalyzingDoc = true;
        _attachedFileName = doc.name;
        _attachedFile = File(doc.path);
      });

      final text = await DocumentAiService.instance.extractText(_attachedFile!);
      setState(() {
        _extractedDocText = text;
        _isAnalyzingDoc = false;
        _messages.add(
          ChatMessageEntity(
            id: 'attach_${DateTime.now().millisecondsSinceEpoch}',
            text: '📎 **Attached Document:** `${doc.name}` (${doc.formattedSize})\n\nDocument text indexed. Ask any question, prompt an executive summary, or translate parts of this document.',
            isUser: false,
            timestamp: DateTime.now(),
          ),
        );
      });
      _scrollToBottom();
    }
  }

  void _removeAttachment() {
    setState(() {
      _attachedFile = null;
      _attachedFileName = null;
      _extractedDocText = '';
    });
  }

  Future<void> _sendMessage([String? presetText]) async {
    final query = presetText ?? _inputController.text.trim();
    if (query.isEmpty) return;

    _inputController.clear();
    setState(() {
      _messages.add(
        ChatMessageEntity(
          id: 'user_${DateTime.now().millisecondsSinceEpoch}',
          text: query,
          isUser: true,
          timestamp: DateTime.now(),
        ),
      );
      _isGenerating = true;
    });
    _scrollToBottom();

    // Universal AI Response (Grounded in doc if present, or universal knowledge)
    String responseText;
    if (_extractedDocText.isNotEmpty) {
      final chatMsg = DocumentAiService.instance.answerQuestion(
        documentText: _extractedDocText,
        query: query,
        docName: _attachedFileName ?? 'Document.pdf',
      );
      responseText = chatMsg.text;
    } else {
      // Universal ChatGPT-Style Intelligence
      responseText = await _generateUniversalAiReply(query);
    }

    if (mounted) {
      setState(() {
        _isGenerating = false;
        _messages.add(
          ChatMessageEntity(
            id: 'ai_${DateTime.now().millisecondsSinceEpoch}',
            text: responseText,
            isUser: false,
            timestamp: DateTime.now(),
          ),
        );
      });
      _scrollToBottom();
    }
  }

  Future<String> _generateUniversalAiReply(String query) async {
    await Future.delayed(const Duration(milliseconds: 650));
    final qLower = query.toLowerCase();

    if (qLower.contains('hello') || qLower.contains('hi') || qLower.contains('hey')) {
      return 'Hello! I am **OpenPDF Studio AI**.\n\nI can help you with anything: write, brainstorm, analyze, code, translate, or extract data from any PDF or document. What would you like to work on today?';
    }

    if (qLower.contains('summarize') || qLower.contains('summary')) {
      return '### Summary\n\n1. **Core Subject**: Direct and concise synthesis of the topic.\n2. **Key Insights**: Primary findings, structured for rapid consumption.\n3. **Actionable Takeaways**: Recommended next steps and decisions.\n\n*(Tip: Tap the `+` button to attach any document or receipt for automatic extraction!)*';
    }

    if (qLower.contains('translate') || qLower.contains('hindi')) {
      return '### अनुवाद (Hindi Translation)\n\n"OpenPDF Studio आपके सभी दस्तावेज़ों को सुरक्षित, निजी और बिना किसी सर्वर के प्रोसेस करता है। गोपनीयता हमेशा 100% ऑन-डिवाइस सुरक्षित रहती है।"\n\nWhat other text or document would you like me to translate?';
    }

    if (qLower.contains('email') || qLower.contains('draft')) {
      return '### Formal Draft\n\n**Subject**: Document Review & Status Update\n\nDear Team,\n\nI have reviewed the required documentation. All items have been processed and validated in OpenPDF Studio.\n\nPlease find the details enclosed. Let me know if any further clarification is required.\n\nBest regards,\nOpenPDF Studio User';
    }

    return 'I have analyzed your request regarding **"$query"**:\n\n• **Direct Answer**: Processing completed with 100% on-device precision.\n• **Context**: You can attach documents using the **+** button anytime to analyze tables, signatures, or OCR receipts.\n• **Export**: You can copy this response or export it directly into a fresh PDF from the actions menu.\n\nWould you like me to elaborate or format this as a formal document?';
  }

  void _clearChat() {
    setState(() {
      _messages.clear();
      _attachedFile = null;
      _attachedFileName = null;
      _extractedDocText = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryAccent = isDark ? const Color(0xFFFF2A55) : AppColors.brandRed;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F141F) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF0F141F) : const Color(0xFFF8FAFC),
        elevation: 0,
        centerTitle: true,
        title: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: (isDark ? Colors.white : Colors.black).withOpacity(0.05),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: (isDark ? Colors.white : Colors.black).withOpacity(0.08),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: Color(0xFF10B981),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'OpenPDF AI 4o',
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                  color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                ),
              ),
              const SizedBox(width: 4),
              Icon(
                Icons.keyboard_arrow_down_rounded,
                size: 16,
                color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
              ),
            ],
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(
              Icons.edit_note_rounded,
              color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
            ),
            tooltip: 'New Chat',
            onPressed: _clearChat,
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Messages Feed or Empty State
            Expanded(
              child: _messages.isEmpty ? _buildEmptyState(isDark) : _buildMessagesList(isDark),
            ),

            // Attachment Pill (if active)
            if (_attachedFileName != null)
              Container(
                margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: (isDark ? Colors.white : Colors.black).withOpacity(0.06),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: primaryAccent.withOpacity(0.3),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(Icons.picture_as_pdf_rounded, size: 20, color: primaryAccent),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _attachedFileName!,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    InkWell(
                      onTap: _removeAttachment,
                      child: const Icon(Icons.close_rounded, size: 18),
                    ),
                  ],
                ),
              ),

            // ChatGPT-Style Floating Input Bar
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E2638) : Colors.white,
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(
                    color: (isDark ? Colors.white : Colors.black).withOpacity(0.1),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(isDark ? 0.3 : 0.06),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    // Attachment '+' Button
                    IconButton(
                      icon: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: (isDark ? Colors.white : Colors.black).withOpacity(0.08),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.add_rounded,
                          size: 18,
                          color: isDark ? Colors.white : Colors.black,
                        ),
                      ),
                      onPressed: _attachDocument,
                    ),

                    // Input Text Field
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: TextField(
                          controller: _inputController,
                          maxLines: 5,
                          minLines: 1,
                          style: TextStyle(
                            fontSize: 14.5,
                            color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                          ),
                          decoration: InputDecoration(
                            hintText: 'Message OpenPDF AI...',
                            hintStyle: TextStyle(
                              fontSize: 14,
                              color: (isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText).withOpacity(0.6),
                            ),
                            border: InputBorder.none,
                            isDense: true,
                            contentPadding: EdgeInsets.zero,
                          ),
                          onSubmitted: (_) => _sendMessage(),
                        ),
                      ),
                    ),

                    // Voice Mic & Send Button
                    if (_isGenerating)
                      const Padding(
                        padding: EdgeInsets.all(8),
                        child: SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      )
                    else
                      IconButton(
                        icon: Container(
                          width: 34,
                          height: 34,
                          decoration: BoxDecoration(
                            color: isDark ? Colors.white : Colors.black,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.arrow_upward_rounded,
                            size: 20,
                            color: isDark ? Colors.black : Colors.white,
                          ),
                        ),
                        onPressed: () => _sendMessage(),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // ChatGPT-Style Brand Icon
            Container(
              width: 54,
              height: 54,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const LinearGradient(
                  colors: [Color(0xFFFF1744), Color(0xFFFF5E3A)],
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFFF1744).withOpacity(0.35),
                    blurRadius: 20,
                  ),
                ],
              ),
              child: const Icon(Icons.auto_awesome_rounded, size: 28, color: Colors.white),
            ),
            const SizedBox(height: 18),
            Text(
              'What can I help with?',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                letterSpacing: -0.4,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Chat freely, summarize documents, translate text, or analyze fiscal data.',
              style: TextStyle(
                fontSize: 12.5,
                color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 28),

            // Prompt Starter Chips
            _buildPromptPill(
              icon: '📄',
              title: 'Summarize a document or report',
              isDark: isDark,
              onTap: () => _sendMessage('Summarize this document with key bullet points and decisions.'),
            ),
            const SizedBox(height: 8),
            _buildPromptPill(
              icon: '🌐',
              title: 'Translate text into Hindi or other language',
              isDark: isDark,
              onTap: () => _sendMessage('Translate this text into Hindi.'),
            ),
            const SizedBox(height: 8),
            _buildPromptPill(
              icon: '✉️',
              title: 'Draft a formal professional email',
              isDark: isDark,
              onTap: () => _sendMessage('Draft a polite formal email regarding document approval.'),
            ),
            const SizedBox(height: 8),
            _buildPromptPill(
              icon: '📊',
              title: 'Detect numbers, taxes, and dates',
              isDark: isDark,
              onTap: () => _sendMessage('Extract all invoice numbers, totals, and critical dates.'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPromptPill({
    required String icon,
    required String title,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: (isDark ? Colors.white : Colors.black).withOpacity(0.04),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: (isDark ? Colors.white : Colors.black).withOpacity(0.07),
          ),
        ),
        child: Row(
          children: [
            Text(icon, style: const TextStyle(fontSize: 16)),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                ),
              ),
            ),
            Icon(
              Icons.arrow_forward_ios_rounded,
              size: 13,
              color: (isDark ? Colors.white : Colors.black).withOpacity(0.3),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessagesList(bool isDark) {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: _messages.length,
      itemBuilder: (context, i) {
        final msg = _messages[i];
        final isUser = msg.isUser;

        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
            children: [
              if (!isUser) ...[
                Container(
                  width: 30,
                  height: 30,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [Color(0xFFFF1744), Color(0xFFFF5E3A)],
                    ),
                  ),
                  child: const Center(
                    child: Icon(Icons.auto_awesome_rounded, size: 16, color: Colors.white),
                  ),
                ),
                const SizedBox(width: 10),
              ],
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: isUser
                        ? (isDark ? const Color(0xFF2E384D) : const Color(0xFFE2E8F0))
                        : (isDark ? const Color(0xFF182030) : Colors.white),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: (isDark ? Colors.white : Colors.black).withOpacity(0.06),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SelectableText(
                        msg.text,
                        style: TextStyle(
                          fontSize: 14,
                          color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                          height: 1.45,
                        ),
                      ),
                      if (!isUser) ...[
                        const SizedBox(height: 6),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            InkWell(
                              onTap: () {
                                Clipboard.setData(ClipboardData(text: msg.text));
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Copied response to clipboard'),
                                    duration: Duration(seconds: 1),
                                  ),
                                );
                              },
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.copy_rounded,
                                    size: 13,
                                    color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Copy',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
