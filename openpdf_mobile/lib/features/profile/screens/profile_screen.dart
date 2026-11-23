import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/history_service.dart';
import '../../../shared/widgets/glass/glass_card.dart';
import '../../../shared/widgets/glass/glass_container.dart';
import '../../../shared/widgets/document_actions_sheet.dart';

/// OpenPDF Studio - Executive Profile, Cloud & Settings Hub
/// Replacing standalone history tab with unified all-in-one Profile Dashboard:
/// - Profile Header & Pro Active Badge
/// - History Section with 3-Dot Document Action Drawers
/// - Dark / Light Mode Switcher
/// - Cloud Integrations (Google Drive, Dropbox, OneDrive)
/// - Terms & Conditions, Privacy Policy
/// - Help / Contact Us, About Us
/// - Footer: Built with love 🫰 RS7 Private Limited
class ProfileScreen extends StatefulWidget {
  final ValueChanged<int>? onNavigateTab;

  const ProfileScreen({super.key, this.onNavigateTab});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _isDarkMode = true;
  bool _gdriveConnected = true;
  bool _dropboxConnected = false;
  bool _oneDriveConnected = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryAccent = isDark ? const Color(0xFFFF2A55) : AppColors.brandRed;

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
                              'OpenPDF User',
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

            // 1. History Section with 3-Dot Actions Drawer
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildSectionTitle('Document History', isDark),
                    ListenableBuilder(
                      listenable: HistoryService.instance,
                      builder: (context, _) => Text(
                        '${HistoryService.instance.items.length} Files',
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

            // History List with 3-Dot Actions
            ListenableBuilder(
              listenable: HistoryService.instance,
              builder: (context, _) {
                final items = HistoryService.instance.items;
                if (items.isEmpty) {
                  return SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: GlassContainer(
                        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
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
                                // 3-Vertical Dots Action Button
                                IconButton(
                                  icon: const Icon(Icons.more_vert_rounded, size: 20),
                                  color: isDark ? Colors.white70 : Colors.black54,
                                  onPressed: () {
                                    DocumentActionsSheet.show(
                                      context,
                                      item: item,
                                      documentTitle: item.fileName,
                                      documentPath: item.filePath,
                                      onActionCompleted: () => setState(() {}),
                                    );
                                  },
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                      childCount: items.take(4).length,
                    ),
                  ),
                );
              },
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 20)),

            // 2. Cloud Storage Section (Dropbox, Google Drive, OneDrive)
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
                        subtitle: _gdriveConnected ? 'Synced (My Drive)' : 'Connect account',
                        color: const Color(0xFF34A853),
                        isConnected: _gdriveConnected,
                        onToggle: () => setState(() => _gdriveConnected = !_gdriveConnected),
                        isDark: isDark,
                      ),
                      const Divider(height: 16),
                      _buildCloudRow(
                        icon: Icons.cloud_queue_rounded,
                        name: 'Dropbox',
                        subtitle: _dropboxConnected ? 'Connected' : 'Sync PDF folders',
                        color: const Color(0xFF0061FE),
                        isConnected: _dropboxConnected,
                        onToggle: () => setState(() => _dropboxConnected = !_dropboxConnected),
                        isDark: isDark,
                      ),
                      const Divider(height: 16),
                      _buildCloudRow(
                        icon: Icons.cloud_done_rounded,
                        name: 'Microsoft OneDrive',
                        subtitle: _oneDriveConnected ? 'Connected' : 'Office 365 cloud vault',
                        color: const Color(0xFF0078D4),
                        isConnected: _oneDriveConnected,
                        onToggle: () => setState(() => _oneDriveConnected = !_oneDriveConnected),
                        isDark: isDark,
                      ),
                    ],
                  ),
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 20)),

            // 3. Dark / Light Mode Section
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
                            _isDarkMode ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                            size: 22,
                            color: _isDarkMode ? const Color(0xFFD4FF32) : const Color(0xFFF59E0B),
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
                                _isDarkMode ? 'Liquid Glass Obsidian' : 'Classic Crisp Light',
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
                        value: _isDarkMode,
                        activeColor: primaryAccent,
                        onChanged: (val) => setState(() => _isDarkMode = val),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 20)),

            // 4. Legal & Support (Terms, Privacy, Help, About Us)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _buildSectionTitle('Legal, Policies & Support', isDark),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 8)),

            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: GlassContainer(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  child: Column(
                    children: [
                      _buildMenuItem(
                        icon: Icons.description_outlined,
                        title: 'Terms and Conditions',
                        isDark: isDark,
                        onTap: () => _showLegalDialog(context, 'Terms and Conditions', 'By using OpenPDF Studio, you retain 100% full ownership and copyright of all your documents. All document processing takes place directly on your device CPU.'),
                      ),
                      const Divider(height: 12),
                      _buildMenuItem(
                        icon: Icons.shield_outlined,
                        title: 'Privacy Policy',
                        isDark: isDark,
                        onTap: () => _showLegalDialog(context, 'Privacy Policy', 'OpenPDF Studio does not transmit any document contents to cloud servers. No analytics, tracking or telemetry data is collected.'),
                      ),
                      const Divider(height: 12),
                      _buildMenuItem(
                        icon: Icons.help_outline_rounded,
                        title: 'Help & Contact Support',
                        isDark: isDark,
                        onTap: () => _showLegalDialog(context, 'Contact Support', 'Need assistance? Reach the RS7 engineering team anytime at support@rs7.in or visit https://openpdf.studio'),
                      ),
                      const Divider(height: 12),
                      _buildMenuItem(
                        icon: Icons.info_outline_rounded,
                        title: 'About OpenPDF Studio',
                        isDark: isDark,
                        onTap: () => _showLegalDialog(context, 'About Us', 'OpenPDF Studio v1.0.5 — Premium Native Android PDF and Document Suite powered by C++ Pdfium and On-Device ML Kit.'),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // 5. Footer: Built with love 🫰 RS7 Private Limited
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 110),
                child: Center(
                  child: Container(
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
                          'Built with love',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                          ),
                        ),
                        const SizedBox(width: 5),
                        const Text('🫰', style: TextStyle(fontSize: 14)),
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
    required bool isDark,
  }) {
    return Row(
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
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
        child: Row(
          children: [
            Icon(icon, size: 20, color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                ),
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

  void _showLegalDialog(BuildContext context, String title, String content) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(content),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}
