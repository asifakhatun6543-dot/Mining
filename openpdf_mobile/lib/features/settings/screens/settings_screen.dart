import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/services/file_service.dart';
import '../../../shared/widgets/glass/glass_container.dart';

/// OpenPDF Studio - Executive Settings & Privacy Screen
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _hapticFeedback = true;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        title: Text(
          AppStrings.tabSettings,
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
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          physics: const BouncingScrollPhysics(),
          children: [
            // 1. Privacy Banner Card
            GlassContainer(
              padding: const EdgeInsets.all(18),
              borderColor: AppColors.success.withOpacity(0.35),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.success.withOpacity(0.18),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.verified_user_rounded, color: AppColors.success, size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          AppStrings.privacyPledge,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          AppStrings.privacyPledgeDesc,
                          style: TextStyle(
                            fontSize: 11.5,
                            color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 22),

            // Section: Storage & Maintenance
            _buildSectionHeader('Storage & Maintenance', isDark),
            const SizedBox(height: 10),
            GlassContainer(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Column(
                children: [
                  _buildSettingRow(
                    icon: Icons.cleaning_services_rounded,
                    title: 'Purge Temporary Cache',
                    subtitle: 'Frees temporary document buffers and thumbnails',
                    trailing: TextButton(
                      onPressed: () async {
                        await FileService.instance.clearCache();
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Cache successfully cleared ✓')),
                        );
                      },
                      child: const Text('Clear Now', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.brandRed)),
                    ),
                    isDark: isDark,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 22),

            // Section: Preferences
            _buildSectionHeader('Preferences', isDark),
            const SizedBox(height: 10),
            GlassContainer(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Column(
                children: [
                  _buildSettingRow(
                    icon: Icons.vibration_rounded,
                    title: 'Haptic Touch Feedback',
                    subtitle: 'Subtle vibration when tapping liquid buttons',
                    trailing: Switch(
                      value: _hapticFeedback,
                      activeColor: AppColors.brandRed,
                      onChanged: (v) => setState(() => _hapticFeedback = v),
                    ),
                    isDark: isDark,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 22),

            // Section: About & Integrity
            _buildSectionHeader('About OpenPDF Studio', isDark),
            const SizedBox(height: 10),
            GlassContainer(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: AppColors.brandRed,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Center(
                          child: Text('P', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18)),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'OpenPDF Studio Mobile',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                        ),
                      ),
                      const Spacer(),
                      const Text('v1.0.0 (Build 1)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.darkSecondaryText)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Built with Flutter, Dart, and native Android platform channels. Engineered for speed, privacy, and desktop-caliber document processing right in your pocket.',
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, bool isDark) {
    return Text(
      title,
      style: TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w700,
        color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
        letterSpacing: 0.2,
      ),
    );
  }

  Widget _buildSettingRow({
    required IconData icon,
    required String title,
    required String subtitle,
    required Widget trailing,
    required bool isDark,
  }) {
    return Row(
      children: [
        Icon(icon, size: 22, color: isDark ? AppColors.darkPrimaryAccent : AppColors.brandRed),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                ),
              ),
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: 11.5,
                  color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                ),
              ),
            ],
          ),
        ),
        trailing,
      ],
    );
  }
}
