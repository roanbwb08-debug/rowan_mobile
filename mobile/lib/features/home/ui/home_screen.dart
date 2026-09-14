import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/widgets/rowan_avatar.dart';
import '../../auth/providers/auth_provider.dart';
import '../../chat/providers/chat_provider.dart';
import '../../voice/ui/live_mode_screen.dart';

// Supported accent colors
enum RowanAccent {
  blue('Blue', Color(0xFF1E6091)),
  purple('Purple', Colors.deepPurple),
  teal('Teal', Colors.teal),
  emerald('Emerald', Colors.emerald),
  amber('Amber', Colors.amber);

  final String label;
  final Color color;
  const RowanAccent(this.label, this.color);
}

// Supported avatar models
enum RowanAvatarModel {
  classic('Rowan Classic'),
  quantum('Quantum Sphere'),
  cybernetic('Cybernetic Node'),
  minimalist('Minimalist Pulse');

  final String label;
  const RowanAvatarModel(this.label);
}

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _currentIndex = 0;

  // Personalization settings state
  RowanAccent _accentColor = RowanAccent.blue;
  RowanAvatarModel _avatarModel = RowanAvatarModel.classic;
  ThemeMode _themeMode = ThemeMode.system;
  String _customLogoName = 'Default Rowan Core';

  // Active Connections database state
  final Map<String, bool> _connectionStatus = {
    'Phone': false,
    'Tablet': false,
    'Computer': false,
    'Personal websites': false,
    'Ecommerce websites': false,
    'Business websites': false,
    'Communication': false,
    'Productivity': false,
    'GitHub': false,
    'Repositories': false,
    'Documents': false,
    'PDFs': false,
    'Image Tools': false,
    'Finance': false,
    'Automation Triggers': false,
  };

  // Mock past conversations
  final List<Map<String, dynamic>> _pastConversations = [
    {
      'id': 'session_1',
      'title': 'E-commerce Integration Strategy',
      'date': 'Yesterday',
      'messages': [
        ChatMessage(role: 'user', text: 'How do I connect Rowan to Shopify?'),
        ChatMessage(role: 'assistant', text: 'You can connect me via the Connect Tab under Ecommerce Websites. I will synchronize with your product inventory and shipping policies to assist customers natively.'),
      ]
    },
    {
      'id': 'session_2',
      'title': 'Automating Git Commits',
      'date': '2 days ago',
      'messages': [
        ChatMessage(role: 'user', text: 'Can you help review code changes?'),
        ChatMessage(role: 'assistant', text: 'Absolutely! With Developer Environment permissions, I can review repository changes, suggest optimizations, and draft clear commits.'),
      ]
    },
    {
      'id': 'session_3',
      'title': 'General AI Assistance',
      'date': '5 days ago',
      'messages': [
        ChatMessage(role: 'user', text: 'What is Rowan Core?'),
        ChatMessage(role: 'assistant', text: 'I am Rowan, a single unified intelligence. I can work across your phone, websites, developer environments, and apps, depending on the connections you authorize.'),
      ]
    }
  ];

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: _accentColor.color,
          brightness: Theme.of(context).brightness,
        ),
      ),
      child: Scaffold(
        body: IndexedStack(
          index: _currentIndex,
          children: [
            _buildHomeTab(),
            _buildConversationsTab(),
            _buildConnectTab(),
            _buildYouTab(),
          ],
        ),
        bottomNavigationBar: BottomNavigationBar(
          currentIndex: _currentIndex,
          type: BottomNavigationBarType.fixed,
          selectedItemColor: _accentColor.color,
          unselectedItemColor: Colors.grey,
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          unselectedLabelStyle: const TextStyle(fontSize: 11),
          onTap: (index) {
            setState(() {
              _currentIndex = index;
            });
          },
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined),
              activeIcon: Icon(Icons.home),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.chat_bubble_outline),
              activeIcon: Icon(Icons.chat_bubble),
              label: 'Conversations',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.hub_outlined),
              activeIcon: Icon(Icons.hub),
              label: 'Connect',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outline),
              activeIcon: Icon(Icons.person),
              label: 'You',
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // TAB 1: HOME (THE CORE ROWAN TALK INTERFACE)
  // ==========================================
  final _textController = TextEditingController();
  final _scrollController = ScrollController();
  final ImagePicker _picker = ImagePicker();
  String? _selectedImagePath;

  Widget _buildHomeTab() {
    final chatState = ref.watch(chatProvider);
    final userEmail = ref.watch(authStateProvider).value?.session?.user.email ?? 'Rowan Partner';

    return SafeArea(
      child: Column(
        children: [
          // Elegant Header with Mascot Rowan avatar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const LiveModeScreen()),
                    );
                  },
                  child: RowanExpressiveAvatar(
                    state: chatState.isLoading ? RowanAvatarState.thinking : RowanAvatarState.idle,
                    size: 52,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Rowan Core',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: _accentColor.color,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              color: Colors.emerald,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Text(
                            'Active Context',
                            style: TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                // Live Voice Button Trigger
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _accentColor.color.withOpacity(0.08),
                    foregroundColor: _accentColor.color,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const LiveModeScreen()),
                    );
                  },
                  icon: const Icon(Icons.mic, size: 16),
                  label: const Text('Live Voice', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Message history
          Expanded(
            child: chatState.messages.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        RowanExpressiveAvatar(state: RowanAvatarState.idle, size: 100),
                        const SizedBox(height: 16),
                        const Text(
                          'This is Rowan. Talk to Rowan.',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Ask me anything or enter Live Mode.',
                          style: TextStyle(color: Colors.grey, fontSize: 12),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: chatState.messages.length,
                    itemBuilder: (context, index) {
                      final message = chatState.messages[index];
                      final isUser = message.role == 'user';
                      return Align(
                        alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(
                            color: isUser ? _accentColor.color : Colors.grey[100],
                            borderRadius: BorderRadius.circular(16).copyWith(
                              bottomRight: isUser ? const Radius.circular(0) : const Radius.circular(16),
                              bottomLeft: isUser ? const Radius.circular(16) : const Radius.circular(0),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                            children: [
                              if (message.imageUrl != null) ...[
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: message.imageUrl!.startsWith('http')
                                      ? Image.network(message.imageUrl!, width: 200, fit: BoxFit.cover)
                                      : Image.file(File(message.imageUrl!), width: 200, fit: BoxFit.cover),
                                ),
                                const SizedBox(height: 8),
                              ],
                              Text(
                                message.text,
                                style: TextStyle(
                                  color: isUser ? Colors.white : Colors.black87,
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),

          if (chatState.isLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8.0),
              child: SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2.5),
              ),
            ),

          // Message input bar
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(12.0),
              child: Column(
                children: [
                  if (_selectedImagePath != null)
                    Stack(
                      children: [
                        Container(
                          height: 80,
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.file(File(_selectedImagePath!), fit: BoxFit.cover),
                          ),
                        ),
                        Positioned(
                          right: 0,
                          top: 0,
                          child: IconButton(
                            icon: const Icon(Icons.cancel, color: Colors.black54),
                            onPressed: () {
                              setState(() {
                                _selectedImagePath = null;
                              });
                            },
                          ),
                        ),
                      ],
                    ),
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.photo_outlined),
                        color: _accentColor.color,
                        onPressed: () async {
                          final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
                          if (image != null) {
                            setState(() {
                              _selectedImagePath = image.path;
                            });
                          }
                        },
                      ),
                      Expanded(
                        child: TextField(
                          controller: _textController,
                          style: const TextStyle(fontSize: 14),
                          decoration: InputDecoration(
                            hintText: 'Talk to Rowan...',
                            fillColor: Colors.grey[50],
                            filled: true,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(24),
                              borderSide: BorderSide(color: Colors.grey[200]!),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(24),
                              borderSide: BorderSide(color: Colors.grey[200]!),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(24),
                              borderSide: BorderSide(color: _accentColor.color),
                            ),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                          ),
                          onSubmitted: (_) => _sendMessage(),
                        ),
                      ),
                      const SizedBox(width: 8),
                      GestureDetector(
                        onLongPress: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const LiveModeScreen()),
                          );
                        },
                        child: CircleAvatar(
                          backgroundColor: _accentColor.color,
                          child: IconButton(
                            icon: const Icon(Icons.arrow_upward, color: Colors.white),
                            onPressed: chatState.isLoading ? null : _sendMessage,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _sendMessage() {
    final text = _textController.text;
    if (text.isNotEmpty || _selectedImagePath != null) {
      ref.read(chatProvider.notifier).sendMessage(text, imagePath: _selectedImagePath);
      _textController.clear();
      setState(() {
        _selectedImagePath = null;
      });
      Future.delayed(const Duration(milliseconds: 150), () {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
        }
      });
    }
  }

  // ==========================================
  // TAB 2: CONVERSATIONS (PREVIOUS CHATS)
  // ==========================================
  Widget _buildConversationsTab() {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'CONVERSATIONS',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, letterSpacing: 1),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_comment_outlined),
            tooltip: 'New Conversation',
            onPressed: () {
              ref.read(chatProvider.notifier).startNewSession();
              setState(() {
                _currentIndex = 0; // Switch to home tab
              });
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Started a fresh conversation session with Rowan.')),
              );
            },
          ),
        ],
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _pastConversations.length,
        itemBuilder: (context, index) {
          final session = _pastConversations[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            elevation: 0,
            shape: RoundedRectangleBorder(
              side: BorderSide(color: Colors.grey.withOpacity(0.12)),
              borderRadius: BorderRadius.circular(12),
            ),
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              leading: CircleAvatar(
                backgroundColor: _accentColor.color.withOpacity(0.08),
                child: Icon(Icons.chat_bubble_outline, color: _accentColor.color, size: 20),
              ),
              title: Text(
                session['title'],
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 4.0),
                child: Text(
                  session['date'],
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ),
              trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
              onTap: () {
                ref.read(chatProvider.notifier).loadSession(session['id'], session['messages']);
                setState(() {
                  _currentIndex = 0; // Switch to Home Tab
                });
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Loaded conversation: ${session['title']}')),
                );
              },
            ),
          );
        },
      ),
    );
  }

  // ==========================================
  // TAB 3: CONNECT (INTEGRATIONS CENTER)
  // ==========================================
  final List<Map<String, dynamic>> _connectCategories = [
    {
      'title': 'Devices',
      'icon': Icons.smartphone,
      'items': ['Phone', 'Tablet', 'Computer']
    },
    {
      'title': 'Websites',
      'icon': Icons.language,
      'items': ['Personal websites', 'Ecommerce websites', 'Business websites']
    },
    {
      'title': 'Apps & Services',
      'icon': Icons.apps,
      'items': ['Communication', 'Productivity']
    },
    {
      'title': 'Developer Environment',
      'icon': Icons.code,
      'items': ['GitHub', 'Repositories']
    },
    {
      'title': 'Data & Knowledge',
      'icon': Icons.storage,
      'items': ['Documents', 'PDFs']
    },
    {
      'title': 'Creative & Media',
      'icon': Icons.palette,
      'items': ['Image Tools']
    },
    {
      'title': 'Finance',
      'icon': Icons.attach_money,
      'items': ['Finance']
    },
    {
      'title': 'Automation',
      'icon': Icons.smart_toy,
      'items': ['Automation Triggers']
    },
  ];

  Widget _buildConnectTab() {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'CONNECT ROWAN',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, letterSpacing: 1),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Choose where Rowan can work and what Rowan can access.',
            style: TextStyle(color: Colors.grey, fontSize: 13),
          ),
          const SizedBox(height: 20),
          ..._connectCategories.map((cat) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 4.0),
                  child: Row(
                    children: [
                      Icon(cat['icon'], size: 18, color: _accentColor.color),
                      const SizedBox(width: 8),
                      Text(
                        cat['title'].toUpperCase(),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 11,
                          color: Colors.grey,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ],
                  ),
                ),
                ... (cat['items'] as List<String>).map((item) {
                  final isConnected = _connectionStatus[item] ?? false;
                  return Card(
                    elevation: 0,
                    margin: const EdgeInsets.only(bottom: 10),
                    shape: RoundedRectangleBorder(
                      side: BorderSide(color: Colors.grey.withOpacity(0.12)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: ListTile(
                      title: Text(
                        item,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: isConnected ? Colors.emerald.withOpacity(0.08) : Colors.grey[100],
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isConnected ? Colors.emerald.withOpacity(0.2) : Colors.grey[300]!,
                            width: 0.5,
                          ),
                        ),
                        child: Text(
                          isConnected ? 'Connected' : 'Connect',
                          style: TextStyle(
                            color: isConnected ? Colors.emerald : Colors.grey[700],
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      onTap: () {
                        if (isConnected) {
                          _showRevokeDialog(item);
                        } else {
                          _startConnectionWorkflow(item);
                        }
                      },
                    ),
                  );
                }).toList(),
                const SizedBox(height: 16),
              ],
            );
          }).toList(),
        ],
      ),
    );
  }

  void _showRevokeDialog(String itemName) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text('Disconnect $itemName?'),
          content: Text('Are you sure you want to revoke Rowan’s credentials and access permissions for $itemName?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                setState(() {
                  _connectionStatus[itemName] = false;
                });
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Revoked connection for $itemName')),
                );
              },
              child: const Text('Revoke', style: TextStyle(color: Colors.red)),
            ),
          ],
        );
      },
    );
  }

  // Exact step-by-step connection flow requested:
  // Connect Rowan -> Authentication -> What should Rowan do? -> Context -> Permissions -> Capabilities -> Tools -> Connected
  void _startConnectionWorkflow(String itemName) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return _ConnectionWorkflowWidget(
          itemName: itemName,
          accentColor: _accentColor.color,
          onComplete: () {
            setState(() {
              _connectionStatus[itemName] = true;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Rowan successfully connected to $itemName!')),
            );
          },
        );
      },
    );
  }

  // ==========================================
  // TAB 4: YOU (PERSONALIZATION & PROFILE)
  // ==========================================
  Widget _buildYouTab() {
    final userEmail = ref.watch(authStateProvider).value?.session?.user.email ?? 'Connected Partner';

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'YOUR IDENTITY',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, letterSpacing: 1),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Personalization Area (Appearance section)
          _buildPersonalizationSection(),
          const SizedBox(height: 32),

          // Core identity profile details
          const Text(
            'AUTHORIZED ACCESS IDENTITY',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 0.8),
          ),
          const SizedBox(height: 12),
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              side: BorderSide(color: Colors.grey.withOpacity(0.12)),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  CircleAvatar(
                    backgroundColor: _accentColor.color.withOpacity(0.1),
                    child: Icon(Icons.person, color: _accentColor.color),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Registered Account', style: TextStyle(fontSize: 11, color: Colors.grey)),
                        const SizedBox(height: 2),
                        Text(userEmail, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 32),

          // Log Out Action
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent.withOpacity(0.08),
              foregroundColor: Colors.redAccent,
              side: BorderSide(color: Colors.redAccent.withOpacity(0.2)),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
            onPressed: () {
              ref.read(authServiceProvider).signOut();
            },
            icon: const Icon(Icons.logout, size: 18),
            label: const Text(
              'LOG OUT OF ROWAN COMPANION',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 0.5),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPersonalizationSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'CUSTOMIZE ROWAN',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 0.8),
        ),
        const SizedBox(height: 12),
        Card(
          elevation: 0,
          shape: RoundedRectangleBorder(
            side: BorderSide(color: Colors.grey.withOpacity(0.12)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Avatar Model Customizer
                const Text('Avatar Style', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 8),
                DropdownButtonFormField<RowanAvatarModel>(
                  value: _avatarModel,
                  decoration: InputDecoration(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  items: RowanAvatarModel.values.map((model) {
                    return DropdownMenuItem(value: model, child: Text(model.label));
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _avatarModel = val);
                  },
                ),
                const SizedBox(height: 16),

                // Accent color Customizer
                const Text('Accent Color', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: RowanAccent.values.map((acc) {
                    final isSelected = _accentColor == acc;
                    return GestureDetector(
                      onTap: () => setState(() => _accentColor = acc),
                      child: CircleAvatar(
                        radius: 20,
                        backgroundColor: acc.color,
                        child: isSelected
                            ? const Icon(Icons.check, color: Colors.white, size: 18)
                            : null,
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),

                // Logo/Brand Customizer (with simulated Upload or Choose options)
                const Text('Rowan Logo Branding', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: () {
                          setState(() {
                            _customLogoName = 'Custom Uplink Logo.png';
                          });
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Simulated brand logo uploaded successfully.')),
                          );
                        },
                        icon: const Icon(Icons.upload_file_outlined, size: 16),
                        label: const Text('Upload Brand Logo', style: TextStyle(fontSize: 12)),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: () {
                          setState(() {
                            _customLogoName = 'Classic Spark Logo';
                          });
                        },
                        icon: const Icon(Icons.grid_view, size: 16),
                        label: const Text('Choose Default', style: TextStyle(fontSize: 12)),
                      ),
                    ),
                  ],
                ),
                if (_customLogoName.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Active Logo: $_customLogoName',
                    style: const TextStyle(fontSize: 11, color: Colors.grey, fontStyle: FontStyle.italic),
                  ),
                ],
                const SizedBox(height: 24),

                // PREVIEW ROWAN
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.grey[50],
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey[200]!),
                  ),
                  child: Column(
                    children: [
                      const Text(
                        'PREVIEW ROWAN',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 0.5),
                      ),
                      const SizedBox(height: 12),
                      RowanExpressiveAvatar(
                        state: RowanAvatarState.idle,
                        size: 90,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Rowan (${_avatarModel.label})',
                        style: TextStyle(fontWeight: FontWeight.bold, color: _accentColor.color, fontSize: 15),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        '"Hello. I am customized to your unique visual layout preference."',
                        style: TextStyle(fontSize: 12, color: Colors.grey, fontStyle: FontStyle.italic),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// Multi-step connection workflow widget:
// 1. Connect Rowan
// 2. Authentication
// 3. What should Rowan do?
// 4. Context & Permissions
// 5. Capabilities & Tools
// 6. Connected
class _ConnectionWorkflowWidget extends StatefulWidget {
  final String itemName;
  final Color accentColor;
  final VoidCallback onComplete;

  const _ConnectionWorkflowWidget({
    required this.itemName,
    required this.accentColor,
    required this.onComplete,
  });

  @override
  State<_ConnectionWorkflowWidget> createState() => _ConnectionWorkflowWidgetState();
}

class _ConnectionWorkflowWidgetState extends State<_ConnectionWorkflowWidget> {
  int _step = 1;
  final _inputController = TextEditingController();

  @override
  void dispose() {
    _inputController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: AnimatedSize(
        duration: const Duration(milliseconds: 200),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Title & Progress indicators
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Connect Rowan to ${widget.itemName}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                Text(
                  'Step $_step of 6',
                  style: const TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 12),
            LinearProgressIndicator(
              value: _step / 6.0,
              backgroundColor: Colors.grey[200],
              valueColor: AlwaysStoppedAnimation<Color>(widget.accentColor),
            ),
            const SizedBox(height: 24),

            // Steps
            if (_step == 1) _buildStep1(),
            if (_step == 2) _buildStep2(),
            if (_step == 3) _buildStep3(),
            if (_step == 4) _buildStep4(),
            if (_step == 5) _buildStep5(),
            if (_step == 6) _buildStep6(),

            const SizedBox(height: 24),

            // Actions
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (_step > 1 && _step < 6)
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _step--;
                      });
                    },
                    child: const Text('Back'),
                  ),
                const SizedBox(width: 12),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: widget.accentColor,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: () {
                    if (_step < 6) {
                      setState(() {
                        _step++;
                      });
                    } else {
                      widget.onComplete();
                      Navigator.pop(context);
                    }
                  },
                  child: Text(_step == 6 ? 'Done' : 'Continue'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // Step 1: Connect Rowan
  Widget _buildStep1() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Connect Rowan',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        const SizedBox(height: 8),
        Text(
          'Initiate secure handshake. By connecting, you permit Rowan to interact directly inside ${widget.itemName}.',
          style: const TextStyle(color: Colors.grey, fontSize: 14, height: 1.4),
        ),
      ],
    );
  }

  // Step 2: Authentication
  Widget _buildStep2() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Authentication',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        const SizedBox(height: 8),
        const Text(
          'Authorize access secure login to verify identity.',
          style: TextStyle(color: Colors.grey, fontSize: 14),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _inputController,
          decoration: InputDecoration(
            labelText: 'Security Endpoint / Token',
            border: const OutlineInputBorder(),
            hintText: 'Enter access token or endpoint key for ${widget.itemName}',
          ),
        ),
      ],
    );
  }

  // Step 3: What should Rowan do?
  Widget _buildStep3() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'What should Rowan do?',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        const SizedBox(height: 8),
        const Text(
          'Give Rowan instructions for this connected scope context.',
          style: TextStyle(color: Colors.grey, fontSize: 14),
        ),
        const SizedBox(height: 16),
        const TextField(
          maxLines: 2,
          decoration: InputDecoration(
            labelText: 'Role Instructions',
            border: OutlineInputBorder(),
            hintText: 'e.g., Help customers choose laptops, or review pull requests',
          ),
        ),
      ],
    );
  }

  // Step 4: Context & Permissions
  Widget _buildStep4() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Context & Permissions',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        const SizedBox(height: 8),
        const Text(
          'Rowan will only operate inside these permitted bounds:',
          style: TextStyle(color: Colors.grey, fontSize: 14),
        ),
        const SizedBox(height: 16),
        CheckboxListTile(
          value: true,
          onChanged: (_) {},
          title: const Text('Read state & database data', style: TextStyle(fontSize: 14)),
          controlAffinity: ListTileControlAffinity.leading,
        ),
        CheckboxListTile(
          value: true,
          onChanged: (_) {},
          title: const Text('Trigger authorized transactions', style: TextStyle(fontSize: 14)),
          controlAffinity: ListTileControlAffinity.leading,
        ),
      ],
    );
  }

  // Step 5: Capabilities & Tools
  Widget _buildStep5() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Capabilities & Tools',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        const SizedBox(height: 8),
        const Text(
          'Registered tools for Rowan Core cognitive engine:',
          style: TextStyle(color: Colors.grey, fontSize: 14),
        ),
        const SizedBox(height: 16),
        _buildToolChip('Inventory lookup tool'),
        _buildToolChip('API call handler'),
        _buildToolChip('Semantic context query'),
      ],
    );
  }

  Widget _buildToolChip(String label) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          const Icon(Icons.build_outlined, size: 14, color: Colors.blueGrey),
          const SizedBox(width: 8),
          Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  // Step 6: Connected
  Widget _buildStep6() {
    return Column(
      children: const [
        Icon(Icons.check_circle_outline, color: Colors.emerald, size: 64),
        SizedBox(height: 16),
        Text(
          'Handshake Successful!',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
        ),
        SizedBox(height: 8),
        Text(
          'Rowan is now fully integrated with verified capabilities.',
          style: TextStyle(color: Colors.grey, fontSize: 14),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
