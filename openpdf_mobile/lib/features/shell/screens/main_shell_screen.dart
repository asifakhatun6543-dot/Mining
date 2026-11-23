import 'package:flutter/material.dart';
import '../../../core/services/history_service.dart';
import '../../../shared/widgets/glass/glass_bottom_nav.dart';
import '../../home/screens/home_screen.dart';
import '../../all_tools/screens/all_tools_screen.dart';
import '../../chat_ai/screens/chat_ai_screen.dart';
import '../../profile/screens/profile_screen.dart';

/// OpenPDF Studio - Main Shell with Persistent 4-Tab Liquid Glass Navigation
class MainShellScreen extends StatefulWidget {
  const MainShellScreen({super.key});

  @override
  State<MainShellScreen> createState() => _MainShellScreenState();
}

class _MainShellScreenState extends State<MainShellScreen> {
  int _currentTabIndex = 0;

  void _onTabSelected(int index) {
    if (_currentTabIndex != index) {
      setState(() => _currentTabIndex = index);
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _currentTabIndex == 0,
      onPopInvoked: (didPop) {
        if (!didPop && _currentTabIndex != 0) {
          setState(() => _currentTabIndex = 0); // Return to Home tab
        }
      },
      child: Scaffold(
        extendBody: true,
        body: IndexedStack(
          index: _currentTabIndex,
          children: [
            HomeScreen(onNavigateTab: _onTabSelected),
            const AllToolsScreen(),
            const ChatAiScreen(),
            ProfileScreen(onNavigateTab: _onTabSelected),
          ],
        ),
        bottomNavigationBar: ListenableBuilder(
          listenable: HistoryService.instance,
          builder: (context, _) {
            return GlassBottomNavigation(
              currentIndex: _currentTabIndex,
              onTabSelected: _onTabSelected,
              historyCount: HistoryService.instance.count,
            );
          },
        ),
      ),
    );
  }
}
