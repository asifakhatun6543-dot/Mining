import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/build_info.dart';
import '../../../core/services/history_service.dart';
import '../../../core/services/theme_service.dart';
import '../../../core/services/cloud_storage_service.dart';
import '../../../core/services/file_service.dart';
import '../../../shared/widgets/glass/glass_container.dart';
import '../../../shared/widgets/document_actions_sheet.dart';
import '../../history/screens/history_screen.dart';

/// PDF WITH LOVE - Executive Profile, Favorites, Cloud & Settings Hub
class ProfileScreen extends StatefulWidget {
  final ValueChanged<int>? onNavigateTab;

  const ProfileScreen({super.key, this.onNavigateTab});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryAccent = isDark ? const Color(0xFFFF2A55) : AppColors.brandRed;
    final cloud = CloudStorageService.instance;
    final theme = ThemeService.instance;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // Top App Bar
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Profile & Studio Hub',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                        letterSpacing: -0.4,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: primaryAccent.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: primaryAccent.withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.workspace_premium_rounded, size: 14, color: primaryAccent),
                          const SizedBox(width: 4),
                          Text(
                            'PRO',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: primaryAccent,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Profile Header Card
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 16),
                child: GlassContainer(
                  padding: const EdgeInsets.all(18),
                  child: Row(
                    children: [
                      // Avatar with Neon Ring
                      Container(
                        width: 58,
                        height: 58,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: const LinearGradient(
                            colors: [Color(0xFFFF1744), Color(0xFFFF5E3A)],
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFFF1744).withOpacity(0.35),
                              blurRadius: 16,
                            ),
                          ],
                        ),
                        child: const Center(
                          child: Icon(Icons.person_rounded, size: 32, color: Colors.white),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'PDF WITH LOVE Member',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'RS7 Pro Studio License Active',
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark ? const Color(0xFFD4FF32) : AppColors.success,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Device Storage: 100% Local & Private',
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
                ),
              ),
            ),

            // 1. "Your Favorites" Section
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildSectionTitle('Your Favorites', isDark),
                    ListenableBuilder(
                      listenable: HistoryService.instance,
                      builder: (context, _) => Text(
                        '${HistoryService.instance.favorites.length} Starred',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 8)),

            // Favorites List
            ListenableBuilder(
              listenable: HistoryService.instance,
              builder: (context, _) {
                final favs = HistoryService.instance.favorites;
                if (favs.isEmpty) {
                  return SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: GlassContainer(
                        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
                        child: Row(
                          children: [
                            const Icon(Icons.star_border_rounded, size: 28, color: Color(0xFFF59E0B)),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'Star any document in History or Recent Documents to pin it here for one-tap access.',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }

                return SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final item = favs[index];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: GlassContainer(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            child: Row(
                              children: [
                                Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF59E0B).withOpacity(0.15),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(Icons.star_rounded, color: Color(0xFFF59E0B), size: 20),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item.fileName,
                                        style: TextStyle(
                                          fontSize: 13.5,
                                          fontWeight: FontWeight.w600,
                                          color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      Text(
                                        '${item.toolUsed} • ${item.sizeFormatted}',
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.share_rounded, size: 18),
                                  color: primaryAccent,
                                  onPressed: () {
                                    if (item.filePath != null) {
                                      FileService.instance.shareFile(item.filePath!);
                                    }
                                  },
                                ),
                                IconButton(
                                  icon: const Icon(Icons.more_vert_rounded, size: 18),
                                  color: isDark ? Colors.white70 : Colors.black54,
                                  onPressed: () {
                                    DocumentActionsSheet.show(
                                      context,
                                      item: item,
                                      documentTitle: item.fileName,
                                      documentPath: item.filePath,
                                    );
                                  },
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                      childCount: favs.length,
                    ),
                  ),
                );
              },
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 18)),

            // 2. Document History Section
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildSectionTitle('Document History', isDark),
                    TextButton(
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => HistoryScreen(
                              onNavigateTab: widget.onNavigateTab,
                              isSubpage: true,
                            ),
                          ),
                        );
                      },
                      child: Text(
                        'View All',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: primaryAccent,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 6)),

            // Recent History preview (top 3)
            ListenableBuilder(
              listenable: HistoryService.instance,
              builder: (context, _) {
                final items = HistoryService.instance.items;
                if (items.isEmpty) {
                  return SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: GlassContainer(
                        padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
                        child: Center(
                          child: Text(
                            'No processed documents yet in history',
                            style: TextStyle(
                              fontSize: 13,
                              color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }

                return SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final item = items[index];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: GlassContainer(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            child: Row(
                              children: [
                                Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    color: primaryAccent.withOpacity(0.15),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Icon(Icons.picture_as_pdf_rounded, color: primaryAccent, size: 20),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item.fileName,
                                        style: TextStyle(
                                          fontSize: 13.5,
                                          fontWeight: FontWeight.w600,
                                          color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      Text(
                                        '${item.toolUsed} • ${item.sizeFormatted}',
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.more_vert_rounded, size: 20),
                                  color: isDark ? Colors.white70 : Colors.black54,
                                  onPressed: () {
                                    DocumentActionsSheet.show(
                                      context,
                                      item: item,
                                      documentTitle: item.fileName,
                                      documentPath: item.filePath,
                                    );
                                  },
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                      childCount: items.take(3).length,
                    ),
                  ),
                );
              },
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 18)),

            // 3. Cloud Storage Section (Dropbox, Google Drive, OneDrive)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _buildSectionTitle('Cloud Storage Integrations', isDark),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 8)),

            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: GlassContainer(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    children: [
                      _buildCloudRow(
                        icon: Icons.add_to_drive_rounded,
                        name: 'Google Drive',
                        subtitle: cloud.gdriveConnected ? 'Connected (${cloud.gdriveAccount})' : 'Connect cloud storage',
                        color: const Color(0xFF34A853),
                        isConnected: cloud.gdriveConnected,
                        onToggle: () => cloud.toggleConnection('Google Drive'),
                        onTapRow: () => cloud.pickDocumentFromCloud(context: context, provider: 'Google Drive'),
                        isDark: isDark,
                      ),
                      const Divider(height: 16),
                      _buildCloudRow(
                        icon: Icons.cloud_queue_rounded,
                        name: 'Dropbox',
                        subtitle: cloud.dropboxConnected ? 'Connected (${cloud.dropboxAccount})' : 'Sync PDF folders',
                        color: const Color(0xFF0061FE),
                        isConnected: cloud.dropboxConnected,
                        onToggle: () => cloud.toggleConnection('Dropbox'),
                        onTapRow: () => cloud.pickDocumentFromCloud(context: context, provider: 'Dropbox'),
                        isDark: isDark,
                      ),
                      const Divider(height: 16),
                      _buildCloudRow(
                        icon: Icons.cloud_done_rounded,
                        name: 'Microsoft OneDrive',
                        subtitle: cloud.oneDriveConnected ? 'Connected (${cloud.oneDriveAccount})' : 'Office 365 cloud vault',
                        color: const Color(0xFF0078D4),
                        isConnected: cloud.oneDriveConnected,
                        onToggle: () => cloud.toggleConnection('OneDrive'),
                        onTapRow: () => cloud.pickDocumentFromCloud(context: context, provider: 'OneDrive'),
                        isDark: isDark,
                      ),
                    ],
                  ),
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 18)),

            // 4. Dark / Light Mode Section
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _buildSectionTitle('Appearance & Display', isDark),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 8)),

            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: GlassContainer(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(
                            theme.isDarkMode ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                            size: 22,
                            color: theme.isDarkMode ? const Color(0xFFD4FF32) : const Color(0xFFF59E0B),
                          ),
                          const SizedBox(width: 14),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Dark Theme',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                                ),
                              ),
                              Text(
                                theme.isDarkMode ? 'Liquid Glass Obsidian' : 'Classic Crisp Light',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      Switch(
                        value: theme.isDarkMode,
                        activeColor: primaryAccent,
                        onChanged: (val) => theme.setDarkMode(val),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 18)),

            // 5. Legal & Policies (7 Dedicated Subpages)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _buildSectionTitle('Legal & Policies', isDark),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 8)),

            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: GlassContainer(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  child: Column(
                    children: [
                      _buildMenuItem(
                        icon: Icons.shield_outlined,
                        title: 'Privacy Policy',
                        subtitle: '100% on-device private document processing',
                        isDark: isDark,
                        onTap: () => _openSubpage(
                          title: 'Privacy Policy',
                          content:
                              'PDF WITH LOVE is engineered with a strict Zero-Knowledge and On-Device Processing architecture.\n\n'
                              '1. Document Confidentiality:\nAll PDF conversions, compression, editing, rendering, and text modifications execute locally within the app sandbox on your device CPU. Your private documents are NEVER uploaded, stored, transmitted, or monitored on external servers.\n\n'
                              '2. No Telemetry or Profiling:\nWe do not collect personal identifiers, document contents, location telemetry, or advertising IDs.\n\n'
                              '3. Storage Access:\nStorage permissions are requested exclusively to read documents you choose to open and to save exported PDFs directly into your public Downloads folder.\n\n'
                              '4. Contact:\nFor inquiries regarding data protection, reach RS7 Private Limited at privacy@rs7.in.',
                        ),
                      ),
                      const Divider(height: 10),
                      _buildMenuItem(
                        icon: Icons.description_outlined,
                        title: 'Terms & Conditions',
                        subtitle: 'Usage guidelines and license terms',
                        isDark: isDark,
                        onTap: () => _openSubpage(
                          title: 'Terms & Conditions',
                          content:
                              'Welcome to PDF WITH LOVE, developed and maintained by RS7 Private Limited.\n\n'
                              '1. Full Intellectual Property Rights:\nYou retain complete and exclusive copyright, ownership, and all rights to any documents, images, text, or signatures imported into or exported from this software.\n\n'
                              '2. Permitted Use:\nYou may use PDF WITH LOVE for personal, educational, commercial, and professional document workflows without restriction.\n\n'
                              '3. No Warranty:\nThis software is provided "as is" to the fullest extent permitted by law. RS7 Private Limited shall not be liable for accidental data loss arising from device malfunctions or storage failures.',
                        ),
                      ),
                      const Divider(height: 10),
                      _buildMenuItem(
                        icon: Icons.folder_shared_outlined,
                        title: 'Data Storage Policy',
                        subtitle: 'Local sandboxing & public Downloads',
                        isDark: isDark,
                        onTap: () => _openSubpage(
                          title: 'Data Storage Policy',
                          content:
                              '1. Local Sandbox:\nTemporary working buffers generated during document processing are isolated within the Android application internal storage sandbox and automatically reclaimed when tasks complete.\n\n'
                              '2. Public Storage:\nWhen you tap "Download", files are exported into /storage/emulated/0/Download/ for universal accessibility by standard file managers and cloud backup utilities.',
                        ),
                      ),
                      const Divider(height: 10),
                      _buildMenuItem(
                        icon: Icons.auto_awesome_outlined,
                        title: 'AI Usage Policy',
                        subtitle: 'Offline document analysis standards',
                        isDark: isDark,
                        onTap: () => _openSubpage(
                          title: 'AI Usage Policy',
                          content:
                              '1. Grounded Analysis:\nThe AI assistant operates strictly on text extracted from documents you actively attach. Document text is never retained across restarts.\n\n'
                              '2. No Model Training:\nYour documents, prompts, and conversations are never used to train or fine-tune public artificial intelligence models.',
                        ),
                      ),
                      const Divider(height: 10),
                      _buildMenuItem(
                        icon: Icons.hub_outlined,
                        title: 'Third-Party Disclosures',
                        subtitle: 'Vendor libraries and SDKs',
                        isDark: isDark,
                        onTap: () => _openSubpage(
                          title: 'Third-Party Disclosures',
                          content:
                              'PDF WITH LOVE integrates verified open-source engines:\n\n'
                              '• PDF.js (Apache 2.0) - Mozilla high-resolution rendering\n'
                              '• PDF-Lib (MIT) - Vector manipulation engine\n'
                              '• Flutter Framework (BSD-3) - Google UI toolkit\n'
                              '• Google Fonts (OFL) - Plus Jakarta Sans & typography\n\n'
                              'No third-party advertising SDKs or tracking networks are included.',
                        ),
                      ),
                      const Divider(height: 10),
                      _buildMenuItem(
                        icon: Icons.gavel_outlined,
                        title: 'Open Source Licenses',
                        subtitle: 'Complete open source component notices',
                        isDark: isDark,
                        onTap: () => showLicensePage(
                          context: context,
                          applicationName: 'PDF WITH LOVE',
                          applicationVersion: BuildInfo.fullVersion,
                          applicationLegalese: 'Copyright © 2026 RS7 Private Limited. All rights reserved.',
                        ),
                      ),
                      const Divider(height: 10),
                      _buildMenuItem(
                        icon: Icons.copyright_outlined,
                        title: 'Copyright Notice',
                        subtitle: 'RS7 Private Limited ownership',
                        isDark: isDark,
                        onTap: () => _openSubpage(
                          title: 'Copyright Notice',
                          content:
                              'PDF WITH LOVE™ and the Korean Love Hand icon design are proprietary assets of RS7 Private Limited.\n\n'
                              'Copyright © 2026 RS7 Private Limited. All rights reserved.\n\n'
                              'Unauthorized copying, reverse engineering, or distribution of this software binary is strictly prohibited.',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 18)),

            // 6. Support & Help Center (9 Dedicated Subpages)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _buildSectionTitle('Support & Help Center', isDark),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 8)),

            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: GlassContainer(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  child: Column(
                    children: [
                      _buildMenuItem(
                        icon: Icons.menu_book_outlined,
                        title: 'Help Center',
                        subtitle: 'Complete guide to all 23 document tools',
                        isDark: isDark,
                        onTap: () => _openSubpage(
                          title: 'Help Center',
                          content:
                              'Quick Guide to PDF WITH LOVE Tools:\n\n'
                              '• Edit PDF: Direct in-place editing of text, fonts, colors, and stamps.\n'
                              '• Compress PDF: Multi-tier compression reducing file size by up to 90%.\n'
                              '• Convert to Office: Convert between PDF, Word (.docx), Excel (.xlsx), and PowerPoint (.pptx).\n'
                              '• Merge & Split: Combine multiple files or extract individual pages.\n'
                              '• OCR Scanner: Extract editable text from scanned receipts and documents.',
                        ),
                      ),
                      const Divider(height: 10),
                      _buildMenuItem(
                        icon: Icons.quiz_outlined,
                        title: 'Frequently Asked Questions (FAQ)',
                        subtitle: 'Answers to common questions',
                        isDark: isDark,
                        onTap: () => _openSubpage(
                          title: 'Frequently Asked Questions',
                          content:
                              'Q: Is internet access required to edit or convert PDFs?\nA: No! All core processing runs 100% offline on your device.\n\n'
                              'Q: Where are my exported files saved?\nA: In your device\'s standard "Download" folder and accessible in Document History.\n\n'
                              'Q: Can I edit scanned documents?\nA: Yes! Use the OCR Scanner tool to recognize text from scanned images and convert them into searchable PDFs.',
                        ),
                      ),
                      const Divider(height: 10),
                      _buildMenuItem(
                        icon: Icons.contact_support_outlined,
                        title: 'Contact Support',
                        subtitle: 'Direct email support with RS7 engineering',
                        isDark: isDark,
                        onTap: () => _openSubpage(
                          title: 'Contact Support',
                          content:
                              'Need help or have a feature request?\n\n'
                              '• Developer: RS7 Private Limited\n'
                              '• Email: support@rs7.in\n'
                              '• Website: https://mining-lilac.vercel.app/\n'
                              '• Response Time: Within 24 hours on business days.',
                        ),
                      ),
                      const Divider(height: 10),
                      _buildMenuItem(
                        icon: Icons.report_problem_outlined,
                        title: 'Report a Problem',
                        subtitle: 'Submit bug reports or rendering issues',
                        isDark: isDark,
                        onTap: () => _openSubpage(
                          title: 'Report a Problem',
                          content:
                              'Found an issue with a document?\n\n'
                              'Please report the following to support@rs7.in:\n'
                              '1. Android OS version and device model\n'
                              '2. Tool used (e.g. PDF Editor, Word to PDF)\n'
                              '3. Description of unexpected behavior\n\n'
                              'Your feedback directly shapes our updates!',
                        ),
                      ),
                      const Divider(height: 10),
                      _buildMenuItem(
                        icon: Icons.build_circle_outlined,
                        title: 'Troubleshooting Guide',
                        subtitle: 'Resolve common document issues',
                        isDark: isDark,
                        onTap: () => _openSubpage(
                          title: 'Troubleshooting Guide',
                          content:
                              '1. File won\'t open:\nEnsure the file is not corrupted or password-protected with 256-bit AES encryption.\n\n'
                              '2. Out of Memory on large files:\nFor documents over 100 pages, use "Compress PDF" before running heavy vector edits.\n\n'
                              '3. Storage Permissions:\nIf saving fails, verify that Storage / All Files access is granted in Android System Settings.',
                        ),
                      ),
                      const Divider(height: 10),
                      _buildMenuItem(
                        icon: Icons.transform_outlined,
                        title: 'File Conversion Help',
                        subtitle: 'Tips for accurate Office conversions',
                        isDark: isDark,
                        onTap: () => _openSubpage(
                          title: 'File Conversion Help',
                          content:
                              'PDF to Word, Excel, and PowerPoint:\n\n'
                              '• Word (.docx): Preserves text paragraphs, headers, and bullet structures.\n'
                              '• Excel (.xlsx): Extracts tabular lines and numbers into clean worksheet grids.\n'
                              '• PowerPoint (.pptx): Maps each PDF page to standard 16:9 widescreen slides with vector shapes.',
                        ),
                      ),
                      const Divider(height: 10),
                      _buildMenuItem(
                        icon: Icons.edit_note_outlined,
                        title: 'PDF Editor Help',
                        subtitle: 'Learn text editing, drawing, and signatures',
                        isDark: isDark,
                        onTap: () => _openSubpage(
                          title: 'PDF Editor Help',
                          content:
                              'In-Place WYSIWYG Editing:\n\n'
                              '• Text Tool: Tap on existing text on any page to edit words directly in their original font and position.\n'
                              '• Signature: Draw or import your handwritten signature and place it anywhere.\n'
                              '• Done Button: Tap the orange DONE button in the top right header to instantly export without confirmation modals.',
                        ),
                      ),
                      const Divider(height: 10),
                      _buildMenuItem(
                        icon: Icons.sd_storage_outlined,
                        title: 'Storage & Downloads Help',
                        subtitle: 'Public file management instructions',
                        isDark: isDark,
                        onTap: () => _openSubpage(
                          title: 'Storage & Downloads Help',
                          content:
                              'Files exported by PDF WITH LOVE are saved to:\n\n'
                              '/storage/emulated/0/Download/\n\n'
                              'You can access them via:\n'
                              '• The built-in "Files" or "My Files" Android app\n'
                              '• Google Files app under the "Downloads" tab\n'
                              '• Direct USB connection to PC or Mac',
                        ),
                      ),
                      const Divider(height: 10),
                      _buildMenuItem(
                        icon: Icons.info_outline_rounded,
                        title: 'About PDF WITH LOVE',
                        subtitle: 'Mission, team and build information',
                        isDark: isDark,
                        onTap: () => _openSubpage(
                          title: 'About PDF WITH LOVE',
                          content:
                              'PDF WITH LOVE™\n'
                              'Version ${BuildInfo.fullVersion}\n\n'
                              'Crafted with passion by RS7 Private Limited.\n\n'
                              'Our mission is to empower professionals, students, and businesses with 100% free, private, high-performance document tools without subscriptions or server tracking.\n\n'
                              '--- Build Information ---\n'
                              '${BuildInfo.diagnosticsSummary}\n\n'
                              'Built with Love ❤️ by RS7 Private Limited.',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // 7. Footer: Built with love ❤️ RS7 Private Limited + Dynamic Version
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 110),
                child: Center(
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          color: (isDark ? Colors.white : Colors.black).withOpacity(0.04),
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(
                            color: (isDark ? Colors.white : Colors.black).withOpacity(0.08),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Built with Love',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                              ),
                            ),
                            const SizedBox(width: 5),
                            const Text('❤️', style: TextStyle(fontSize: 14)),
                            const SizedBox(width: 5),
                            Text(
                              'RS7 Private Limited',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                                letterSpacing: 0.2,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Version ${BuildInfo.fullVersion}',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: (isDark ? Colors.white : Colors.black).withOpacity(0.35),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title, bool isDark) {
    return Text(
      title,
      style: TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w700,
        color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
        letterSpacing: 0.3,
      ),
    );
  }

  Widget _buildCloudRow({
    required IconData icon,
    required String name,
    required String subtitle,
    required Color color,
    required bool isConnected,
    required VoidCallback onToggle,
    VoidCallback? onTapRow,
    required bool isDark,
  }) {
    return InkWell(
      onTap: onTapRow,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: color.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                    ),
                  ),
                ],
              ),
            ),
            TextButton(
              onPressed: onToggle,
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Text(
                isConnected ? 'Connected ✓' : 'Connect',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: isConnected ? const Color(0xFF10B981) : (isDark ? const Color(0xFFFF2A55) : AppColors.brandRed),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    String? subtitle,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 7, horizontal: 4),
        child: Row(
          children: [
            Icon(icon, size: 20, color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                    ),
                  ),
                  if (subtitle != null)
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                      ),
                    ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right_rounded,
              size: 18,
              color: (isDark ? Colors.white : Colors.black).withOpacity(0.25),
            ),
          ],
        ),
      ),
    );
  }

  void _openSubpage({required String title, required String content}) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => Scaffold(
          backgroundColor: Theme.of(context).brightness == Brightness.dark
              ? const Color(0xFF0F172A)
              : const Color(0xFFF8FAFC),
          appBar: AppBar(
            backgroundColor: Theme.of(context).brightness == Brightness.dark
                ? const Color(0xFF0F172A)
                : const Color(0xFFF8FAFC),
            title: Text(
              title,
              style: TextStyle(
                fontWeight: FontWeight.w700,
                color: Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black,
              ),
            ),
            elevation: 0,
            leading: IconButton(
              icon: Icon(
                Icons.arrow_back_rounded,
                color: Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black,
              ),
              onPressed: () => Navigator.of(context).pop(),
            ),
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black)
                    .withOpacity(0.04),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black)
                      .withOpacity(0.08),
                ),
              ),
              child: Text(
                content,
                style: TextStyle(
                  fontSize: 14,
                  height: 1.6,
                  color: Theme.of(context).brightness == Brightness.dark
                      ? AppColors.darkPrimaryText
                      : AppColors.lightPrimaryText,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
