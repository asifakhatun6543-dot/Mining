import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/services/file_service.dart';
import '../../../core/services/document_ai_service.dart';
import '../../../domain/entities/chat_message_entity.dart';
import '../../../shared/widgets/glass/glass_container.dart';

/// OpenPDF Studio - Document-Aware Conversational AI Screen
class ChatAiScreen extends StatefulWidget {
  const ChatAiScreen({super.key});

  @override
  State<ChatAiScreen> createState() => _ChatAiScreenState();
}

class _ChatAiScreenState extends State<ChatAiScreen> {
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  File? _activeDocFile;
  String _activeDocName = 'No PDF Selected';
  String _activeDocText = '';
  bool _isAnalyzingDoc = false;

  final List<ChatMessageEntity> _messages = [
    ChatMessageEntity(
      id: 'welcome_1',
      text: '👋 **Welcome to OpenPDF AI Assistant!**\n\nChoose any PDF document from your device to begin. I can extract executive summaries, answer questions, detect fiscal dates and numbers, translate to Hindi, or draft emails—100% privately on your device!',
      isUser: false,
      timestamp: DateTime.now(),
    ),
  ];

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _pickDocument() async {
    final doc = await FileService.instance.pickPdfFile();
    if (doc != null) {
      setState(() {
        _isAnalyzingDoc = true;
        _activeDocName = doc.name;
        _activeDocFile = File(doc.path);
      });

      final text = await DocumentAiService.instance.extractText(_activeDocFile!);
      setState(() {
        _activeDocText = text;
        _isAnalyzingDoc = false;
        _messages.add(
          ChatMessageEntity(
            id: 'loaded_${DateTime.now().millisecondsSinceEpoch}',
            text: '📄 **Loaded "${doc.name}"** (${doc.formattedSize})\n\nDocument text successfully extracted. You can now ask questions, request an executive summary, or tap any quick action below!',
            isUser: false,
            timestamp: DateTime.now(),
            documentCitation: doc.name,
          ),
        );
      });
      _scrollToBottom();
    }
  }

  void _handleSendMessage([String? overrideText]) {
    final query = overrideText ?? _inputController.text.trim();
    if (query.isEmpty) return;

    setState(() {
      _messages.add(
        ChatMessageEntity(
          id: 'user_${DateTime.now().millisecondsSinceEpoch}',
          text: query,
          isUser: true,
          timestamp: DateTime.now(),
        ),
      );
      _inputController.clear();
    });
    _scrollToBottom();

    // Check if document is loaded
    if (_activeDocText.isEmpty) {
      Future.delayed(const Duration(milliseconds: 300), () {
        setState(() {
          _messages.add(
            ChatMessageEntity(
              id: 'ai_warn_${DateTime.now().millisecondsSinceEpoch}',
              text: '📎 **Please Select a PDF Document First**\n\nTap **"Choose PDF"** at the top bar so I can analyze its content and answer your questions.',
              isUser: false,
              timestamp: DateTime.now(),
            ),
          );
        });
        _scrollToBottom();
      });
      return;
    }

    // Process answer with document AI service
    Future.delayed(const Duration(milliseconds: 350), () {
      final answer = DocumentAiService.instance.answerQuestion(
        query: query,
        documentText: _activeDocText,
        docName: _activeDocName,
      );
      setState(() {
        _messages.add(answer);
      });
      _scrollToBottom();
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent + 80,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // Header Bar
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [AppColors.aiPurple, Color(0xFFA855F7)]),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 20),
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            AppStrings.chatAiTitle,
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                              color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                            ),
                          ),
                          Text(
                            AppStrings.chatAiSubtitle,
                            style: TextStyle(
                              fontSize: 11,
                              color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_sweep_outlined, size: 22),
                    tooltip: 'Clear Chat',
                    onPressed: () {
                      setState(() {
                        _messages.clear();
                        _messages.add(
                          ChatMessageEntity(
                            id: 'welcome_2',
                            text: 'Conversation cleared. Ready for new questions!',
                            isUser: false,
                            timestamp: DateTime.now(),
                          ),
                        );
                      });
                    },
                  ),
                ],
              ),
            ),

            // Active Document Context Selector Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: GlassContainer(
                borderRadius: 16,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                child: Row(
                  children: [
                    const Icon(Icons.picture_as_pdf_rounded, size: 20, color: AppColors.brandRed),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        _isAnalyzingDoc ? 'Analyzing document...' : _activeDocName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: _pickDocument,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.aiPurple,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        minimumSize: Size.zero,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text('Choose PDF', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 10),

            // Quick Prompt Chips
            SizedBox(
              height: 36,
              child: ListView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20),
                children: [
                  _buildPromptChip(AppStrings.chip3Bullet),
                  _buildPromptChip(AppStrings.chipDatesNumbers),
                  _buildPromptChip(AppStrings.chipActionItems),
                  _buildPromptChip(AppStrings.chipTranslateHindi),
                  _buildPromptChip(AppStrings.chipDraftEmail),
                ],
              ),
            ),

            const SizedBox(height: 10),

            // Chat Messages Stream
            Expanded(
              child: ListView.builder(
                controller: _scrollController,
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 10),
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  final msg = _messages[index];
                  return _buildMessageRow(msg, isDark);
                },
              ),
            ),

            // Bottom Chat Input Bar (positioned comfortably above floating bottom nav)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 6, 20, 96),
              child: GlassContainer(
                borderRadius: 24,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _inputController,
                        style: TextStyle(
                          fontSize: 14,
                          color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                        ),
                        decoration: InputDecoration(
                          hintText: AppStrings.askAiHint,
                          hintStyle: TextStyle(
                            fontSize: 13,
                            color: (isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText).withOpacity(0.8),
                          ),
                          border: InputBorder.none,
                          isDense: true,
                        ),
                        onSubmitted: (_) => _handleSendMessage(),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.send_rounded, size: 20),
                      color: AppColors.aiPurple,
                      onPressed: () => _handleSendMessage(),
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

  Widget _buildPromptChip(String prompt) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ActionChip(
        label: Text(
          prompt,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w600,
            color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
          ),
        ),
        backgroundColor: isDark ? const Color(0x22FFFFFF) : const Color(0x120F172A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
            color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
            width: 0.8,
          ),
        ),
        onPressed: () => _handleSendMessage(prompt),
      ),
    );
  }

  Widget _buildMessageRow(ChatMessageEntity msg, bool isDark) {
    if (msg.isUser) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Align(
          alignment: Alignment.centerRight,
          child: Container(
            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : const Color(0xFF0F172A),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(18),
                topRight: Radius.circular(18),
                bottomLeft: Radius.circular(18),
                bottomRight: Radius.circular(4),
              ),
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.12), blurRadius: 8, offset: const Offset(0, 2)),
              ],
            ),
            child: Text(
              msg.text,
              style: const TextStyle(fontSize: 14, color: Colors.white, height: 1.45),
            ),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Align(
        alignment: Alignment.centerLeft,
        child: GlassContainer(
          borderRadius: 18,
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 20,
                        height: 20,
                        decoration: BoxDecoration(
                          color: AppColors.aiPurple.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Icon(Icons.auto_awesome_rounded, size: 12, color: AppColors.aiPurple),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'OpenPDF AI',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.copy_rounded, size: 14),
                    visualDensity: VisualDensity.compact,
                    tooltip: 'Copy',
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: msg.text));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Copied to clipboard ✓'), duration: Duration(seconds: 1)),
                      );
                    },
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                msg.text,
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w400,
                  color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                  height: 1.5,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
